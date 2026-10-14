import { create } from 'zustand';
import { setupInitialNPCs } from '../data/npcProfiles';

const useNpcStore = create((set, get) => ({
  npcStates: setupInitialNPCs(),
  hadiRouteIndex: 0,

  // Update seluruh object state untuk satu NPC
  updateNpcState: (id, updates) => set((state) => ({
    npcStates: {
      ...state.npcStates,
      [id]: { ...state.npcStates[id], ...updates }
    }
  })),

  // Update intent NPC
  setNpcIntent: (id, intent) => set((state) => ({
    npcStates: {
      ...state.npcStates,
      [id]: { ...state.npcStates[id], intent }
    }
  })),

  // Update speech/dialogue NPC
  setNpcSpeech: (id, speech) => set((state) => ({
    npcStates: {
      ...state.npcStates,
      [id]: { ...state.npcStates[id], speech }
    }
  })),

  // Update posisi saat ini dari NPC
  setNpcCurrentPos: (id, pos) => set((state) => ({
    npcStates: {
      ...state.npcStates,
      [id]: { ...state.npcStates[id], currentPos: pos }
    }
  })),

  // Hadi's route management
  incrementHadiRoute: () => set((state) => ({
    hadiRouteIndex: state.hadiRouteIndex + 1
  })),
  resetHadiRoute: () => set({ hadiRouteIndex: 0 })
}));

export default useNpcStore;
