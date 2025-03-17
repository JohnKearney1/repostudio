// PropertiesPane.tsx
// This component displays the properties of a selected file or files.
// It also handles the fingerprinting of files.

import React, { useEffect, useRef } from 'react';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import './PropertiesPane.css';
import {
  useFileStore,
  useFingerprintStore,
  useFingerprintQueueStore,
  useRepositoryStore,
} from './store';
import { invoke } from '@tauri-apps/api/core';

const PropertiesPane: React.FC = () => {
  const { selectedFiles } = useFileStore();
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;

  // Fingerprinting state and actions.
  const { current, total, increment, clear, updateTotal, initProgress } = useFingerprintStore();
  const { fingerprintQueue, setQueue } = useFingerprintQueueStore();
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);

  // Use a ref flag to track if processing is in progress.
  const isProcessing = useRef(false);

  useEffect(() => {
    // Only run if there's work to do, a repository is selected, and no processing is ongoing.
    if (fingerprintQueue.length > 0 && selectedRepository && !isProcessing.current) {
      isProcessing.current = true;
      
      // Filter for unique items and files that haven’t been fingerprinted.
      const uniqueQueue = Array.from(
        new Map(fingerprintQueue.map(file => [file.id, file])).values()
      );
      const filesToProcess = uniqueQueue.filter(file => file.audio_fingerprint !== 'true');

      // Reset the progress before starting.
      initProgress(filesToProcess.length);
      updateTotal(filesToProcess.length);

      Promise.all(
        filesToProcess.map((file) =>
          invoke("compute_fingerprint_command", {
            repoId: selectedRepository.id,
            fileId: file.id,
          }).then(() => {
            console.log(`Fingerprint computed for file ${file.id}`);
            // Increment progress counter.
            increment();
            // Update file store to mark as fingerprinted.
            useFileStore.setState((state) => ({
              ...state,
              allFiles: state.allFiles.map((f) =>
                f.id === file.id ? { ...f, audio_fingerprint: 'true' } : f
              ),
            }));
          })
        )
      )
        .then(() => {
          clear();
          setQueue([]);
        })
        .catch((error) => {
          console.error("Error processing fingerprint queue", error);
          setQueue([]);
        })
        .finally(() => {
          // Mark processing as done.
          isProcessing.current = false;
        });
    }
  }, [
    fingerprintQueue,
    selectedRepository,
    initProgress,
    updateTotal,
    increment,
    clear,
    setQueue,
  ]);
  
  // Render the properties view based on selection.
  if (selectedFiles.length <= 1) {
    return (
      <div className="properties-pane">
        <div className="properties-header">
          <div className="properties-header-icon">
            <InfoCircledIcon width={'20px'} height={'20px'} />
            <div className="properties-header-icon-bg">
              <h4>Properties</h4>
              <h5 style={{ overflow: 'hidden' }}>
                {singleSelected?.name ? singleSelected.name : 'No file selected'}
              </h5>
            </div>
          </div>
          <h5 style={{ overflow: 'hidden' }}>
            {singleSelected?.encoding}
          </h5>
        </div>
        {singleSelected ? (
          <div className="properties-details">
            { singleSelected.accessible ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderBottom: '1px solid black',
                    width: '100%',
                    backgroundColor: '#1a1a1a',
                  }}
                >
                  {/* Display fingerprint progress */}
                  {total > 0 && <p>Fingerprinting {current}/{total}</p>}
                </div>
                <div className="file-info" style={{ padding: '0.5rem' }}>
                  <p><strong>ID:</strong> {singleSelected.id}</p>
                  <p><strong>Name:</strong> {singleSelected.name}</p>
                  <p><strong>Encoding:</strong> {singleSelected.encoding}</p>
                  <p><strong>Path:</strong> {singleSelected.path}</p>
                  <p><strong>Date Created:</strong> {singleSelected.date_created}</p>
                  <p><strong>Date Modified:</strong> {singleSelected.date_modified}</p>
                  <p><strong>Bitrate:</strong> {singleSelected.quality} kbps</p>
                  <p>
                    <strong>Fingerprint:</strong>{' '}
                    {singleSelected.audio_fingerprint ? 'true' : 'false'}
                  </p>
                </div>
              </>
            ) : (
              <div className="prop-detail">
                <h5>Warning: This file is not currently accessible...</h5>
              </div>
            )}
          </div>
        ) : (
          <div className="no-selection">
            <h4>Nothing Selected</h4>
            <h5>Select a file from the list to view its properties</h5>
          </div>
        )}
      </div>
    );
  }

  // Render alternate view if multiple files are selected.
  return (
    <div className="properties-pane">
      <div className="properties-header">
        <div className="properties-header-icon">
          <InfoCircledIcon width={'20px'} height={'20px'} />
          <div className="properties-header-icon-bg">
            <h4>Properties</h4>
            <h5 style={{ overflow: 'hidden' }}>
              {selectedFiles.length} files selected
            </h5>
          </div>
        </div>
      </div>
      <div className="properties-details">
        <p>
          Multiple files are selected. Please select a single file to view detailed properties.
        </p>
      </div>
    </div>
  );
};

export default PropertiesPane;
