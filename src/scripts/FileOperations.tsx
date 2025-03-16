import { invoke } from "@tauri-apps/api/core";
import { Repository, useFileStore, useRepositoryStore } from "../components/store";
import { FileMetadata } from "../components/store";


/// Loads the all the files for a given repository.
export const loadFilesScript = async () => {

    const { setAllFiles } = useFileStore.getState();
    const { selectedRepository } = useRepositoryStore.getState();
    const repoId = selectedRepository?.id;

    try {
      if (!repoId) {
        console.warn("No repository selected.");
        setAllFiles([]);
        return;
      }
      console.log("Loading files from repository:", repoId);
      const newFiles: FileMetadata[] = await invoke("get_files_in_repository_command", {
        repoId: repoId,
      });
      console.log("Files returned from backend:", newFiles);
      setAllFiles(newFiles);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  };

/// Add a file to the selected repository.
export const fileAddScript = async (
    selectedRepository: Repository | null,
    fileToAdd: string,
    handleRemoveDuplicates: () => void
) => {
    try {
      if (!selectedRepository) {
        console.warn("No repository selected!");
        return;
      }
      await invoke("create_file_command", {
        repoId: selectedRepository.id,
        filePath: fileToAdd,
      });
      console.log("File added:", fileToAdd);
      await handleRemoveDuplicates();
    } catch (error) {
      console.error("Failed to add file:", error);
    }
  };

/// Searches for duplicate files in the selected repository and removes them.
export const handleRemoveDuplicates = async (
    repoId: string
) => {
    try {
    if (!repoId) {
        console.warn("No repository selected!");
        return;
    }
    await invoke("remove_duplicate_files_command", { repoId: repoId });
    console.log("Duplicate files removed successfully.");
    } catch (error) {
    console.error("Error removing duplicates:", error);
    }
};
