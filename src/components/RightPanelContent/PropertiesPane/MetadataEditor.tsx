import React, { useState, useEffect } from 'react';
import { FileMetadata } from '../../../types/ObjectTypes';
import MultiInput from '../../Layout/MultiInput';
import './MetadataEditor.css';
import { CheckIcon } from '@radix-ui/react-icons';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useRepositoryStore } from '../../../scripts/store';

interface MetadataEditorProps {
  file: FileMetadata;
  onSave: (updated: Partial<FileMetadata>) => void;
}

const MetadataEditor: React.FC<MetadataEditorProps> = ({ file }) => {
  // Initialize state for each editable field.
  const [metaTitle, setMetaTitle] = useState(file.meta_title || '');
  const [metaComment, setMetaComment] = useState(file.meta_comment || '');
  const [metaContributingArtists, setMetaContributingArtists] = useState(
    file.meta_contributing_artists ? file.meta_contributing_artists.join(', ') : ''
  );
  const [metaAlbumArtist, setMetaAlbumArtist] = useState(file.meta_album_artist || '');
  const [metaAlbum, setMetaAlbum] = useState(file.meta_album || '');
  const [metaYear, setMetaYear] = useState(file.meta_year || '');
  const [metaTrackNumber, setMetaTrackNumber] = useState(file.meta_track_number || '');
  const [metaGenre, setMetaGenre] = useState(file.meta_genre || '');
  const [metaPublisher, setMetaPublisher] = useState(file.meta_publisher || '');
  const [metaEncodedBy, setMetaEncodedBy] = useState(file.meta_encoded_by || '');
  const [metaBpm, setMetaBpm] = useState(file.meta_bpm || '');
  // Custom tags stored in the 'tags' field.
  const [customTags, setCustomTags] = useState(file.tags || '');
  const repoId = useRepositoryStore((state) => state.selectedRepository?.id);

  useEffect(() => {
    const unlisten = listen('file-metadata-updated', (event) => {
      console.log('File metadata update complete for file ID:', event.payload);
      // Optionally update state or notify the user here.
    });
    
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build an update object using only the form values.
    const currentYear = new Date().getFullYear().toString();
    const formData: Partial<FileMetadata> = {
      meta_title: metaTitle.trim() || null,
      meta_comment: metaComment.trim() || null,
      meta_contributing_artists: metaContributingArtists.trim()
        ? metaContributingArtists.split(',').map((s) => s.trim())
        : null,
      meta_album_artist: metaAlbumArtist.trim() || null,
      meta_album: metaAlbum.trim() || null,
      meta_year: currentYear.trim(),
      meta_track_number: metaTrackNumber.trim() || null,
      meta_genre: metaGenre.trim() || null,
      meta_publisher: metaPublisher.trim() || null,
      meta_encoded_by: metaEncodedBy.trim() || null,
      meta_bpm: metaBpm.trim() || null,
      tags: customTags.trim() || null,
    };
  
    // Merge form data with the original file metadata for fields not associated with the form.
    const updatedFile: FileMetadata = {
      ...file,
      ...formData,
    };
  
    try {
      // Invoke the Tauri command to update the database and file's disk metadata.
      await invoke('update_file_and_disk_metadata_command', {
        repoId: repoId,
        fileMetadata: updatedFile,
      });
      console.log("Metadata updated successfully.");
    } catch (error) {
      console.error("Failed to update metadata:", error);
    }
  };
  
  

  return (
    <form onSubmit={handleSubmit} className='metadata-editor'>
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Title:</h5>
        <input
          className='metadata-item-input'
          id="metaTitle"
          type="text"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
        />
      </div>
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Comments:</h5>
        <textarea
          rows={5}
          className='metadata-item-input'
          id="metaComment"
          value={metaComment}
          onChange={(e) => setMetaComment(e.target.value)}
        />
      </div>
      {/* <div className='metadata-item'>
        <h5 className='metadata-item-title'>Contributors</h5>
        <MultiInput value={metaContributingArtists} onChange={setMetaContributingArtists} />
      </div> */}
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Album Artist</h5>
        <input
          className='metadata-item-input'
          id="metaAlbumArtist"
          type="text"
          value={metaAlbumArtist}
          onChange={(e) => setMetaAlbumArtist(e.target.value)}
        />
      </div>
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Album:</h5>
        <input
          className='metadata-item-input'
          id="metaAlbum"
          type="text"
          value={metaAlbum}
          onChange={(e) => setMetaAlbum(e.target.value)}
        />
      </div>
      {/* <div className='metadata-item'>
        <h5 className='metadata-item-title'>Year:</h5>
        <input
          className='metadata-item-input'
          id="metaYear"
          type="text"
          value={metaYear}
          onChange={(e) => setMetaYear(e.target.value)}
        />
      </div> */}
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Track #:</h5>
        <input
          className='metadata-item-input'
          id="metaTrackNumber"
          type="text"
          value={metaTrackNumber}
          onChange={(e) => setMetaTrackNumber(e.target.value)}
        />
      </div>
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Genre:</h5>
        <input
          className='metadata-item-input'
          id="metaGenre"
          type="text"
          value={metaGenre}
          onChange={(e) => setMetaGenre(e.target.value)}
        />
      </div>
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Publisher:</h5>
        <input
          className='metadata-item-input'
          id="metaPublisher"
          type="text"
          value={metaPublisher}
          onChange={(e) => setMetaPublisher(e.target.value)}
        />
      </div>
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Encoded By:</h5>
        <input
          className='metadata-item-input'
          id="metaEncodedBy"
          type="text"
          value={metaEncodedBy}
          onChange={(e) => setMetaEncodedBy(e.target.value)}
        />
      </div>
      <div className='metadata-item'>
        <h5 className='metadata-item-title'>Custom Tags:</h5>
        <MultiInput value={customTags} onChange={setCustomTags} />
      </div>
      <button type="submit" className='metadata-btn'>
        <CheckIcon height='16px' width='16px' />
        Apply
      </button>
    </form>
  );
};

export default MetadataEditor;
