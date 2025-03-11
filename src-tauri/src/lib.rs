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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            add_file,
            get_all_files,
            delete_file_by_id,
            update_file_by_id
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
