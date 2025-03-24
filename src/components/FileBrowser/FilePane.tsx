import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './FilePane.css';
import { fileAddScript, fingerprintFileScript } from '../../scripts/FileOperations';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { readDir } from '@tauri-apps/plugin-fs';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  FilePlusIcon, 
  ArchiveIcon, 
  CubeIcon, 
  PieChartIcon, 
  DoubleArrowDownIcon, 
  DoubleArrowUpIcon, 
  RocketIcon, 
  InfoCircledIcon,
  CheckCircledIcon
} from '@radix-ui/react-icons';
import { 
  useFileStore, 
  usePopupStore, 
  useRepositoryStore, 
  usePopupContentStore, 
  useRightPanelContentStore 
} from '../../scripts/store';
import RepositorySelector from '../RepositoryBrowser/RepositorySelector';
import { FileMetadata } from '../../types/ObjectTypes';
import PropertiesPane from '../RightPanelContent/PropertiesPane/PropertiesPane';
import ActionsPane from '../RightPanelContent/ActionsPane/ActionsPane';

const FilePane: React.FC = () => {
  /* State / Store Declarations */
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
  const allFiles = useFileStore((state) => state.allFiles);
  const setAllFiles = useFileStore((state) => state.setAllFiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'dateCreated' | 'dateModified' | 'encoding'>('alphabetical');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { setVisible } = usePopupStore();
  const { setContent } = usePopupContentStore();
  const { setContent: setRightPanelContent, content: rightPanelContent } = useRightPanelContentStore();
  const [progressItemMessage, setProgressItemMessage] = useState<string>('');
  const [, setTrackedFolders] = useState<string[]>([]);
  const [fingerprintingTotal, setFingerprintingTotal] = useState<number>(0);
  const [fingerprintingCompleted, setFingerprintingCompleted] = useState<number>(0);
  const [isFingerprinting, setIsFingerprinting] = useState<boolean>(false);

  // Ref to track file IDs that are currently being fingerprinted.
  const fingerprintingInProgress = useRef<Set<string>>(new Set());

  const handleOpenRepositorySelector = () => {
    setContent(<RepositorySelector />);
    setVisible(true);
  };

  const reloadFiles = async () => {
    if (!selectedRepository) return;
  
    try {
      // Refresh accessibility status before loading files
      await invoke("refresh_files_in_repository_command", { repoId: selectedRepository.id });
  
      // Then reload files from the backend
      await loadFiles([]);
    } catch (error) {
      console.error("Failed to reload files:", error);
    }
  };

  

  // Listen for file changes in tracked folders
  useEffect(() => {
    const unlistenAdded = listen<string>("folder_file_added", async () => {
      console.log("File added! Refreshing repo + files...");
      await reloadFiles();
    });
  
    const unlistenRemoved = listen<string>("folder_file_removed", async () => {
      console.log("File removed! Refreshing repo + files...");
      await reloadFiles();
    });
  
    return () => {
      unlistenAdded.then((fn) => fn());
      unlistenRemoved.then((fn) => fn());
    };
  }, [selectedRepository]);
  
  
  // Every 30 seconds, refresh the files in the selected repository.
  useEffect(() => {
    if (!selectedRepository) return;
    const interval = setInterval(async () => {
      console.log("Starting interval for repository:", selectedRepository);

      try {
        await invoke("refresh_files_in_repository_command", { repoId: selectedRepository.id });
        const preservedSelection = [...selectedFiles];
        await loadFiles(preservedSelection);
      } catch (error) {
        console.error("Failed to refresh files for repository:", error);
      }
    }
    , 30000);
    return () => clearInterval(interval);
  }
  , []);

  // Store previous repository for detecting changes.
  const prevRepositoryRef = useRef(selectedRepository);
  // Ref to record whether the ctrl/meta key is held.
  const ctrlKeyRef = useRef(false);

  useEffect(() => {
    const refreshAndLoadFiles = async () => {
      if (!selectedRepository) return;
      try {
        // Refresh file accessibility status first
        await invoke("refresh_files_in_repository_command", { repoId: selectedRepository.id });
        // Then reload the files into state
        const preservedSelection = [...selectedFiles];
        loadFiles(preservedSelection);
      } catch (error) {
        console.error("Failed to refresh and load files:", error);
      }
    };
  
    if (!isFingerprinting && prevRepositoryRef.current?.id !== selectedRepository?.id) {
      prevRepositoryRef.current = selectedRepository;
      refreshAndLoadFiles();
    }
  }, [selectedRepository, selectedFiles, isFingerprinting]);

  // Update fingerprinting progress message.
// Update fingerprinting progress message.
useEffect(() => {
  if (fingerprintingTotal > 0) {
    if (fingerprintingCompleted < fingerprintingTotal) {
      // Always show the progress message while tasks remain.
      setProgressItemMessage(`Fingerprinting ${fingerprintingTotal} File(s)...`);
    } else if (fingerprintingCompleted === fingerprintingTotal) {
      setProgressItemMessage('Done!');
      // Keep the "Done!" message for 2 seconds before clearing.
      const timeout = setTimeout(() => {
        setProgressItemMessage('');
        setFingerprintingTotal(0);
        setFingerprintingCompleted(0);
        setIsFingerprinting(false);
        // After all fingerprinting tasks finish, reload files.
        loadFiles(selectedFiles);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }
}, [fingerprintingTotal, fingerprintingCompleted]); // removed selectedFiles from dependencies

const repoInitialized = useRef<string | null>(null);

useEffect(() => {
  if (!selectedRepository) {
    setAllFiles([]);
    setSelectedFiles([]);
    setTrackedFolders([]);
    repoInitialized.current = null;
    return;
  }

  const repoId = selectedRepository.id;

  // If we've already initialized this repo, skip.
  if (repoInitialized.current === repoId) {
    return;
  }

  repoInitialized.current = repoId;

  let cancelled = false;

  const handleRepositoryInit = async () => {
    try {
      console.log(`Initializing repository: ${repoId}`);

      // Refresh file accessibility status & reload files
      await invoke("refresh_files_in_repository_command", { repoId });

      const preservedSelection = [...selectedFiles];
      await loadFiles(preservedSelection);

      // Load tracked folders
      const folders: string[] = await invoke("get_tracked_folders_command", { repoId });

      if (!cancelled) {
        setTrackedFolders(folders);
        console.log("Tracked folders loaded:", folders);
      }

      console.log("Finished initializing repository:", repoId);
    } catch (error) {
      console.error(`Failed to initialize repository ${repoId}:`, error);
    }
  };

  handleRepositoryInit();

  return () => {
    cancelled = true;
  };
}, [selectedRepository]);


  // Filter files by search query.
  const filteredFiles = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
  
    return allFiles.filter((file) => {
      const nameMatch = file.name.toLowerCase().includes(lowerQuery);
      const tagMatch = (file.tags || '').toLowerCase().includes(lowerQuery);
      return nameMatch || tagMatch;
    });
  }, [allFiles, searchQuery]);
  

  // Load files while preserving selection.
  const loadFiles = async (preservedSelection: FileMetadata[]) => {
    const repoId = selectedRepository?.id;
    if (!repoId) {
      setAllFiles([]);
      setSelectedFiles([]);
      return;
    }
    try {
      await invoke("refresh_files_in_repository_command", { repoId: selectedRepository.id });
      const newFiles: FileMetadata[] = await invoke("get_files_in_repository_command", { repoId });
      setAllFiles(newFiles);
      const preserved = preservedSelection.filter((file) =>
        newFiles.some((newFile) => newFile.id === file.id)
      );
      setSelectedFiles(preserved);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  };

  // Sorting logic.
  const sortedFiles = useMemo(() => {
    const sorted = [...filteredFiles].sort((a, b) => {
      let comp = 0;
      switch (sortOption) {
        case 'alphabetical':
          comp = a.name.localeCompare(b.name);
          break;
        case 'dateCreated': {
          const matchA = a.date_created.match(/intervals:\s*(\d+)/);
          const matchB = b.date_created.match(/intervals:\s*(\d+)/);
          const numA = matchA ? parseInt(matchA[1], 10) : 0;
          const numB = matchB ? parseInt(matchB[1], 10) : 0;
          comp = numA - numB;
          break;
        }
        case 'dateModified': {
          const matchA = a.date_modified.match(/intervals:\s*(\d+)/);
          const matchB = b.date_modified.match(/intervals:\s*(\d+)/);
          const numA = matchA ? parseInt(matchA[1], 10) : 0;
          const numB = matchB ? parseInt(matchB[1], 10) : 0;
          comp = numA - numB;
          break;
        }
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

  // Handles adding a single file.
  const handleFileAdd = async () => {
    try {
      if (!selectedRepository) {
        console.warn("No repository selected!");
        return;
      }
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac'] }],
      });
      if (!selected) return;
      const filePath = selected;
      setProgressItemMessage('Adding File...');
      await fileAddScript(selectedRepository, filePath);
      setProgressItemMessage('Done!');
      setTimeout(() => setProgressItemMessage(''), 2000);
    } catch (error) {
      console.error("Failed to add file:", error);
      setProgressItemMessage('');
    }
  };

  // Utility: Recursively read directories and return all files
const getAllAudioFilesRecursively = async (directory: string): Promise<string[]> => {
  const entries = await readDir(directory);
  const audioExtensions = ['mp3', 'wav', 'flac', 'ogg', 'aac'];

  const files: string[] = [];

  for (const entry of entries) {
    if ('children' in entry && (entry as any).children && (entry as any).children.length > 0) {
      // It's a directory, recurse
      const nestedFiles = await getAllAudioFilesRecursively(`${directory}/${entry.name}`);
      files.push(...nestedFiles);
    } else if (entry.name) {
      const ext = entry.name.split('.').pop()?.toLowerCase();
      if (ext && audioExtensions.includes(ext)) {
        files.push(`${directory}/${entry.name}`);
      }
    }
  }

  return files;
};


  // Handles adding a folder of files.
  const handleFolderAdd = async () => {
    try {
      if (!selectedRepository) {
        console.warn("No repository selected!");
        return;
      }
  
      const selectedDir = await open({
        directory: true,
        multiple: false,
        recursive: true,
      });
      if (!selectedDir) return;
  
      // Step 1: Add existing files like you already do
      const audioFiles = await getAllAudioFilesRecursively(selectedDir);
      setProgressItemMessage(`Adding ${audioFiles.length} Files...`);
      for (const filePath of audioFiles) {
        await fileAddScript(selectedRepository, filePath);
      }
  
      // Step 2: Start watching the folder for future changes
      await invoke("watch_folder_command", {
        repoId: selectedRepository.id,
        folderPath: selectedDir
      });
      
      // Refresh the tracked folders list!
      const folders: string[] = await invoke("get_tracked_folders_command", {
        repoId: selectedRepository.id
      });
      setTrackedFolders(folders);
      
  
      setProgressItemMessage('Done!');
      setTimeout(() => setProgressItemMessage(''), 2000);
  
    } catch (error) {
      console.error("Failed to add folder:", error);
      setProgressItemMessage('');
    }
  };
  

  const handleOpenSettings = () => {
    if (rightPanelContent && rightPanelContent.type === PropertiesPane) {
      console.log("Switching to actions pane");
      setRightPanelContent(<ActionsPane />);
    } else {
      console.log("Switching to properties pane");
      setRightPanelContent(<PropertiesPane />);
    }
  };

  // Record ctrl/meta on mouse down.
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    ctrlKeyRef.current = e.ctrlKey || e.metaKey;
  }, []);

  // On mouse up, update file selection and trigger fingerprinting if needed.
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, file: FileMetadata, index: number) => {
      setSelectedFiles((prevSelected) => {
        let newSelection: FileMetadata[] = [];
        if (e.shiftKey) {
          const currentAnchor = anchorIndex !== null ? anchorIndex : index;
          setAnchorIndex(currentAnchor);
          setLastSelectedIndex(index);
          newSelection = sortedFiles.slice(
            Math.min(currentAnchor, index),
            Math.max(currentAnchor, index) + 1
          );
        } else if (ctrlKeyRef.current) {
          if (prevSelected.some((f) => f.id === file.id)) {
            newSelection = prevSelected.filter((f) => f.id !== file.id);
          } else {
            newSelection = [...prevSelected, file];
            if (prevSelected.length === 0) {
              setAnchorIndex(index);
            }
          }
          setLastSelectedIndex(index);
        } else {
          setAnchorIndex(index);
          setLastSelectedIndex(index);
          newSelection = [file];
        }
        return newSelection;
      });
      ctrlKeyRef.current = false;

      // Skip if inaccessible
      if (!file.accessible) {
        console.warn(`Skipping fingerprinting for inaccessible file: ${file.name}`);
        return;
      }

      // If the file lacks a fingerprint and is not already being fingerprinted, trigger the fingerprint script.
      if (!file.audio_fingerprint && selectedRepository) {
        if (fingerprintingInProgress.current.has(file.id)) {
          return;
        }
        fingerprintingInProgress.current.add(file.id);
        setIsFingerprinting(true);
        setFingerprintingTotal((prev) => prev + 1);
        fingerprintFileScript(selectedRepository, file)
          .then(() => {
            setFingerprintingCompleted((prev) => prev + 1);
            fingerprintingInProgress.current.delete(file.id);
          })
          .catch((error) => {
            console.error("Failed to generate fingerprint", error);
            setFingerprintingCompleted((prev) => prev + 1);
            fingerprintingInProgress.current.delete(file.id);
          });
      }
    },
    [sortedFiles, anchorIndex, selectedRepository, setSelectedFiles]
  );

  const truncateFileName = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    const nameWithoutExtension = lastDotIndex === -1 ? fileName : fileName.slice(0, lastDotIndex);
    return nameWithoutExtension.length > 35
      ? nameWithoutExtension.slice(0, 35) + '…'
      : nameWithoutExtension;
  };
  

  // Keyboard navigation remains unchanged.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // If ctrl/meta + A is pressed, select all files.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedFiles(sortedFiles);
        setAnchorIndex(0);
        setLastSelectedIndex(sortedFiles.length - 1);
        return;
      }
      
      // Existing keys to ignore.
      if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Shift') return;
      if (!sortedFiles.length) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
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
          <button className="toolbar-button" onClick={handleOpenRepositorySelector}>
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
            <motion.div
              key={rightPanelContent && rightPanelContent.type === PropertiesPane ? 'actions' : 'properties'}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {rightPanelContent && rightPanelContent.type === PropertiesPane ? (
                <>
                  <RocketIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
                  <h6>Actions</h6>
                </>
              ) : (
                <>
                  <InfoCircledIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
                  <h6>Properties</h6>
                </>
              )}
            </motion.div>
          </button>
        </div>
      </div>
  
      <input
        type="text"
        placeholder="Search for files or tags..."
        className="searchbar"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
  
      <div className="sort-options">
        <button className="sort-toggle-button" onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}>
          {sortOrder === 'asc' ? <DoubleArrowDownIcon /> : <DoubleArrowUpIcon />}
        </button>
        <select className="dropdown-menu" value={sortOption} onChange={(e) => setSortOption(e.target.value as any)}>
          <option value="alphabetical">Alphabetical</option>
          <option value="dateCreated">Date Created</option>
          <option value="dateModified">Date Modified</option>
          <option value="encoding">By Encoding</option>
        </select>
      </div>
  
      <div className="file-view" tabIndex={0} onKeyDown={handleKeyDown}>
        {sortedFiles.length > 0 ? (
          <div className="file-list">
            <AnimatePresence>
              {progressItemMessage && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="list-item progress-item"
                  style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#1a1a1a',
                    borderBottom: '1px solid black',
                    justifyContent: 'flex-start',
                    gap: '0rem',
                  }}
                >
                  {progressItemMessage !== 'Done!' ? (
                    <motion.div
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '0.5rem' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <PieChartIcon />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '0.5rem' }}
                    >
                      <CheckCircledIcon style={{ color: '#00ff00' }} />
                    </motion.div>
                  )}
                  {progressItemMessage}
                </motion.div>
              )}
            </AnimatePresence>
  
            <AnimatePresence>
              {sortedFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className={`list-item ${!file.accessible ? 'inaccessible' : ''} ${selectedFiles.some((f) => f.id === file.id) ? 'selected' : ''}`}
                  onMouseDown={handleMouseDown}
                  onMouseUp={(e) => handleMouseUp(e, file, index)}
                >
                  {truncateFileName(file.name)}
                  <h5>{file.encoding}</h5>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}
          >
            <h4>Nothing's Here!</h4>
            <br />
            <h5>Try adding a file or folder</h5>
          </motion.div>
        )}
      </div>
    </div>
  );
}
export default FilePane;
