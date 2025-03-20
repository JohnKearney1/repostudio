// store.tsx
// This file contains the store definitions for the application.
// It uses Zustand for state management and Zustand Persist for persistence.

// Import Store Frameworks
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Import Types
import { FileMetadata, Repository } from '../types/ObjectTypes';

// ------------------------------------------------------------------- // 
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

// ------------------------------------------------------------------- // 

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

// ------------------------------------------------------------------- // 

interface FileStore {
  selectedFiles: FileMetadata[];
  setSelectedFiles: (files: FileMetadata[] | ((prev: FileMetadata[]) => FileMetadata[])) => void;
  allFiles: FileMetadata[];
  setAllFiles: (files: FileMetadata[] | ((prev: FileMetadata[]) => FileMetadata[])) => void;
}

export const useFileStore = create<FileStore>((set) => ({
  selectedFiles: [],
  setSelectedFiles: (files) =>
    set((state) => ({
      selectedFiles:
        typeof files === 'function' ? files(state.selectedFiles) : files,
    })),
  allFiles: [],
  setAllFiles: (files) =>
    set((state) => ({
      allFiles: typeof files === 'function' ? files(state.allFiles) : files,
    })),
  }));

// ------------------------------------------------------------------- // 

interface PopupStore {
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
}

export const usePopupStore = create<PopupStore>((set) => ({
  isVisible: false,
  setVisible: (visible: boolean) => set({ isVisible: visible }),
}));

interface PopupContentStore {
  content: JSX.Element | null;
  setContent: (content: JSX.Element | null) => void;
}

export const usePopupContentStore = create<PopupContentStore>((set) => ({
  content: null,
  setContent: (content: JSX.Element | null) => set({ content }),
}));

// ------------------------------------------------------------------- // 
interface RightPanelContentStore {
  content: JSX.Element | null;
  setContent: (content: JSX.Element | null) => void;
}

export const useRightPanelContentStore = create<RightPanelContentStore>((set) => ({
  content: null,
  setContent: (content: JSX.Element | null) => set({ content }),
}));

// ------------------------------------------------------------------- // 

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
