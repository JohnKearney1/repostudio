import React from 'react';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import './PropertiesPane.css';
import { useFileStore } from '../../../scripts/store';
import MetadataEditor from './MetadataEditor';

const PropertiesPane: React.FC = () => {
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const singleSelected = selectedFiles.length === 1 ? selectedFiles[0] : null;
  console.log("file:", singleSelected);  

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
            {/* Acessible: {String(singleSelected.accessible)} */}

            {singleSelected.accessible ? (
              <div className="file-info" style={{ padding: '0.5rem' }}>

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
