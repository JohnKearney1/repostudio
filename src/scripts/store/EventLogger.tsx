import { create } from 'zustand';

export interface EventLog {
    timestamp: string;
    text: string;
    description?: string;
    status?: string;
}

export interface EventLoggerStore {
    events: EventLog[];
    addEvent: (event: EventLog) => void;
    clearEvents: () => void;
}

export const useEventLoggerStore = create<EventLoggerStore>((set) => ({
    events: [],
    addEvent: (event: EventLog) =>
        set((state) => ({ events: [...state.events, event] })),
    clearEvents: () => set({ events: [] }),
}));

