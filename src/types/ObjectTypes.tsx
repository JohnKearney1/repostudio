// types.tsx
// Type definitions for the applicaion

// File type definition
export interface FileMetadata {
    id: string;
    name: string;
    encoding: string;
    path: string;
    precedence: number | null;
    related_files: string | null;
    spectrogram: string | null;
    quality: string | null;
    samplerate: number | null;
    tags: string | null;
    date_created: string;
    date_modified: string;
    audio_fingerprint: string | null;
    accessible: boolean;
}

// Repository type definition
export interface Repository {
    id: string;
    name: string;
    description: string;
}