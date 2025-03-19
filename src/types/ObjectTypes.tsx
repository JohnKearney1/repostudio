// types.tsx
// Type definitions for the applicaion

// File type definition
export interface FileMetadata {
    id: string;
    name: string;
    encoding: string;
    path: string;
    related_files: string | null;
    tags: string | null;
    date_created: string;
    date_modified: string;
    audio_fingerprint: string | null;
    accessible: boolean;
    
    // Metadata fields
    meta_title: string | null;
    meta_comment: string | null;
    meta_album_artist: string | null;
    meta_album: string | null;
    meta_track_number: string | null;
    meta_genre: string | null;


    meta_bit_rate: string | null;
    meta_channels: string | null;
    meta_sample_rate: string | null;
    meta_size_on_disk: string | null;
}

// Repository type definition
export interface Repository {
    id: string;
    name: string;
    description: string;
}