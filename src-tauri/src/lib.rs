use commands::refresh_files_in_all_repositories;
// lib.rs
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
  };
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
        .setup(|app| {

            match refresh_files_in_all_repositories() {
              Ok(_) => println!("Checked all file accessibility at startup!"),
              Err(e) => println!("Failed to refresh files at startup: {:?}", e),
            };

            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let exit_i = MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &exit_i])?;

            let _tray = TrayIconBuilder::new()
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .show_menu_on_left_click(true)
            .on_menu_event(|app, event| match event.id.as_ref() {
                
                "exit" => {
                  println!("quit menu item was clicked");
                  app.exit(0);
                }
                "show" => {
                  println!("show menu item was clicked");
                  let window = app.get_webview_window("main").unwrap();
                  window.show().unwrap();
                }
                "hide" => {
                  println!("hide menu item was clicked");
                  let window = app.get_webview_window("main").unwrap();
                  window.hide().unwrap();
                }
                
                _ => {
                  println!("menu item {:?} not handled", event.id);
                }})
            .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
