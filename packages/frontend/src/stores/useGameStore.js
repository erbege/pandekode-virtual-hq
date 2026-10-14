import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // Waktu dan Hari
  gameTime: 600, // Mulai jam 10:00 (10 * 60)
  gameDay: 1, // 1=Senin, 2=Selasa, ..., 7=Minggu
  timeMode: 'simulated', // 'simulated' atau 'realtime'
  
  // Jam Kerja
  workingHoursEnabled: true,
  startTime: 8, // 08:00
  endTime: 17, // 17:00

  // State Global Game
  isNavigating: false,

  // Action untuk update state
  setGameTime: (time) => set({ gameTime: time }),
  setGameDay: (day) => set({ gameDay: day }),
  setTimeMode: (mode) => set({ timeMode: mode }),
  setWorkingHoursEnabled: (enabled) => set({ workingHoursEnabled: enabled }),
  setStartTime: (time) => set({ startTime: time }),
  setEndTime: (time) => set({ endTime: time }),
  setIsNavigating: (isNavigating) => set({ isNavigating }),

  // Tick logic: dipanggil dari game loop setiap detik/frame jika di mode simulated
  tick: () => set((state) => {
    if (state.timeMode === 'realtime') return state; // Di mode realtime, waktu di-sync via effect eksternal
    const nextTime = state.gameTime + 1;
    if (nextTime >= 1440) {
      return { gameTime: 0, gameDay: (state.gameDay % 7) + 1 };
    }
    return { gameTime: nextTime };
  })
}));

export default useGameStore;
