import React, { useState, useEffect } from 'react';
import { FileMetadata } from '../../../../types/ObjectTypes';
import MultiInput from '../../../Layout/MultiInput';
import './MetadataEditor.css';
import { CrossCircledIcon } from '@radix-ui/react-icons';
import { invoke } from '@tauri-apps/api/core';
import { useRepositoryStore, useFileStore } from '../../../../scripts/store/store';
import { loadFilesScript } from '../../../../scripts/FileOperations';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircledIcon } from '@radix-ui/react-icons'; // for success icon

interface MetadataEditorProps {
  onSave(updated: Partial<FileMetadata>): void;
}

const MetadataEditor: React.FC<MetadataEditorProps> = ({ onSave }) => {
  const file = useFileStore((state) => state.selectedFiles[0]);
  const [metaTitle, setMetaTitle] = useState(file.meta_title || '');
  const [metaComment, setMetaComment] = useState(file.meta_comment || '');
  const [metaAlbumArtist, setMetaAlbumArtist] = useState(file.meta_album_artist || '');
  const [metaAlbum, setMetaAlbum] = useState(file.meta_album || '');
  const [metaTrackNumber, setMetaTrackNumber] = useState(file.meta_track_number || '');
  const [metaGenre, setMetaGenre] = useState(file.meta_genre || '');
  const [customTags, setCustomTags] = useState(file.tags || '');
  const repoId = useRepositoryStore((state) => state.selectedRepository?.id);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [justSaved, setJustSaved] = useState(false);

  const unsavedChanges =
    (file.meta_title || '') !== metaTitle ||
    (file.meta_comment || '') !== metaComment ||
    (file.meta_album_artist || '') !== metaAlbumArtist ||
    (file.meta_album || '') !== metaAlbum ||
    (file.meta_track_number || '') !== metaTrackNumber ||
    (file.meta_genre || '') !== metaGenre ||
    (file.tags || '') !== customTags;

  useEffect(() => {
    setMetaTitle(file.meta_title || '');
    setMetaComment(file.meta_comment || '');
    setMetaAlbumArtist(file.meta_album_artist || '');
    setMetaAlbum(file.meta_album || '');
    setMetaTrackNumber(file.meta_track_number || '');
    setMetaGenre(file.meta_genre || '');
    setCustomTags(file.tags || '');
  }, [file]);

  useEffect(() => {
    if (!unsavedChanges) {
      setJustSaved(false);
    }
  }, [unsavedChanges]);

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        setStatus('idle');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData: Partial<FileMetadata> = {
      meta_title: metaTitle.trim() || null,
      meta_comment: metaComment.trim() || null,
      meta_album_artist: metaAlbumArtist.trim() || null,
      meta_album: metaAlbum.trim() || null,
      meta_track_number: metaTrackNumber.trim() || null,
      meta_genre: metaGenre.trim() || null,
      tags: customTags.trim() || null,
    };

    const updatedFile: FileMetadata = { ...file, ...formData, audio_fingerprint: file.audio_fingerprint == null ? null : file.audio_fingerprint };

    try {
      await invoke('update_file_command', { repoId, file: updatedFile });
      console.log("Metadata updated successfully in database.");
      await invoke('write_audio_metadata_to_file_command', { fileMetadata: updatedFile });
      console.log("Metadata written to file successfully.");
      onSave(formData);
      await loadFilesScript();
      setStatus('success');
      setJustSaved(true);
    } catch (error) {
      console.error("Failed to update metadata:", error);
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="metadata-editor">
      <div className="metadata-item">
        <h5 className="metadata-item-title">Title:</h5>
        <input
          className="metadata-item-input"
          id="metaTitle"
          type="text"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          autoComplete="off"
        />
      </div>
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
        <h5 className="metadata-item-title">Track #:</h5>
        <input
          className="metadata-item-input"
          id="metaTrackNumber"
          type="text"
          value={metaTrackNumber}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || /^[0-9]+$/.test(value)) {
              setMetaTrackNumber(value);
            }
          }}
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
            : { backgroundColor: 'var(--colorMid)' }
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

export default MetadataEditor;
