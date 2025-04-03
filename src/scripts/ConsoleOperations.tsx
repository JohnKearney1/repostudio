// ConsoleOperations.tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  persist(
    (set) => ({
      messages: [],
      addMessage: (message: ConsoleMessage) =>
        set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'console-messages' }
  )
);

// Enhanced command processing logic
export const processCommand = (command: string): ConsoleMessage => {
  // Trim leading/trailing spaces and split into tokens
  const trimmed = command.trim();
  const tokens = trimmed.split(/\s+/);
  const baseCommand = tokens[0].toLowerCase();

  let output: string;

  // Use the number of tokens to decide if extra arguments were provided
  switch (baseCommand) {
    case 'help':
      // Only trigger "help" if it's the only token
      output = tokens.length === 1 
        ? 'Available commands: help, echo [text], time'
        : `Unknown command: ${command}`;
      break;
    case 'echo':
      // Echo command: return everything after "echo"
      output = tokens.length > 1 
        ? tokens.slice(1).join(' ')
        : '';
      break;
    case 'time':
      // Only trigger "time" if it's the only token
      output = tokens.length === 1 
        ? `The current time is ${new Date().toLocaleTimeString()}`
        : `Unknown command: ${command}`;
      break;

    case 'clear':
      // clear all the messages from the store, then add a message indicating the console was cleared
      useConsoleStore.getState().clearMessages();
      output = ' ';
      break;
    default:
      output = `Unknown command: ${command}`;
  }

  return {
    id: Date.now(),
    text: output,
    timestamp: new Date().toLocaleTimeString(),
  };
};
