// fileStore.ts
import { create } from 'zustand';

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

export interface Repository {
  id: string;
  name: string;
  description: string;
}



interface FileStore {
  selectedFile: FileMetadata | null;
  setSelectedFile: (file: FileMetadata | null) => void;
}

export const useFileStore = create<FileStore>((set) => ({
  selectedFile: null,
  setSelectedFile: (file: FileMetadata | null) => set({ selectedFile: file }),
}));

// state to track the visibility of the popup
interface PopupStore {
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
}

export const usePopupStore = create<PopupStore>((set) => ({
  isVisible: false,
  setVisible: (visible: boolean) => set({ isVisible: visible }),
}));

interface RepositoryStore {
  repositories: Repository[];
  setRepositories: (repos: Repository[]) => void;
  selectedRepository: Repository | null;
  setSelectedRepository: (repo: Repository | null) => void;
}

export const useRepositoryStore = create<RepositoryStore>((set) => ({
  repositories: [],
  setRepositories: (repos: Repository[]) => set({ repositories: repos }),
  selectedRepository: null,
  setSelectedRepository: (repo: Repository | null) => set({ selectedRepository: repo }),
}));
