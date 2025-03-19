use std::error::Error;
use std::fs;
use std::path::Path;

use crate::commands::db::{get_repositories, get_files_in_repository, update_file};
use crate::commands::file_ops::get_audio_metadata_from_file;
use crate::commands::structures::FileMetadata;
use tauri::{Emitter, Window};

/// Refreshes all file records for a single repository.
pub fn refresh_files_in_repository(repo_id: &str) -> Result<(), Box<dyn Error>> {
    let files = get_files_in_repository(repo_id)?;
    for file in files {
        let path = Path::new(&file.path);
        if !path.exists() {
            let mut updated_file = file.clone();
            updated_file.accessible = false;
            update_file(repo_id, &updated_file)?;
            continue;
        }

        let fs_metadata = fs::metadata(&file.path)?;
        let new_date_modified = fs_metadata
            .modified()
            .map(|t| format!("{:?}", t))
            .unwrap_or_default();

        if new_date_modified != file.date_modified {
            let new_file_metadata = get_audio_metadata_from_file(&file.path)?;
            let updated_file = FileMetadata {
                id: file.id.clone(),
                ..new_file_metadata
            };
            update_file(repo_id, &updated_file)?;
        }
    }
    Ok(())
}

/// Refreshes file records for ALL repositories in the database.
pub fn refresh_files_in_all_repositories() -> Result<(), Box<dyn Error>> {
    let repos = get_repositories()?;
    for repo in repos {
        refresh_files_in_repository(&repo.id)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn refresh_files_in_repository_command(window: Window, repo_id: String) -> Result<(), String> {
    let emit_window = window.clone(); // clone for later use in the spawn_blocking
    tauri::async_runtime::spawn_blocking(move || {
        let result = refresh_files_in_repository(&repo_id);
        
        // Emit an event based on result
        let event_payload = match &result {
            Ok(_) => format!("Repository {} refreshed successfully!", repo_id),
            Err(e) => format!("Failed to refresh repository {}: {}", repo_id, e),
        };

        emit_window
            .emit(
                "refresh_files_in_repository_completed", // <-- Event name
                event_payload,
            )
            .unwrap_or_else(|e| {
                println!("Failed to emit refresh_files_in_repository_completed event: {}", e);
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn refresh_files_in_all_repositories_command(window: Window) -> Result<(), String> {
    let emit_window = window.clone(); // clone for later use in the spawn_blocking
    tauri::async_runtime::spawn_blocking(move || {
        let result = refresh_files_in_all_repositories();

        let event_payload = match &result {
            Ok(_) => "All repositories refreshed successfully!".to_string(),
            Err(e) => format!("Failed to refresh all repositories: {}", e),
        };

        emit_window
            .emit(
                "refresh_files_in_all_repositories_completed", // <-- Event name
                event_payload,
            )
            .unwrap_or_else(|e| {
                println!("Failed to emit refresh_files_in_all_repositories_completed event: {}", e);
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
