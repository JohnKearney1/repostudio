// fileStore.ts
import { create } from 'zustand';

export interface FileMetadata {
  id: string;
  name: string;
  encoding: string;
  path: string;
  precedence?: string;
  other_versions?: string;
  spectrogram?: string;
  quality?: string;
  samplerate?: number;
  tags?: string;
  accessible: boolean; // Add this line
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