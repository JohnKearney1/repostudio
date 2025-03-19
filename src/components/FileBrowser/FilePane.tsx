import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import './FilePane.css';
import { fileAddScript, fingerprintFileScript } from '../../scripts/fileOperations';
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

  // New state to track fingerprinting progress.
  const [fingerprintingTotal, setFingerprintingTotal] = useState<number>(0);
  const [fingerprintingCompleted, setFingerprintingCompleted] = useState<number>(0);
  const [isFingerprinting, setIsFingerprinting] = useState<boolean>(false);

  // Ref to track file IDs that are currently being fingerprinted.
  const fingerprintingInProgress = useRef<Set<string>>(new Set());

  const handleOpenRepositorySelector = () => {
    setContent(<RepositorySelector />);
    setVisible(true);
  };

  // Store previous repository for detecting changes.
  const prevRepositoryRef = useRef(selectedRepository);
  // Ref to record whether the ctrl/meta key is held.
  const ctrlKeyRef = useRef(false);

  // Reload files only if not fingerprinting.
  useEffect(() => {
    if (!isFingerprinting && prevRepositoryRef.current?.id !== selectedRepository?.id) {
      prevRepositoryRef.current = selectedRepository;
      const preservedSelection = [...selectedFiles];
      loadFiles(preservedSelection);
    }
  }, [selectedRepository, selectedFiles, isFingerprinting]);

  // Update fingerprinting progress message.
  useEffect(() => {
    if (fingerprintingTotal > 0) {
      if (fingerprintingCompleted < fingerprintingTotal) {
        // Always show the total count while tasks remain.
        setProgressItemMessage(`Fingerprinting ${fingerprintingTotal} Files...`);
      } else if (fingerprintingCompleted === fingerprintingTotal) {
        setProgressItemMessage('Done!');
        // Keep the "Done!" message for 2 seconds before clearing and triggering a refresh.
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
  }, [fingerprintingTotal, fingerprintingCompleted, selectedFiles]);

  // Filter files by search query.
  const filteredFiles = allFiles.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Load files while preserving selection.
  const loadFiles = async (preservedSelection: FileMetadata[]) => {
    const repoId = selectedRepository?.id;
    if (!repoId) {
      setAllFiles([]);
      setSelectedFiles([]);
      return;
    }
    try {
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
      const entries = await readDir(selectedDir);
      const audioExtensions = ['mp3', 'wav', 'flac', 'ogg', 'aac'];
      const audioFiles = entries
        .filter((entry) => !(entry as any).children)
        .filter((entry) => {
          const ext = entry.name?.split('.').pop()?.toLowerCase();
          return ext && audioExtensions.includes(ext);
        })
        .map((file) => `${selectedDir}/${file.name}`);
      if (audioFiles.length === 0) {
        console.log("No audio files found in folder.");
        return;
      }
      setProgressItemMessage(`Adding ${audioFiles.length} Files...`);
      for (const filePath of audioFiles) {
        await fileAddScript(selectedRepository, filePath);
      }
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
          <option value="alphabetical">Alphabetical</option>
          <option value="dateCreated">Date Created</option>
          <option value="dateModified">Date Modified</option>
          <option value="encoding">By Encoding</option>
        </select>
      </div>
      <div className="file-view" tabIndex={0} onKeyDown={handleKeyDown}>
        {sortedFiles.length > 0 ? (
          <div className="file-list">
            {progressItemMessage && (
              <div className="list-item progress-item" style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', borderBottom: '1px solid black' }}>
                {progressItemMessage !== 'Done!' ? (
                  <motion.div
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <PieChartIcon />
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CheckCircledIcon style={{color: '00ff00'}}/>
                  </div>
                )}
                {progressItemMessage}
              </div>
            )}
            {sortedFiles.map((file, index) => (
              <div
                key={file.id}
                className={`list-item ${!file.accessible ? 'inaccessible' : ''} ${selectedFiles.some((f) => f.id === file.id) ? 'selected' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseUp={(e) => handleMouseUp(e, file, index)}
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
