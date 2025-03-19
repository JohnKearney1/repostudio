// commands.rs
// This module contains the command handlers for the Tauri application and some helper functions.
// The command handlers are invoked by the Tauri application when the corresponding command is called from the front-end.

#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]
use lofty::tag::TagExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;
use chrono::Utc;
use tauri::Manager;
use tauri::Emitter;
use lofty::file::TaggedFileExt;
use lofty::tag::Accessor;
use lofty::file::AudioFile;
use lofty::config::WriteOptions;
use lofty::tag::Tag;
use lofty::tag::TagType;
use chrono::Datelike;

use lofty::prelude::ItemKey;

// For fingerprinting:
use anyhow::Context;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use rusty_chromaprint::{Configuration, Fingerprinter};


#[tauri::command]
pub async fn update_file_and_disk_metadata_command(
    window: tauri::Window,
    repo_id: String,
    file_metadata: FileMetadata,
) -> Result<(), ApiError> {
    // First: update the file metadata in the database.
    tauri::async_runtime::spawn_blocking({
        let repo_id = repo_id.clone();
        let file_metadata = file_metadata.clone();
        move || -> Result<(), ApiError> {
            update_file(&repo_id, &file_metadata)?;
            Ok(())
        }
    })
    .await
    .map_err(|e| ApiError {
        message: format!("Task join error: {:?}", e),
    })??;

    // Second: update the metadata on the actual file.
    tauri::async_runtime::spawn_blocking({
        let file_metadata = file_metadata.clone();
        move || -> Result<(), ApiError> {
            let file_path = file_metadata.path.clone();
            // Open the file for reading and writing using Lofty.
            let mut tagged_file = lofty::probe::Probe::open(&file_path)
                .map_err(|e| ApiError {
                    message: format!("Failed to open file for metadata update: {:?}", e),
                })?
                .read()
                .map_err(|e| ApiError {
                    message: format!("Failed to read file metadata: {:?}", e),
                })?;

                let primary_tag = match tagged_file.primary_tag_mut() {
                    Some(primary_tag) => primary_tag,
                    None => {
                        if let Some(first_tag) = tagged_file.first_tag_mut() {
                            first_tag
                        } else {
                            let tag_type = tagged_file.primary_tag_type();
                            eprintln!("WARN: No tags found, creating a new tag of type `{tag_type:?}`");
                            tagged_file.insert_tag(Tag::new(tag_type));
                            tagged_file.primary_tag_mut().unwrap()
                        }
                    },
                };
                        

            // Update Title
            match file_metadata.meta_title {
                Some(ref title) if !title.is_empty() => primary_tag.set_title(title.clone()),
                _ => { primary_tag.remove_title(); },
            }

            // Update Comment
            match file_metadata.meta_comment {
                Some(ref comment) if !comment.is_empty() => primary_tag.set_comment(comment.clone()),
                _ => { primary_tag.remove_comment(); },
            }

            // Update Album Artist (Artist in the tag)
            match file_metadata.meta_album_artist {
                Some(ref artist) if !artist.is_empty() => primary_tag.set_artist(artist.clone()),
                _ => { primary_tag.remove_artist(); },
            }

            // Update Album
            match file_metadata.meta_album {
                Some(ref album) if !album.is_empty() => primary_tag.set_album(album.clone()),
                _ => { primary_tag.remove_album(); },
            }

            // Update Track Number
            match file_metadata.meta_track_number {
                Some(ref track_str) if !track_str.is_empty() => {
                    let track = track_str.parse::<u32>().unwrap_or(0);
                    primary_tag.set_track(track);
                },
                _ => { primary_tag.remove_track(); },
            }

            // Update Genre
            match file_metadata.meta_genre {
                Some(ref genre) if !genre.is_empty() => primary_tag.set_genre(genre.clone()),
                _ => { primary_tag.remove_genre(); },
            }

            // Save the updated metadata back to the file.
            tagged_file.save_to_path(&file_path, WriteOptions::default()).map_err(|e| ApiError {
                message: format!("Failed to write metadata to file: {:?}", e),
            })?;

            Ok(())
        }
    })
    .await
    .map_err(|e| ApiError {
        message: format!("Task join error: {:?}", e),
    })??;

    // Third: Emit an event to signal that the update is complete.
    window
        .emit("file-metadata-updated", file_metadata.id)
        .map_err(|e| ApiError {
            message: format!("Failed to emit update event: {:?}", e),
        })?;

    Ok(())
}




/// Fingerprint a file while emitting progress events via a callback.
/// The progress_callback is called periodically (with values 0–100).
pub fn fingerprint_file_with_progress<F>(file_path: &str, progress_callback: F) -> Result<String, String>
where
    F: Fn(u8),
{
    // Print that we've started fingerprinting.
    println!("Fingerprinting file: {}", file_path);
    // Open the file.
    let path = Path::new(file_path);
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    // Provide a hint using the file extension.
    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let meta_opts: MetadataOptions = Default::default();
    let fmt_opts: FormatOptions = Default::default();

    // Probe the media source for a format.
    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| e.to_string())?;
    let mut format = probed.format;

    // Select the first supported audio track.
    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| "no supported audio track".to_string())?;

    let dec_opts: DecoderOptions = Default::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &dec_opts)
        .map_err(|e| e.to_string())?;
    let track_id = track.id;

    // Get sample rate and channels.
    let sample_rate = track
        .codec_params
        .sample_rate
        .ok_or_else(|| "missing sample rate".to_string())?;
    let channels = track
        .codec_params
        .channels
        .ok_or_else(|| "missing channels".to_string())?
        .count() as u32;

    // Create a fingerprinter with a preset configuration.
    let config = Configuration::preset_test1();
    let mut printer = Fingerprinter::new(&config);
    printer.start(sample_rate, channels).map_err(|e| e.to_string())?;

    let mut sample_buf: Option<SampleBuffer<i16>> = None;

    // We'll use a simple packet counter to simulate progress.
    let mut packet_count: u64 = 0;
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(_) => break, // End of stream.
        };

        if packet.track_id() != track_id {
            continue;
        }

        match decoder.decode(&packet) {
            Ok(audio_buf) => {
                if sample_buf.is_none() {
                    let spec = *audio_buf.spec();
                    let capacity = audio_buf.capacity() as u64;
                    sample_buf = Some(SampleBuffer::<i16>::new(capacity, spec));
                }
                if let Some(buf) = &mut sample_buf {
                    buf.copy_interleaved_ref(audio_buf);
                    printer.consume(buf.samples());
                }
            },
            Err(symphonia::core::errors::Error::DecodeError(_)) => continue,
            Err(e) => break,
        }

        packet_count += 1;
        // Every 10 packets, update progress.
        if packet_count % 10 == 0 {
            // For demonstration, assume 50 packets equals ~90% progress.
            let progress = if packet_count >= 50 {
                90
            } else {
                ((packet_count as f32 / 50.0) * 90.0) as u8
            };
            progress_callback(progress);
        }
    }

    printer.finish();
    // Final update: mark progress as 100%.
    progress_callback(100);

    // Convert the fingerprint (a vector of u32) into a hex string.
    let fp_vec = printer.fingerprint().to_vec();
    let fp_string = fp_vec
        .iter()
        .map(|num| format!("{:08x}", num))
        .collect::<Vec<_>>()
        .join("");
    Ok(fp_string)
}


#[tauri::command]
pub async fn refresh_files(repo_id: String) -> Result<(), ApiError> {
    use std::time::SystemTime;
    use lofty::probe::Probe;
    use lofty::prelude::{ItemKey, AudioFile};
    use lofty::file::TaggedFileExt;

    tauri::async_runtime::spawn_blocking(move || -> Result<(), ApiError> {
        // Load all files in the given repository.
        let mut files = get_files_in_repository(&repo_id)?;
        
        // Iterate over each file record.
        for file in files.iter_mut() {
            let file_path = &file.path;
            let path = std::path::Path::new(file_path);
            
            if path.exists() && path.is_file() {
                // File exists: refresh metadata.
                let metadata = std::fs::metadata(&path)?;
                let created_time = metadata
                    .created()
                    .or_else(|_| metadata.modified())
                    .unwrap_or(SystemTime::now());
                let modified_time = metadata.modified().unwrap_or(SystemTime::now());
                file.date_created = chrono::DateTime::<chrono::Utc>::from(created_time).to_rfc3339();
                file.date_modified = chrono::DateTime::<chrono::Utc>::from(modified_time).to_rfc3339();
                
                // Update file name and encoding based on the file path.
                file.name = path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("unknown")
                    .to_string();
                file.encoding = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase())
                    .unwrap_or_else(|| "unknown".to_string());
                
                // Try to update audio metadata using Lofty.
                if let Ok(probe) = Probe::open(file_path.clone()) {
                    if let Ok(tagged_file) = probe.read() {
                        let properties = tagged_file.properties();
                        file.meta_bit_rate = properties.audio_bitrate().map(|b| b.to_string());
                        file.meta_sample_rate = properties.sample_rate().map(|sr| sr.to_string());
                        file.meta_channels = properties.channels().map(|ch| ch.to_string());
                        
                        if let Some(tag) = tagged_file.primary_tag() {
                            file.meta_title = tag.get_string(&ItemKey::TrackTitle).map(|s| s.to_string());
                            file.meta_comment = tag.get_string(&ItemKey::Comment).map(|s| s.to_string());
                            file.meta_contributing_artists = tag.get_string(&ItemKey::TrackArtist).map(|s| {
                                s.split('/').map(|a| a.trim().to_string()).collect()
                            });
                            file.meta_album_artist = tag.get_string(&ItemKey::AlbumArtist).map(|s| s.to_string());
                            file.meta_album = tag.get_string(&ItemKey::AlbumTitle).map(|s| s.to_string());
                            file.meta_track_number = tag.get_string(&ItemKey::TrackNumber).map(|s| s.to_string());
                            file.meta_genre = tag.get_string(&ItemKey::Genre).map(|s| s.to_string());
                            file.meta_publisher = tag.get_string(&ItemKey::Publisher).map(|s| s.to_string());
                            file.meta_encoded_by = tag.get_string(&ItemKey::EncodedBy).map(|s| s.to_string());
                            // For BPM, we use a key that returns a string representation.
                            file.meta_bpm = tag.get_string(&ItemKey::IntegerBpm).map(|s| s.to_string());
                        }
                        // Update file size on disk.
                        file.meta_size_on_disk = Some(metadata.len().to_string());
                        // Mark the file as accessible.
                        file.accessible = true;
                    } else {
                        // Could not read metadata via Lofty—mark as not accessible.
                        file.accessible = false;
                    }
                } else {
                    // If probing the file fails, mark it as not accessible.
                    file.accessible = false;
                }
            } else {
                // File does not exist: only update accessible flag and modified date.
                file.accessible = false;
                file.date_modified = chrono::DateTime::<chrono::Utc>::from(SystemTime::now()).to_rfc3339();
            }
            
            // Update the file record in the database.
            update_file(&repo_id, file)?;
        }
        
        Ok(())
    })
    .await
    .map_err(|e| ApiError {
        message: format!("Task join error: {:?}", e),
    })??;
    
    Ok(())
}


//----------------------------------------------------------------
// Database-related functions and types:
use crate::db::{
    create_repository_with_id, delete_repository, get_repositories, get_repository, update_repository,
    create_file, update_file, delete_file, get_file, get_files_in_repository, FileMetadata, remove_duplicate_files_in_repository
};

// Error handling
#[derive(Debug, Serialize)]
pub struct ApiError {
    message: String,
}

impl From<rusqlite::Error> for ApiError {
    fn from(err: rusqlite::Error) -> Self {
        ApiError {
            message: format!("Database error: {}", err),
        }
    }
}

impl From<std::io::Error> for ApiError {
    fn from(err: std::io::Error) -> Self {
        ApiError {
            message: format!("IO error: {}", err),
        }
    }
}

#[tauri::command]
pub fn create_repository_command(name: String, description: String, id: Option<String>) -> Result<String, ApiError> {
    let repo_id = id.unwrap_or_else(|| Uuid::new_v4().to_string());
    create_repository_with_id(&repo_id, &name, &description)?;
    Ok(repo_id)
}

#[tauri::command]
pub fn delete_repository_command(repo_id: String) -> Result<(), ApiError> {
    delete_repository(&repo_id)?;
    Ok(())
}

#[tauri::command]
pub fn get_repositories_command() -> Result<Vec<crate::db::Repository>, ApiError> {
    let repos = get_repositories()?;
    Ok(repos)
}

#[tauri::command]
pub fn get_repository_command(repo_id: String) -> Result<crate::db::Repository, ApiError> {
    let repo = get_repository(&repo_id)?;
    Ok(repo)
}

#[tauri::command]
pub fn update_repository_command(repo_id: String, name: String, description: String) -> Result<(), ApiError> {
    update_repository(&repo_id, &name, &description)?;
    Ok(())
}

#[tauri::command]
pub async fn create_file_command(repo_id: String, file_path: String) -> Result<(), ApiError> {
    tauri::async_runtime::spawn_blocking(move || -> Result<(), ApiError> {
        use std::time::SystemTime;
        use lofty::probe::Probe;
        use lofty::prelude::ItemKey;
        use lofty::file::TaggedFileExt;
        use lofty::prelude::AudioFile;

        let path = std::path::Path::new(&file_path);

        if !path.exists() {
            return Err(ApiError {
                message: format!("File does not exist: {}", file_path),
            });
        }

        if !path.is_file() {
            return Err(ApiError {
                message: format!("Path is not a valid file: {}", file_path),
            });
        }

        // Retrieve the system metadata.
        let metadata = std::fs::metadata(&path)?;

        // Try to get the created time. If unavailable, fallback to modified time.
        let created_time = metadata
            .created()
            .or_else(|_| metadata.modified())
            .unwrap_or(SystemTime::now());
        let modified_time = metadata.modified().unwrap_or(SystemTime::now());

        // Convert system times to RFC3339 strings.
        let date_created = chrono::DateTime::<chrono::Utc>::from(created_time).to_rfc3339();
        let date_modified = chrono::DateTime::<chrono::Utc>::from(modified_time).to_rfc3339();

        // Generate a unique identifier.
        let id = uuid::Uuid::new_v4().to_string();

        // Extract file name (without extension) and encoding (extension in lowercase).
        let file_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();
        let encoding = path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
            .unwrap_or_else(|| "unknown".to_string());

        // Initialize metadata variables.
        let mut artist_meta: Option<Vec<String>> = None;
        let mut album_meta: Option<String> = None;
        let mut title_meta: Option<String> = None;
        let mut genre_meta: Option<String> = None;
        let mut track_meta: Option<String> = None;
        let mut comment_meta: Option<String> = None;
        let mut album_artist_meta: Option<String> = None;
        let mut publisher_meta: Option<String> = None;
        let mut encoded_by_meta: Option<String> = None;
        let mut bpm_meta: Option<String> = None;
        let mut bit_rate_meta: Option<String> = None;
        let mut sample_rate_meta: Option<String> = None;
        let mut channels_meta: Option<String> = None;

        // Attempt to read audio metadata using lofty.
        if let Ok(probe) = Probe::open(file_path.clone()) {
            if let Ok(tagged_file) = probe.read() {
                // Get audio properties (bit rate, sample rate, channels)
                let properties = tagged_file.properties();
                bit_rate_meta = properties.audio_bitrate().map(|b| b.to_string());
                sample_rate_meta = properties.sample_rate().map(|sr| sr.to_string());
                channels_meta = properties.channels().map(|ch| ch.to_string());

                if let Some(tag) = tagged_file.primary_tag() {
                    if let Some(artist) = tag.get_string(&ItemKey::TrackArtist) {
                        let artists: Vec<String> = artist.split('/').map(|a| a.trim().to_string()).collect();
                        artist_meta = Some(artists);
                    }
                    if let Some(album) = tag.get_string(&ItemKey::AlbumTitle) {
                        album_meta = Some(album.to_string());
                    }
                    if let Some(title) = tag.get_string(&ItemKey::TrackTitle) {
                        title_meta = Some(title.to_string());
                    }
                    if let Some(genre) = tag.get_string(&ItemKey::Genre) {
                        genre_meta = Some(genre.to_string());
                    }
                    if let Some(track) = tag.get_string(&ItemKey::TrackNumber) {
                        track_meta = Some(track.to_string());
                    }
                    // New fields extracted from the tag:
                    if let Some(comment) = tag.get_string(&ItemKey::Comment) {
                        comment_meta = Some(comment.to_string());
                    }
                    if let Some(album_artist) = tag.get_string(&ItemKey::AlbumArtist) {
                        album_artist_meta = Some(album_artist.to_string());
                    }
                    if let Some(publisher) = tag.get_string(&ItemKey::Publisher) {
                        publisher_meta = Some(publisher.to_string());
                    }
                    if let Some(encoded_by) = tag.get_string(&ItemKey::EncodedBy) {
                        encoded_by_meta = Some(encoded_by.to_string());
                    }
                    if let Some(bpm) = tag.get_string(&ItemKey::IntegerBpm) {
                        bpm_meta = Some(bpm.to_string());
                    }
                }
            }
        }

        // Create the file metadata using the extracted values.
        let file_metadata = FileMetadata {
            id,
            name: file_name,
            encoding,
            path: file_path.clone(),
            precedence: None,
            related_files: None,
            spectrogram: None,
            quality: None,
            samplerate: None,
            tags: None,
            date_created,
            date_modified,
            audio_fingerprint: None,
            accessible: true,
            meta_title: title_meta,
            meta_comment: comment_meta,
            meta_contributing_artists: artist_meta,
            meta_album_artist: album_artist_meta,
            meta_album: album_meta,
            meta_year: None,
            meta_track_number: track_meta,
            meta_genre: genre_meta,
            meta_bit_rate: bit_rate_meta,
            meta_channels: channels_meta,
            meta_sample_rate: sample_rate_meta,
            meta_publisher: publisher_meta,
            meta_encoded_by: encoded_by_meta,
            meta_bpm: bpm_meta,
            meta_size_on_disk: Some(metadata.len().to_string()),
        };

        println!("Adding file: {:?}", file_metadata);

        // Perform the database insertion in the background.
        create_file(&repo_id, &file_metadata)
            .map_err(|e| ApiError {
                message: format!("Failed to insert file: {:?}", e),
            })?;

        Ok(())
    })
    .await
    .map_err(|e| ApiError {
        message: format!("Task join error: {:?}", e),
    })?
}






/// New command: Compute a fingerprint for an existing file record.
/// Given a repository id and a file id, this command looks up the file's path,
/// fingerprints it (emitting progress events), and then updates the file record.
#[tauri::command]
pub async fn compute_fingerprint_command(
  window: tauri::Window,
  repo_id: String,
  file_id: String,
) -> Result<(), ApiError> {
    // Retrieve the file metadata from the database.
    let mut file_metadata = get_file(&repo_id, &file_id)?;
    let file_path = file_metadata.path.clone();

    // Offload the fingerprinting computation to a background thread.
    let window_clone = window.clone();
    let fingerprint_result = tauri::async_runtime::spawn_blocking(move || {
        fingerprint_file_with_progress(&file_path, |progress: u8| {
            // Emit a "fingerprint-progress" event.
            let _ = window_clone.emit("fingerprint-progress", progress);
        })
    })
    .await
    .map_err(|e| ApiError { message: format!("Failed to fingerprint file: {:?}", e) })?
    .map_err(|e| ApiError { message: e })?;
    
    // Update the file metadata with the computed fingerprint.
    file_metadata.audio_fingerprint = Some(fingerprint_result);
    
    // Offload the database update to a background thread.
    tauri::async_runtime::spawn_blocking(move || {
        update_file(&repo_id, &file_metadata)
            .map_err(|e| ApiError { message: format!("Failed to update file: {:?}", e) })
    })
    .await
    .map_err(|e| ApiError { message: format!("Task join error: {:?}", e) })??;
    
    Ok(())
}


#[tauri::command]
pub fn update_file_command(repo_id: String, file_metadata: FileMetadata) -> Result<(), ApiError> {
    update_file(&repo_id, &file_metadata)?;
    Ok(())
}

#[tauri::command]
pub fn delete_file_command(repo_id: String, file_id: String) -> Result<(), ApiError> {
    delete_file(&repo_id, &file_id)?;
    Ok(())
}

#[tauri::command]
pub fn get_file_command(repo_id: String, file_id: String) -> Result<FileMetadata, ApiError> {
    let file = get_file(&repo_id, &file_id)?;
    Ok(file)
}

#[tauri::command]
pub fn get_files_in_repository_command(repo_id: String) -> Result<Vec<FileMetadata>, ApiError> {
    let files = get_files_in_repository(&repo_id)?;
    Ok(files)
}

#[tauri::command]
pub fn remove_duplicate_files_command(repo_id: String) -> Result<(), ApiError> {
    crate::db::remove_duplicate_files_in_repository(&repo_id)
        .map_err(|e| ApiError { message: format!("Failed to remove duplicates: {:?}", e) })?;
    Ok(())
}
