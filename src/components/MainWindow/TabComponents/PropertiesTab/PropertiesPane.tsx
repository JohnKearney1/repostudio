import React from 'react';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import './PropertiesPane.css';
import { useFileStore } from '../../../../scripts/store/store';
import MetadataEditor from './MetadataEditor';
import MultiMetadataEditor from './MultiMetadataEditor';

const PropertiesPane: React.FC = () => {
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;
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

  if (selectedFiles.length > 1) {
    return (
      <div className="properties-pane">
        <div className="properties-details">
          <div className="file-info" style={{ padding: '0.5rem' }}>
            <div className="fileinfo-detail">
              <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Encodings: 
                <h5>
                  {uniqueEncodings.length} ({uniqueEncodings.join(", ")})
                </h5>
              </div>
              <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <h6>Size on Disk: </h6><h5>{totalSizeDisplay}</h5>
              </div>
            </div>
            <MultiMetadataEditor />
          </div>
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