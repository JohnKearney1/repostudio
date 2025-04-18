use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub profession: Option<String>,
    pub notes: Option<String>,
    pub handle: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContactList {
    pub id: String,
    pub name: String,
    pub contacts: Vec<Contact>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub general_auto_fingerprint: bool,
    pub general_theme: String,
    pub audio_autoplay: bool,
    pub setup_selected_repository: String,
}

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
