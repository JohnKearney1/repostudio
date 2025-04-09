// FilePane.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './FilePane.css';
import { fileAddScript } from '../../../scripts/FileOperations';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { readDir } from '@tauri-apps/plugin-fs';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  CubeIcon, 
  PieChartIcon, 
  CheckCircledIcon,
  StackIcon,
  LayersIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@radix-ui/react-icons';
import { 
  useFileStore, 
  usePopupStore, 
  useRepositoryStore, 
  usePopupContentStore, 
  useFingerprintQueueStore,
  useFingerprintCancellationStore,
  useAppSettingsStore
} from '../../../scripts/store/store';
import RepositorySelector from '../PopupComponents/RepositorySelector/RepositorySelector';
import { processFingerprintQueue } from '../../../scripts/fingerprintProcessing';
import { FileMetadata } from '../../../types/ObjectTypes';
import { useStore } from 'zustand';

const FilePane: React.FC = () => {
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
  const setFingerprintQueue = useFingerprintQueueStore((state) => state.setQueue);
  const allFiles = useFileStore((state) => state.allFiles);
  const setAllFiles = useFileStore((state) => state.setAllFiles);
  const fingerprintQueue = useFingerprintQueueStore((state) => state.fingerprintQueue);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'dateCreated' | 'dateModified' | 'encoding'>('alphabetical');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { setVisible } = usePopupStore();
  const { setContent } = usePopupContentStore();
  const [progressItemMessage, setProgressItemMessage] = useState<string>('');
  const [, setTrackedFolders] = useState<string[]>([]);
  const [isFingerprinting, setIsFingerprinting] = useState<boolean>(false);
  const processingCancelledRef = useFingerprintCancellationStore((state) => state.processingCancelled);
  const autoFingerprint = useStore(useAppSettingsStore, (state) => state.autoFingerprint);
  const repoInitialized = useRef<string | null>(null);
  const prevRepositoryRef = useRef(selectedRepository);
  const ctrlKeyRef = useRef(false);

  const handleOpenRepositorySelector = () => 
  {
    setContent(<RepositorySelector />);
    setVisible(true);
  };

  const reloadFiles = async () => 
  {
    if (!selectedRepository) return;
    try 
    {
      await invoke("refresh_files_in_repository_command", { repoId: selectedRepository.id });
      await loadFiles([]);
    } 
    catch (error) 
    {
      console.error("Failed to reload files:", error);
    }
  };

  useEffect(() => 
  {
    if (!selectedRepository) return;
    const newQueue = fingerprintQueue.filter((file) => !file.audio_fingerprint);
    if (newQueue.length !== fingerprintQueue.length) 
    {
      console.log(`Removed ${fingerprintQueue.length - newQueue.length} files from the fingerprint queue.`);
      setFingerprintQueue(newQueue);
    }
    if (newQueue.length === 0 && isFingerprinting) 
    {
      setIsFingerprinting(false);
    }
    if (newQueue.length > 0) 
    {
      setProgressItemMessage(`Fingerprinting ${newQueue.length} File(s)...`);
    }
  }, [fingerprintQueue, selectedRepository, setFingerprintQueue, isFingerprinting]);

  useEffect(() => 
  {
    if (!selectedRepository) return;
    if (fingerprintQueue.length > 0 && !isFingerprinting && !processingCancelledRef) 
    {
      setIsFingerprinting(true);
      setProgressItemMessage(`Fingerprinting ${fingerprintQueue.length} File(s)...`);
      processFingerprintQueue(selectedRepository).then(() => 
      {
        setIsFingerprinting(false);
        setProgressItemMessage('Done!');
        setTimeout(() => setProgressItemMessage(''), 2000);
      });
    } 
    else if (fingerprintQueue.length === 0) 
    {
      setIsFingerprinting(false);
    }
  }, [fingerprintQueue, selectedRepository, isFingerprinting, processingCancelledRef]);

  useEffect(() => 
  {
    const unlistenAdded = listen<string>("folder_file_added", async () => 
    {
      console.log("File added! Refreshing repo + files...");
      await reloadFiles();
    });
  
    const unlistenRemoved = listen<string>("folder_file_removed", async () => 
    {
      console.log("File removed! Refreshing repo + files...");
      await reloadFiles();
    });
  
    return () => 
    {
      unlistenAdded.then((fn) => fn());
      unlistenRemoved.then((fn) => fn());
    };
  }, [selectedRepository]);

  useEffect(() => 
  {
    const refreshAndLoadFiles = async () => 
    {
      if (!selectedRepository) return;
      try 
      {
        await invoke("refresh_files_in_repository_command", { repoId: selectedRepository.id });
        const preservedSelection = [...selectedFiles];
        loadFiles(preservedSelection);
      } catch (error) 
      {
        console.error("Failed to refresh and load files:", error);
      }
    };
  
    if (!isFingerprinting && prevRepositoryRef.current?.id !== selectedRepository?.id) 
    {
      prevRepositoryRef.current = selectedRepository;
      refreshAndLoadFiles();
    }
  }, [selectedRepository, selectedFiles, isFingerprinting]);

  useEffect(() => 
  {
    if (!selectedRepository) return;
    reloadFiles();
  }, [selectedRepository]);

  useEffect(() => 
  {
    const initializeRepository = async () => 
      {
        const currentSettings = await invoke("get_app_settings_command") as 
        {
          general_auto_fingerprint: boolean;
          audio_autoplay: boolean;
          setup_selected_repository: string;
        };

        const selectedRepoId = currentSettings.setup_selected_repository;

        if (selectedRepoId) 
        {
          const repositories = useRepositoryStore.getState().repositories;
          const selectedRepo = repositories.find(repo => repo.id === selectedRepoId);
          if (selectedRepo) 
          {
            useRepositoryStore.getState().setSelectedRepository(selectedRepo);
          }
        } 
      };
      if (!selectedRepository) 
      {
        initializeRepository();
      }
  }, [selectedRepository]);

  useEffect(() => 
  {
    if (!selectedRepository) 
    {
      setAllFiles([]);
      setSelectedFiles([]);
      setTrackedFolders([]);
      repoInitialized.current = null;
      return;
    }
    const repoId = selectedRepository.id;
    if (repoInitialized.current === repoId) 
    {
      return;
    }
    repoInitialized.current = repoId;
    let cancelled = false;
    const handleRepositoryInit = async () => {
      try {
        await invoke("refresh_files_in_repository_command", { repoId });
        const preservedSelection = [...selectedFiles];
        await loadFiles(preservedSelection);
        const folders: string[] = await invoke("get_tracked_folders_command", { repoId });
        if (!cancelled) {
          setTrackedFolders(folders);
        }
      } catch (error) {
        console.error(`Failed to initialize repository ${repoId}:`, error);
      }
    };

    handleRepositoryInit();

    return () => {
      cancelled = true;
    };
  }, [selectedRepository]);

  const filteredFiles = useMemo(() => 
  {
    const lowerQuery = searchQuery.toLowerCase();
    return allFiles.filter((file) => {
      const nameMatch = file.name.toLowerCase().includes(lowerQuery);
      const tagMatch = (file.tags || '').toLowerCase().includes(lowerQuery);
      return nameMatch || tagMatch;
    });
  }, [allFiles, searchQuery]);

  const loadFiles = async (preservedSelection: FileMetadata[]) => 
  {
    const repoId = selectedRepository?.id;
    if (!repoId) 
    {
      setAllFiles([]);
      setSelectedFiles([]);
      return;
    }
    try 
    {
      await invoke("refresh_files_in_repository_command", { repoId: selectedRepository.id });
      const newFiles: FileMetadata[] = await invoke("get_files_in_repository_command", { repoId });
      setAllFiles(newFiles);
      const preserved = preservedSelection.filter((file) => newFiles.some((newFile) => newFile.id === file.id));
      setSelectedFiles(preserved);
    }
    catch (error) 
    {
      console.error("Failed to load files:", error);
    }
  };

  const sortedFiles = useMemo(() => 
  {
    const sorted = [...filteredFiles].sort((a, b) => 
    {
      let comp = 0;
      switch (sortOption) 
      {
        case 'alphabetical':
        {
          comp = a.name.localeCompare(b.name);
          break;
        }
        case 'dateCreated': 
        {
          const matchA = a.date_created.match(/intervals:\s*(\d+)/);
          const matchB = b.date_created.match(/intervals:\s*(\d+)/);
          const numA = matchA ? parseInt(matchA[1], 10) : 0;
          const numB = matchB ? parseInt(matchB[1], 10) : 0;
          comp = numA - numB;
          break;
        }
        case 'dateModified': 
        {
          const matchA = a.date_modified.match(/intervals:\s*(\d+)/);
          const matchB = b.date_modified.match(/intervals:\s*(\d+)/);
          const numA = matchA ? parseInt(matchA[1], 10) : 0;
          const numB = matchB ? parseInt(matchB[1], 10) : 0;
          comp = numA - numB;
          break;
        }
        case 'encoding':
        {
          comp = a.encoding.localeCompare(b.encoding);
          break;
        }

        default:
        {
          comp = 0;
        }
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
    return sorted;
  }, [filteredFiles, sortOption, sortOrder]);

  const handleFileAdd = async () => 
  {
    try 
    {
      if (!selectedRepository) 
      {
        console.warn("No repository selected!");
        return;
      }
      const selected = await open
      ({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac'] }],
      });
      if (!selected) return;
      const filePath = selected;
      setProgressItemMessage('Adding File...');
      await fileAddScript(selectedRepository, filePath);
      setProgressItemMessage('Done!');
      setTimeout(() => setProgressItemMessage(''), 2000);
    } 
    catch (error) 
    {
      console.error("Failed to add file:", error);
      setProgressItemMessage('');
    }
  };

  const getAllAudioFilesRecursively = async (directory: string): Promise<string[]> => 
  {
    const entries = await readDir(directory);
    const audioExtensions = ['mp3', 'wav', 'flac', 'ogg', 'aac'];
    const files: string[] = [];
    for (const entry of entries) 
    {
      if ('children' in entry && (entry as any).children && (entry as any).children.length > 0) 
      {
        const nestedFiles = await getAllAudioFilesRecursively(`${directory}/${entry.name}`);
        files.push(...nestedFiles);
      } 
      else if (entry.name) 
      {
        const ext = entry.name.split('.').pop()?.toLowerCase();
        if (ext && audioExtensions.includes(ext)) 
        {
          files.push(`${directory}/${entry.name}`);
        }
      }
    }
    return files;
  };

  const handleFolderAdd = async () => 
  {
    try
    {
      if (!selectedRepository) 
      {
        console.warn("No repository selected!");
        return;
      }
      const selectedDir = await open
      ({
        directory: true,
        multiple: false,
        recursive: true,
      });
      if (!selectedDir) return;
      const audioFiles = await getAllAudioFilesRecursively(selectedDir);
      setProgressItemMessage(`Adding ${audioFiles.length} Files...`);
      for (const filePath of audioFiles) 
      {
        await fileAddScript(selectedRepository, filePath);
      }
  
      await invoke("watch_folder_command", 
      {
        repoId: selectedRepository.id,
        folderPath: selectedDir
      });
      
      const folders: string[] = await invoke("get_tracked_folders_command", 
      {
        repoId: selectedRepository.id
      });
      setTrackedFolders(folders);
      setProgressItemMessage('Done!');
      setTimeout(() => setProgressItemMessage(''), 2000);
  
    }
    catch (error) 
    {
      console.error("Failed to add folder:", error);
      setProgressItemMessage('');
    }
  };
  
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => 
  {
    ctrlKeyRef.current = e.ctrlKey || e.metaKey;
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, file: FileMetadata, index: number) => 
      {
      setSelectedFiles((prevSelected) => 
        {
        let newSelection: FileMetadata[] = [];
        if (e.shiftKey) 
          {
          const currentAnchor = anchorIndex !== null ? anchorIndex : index;
          setAnchorIndex(currentAnchor);
          setLastSelectedIndex(index);
          newSelection = sortedFiles.slice
          (
            Math.min(currentAnchor, index),
            Math.max(currentAnchor, index) + 1
          );
        } 
        else if (ctrlKeyRef.current) 
        {
          if (prevSelected.some((f) => f.id === file.id))
          {
            newSelection = prevSelected.filter((f) => f.id !== file.id);
          }
          else
          {
            newSelection = [...prevSelected, file];
            if (prevSelected.length === 0) 
            {
              setAnchorIndex(index);
            }
          }
          setLastSelectedIndex(index);
        }
        else
        {
          setAnchorIndex(index);
          setLastSelectedIndex(index);
          newSelection = [file];
        }
        return newSelection;
      });
      ctrlKeyRef.current = false;
      // This is the logic that controls the fingerprinting queue when a file is clicked
      if (!autoFingerprint) return;
      if (!file.accessible) 
      {
        console.warn(`Skipping fingerprinting for inaccessible file: ${file.name}`);
        return;
      }
      if (!file.audio_fingerprint && selectedRepository)
      {
        if (fingerprintQueue.some((queuedFile) => queuedFile.id === file.id))
        {
          console.warn(`File ${file.name} is already in the fingerprint queue.`);
          return;
        }
        setFingerprintQueue([...fingerprintQueue, file]);
      }
    },
    [sortedFiles, anchorIndex, selectedRepository, setSelectedFiles]
  );

  const truncateFileName = (fileName: string): string => 
  {
    const lastDotIndex = fileName.lastIndexOf('.');
    const nameWithoutExtension = lastDotIndex === -1 ? fileName : fileName.slice(0, lastDotIndex);
    return nameWithoutExtension.length > 35
      ? nameWithoutExtension.slice(0, 35) + '…'
      : nameWithoutExtension;
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => 
    {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') 
      {
        e.preventDefault();
        setSelectedFiles(sortedFiles);
        setAnchorIndex(0);
        setLastSelectedIndex(sortedFiles.length - 1);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') 
      {
        e.preventDefault();
        setSelectedFiles([]);
        return;
      }
      if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Shift') return;
      if (!sortedFiles.length) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      let currentIndex = lastSelectedIndex !== null ? lastSelectedIndex : 0;
      let newIndex = currentIndex;
      if (e.key === 'ArrowDown') 
      {
        newIndex = Math.min(sortedFiles.length - 1, currentIndex + 1);
      } else if (e.key === 'ArrowUp') 
      {
        newIndex = Math.max(0, currentIndex - 1);
      }
      if (e.shiftKey) 
      {
        if (anchorIndex === null) 
        {
          setAnchorIndex(newIndex);
          setLastSelectedIndex(newIndex);
          setSelectedFiles([sortedFiles[newIndex]]);
        }
        else 
        {
          const start = Math.min(anchorIndex, newIndex);
          const end = Math.max(anchorIndex, newIndex);
          setLastSelectedIndex(newIndex);
          setSelectedFiles(sortedFiles.slice(start, end + 1));
        }
      }
      else
      {
        setAnchorIndex(newIndex);
        setLastSelectedIndex(newIndex);
        setSelectedFiles([sortedFiles[newIndex]]);
      }
    },
    [sortedFiles, anchorIndex, lastSelectedIndex, setSelectedFiles]
  );

  useEffect(() => 
  {
    const unsubscribe = useRepositoryStore.subscribe((state) => 
    {
      const newSelectedRepository = state.selectedRepository;
      if (newSelectedRepository) 
      {
        reloadFiles();
      } 
      else
      {
        setAllFiles([]);
        setSelectedFiles([]);
      }
    });
  
    return () => unsubscribe();
  }, [setAllFiles, setSelectedFiles, reloadFiles]);
  
  return (
    <div className="file-pane">
      <div className="toolbar">
        <div className="repo-toolbar">
          <button className="repo-toolbar-button" onClick={handleOpenRepositorySelector}>
            <CubeIcon style={{ paddingRight: '0.75rem', width: '20px', height: '20px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left' }}>
              <h4>{selectedRepository?.name || 'No Repository Selected'}</h4>
              <h5>#{selectedRepository?.id.slice(0, 23)}...</h5>
            </div>
          </button>
        </div>
  
        <div className='repo-buttons'>
          <button onClick={handleFolderAdd} className="toolbar-button" style={{ borderRight: '1px solid var(--border-color)' }}>
            <LayersIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>Folder</h6>
          </button>
          <button onClick={handleFileAdd} className="toolbar-button">
            <StackIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
            <h6>File</h6>
          </button>
        </div>
      </div>

      <div className="sort-options">
        
        <select className="dropdown-menu" value={sortOption} onChange={(e) => setSortOption(e.target.value as any)}>
          <option value="alphabetical">Alphabetical</option>
          <option value="dateCreated">Date Created</option>
          <option value="dateModified">Date Modified</option>
          <option value="encoding">By Encoding</option>
        </select>
        <button className="sort-toggle-button" onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}>
          {sortOrder === 'asc' ? <ChevronDownIcon /> : <ChevronUpIcon />}
        </button>
      </div>
  
      <input
        type="text"
        placeholder="Search for files or tags..."
        className="searchbar"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
  
      
  
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