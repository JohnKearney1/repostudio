use rusqlite::{params, Connection, Result};
use std::path::PathBuf;
use chrono::Utc;
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use serde_json;

/// Data model for file metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub encoding: String,
    pub path: String,
    pub precedence: Option<String>,
    pub other_versions: Option<String>, // Stored as a JSON string (list of IDs)
    pub spectrogram: Option<String>,
    pub quality: Option<String>,
    pub samplerate: Option<i32>,
    pub tags: Option<String>, // Stored as a JSON string (list of tags)
}

/// Returns the path where the database will be stored.
/// You can modify this to store the database in your app’s data directory.
fn get_db_path() -> PathBuf {
    let mut path = std::env::current_dir().expect("Unable to get current directory");
    path.push("file_data.db");
    path
}

/// Establishes a connection to the SQLite database and creates the table if it doesn’t exist.
pub fn establish_connection() -> Result<Connection> {
    let db_path = get_db_path();
    let conn = Connection::open(db_path)?;
    
    // Create the 'files' table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS files (
            id             TEXT PRIMARY KEY,
            name           TEXT NOT NULL,
            encoding       TEXT NOT NULL,
            path           TEXT NOT NULL,
            precedence     TEXT,
            other_versions TEXT,
            spectrogram    TEXT,
            quality        TEXT,
            samplerate     INTEGER,
            tags           TEXT
        )",
        [],
    )?;
    Ok(conn)
}

/// Inserts a new file record into the database.
pub fn insert_file(
    name: &str,
    encoding: &str,
    path: &str,
    precedence: Option<&str>,
    other_versions: Option<&[String]>,
    spectrogram: Option<&str>,
    quality: Option<&str>,
    samplerate: Option<i32>,
    tags: Option<&[String]>
) -> Result<()> {
    let conn = establish_connection()?;
    let id = Uuid::new_v4().to_string();
    
    // Serialize list fields as JSON strings (if provided)
    let other_versions_json = other_versions.map(|v| serde_json::to_string(v).unwrap());
    let tags_json = tags.map(|t| serde_json::to_string(t).unwrap());
    
    conn.execute(
        "INSERT INTO files (id, name, encoding, path, precedence, other_versions, spectrogram, quality, samplerate, tags)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            name,
            encoding,
            path,
            precedence,
            other_versions_json,
            spectrogram,
            quality,
            samplerate,
            tags_json
        ],
    )?;
    Ok(())
}

/// Retrieves all file records from the database.
pub fn get_files() -> Result<Vec<FileMetadata>> {
    let conn = establish_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, encoding, path, precedence, other_versions, spectrogram, quality, samplerate, tags FROM files"
    )?;
    
    let file_iter = stmt.query_map([], |row| {
        Ok(FileMetadata {
            id: row.get(0)?,
            name: row.get(1)?,
            encoding: row.get(2)?,
            path: row.get(3)?,
            precedence: row.get(4)?,
            other_versions: row.get(5)?,
            spectrogram: row.get(6)?,
            quality: row.get(7)?,
            samplerate: row.get(8)?,
            tags: row.get(9)?,
        })
    })?;
    
    let mut files = Vec::new();
    for file in file_iter {
        files.push(file?);
    }
    Ok(files)
}

/// Deletes a file record by its id.
pub fn delete_file(id: &str) -> Result<()> {
    let conn = establish_connection()?;
    conn.execute("DELETE FROM files WHERE id = ?1", params![id])?;
    Ok(())
}

/// Updates an existing file record by id.
/// Only updates the fields passed as parameters.
pub fn update_file(
    id: &str,
    precedence: Option<&str>,
    other_versions: Option<&[String]>,
    quality: Option<&str>,
    samplerate: Option<i32>,
    tags: Option<&[String]>
) -> Result<()> {
    let conn = establish_connection()?;
    
    let other_versions_json = other_versions.map(|v| serde_json::to_string(v).unwrap());
    let tags_json = tags.map(|t| serde_json::to_string(t).unwrap());
    
    conn.execute(
        "UPDATE files SET precedence = ?1, other_versions = ?2, quality = ?3, samplerate = ?4, tags = ?5 WHERE id = ?6",
        params![
            precedence,
            other_versions_json,
            quality,
            samplerate,
            tags_json,
            id
        ],
    )?;
    Ok(())
}
