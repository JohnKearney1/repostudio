import React, { useState, useEffect } from 'react';
import { FilePlusIcon, ArchiveIcon, ReloadIcon, CubeIcon } from '@radix-ui/react-icons';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
// Import readDir to list folder contents
import { readDir } from '@tauri-apps/plugin-fs';
import { useFileStore, FileMetadata } from './store';
import './FilePane.css';

const FilePane: React.FC = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const { selectedFile, setSelectedFile } = useFileStore();

  // Function to load files from the backend
  const loadFiles = async () => {
    try {
      const result = await invoke<FileMetadata[]>('get_all_files');
      setFiles(result);
      console.log("Files loaded successfully!");
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  // Initial load of files when the component mounts
  useEffect(() => {
    loadFiles();
  }, []);

  // Handler for adding a file (unchanged)
  const handleAddFile = async () => {
    try {
      // Open a file dialog with audio file filters
      const selectedFileDialog = await open({
        multiple: false,
        filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg'] }]
      });
      
      if (selectedFileDialog) {
        // Ensure we have a single file path
        const filePath = typeof selectedFileDialog === 'string' ? selectedFileDialog : selectedFileDialog[0];
        // Extract the file name from the full path
        const parts = filePath.split(/[\\/]/);
        const fileName = parts[parts.length - 1] || 'Unnamed';
        // Derive encoding from the file extension
        const extension = fileName.split('.').pop() || 'unknown';

        // Call the Tauri backend command "add_file"
        await invoke('add_file', {
          name: fileName,
          encoding: extension,
          path: filePath,
          precedence: 'current', // Default value, adjust as needed
          other_versions: [],
          spectrogram: null,
          quality: null,
          samplerate: null,
          tags: []
        });

        console.log('File added successfully!');
        // Refresh the file list after adding the file
        loadFiles();
      }
    } catch (error) {
      console.error('Error adding file:', error);
    }
  };

  // Handler for adding a folder
  // In FilePane.tsx
const handleAddFolder = async () => {
  try {
    // Open a directory dialog
    const selectedFolder = await open({ directory: true });
    if (selectedFolder && typeof selectedFolder === 'string') {
      // Call the new Tauri command "add_folder"
      const count = await invoke<number>('add_folder', { folderPath: selectedFolder });
      console.log(`${count} file(s) added from folder.`);
      loadFiles();
    }
  } catch (error) {
    console.error('Error adding folder:', error);
  }
};


  // Handler for the refresh button
  const handleRefresh = () => {

    loadFiles();
  };

  // Handler for selecting/deselecting a file
  const handleFileSelect = (file: FileMetadata) => {
    // If the clicked file is already selected, deselect it; otherwise, select it
    if (selectedFile && selectedFile.id === file.id) {
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
    }
  };

  return (
    <div className="file-pane">
      <div className="toolbar">
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', borderBottom: '1px solid black' }}>
          <button className="toolbar-button">
            <CubeIcon style={{ paddingRight: '0.75rem', width: '20px', height: '20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left' }}>
              <h4>Repository</h4>
              <h5>{files.length} files</h5>
            </div>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
          <button onClick={handleAddFile} className="toolbar-button" style={{ borderRight: '1px solid black' }}>
            <FilePlusIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>Track File</h6>
          </button>
          <button onClick={handleAddFolder} className="toolbar-button" style={{ borderRight: '1px solid black' }}>
            <ArchiveIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>Track Folder</h6>
          </button>
          <button onClick={handleRefresh} className="toolbar-button">
            <ReloadIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>Refresh</h6>
          </button>
        </div>
      </div>

      {/* File list view */}
      <div className="file-view">
        {files.length > 0 ? (
          <div className="file-list">
            {files.map((file) => (
              <div
                key={file.id}
                className={`list-item ${!file.accessible ? 'inaccessible' : ''} ${selectedFile && selectedFile.id === file.id ? 'selected' : ''}`}
                onClick={() => handleFileSelect(file)}
              >
                {file.name} ({file.encoding})
              </div>
            ))}
          </div>
        ) : (
          <div>No files available.</div>
        )}
      </div>
    </div>
  );
};

export default FilePane;
