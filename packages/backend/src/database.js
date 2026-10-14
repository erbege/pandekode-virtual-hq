import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbFilePath = process.env.DB_PATH || path.resolve('./database.sqlite');
let dbPromise = open({
  filename: dbFilePath,
  driver: sqlite3.Database
});

export const initDb = async () => {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY,
      data TEXT
    )
  `);
  
  const initRow = async (id, defaultValue) => {
    const row = await db.get('SELECT * FROM game_state WHERE id = ?', [id]);
    if (!row) {
      await db.run('INSERT INTO game_state (id, data) VALUES (?, ?)', [id, JSON.stringify(defaultValue)]);
    }
  };

  await initRow(1, {}); // Main State
  await initRow(2, { // Kanban State
    todo: [{ id: 1, title: 'Implementasi Payment Gateway', assignee: 'Dika', tag: 'Fitur' }],
    inProgress: [
      { id: 2, title: 'Mockup Halaman Dashboard', assignee: 'Bunga', tag: 'Desain' },
      { id: 3, title: 'Slicing Halaman Login', assignee: 'Candra', tag: 'Frontend' }
    ],
    review: [{ id: 4, title: 'Perbaikan Crash Laporan PDF', assignee: 'Eka', tag: 'Bugfix' }],
    done: [{ id: 5, title: 'Setup Repository & CI/CD', assignee: 'Fajar', tag: 'Setup' }]
  });
  await initRow(3, { // InfoBoard
    note: "Catatan Tim (Agung): Ingat untuk selalu menjaga kebersihan dan submit absen tepat waktu.",
    todoList: "- Bersihkan kulkas di Pantry secara berkala (Hadi)\n- Restock kopi, teh, & cemilan (Gita)\n- Rapikan meja kerja masing-masing (Semua)\n- Serahkan rekap absensi mingguan (Gita)"
  });
};

export const getGameState = async () => {
  const db = await dbPromise;
  const row = await db.get('SELECT data FROM game_state WHERE id = 1');
  return row ? JSON.parse(row.data) : {};
};

export const saveGameState = async (state) => {
  const db = await dbPromise;
  await db.run('UPDATE game_state SET data = ? WHERE id = 1', [JSON.stringify(state)]);
  return { success: true };
};

export const getKanbanData = async () => {
  const db = await dbPromise;
  const row = await db.get('SELECT data FROM game_state WHERE id = 2');
  return row ? JSON.parse(row.data) : null;
};

export const saveKanbanData = async (data) => {
  const db = await dbPromise;
  await db.run('UPDATE game_state SET data = ? WHERE id = 2', [JSON.stringify(data)]);
  return { success: true };
};

export const getInfoBoard = async () => {
  const db = await dbPromise;
  const row = await db.get('SELECT data FROM game_state WHERE id = 3');
  return row ? JSON.parse(row.data) : null;
};

export const saveInfoBoard = async (data) => {
  const db = await dbPromise;
  await db.run('UPDATE game_state SET data = ? WHERE id = 3', [JSON.stringify(data)]);
  return { success: true };
};
