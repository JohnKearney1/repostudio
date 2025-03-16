import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FilePlusIcon, ArchiveIcon, CubeIcon, PieChartIcon, DoubleArrowDownIcon, DoubleArrowUpIcon, RocketIcon
 } from '@radix-ui/react-icons';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { readDir } from '@tauri-apps/plugin-fs';
import { useFileStore, FileMetadata, usePopupStore, useRepositoryStore, useFingerprintStore } from './store';
import './FilePane.css';
import { motion } from 'framer-motion';


// SCRIPTS
import { loadFilesScript, fileAddScript } from '../scripts/FileOperations';


const LOCAL_SELECTION_KEY = 'selectedFileIds';

const FilePane: React.FC = () => {

  // Holds the selected repository and the list of repositorie
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const setSelectedRepository = useRepositoryStore((state) => state.setSelectedRepository);
  const allRepositories = useRepositoryStore((state) => state.repositories);

  // Load files for the selected repository
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
  const allFiles = useFileStore((state) => state.allFiles);

  useEffect(() => {
    console.log("Repositories: " + selectedRepository);
    console.log("Files: " + useFileStore.getState().allFiles);
  }, []);

  useEffect(() => {
    if (selectedRepository) {
      // Load files for the new repository
      loadFilesScript();
    }
  }, [selectedRepository]);
  
  

  // Function to open settings
  const handleOpenSettings = () => {
    console.log("Opening settings...");
  }
  
  

  // const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'dateCreated' | 'dateModified' | 'encoding'>('alphabetical');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // state for tracking folder add progress.
  const [folderProgress, setFolderProgress] = useState<{ current: number; total: number } | null>(null);

  // Fingerprint progress store.
  const { current, total, increment, clear, updateTotal } = useFingerprintStore();

  // Set filteredFiles based on the loaded files from the store
  const filteredFiles = allFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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



  // useEffect(() => {
  //   localStorage.setItem(LOCAL_SELECTION_KEY, JSON.stringify(selectedFiles.map((f) => f.id)));
  // }, [selectedFiles]);

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
          fileAddScript(selectedRepository, filePath, () => {});
        })
      );
      // After processing all files, clear the progress and refresh.
      setFolderProgress(null);
      await loadFilesScript();
      console.log("Files should now be loaded");
    } catch (error) {
      console.error("Failed to add folder:", error);
    }
  };


  const handleFileSelect = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, file: FileMetadata, index: number) => {
      let newSelection: FileMetadata[] = [];
      if (e.shiftKey) {
        if (anchorIndex === null) {
          newSelection = [sortedFiles[index]];
          setAnchorIndex(index);
          setLastSelectedIndex(index);
        } else {
          const start = Math.min(anchorIndex, index);
          const end = Math.max(anchorIndex, index);
          newSelection = sortedFiles.slice(start, end + 1);
          setLastSelectedIndex(index);
        }
      } else if (e.ctrlKey || e.metaKey) {
        const alreadySelected = selectedFiles.some((f) => f.id === sortedFiles[index].id);
        if (alreadySelected) {
          newSelection = selectedFiles.filter((f) => f.id !== sortedFiles[index].id);
        } else {
          newSelection = [...selectedFiles, sortedFiles[index]];
          if (selectedFiles.length === 0) {
            setAnchorIndex(index);
          }
        }
        setLastSelectedIndex(index);
      } else {
        newSelection = [sortedFiles[index]];
        setAnchorIndex(index);
        setLastSelectedIndex(index);
      }
  
      // Immediately update localStorage with the new selection.
      localStorage.setItem(
        LOCAL_SELECTION_KEY,
        JSON.stringify(newSelection.map((f) => f.id))
      );
      // Then update state.
      setSelectedFiles(newSelection);
  
      // If the file needs a fingerprint, trigger computation.
      if (!file.audio_fingerprint && selectedRepository) {
        const missingCount = newSelection.filter((f) => !f.audio_fingerprint).length;
        updateTotal(missingCount);
      
        invoke("compute_fingerprint_command", {
          repoId: selectedRepository.id,
          fileId: file.id,
        })
          .then(() => {
            console.log(`Fingerprint computed for file ${file.id}`);
            increment();
            const state = useFingerprintStore.getState();
            if (state.current >= state.total) {
              clear();
            }

            // Set the files using the store
            useFileStore.setState((state) => {
              return {
                ...state,
                allFiles: state.allFiles.map((f) => f.id === file.id ? { ...f, audio_fingerprint: 'true' } : f)
              }
            });
          })
          .catch((error) => {
            console.error("Failed to compute fingerprint:", error);
          });
      }
      
    },
    [
      anchorIndex,
      sortedFiles,
      selectedFiles,
      selectedRepository,
      updateTotal,
      increment,
      clear,
      setSelectedFiles,
    ]
  );
  
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!sortedFiles.length) return;
    e.preventDefault();
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
        setSelectedFiles(sortedFiles.slice(start, end + 1));
        setLastSelectedIndex(newIndex);
      }
    } else {
      setAnchorIndex(newIndex);
      setLastSelectedIndex(newIndex);
      setSelectedFiles([sortedFiles[newIndex]]);
    }
  };
  
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
          {sortOrder === 'asc' ? (<DoubleArrowDownIcon />) : (<DoubleArrowUpIcon />)}
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
            {/* Render progress bar if fingerprinting is in progress */}
            {total > 0 && (
              <div className="list-item progress-item" style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', borderBottom: '1px solid black' }}>
                <motion.div
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <PieChartIcon />
                </motion.div>
                Fingerprinting {current}/{total}
              </div>
            )}
            {/* Render folder-add progress if in progress */}
            {folderProgress && folderProgress.total > 0 && (
              <>
                <motion.div
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <PieChartIcon />
                  </motion.div>
                <div className="list-item progress-item" style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', borderBottom: '1px solid black' }}>
                  Adding Files {folderProgress.current}/{folderProgress.total}
                </div>
              </>
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              flexDirection: 'column',
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
