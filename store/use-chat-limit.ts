import { create } from 'zustand';

interface ChatLimitStore {
  remaining: number | null;
  limit: number | null;
  used: number | null;
  reset: Date | null;
  decrementRemaining: () => void;
  setLimitData: (data: any) => void;
}

export const useChatLimit = create<ChatLimitStore>((set) => ({
  remaining: null,
  limit: null,
  used: null,
  reset: null,
  decrementRemaining: () => set((state) => ({ 
    remaining: state.remaining !== null ? state.remaining - 1 : null,
    used: state.used !== null ? state.used + 1 : null,
  })),
  setLimitData: (data) => set(data),
})); 