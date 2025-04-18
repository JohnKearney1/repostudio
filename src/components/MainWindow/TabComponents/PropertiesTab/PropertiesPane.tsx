import React from 'react';
import { CheckCircledIcon, CrossCircledIcon, FileIcon, Component1Icon, MixerHorizontalIcon } from '@radix-ui/react-icons';
import './PropertiesPane.css';
import { useFileStore } from '../../../../scripts/store/store';
import MetadataEditor from './MetadataEditor';
import MultiMetadataEditor from './MultiMetadataEditor';
import { invoke } from '@tauri-apps/api/core';
import { FileMetadata } from '../../../../types/ObjectTypes';
import { useRepositoryStore, usePopupStore, usePopupContentStore } from '../../../../scripts/store/store';
import { save } from '@tauri-apps/plugin-dialog';
import { useEventLoggerStore } from '../../../../scripts/EventLogger';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import ConvertPopup from '../../PopupComponents/ConvertPopup/ConvertPopup';

const PropertiesPane: React.FC = () => {
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;
  const selectedRepo = useRepositoryStore((state) => state.selectedRepository);
  const addEvent = useEventLoggerStore((state) => state.addEvent);
  const [bundleProgress, setBundleProgress] = useState<number | null>(null);
  const setShowPopup = usePopupStore((state) => state.setVisible);
  const setPopupContent = usePopupContentStore((state) => state.setContent);

  useEffect(() => {
    const unlistenProgress = listen<any>("bundle_progress", (event) => {
      if (event.payload && typeof event.payload.progress === 'number') {
        setBundleProgress(event.payload.progress);
      }
    });


    const unlistenCompleted = listen("bundle_completed", () => {
      setBundleProgress(100);
      setTimeout(() => setBundleProgress(null), 1500);
    });

    return () => {
      unlistenProgress.then((f) => f());
      unlistenCompleted.then((f) => f());
    };
  }, []);


  interface IParseSystemTime {
    (str: string): Date | null;
  }
  const parseSystemTime: IParseSystemTime = (str: string): Date | null => {
    const match: RegExpMatchArray | null = str.match(/intervals:\s*(\d+)/);
    if (!match) return null;
    const fileTime: number = parseInt(match[1], 10);
    const unixTime: number = fileTime / 10000 - 11644473600000;
    return new Date(unixTime);
  };
  

  const createdDate = singleSelected ? parseSystemTime(singleSelected.date_created) : null;
  const modifiedDate = singleSelected ? parseSystemTime(singleSelected.date_modified) : null;
  
  if (selectedFiles.length === 1) {
    return (
      <div className="properties-pane">
        {singleSelected ? (
          <div className="properties-details">
            {singleSelected.accessible ? (
              <>
                <div className="file-info" style={{ padding: '0.5rem' }}>
                  <div className="fileinfo-detail">
                    <h6>Name: <span style={{ color: '#808080' }}>{singleSelected.name}</span></h6>
                    <h6>Sample Rate: <span style={{ color: '#808080' }}>{singleSelected.meta_sample_rate != null ? (Number(singleSelected.meta_sample_rate) / 1000) + " kHz" : "N/A"}</span></h6>
                    <h6>Bit Rate: <span style={{ color: '#808080' }}>{singleSelected.meta_bit_rate} kbps</span></h6>
                    <h6 style={{marginBottom: '0.5rem'}}>Channels: <span style={{ color: '#808080' }}>{singleSelected.meta_channels} {(parseInt(singleSelected.meta_channels || "0") === 2) ? "(Stereo)" : "(Mono)"}</span></h6>
                    <h6>Size on Disk: <span style={{ color: '#808080' }}>{singleSelected.meta_size_on_disk != null ? (Number(singleSelected.meta_size_on_disk) / (1024 * 1024)).toFixed(2) + " MB" : "N/A"}</span></h6>
                    <h6>Created: <span style={{ color: '#808080' }}>{createdDate && !isNaN(createdDate.getTime()) ? createdDate.toLocaleString() : "Invalid Date"}</span></h6>
                    <h6 style={{marginBottom: '0.5rem'}}>Modified: <span style={{ color: '#808080' }}>{modifiedDate && !isNaN(modifiedDate.getTime()) ? modifiedDate.toLocaleString() : "Invalid Date"}</span></h6>
                    <h6>Fingerprinted: <span>{singleSelected.audio_fingerprint ? (<CheckCircledIcon color='limegreen'/>) : (<CrossCircledIcon color='red'/>)}</span></h6>
                  </div>
                  <MetadataEditor
                    onSave={() => console.log("Metadata saved.")}
                  />
                  </div>
                  <div className='quick-actions'>
                  <button
                    className="actions-details-button"
                    onClick={() => {
                      setPopupContent(<ConvertPopup />);
                      setShowPopup(true);
                    }}
                    style={{ backgroundColor: 'var(--colorLight)', width: '100%'}}
                    >
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MixerHorizontalIcon />
                      Convert
                    </h4>
                    <h5>Change Audio Encodings</h5>
                  </button>
                </div>
              </>
            ) : (
              <div className="prop-detail">
                <div>
                  <h6>Warning: This file is not currently accessible...</h6>
                  <br />
                  <h5>Replace it in the original destination, or remove the outdated reference.</h5>
                  <br />
                  <h5>Renamed it from another app? Try adding it again from the file manager!</h5>
                </div>
                <button
                  className='remove-file-btn'
                  onClick={async () => {
                    if (!singleSelected) return;
                    try {
                      await invoke("delete_file_command", {
                        repoId: selectedRepo?.id, 
                        fileId: singleSelected.id
                      });
                      const allFiles: FileMetadata[] = await invoke("get_files_in_repository_command", {
                        repoId: selectedRepo?.id
                      });
                      useFileStore.getState().setAllFiles(allFiles);
                      useFileStore.getState().setSelectedFiles([]);
                    } catch (error) {
                      console.error("Failed to delete file:", error);
                    }
                  }}
                >
                  <CrossCircledIcon color='red' style={{ marginRight: '0.5rem' }} />
                  Remove
                </button>
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
  const uniqueEncodings = Array.from(
    new Set(selectedFiles.map(file => file.encoding).filter(Boolean))
  );
  const totalSizeBytes = selectedFiles.reduce(
    (acc, file) => acc + (file.meta_size_on_disk ? Number(file.meta_size_on_disk) : 0),
    0
  );

  const totalSizeMB = totalSizeBytes / (1024 * 1024);
  const totalSizeDisplay = totalSizeMB < 1024 
    ? totalSizeMB.toFixed(2) + " MB" 
    : (totalSizeMB / 1024).toFixed(2) + " GB";

  const handleBundle = async () => {
    const selectedFiles = useFileStore.getState().selectedFiles;
    if (selectedFiles.length === 0) {
      addEvent({
        timestamp: new Date().toISOString(),
        text: "Bundle Selected Files",
        description: "Looks like no files were selected when you clicked the Bundle button. Select some files to bundle them!",
        status: "warning"
      });
      return;
    }
    try {
      const filePaths = selectedFiles.map(file => file.path);
      const base64Zip: string = await invoke("bundle_files_command", { filePaths });
      const binaryString = atob(base64Zip);
      const len = binaryString.length;
      const zipData = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        zipData[i] = binaryString.charCodeAt(i);
      }
      
      const savePath = await save({
        title: "Save Bundled Archive",
        defaultPath: "bundle.zip",
        filters: [{ name: "Zip Archive", extensions: ["zip"] }],
      });
      if (savePath) {
        await writeFile(savePath, zipData);
        addEvent({
          timestamp: new Date().toISOString(),
          text: "Bundle Selected Files",
          description: "Files bundled successfully!",
          status: "success"
        });
      }
    } catch (e: any) {
      console.error(e);
      addEvent({
        timestamp: new Date().toISOString(),
        text: "Bundle Selected Files",
        description: "Failed to bundle files. Here's the info we have: " + e.message,
        status: "error"
      });
    }
  };

  if (selectedFiles.length > 1) {
    return (
      <div className="properties-pane">
        <div className="properties-details">
          <div className="file-info" style={{ padding: '0.5rem' }}>
            <div className="fileinfo-detail">
              <h6><FileIcon />{selectedFiles.length} Files Selected</h6>
              <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <h6>Encodings: </h6>
                <h5>
                  {uniqueEncodings.length} ({uniqueEncodings.join(", ")})
                </h5>
              </div>
              <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <h6>Cumulative Size on Disk: </h6><h5>{totalSizeDisplay}</h5>
              </div>
            </div>
            <MultiMetadataEditor />
          </div>
        </div>

        <div className='quick-actions'>
          <button
            className="actions-details-button"
            onClick={handleBundle}
            disabled={bundleProgress !== null}
            style={{ backgroundColor: 'var(--colorLight)', width: '100%'}}
          >
            {bundleProgress !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Component1Icon />
                <h4>
                  Bundling... {bundleProgress}%
                </h4>
              </div>
            ) : (
              <>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Component1Icon />
                  Bundle
                </h4>
                <h5>Generate a Folder / Archive</h5>
              </>
            )}
          </button>

          <button
            className="actions-details-button"
            onClick={() => {
              setPopupContent(<ConvertPopup />);
              setShowPopup(true);
            }}
            style={{ backgroundColor: 'var(--colorLight)', width: '100%'}}
          >
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MixerHorizontalIcon />
              Convert
            </h4>
            <h5>Change Audio Encodings</h5>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-pane">
      <div className="no-selection">
        <h4 style={{ marginBottom: '0.5rem'}}>Nothing Selected...</h4>
        <h5>Select a file from the list to view its properties</h5>
      </div>
    </div>
  )
};

export default PropertiesPane;