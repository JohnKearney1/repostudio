use std::error::Error;
use std::fs;
use std::path::Path;

use lofty::config::WriteOptions;
use lofty::probe::Probe;
use lofty::tag::*;
use lofty::prelude::*;

use tauri::Emitter;
use tauri::Window;

use crate::commands::structures::FileMetadata;

pub fn get_audio_metadata_from_file(path: &str) -> Result<FileMetadata, Box<dyn Error>> {
    let path_obj = Path::new(path);
    if !path_obj.is_file() {
        return Err("Provided path is not a file.".into());
    }

    // Try to get full metadata using lofty.
    let metadata_result = (|| {
        // Attempt to open and read the tagged file.
        let tagged_file = Probe::open(path)?.read()?;
        let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());
    
        let meta_title = tag.and_then(|t| t.title().map(|s| s.to_string()));
        let meta_comment = tag.and_then(|t| t.get_string(&ItemKey::Comment).map(|s| s.to_string()));
        let meta_album_artist = tag.and_then(|t| t.get_string(&ItemKey::AlbumArtist).map(|s| s.to_string()));
        let meta_album = tag.and_then(|t| t.album().map(|s| s.to_string()));
        let meta_track_number = tag.and_then(|t| t.get_string(&ItemKey::TrackNumber).map(|s| s.to_string()));
        let meta_genre = tag.and_then(|t| t.genre().map(|s| s.to_string()));
    
        let encoding = path_obj
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_string();
    
        let name = path_obj
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
    
        let fs_metadata = fs::metadata(path)?;
        let date_created = fs_metadata
            .created()
            .map(|t| format!("{:?}", t))
            .unwrap_or_default();
        let date_modified = fs_metadata
            .modified()
            .map(|t| format!("{:?}", t))
            .unwrap_or_default();
    
        let properties = tagged_file.properties();
        let meta_bit_rate = properties.audio_bitrate().map(|b| b.to_string());
        let meta_sample_rate = properties.sample_rate().map(|s| s.to_string());
        let meta_channels = properties.channels().map(|c| c.to_string());
        let meta_size_on_disk = Some(fs_metadata.len().to_string());
    
        Ok(FileMetadata {
            id: "".to_string(),
            name,
            encoding,
            path: path.to_string(),
            related_files: None,
            tags: None,
            date_created,
            date_modified,
            audio_fingerprint: None,
            accessible: true,
            meta_title,
            meta_comment,
            meta_album_artist,
            meta_album,
            meta_track_number,
            meta_genre,
            meta_bit_rate,
            meta_channels,
            meta_sample_rate,
            meta_size_on_disk,
        })
    })();

    match metadata_result {
        Ok(metadata) => Ok(metadata),
        Err(e) => {
            // If we encountered any error (e.g. invalid timestamp) but the file exists,
            // then fallback to creating a minimal metadata record.
            if let Ok(fs_metadata) = fs::metadata(path) {
                let date_created = fs_metadata
                    .created()
                    .map(|t| format!("{:?}", t))
                    .unwrap_or_default();
                let date_modified = fs_metadata
                    .modified()
                    .map(|t| format!("{:?}", t))
                    .unwrap_or_default();
                let encoding = path_obj
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or("")
                    .to_string();
                let name = path_obj
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
    
                println!(
                    "Warning: Failed to get full metadata for '{}': {}. Falling back to minimal data.",
                    name, e
                );
    
                Ok(FileMetadata {
                    id: "".to_string(),
                    name,
                    encoding,
                    path: path.to_string(),
                    related_files: None,
                    tags: None,
                    date_created,
                    date_modified,
                    audio_fingerprint: None,
                    accessible: false, // Mark file as not fully accessible due to metadata error.
                    meta_title: None,
                    meta_comment: None,
                    meta_album_artist: None,
                    meta_album: None,
                    meta_track_number: None,
                    meta_genre: None,
                    meta_bit_rate: None,
                    meta_channels: None,
                    meta_sample_rate: None,
                    meta_size_on_disk: Some(fs_metadata.len().to_string()),
                })
            } else {
                // If even fs::metadata fails, propagate the original error.
                Err(e)
            }
        }
    }
}


pub fn clear_audio_metadata_from_file(path: &str) -> Result<(), Box<dyn Error>> {
    let tagged_file = Probe::open(path)?.read()?;
    let tags = tagged_file.tags();

    if tags.is_empty() {
        return Ok(());
    }

    let mut tag_types = Vec::new();
    for tag in tags {
        let tag_type = tag.tag_type();
        if !tag_types.contains(&tag_type) {
            tag_types.push(tag_type);
        }
    }

    for tag_type in tag_types {
        tag_type.remove_from_path(path)?;
    }
    Ok(())
}

pub fn write_audio_metadata_to_file(file_metadata: &FileMetadata) -> Result<(), Box<dyn Error>> {
    clear_audio_metadata_from_file(&file_metadata.path)?;

    let mut tagged_file = Probe::open(&file_metadata.path)?.read()?;

    let tag = match tagged_file.primary_tag_mut() {
        Some(primary_tag) => primary_tag,
        None => {
            if let Some(first_tag) = tagged_file.first_tag_mut() {
                first_tag
            } else {
                let tag_type = tagged_file.primary_tag_type();
                let new_tag = Tag::new(tag_type);
                tagged_file.insert_tag(new_tag);
                tagged_file
                    .primary_tag_mut()
                    .ok_or("Failed to create a new tag")?
            }
        },
    };

    if let Some(ref title) = file_metadata.meta_title {
        tag.set_title(title.clone());
    }
    if let Some(ref comment) = file_metadata.meta_comment {
        tag.insert(TagItem::new(ItemKey::Comment, ItemValue::Text(comment.clone())));
    }
    if let Some(ref album_artist) = file_metadata.meta_album_artist {
        tag.insert(TagItem::new(ItemKey::AlbumArtist, ItemValue::Text(album_artist.clone())));
    }
    if let Some(ref album) = file_metadata.meta_album {
        tag.set_album(album.clone());
    }
    if let Some(ref track_number) = file_metadata.meta_track_number {
        tag.insert(TagItem::new(ItemKey::TrackNumber, ItemValue::Text(track_number.clone())));
    }
    if let Some(ref genre) = file_metadata.meta_genre {
        tag.set_genre(genre.clone());
    }

    tag.save_to_path(&file_metadata.path, WriteOptions::default())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Tauri Command Wrappers with Event Notifications
// ---------------------------------------------------------------------------
#[tauri::command]
pub async fn get_audio_metadata_from_file_command(
    window: Window,
    file_path: String
) -> Result<FileMetadata, String> {
    let emit_window = window.clone();

    let result: Result<FileMetadata, String> = tauri::async_runtime::spawn_blocking(move || {
        let result = get_audio_metadata_from_file(&file_path);

        let payload = match &result {
            Ok(file_meta) => format!("Metadata loaded for file '{}'", file_meta.name),
            Err(e) => format!("Failed to load metadata from '{}': {}", file_path, e),
        };

        emit_window.emit("get_audio_metadata_completed", payload).unwrap_or_else(|e| {
            println!("Failed to emit get_audio_metadata_completed event: {}", e);
        });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?;
    result
}
#[tauri::command]
pub async fn clear_audio_metadata_from_file_command(
    window: Window,
    file_path: String
) -> Result<(), String> {
    let emit_window = window.clone();

    let result: Result<(), String> = tauri::async_runtime::spawn_blocking(move || {
        let result = clear_audio_metadata_from_file(&file_path);

        let payload = match &result {
            Ok(_) => format!("Cleared metadata for file '{}'", file_path),
            Err(e) => format!("Failed to clear metadata for '{}': {}", file_path, e),
        };

        emit_window.emit("clear_audio_metadata_completed", payload).unwrap_or_else(|e| {
            println!("Failed to emit clear_audio_metadata_completed event: {}", e);
        });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?;
    result
}
#[tauri::command]
pub async fn write_audio_metadata_to_file_command(
    window: Window,
    file_metadata: FileMetadata
) -> Result<(), String> {
    let emit_window = window.clone();

    let result: Result<(), String> = tauri::async_runtime::spawn_blocking(move || {
        let result = write_audio_metadata_to_file(&file_metadata);

        let payload = match &result {
            Ok(_) => format!("Wrote metadata to file '{}'", file_metadata.path),
            Err(e) => format!("Failed to write metadata to '{}': {}", file_metadata.path, e),
        };

        emit_window.emit("write_audio_metadata_completed", payload).unwrap_or_else(|e| {
            println!("Failed to emit write_audio_metadata_completed event: {}", e);
        });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?;
    result
}
