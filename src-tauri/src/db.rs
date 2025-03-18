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
#[derive(Debug, Serialize, Deserialize, Clone)]
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
    
    // Additional metadata fields
    pub meta_title: Option<String>,
    pub meta_comment: Option<String>,
    pub meta_contributing_artists: Option<Vec<String>>,
    pub meta_album_artist: Option<String>,
    pub meta_album: Option<String>,
    pub meta_year: Option<String>,
    pub meta_track_number: Option<String>,
    pub meta_genre: Option<String>,
    pub meta_bit_rate: Option<String>,
    pub meta_channels: Option<String>,
    pub meta_sample_rate: Option<String>,
    pub meta_publisher: Option<String>,
    pub meta_encoded_by: Option<String>,
    pub meta_bpm: Option<String>,
    pub meta_size_on_disk: Option<String>,
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

            // Create the table for the default repository with the complete schema.
            let safe_id = sanitize_identifier(&default_id)?;
            conn.execute(
                &format!(
                    "CREATE TABLE IF NOT EXISTS \"{}\" (
                        id                      TEXT PRIMARY KEY,
                        name                    TEXT NOT NULL,
                        encoding                TEXT NOT NULL,
                        path                    TEXT NOT NULL,
                        precedence              INTEGER,
                        related_files           TEXT,
                        spectrogram             TEXT,
                        quality                 TEXT,
                        samplerate              INTEGER,
                        tags                    TEXT,
                        date_created            TEXT NOT NULL,
                        date_modified           TEXT NOT NULL,
                        audio_fingerprint       TEXT,
                        accessible              BOOLEAN,
                        meta_title              TEXT,
                        meta_comment            TEXT,
                        meta_contributing_artists TEXT,
                        meta_album_artist       TEXT,
                        meta_album              TEXT,
                        meta_year               TEXT,
                        meta_track_number       TEXT,
                        meta_genre              TEXT,
                        meta_bit_rate           TEXT,
                        meta_channels           TEXT,
                        meta_sample_rate        TEXT,
                        meta_publisher          TEXT,
                        meta_encoded_by         TEXT,
                        meta_bpm                 TEXT,
                        meta_size_on_disk       TEXT
                    )",
                    safe_id
                ),
                [],
            )?;

            println!("Default repository table '{}' created", safe_id);
        }
    }

    // Ensure every repository has its corresponding table with the complete schema.
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
                        id                      TEXT PRIMARY KEY,
                        name                    TEXT NOT NULL,
                        encoding                TEXT NOT NULL,
                        path                    TEXT NOT NULL,
                        precedence              INTEGER,
                        related_files           TEXT,
                        spectrogram             TEXT,
                        quality                 TEXT,
                        samplerate              INTEGER,
                        tags                    TEXT,
                        date_created            TEXT NOT NULL,
                        date_modified           TEXT NOT NULL,
                        audio_fingerprint       TEXT,
                        accessible              BOOLEAN,
                        meta_title              TEXT,
                        meta_comment            TEXT,
                        meta_contributing_artists TEXT,
                        meta_album_artist       TEXT,
                        meta_album              TEXT,
                        meta_year               TEXT,
                        meta_track_number       TEXT,
                        meta_genre              TEXT,
                        meta_bit_rate           TEXT,
                        meta_channels           TEXT,
                        meta_sample_rate        TEXT,
                        meta_publisher          TEXT,
                        meta_encoded_by         TEXT,
                        meta_bpm                 TEXT,
                        meta_size_on_disk       TEXT
                    )",
                    safe_id
                ),
                [],
            )?;
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
                id                      TEXT PRIMARY KEY,
                name                    TEXT NOT NULL,
                encoding                TEXT NOT NULL,
                path                    TEXT NOT NULL,
                precedence              INTEGER,
                related_files           TEXT,
                spectrogram             TEXT,
                quality                 TEXT,
                samplerate              INTEGER,
                tags                    TEXT,
                date_created            TEXT NOT NULL,
                date_modified           TEXT NOT NULL,
                audio_fingerprint       TEXT,
                accessible              BOOLEAN,
                meta_title              TEXT,
                meta_comment            TEXT,
                meta_contributing_artists TEXT,
                meta_album_artist       TEXT,
                meta_album              TEXT,
                meta_year               TEXT,
                meta_track_number       TEXT,
                meta_genre              TEXT,
                meta_bit_rate           TEXT,
                meta_channels           TEXT,
                meta_sample_rate        TEXT,
                meta_publisher          TEXT,
                meta_encoded_by         TEXT,
                meta_bpm                 TEXT,
                meta_size_on_disk       TEXT
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
    let safe_repo_id = sanitize_identifier(repo_id)?;

    let mut stmt = conn.prepare(&format!(
        "SELECT
            id,                -- 0
            name,              -- 1
            encoding,          -- 2
            path,              -- 3
            precedence,        -- 4
            related_files,     -- 5
            spectrogram,       -- 6
            quality,           -- 7
            samplerate,        -- 8
            tags,              -- 9
            date_created,      -- 10
            date_modified,     -- 11
            audio_fingerprint, -- 12
            accessible,        -- 13
            meta_title,        -- 14
            meta_comment,      -- 15
            meta_contributing_artists, -- 16
            meta_album_artist,          -- 17
            meta_album,                 -- 18
            meta_year,                  -- 19
            meta_track_number,          -- 20
            meta_genre,                 -- 21
            meta_bit_rate,              -- 22
            meta_channels,              -- 23
            meta_sample_rate,           -- 24
            meta_publisher,             -- 25
            meta_encoded_by,            -- 26
            meta_bpm,                   -- 27
            meta_size_on_disk           -- 28
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
                meta_title: row.get(14)?,
                meta_comment: row.get(15)?,
                meta_contributing_artists: {
                    let s: Option<String> = row.get(16)?;
                    if let Some(ref json_str) = s {
                        if json_str.trim().is_empty() {
                            None
                        } else {
                            Some(serde_json::from_str(json_str).map_err(|e| {
                                rusqlite::Error::FromSqlConversionFailure(16, rusqlite::types::Type::Text, Box::new(e))
                            })?)
                        }
                    } else {
                        None
                    }
                },
                meta_album_artist: row.get(17)?,
                meta_album: row.get(18)?,
                meta_year: row.get(19)?,
                meta_track_number: row.get(20)?,
                meta_genre: row.get(21)?,
                meta_bit_rate: row.get(22)?,
                meta_channels: row.get(23)?,
                meta_sample_rate: row.get(24)?,
                meta_publisher: row.get(25)?,
                meta_encoded_by: row.get(26)?,
                meta_bpm: row.get(27)?,
                meta_size_on_disk: row.get(28)?,
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

    // Check if a file with the same path already exists.
    let mut stmt = conn.prepare(&format!(
        "SELECT COUNT(*) FROM \"{}\" WHERE path = ?",
        safe_repo_id
    ))?;
    let count: i32 = stmt.query_row(params![file.path], |row| row.get(0))?;
    if count > 0 {
        println!(
            "File with path {} already exists in repository {}, skipping insert.",
            file.path, repo_id
        );
        return Ok(());
    }

    // Note: There are 29 columns to insert.
    let result = conn.execute(
        &format!(
            "INSERT INTO \"{}\" (
                id, name, encoding, path, precedence, related_files, spectrogram, quality,
                samplerate, tags, date_created, date_modified, audio_fingerprint, accessible,
                meta_title, meta_comment, meta_contributing_artists, meta_album_artist,
                meta_album, meta_year, meta_track_number, meta_genre, meta_bit_rate, meta_channels,
                meta_sample_rate, meta_publisher, meta_encoded_by, meta_bpm, meta_size_on_disk
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29)",
            safe_repo_id
        ),
        params![
            file.id,
            file.name,
            file.encoding,
            file.path,
            file.precedence,
            file.related_files,
            file.spectrogram,
            file.quality,
            file.samplerate,
            file.tags,
            file.date_created,
            file.date_modified,
            file.audio_fingerprint,
            file.accessible,
            file.meta_title,
            file.meta_comment,
            // Serialize meta_contributing_artists to JSON if present.
            file.meta_contributing_artists.as_ref().map(|v| serde_json::to_string(v).unwrap()),
            file.meta_album_artist,
            file.meta_album,
            file.meta_year,
            file.meta_track_number,
            file.meta_genre,
            file.meta_bit_rate,
            file.meta_channels,
            file.meta_sample_rate,
            file.meta_publisher,
            file.meta_encoded_by,
            file.meta_bpm,
            file.meta_size_on_disk,
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
                accessible = ?13,
                meta_title = ?14,
                meta_comment = ?15,
                meta_contributing_artists = ?16,
                meta_album_artist = ?17,
                meta_album = ?18,
                meta_year = ?19,
                meta_track_number = ?20,
                meta_genre = ?21,
                meta_bit_rate = ?22,
                meta_channels = ?23,
                meta_sample_rate = ?24,
                meta_publisher = ?25,
                meta_encoded_by = ?26,
                meta_bpm = ?27,
                meta_size_on_disk = ?28
            WHERE id = ?29",
            safe_repo_id
        ),
        params![
            file.name,
            file.encoding,
            file.path,
            file.precedence,
            file.related_files,
            file.spectrogram,
            file.quality,
            file.samplerate,
            file.tags,
            file.date_created,
            file.date_modified,
            file.audio_fingerprint,
            file.accessible,
            file.meta_title,
            file.meta_comment,
            // Serialize meta_contributing_artists as a JSON string if it exists.
            file.meta_contributing_artists.as_ref().map(|v| serde_json::to_string(v).unwrap()),
            file.meta_album_artist,
            file.meta_album,
            file.meta_year,
            file.meta_track_number,
            file.meta_genre,
            file.meta_bit_rate,
            file.meta_channels,
            file.meta_sample_rate,
            file.meta_publisher,
            file.meta_encoded_by,
            file.meta_bpm,
            file.meta_size_on_disk,
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


pub fn get_file(repo_id: &str, file_id: &str) -> Result<FileMetadata> {
    let conn = establish_connection()?;
    let safe_repo_id = sanitize_identifier(repo_id)?;

    let mut stmt = conn.prepare(&format!(
        "SELECT
            id,                      -- 0
            name,                    -- 1
            encoding,                -- 2
            path,                    -- 3
            precedence,              -- 4
            related_files,           -- 5
            spectrogram,             -- 6
            quality,                 -- 7
            samplerate,              -- 8
            tags,                    -- 9
            date_created,            -- 10
            date_modified,           -- 11
            audio_fingerprint,       -- 12
            accessible,              -- 13
            meta_title,              -- 14
            meta_comment,            -- 15
            meta_contributing_artists, -- 16
            meta_album_artist,       -- 17
            meta_album,              -- 18
            meta_year,               -- 19
            meta_track_number,       -- 20
            meta_genre,              -- 21
            meta_bit_rate,           -- 22
            meta_channels,           -- 23
            meta_sample_rate,        -- 24
            meta_publisher,          -- 25
            meta_encoded_by,         -- 26
            meta_bpm,                -- 27
            meta_size_on_disk         -- 28
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
            meta_title: row.get(14)?,
            meta_comment: row.get(15)?,
            meta_contributing_artists: {
                let s: Option<String> = row.get(16)?;
                if let Some(ref json_str) = s {
                    if json_str.trim().is_empty() {
                        None
                    } else {
                        Some(serde_json::from_str(json_str).map_err(|e| {
                            rusqlite::Error::FromSqlConversionFailure(
                                16,
                                rusqlite::types::Type::Text,
                                Box::new(e),
                            )
                        })?)
                    }
                } else {
                    None
                }
            },
            meta_album_artist: row.get(17)?,
            meta_album: row.get(18)?,
            meta_year: row.get(19)?,
            meta_track_number: row.get(20)?,
            meta_genre: row.get(21)?,
            meta_bit_rate: row.get(22)?,
            meta_channels: row.get(23)?,
            meta_sample_rate: row.get(24)?,
            meta_publisher: row.get(25)?,
            meta_encoded_by: row.get(26)?,
            meta_bpm: row.get(27)?,
            meta_size_on_disk: row.get(28)?,
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

    // Load all files in the repository.
    let files = get_files_in_repository(repo_id)?;

    // Group files by their normalized path.
    let mut groups: std::collections::HashMap<String, Vec<FileMetadata>> = std::collections::HashMap::new();
    for file in files {
        let normalized = normalize_path(&file.path);
        groups.entry(normalized).or_default().push(file);
    }

    // For each group of duplicates (more than one file with the same normalized path)
    for (normalized_path, group) in groups {
        if group.len() > 1 {
            // Choose the best record: the one with the highest completeness score.
            // In case of a tie, choose the one with the most recent date_created.
            let best = group.iter().max_by(|a, b| {
                let score_a = completeness_score(a);
                let score_b = completeness_score(b);
                if score_a == score_b {
                    // Parse the date strings; if parsing fails, fall back to a minimal date.
                    let date_a = chrono::DateTime::parse_from_rfc3339(&a.date_created)
                                            .unwrap_or_else(|_| chrono::DateTime::<chrono::Utc>::from(std::time::UNIX_EPOCH).with_timezone(&chrono::FixedOffset::east_opt(0).unwrap()));
                    let date_b = chrono::DateTime::parse_from_rfc3339(&b.date_created)
                                            .unwrap_or_else(|_| chrono::DateTime::<chrono::Utc>::from(std::time::UNIX_EPOCH).with_timezone(&chrono::FixedOffset::east_opt(0).unwrap()));
                    // Compare so that the later (more recent) date wins.
                    date_a.cmp(&date_b)
                } else {
                    score_a.cmp(&score_b)
                }
            });

            // For each file in the duplicate group that is not the best, delete it.
            if let Some(best_file) = best {
                for file in &group {
                    if file.id != best_file.id {
                        conn.execute(
                            &format!("DELETE FROM \"{}\" WHERE id = ?", safe_repo_id),
                            params![file.id],
                        )?;
                        println!(
                            "Deleted duplicate file with id: {} for normalized path: {}",
                            file.id, normalized_path
                        );
                    }
                }
            }
        }
    }

    Ok(())
}

/// Compute a completeness score based on how many optional metadata fields are populated.
fn completeness_score(file: &FileMetadata) -> u32 {
    let mut score = 0;
    if file.precedence.is_some() { score += 1; }
    if file.related_files.is_some() { score += 1; }
    if file.spectrogram.is_some() { score += 1; }
    if file.quality.is_some() { score += 1; }
    if file.samplerate.is_some() { score += 1; }
    if file.tags.is_some() { score += 1; }
    if file.audio_fingerprint.is_some() { score += 1; }
    if file.meta_title.is_some() { score += 1; }
    if file.meta_comment.is_some() { score += 1; }
    if file.meta_contributing_artists.is_some() { score += 1; }
    if file.meta_album_artist.is_some() { score += 1; }
    if file.meta_album.is_some() { score += 1; }
    if file.meta_year.is_some() { score += 1; }
    if file.meta_track_number.is_some() { score += 1; }
    if file.meta_genre.is_some() { score += 1; }
    if file.meta_bit_rate.is_some() { score += 1; }
    if file.meta_channels.is_some() { score += 1; }
    if file.meta_sample_rate.is_some() { score += 1; }
    if file.meta_publisher.is_some() { score += 1; }
    if file.meta_encoded_by.is_some() { score += 1; }
    if file.meta_bpm.is_some() { score += 1; }
    if file.meta_size_on_disk.is_some() { score += 1; }
    score
}

/// Example helper to normalize path strings.
fn normalize_path(path: &str) -> String {
    path.replace("\\", "/")
}