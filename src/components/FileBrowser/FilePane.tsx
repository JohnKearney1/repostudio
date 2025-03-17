// FilePane.tsx
// This component displays the files in a repository, and some menus & filtering components.
// It also handles file selection and adding files to the fingerprint queue.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import './FilePane.css';
import { fileAddScript } from '../../scripts/fileOperations';
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
  InfoCircledIcon
} from '@radix-ui/react-icons';
import { 
  useFileStore, 
  usePopupStore, 
  useRepositoryStore, 
  useFingerprintStore,
  useFingerprintQueueStore 
} from '../../scripts/store';
import RepositorySelector from '../RepositoryBrowser/RepositorySelector';
import { usePopupContentStore, useRightPanelContentStore } from '../../scripts/store';

import { FileMetadata } from '../../types/ObjectTypes';
import PropertiesPane from '../RightPanelContent/PropertiesPane/PropertiesPane';
import ActionsPane from '../RightPanelContent/ActionsPane/ActionsPane';

const FilePane: React.FC = () => {
  /* State / Store Declarations */
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
  const allFiles = useFileStore((state) => state.allFiles);
  const totalFingerprintQueuedItems = useFingerprintStore((state) => state.total);
  const { addToQueue } = useFingerprintQueueStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<'alphabetical' | 'dateCreated' | 'dateModified' | 'encoding'>('alphabetical');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { setVisible } = usePopupStore();
  const { setContent } = usePopupContentStore();
  const { setContent: setRightPanelContent, content: rightPanelContent } = useRightPanelContentStore();

  const handleOpenRepositorySelector = () => {
    setContent(<RepositorySelector />);
    setVisible(true);
  }

  // useRef to store the previous repository value.
  const prevRepositoryRef = useRef(selectedRepository);

  // Ref to record if the control key was held when the mouse was pressed.
  const ctrlKeyRef = useRef(false);


  // When the repository changes, load files (while preserving the current selection)
  useEffect(() => {
    if (prevRepositoryRef.current?.id !== selectedRepository?.id) {
      prevRepositoryRef.current = selectedRepository;
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
        setAllFiles([]);
        setSelectedFiles([]);
        return;
      }
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

  // File add and folder add functions remain unchanged.
  const handleFileAdd = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac'] }],
      });
      if (!selected) {
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
        return;
      }
      const selectedDir = await open({ directory: true, multiple: false });
      if (!selectedDir) {
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
      await Promise.all(
        audioFiles.map((file) => {
          const filePath = (file as any).path;
          return fileAddScript(selectedRepository, filePath, () => {});
        })
      );
      const preservedSelection = [...selectedFiles];
      await loadFiles(preservedSelection);
    } catch (error) {
      console.error("Failed to add folder:", error);
    }
  };

  const handleOpenSettings = () => {
    if(rightPanelContent && rightPanelContent.type === PropertiesPane) {
      console.log("set to actions pane");
      setRightPanelContent(<ActionsPane />);
    }
    else {
      console.log("set to properties pane");
      setRightPanelContent(<PropertiesPane />);
    }
  };

  // On mouse down, record whether ctrl/meta is being held.
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    ctrlKeyRef.current = e.ctrlKey || e.metaKey;
  }, []);

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
        }
        else if (ctrlKeyRef.current) {
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
          // Normal click (no modifier)
          setAnchorIndex(index);
          setLastSelectedIndex(index);
          newSelection = [file];
        }
        return newSelection;
      });
      ctrlKeyRef.current = false;

      if (!file.audio_fingerprint && selectedRepository) {
        addToQueue(file);
      }
    },
    [sortedFiles, anchorIndex, selectedRepository, addToQueue, setSelectedFiles]
  );

  // Keyboard navigation remains unchanged.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Only process navigation keys.
      if (
        e.key === 'Control' ||
        e.key === 'Meta' ||
        (e.key === 'Shift')
      ) {
        return;
      }
      if (!sortedFiles.length) return;
      // Only process arrow keys for navigation
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
        return;
      }
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
            
            { rightPanelContent && rightPanelContent.type === PropertiesPane ? 
              (<>
                <RocketIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
                <h6>Actions</h6>
              </>) 
              : 
              (<>
                <InfoCircledIcon style={{ paddingRight: '0.5rem', minWidth: '17px', minHeight: '17px' }} />
                <h6>Properties</h6>
              </>)}
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
            {totalFingerprintQueuedItems > 0 && (
              <div className="list-item progress-item" style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', borderBottom: '1px solid black' }}>
                <motion.div
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <PieChartIcon />
                </motion.div>
                Fingerprinting Audio Files... 
              </div>
            )}
            {sortedFiles.map((file, index) => (
              <div
                key={file.id}
                className={`list-item ${!file.accessible ? 'inaccessible' : ''} ${
                  selectedFiles.some((f) => f.id === file.id) ? 'selected' : ''
                }`}
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
