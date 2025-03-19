import React, { useState } from 'react';
import { FileMetadata } from '../../../types/ObjectTypes';
import MultiInput from '../../Layout/MultiInput';
import './MetadataEditor.css';
import { CheckIcon } from '@radix-ui/react-icons';
import { invoke } from '@tauri-apps/api/core';
import { useRepositoryStore } from '../../../scripts/store';

interface MetadataEditorProps {
  file: FileMetadata;
  onSave: (updated: Partial<FileMetadata>) => void;
}

const MetadataEditor: React.FC<MetadataEditorProps> = ({ file }) => {
  const [metaTitle, setMetaTitle] = useState(file.meta_title || '');
  const [metaComment, setMetaComment] = useState(file.meta_comment || '');
  const [metaAlbumArtist, setMetaAlbumArtist] = useState(file.meta_album_artist || '');
  const [metaAlbum, setMetaAlbum] = useState(file.meta_album || '');
  const [metaTrackNumber, setMetaTrackNumber] = useState(file.meta_track_number || '');
  const [metaGenre, setMetaGenre] = useState(file.meta_genre || '');
  const [customTags, setCustomTags] = useState(file.tags || '');
  const repoId = useRepositoryStore((state) => state.selectedRepository?.id);

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

    const updatedFile: FileMetadata = { ...file, ...formData };

    try {
      await invoke('update_file_and_disk_metadata_command', { repoId, fileMetadata: updatedFile });
      console.log("Metadata updated successfully.");
    } catch (error) {
      console.error("Failed to update metadata:", error);
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
        />
      </div>
      <div className="metadata-item">
        <h5 className="metadata-item-title">Track #:</h5>
        <input
          className="metadata-item-input"
          id="metaTrackNumber"
          type="text"
          value={metaTrackNumber}
          onChange={(e) => setMetaTrackNumber(e.target.value)}
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
      <button type="submit" className="metadata-btn">
        <CheckIcon height="16px" width="16px" />
        Apply
      </button>
    </form>
  );
};

export default MetadataEditor;
