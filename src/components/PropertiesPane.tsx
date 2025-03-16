import React from 'react';
import { Link2Icon, LinkBreak2Icon } from '@radix-ui/react-icons';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import './PropertiesPane.css';
import { useFileStore } from './store';

const PropertiesPane: React.FC = () => {
  // Use the updated file store with multiple selection.
  const { selectedFiles } = useFileStore();

  // If only one file is selected, use that file for detailed view.
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;

  // If none or a single file is selected, render the standard properties pane.
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

                </div>
                <div className="file-info" style={{ padding: '0.5rem' }}>
                  <p><strong>ID:</strong> {singleSelected.id}</p>
                  <p><strong>Name:</strong> {singleSelected.name}</p>
                  <p><strong>Encoding:</strong> {singleSelected.encoding}</p>
                  <p><strong>Path:</strong> {singleSelected.path}</p>
                  <p><strong>Date Created:</strong> {singleSelected.date_created}</p>
                  <p><strong>Date Modified:</strong> {singleSelected.date_modified}</p>
                  <p><strong>Bitrate:</strong> {singleSelected.quality} kbps</p>
                  {/* <p><strong>Fingerprint:</strong> {singleSelected.audio_fingerprint}</p> */}
                </div>
              </>
            ) : (
              <div className="prop-detail">
                <h5>
                  Warning: This file is not currently accessible. It may have been moved, deleted, or stored on an external drive that isn't connected right now.
                  <br /><br />
                  There may be cached information available for this file, but we can't help you update it! To preview or update this file, tell us where to find it, or stop tracking changes.
                  <br /><br />
                  <div className="warning-btns">
                    <button className="warning-btn">
                      <Link2Icon />
                      Locate
                    </button>
                    <button className="warning-btn">
                      <LinkBreak2Icon />
                      Stop Tracking
                    </button>
                  </div>
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

  // If multiple files are selected, render an alternate view.
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
