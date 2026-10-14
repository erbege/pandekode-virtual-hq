// Layout kantor: posisi slot ruangan, rute Hadi, dan helper navigasi.
// Semua koordinat diverifikasi bebas dari tabrakan furnitur/dinding.

export const HOME_POSITION = [11, 2, 11];

/** Slot posisi di setiap ruangan (untuk mencegah NPC menumpuk dan menabrak obyek) */
export const ROOM_SLOTS = {
  // Sofa 1 di Z=2 (Z: 1.4 - 2.6), Sofa 2 di Z=5 (Z: 4.4 - 5.6)
  GO_TO_LOUNGE: [
    [-11.5, 2, 3.5], [-10.5, 2, 3.5], [-9.5, 2, 3.5], // Area terbuka tengah sofa
    [-8.0, 2, 2.5],  [-8.0, 2, 3.5],  [-8.0, 2, 4.5],  // Area kanan sofa (arah lorong)
    [-13.0, 2, 2.5], [-13.0, 2, 4.5]                  // Area kiri sofa
  ],
  // Meja Meeting di [-10.5, 0, -6] (X: -12.5 s/d -8.5, Z: -9.0 s/d -3.0)
  // Papan Kanban di [-14, 0, -6]
  GO_TO_MEETINGROOM: [
    [-7.5, 2, -4.5],  [-7.5, 2, -6.0],  [-7.5, 2, -7.5],  // Sisi kanan meja (menghadap meja)
    [-10.5, 2, -2.0], [-9.5, 2, -2.0],  [-11.5, 2, -2.0], // Sisi selatan meja
    [-10.5, 2, -10.0], [-9.5, 2, -10.0]                   // Sisi utara meja
  ],
  // Counter Pantry di [-10.5, 0, 8] (Z: 7.15 s/d 8.85), Sofa 2 di Z=5
  GO_TO_PANTRY: [
    [-11.5, 2, 6.5], [-10.5, 2, 6.5], [-9.5, 2, 6.5], // Depan counter pantry
    [-8.0, 2, 6.5],  [-8.0, 2, 7.5],                   // Kanan counter
    [-13.0, 2, 6.5], [-13.0, 2, 7.5],                  // Kiri counter
    [-8.0, 2, 5.5]                                     // Arah lorong
  ],
  // Kulkas Pantry di [-13.8, 0, 8.0] (Destinasi mengambil minuman dingin)
  GET_COLD_DRINK: [
    [-13.5, 2, 6.8], [-13.2, 2, 6.8]
  ],
  // Mesin Kopi di [-11.5, 1.3, 7.8] (Destinasi menyeduh espresso mandiri / Hadi)
  BREW_COFFEE: [
    [-11.5, 2, 6.7], [-11.0, 2, 6.7]
  ],
  HADI_BREW_COFFEE: [
    [-11.5, 2, 6.7]
  ],
  // Meja CEO di [11, 0, -9] (X: 9.5 s/d 12.5, Z: -9.75 s/d -8.25)
  GO_TO_CEOROOM: [
    [10.0, 2, -6.8], [11.0, 2, -6.8], [12.0, 2, -6.8], // Tamu di depan meja CEO
    [10.0, 2, -5.5], [11.0, 2, -5.5], [12.0, 2, -5.5],
    [9.5, 2, -4.0],  [11.0, 2, -4.0]
  ],
  // Meja Resepsionis di [11, 0.5, 2] (Z: 1.5 s/d 2.5)
  GO_TO_LOBBY: [
    [9.0, 2, 4.0],  [10.0, 2, 4.0],  [11.0, 2, 4.0],
    [9.0, 2, 5.5],  [10.0, 2, 5.5],  [11.0, 2, 5.5],
    [8.0, 2, 4.5],  [12.0, 2, 4.5]
  ],
  // Toilet & Restroom: Bilik kloset di Z=8.2, Titik tujuan tepat di depan kloset (Z=7.25)
  // Jarak aman ~32cm di depan kloset, bebas dari benturan fisik collider (buffer 25cm)
  GO_TO_TOILET: [
    [-3.75, 2, 7.25], // Tepat di depan kloset Staff Toilet 1 (Bilik Barat)
    [0.75, 2, 7.25],  // Tepat di depan kloset Staff Toilet 2 (Bilik Tengah)
    [5.0, 2, 7.25],   // Tepat di depan kloset Restroom (Bilik Timur)
    [-3.5, 2, 7.15],  // Dekat kloset Staff Toilet 1 (variasi posisi aman)
    [1.0, 2, 7.15],   // Dekat kloset Staff Toilet 2 (variasi posisi aman)
    [4.75, 2, 7.15],  // Dekat kloset Restroom (variasi posisi aman)
    [-4.0, 2, 7.2],   // Dekat kloset Staff Toilet 1 (variasi posisi aman)
    [0.5, 2, 7.2],    // Dekat kloset Staff Toilet 2 (variasi posisi aman)
    [5.25, 2, 7.2]    // Dekat kloset Restroom (variasi posisi aman)
  ]
};

/** Rute keliling Hadi (OB) — posisi di koridor/lorong bebas tabrakan dekat tiap meja */
export const HADI_ROUTE = [
  [-4.0, 2, -7.0],  // Dekat Dika (lorong tengah)
  [-4.0, 2, -7.0],  // Dekat Agung
  [0.5, 2, -7.0],   // Dekat Bunga
  [0.5, 2, -7.0],   // Dekat Eka
  [5.0, 2, -7.0],   // Dekat Fajar
  [5.0, 2, -7.0],   // Dekat Candra
  [9.5, 2, -7.5],   // Depan meja CEO
  [11.0, 2, 3.2]    // Depan meja Gita (Resepsionis)
];

/**
 * Menentukan posisi target untuk NPC berdasarkan intent dan index NPC.
 * Mengembalikan null jika intent tidak memerlukan perpindahan (IDLE, NONE, dsb).
 */
export function getSlotPosition(intent, npcIndex) {
  let key = intent;
  // KANBAN -> ruang meeting
  if (key === 'KANBAN') key = 'GO_TO_MEETINGROOM';

  const slots = ROOM_SLOTS[key];
  if (!slots) return null;
  return slots[npcIndex % slots.length];
}

/**
 * Menentukan posisi meja berikutnya pada rute keliling Hadi.
 */
export function getHadiRoutePosition(routeIndex) {
  if (routeIndex < HADI_ROUTE.length) return HADI_ROUTE[routeIndex];
  return [-10.5, 2, 6.5]; // Fallback ke Pantry area aman
}
