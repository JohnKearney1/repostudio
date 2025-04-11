use background::folder_watcher;
// lib.rs
use tauri::{
    // menu::{Menu, MenuItem},
    // tray::TrayIconBuilder,
    Manager,
};
mod commands;
use commands::{db, refresh_files_in_all_repositories};
mod background;

pub fn run() {
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // ---------------------------------- //
            //               db.rs                //
            // ---------------------------------- //

            // Repositories
            commands::create_repository_command,
            commands::delete_repository_command,
            commands::get_repositories_command,
            commands::get_repository_command,
            commands::update_repository_command,
            commands::get_files_in_repository_command,
            // Files
            commands::get_file_command,
            commands::create_file_command,
            commands::update_file_command,
            commands::delete_file_command,
            commands::remove_duplicate_files_command,
            commands::bundle_files_command,
            // Settings
            commands::get_app_settings_command,
            commands::update_app_settings_command,
            // ---------------------------------- //
            //            file_ops.rs             //
            // ---------------------------------- //
            commands::get_audio_metadata_from_file_command,
            commands::write_audio_metadata_to_file_command,
            commands::clear_audio_metadata_from_file_command,
            // ---------------------------------- //
            //            audio_ops.rs            //
            // ---------------------------------- //
            commands::generate_audio_fingerprint_for_file_command,
            commands::convert_audio_file_command,
            // ---------------------------------- //
            //             actions.rs             //
            // ---------------------------------- //
            commands::refresh_files_in_repository_command,
            commands::refresh_files_in_all_repositories_command,
            // ---------------------------------- //
            //         folder_watcher.rs          //
            // ---------------------------------- //
            background::watch_folder_command,
            background::unwatch_folder_command,
            background::get_tracked_folders_command,
        ])
        .setup(|app| {
            // Get the app data directory
            let path = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");
            println!("App data path: {:?}", path);

            // Create a subdirectory for the app data if it doesn't exist
            let app_data_path = path.join("RepoStudio_AppData");
            std::fs::create_dir_all(&app_data_path).unwrap_or_else(|_| {
                println!("Failed to create Repo Studio app data directory");
            });

            // append the database file name
            let db_path = app_data_path.join("db.sqlite");

            // Store the computed path in the global OnceCell
            crate::commands::db::APP_DB_PATH
                .set(db_path.to_string_lossy().to_string())
                .expect("Database path already set");

            match refresh_files_in_all_repositories() {
                Ok(_) => println!("Checked all file accessibility at startup!"),
                Err(e) => println!("Failed to refresh files at startup: {:?}", e),
            };

            // Start folder watchers on launch
            let window = app.get_webview_window("main").unwrap(); // Or get the correct window
            match db::get_tracked_folders() {
                Ok(folders) => {
                    for folder in folders {
                        println!(
                            "Auto-watching folder: {} for repo {}",
                            folder.folder_path, folder.repo_id
                        );
                        if let Err(e) = folder_watcher::watch_folder(
                            window.clone(),
                            folder.repo_id.clone(),
                            folder.folder_path.clone(),
                        ) {
                            println!("Failed to watch folder '{}': {:?}", folder.folder_path, e);
                        }
                    }
                }
                Err(e) => println!("Failed to load tracked folders: {:?}", e),
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
