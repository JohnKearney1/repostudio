import { useEffect, useState } from 'react';
import { Cross2Icon, CheckCircledIcon, SymbolIcon } from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useFileStore, useRepositoryStore } from '../../../../scripts/store/store';
import { FileMetadata } from '../../../../types/ObjectTypes';
import './ConvertPopup.css';

export default function ConvertPopup() {
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
  const setAllFiles = useFileStore((state) => state.setAllFiles);
  const selectedRepository = useRepositoryStore((state) => state.selectedRepository);

  const [conversionStatus, setConversionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [targetFormat, setTargetFormat] = useState('mp3');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [initialFiles, setInitialFiles] = useState<FileMetadata[]>([]);
  const [logExists, setLogExists] = useState(false);
  const [accessibleFiles, setAccessibleFiles] = useState<FileMetadata[]>([])

  useEffect(() => {
    setAccessibleFiles(selectedFiles.filter(file => file.accessible === true));
  }, [selectedFiles])

  useEffect(() => {
    if (conversionStatus === 'success' || conversionStatus === 'error') {
      setInitialFiles([]);
    }
  }, [conversionStatus]);
  
  // Listen for conversion progress events
  useEffect(() => {
    const unlisten = listen<string>('conversion_progress', (event) => {
      const msg = event.payload;
      setProgressMessages((prev) => [...prev, msg]);
    
      const match = msg.match(/Finished converting (.+)/);
      if (match) {
        const finishedName = match[1];
        const finishedFile = initialFiles.find((f) => f.name === finishedName);
        if (!finishedFile) {
          console.warn(`Could not find initial file for finished name: ${finishedName}`);
          return;
        }
        setCompletedIds((prev) => [...prev, finishedFile.id]);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [selectedFiles]);

  const handleConvertClick = async () => {
    if (!selectedRepository || selectedFiles.length === 0) return;
  
    const selectedSnapshot = [...selectedFiles]; // 🔒 snapshot selected files
    setInitialFiles(selectedSnapshot); // (optional) for progress use
    // Compute accessible files locally:
    const accessibleFilesLocal = selectedSnapshot.filter(file => file.accessible === true);
    setAccessibleFiles(accessibleFilesLocal); // if you need to store them for UI updates
    console.log('Setting initial files to:', selectedSnapshot);
    setConversionStatus('loading');
    setLogExists(true);
    setCompletedIds([]);
    setProgressMessages([]);
  
    try {

      for (const file of accessibleFilesLocal) {
        await invoke('convert_audio_file_command', {
          repoId: selectedRepository.id,
          fileId: file.id,
          targetFormat,
        });
      }


      await new Promise((resolve) => setTimeout(resolve, 500));
  
      const allFiles: FileMetadata[] = await invoke('get_files_in_repository_command', {
        repoId: selectedRepository.id,
      });
      setAllFiles(allFiles);
  
      const getStem = (filename: string) =>
        filename.trim().toLowerCase().replace(/\.[^/.]+$/, '');
  
      const convertedStems = new Set(selectedSnapshot.map(f => getStem(f.name)));
      const updatedSelection = allFiles.filter(f => convertedStems.has(getStem(f.name)));
  
      console.log('Updated Selection:', updatedSelection);
      setSelectedFiles(updatedSelection);
  
      setConversionStatus('success');
      setTimeout(() => setConversionStatus('idle'), 2500);
    } catch (error) {
      console.error('Conversion failed:', error);
      setConversionStatus('error');
    }
  
    setTimeout(() => setConversionStatus('idle'), 2500);
  };
  

  const progress = (completedIds.length / initialFiles.filter(file => file.accessible === true).length) * 100;

  return (
    <div className="ConvertPopup">
      <div className="ConvertPopupContainer">
        <h4>Convert</h4>

        {conversionStatus === 'loading' ? (
          <>
            <div className="divider" />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="progress-container"
              style={{
                background: 'var(--colorLight)',
                borderRadius: '8px',
                overflow: 'hidden',
                marginTop: '1rem',
                height: '15px',
              }}
            >
              <motion.div
                className="progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                style={{
                  height: '100%',
                  background: 'var(--accent-1)',
                }}
              />
            </motion.div>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              {completedIds.length}/{initialFiles.filter(file => file.accessible === true).length} files converted
            </p>
            </>

        ) : (
          <div className="ConvertPopupInfo">
            <h5>{selectedFiles.length} Files Selected 
              <br />
              {selectedFiles.length - accessibleFiles.length} Inaccessible Files Selected
            </h5>
            

            <div className='convert-list-container'>
              {selectedFiles.map((file) => (
                <div key={file.id} className="convert-list-item"
                  onClick={() => {
                    setSelectedFiles((prev) => prev.filter((f) => f.id !== file.id));
                  }}
                  style={
                    // If the file is not accessible, show it as disabled
                    file.accessible ? {} : { opacity: 0.5, pointerEvents: 'none' }
                  }
                  >
                  {file.name}
                  <Cross2Icon />
                </div>
              ))}
            </div>

            <div className="ConvertPopupDropdownContainer">
              <h5 style={{ whiteSpace: 'nowrap' }}>Convert to:</h5>
              <select
                className="ConvertPopupDropdown"
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="flac">FLAC</option>
                <option value="ogg">OGG</option>
                <option value="aac">AAC</option>
                <option value="m4a">M4A</option>
              </select>
            </div>
          </div>
        )}

        <div className="divider" />

        <AnimatePresence>
          <motion.button
            className="ConvertPopupButton"
            onClick={handleConvertClick}
            whileTap={{ scale: 0.95 }}
            animate={{
              backgroundColor:
                conversionStatus === 'idle'
                  ? 'var(--colorMid)'
                  : conversionStatus === 'loading'
                  ? 'var(--accent-1)'
                  : conversionStatus === 'success'
                  ? 'limegreen'
                  : '#e74c3c',
            }}
            transition={{ duration: 0.3 }}
            disabled={conversionStatus === 'loading' || conversionStatus === 'success' || conversionStatus === 'error' || accessibleFiles.length === 0}
            key={conversionStatus} // Key to force remount on status change
          >
            {conversionStatus === 'loading' ? (
              <motion.div
                className='loading-icon'
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'inline-block', marginRight: '0.5rem' }}
              >
                <SymbolIcon />
              </motion.div>
            ) : conversionStatus === 'success' ? (
              <CheckCircledIcon/>
            ) : conversionStatus === 'error' ? (
              <Cross2Icon/>
            ) : (
              <SymbolIcon />
            )}
            {conversionStatus === 'loading'
              ? 'Converting...'
              : conversionStatus === 'success'
              ? 'Success!'
              : conversionStatus === 'error'
              ? 'Error!'
              : 'Convert'}
          </motion.button>

          {logExists && (
            <motion.div className="progress-log"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
            {progressMessages.map((msg, idx) => (
              <motion.p key={idx} style={{ fontSize: '0.75rem', margin: 0 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.1 }}
              >{msg}</motion.p>
            ))}
          </motion.div>
          )}
          
        </AnimatePresence>
      </div>
    </div>
  );
}
