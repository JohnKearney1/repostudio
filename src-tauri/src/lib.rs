// src-tauri/src/lib.rs

mod db; // Import our database module

#[tauri::command]
fn add_file(
    name: String,
    encoding: String,
    path: String,
    precedence: Option<String>,
    other_versions: Option<Vec<String>>,
    spectrogram: Option<String>,
    quality: Option<String>,
    samplerate: Option<i32>,
    tags: Option<Vec<String>>
) -> Result<(), String> {
    db::insert_file(
        &name,
        &encoding,
        &path,
        precedence.as_deref(),
        other_versions.as_deref(),
        spectrogram.as_deref(),
        quality.as_deref(),
        samplerate,
        tags.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_all_files() -> Result<Vec<db::FileMetadata>, String> {
    db::get_files().map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_file_by_id(id: String) -> Result<(), String> {
    db::delete_file(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_file_by_id(
    id: String,
    precedence: Option<String>,
    other_versions: Option<Vec<String>>,
    quality: Option<String>,
    samplerate: Option<i32>,
    tags: Option<Vec<String>>
) -> Result<(), String> {
    db::update_file(
        &id,
        precedence.as_deref(),
        other_versions.as_deref(),
        quality.as_deref(),
        samplerate,
        tags.as_deref(),
    )
    .map_err(|e| e.to_string())
}

// lib.rs
use std::fs;
use std::path::Path;

#[tauri::command]
fn add_folder(folder_path: String) -> Result<u32, String> {
    let allowed_extensions = vec!["mp3", "wav", "flac", "aac", "ogg"];
    let mut added_count = 0;

    let folder = Path::new(&folder_path);
    if !folder.is_dir() {
        return Err("Provided path is not a directory".into());
    }

    // Read the directory entries
    let entries = fs::read_dir(folder).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        if file_path.is_file() {
            if let Some(ext_osstr) = file_path.extension() {
                if let Some(ext) = ext_osstr.to_str() {
                    let ext_lower = ext.to_lowercase();
                    if allowed_extensions.contains(&ext_lower.as_str()) {
                        // Convert file path to a String
                        let file_path_str = file_path.to_string_lossy().to_string();
                        // Check if the file is already in the database
                        if !db::file_exists(&file_path_str).map_err(|e| e.to_string())? {
                            // Get the file name (if available)
                            let file_name = file_path
                                .file_name()
                                .and_then(|s| s.to_str())
                                .unwrap_or("Unnamed")
                                .to_string();

                            // Insert the file with default values (e.g., precedence "current")
                            db::insert_file(
                                &file_name,
                                &ext_lower,
                                &file_path_str,
                                Some("current"),
                                Some(&[]),   // No other versions initially
                                None,        // No spectrogram
                                None,        // No quality info
                                None,        // No samplerate
                                Some(&[]),   // No tags initially
                            )
                            .map_err(|e| e.to_string())?;
                            added_count += 1;
                        }
                    }
                }
            }
        }
    }
    Ok(added_count)
}


// lib.rs (at the bottom)
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            add_file,
            get_all_files,
            delete_file_by_id,
            update_file_by_id,
            add_folder   // <-- new command added here
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

