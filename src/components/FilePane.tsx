import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import './FilePane.css';
import { fileAddScript } from '../scripts/FileOperations';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { readDir } from '@tauri-apps/plugin-fs';
import { 
  FilePlusIcon, 
  ArchiveIcon, 
  CubeIcon, 
  PieChartIcon, 
  DoubleArrowDownIcon, 
  DoubleArrowUpIcon, 
  RocketIcon 
} from '@radix-ui/react-icons';
import { 
  useFileStore, 
  FileMetadata, 
  usePopupStore, 
  useRepositoryStore, 
  useFingerprintStore,
  useFingerprintQueueStore 
} from './store';

const FilePane: React.FC = () => {
  /* State / Store Declarations */
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
  const allFiles = useFileStore((state) => state.allFiles);
  const currentFingerprintQueueProgress = useFingerprintStore((state) => state.current); // Fingerprint progress state
  const totalFingerprintQueuedItems = useFingerprintStore((state) => state.total); // Fingerprint progress state
  const { addToQueue } = useFingerprintQueueStore(); // Fingerprint queue state
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'dateCreated' | 'dateModified' | 'encoding'>('alphabetical');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // useRef to store the previous repository value
  const prevRepositoryRef = useRef(selectedRepository);

  /* Component Mount */
  useEffect(() => {
    console.log("Repositories: " + selectedRepository);
    console.log("Files: " + useFileStore.getState().allFiles);
  }, []);

  // When the repository changes, load files (while preserving the current selection)
  useEffect(() => {
    // Check if repository changed
    if (prevRepositoryRef.current?.id !== selectedRepository?.id) {
      console.log("Repository changed:", selectedRepository);
      // Update ref to the new repository.
      prevRepositoryRef.current = selectedRepository;
      // Capture the current selection and load files.
      const preservedSelection = [...selectedFiles];
      loadFiles(preservedSelection);
    }
  }, [selectedRepository, selectedFiles]);

  /// Filter files by search query.
  const filteredFiles = allFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /// File loading function that preserves selection.
  const loadFiles = async (preservedSelection: FileMetadata[]) => {
    const { setAllFiles, setSelectedFiles } = useFileStore.getState();
    const { selectedRepository } = useRepositoryStore.getState();
    const repoId = selectedRepository?.id;

    try {
      if (!repoId) {
        console.warn("No repository selected.");
        setAllFiles([]);
        setSelectedFiles([]);
        return;
      }
      console.log("Loading files from repository:", repoId);
      const newFiles: FileMetadata[] = await invoke("get_files_in_repository_command", {
        repoId,
      });
      console.log("Files returned from backend:", newFiles);
      // Update full file list.
      setAllFiles(newFiles);
      // Reapply the selection state.
      const preserved = preservedSelection.filter((file) =>
        newFiles.some((newFile) => newFile.id === file.id)
      );
      setSelectedFiles(preserved);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  };

  // Sorting logic for the files.
  const sortedFiles = useMemo(() => {
    const sorted = [...filteredFiles].sort((a, b) => {
      let comp = 0;
      switch (sortOption) {
        case 'alphabetical':
          comp = a.name.localeCompare(b.name);
          break;
        case 'dateCreated':
          comp = new Date(a.date_created).getTime() - new Date(b.date_created).getTime();
          break;
        case 'dateModified':
          comp = new Date(a.date_modified).getTime() - new Date(b.date_modified).getTime();
          break;
        case 'encoding':
          comp = a.encoding.localeCompare(b.encoding);
          break;
        default:
          comp = 0;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
    return sorted;
  }, [filteredFiles, sortOption, sortOrder]);

  // File add and folder add functions (unchanged)
  const handleFileAdd = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Audio',
            extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac'],
          },
        ],
      });
      if (!selected) {
        console.log("No file selected");
        return;
      }
      // Further logic for file adding...
    } catch (error) {
      console.error(error);
    }
  };

  const handleFolderAdd = async () => {
    try {
      if (!selectedRepository) {
        console.warn("No repository selected!");
        return;
      }
      const selectedDir = await open({
        directory: true,
        multiple: false,
      });
      if (!selectedDir) {
        console.log("No folder selected");
        return;
      }
      const entries = await readDir(selectedDir);
      const audioExtensions = ['mp3', 'wav', 'flac', 'ogg', 'aac'];
      const audioFiles = entries
        .filter((entry) => !(entry as any).children)
        .filter((entry) => {
          const ext = entry.name?.split('.').pop()?.toLowerCase();
          return ext && audioExtensions.includes(ext);
        })
        .map((file) => ({
          ...file,
          path: `${selectedDir}/${file.name}`,
        }));
      console.log(`Found ${audioFiles.length} audio files`);

      await Promise.all(
        audioFiles.map((file) => {
          const filePath = (file as any).path;
          return fileAddScript(selectedRepository, filePath, () => {});
        })
      );
      console.log("Files should now be loaded");
      const preservedSelection = [...selectedFiles];
      await loadFiles(preservedSelection);
    } catch (error) {
      console.error("Failed to add folder:", error);
    }
  };

  const handleOpenSettings = () => {
    console.log("Opening settings...");
  };

  // Updated handleFileSelect using a functional update
  const handleFileSelect = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, file: FileMetadata, index: number) => {
      // Only process genuine click events.
      if (e.detail === 0) return;
  
      // Always read the most recent selected files.
      const latestSelected = useFileStore.getState().selectedFiles;
      let newSelection: FileMetadata[] = [];
  
      if (e.shiftKey) {
        // Range selection: use the existing anchor (or fallback to current click)
        const currentAnchor = anchorIndex !== null ? anchorIndex : index;
        setAnchorIndex(currentAnchor);
        setLastSelectedIndex(index);
        newSelection = sortedFiles.slice(
          Math.min(currentAnchor, index),
          Math.max(currentAnchor, index) + 1
        );
      } else if (e.ctrlKey || e.metaKey) {
        // When ctrl/meta is held down, toggle the clicked file without clearing others.
        console.log("latestSelected:", latestSelected);
        if (latestSelected.some((f) => f.id === sortedFiles[index].id)) {
          newSelection = latestSelected.filter((f) => f.id !== sortedFiles[index].id);
        } else {
          console.log("latestSelected:", latestSelected);
          newSelection = [...latestSelected, sortedFiles[index]];
          console.log("New selection:", newSelection);
          if (latestSelected.length === 0) {
            setAnchorIndex(index);
          }
        }
        setLastSelectedIndex(index);
      } else {
        // No modifier keys: select only the clicked file.
        setAnchorIndex(index);
        setLastSelectedIndex(index);
        newSelection = [sortedFiles[index]];
      }
  
      // Only update if the selection has actually changed.
      if (JSON.stringify(newSelection) !== JSON.stringify(latestSelected)) {
        setSelectedFiles(newSelection);
      }
  
      // Always add the file to the fingerprint queue if needed.
      if (!file.audio_fingerprint && selectedRepository) {
        addToQueue(file);
      }
    },
    [sortedFiles, anchorIndex, selectedRepository, addToQueue, setSelectedFiles]
  );
  
  


  // Keyboard navigation remains unchanged.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!sortedFiles.length) return;
      e.preventDefault();
      // Get the most recent selection from our ref
      let currentIndex = lastSelectedIndex !== null ? lastSelectedIndex : 0;
      let newIndex = currentIndex;
      if (e.key === 'ArrowDown') {
        newIndex = Math.min(sortedFiles.length - 1, currentIndex + 1);
      } else if (e.key === 'ArrowUp') {
        newIndex = Math.max(0, currentIndex - 1);
      }
      if (e.shiftKey) {
        if (anchorIndex === null) {
          setAnchorIndex(newIndex);
          setLastSelectedIndex(newIndex);
          setSelectedFiles([sortedFiles[newIndex]]);
        } else {
          const start = Math.min(anchorIndex, newIndex);
          const end = Math.max(anchorIndex, newIndex);
          setLastSelectedIndex(newIndex);
          setSelectedFiles(sortedFiles.slice(start, end + 1));
        }
      } else {
        setAnchorIndex(newIndex);
        setLastSelectedIndex(newIndex);
        setSelectedFiles([sortedFiles[newIndex]]);
      }
    },
    [sortedFiles, anchorIndex, lastSelectedIndex, setSelectedFiles]
  );
  
  
  return (
    <div className="file-pane">
      <div className="toolbar">
        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', borderBottom: '1px solid black' }}>
          <button className="toolbar-button" onClick={() => usePopupStore.getState().setVisible(true)}>
            <CubeIcon style={{ paddingRight: '0.75rem', width: '20px', height: '20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left' }}>
              <h4>{selectedRepository?.name || '(untitled)'}</h4>
              <h5>#{selectedRepository?.id || 'Select a repository to view files'}</h5>
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
          <button onClick={handleOpenSettings} className="toolbar-button">
            <RocketIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>Actions</h6>
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
      <div className="sort-options">
        <button className="sort-toggle-button" onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}>
          {sortOrder === 'asc' ? <DoubleArrowDownIcon /> : <DoubleArrowUpIcon />}
        </button>
        <select className="dropdown-menu" value={sortOption} onChange={(e) => setSortOption(e.target.value as any)}>
          <option value="alphabetical">Alphabetic</option>
          <option value="dateCreated">Date Created</option>
          <option value="dateModified">Date Modified</option>
          <option value="encoding">By Encoding</option>
        </select>
      </div>
      <div className="file-view" tabIndex={0} onKeyDown={handleKeyDown}>
        {sortedFiles.length > 0 ? (
          <div className="file-list">
            {totalFingerprintQueuedItems > 0 && (
              <div className="list-item progress-item" style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', borderBottom: '1px solid black' }}>
                <motion.div
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <PieChartIcon />
                </motion.div>
                Fingerprinting {currentFingerprintQueueProgress}/{totalFingerprintQueuedItems}
              </div>
            )}
            {sortedFiles.map((file, index) => (
              <div
                key={file.id}
                className={`list-item ${!file.accessible ? 'inaccessible' : ''} ${
                  selectedFiles.some((f) => f.id === file.id) ? 'selected' : ''
                }`}
                onClick={(e) => handleFileSelect(e, file, index)}
              >
                {file.name}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
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
