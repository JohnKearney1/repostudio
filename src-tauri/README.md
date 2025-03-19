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
  Retrieves all file records stored in the repository’s file table. Each record is returned as a `FileMetadata` object containing various file attributes (e.g. id, name, encoding, path, metadata, etc.).

---

## Files CRUD

### create_file_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier where the file should be inserted.  
  - `file` (FileMetadata): The file data to insert. This structure includes fields such as `id`, `name`, `encoding`, `path`, `date_created`, `date_modified`, and additional metadata.
- **Description:**  
  Inserts a new file record into the repository’s file table.  
  - **Duplicate Handling:** Before insertion, the command checks if a file with the same normalized path (backslashes converted to forward slashes) already exists. If so, the insert is skipped.  
  - After insertion, the command automatically scans for and removes duplicate file records—retaining only the most recently modified file in case of duplicates.

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
  Scans the file records in the specified repository for duplicates based on normalized file paths. If duplicates are found, it removes all but the most recently modified record. This ensures that only the best version of each file remains.

---

## Settings CRUD

### create_setting_command
- **Parameters:**  
  - `setting_name` (String): The name/key of the setting.  
  - `value` (String): The value to assign to the setting.
- **Description:**  
  Inserts a new setting into the `Settings` table with a generated unique id. Useful for adding new configurable options.

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
  Fetches a setting from the database. Returns an optional `Settings` record (with `id`, `setting`, and `value`). If the setting does not exist, it returns `None`.

---

## Audio Metadata Commands

### get_audio_metadata_from_file_command
- **Parameters:**  
  - `file_path` (String): The full path to the audio file.
- **Description:**  
  Reads audio metadata from the specified file using Lofty’s `Probe`.  
  - Extracts both editable tag fields (such as title, comment, album artist, album, track number, genre) and file system properties (creation time, modification time, file size).  
  - Returns a `FileMetadata` object populated with the extracted data.

### clear_audio_metadata_from_file_command
- **Parameters:**  
  - `file_path` (String): The full path to the audio file.
- **Description:**  
  Clears all metadata from the file by iterating over each unique tag type and invoking its built-in removal function.  
  - This effectively strips the file of any embedded tags.

### write_audio_metadata_to_file_command
- **Parameters:**  
  - `file_metadata` (FileMetadata): A structure containing new metadata values.
- **Description:**  
  Writes new audio metadata to the specified file.  
  - **Process:**  
    1. Clears all existing metadata from the file.  
    2. Re-opens the file and either obtains a mutable reference to an existing tag or creates a new tag if none exists.  
    3. Populates the tag with new editable fields from the provided `FileMetadata` (e.g. title, comment, album artist, album, track number, genre).  
    4. Saves the updated tag back to the file using Lofty’s default write options.

---

## Audio Fingerprint Commands

### generate_audio_fingerprint_for_file_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier where the file is stored.  
  - `file` (FileMetadata): The file metadata object for the file to be fingerprinted.
- **Description:**  
  Generates an audio fingerprint for the provided file using Symphonia for audio decoding and a fingerprinting library (e.g., rusty_chromaprint) with a preset configuration.  
  - **Process:**  
    1. Opens and decodes the audio file, processing packets from the first supported audio track.  
    2. Feeds the decoded samples to the fingerprinter to compute a fingerprint.  
    3. Converts the resulting fingerprint (a vector of `u32` values) into a hexadecimal string.  
    4. Updates the file's database entry with its original metadata plus the newly generated fingerprint using the existing update function.

---

## Actions Commands

### refresh_files_in_repository_command
- **Parameters:**  
  - `repo_id` (String): The repository identifier.
- **Description:**  
  Refreshes the file records for a single repository by:
  - Checking that each file still exists at its stored path.
  - If a file no longer exists, marking it as inaccessible.
  - If a file exists, comparing the file’s last modified timestamp on the system with the stored value.  
    If they differ, re-reading the file’s metadata from disk and updating the database entry accordingly.

### refresh_files_in_all_repositories_command
- **Parameters:**  
  - _None_
- **Description:**  
  Iterates over all repositories in the database and refreshes each repository’s file records by calling `refresh_files_in_repository_command` for each one.
