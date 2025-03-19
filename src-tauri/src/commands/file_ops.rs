use lofty::file;

use super::structures::FileMetadata;


// --------------------------------- //
//           File Operations         //
// --------------------------------- //

/// Uses Lofty to get the metadata of an audio file

pub fn get_audio_metadata_from_file() {

}


// Uses Lofty to write metadata to an audio file
pub fn write_audio_metadata_to_file() {


}

pub fn clear_audio_metadata_from_file() {

}



// --------------------------------- //
//           Tauri Commands          //
// --------------------------------- //

#[tauri::command]
pub fn get_audio_metadata_from_file_command() {
    get_audio_metadata_from_file()
}

#[tauri::command]
pub fn write_audio_metadata_to_file_command() {
    write_audio_metadata_to_file()
}

#[tauri::command]
pub fn clear_audio_metadata_from_file_command() {
    clear_audio_metadata_from_file()
}