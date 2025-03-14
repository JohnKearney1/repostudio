#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::db::{
    create_repository_with_id, delete_repository, get_repositories, get_repository, update_repository,
    create_file, update_file, delete_file, get_file, get_files_in_repository, FileMetadata, remove_duplicate_files_in_repository
};

use uuid::Uuid;

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

#[tauri::command]
pub fn create_file_command(repo_id: String, file_path: String) -> Result<(), ApiError> {
    let path = Path::new(&file_path);

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

    let metadata = fs::metadata(&path)?;
    let id = Uuid::new_v4().to_string();
    let file_name = path.file_name().unwrap().to_string_lossy().to_string();
    let date_created = chrono::Utc::now().to_rfc3339();
    let date_modified = date_created.clone();

    let file_metadata = FileMetadata {
        id,
        name: file_name,
        encoding: "unknown".to_string(),
        path: file_path.clone(),
        precedence: Some(0),
        related_files: Some("[]".to_string()),
        spectrogram: None,
        quality: None,
        samplerate: None,
        tags: Some("[]".to_string()),
        date_created,
        date_modified,
        audio_fingerprint: None,
        accessible: true,
    };

    println!("Adding file: {:?}", file_metadata);

    create_file(&repo_id, &file_metadata)
        .map_err(|e| ApiError { message: format!("Failed to insert file: {:?}", e) })
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
