// Global Keyboard Listener (Anti-Bug / Anti-Stale)
// Diregistrasi sekali di level window agar state key selalu sinkron,
// menghindari masalah stale-closure di dalam useFrame/requestAnimationFrame.

export const keys = { w: false, a: false, s: false, d: false, shift: false, q: false, e: false, space: false };

export const resetKeys = () => {
  keys.w = false;
  keys.a = false;
  keys.s = false;
  keys.d = false;
  keys.shift = false;
  keys.q = false;
  keys.e = false;
  keys.space = false;
};

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.shiftKey || e.key === 'Shift') keys.shift = true;
  const k = e.key.toLowerCase();
  if (['w', 'arrowup'].includes(k)) keys.w = true;
  if (['s', 'arrowdown'].includes(k)) keys.s = true;
  if (['a', 'arrowleft'].includes(k)) keys.a = true;
  if (['d', 'arrowright'].includes(k)) keys.d = true;
  if (k === 'q') keys.q = true;
  if (k === 'e') keys.e = true;
  if (e.code === 'Space' || e.key === ' ' || k === ' ') {
    keys.space = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Shift') keys.shift = false;
  else keys.shift = e.shiftKey;
  const k = e.key.toLowerCase();
  if (['w', 'arrowup'].includes(k)) keys.w = false;
  if (['s', 'arrowdown'].includes(k)) keys.s = false;
  if (['a', 'arrowleft'].includes(k)) keys.a = false;
  if (['d', 'arrowright'].includes(k)) keys.d = false;
  if (k === 'q') keys.q = false;
  if (k === 'e') keys.e = false;
  if (e.code === 'Space' || e.key === ' ' || k === ' ') keys.space = false;
});

// R4 Fix: Reset seluruh input saat jendela kehilangan fokus atau tab disembunyikan
window.addEventListener('blur', resetKeys);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) resetKeys();
});

