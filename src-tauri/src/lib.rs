// lib.rs

mod commands;

pub fn run() {
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
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

            // Settings
            commands::get_setting_command,
            commands::update_setting_command,
            commands::create_setting_command,

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

            // ---------------------------------- //
            //             actions.rs             //
            // ---------------------------------- //
            commands::refresh_files_in_repository_command,
            commands::refresh_files_in_all_repositories_command,

        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
