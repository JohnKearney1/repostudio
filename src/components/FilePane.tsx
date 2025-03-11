import React, { useState, useEffect } from 'react';
import { PlusIcon, ArchiveIcon, ReloadIcon } from '@radix-ui/react-icons';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface FileMetadata {
  id: string;
  name: string;
  encoding: string;
  path: string;
  // Add additional properties as needed
}

const FilePane: React.FC = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);

  // Function to load files from the backend
  const loadFiles = async () => {
    try {
      const result = await invoke<FileMetadata[]>('get_all_files');
      setFiles(result);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  // Initial load of files when the component mounts
  useEffect(() => {
    loadFiles();
  }, []);

  // Handler for adding a file
  const handleAddFile = async () => {
    try {
      // Open a file dialog with audio file filters
      const selectedFile = await open({
        multiple: false,
        filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'aac'] }]
      });
      
      if (selectedFile) {
        // Ensure we have a single file path
        const filePath = typeof selectedFile === 'string' ? selectedFile : selectedFile[0];
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

  // Handlers for the other buttons (to be implemented)
  const handleAddFolder = () => {
    console.log('Add Folder clicked');
  };

  const handleRefresh = () => {
    loadFiles();
  };

  return (
    <div className="file-pane">
      {/* Toolbar */}
      <div className="toolbar">
        <button onClick={handleAddFile}><PlusIcon /></button>
        <button onClick={handleAddFolder}><ArchiveIcon /></button>
        <button onClick={handleRefresh}><ReloadIcon /></button>
      </div>

      {/* File list view */}
      <div className="file-view" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {files.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {files.map((file) => (
              <li key={file.id} style={{ padding: '4px 0' }}>
                {file.name} ({file.encoding})
              </li>
            ))}
          </ul>
        ) : (
          <div>No files available.</div>
        )}
      </div>
    </div>
  );
};

export default FilePane;
