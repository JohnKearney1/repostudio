#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]
mod db;
mod commands;

pub fn run() {
#[cfg_attr(mobile, tauri::mobile_entry_point)]
    tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::create_repository_command,
            commands::delete_repository_command,
            commands::get_repositories_command,
            commands::get_repository_command,
            commands::update_repository_command,
            commands::create_file_command,
            commands::update_file_command,
            commands::delete_file_command,
            commands::get_file_command,
            commands::get_files_in_repository_command,
            commands::remove_duplicate_files_command,
            commands::compute_fingerprint_command,
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
