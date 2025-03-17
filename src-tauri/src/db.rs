// db.rs
// This module contains the lower level database functions that interact directly with the SQLite database.

#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]
use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use serde::{Serialize, Deserialize};
use serde_json;

fn get_db_path() -> String {
    "db.sqlite".to_string()
}

//  Data model for file metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub encoding: String,
    pub path: String,
    pub precedence: Option<i32>,              // Changed to i32 for precedence ranking
    pub related_files: Option<String>,        // Stored as JSON string (list of IDs)
    pub spectrogram: Option<String>,
    pub quality: Option<String>,
    pub samplerate: Option<i32>,
    pub tags: Option<String>,                 // Stored as JSON string (genre/emotion tags)
    pub date_created: String,
    pub date_modified: String,
    pub audio_fingerprint: Option<String>,
    pub accessible: bool,
}

// Data model for a repository
#[derive(Debug, Serialize, Deserialize)]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub description: String,
}

// Create a connection to the database
pub fn establish_connection() -> Result<Connection> {
    let db_path = get_db_path();
    let conn = Connection::open(db_path)?;

    // Create the Repositories table (holds metadata about each repository)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Repositories (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT
        )",
        [],
    )?;

    // Check if there are any repositories
    {
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM Repositories")?;
        let count: i32 = stmt.query_row([], |row| row.get(0))?;
        
        // If no repositories exist, create the default repository
        if count == 0 {
            let default_id = "default".to_string();
            println!("No repositories found. Creating default repository with ID: {}", default_id);

            conn.execute(
                "INSERT INTO Repositories (id, name, description) VALUES (?, ?, ?)",
                params![
                    default_id,
                    "Default Repository",
                    "This is the default repository, customize it however!"
                ],
            )?;

            // Create the table for the default repository
            let safe_id = sanitize_identifier(&default_id)?;
            conn.execute(
                &format!(
                    "CREATE TABLE IF NOT EXISTS \"{}\" (
                        id              TEXT PRIMARY KEY,
                        name            TEXT NOT NULL,
                        encoding        TEXT NOT NULL,
                        path            TEXT NOT NULL,
                        precedence      INTEGER,
                        related_files   TEXT,
                        spectrogram     TEXT,
                        quality         TEXT,
                        samplerate      INTEGER,
                        tags            TEXT,
                        date_created    TEXT NOT NULL,
                        date_modified   TEXT NOT NULL,
                        audio_fingerprint TEXT,
                        accessible      BOOLEAN
                    )",
                    safe_id
                ),
                [],
            )?;

            println!("Default repository table '{}' created", safe_id);
        }
    }

    // Ensure every repository has its corresponding table
    {
        let mut stmt = conn.prepare("SELECT id FROM Repositories")?;
        let repo_ids = stmt
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>>>()?;

        for repo_id in repo_ids {
            let safe_id = sanitize_identifier(&repo_id)?;

            conn.execute(
                &format!(
                    "CREATE TABLE IF NOT EXISTS \"{}\" (
                        id              TEXT PRIMARY KEY,
                        name            TEXT NOT NULL,
                        encoding        TEXT NOT NULL,
                        path            TEXT NOT NULL,
                        precedence      INTEGER,
                        related_files   TEXT,
                        spectrogram     TEXT,
                        quality         TEXT,
                        samplerate      INTEGER,
                        tags            TEXT,
                        date_created    TEXT NOT NULL,
                        date_modified   TEXT NOT NULL,
                        audio_fingerprint TEXT,
                        accessible      BOOLEAN
                    )",
                    safe_id
                ),
                [],
            )?;

            println!("Ensured repository table '{}' exists", safe_id);
        }
    }

    Ok(conn)
}



// Function to create a new repository
pub fn create_repository_with_id(id: &str, name: &str, description: &str) -> Result<()> {
    let conn = establish_connection()?;

    conn.execute(
        "INSERT INTO Repositories (id, name, description) VALUES (?, ?, ?)",
        params![id, name, description],
    )?;

    let safe_id = sanitize_identifier(&id)?;

    conn.execute(
        &format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                encoding        TEXT NOT NULL,
                path            TEXT NOT NULL,
                precedence      INTEGER,
                related_files   TEXT,
                spectrogram     TEXT,
                quality         TEXT,
                samplerate      INTEGER,
                tags            TEXT,
                date_created    TEXT NOT NULL,
                date_modified   TEXT NOT NULL,
                audio_fingerprint TEXT,
                accessible      BOOLEAN
            )",
            safe_id
        ),
        [],
    )?;

    Ok(())
}


// Function to delete a repository
pub fn delete_repository(id: &str) -> Result<()> {
    let conn = establish_connection()?;

    // Delete the repository from the 'Repositories' table
    conn.execute("DELETE FROM Repositories WHERE id = ?", params![id])?;

    // Drop the table for the repository
    let safe_id = sanitize_identifier(id)?;

    conn.execute(&format!("DROP TABLE IF EXISTS \"{}\"", safe_id), [])?;
    Ok(())
}

// Function to get all repositories
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

// Function to get a repository by ID
pub fn get_repository(id: &str) -> Result<Repository> {
    let conn = establish_connection()?;
    let mut stmt = conn.prepare("SELECT id, name, description FROM Repositories WHERE id = ?")?;
    let repo = stmt.query_row(params![id], |row| {
        Ok(Repository {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
        })
    })?;
    Ok(repo)
}

// Function to update a repository
pub fn update_repository(id: &str, name: &str, description: &str) -> Result<()> {
    let conn = establish_connection()?;
    conn.execute(
        "UPDATE Repositories SET name = ?, description = ? WHERE id = ?",
        params![name, description, id],
    )?;
    Ok(())
}

// Function to get all files in a repository
pub fn get_files_in_repository(repo_id: &str) -> Result<Vec<FileMetadata>> {
    let conn = establish_connection()?;
    
    // Prepare the SQL query
    let safe_repo_id = sanitize_identifier(repo_id)?;

    let mut stmt = conn.prepare(&format!(
        "SELECT
            id,
            name,
            encoding,
            path,
            precedence,
            related_files,
            spectrogram,
            quality,
            samplerate,
            tags,
            date_created,
            date_modified,
            audio_fingerprint,
            accessible
        FROM \"{}\"",
        safe_repo_id
    ))?;


    // Execute the query and map each row to FileMetadata
    let files = stmt
        .query_map([], |row| {
            Ok(FileMetadata {
                id: row.get(0)?,
                name: row.get(1)?,
                encoding: row.get(2)?,
                path: row.get(3)?,
                precedence: row.get(4)?,
                related_files: row.get(5)?,
                spectrogram: row.get(6)?,
                quality: row.get(7)?,
                samplerate: row.get(8)?,
                tags: row.get(9)?,
                date_created: row.get(10)?,
                date_modified: row.get(11)?,
                audio_fingerprint: row.get(12)?,
                accessible: row.get(13)?,
            })
        })?
        .collect::<Result<Vec<FileMetadata>>>()?;


    Ok(files)
}

// Function to sanitize an ID for use in SQL queries
fn sanitize_identifier(identifier: &str) -> Result<String> {
    let re = regex::Regex::new(r"^[a-zA-Z0-9_-]+$").unwrap();
    if re.is_match(identifier) {
        Ok(identifier.to_string())
    } else {
        Err(rusqlite::Error::InvalidQuery) // You can create a custom error here too
    }
}

// Create a file in a repository
pub fn create_file(repo_id: &str, file: &FileMetadata) -> Result<()> {
    println!("Inserting into repo_id table: {}", repo_id);
    validate_file_metadata(file)?;

    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;
    
    println!("Sanitized repo id: {}", safe_repo_id);

    // Check if a file with the same path already exists
    let mut stmt = conn.prepare(&format!(
        "SELECT COUNT(*) FROM \"{}\" WHERE path = ?",
        safe_repo_id
    ))?;
    let count: i32 = stmt.query_row(params![file.path], |row| row.get(0))?;
    if count > 0 {
        println!("File with path {} already exists in repository {}, skipping insert.", file.path, repo_id);
        return Ok(());
    }

    let result = conn.execute(
        &format!(
            "INSERT INTO \"{}\" (
                id, name, encoding, path, precedence, related_files, spectrogram, quality,
                samplerate, tags, date_created, date_modified, audio_fingerprint, accessible
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            safe_repo_id
        ),
        params![
            file.id, file.name, file.encoding, file.path, file.precedence, file.related_files,
            file.spectrogram, file.quality, file.samplerate, file.tags,
            file.date_created, file.date_modified, file.audio_fingerprint, file.accessible,
        ],
    );

    println!("Insert result: {:?}", result);

    result.map(|_| ())
}




// Update a file in a repository
pub fn update_file(repo_id: &str, file: &FileMetadata) -> Result<()> {
    validate_file_metadata(file)?;
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;

    conn.execute(
        &format!(
            "UPDATE \"{}\" SET
                name = ?1,
                encoding = ?2,
                path = ?3,
                precedence = ?4,
                related_files = ?5,
                spectrogram = ?6,
                quality = ?7,
                samplerate = ?8,
                tags = ?9,
                date_created = ?10,
                date_modified = ?11,
                audio_fingerprint = ?12,
                accessible = ?13
            WHERE id = ?14",
            safe_repo_id
        ),
        params![
            file.name, file.encoding, file.path, file.precedence, file.related_files,
            file.spectrogram, file.quality, file.samplerate, file.tags,
            file.date_created, file.date_modified, file.audio_fingerprint, file.accessible,
            file.id,
        ],
    )?;

    Ok(())
}


// Delete a file from a repository
pub fn delete_file(repo_id: &str, file_id: &str) -> Result<()> {
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;

    conn.execute(
        &format!("DELETE FROM \"{}\" WHERE id = ?", safe_repo_id),
        params![file_id],
    )?;

    Ok(())
}


// Get a File by ID
pub fn get_file(repo_id: &str, file_id: &str) -> Result<FileMetadata> {
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;

    let mut stmt = conn.prepare(&format!(
        "SELECT
            id,
            name,
            encoding,
            path,
            precedence,
            related_files,
            spectrogram,
            quality,
            samplerate,
            tags,
            date_created,
            date_modified,
            audio_fingerprint,
            accessible
        FROM \"{}\" WHERE id = ?",
        safe_repo_id
    ))?;

    let file = stmt.query_row(params![file_id], |row| {
        Ok(FileMetadata {
            id: row.get(0)?,
            name: row.get(1)?,
            encoding: row.get(2)?,
            path: row.get(3)?,
            precedence: row.get(4)?,
            related_files: row.get(5)?,
            spectrogram: row.get(6)?,
            quality: row.get(7)?,
            samplerate: row.get(8)?,
            tags: row.get(9)?,
            date_created: row.get(10)?,
            date_modified: row.get(11)?,
            audio_fingerprint: row.get(12)?,
            accessible: row.get(13)?,
        })
    })?;

    Ok(file)
}



// Validate file metadata
pub fn validate_file_metadata(file: &FileMetadata) -> Result<()> {
    if file.id.trim().is_empty() {
        return Err(rusqlite::Error::InvalidParameterName("File ID cannot be empty".into()));
    }
    if file.name.trim().is_empty() {
        return Err(rusqlite::Error::InvalidParameterName("File name cannot be empty".into()));
    }
    if file.encoding.trim().is_empty() {
        return Err(rusqlite::Error::InvalidParameterName("Encoding cannot be empty".into()));
    }
    if file.path.trim().is_empty() {
        return Err(rusqlite::Error::InvalidParameterName("File path cannot be empty".into()));
    }

    // Validate optional JSON fields
    if let Some(tags) = &file.tags {
        if serde_json::from_str::<serde_json::Value>(tags).is_err() {
            return Err(rusqlite::Error::InvalidParameterName("Tags must be valid JSON".into()));
        }
    }

    if let Some(related_files) = &file.related_files {
        if serde_json::from_str::<serde_json::Value>(related_files).is_err() {
            return Err(rusqlite::Error::InvalidParameterName("Related files must be valid JSON".into()));
        }
    }

    // Optional: validate precedence and samplerate
    if let Some(precedence) = file.precedence {
        if precedence < 0 {
            return Err(rusqlite::Error::InvalidParameterName("Precedence cannot be negative".into()));
        }
    }

    if let Some(samplerate) = file.samplerate {
        if samplerate <= 0 {
            return Err(rusqlite::Error::InvalidParameterName("Samplerate must be positive".into()));
        }
    }

    Ok(())
}

// Function to remove duplicate files from a repository
pub fn remove_duplicate_files_in_repository(repo_id: &str) -> Result<()> {
    println!("LOOKING FOR FILES TO DELETE IN REPO: {}", repo_id);

    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;

    // Query for all paths
    let mut stmt = conn.prepare(&format!(
        "SELECT path FROM \"{}\"",
        safe_repo_id
    ))?;
    
    let all_paths = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut path_counts = std::collections::HashMap::new();
    
    for path_result in all_paths {
        let path = path_result?;
        let normalized = normalize_path(&path);
        *path_counts.entry(normalized).or_insert(0) += 1;
    }
    
    // Now iterate through normalized paths that appear more than once.
    for (normalized_path, count) in path_counts {
        if count > 1 {
            // For each duplicate path, select all ids ordering by date_created
            let mut ids_stmt = conn.prepare(&format!(
                "SELECT id, path FROM \"{}\"",
                safe_repo_id
            ))?;
            let ids: Vec<(String, String)> = ids_stmt
                .query_map([], |row| {
                    // Use index 1 for the path
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                })?
                .filter_map(|res| res.ok())
                .filter(|(_, path)| normalize_path(path) == normalized_path)
                .collect();
            
            if ids.len() > 1 {
                // Skip the first entry (the one we want to keep)
                for (duplicate_id, _) in ids.iter().skip(1) {
                    conn.execute(
                        &format!("DELETE FROM \"{}\" WHERE id = ?", safe_repo_id),
                        params![duplicate_id],
                    )?;
                    println!("Deleted duplicate file with id: {} for normalized path: {}", duplicate_id, normalized_path);
                }
            }
        }
    }
    
    Ok(())
}


// Example helper to normalize path strings
fn normalize_path(path: &str) -> String {
    path.replace("\\", "/")
}
