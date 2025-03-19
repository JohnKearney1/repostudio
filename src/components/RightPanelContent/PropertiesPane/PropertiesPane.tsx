import React, { useEffect, useRef } from 'react';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import './PropertiesPane.css';
import {
  useFileStore,
  useFingerprintStore,
  useFingerprintQueueStore,
  useRepositoryStore,
} from '../../../scripts/store';
import { invoke } from '@tauri-apps/api/core';
import MetadataEditor from './MetadataEditor';

const PropertiesPane: React.FC = () => {
  const { selectedFiles } = useFileStore();
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;
  console.log("file:", singleSelected);

  const { increment, clear, updateTotal, initProgress } = useFingerprintStore();
  const { fingerprintQueue, setQueue } = useFingerprintQueueStore();
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!selectedRepository || isProcessing.current || !fingerprintQueue.length) return;

    isProcessing.current = true;
    const uniqueQueue = Array.from(new Map(fingerprintQueue.map(file => [file.id, file])).values());
    const filesToProcess = uniqueQueue.filter(file => file.audio_fingerprint !== 'true');
    initProgress(filesToProcess.length);
    updateTotal(filesToProcess.length);

    Promise.all(
      filesToProcess.map(file =>
        invoke("compute_fingerprint_command", {
          repoId: selectedRepository.id,
          fileId: file.id,
        }).then(() => {
          console.log(`Fingerprint computed for file ${file.id}`);
          increment();
          useFileStore.setState((state) => ({
            allFiles: state.allFiles.map(f =>
              f.id === file.id ? { ...f, audio_fingerprint: 'true' } : f
            ),
            selectedFiles: state.selectedFiles.map(f =>
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
      .catch(error => {
        console.error("Error processing fingerprint queue", error);
        setQueue([]);
      })
      .finally(() => {
        isProcessing.current = false;
      });
  }, [fingerprintQueue, selectedRepository, initProgress, updateTotal, increment, clear, setQueue]);

  if (selectedFiles.length <= 1) {
    return (
      <div className="properties-pane">
        <div className="properties-header">
          <div className="properties-header-icon">
            <InfoCircledIcon width="20px" height="20px" />
            <div className="properties-header-icon-bg">
              <h4>Properties</h4>
              <h5 style={{ textOverflow: 'ellipsis' }}>
                {singleSelected?.name || 'No file selected'}
              </h5>
            </div>
          </div>
          <h5 style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
            {singleSelected?.encoding}
          </h5>
        </div>
        {singleSelected ? (
          <div className="properties-details">
            {singleSelected.accessible ? (
              <div className="file-info" style={{ padding: '0.5rem' }}>
                <MetadataEditor
                  file={singleSelected}
                  onSave={() => console.log("Metadata updated successfully.")}
                />
              </div>
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

  return (
    <div className="properties-pane">
      <div className="properties-header">
        <div className="properties-header-icon">
          <InfoCircledIcon width="20px" height="20px" />
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
