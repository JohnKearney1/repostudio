import { useState } from 'react';
import { Pencil1Icon, FileIcon, InfoCircledIcon, Cross1Icon, ChevronRightIcon } from '@radix-ui/react-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileStore, usePopupStore } from '../../../../scripts/store/store';
import './RenamePopup.css';

export default function RenamePopup() {
  const [renameMode, setRenameMode] = useState('prefix'); // 'prefix', 'suffix', 'replace'
  const [renameStatus, setRenameStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const setSelectedFiles = useFileStore((state) => state.setSelectedFiles);
  const setVisible = usePopupStore((state) => state.setVisible);

  const handleRenameClick = async () => {
    setRenameStatus('loading');

    // Simulate an asynchronous renaming process.
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // For demonstration purposes, assume renaming is successful:
      setRenameStatus('success');
    } catch (error) {
      setRenameStatus('error');
    }

    // Reset status to idle after 2 seconds.
    setTimeout(() => {
      setRenameStatus('idle');
    }, 2000);
  };

  return (
    <div className='ConvertPopup'>
      <div className='ConvertPopupContainer'>
        <h4>Rename</h4>
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

            <motion.select
              className='ConvertPopupDropdown'
              value={renameMode}
              onChange={(e) => setRenameMode(e.target.value)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <option value="prefix">Add Prefix to Filename</option>
              <option value="suffix">Add Suffix to Filename</option>
              <option value="replace">Replace in Filename</option>
            </motion.select>

            <AnimatePresence mode='wait'>
              {renameMode === 'replace' && (
                <motion.div
                  key="replace"
                  className='ConvertPopupDropdownContainer'
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <input type="text" className='ConvertPopupInput' placeholder='Text to replace' />
                  <ChevronRightIcon width={'2.5rem'} />
                  <input type="text" className='ConvertPopupInput' placeholder='Replace With' />
                </motion.div>
              )}
              {renameMode === 'prefix' && (
                <motion.div
                  key="prefix"
                  className='ConvertPopupDropdownContainer'
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <input type="text" className='ConvertPopupInput' placeholder='Prefix Text' />
                </motion.div>
              )}
              {renameMode === 'suffix' && (
                <motion.div
                  key="suffix"
                  className='ConvertPopupDropdownContainer'
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <input type="text" className='ConvertPopupInput' placeholder='Suffix Text' />
                </motion.div>
              )}
            </AnimatePresence>

            <div className='divider' />

            <motion.button
              className='ConvertPopupButton'
              onClick={handleRenameClick}
              whileTap={{ scale: 0.95 }}
              animate={{
                backgroundColor:
                  renameStatus === 'idle'
                    ? 'var(--button-bg)'
                    : renameStatus === 'loading'
                    ? '#3498db'
                    : renameStatus === 'success'
                    ? '#2ecc71'
                    : '#e74c3c'
              }}
              transition={{ duration: 0.3 }}
            >
              {renameStatus === 'loading' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ display: 'inline-block', marginRight: '0.5rem' }}
                >
                  <Pencil1Icon />
                </motion.div>
              ) : renameStatus === 'success' ? (
                <Pencil1Icon style={{ marginRight: '0.5rem' }} />
              ) : renameStatus === 'error' ? (
                <Cross1Icon style={{ marginRight: '0.5rem' }} />
              ) : (
                <Pencil1Icon style={{ marginRight: '0.5rem' }} />
              )}
              {renameStatus === 'loading'
                ? 'Renaming...'
                : renameStatus === 'success'
                ? 'Success!'
                : renameStatus === 'error'
                ? 'Error!'
                : 'Rename'}
            </motion.button>
          </>
        ) : (
          <>
            <div className='ConvertPopupDropdownContainer'>
              <InfoCircledIcon />
              <h5>Select one or multiple files to view renaming options.</h5>
            </div>
            <br />
            <button className='ConvertPopupButton' onClick={() => setVisible(false)}>
              <Cross1Icon />
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
