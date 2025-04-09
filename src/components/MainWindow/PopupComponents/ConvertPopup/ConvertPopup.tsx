import { useState } from 'react';
import { Cross1Icon, FileIcon, InfoCircledIcon, MixIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileStore, usePopupStore } from '../../../../scripts/store/store';
import './ConvertPopup.css';

export default function ConvertPopup() {
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
  const setVisible = usePopupStore((state) => state.setVisible);

  // conversionStatus can be "idle", "loading", "success", or "error"
  const [conversionStatus, setConversionStatus] = useState('idle');

  const handleConvertClick = async () => {
    setConversionStatus('loading');

    // Simulate an async conversion process (replace with your own logic)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // For demonstration, we simulate a successful conversion.
      // You might set isSuccess based on real conversion results.
      const isSuccess = true; // or: Math.random() > 0.5;
      if (isSuccess) {
        setConversionStatus('success');
      } else {
        setConversionStatus('error');
      }
    } catch (error) {
      setConversionStatus('error');
    }

    // Reset conversion status to idle after 2 seconds
    setTimeout(() => setConversionStatus('idle'), 2000);
  };

  return (
    <div className="ConvertPopup">
      <div className="ConvertPopupContainer">
        <h4>Convert</h4>
        <h5>{selectedFiles.length} Files Selected</h5>
        <div className='divider' />

        {selectedFiles.length > 0 ? (
          <>
            <div className="ConvertPopupFileList">
              <AnimatePresence>
                {selectedFiles.map((file, index) => (
                  <motion.div
                    key={file.id}
                    className="list-item-popup"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => {
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
                      if (selectedFiles.length === 1) {
                        setVisible(false);
                      }
                    }}
                  >
                    {file.name}
                    <FileIcon />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className='divider' />

            <div className='ConvertPopupDropdownContainer'>
              <h5 style={{ whiteSpace: 'nowrap' }}>Convert to:</h5>
              <select className='ConvertPopupDropdown'>
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="flac">FLAC</option>
                <option value="ogg">OGG</option>
                <option value="aac">AAC</option>
                <option value="m4a">M4A</option>
              </select>
            </div>

            <div className='divider' />

            <motion.button
              className='ConvertPopupButton'
              onClick={handleConvertClick}
              whileTap={{ scale: 0.95 }}
              animate={{
                backgroundColor:
                  conversionStatus === 'idle'
                    ? 'var(--button-bg)' // Update with your default background color variable
                    : conversionStatus === 'loading'
                    ? '#3498db'
                    : conversionStatus === 'success'
                    ? '#2ecc71'
                    : '#e74c3c'
              }}
              transition={{ duration: 0.3 }}
            >
              {conversionStatus === 'loading' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ display: 'inline-block', marginRight: '0.5rem' }}
                >
                  <MixIcon />
                </motion.div>
              ) : conversionStatus === 'success' ? (
                <CheckCircledIcon style={{ marginRight: '0.5rem' }} />
              ) : conversionStatus === 'error' ? (
                <Cross1Icon style={{ marginRight: '0.5rem' }} />
              ) : (
                <MixIcon style={{ marginRight: '0.5rem' }} />
              )}
              {conversionStatus === 'loading'
                ? 'Converting...'
                : conversionStatus === 'success'
                ? 'Success!'
                : conversionStatus === 'error'
                ? 'Error!'
                : 'Convert'}
            </motion.button>
          </>
        ) : (
          <>
            <div className='ConvertPopupDropdownContainer'>
              <InfoCircledIcon />
              <h5>Select one or multiple files to view conversion options.</h5>
            </div>
            <br />
            <button
              className='ConvertPopupButton'
              onClick={() => {
                setVisible(false);
              }}
            >
              <Cross1Icon />
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
