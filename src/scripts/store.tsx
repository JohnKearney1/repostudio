// store.tsx
// This file contains the store definitions for the application.
// It uses Zustand for state management and Zustand Persist for persistence.

// Import Store Frameworks
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Import Types
import { FileMetadata, Repository } from '../types/ObjectTypes';

// ------------------------------------------------------------------- //

export interface Tab {
  id: string;
  name: string;
  iconName: string; // Store icon name as string
  componentId: string; // Store component identifier as string
}


interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}
export const useTabStore = create<TabStore, [["zustand/persist", TabStore]]>(
  persist((set) => ({
    tabs: [
      {
        id: 'properties',
        name: 'Properties',
        iconName: 'InfoCircledIcon',
        componentId: 'PropertiesPane'
      },
      {
        id: 'actions',
        name: 'Actions',
        iconName: 'RocketIcon',
        componentId: 'ActionsPane'
      }
    ],
    activeTabId: 'PropertiesPane',

    openTab: (tab) =>
      set((state) => ({
        tabs: state.tabs.find(t => t.id === tab.id) ? state.tabs : [...state.tabs, tab],
        activeTabId: tab.id,
      })),

    closeTab: (tabId) =>
      set((state) => {
        const newTabs = state.tabs.filter(t => t.id !== tabId);
        const newActiveTabId = tabId === state.activeTabId && newTabs.length ? newTabs[newTabs.length - 1].id : state.activeTabId;
        return {
          tabs: newTabs,
          activeTabId: newActiveTabId,
        };
      }),

    setActiveTab: (tabId) =>
      set(() => ({ activeTabId: tabId })),
  }), { name: 'tab-store-storage' })
);


// ------------------------------------------------------------------- //
interface ProcessingStore {
  isProcessing: boolean;
  statusMessage: string;
  description: string;
  setProcessing: (isProcessing: boolean, message?: string, description?: string) => void;
}
export const useProcessingStore = create<ProcessingStore>((set) => ({
  isProcessing: false,
  statusMessage: '',
  description: '',
  setProcessing: (isProcessing, message = '', description = '') =>
    set({ isProcessing, statusMessage: message, description }),
}));

// ------------------------------------------------------------------- // 
export interface FingerprintQueueStore {
  fingerprintQueue: FileMetadata[];
  addToQueue: (file: FileMetadata) => void;
  clearQueue: () => void;
  setQueue: (update: FileMetadata[] | ((queue: FileMetadata[]) => FileMetadata[])) => void;
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
      setQueue: (update: FileMetadata[] | ((queue: FileMetadata[]) => FileMetadata[])) =>
        set((state) => ({
          fingerprintQueue: typeof update === 'function' ? update(state.fingerprintQueue) : update,
        }))
    }),
    { name: 'fingerprint-queue-storage' }
  )
);

// ------------------------------------------------------------------- //

interface FingerprintCancellationState {
  processingCancelled: boolean;
  cancelProcessing: () => void;
  resetCancellation: () => void;
}

export const useFingerprintCancellationStore = create<FingerprintCancellationState>((set) => ({
  processingCancelled: false,
  cancelProcessing: () => set({ processingCancelled: true }),
  resetCancellation: () => set({ processingCancelled: false }),
}));


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
