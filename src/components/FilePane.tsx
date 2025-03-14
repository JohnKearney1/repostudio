import React, { useState, useEffect } from 'react';
import { FilePlusIcon, ArchiveIcon, ReloadIcon, CubeIcon } from '@radix-ui/react-icons';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { readDir } from '@tauri-apps/plugin-fs';
import { useFileStore, FileMetadata, usePopupStore, useRepositoryStore, Repository } from './store';
import './FilePane.css';

const FilePane: React.FC = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedFile, setSelectedFile } = useFileStore();
  // Subscribe to the repository store instead of reading it directly:
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const repositories = useRepositoryStore((state) => state.repositories);
  const setRepositories = useRepositoryStore((state) => state.setRepositories);
  const setSelectedRepository = useRepositoryStore((state) => state.setSelectedRepository);

  // Function to load files from the backend
  const loadFiles = async (repoId?: string) => {
    try {
      const repoIdToUse = repoId || selectedRepository?.id;
      if (!repoIdToUse) {
        console.warn("No repository selected.");
        setFiles([]);
        return;
      }
      console.log("Loading files for repo:", repoIdToUse);
      const files: FileMetadata[] = await invoke("get_files_in_repository_command", {
        repoId: repoIdToUse
      });
      console.log("Files returned from backend:", files);
      setFiles(files);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  };

  const handleRemoveDuplicates = async () => {
    try {
      if (!selectedRepository) {
        console.warn("No repository selected!");
        return;
      }
      await invoke("remove_duplicate_files_command", { repoId: selectedRepository.id });
      console.log("Duplicate files removed successfully.");
    } catch (error) {
      console.error("Error removing duplicates:", error);
    }
  };

  // Function to load all repositories from the backend
  const loadRepositories = async () => {
    try {
      let repos: Repository[] = await invoke("get_repositories_command");
      if (repos.length === 0) {
        console.log("No repositories found. Creating default repository...");
        const defaultRepoId: string = await invoke("create_repository_command", {
          name: "Default Repository",
          description: "This is the default repository, customize it however!",
          id: "default"
        });
        console.log("Default repository created with ID:", defaultRepoId);
        repos = await invoke("get_repositories_command");
      }
      console.log("Repositories returned from backend:", repos);
      setRepositories(repos);
      setSelectedRepository(repos[0]);
      loadFiles(repos[0].id);
    } catch (error) {
      console.error("Failed to load repositories:", error);
    }
  };

  // Whenever the selectedRepository changes, refresh the files
  useEffect(() => {
    if (selectedRepository) {
      loadFiles(selectedRepository.id);
    }
  }, [selectedRepository]);

  // Load repositories on component mount
  useEffect(() => {
    loadRepositories();
  }, []);

  // Handler for adding a file
  const handleFileAdd = async () => {
    try {
      if (!selectedRepository) {
        console.warn("No repository selected!");
        return;
      }
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio',
          extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac']
        }]
      });
      if (!selected) {
        console.log("No file selected");
        return;
      }
      await invoke("create_file_command", {
        repoId: selectedRepository.id,
        filePath: selected
      });
      console.log("File added:", selected);
      await handleRemoveDuplicates();
      loadFiles(selectedRepository.id);
    } catch (error) {
      console.error("Failed to add file:", error);
    }
  };

  // Handler for adding a folder
  const handleFolderAdd = async () => {
    try {
      if (!selectedRepository) {
        console.warn("No repository selected!");
        return;
      }
      const selectedDir = await open({
        directory: true,
        multiple: false
      });
      if (!selectedDir) {
        console.log("No folder selected");
        return;
      }
      const entries = await readDir(selectedDir);
      const audioExtensions = ['mp3', 'wav', 'flac', 'ogg', 'aac'];
      const audioFiles = entries
        .filter(entry => !(entry as any).children)
        .filter(entry => {
          const ext = entry.name?.split('.').pop()?.toLowerCase();
          return ext && audioExtensions.includes(ext);
        })
        .map(file => ({
          ...file,
          path: `${selectedDir}/${file.name}`
        }));
      console.log(`Found ${audioFiles.length} audio files`);
      const insertPromises = audioFiles.map((file) => {
        const filePath = (file as any).path;
        if (filePath) {
          console.log("File entry:", filePath);
          return invoke("create_file_command", {
            repoId: selectedRepository.id,
            filePath: filePath
          }).catch(error => {
            console.error(`Failed to add file ${filePath}:`, error);
            return null;
          });
        } else {
          return Promise.resolve(null);
        }
      });
      await Promise.all(insertPromises);
      await handleRemoveDuplicates();
      await loadFiles(selectedRepository.id);
      console.log("Files should now be loaded");
    } catch (error) {
      console.error("Failed to add folder:", error);
    }
  };

  // Handler for the refresh button
  const handleRefresh = async () => {
    if (!selectedRepository) {
      await loadRepositories();
    } else {
      await handleRemoveDuplicates();
      await loadRepositories();
      await loadFiles(selectedRepository.id);
    }
  };

  // Handler for selecting/deselecting a file
  const handleFileSelect = (file: FileMetadata) => {
    if (selectedFile && selectedFile.id === file.id) {
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

  // Filter files based on search query (case-insensitive)
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="file-pane">
      <div className="toolbar">
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', borderBottom: '1px solid black' }}>
          <button className="toolbar-button" onClick={() => usePopupStore.getState().setVisible(true)}>
            <CubeIcon style={{ paddingRight: '0.75rem', width: '20px', height: '20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left' }}>
              <h4>{selectedRepository?.name || 'No Repository Selected'}</h4>
              <h5>
                #{selectedRepository?.id || 'Select a repository to view files'}
              </h5>
            </div>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
          <button onClick={handleFileAdd} className="toolbar-button" style={{ borderRight: '1px solid black' }}>
            <FilePlusIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>Track File</h6>
          </button>
          <button onClick={handleFolderAdd} className="toolbar-button" style={{ borderRight: '1px solid black' }}>
            <ArchiveIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>Track Folder</h6>
          </button>
          <button onClick={handleRefresh} className="toolbar-button">
            <ReloadIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>Refresh</h6>
          </button>
        </div>
      </div>
      <input
        type="text"
        placeholder="Search..."
        className="searchbar"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="file-view">
        {filteredFiles.length > 0 ? (
          <div className="file-list">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`list-item ${!file.accessible ? 'inaccessible' : ''} ${selectedFile && selectedFile.id === file.id ? 'selected' : ''}`}
                onClick={() => handleFileSelect(file)}
              >
                {file.name}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              flexDirection: 'column'
            }}
          >
            <h4>Nothing's Here!</h4>
            <br />
            <h5>Try adding a file or folder</h5>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePane;
