import React from 'react';
import { CheckCircledIcon, CrossCircledIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import './PropertiesPane.css';
import { useFileStore } from '../../../scripts/store';
import MetadataEditor from './MetadataEditor';
import MultiMetadataEditor from './MultiMetadataEditor';

const PropertiesPane: React.FC = () => {
  
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;
  console.log("file:", singleSelected);  


  interface IParseSystemTime {
    (str: string): Date | null;
  }

  const parseSystemTime: IParseSystemTime = (str: string): Date | null => {
    const match: RegExpMatchArray | null = str.match(/intervals:\s*(\d+)/);
    if (!match) return null;
    const fileTime: number = parseInt(match[1], 10);
    // Convert Windows FILETIME to Unix timestamp (in ms)
    const unixTime: number = fileTime / 10000 - 11644473600000;
    return new Date(unixTime);
  };
  
  // Usage:
  const createdDate = singleSelected ? parseSystemTime(singleSelected.date_created) : null;
  const modifiedDate = singleSelected ? parseSystemTime(singleSelected.date_modified) : null;
  
  if (selectedFiles.length === 1) {
    return (
      <div className="properties-pane">
        <div className="properties-header">
          <div className="properties-header-icon">
            <InfoCircledIcon width="20px" height="20px" />
            <div className="properties-header-icon-bg">
              <h4>Properties</h4>
              <h5 style={{ textOverflow: 'ellipsis' }}>
                {singleSelected?.name || '0 Files Selected'}
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
                <div className="fileinfo-detail">
                  <h6>Name: <h5>{singleSelected.name}</h5></h6>
                  <h6>Sample Rate: <h5>{singleSelected.meta_sample_rate != null ? (Number(singleSelected.meta_sample_rate) / 1000) + " kHz" : "N/A"}</h5></h6>
                  <h6>Bit Rate: <h5>{singleSelected.meta_bit_rate} kbps</h5></h6>
                  <h6 style={{marginBottom: '0.5rem'}}>Channels: <h5>{singleSelected.meta_channels} {(parseInt(singleSelected.meta_channels || "0") === 2) ? "(Stereo)" : "(Mono)"}</h5></h6>
                  <h6>Size on Disk: <h5>{singleSelected.meta_size_on_disk != null ? (Number(singleSelected.meta_size_on_disk) / (1024 * 1024)).toFixed(2) + " MB" : "N/A"}</h5></h6>
                  <h6>Created: <h5>{createdDate && !isNaN(createdDate.getTime()) ? createdDate.toLocaleString() : "Invalid Date"}</h5></h6>
                  <h6 style={{marginBottom: '0.5rem'}}>Modified: <h5>{modifiedDate && !isNaN(modifiedDate.getTime()) ? modifiedDate.toLocaleString() : "Invalid Date"}</h5></h6>
                  <h6>Fingerprinted: <h5>{singleSelected.audio_fingerprint ? (<CheckCircledIcon color='limegreen'/>) : (<CrossCircledIcon color='red'/>)}</h5></h6>
                </div>
                <MetadataEditor
                  onSave={() => console.log("Metadata saved.")}
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

    // For multiple file selection:
  // Compute unique encodings and the total combined size
  const uniqueEncodings = Array.from(
    new Set(selectedFiles.map(file => file.encoding).filter(Boolean))
  );
  const totalSizeBytes = selectedFiles.reduce(
    (acc, file) => acc + (file.meta_size_on_disk ? Number(file.meta_size_on_disk) : 0),
    0
  );

  // Format the total size: display in MB if less than 1024 MB; otherwise, use GB.
  const totalSizeMB = totalSizeBytes / (1024 * 1024);
  const totalSizeDisplay = totalSizeMB < 1024 
    ? totalSizeMB.toFixed(2) + " MB" 
    : (totalSizeMB / 1024).toFixed(2) + " GB";

  if (selectedFiles.length > 1) {
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
          <div className="file-info" style={{ padding: '0.5rem' }}>
            <div className="fileinfo-detail">
              <h6>
                Encodings: <h5>
                  {uniqueEncodings.length} ({uniqueEncodings.join(", ")})
                </h5>
              </h6>
              <h6>
                Size on Disk: <h5>{totalSizeDisplay}</h5>
              </h6>
            </div>
            {/* Render the multi‑file metadata editor */}
            <MultiMetadataEditor />
          </div>
        </div>
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
                  No files selected
                </h5>
              </div>
            </div>
        </div>
        <div className="no-selection">
          <h4 style={{ marginBottom: '0.5rem'}}>Nothing Selected...</h4>
          <h5>Select a file from the list to view its properties</h5>
        </div>
    </div>
  )
};

export default PropertiesPane;