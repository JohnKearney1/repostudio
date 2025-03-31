// MultiMetadataEditor.tsx
import React, { useState, useEffect } from 'react';
import MultiInput from '../../../Layout/MultiInput';
import './MetadataEditor.css';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { invoke } from '@tauri-apps/api/core';
import { useRepositoryStore, useFileStore } from '../../../../scripts/store';
import { loadFilesScript } from '../../../../scripts/FileOperations';
import { motion, AnimatePresence } from 'framer-motion';
import { FileMetadata } from '../../../../types/ObjectTypes';

const MultiMetadataEditor: React.FC = () => {
  // Get all selected files (for multi-edit)
  const selectedFiles = useFileStore((state) => state.selectedFiles);
  const repoId = useRepositoryStore((state) => state.selectedRepository?.id);

  // Form fields – note: title and track number are intentionally omitted.
  const [metaComment, setMetaComment] = useState('');
  const [metaAlbumArtist, setMetaAlbumArtist] = useState('');
  const [metaAlbum, setMetaAlbum] = useState('');
  const [metaGenre, setMetaGenre] = useState('');
  const [customTags, setCustomTags] = useState('');

  // Store initial common values so we can compare for unsaved changes.
  const [initialMetaComment, setInitialMetaComment] = useState('');
  const [initialMetaAlbumArtist, setInitialMetaAlbumArtist] = useState('');
  const [initialMetaAlbum, setInitialMetaAlbum] = useState('');
  const [initialMetaGenre, setInitialMetaGenre] = useState('');
  const [initialCustomTags, setInitialCustomTags] = useState('');

  // Status and flag for displaying unsaved changes message
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [justSaved, setJustSaved] = useState(false);

  // When selectedFiles change, pre-populate form fields if all files share the same metadata.
  useEffect(() => {
    if (selectedFiles.length === 0) {
      setMetaComment('');
      setMetaAlbumArtist('');
      setMetaAlbum('');
      setMetaGenre('');
      setCustomTags('');
      setInitialMetaComment('');
      setInitialMetaAlbumArtist('');
      setInitialMetaAlbum('');
      setInitialMetaGenre('');
      setInitialCustomTags('');
      return;
    }

    const commonValue = (field: keyof FileMetadata): string => {
      const firstVal = `${selectedFiles[0][field] || ''}`;
      return selectedFiles.every(file => `${file[field] || ''}` === firstVal)
        ? firstVal
        : '';
    };

    const newMetaComment = commonValue('meta_comment');
    const newMetaAlbumArtist = commonValue('meta_album_artist');
    const newMetaAlbum = commonValue('meta_album');
    const newMetaGenre = commonValue('meta_genre');
    const newCustomTags = commonValue('tags');

    setMetaComment(newMetaComment);
    setMetaAlbumArtist(newMetaAlbumArtist);
    setMetaAlbum(newMetaAlbum);
    setMetaGenre(newMetaGenre);
    setCustomTags(newCustomTags);

    setInitialMetaComment(newMetaComment);
    setInitialMetaAlbumArtist(newMetaAlbumArtist);
    setInitialMetaAlbum(newMetaAlbum);
    setInitialMetaGenre(newMetaGenre);
    setInitialCustomTags(newCustomTags);
  }, [selectedFiles]);

  // Show unsaved changes only if a field differs from its initial value.
  const unsavedChanges =
    metaComment !== initialMetaComment ||
    metaAlbumArtist !== initialMetaAlbumArtist ||
    metaAlbum !== initialMetaAlbum ||
    metaGenre !== initialMetaGenre ||
    customTags !== initialCustomTags;

  // Auto-reset status (both 'success' and 'error') to 'idle' after 2 seconds
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        setStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Clear the justSaved flag if there are no pending unsaved changes
  useEffect(() => {
    if (!unsavedChanges) {
      setJustSaved(false);
    }
  }, [unsavedChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData: Partial<FileMetadata> = {
      meta_comment: metaComment.trim() || null,
      meta_album_artist: metaAlbumArtist.trim() || null,
      meta_album: metaAlbum.trim() || null,
      meta_genre: metaGenre.trim() || null,
      tags: customTags.trim() || null,
    };

    try {
      // Update each selected file with the new metadata
      for (const file of selectedFiles) {
        const updatedFile: FileMetadata = { ...file, ...formData };
        await invoke('update_file_command', { repoId, file: updatedFile });
        await invoke('write_audio_metadata_to_file_command', { fileMetadata: updatedFile });
      }
      await loadFilesScript();
      setStatus('success');
      setJustSaved(true);
    } catch (error) {
      console.error("Failed to update metadata for multiple files:", error);
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="metadata-editor">
      <div className="metadata-item">
        <h5 className="metadata-item-title">Comments:</h5>
        <textarea
          rows={5}
          className="metadata-item-input"
          id="metaComment"
          value={metaComment}
          onChange={(e) => setMetaComment(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="metadata-item">
        <h5 className="metadata-item-title">Artist:</h5>
        <input
          className="metadata-item-input"
          id="metaAlbumArtist"
          type="text"
          value={metaAlbumArtist}
          onChange={(e) => setMetaAlbumArtist(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="metadata-item">
        <h5 className="metadata-item-title">Album:</h5>
        <input
          className="metadata-item-input"
          id="metaAlbum"
          type="text"
          value={metaAlbum}
          onChange={(e) => setMetaAlbum(e.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="metadata-item">
        <h5 className="metadata-item-title">Genres:</h5>
        <MultiInput value={metaGenre} onChange={setMetaGenre} />
      </div>
      <div className="metadata-item">
        <h5 className="metadata-item-title">Tags:</h5>
        <MultiInput value={customTags} onChange={setCustomTags} />
      </div>

      <motion.button
        type="submit"
        onClick={handleSubmit}
        className="metadata-btn"
        whileTap={{ scale: 0.95 }}
        animate={
          status === 'success'
            ? { backgroundColor: '#00ff00' }
            : status === 'error'
            ? { backgroundColor: '#ff0000' }
            : { backgroundColor: '#2a2a2a' }
        }
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === 'success' ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CheckCircledIcon height="16px" width="16px" />
              Success!
            </motion.span>
          ) : status === 'error' ? (
            <motion.span
              key="error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <CrossCircledIcon height="16px" width="16px" />
              Failed
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Apply
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {unsavedChanges && !justSaved && (
          <motion.h5
            key="unsaved"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            style={{ marginTop: '10px', textAlign: 'center' }}
          >
            You have unsaved changes.
          </motion.h5>
        )}
      </AnimatePresence>
    </form>
  );
};

export default MultiMetadataEditor;
