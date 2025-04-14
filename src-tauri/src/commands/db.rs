// src/commands/db.rs
//! This module handles all reads and writes to the SQLite database,
//! including operations on repositories, file metadata, and settings.
use crate::commands::structures::{AppSettings, FileMetadata, Repository, TrackedFolder};
use chrono::{DateTime, FixedOffset, Utc};
use once_cell::sync::OnceCell;
use regex::Regex;
use rusqlite::{params, Connection, Result};
use std::collections::HashMap;
use std::time::UNIX_EPOCH;
use tauri::{Emitter, Window};
use uuid::Uuid;

pub static APP_DB_PATH: OnceCell<String> = OnceCell::new();

/// Returns the path to the SQLite database file.
fn get_db_path() -> String {
    APP_DB_PATH
        .get()
        .cloned()
        .unwrap_or_else(|| "db.sqlite".to_string())
}

/// Establish a connection to the database and ensure that the core tables exist.
/// This function creates the Repositories and Settings tables, inserting default settings if needed.
pub fn establish_connection() -> Result<Connection> {
    let db_path = get_db_path();
    let conn = Connection::open(db_path)?;

    // Create the Repositories table.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Repositories (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT
        )",
        [],
    )?;

    // Create the AppSettings table.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS AppSettings (
             general_auto_fingerprint INTEGER NOT NULL,
             general_theme TEXT NOT NULL,
             audio_autoplay INTEGER NOT NULL,
             setup_selected_repository TEXT
         )",
        [],
    )?;

    // Create TrackedFolders table (call in `establish_connection`)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS TrackedFolders (
            id          TEXT PRIMARY KEY,
            repo_id     TEXT NOT NULL,
            folder_path TEXT NOT NULL
        )",
        [],
    )?;

    // Create the bundles table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Bundles (
            id          TEXT PRIMARY KEY,
            name        TEXT,
            description TEXT,
            date_created TEXT NOT NULL,
            included_files TEXT NOT NULL,
            recipients TEXT NOT NULL
        )",
        [],
    )?;

    // Create the contacts table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Contacts (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            email       TEXT NOT NULL,
            phone       TEXT
        )",
        [],
    )?;

    let app_settings_exists: bool =
        conn.query_row("SELECT EXISTS(SELECT 1 FROM AppSettings)", [], |row| {
            row.get(0)
        })?;
    if !app_settings_exists {
        conn.execute(
            "INSERT INTO AppSettings (general_auto_fingerprint, general_theme, audio_autoplay, setup_selected_repository)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![0, "theme-light", 0, "default"],
        )?;
    }

    Ok(conn)
}

/// Sanitizes an identifier (for example, a repository ID) so it can be safely used as a SQL table name.
pub fn sanitize_identifier(identifier: &str) -> Result<String> {
    let re = Regex::new(r"^[a-zA-Z0-9_-]+$").unwrap();
    if re.is_match(identifier) {
        Ok(identifier.to_string())
    } else {
        Err(rusqlite::Error::InvalidQuery)
    }
}

/// Ensures that the file table for the given repository exists.
pub fn ensure_files_table(conn: &Connection, repo_id: &str) -> Result<()> {
    let safe_id = sanitize_identifier(repo_id)?;
    conn.execute(
        &format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" (
                id                  TEXT PRIMARY KEY,
                name                TEXT NOT NULL,
                encoding            TEXT NOT NULL,
                path                TEXT NOT NULL,
                related_files       TEXT,
                tags                TEXT,
                date_created        TEXT NOT NULL,
                date_modified       TEXT NOT NULL,
                audio_fingerprint   TEXT,
                accessible          BOOLEAN,
                meta_title          TEXT,
                meta_comment        TEXT,
                meta_album_artist   TEXT,
                meta_album          TEXT,
                meta_track_number   TEXT,
                meta_genre          TEXT,
                meta_bit_rate       TEXT,
                meta_channels       TEXT,
                meta_sample_rate    TEXT,
                meta_size_on_disk   TEXT
            )",
            safe_id
        ),
        [],
    )?;
    Ok(())
}

// Retrieves the app settings from the AppSettings table.
pub fn get_app_settings() -> Result<AppSettings> {
    let conn = establish_connection()?;
    let mut stmt = conn.prepare(
        "SELECT general_auto_fingerprint, general_theme, audio_autoplay, setup_selected_repository
         FROM AppSettings LIMIT 1",
    )?;
    let settings = stmt.query_row([], |row| {
        let general_flag: i32 = row.get(0)?;
        let general_theme: String = row.get(1)?;
        let autoplay_flag: i32 = row.get(2)?;
        let repo_id: String = row.get(3)?;
        Ok(AppSettings {
            general_auto_fingerprint: general_flag != 0,
            general_theme,
            audio_autoplay: autoplay_flag != 0,
            setup_selected_repository: repo_id,
        })
    })?;
    Ok(settings)
}

// Updates the app settings row with the provided values.
pub fn update_app_settings(
    general_auto_fingerprint: bool,
    general_theme: String,
    audio_autoplay: bool,
    setup_selected_repository: &str,
) -> Result<()> {
    let conn = establish_connection()?;
    conn.execute(
        "UPDATE AppSettings
         SET general_auto_fingerprint = ?1,
                general_theme = ?2,
                audio_autoplay = ?3,
                setup_selected_repository = ?4",
        params![
            if general_auto_fingerprint { 1 } else { 0 },
            general_theme,
            if audio_autoplay { 1 } else { 0 },
            setup_selected_repository,
        ],
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Repository operations
// ---------------------------------------------------------------------------

pub fn create_repository_with_id(id: &str, name: &str, description: &str) -> Result<()> {
    let conn = establish_connection()?;
    conn.execute(
        "INSERT INTO Repositories (id, name, description) VALUES (?1, ?2, ?3)",
        params![id, name, description],
    )?;
    // Create a corresponding file table for the new repository.
    ensure_files_table(&conn, id)?;
    Ok(())
}

pub fn delete_repository(id: &str) -> Result<()> {
    let conn = establish_connection()?;
    conn.execute("DELETE FROM Repositories WHERE id = ?1", params![id])?;
    let safe_id = sanitize_identifier(id)?;
    conn.execute(&format!("DROP TABLE IF EXISTS \"{}\"", safe_id), [])?;
    Ok(())
}

pub fn get_repositories() -> Result<Vec<Repository>> {
    let conn = establish_connection()?;
    let mut stmt = conn.prepare("SELECT id, name, description FROM Repositories")?;
    let repos = stmt
        .query_map([], |row| {
            Ok(Repository {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<Repository>>>()?;
    Ok(repos)
}

pub fn get_repository(id: &str) -> Result<Repository> {
    let conn = establish_connection()?;
    let mut stmt = conn.prepare("SELECT id, name, description FROM Repositories WHERE id = ?1")?;
    let repo = stmt.query_row(params![id], |row| {
        Ok(Repository {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
        })
    })?;
    Ok(repo)
}

pub fn update_repository(id: &str, name: &str, description: &str) -> Result<()> {
    let conn = establish_connection()?;
    conn.execute(
        "UPDATE Repositories SET name = ?1, description = ?2 WHERE id = ?3",
        params![name, description, id],
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

pub fn get_files_in_repository(repo_id: &str) -> Result<Vec<FileMetadata>> {
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;
    ensure_files_table(&conn, repo_id)?;
    let mut stmt = conn.prepare(&format!(
        "SELECT
            id,
            name,
            encoding,
            path,
            related_files,
            tags,
            date_created,
            date_modified,
            audio_fingerprint,
            accessible,
            meta_title,
            meta_comment,
            meta_album_artist,
            meta_album,
            meta_track_number,
            meta_genre,
            meta_bit_rate,
            meta_channels,
            meta_sample_rate,
            meta_size_on_disk
        FROM \"{}\"",
        safe_repo_id
    ))?;
    let files = stmt
        .query_map([], |row| {
            Ok(FileMetadata {
                id: row.get(0)?,
                name: row.get(1)?,
                encoding: row.get(2)?,
                path: row.get(3)?,
                related_files: row.get(4)?,
                tags: row.get(5)?,
                date_created: row.get(6)?,
                date_modified: row.get(7)?,
                audio_fingerprint: row.get(8)?,
                accessible: row.get(9)?,
                meta_title: row.get(10)?,
                meta_comment: row.get(11)?,
                meta_album_artist: row.get(12)?,
                meta_album: row.get(13)?,
                meta_track_number: row.get(14)?,
                meta_genre: row.get(15)?,
                meta_bit_rate: row.get(16)?,
                meta_channels: row.get(17)?,
                meta_sample_rate: row.get(18)?,
                meta_size_on_disk: row.get(19)?,
            })
        })?
        .collect::<Result<Vec<FileMetadata>>>()?;
    Ok(files)
}

pub fn get_file(repo_id: &str, file_id: &str) -> Result<FileMetadata> {
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;
    ensure_files_table(&conn, repo_id)?;
    let mut stmt = conn.prepare(&format!(
        "SELECT
            id,
            name,
            encoding,
            path,
            related_files,
            tags,
            date_created,
            date_modified,
            audio_fingerprint,
            accessible,
            meta_title,
            meta_comment,
            meta_album_artist,
            meta_album,
            meta_track_number,
            meta_genre,
            meta_bit_rate,
            meta_channels,
            meta_sample_rate,
            meta_size_on_disk
         FROM \"{}\" WHERE id = ?1",
        safe_repo_id
    ))?;
    let file = stmt.query_row(params![file_id], |row| {
        Ok(FileMetadata {
            id: row.get(0)?,
            name: row.get(1)?,
            encoding: row.get(2)?,
            path: row.get(3)?,
            related_files: row.get(4)?,
            tags: row.get(5)?,
            date_created: row.get(6)?,
            date_modified: row.get(7)?,
            audio_fingerprint: row.get(8)?,
            accessible: row.get(9)?,
            meta_title: row.get(10)?,
            meta_comment: row.get(11)?,
            meta_album_artist: row.get(12)?,
            meta_album: row.get(13)?,
            meta_track_number: row.get(14)?,
            meta_genre: row.get(15)?,
            meta_bit_rate: row.get(16)?,
            meta_channels: row.get(17)?,
            meta_sample_rate: row.get(18)?,
            meta_size_on_disk: row.get(19)?,
        })
    })?;
    Ok(file)
}

/// Helper: Normalize a file path by replacing backslashes with forward slashes.
fn normalize_path(path: &str) -> String {
    path.replace("\\", "/")
}

/// Helper: Given a group of FileMetadata records, return a reference to the one with the most recent modification date.
fn best_file_in_group(group: &[FileMetadata]) -> Option<&FileMetadata> {
    group.iter().max_by(|a, b| {
        let date_a = DateTime::parse_from_rfc3339(&a.date_modified).unwrap_or_else(|_| {
            DateTime::<Utc>::from(UNIX_EPOCH).with_timezone(&FixedOffset::east_opt(0).unwrap())
        });
        let date_b = DateTime::parse_from_rfc3339(&b.date_modified).unwrap_or_else(|_| {
            DateTime::<Utc>::from(UNIX_EPOCH).with_timezone(&FixedOffset::east_opt(0).unwrap())
        });
        date_a.cmp(&date_b)
    })
}

/// Removes duplicate file records from a repository—keeping only the most recently modified version.
pub fn remove_duplicate_files_in_repository(repo_id: &str) -> Result<()> {
    println!("Checking for duplicate files in repository: {}", repo_id);
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;
    let files = get_files_in_repository(repo_id)?;
    let mut groups: HashMap<String, Vec<FileMetadata>> = HashMap::new();

    for file in files {
        let normalized = normalize_path(&file.path);
        groups.entry(normalized).or_default().push(file);
    }

    for (normalized_path, group) in groups {
        if group.len() > 1 {
            if let Some(best_file) = best_file_in_group(&group) {
                for file in &group {
                    if file.id != best_file.id {
                        conn.execute(
                            &format!("DELETE FROM \"{}\" WHERE id = ?1", safe_repo_id),
                            params![file.id],
                        )?;
                        println!(
                            "Deleted duplicate file with id: {} (path: {})",
                            file.id, normalized_path
                        );
                    }
                }
            }
        }
    }

    Ok(())
}

/// Inserts a new file record into the repository's file table.
/// If a file with the same path already exists, the insertion is skipped.
/// After insertion, duplicate files are removed automatically.
pub fn create_file(repo_id: &str, file: &FileMetadata) -> Result<()> {
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;
    ensure_files_table(&conn, repo_id)?;

    // Skip insert if a file with the same path already exists.
    let mut stmt = conn.prepare(&format!(
        "SELECT COUNT(*) FROM \"{}\" WHERE path = ?1",
        safe_repo_id
    ))?;
    let count: i32 = stmt.query_row(params![file.path], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }

    conn.execute(
        &format!(
            "INSERT INTO \"{}\" (
                id, name, encoding, path, related_files, tags,
                date_created, date_modified, audio_fingerprint, accessible,
                meta_title, meta_comment, meta_album_artist, meta_album,
                meta_track_number, meta_genre, meta_bit_rate, meta_channels,
                meta_sample_rate, meta_size_on_disk
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
            safe_repo_id
        ),
        params![
            file.id,
            file.name,
            file.encoding,
            file.path,
            file.related_files,
            file.tags,
            file.date_created,
            file.date_modified,
            file.audio_fingerprint,
            file.accessible,
            file.meta_title,
            file.meta_comment,
            file.meta_album_artist,
            file.meta_album,
            file.meta_track_number,
            file.meta_genre,
            file.meta_bit_rate,
            file.meta_channels,
            file.meta_sample_rate,
            file.meta_size_on_disk,
        ],
    )?;
    // Automatically remove duplicates after inserting a new file.
    remove_duplicate_files_in_repository(repo_id)?;
    Ok(())
}

/// Updates an existing file record.
pub fn update_file(repo_id: &str, file: &FileMetadata) -> Result<()> {
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;
    ensure_files_table(&conn, repo_id)?;
    conn.execute(
        &format!(
            "UPDATE \"{}\" SET
                name = ?1,
                encoding = ?2,
                path = ?3,
                related_files = ?4,
                tags = ?5,
                date_created = ?6,
                date_modified = ?7,
                audio_fingerprint = ?8,
                accessible = ?9,
                meta_title = ?10,
                meta_comment = ?11,
                meta_album_artist = ?12,
                meta_album = ?13,
                meta_track_number = ?14,
                meta_genre = ?15,
                meta_bit_rate = ?16,
                meta_channels = ?17,
                meta_sample_rate = ?18,
                meta_size_on_disk = ?19
            WHERE id = ?20",
            safe_repo_id
        ),
        params![
            file.name,
            file.encoding,
            file.path,
            file.related_files,
            file.tags,
            file.date_created,
            file.date_modified,
            file.audio_fingerprint,
            file.accessible,
            file.meta_title,
            file.meta_comment,
            file.meta_album_artist,
            file.meta_album,
            file.meta_track_number,
            file.meta_genre,
            file.meta_bit_rate,
            file.meta_channels,
            file.meta_sample_rate,
            file.meta_size_on_disk,
            file.id,
        ],
    )?;
    Ok(())
}

/// Deletes a file record.
pub fn delete_file(repo_id: &str, file_id: &str) -> Result<()> {
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;
    ensure_files_table(&conn, repo_id)?;
    conn.execute(
        &format!("DELETE FROM \"{}\" WHERE id = ?1", safe_repo_id),
        params![file_id],
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Folder tracking operations
// ---------------------------------------------------------------------------
pub fn create_tracked_folder(repo_id: &str, folder_path: &str) -> Result<()> {
    let conn = establish_connection()?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO TrackedFolders (id, repo_id, folder_path) VALUES (?1, ?2, ?3)",
        params![id, repo_id, folder_path],
    )?;
    Ok(())
}

// Delete
pub fn delete_tracked_folder(repo_id: &str, folder_path: &str) -> Result<()> {
    let conn = establish_connection()?;
    conn.execute(
        "DELETE FROM TrackedFolders WHERE repo_id = ?1 AND folder_path = ?2",
        params![repo_id, folder_path],
    )?;
    Ok(())
}

// Get all
pub fn get_tracked_folders() -> Result<Vec<TrackedFolder>> {
    let conn = establish_connection()?;
    let mut stmt = conn.prepare("SELECT id, repo_id, folder_path FROM TrackedFolders")?;
    let folders = stmt
        .query_map([], |row| {
            Ok(TrackedFolder {
                id: row.get(0)?,
                repo_id: row.get(1)?,
                folder_path: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<TrackedFolder>>>()?;
    Ok(folders)
}

// ---------------------------------------------------------------------------
// Tauri command wrappers (using spawn_blocking)
// These functions are exposed to the frontend via `invoke`.
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn create_repository_command(
    window: Window,
    id: String,
    name: String,
    description: String,
) -> Result<(), String> {
    let emit_window = window.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let result = create_repository_with_id(&id, &name, &description);

        let payload = match &result {
            Ok(_) => format!("Repository '{}' created successfully.", name),
            Err(e) => format!("Failed to create repository '{}': {}", name, e),
        };

        emit_window
            .emit("create_repository_completed", payload)
            .unwrap_or_else(|e| {
                println!("Failed to emit create_repository_completed event: {}", e);
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_repository_command(window: Window, id: String) -> Result<(), String> {
    let emit_window = window.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let result = delete_repository(&id);

        let payload = match &result {
            Ok(_) => format!("Repository '{}' deleted successfully.", id),
            Err(e) => format!("Failed to delete repository '{}': {}", id, e),
        };

        emit_window
            .emit("delete_repository_completed", payload)
            .unwrap_or_else(|e| {
                println!("Failed to emit delete_repository_completed event: {}", e);
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_repository_command(
    window: Window,
    id: String,
    name: String,
    description: String,
) -> Result<(), String> {
    let emit_window = window.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let result = update_repository(&id, &name, &description);

        let payload = match &result {
            Ok(_) => format!("Repository '{}' updated successfully.", id),
            Err(e) => format!("Failed to update repository '{}': {}", id, e),
        };

        emit_window
            .emit("update_repository_completed", payload)
            .unwrap_or_else(|e| {
                println!("Failed to emit update_repository_completed event: {}", e);
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_file_command(
    window: Window,
    repo_id: String,
    file: FileMetadata,
) -> Result<(), String> {
    let emit_window = window.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let result = create_file(&repo_id, &file);

        let payload = match &result {
            Ok(_) => format!(
                "File '{}' created successfully in repo '{}'.",
                file.name, repo_id
            ),
            Err(e) => format!(
                "Failed to create file '{}' in repo '{}': {}",
                file.name, repo_id, e
            ),
        };

        emit_window
            .emit("create_file_completed", payload)
            .unwrap_or_else(|e| {
                println!("Failed to emit create_file_completed event: {}", e);
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_file_command(
    window: Window,
    repo_id: String,
    file: FileMetadata,
) -> Result<(), String> {
    let emit_window = window.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let result = update_file(&repo_id, &file);

        let payload = match &result {
            Ok(_) => format!(
                "File '{}' updated successfully in repo '{}'.",
                file.name, repo_id
            ),
            Err(e) => format!(
                "Failed to update file '{}' in repo '{}': {}",
                file.name, repo_id, e
            ),
        };

        emit_window
            .emit("update_file_completed", payload)
            .unwrap_or_else(|e| {
                println!("Failed to emit update_file_completed event: {}", e);
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_file_command(
    window: Window,
    repo_id: String,
    file_id: String,
) -> Result<(), String> {
    let emit_window = window.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let result = delete_file(&repo_id, &file_id);

        let payload = match &result {
            Ok(_) => format!(
                "File '{}' deleted successfully from repo '{}'.",
                file_id, repo_id
            ),
            Err(e) => format!(
                "Failed to delete file '{}' from repo '{}': {}",
                file_id, repo_id, e
            ),
        };

        emit_window
            .emit("delete_file_completed", payload)
            .unwrap_or_else(|e| {
                println!("Failed to emit delete_file_completed event: {}", e);
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn remove_duplicate_files_command(window: Window, repo_id: String) -> Result<(), String> {
    let emit_window = window.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let result = remove_duplicate_files_in_repository(&repo_id);

        let payload = match &result {
            Ok(_) => format!("Duplicate files removed from repository '{}'.", repo_id),
            Err(e) => format!(
                "Failed to remove duplicates from repository '{}': {}",
                repo_id, e
            ),
        };

        emit_window
            .emit("remove_duplicate_files_completed", payload)
            .unwrap_or_else(|e| {
                println!(
                    "Failed to emit remove_duplicate_files_completed event: {}",
                    e
                );
            });

        result.map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_repositories_command(window: Window) -> Result<Vec<Repository>, String> {
    let emit_window = window.clone();

    let result =
        tauri::async_runtime::spawn_blocking(move || get_repositories().map_err(|e| e.to_string()))
            .await;

    if let Ok(Ok(_)) = &result {
        emit_window
            .emit(
                "get_repositories_completed",
                "Repositories loaded successfully.",
            )
            .unwrap_or_else(|e| println!("Failed to emit get_repositories_completed event: {}", e));
    }

    result.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_repository_command(window: Window, id: String) -> Result<Repository, String> {
    let emit_window = window.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        get_repository(&id).map_err(|e| e.to_string())
    })
    .await;

    if let Ok(Ok(repo)) = &result {
        emit_window
            .emit(
                "get_repository_completed",
                format!("Repository '{}' loaded successfully.", repo.id),
            )
            .unwrap_or_else(|e| println!("Failed to emit get_repository_completed event: {}", e));
    }

    result.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_files_in_repository_command(
    window: Window,
    repo_id: String,
) -> Result<Vec<FileMetadata>, String> {
    let emit_window = window.clone();
    let repo_id_for_db = repo_id.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        get_files_in_repository(&repo_id_for_db).map_err(|e| e.to_string())
    })
    .await;

    if let Ok(Ok(files)) = &result {
        emit_window
            .emit(
                "get_files_in_repository_completed",
                format!("Loaded {} files for repository '{}'.", files.len(), repo_id),
            )
            .unwrap_or_else(|e| {
                println!(
                    "Failed to emit get_files_in_repository_completed event: {}",
                    e
                )
            });
    }

    result.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_file_command(
    window: Window,
    repo_id: String,
    file_id: String,
) -> Result<FileMetadata, String> {
    let emit_window = window.clone();
    let repo_id_for_db = repo_id.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        get_file(&repo_id_for_db, &file_id).map_err(|e| e.to_string())
    })
    .await;

    if let Ok(Ok(file)) = &result {
        emit_window
            .emit(
                "get_file_completed",
                format!(
                    "File '{}' loaded successfully from repository '{}'.",
                    file.id, repo_id
                ),
            )
            .unwrap_or_else(|e| println!("Failed to emit get_file_completed event: {}", e));
    }

    result.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_app_settings_command() -> Result<AppSettings, String> {
    tauri::async_runtime::spawn_blocking(move || get_app_settings().map_err(|e| e.to_string()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_app_settings_command(args: AppSettings) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        update_app_settings(
            args.general_auto_fingerprint,
            args.general_theme,
            args.audio_autoplay,
            &args.setup_selected_repository,
        )
        .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
