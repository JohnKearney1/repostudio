// FileOperations.tsx
import { invoke } from "@tauri-apps/api/core";
import { v4 as uuidv4 } from "uuid";
import { useFileStore, useRepositoryStore } from "./store/store";
import { FileMetadata, Repository } from "../types/ObjectTypes";

/**
 * Loads all files for a given repository.
 */
export const loadFilesScript = async () => {
  const { setAllFiles, selectedFiles, setSelectedFiles } = useFileStore.getState();
  const { selectedRepository } = useRepositoryStore.getState();
  const repoId = selectedRepository?.id;

  try {
    if (!repoId) {
      console.warn("No repository selected.");
      setAllFiles([]);
      setSelectedFiles([]);
      return;
    }

    const newFiles: FileMetadata[] = await invoke("get_files_in_repository_command", {
      repoId: repoId,
    });

    const selectedFileIds = new Set(selectedFiles.map((f) => f.id));
    setAllFiles(newFiles);

    const preservedSelection = newFiles.filter((file) => selectedFileIds.has(file.id));
    setSelectedFiles(preservedSelection);
  } catch (error) {
    console.error("Failed to load files:", error);
  }
};

/**
 * Adds a file to the selected repository.
 */
export const fileAddScript = async (
  selectedRepository: Repository | null,
  file_path: string
) => {
  if (!selectedRepository) {
    console.warn("No repository selected!");
    return;
  }

  try {
    // Step 1: Get the audio metadata from backend
    const fileMetadata: FileMetadata = await invoke("get_audio_metadata_from_file_command", {
      filePath: file_path,
    });

    // Step 2: Add additional required fields to FileMetadata
    const newFile: FileMetadata = {
      ...fileMetadata,
      id: uuidv4(), // generate a unique ID here
      accessible: true,
      related_files: null,
      tags: null,
      audio_fingerprint: null,
    };

    // Step 3: Create the file in the backend repository
    await invoke("create_file_command", {
      repoId: selectedRepository.id,
      file: newFile,
    });

    // Optional: Refresh repository files
    await loadFilesScript();
  } catch (error) {
    console.error("Failed to add file:", error);
  }
};

/**
 * Searches for duplicate files in the selected repository and removes them.
 */
export const handleRemoveDuplicates = async (repoId: string) => {
  try {
    if (!repoId) {
      console.warn("No repository selected!");
      return;
    }
    await invoke("remove_duplicate_files_command", { repoId: repoId });
    // Optional: Reload files after removing duplicates
    await loadFilesScript();
  } catch (error) {
    console.error("Error removing duplicates:", error);
  }
};

/**
 * Refreshes files in the selected repository (syncs files on disk with DB)
 */
export const refreshFilesScript = async () => {
  const { selectedRepository } = useRepositoryStore.getState();

  if (!selectedRepository) {
    console.warn("No repository selected!");
    return;
  }

  try {
    console.log("Refreshing files for repository:", selectedRepository.id);

    await invoke("refresh_files_in_repository_command", {
      repoId: selectedRepository.id,
    });

    console.log("Files refreshed!");
    await loadFilesScript();
  } catch (error) {
    console.error("Failed to refresh repository files:", error);
  }
};

/**
 * Generates a fingerprint for a given file and updates its record in the backend database.
 * Responds when the fingerprint generation and update have completed.
 */
export const fingerprintFileScript = async (
  selectedRepository: Repository | null,
  file: FileMetadata
) => {
  if (!selectedRepository) {
    console.warn("No repository selected!");
    return;
  }

  try {
    await invoke("generate_audio_fingerprint_for_file_command", {
      repoId: selectedRepository.id,
      file: file,
    });
    await loadFilesScript();
  } catch (error) {
    console.error("Failed to generate fingerprint for file:", error);
  }
};

