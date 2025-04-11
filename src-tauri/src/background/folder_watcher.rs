use crate::commands::{actions, db, file_ops};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tauri::WebviewWindow;

type WatcherMap = Arc<Mutex<HashMap<String, RecommendedWatcher>>>;

/// Global watcher store (one per folder)
use lazy_static::lazy_static;
lazy_static! {
    static ref WATCHERS: WatcherMap = Arc::new(Mutex::new(HashMap::new()));
}

pub fn watch_folder(
    window: WebviewWindow,
    repo_id: String,
    folder_path: String,
) -> notify::Result<()> {
    let path = PathBuf::from(folder_path.clone());
    
    // 1. Lock only for the check
    {
        let watchers = WATCHERS.lock().unwrap();
        if watchers.contains_key(&folder_path) {
            println!("Already watching folder: {}", folder_path);
            return Ok(()); // Exit early if already watching
        }
    } // 🔓 The lock is dropped here

    let repo_id_for_watcher = repo_id.clone(); // clone here
    let repo_id_for_db = repo_id.clone(); // clone for DB use

    let mut watcher: RecommendedWatcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            match res {
                Ok(event) => {
                    println!("File system event: {:?}", event);

                    match event.kind {
                        EventKind::Create(_) => {
                            if let Some(path) = event.paths.first() {
                                if path.is_file() {
                                    println!("New file detected: {:?}", path);
                                    handle_new_file(
                                        window.clone(),
                                        &repo_id_for_watcher,
                                        path.clone(),
                                    );
                                }
                            }
                        }
                        EventKind::Remove(_) => {
                            println!("File removed! Refreshing repository...");
                            let _ = actions::refresh_files_in_repository(&repo_id_for_watcher);

                            // Emit folder_file_removed event!
                            let _ = window.emit(
                                "folder_file_removed",
                                format!("A file was removed from repo '{}'", repo_id_for_watcher),
                            );
                        }

                        EventKind::Modify(_) => {
                            println!("File modified! Refreshing repository...");
                            let _ = actions::refresh_files_in_repository(&repo_id_for_watcher);

                            // Emit folder_file_modified event! (optional, if you want to track these)
                            let _ = window.emit(
                                "folder_file_modified",
                                format!("A file was modified in repo '{}'", repo_id_for_watcher),
                            );
                        }

                        _ => {}
                    }
                }
                Err(e) => println!("Watch error: {:?}", e),
            }
        },
        Config::default(),
    )?;

    watcher.watch(&path, RecursiveMode::Recursive)?;

    WATCHERS
        .lock()
        .unwrap()
        .insert(folder_path.clone(), watcher);

    db::create_tracked_folder(&repo_id_for_db, &folder_path)
        .expect("Failed to store tracked folder in database");

    // println!("Started watching folder: {}", folder_path);

    Ok(())
}

fn handle_new_file(window: WebviewWindow, repo_id: &str, path: PathBuf) {

    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
        if stem.ends_with("_converted5334112025") {
            println!("Ignoring folder with '_converted5334112025' suffix: {}", stem);
            return; // Ignore this file
        }
    }

    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        let audio_extensions = ["mp3", "wav", "flac", "ogg", "aac"];
        if audio_extensions.contains(&ext.to_lowercase().as_str()) {
            match file_ops::get_audio_metadata_from_file(path.to_str().unwrap()) {
                Ok(file_metadata) => {
                    let mut file = file_metadata.clone();
                    file.id = uuid::Uuid::new_v4().to_string();
                    if let Err(err) = db::create_file(repo_id, &file) {
                        println!("Error adding file to DB: {:?}", err);
                    } else {
                        println!("File added successfully: {:?}", file.name);

                        let _ = window.emit(
                            "folder_file_added",
                            format!("New file '{}' added to repo '{}'", file.name, repo_id),
                        );
                    }
                }
                Err(e) => println!("Failed to get metadata for new file: {:?}", e),
            }
        }
    }
}

pub fn unwatch_folder(
    repo_id: String,
    folder_path: String,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut watchers = WATCHERS.lock().unwrap();

    // 1. Stop the watcher if it exists.
    if let Some(mut watcher) = watchers.remove(&folder_path) {
        println!("Stopping watcher for folder: {}", folder_path);
        // This will stop watching the folder.
        watcher.unwatch(std::path::Path::new(&folder_path))?;
    } else {
        println!("No active watcher found for folder: {}", folder_path);
    }

    // 2. Remove any files in this folder (and subfolders) from the database.
    let files = db::get_files_in_repository(&repo_id)?;

    let folder_path_normalized = folder_path.replace("\\", "/");

    for file in files {
        let file_path_normalized = file.path.replace("\\", "/");

        if file_path_normalized.starts_with(&folder_path_normalized) {
            println!(
                "Deleting file '{}' from repository '{}'",
                file.name, repo_id
            );
            db::delete_file(&repo_id, &file.id)?;
        }
    }

    db::delete_tracked_folder(&repo_id, &folder_path)
        .expect("Failed to remove tracked folder from database");

    println!(
        "Unwatched folder '{}' and deleted matching files from repo '{}'",
        folder_path, repo_id
    );

    Ok(())
}

#[tauri::command]
pub async fn watch_folder_command(
    window: WebviewWindow,
    repo_id: String,
    folder_path: String,
) -> Result<(), String> {
    watch_folder(window, repo_id, folder_path)
        .map_err(|e| format!("Failed to watch folder: {:?}", e))
}

#[tauri::command]
pub async fn unwatch_folder_command(repo_id: String, folder_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        unwatch_folder(repo_id, folder_path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Failed to unwatch folder: {:?}", e))??;
    Ok(())
}

#[tauri::command]
pub async fn get_tracked_folders_command(repo_id: String) -> Result<Vec<String>, String> {
    let folders = db::get_tracked_folders().map_err(|e| e.to_string())?;

    let filtered = folders
        .into_iter()
        .filter(|f| f.repo_id == repo_id)
        .map(|f| f.folder_path)
        .collect();

    Ok(filtered)
}
