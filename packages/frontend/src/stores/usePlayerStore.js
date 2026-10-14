import { create } from 'zustand';

/**
 * Global Zustand Store untuk State Pemain & Kamera (R9: Konsolidasi State)
 * Mengeliminasi prop-drilling multi-level untuk:
 * - controlledNpcId: ID karakter yang dikendalikan pengguna (default null atau 'ceo')
 * - cameraMode: 0 = Isometric, 1 = Over-The-Shoulder, 2 = First-Person
 * - isCameraLocked: status kamera terkunci mengikuti karakter (true) vs bebas orbit (false)
 */
export const usePlayerStore = create((set) => ({
  controlledNpcId: null,
  cameraMode: 0,        // 0: Isometric, 1: OTS, 2: FPV
  isCameraLocked: true,

  setControlledNpcId: (idOrFn) => set((state) => ({
    controlledNpcId: typeof idOrFn === 'function' ? idOrFn(state.controlledNpcId) : idOrFn
  })),

  setCameraMode: (modeOrFn) => set((state) => ({
    cameraMode: typeof modeOrFn === 'function' ? modeOrFn(state.cameraMode) : modeOrFn
  })),

  setIsCameraLocked: (valOrFn) => set((state) => ({
    isCameraLocked: typeof valOrFn === 'function' ? valOrFn(state.isCameraLocked) : valOrFn
  })),

  toggleCameraMode: () => set((state) => ({
    cameraMode: (state.cameraMode + 1) % 3
  })),

  toggleCEO: () => set((state) => {
    if (state.controlledNpcId === 'ceo') {
      return { controlledNpcId: null, isCameraLocked: false, cameraMode: 0 };
    } else {
      return { controlledNpcId: 'ceo', isCameraLocked: true };
    }
  })
}));

export default usePlayerStore;
