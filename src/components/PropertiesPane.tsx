// PropertiesPane.tsx (excerpt)
import React, { useEffect } from 'react';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import './PropertiesPane.css';
import { useFileStore, useFingerprintStore, useFingerprintQueueStore, useRepositoryStore } from './store';
import { invoke } from '@tauri-apps/api/core';

const PropertiesPane: React.FC = () => {
  const { selectedFiles } = useFileStore();
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;

  // Get necessary fingerprinting state and actions.
  const { current, total, increment, clear, updateTotal } = useFingerprintStore();
  const { fingerprintQueue, setQueue } = useFingerprintQueueStore();
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);

  // This effect monitors the fingerprint queue and processes it.
  useEffect(() => {
    if (fingerprintQueue.length > 0 && selectedRepository) {
      // Update total for progress display.
      updateTotal(fingerprintQueue.length);
      Promise.all(
        fingerprintQueue.map((file) =>
          invoke("compute_fingerprint_command", {
            repoId: selectedRepository.id,
            fileId: file.id,
          }).then(() => {
            console.log(`Fingerprint computed for file ${file.id}`);
            increment();
            // Update the file store to mark fingerprint as completed.
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
        });
    }
  }, [fingerprintQueue, selectedRepository, updateTotal, increment, clear, setQueue]);

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
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderBottom: '1px solid black',
                  width: '100%',
                  backgroundColor: '#1a1a1a',
                }}>
                  {/* You might display fingerprint progress here */}
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
                  <p><strong>Fingerprint:</strong> {singleSelected.audio_fingerprint ? 'true' : 'false'}</p>
                </div>
              </>
            ) : (
              <div className="prop-detail">
                <h5>
                  Warning: This file is not currently accessible...
                </h5>
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
