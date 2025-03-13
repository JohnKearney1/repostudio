// PropertiesPane.tsx
import { Link2Icon, LinkBreak2Icon } from '@radix-ui/react-icons';
import React from 'react';
import './PropertiesPane.css';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { useFileStore } from './store';
import { readFile,BaseDirectory } from '@tauri-apps/plugin-fs';
import AudioPlayer from './AudioPlayer';

const PropertiesPane: React.FC = () => {
  const { selectedFile } = useFileStore();

// use selectedFile.path to read the audio file and generate a URL
  const [audioUrl, setAudioUrl] = React.useState<string>('');
  React.useEffect(() => {
    setAudioUrl('');
    if (selectedFile) {
      readFile(selectedFile.path, { baseDir: BaseDirectory.Audio })
      .then((file) => {
        const url = URL.createObjectURL(new Blob([file]));
        setAudioUrl(url);
        console.log('audio url:', url);
      }
      )
      .catch((error) => {
        console.error(error);
      });
    }
    else {
      setAudioUrl('');
    }
  }
  , [selectedFile]);

  return (
    <div className="properties-pane">
      <div className="properties-header">
        <div className="properties-header-icon">
          <InfoCircledIcon width={'20px'} height={'20px'}/>
          <div className="properties-header-icon-bg">
            <h4>Properties</h4>
            <h5
              style={{
                'overflow': 'hidden',
              }}
            >
              {selectedFile?.name ? selectedFile.name : 'No file selected'}
            </h5>                               
          </div>

        </div> 
        <h5
          style={{
            'overflow': 'hidden',
          }}
        >
          {selectedFile?.encoding}
        </h5>
      </div>
      {selectedFile ? (
        <div className="properties-details">
          { selectedFile.accessible ?(
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              borderBottom: '1px solid black',
              width: '100%',
              backgroundColor: '#1a1a1a',
            }}>
            {audioUrl ? (
            <AudioPlayer key={selectedFile?.path} src={audioUrl} />
            ) : (<></>)}

          </div>
          ) : (
          
          <div className="prop-detail">
            <h5>Warning: This file is not currently accessible. It may have been moved, deleted, or stored on an external drive that isn't connected right now.
              <br />
              <br />

              There may be cached information available for this file, but we can't help you update it! To preview or update this file tell us where to find it, or stop tracking changes.
              <br />
              <br />
              
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
            )
          }
  
          
        </div>
      ) : (
        <div className="no-selection">
          <h4>Nothing Selected</h4>
          <h5>Select a file from the list to view its properties</h5>
        </div>
      )}
    </div>
  );
};

export default PropertiesPane;
