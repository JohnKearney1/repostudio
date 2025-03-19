// src/commands/db.rs
//! This module handles all reads and writes to the SQLite database,
//! including operations on repositories, file metadata, and settings.

use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use regex::Regex;
use rusqlite::OptionalExtension;
use std::collections::HashMap;
use chrono::{DateTime, Utc, FixedOffset};
use std::time::UNIX_EPOCH;

use crate::commands::structures::{FileMetadata, Repository, Settings};

/// Returns the path to the SQLite database file.
fn get_db_path() -> String {
    "db.sqlite".to_string()
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

    // Create the Settings table.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Settings (
            id      TEXT PRIMARY KEY,
            setting TEXT NOT NULL,
            value   TEXT NOT NULL
        )",
        [],
    )?;

    // Insert a default setting for autoplay if it doesn't exist.
    let autoplay_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM Settings WHERE setting = 'autoplay')",
        [],
        |row| row.get(0),
    )?;
    if !autoplay_exists {
        let default_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO Settings (id, setting, value) VALUES (?1, ?2, ?3)",
            params![default_id, "autoplay", "true"],
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
        let date_a = DateTime::parse_from_rfc3339(&a.date_modified)
            .unwrap_or_else(|_| DateTime::<Utc>::from(UNIX_EPOCH).with_timezone(&FixedOffset::east_opt(0).unwrap()));
        let date_b = DateTime::parse_from_rfc3339(&b.date_modified)
            .unwrap_or_else(|_| DateTime::<Utc>::from(UNIX_EPOCH).with_timezone(&FixedOffset::east_opt(0).unwrap()));
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
// Settings operations
// ---------------------------------------------------------------------------

/// Retrieves a setting by its name.
pub fn get_setting(setting_name: &str) -> Result<Option<Settings>> {
    let conn = establish_connection()?;
    let mut stmt = conn.prepare("SELECT id, setting, value FROM Settings WHERE setting = ?1")?;
    let setting = stmt
        .query_row(params![setting_name], |row| {
            Ok(Settings {
                id: row.get(0)?,
                setting: row.get(1)?,
                value: row.get(2)?,
            })
        })
        .optional()?;
    Ok(setting)
}

/// Updates the value of a setting.
pub fn update_setting(setting_name: &str, new_value: &str) -> Result<()> {
    let conn = establish_connection()?;
    conn.execute(
        "UPDATE Settings SET value = ?1 WHERE setting = ?2",
        params![new_value, setting_name],
    )?;
    Ok(())
}

/// Inserts a new setting.
pub fn create_setting(setting_name: &str, value: &str) -> Result<()> {
    let conn = establish_connection()?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO Settings (id, setting, value) VALUES (?1, ?2, ?3)",
        params![id, setting_name, value],
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Tauri command wrappers (using spawn_blocking)
// These functions are exposed to the frontend via `invoke`.
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn create_repository_command(id: String, name: String, description: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_repository_with_id(&id, &name, &description).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_repository_command(id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        delete_repository(&id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_repositories_command() -> Result<Vec<Repository>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        get_repositories().map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_repository_command(id: String) -> Result<Repository, String> {
    tauri::async_runtime::spawn_blocking(move || {
        get_repository(&id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_repository_command(id: String, name: String, description: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        update_repository(&id, &name, &description).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_files_in_repository_command(repo_id: String) -> Result<Vec<FileMetadata>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        get_files_in_repository(&repo_id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_file_command(repo_id: String, file_id: String) -> Result<FileMetadata, String> {
    tauri::async_runtime::spawn_blocking(move || {
        get_file(&repo_id, &file_id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_file_command(repo_id: String, file: FileMetadata) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_file(&repo_id, &file).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_file_command(repo_id: String, file: FileMetadata) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        update_file(&repo_id, &file).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_file_command(repo_id: String, file_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        delete_file(&repo_id, &file_id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_setting_command(setting_name: String) -> Result<Option<Settings>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        get_setting(&setting_name).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn update_setting_command(setting_name: String, new_value: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        update_setting(&setting_name, &new_value).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_setting_command(setting_name: String, value: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_setting(&setting_name, &value).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Exposes duplicate removal as a Tauri command.
#[tauri::command]
pub async fn remove_duplicate_files_command(repo_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        remove_duplicate_files_in_repository(&repo_id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
