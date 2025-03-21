# Commands Module Reference

All functions are wrapped in Tauri commands using `spawn_blocking` to ensure that blocking operations do not affect the responsiveness of the main thread.

---

## Repository CRUD

### create_repository_command
- **Parameters:**  
  - `id` (String): A unique identifier for the repository.  
  - `name` (String): The repository’s name.  
  - `description` (String): A description of the repository.
- **Description:**  
  Creates a new repository entry in the database. In addition to inserting the repository into the `Repositories` table, this command creates a corresponding file table (named after the repository ID) to store file metadata.

### delete_repository_command
- **Parameters:**  
  - `id` (String): The identifier of the repository to delete.
- **Description:**  
  Deletes the repository record from the `Repositories` table and drops the associated file table. This completely removes the repository and all its file records.

### get_repositories_command
- **Parameters:**  
  - _None_
- **Description:**  
  Retrieves a list of all repositories. Each repository includes its `id`, `name`, and `description`.

### get_repository_command
- **Parameters:**  
  - `id` (String): The repository identifier.
- **Description:**  
  Fetches and returns a single repository’s details (i.e. `id`, `name`, and `description`) based on the provided identifier.

### update_repository_command
- **Parameters:**  
  - `id` (String): The identifier of the repository to update.  
  - `name` (String): The new name for the repository.  
  - `description` (String): The new description.
- **Description:**  
  Updates the specified repository’s name and description in the database.

### get_files_in_repository_command
- **Parameters:**  
  - `repo_id` (String): The identifier of the repository.
- **Description:**  
  Retrieves all file records stored in the repository’s file table. Each record is returned as a `FileMetadata` object containing various file attributes.

---

## Files CRUD

### create_file_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier where the file should be inserted.  
  - `file` (FileMetadata): The file data to insert, including fields such as `id`, `name`, `encoding`, `path`, `date_created`, `date_modified`, and additional metadata.
- **Description:**  
  Inserts a new file record into the repository’s file table.  
  - **Duplicate Handling:** If a file with the same normalized path (backslashes converted to forward slashes) already exists, the insert is skipped. After insertion, duplicate files are removed—retaining only the most recently modified record.

### update_file_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier where the file is stored.  
  - `file` (FileMetadata): The updated file data.
- **Description:**  
  Updates an existing file record in the repository’s file table with new metadata.

### delete_file_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier.  
  - `file_id` (String): The identifier of the file to delete.
- **Description:**  
  Deletes a file record from the specified repository’s file table.

### get_file_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier.  
  - `file_id` (String): The identifier of the file to fetch.
- **Description:**  
  Retrieves a specific file’s metadata from the repository’s file table.

### remove_duplicate_files_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier.
- **Description:**  
  Scans the file records in the repository for duplicates based on normalized file paths, and removes all but the most recently modified record.

---

## Settings CRUD

### create_setting_command
- **Parameters:**  
  - `setting_name` (String): The name/key of the setting.  
  - `value` (String): The value to assign to the setting.
- **Description:**  
  Inserts a new setting into the `Settings` table with a generated unique id, allowing for configurable options.

### update_setting_command
- **Parameters:**  
  - `setting_name` (String): The name/key of the setting to update.  
  - `new_value` (String): The new value for the setting.
- **Description:**  
  Updates the value of an existing setting in the database.

### get_setting_command
- **Parameters:**  
  - `setting_name` (String): The name/key of the setting to retrieve.
- **Description:**  
  Fetches a setting from the database. Returns an optional `Settings` record containing `id`, `setting`, and `value`. Returns `None` if the setting does not exist.

---

## Audio Metadata Commands

### get_audio_metadata_from_file_command
- **Parameters:**  
  - `file_path` (String): The full path to the audio file.
- **Description:**  
  Reads audio metadata from the specified file using Lofty’s `Probe`. Extracts both editable tag fields (such as title, comment, album artist, album, track number, genre) and file system properties (creation time, modification time, file size). Returns a populated `FileMetadata` object.

### clear_audio_metadata_from_file_command
- **Parameters:**  
  - `file_path` (String): The full path to the audio file.
- **Description:**  
  Clears all metadata from the file by removing all embedded tags.

### write_audio_metadata_to_file_command
- **Parameters:**  
  - `file_metadata` (FileMetadata): A structure containing new metadata values.
- **Description:**  
  Writes new audio metadata to the specified file by first clearing existing metadata and then writing updated tag information (e.g. title, comment, album artist, album, track number, genre) to the file.

---

## Audio Fingerprint Commands

### generate_audio_fingerprint_for_file_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier where the file is stored.  
  - `file` (FileMetadata): The file metadata object for the file to be fingerprinted.
- **Description:**  
  Generates an audio fingerprint for the provided file using Symphonia for decoding and a fingerprinting library (e.g., rusty_chromaprint).  
  **Process:**  
  1. Opens and decodes the audio file, processing packets from the first supported audio track.  
  2. Feeds the decoded samples to the fingerprinter to compute a fingerprint.  
  3. Converts the fingerprint (a vector of `u32` values) into a hexadecimal string.  
  4. Updates the file's database entry with the new fingerprint.

---

## Actions Commands

### refresh_files_in_repository_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier.
- **Description:**  
  Refreshes the file records for a single repository by:  
  - Checking if each file still exists at its stored path.  
  - Marking files as inaccessible if they no longer exist.  
  - Updating file metadata if the file’s last modified timestamp has changed.

### refresh_files_in_all_repositories_command
- **Parameters:**  
  - _None_
- **Description:**  
  Iterates over all repositories in the database and refreshes each repository’s file records by invoking `refresh_files_in_repository_command` for each one.
