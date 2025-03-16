import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Import FileMetadata from your store definitions if in a separate file
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

// -------------------------------------------------------------------
// Fingerprint Queue Store

export interface FingerprintQueueStore {
  fingerprintQueue: FileMetadata[];
  addToQueue: (file: FileMetadata) => void;
  clearQueue: () => void;
  setQueue: (queue: FileMetadata[]) => void;
}

export const useFingerprintQueueStore = create<FingerprintQueueStore, [["zustand/persist", FingerprintQueueStore]]>(
  persist(
    (set) => ({
      fingerprintQueue: [],
      addToQueue: (file: FileMetadata) =>
        set((state) => ({
          fingerprintQueue: state.fingerprintQueue.find((f) => f.id === file.id)
            ? state.fingerprintQueue
            : [...state.fingerprintQueue, file],
        })),
      clearQueue: () => set({ fingerprintQueue: [] }),
      setQueue: (queue: FileMetadata[]) => set({ fingerprintQueue: queue }),
    }),
    { name: 'fingerprint-queue-storage' }
  )
);

// -------------------------------------------------------------------
// Fingerprint Progress Store

interface FingerprintProgressState {
  current: number;
  total: number;
  initProgress: (total: number) => void;
  increment: () => void;
  updateTotal: (newTotal: number) => void;
  clear: () => void;
}

export const useFingerprintStore = create<FingerprintProgressState>((set) => ({
  current: 0,
  total: 0,
  initProgress: (total: number) => set({ current: 0, total }),
  increment: () => set((state) => ({ current: state.current + 1 })),
  updateTotal: (newTotal: number) => set(() => ({ total: newTotal })),
  clear: () => set({ current: 0, total: 0 }),
}));

// -------------------------------------------------------------------
// File Store

interface FileStore {
  selectedFiles: FileMetadata[];
  setSelectedFiles: (files: FileMetadata[]) => void;
  allFiles: FileMetadata[];
  setAllFiles: (files: FileMetadata[]) => void;
}

export const useFileStore = create<FileStore>((set) => ({
  selectedFiles: [],
  setSelectedFiles: (files: FileMetadata[]) => set({ selectedFiles: files }),
  allFiles: [],
  setAllFiles: (files: FileMetadata[]) => set({ allFiles: files }),
}));

// -------------------------------------------------------------------
// Popup Store

interface PopupStore {
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
}

export const usePopupStore = create<PopupStore>((set) => ({
  isVisible: false,
  setVisible: (visible: boolean) => set({ isVisible: visible }),
}));

// -------------------------------------------------------------------
// Repository Store

export interface Repository {
  id: string;
  name: string;
  description: string;
}

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
