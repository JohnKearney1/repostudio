#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;
use chrono::Utc;
use tauri::Manager;
use tauri::Emitter;

// For fingerprinting:
use anyhow::Context;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use rusty_chromaprint::{Configuration, Fingerprinter};

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

/// Updated create_file_command: fingerprinting is removed. The file record is created with an empty fingerprint.
#[tauri::command]
pub fn create_file_command(repo_id: String, file_path: String) -> Result<(), ApiError> {
    use std::time::SystemTime;
    
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
    let modified_time = metadata
        .modified()
        .unwrap_or(SystemTime::now());

    // Convert system times to RFC3339 strings.
    let date_created = chrono::DateTime::<chrono::Utc>::from(created_time).to_rfc3339();
    let date_modified = chrono::DateTime::<chrono::Utc>::from(modified_time).to_rfc3339();

    // Generate a unique identifier.
    let id = uuid::Uuid::new_v4().to_string();

    // Extract file name (without extension) and encoding (extension in lowercase).
    let file_name = match path.file_stem().and_then(|s| s.to_str()) {
        Some(name) => name.to_string(),
        None => "unknown".to_string(),
    };
    let encoding = match path.extension().and_then(|ext| ext.to_str()) {
        Some(ext) => ext.to_lowercase(),
        None => "unknown".to_string(),
    };

    // Create the file metadata with an empty fingerprint.
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
    };

    println!("Adding file: {:?}", file_metadata);

    create_file(&repo_id, &file_metadata)
        .map_err(|e| ApiError { message: format!("Failed to insert file: {:?}", e) })
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

    // Run the fingerprinting in a background thread and emit progress events.
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
    update_file(&repo_id, &file_metadata)
        .map_err(|e| ApiError { message: format!("Failed to update file: {:?}", e) })?;
    
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
