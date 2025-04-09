// ConsoleOperations.tsx
import { create } from 'zustand';

export interface ConsoleMessage {
  id: number;
  text: string;
  timestamp: string;
}

interface ConsoleStore {
  messages: ConsoleMessage[];
  addMessage: (message: ConsoleMessage) => void;
  clearMessages: () => void;
}

export const useConsoleStore = create<ConsoleStore, [["zustand/persist", ConsoleStore]]>(
  (set) => ({
    messages: [],
    addMessage: (message: ConsoleMessage) =>
      set((state) => ({ messages: [...state.messages, message] })),
    clearMessages: () => set({ messages: [] }),
  })
);

// Enhanced command processing logic
// Now returns ConsoleMessage or null (if no message should be added)
export const processCommand = (command: string): ConsoleMessage | null => {
  // Trim leading/trailing spaces and split into tokens
  const trimmed = command.trim();
  const tokens = trimmed.split(/\s+/);
  const baseCommand = tokens[0].toLowerCase();

  let output: string;

  switch (baseCommand) {
    case 'help':
      output = tokens.length === 1 
        ? 'Available commands: help, echo [text], time'
        : `Unknown command: ${command}`;
      break;
    case 'echo':
      output = tokens.length > 1 
        ? tokens.slice(1).join(' ')
        : '';
      break;
    case 'time':
      output = tokens.length === 1 
        ? `The current time is ${new Date().toLocaleTimeString()}`
        : `Unknown command: ${command}`;
      break;
    case 'clear':
      useConsoleStore.getState().clearMessages();
      return null;
    default:
      output = `Unknown command: ${command}`;
  }

  return {
    id: Date.now(),
    text: output,
    timestamp: new Date().toLocaleTimeString(),
  };
};
