use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrackedFolder {
    pub id: String,
    pub repo_id: String,
    pub folder_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub encoding: String,
    pub path: String,
    pub related_files: Option<String>,        
    pub tags: Option<String>,                 
    pub date_created: String,
    pub date_modified: String,
    pub audio_fingerprint: Option<String>,
    pub accessible: bool,
    
    // Editable metadata fields
    pub meta_title: Option<String>,
    pub meta_comment: Option<String>,
    pub meta_album_artist: Option<String>,
    pub meta_album: Option<String>,
    pub meta_track_number: Option<String>,
    pub meta_genre: Option<String>,

    // Audio metadata fields
    pub meta_bit_rate: Option<String>,
    pub meta_channels: Option<String>,
    pub meta_sample_rate: Option<String>,
    pub meta_size_on_disk: Option<String>,
}

// Data model for a repository table
#[derive(Debug, Serialize, Deserialize)]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub description: String,
}

// Data model for a single setting in the settings table
#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub id: String,
    pub setting: String,
    pub value: String,
}