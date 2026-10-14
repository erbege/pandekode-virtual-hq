import { create } from 'zustand';
import { initialNPCs } from '../data/npcProfiles';
import { generateProceduralEvent, createEventFromWebhook } from '../systems/eventGenerator';

// Mapping nama assignee di Kanban ke NPC ID
export const ASSIGNEE_TO_NPC = {
  dika: 'dika',
  bunga: 'bunga',
  candra: 'candra',
  eka: 'eka',
  fajar: 'fajar',
  agung: 'agung',
  bege: 'ceo',
  ceo: 'ceo',
  gita: 'gita',
  hadi: 'hadi'
};

export const normalizeAssignee = (name) => {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  for (const [key, id] of Object.entries(ASSIGNEE_TO_NPC)) {
    if (lower.includes(key)) return id;
  }
  return null;
};

// Definisi Level Afinitas
export const AFFINITY_TIERS = [
  { level: 1, min: 0, title: 'Kenalan', emoji: '🤍', color: '#94a3b8', perk: 'Sapaan formal dasar' },
  { level: 2, min: 25, title: 'Rekan Kerja', emoji: '💙', color: '#3b82f6', perk: 'Obrolan santai & tips kerja' },
  { level: 3, min: 60, title: 'Sahabat Tim', emoji: '💚', color: '#10b981', perk: 'Saling bantu saat beban kerja tinggi' },
  { level: 4, min: 100, title: 'Partner Solid', emoji: '💜', color: '#8b5cf6', perk: 'Sinergi tim & dialog spesial' },
  { level: 5, min: 150, title: 'Besties Tim', emoji: '💖', color: '#ec4899', perk: 'Loyalitas penuh & dialog rahasia' }
];

export const getAffinityTier = (points = 0) => {
  for (let i = AFFINITY_TIERS.length - 1; i >= 0; i--) {
    if (points >= AFFINITY_TIERS[i].min) {
      const current = AFFINITY_TIERS[i];
      const next = AFFINITY_TIERS[i + 1] || null;
      const prevMin = current.min;
      const nextMin = next ? next.min : current.min + 100;
      const progress = next ? Math.min(100, Math.round(((points - prevMin) / (nextMin - prevMin)) * 100)) : 100;
      return { ...current, next, progress, points };
    }
  }
  return { ...AFFINITY_TIERS[0], next: AFFINITY_TIERS[1], progress: 0, points };
};

// Definisi Badge Pencapaian
export const INITIAL_ACHIEVEMENTS = [
  {
    id: 'first_chat',
    title: 'Kolega Ramah',
    description: 'Mengobrol dengan salah satu anggota tim untuk pertama kalinya.',
    icon: '💬',
    category: 'Sosial',
    target: 1,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'chat_100',
    title: 'Raja Gosip Kantor',
    description: 'Mengirim total 100 obrolan di ChatBox PANDEKODE HQ.',
    icon: '🗣️',
    category: 'Sosial',
    target: 100,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'first_project_completed',
    title: 'Proyek Perdana',
    description: 'Menyelesaikan task/proyek pertama di papan Kanban.',
    icon: '🚀',
    category: 'Produktivitas',
    target: 1,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'sprint_master',
    title: 'Sprint Master',
    description: 'Menyelesaikan minimal 5 tugas di kolom Done pada Kanban.',
    icon: '📊',
    category: 'Produktivitas',
    target: 5,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'social_butterfly',
    title: 'Sahabat Semua Divisi',
    description: 'Mencapai level Rekan Kerja (Lv. 2+) dengan minimal 3 anggota tim.',
    icon: '🤝',
    category: 'Relasi',
    target: 3,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'soulmate_office',
    title: 'Partner Sejati',
    description: 'Mencapai level Sahabat Tim (Lv. 3+) dengan salah satu NPC.',
    icon: '💖',
    category: 'Relasi',
    target: 1,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'server_hero',
    title: 'Pahlawan Server',
    description: 'Berhasil mengatasi insiden darurat "Server Down!" dengan cepat.',
    icon: '🚨',
    category: 'Krisis',
    target: 1,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'coffee_hero',
    title: 'Penyelamat Kafein',
    description: 'Memperbaiki mesin kopi yang rusak atau memesankan kopi untuk tim.',
    icon: '☕',
    category: 'Krisis',
    target: 1,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'client_closer',
    title: 'Diplomat Klien',
    description: 'Menangani panggilan klien dadakan dan menyepakati revisi sprint.',
    icon: '📞',
    category: 'Krisis',
    target: 1,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'ceo_leader',
    title: 'Jiwa Kepemimpinan',
    description: 'Bermain aktif dalam mode peran CEO dan memimpin tim kantor.',
    icon: '👔',
    category: 'Spesial',
    target: 1,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'night_owl',
    title: 'Karyawan Lembur',
    description: 'Bekerja atau berada di kantor hingga lewat jam 18:00.',
    icon: '🌙',
    category: 'Spesial',
    target: 1,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'company_legend',
    title: 'Legenda PANDEKODE',
    description: 'Membuka minimal 7 badge pencapaian lainnya di kantor.',
    icon: '🏆',
    category: 'Prestise',
    target: 7,
    progress: 0,
    unlocked: false,
    unlockedAt: null
  }
];

// Definisi Template Random Events
export const RANDOM_EVENTS = {
  SERVER_DOWN: {
    id: 'SERVER_DOWN',
    title: '🚨 Server Down! (502 Bad Gateway)',
    icon: '🚨',
    theme: '#ef4444',
    bgGradient: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)',
    description: 'Cluster server Kubernetes produksi mengalami traffic spike mendadak dan memory leak! Endpoint API utama terganggu.',
    affectedNpcs: ['fajar', 'dika', 'agung'],
    durationSeconds: 45,
    dialogues: {
      fajar: 'Gawat! Pod crashlooping di cluster prod! CPU 99%!',
      dika: 'Koneksi database overload, lagi analisa slow query!',
      agung: 'Fajar, Dika, rollback dulu versi sebelumnya sekarang!'
    },
    intents: {
      fajar: 'DESK',
      dika: 'DESK',
      agung: 'GO_TO_MEETINGROOM'
    },
    options: [
      {
        id: 'reboot_cluster',
        label: '⚡ Auto-Scale Pod & Flush Cache',
        actionText: 'Anda memicu auto-scaler dan membersihkan cache Redis di backend.',
        rewardPoints: 15,
        targetNpc: 'fajar',
        achievementId: 'server_hero'
      },
      {
        id: 'help_query',
        label: '🛠️ Bantu Dika Optimasi Query DB',
        actionText: 'Anda bersama Dika menambahkan index pada tabel transaksi yang macet.',
        rewardPoints: 20,
        targetNpc: 'dika',
        achievementId: 'server_hero'
      }
    ]
  },
  CLIENT_CALL: {
    id: 'CLIENT_CALL',
    title: '📞 Panggilan Klien VIP Dadakan!',
    icon: '📞',
    theme: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)',
    description: 'Klien korporat PT Sejahtera Utama meminta video conference mendadak untuk mereview mock-up dan deliverable sprint.',
    affectedNpcs: ['agung', 'bunga', 'gita'],
    durationSeconds: 50,
    dialogues: {
      gita: 'Panggilan video dari klien PT Sejahtera sudah terhubung di line 1!',
      agung: 'Semua ke meeting room, kita siapkan presentasi status sprint.',
      bunga: 'Bentar aku siapkan interactive prototype Figma dulu ya!'
    },
    intents: {
      agung: 'GO_TO_MEETINGROOM',
      bunga: 'GO_TO_MEETINGROOM',
      gita: 'DESK'
    },
    options: [
      {
        id: 'lead_presentation',
        label: '🤝 Pimpin Rapat & Presentasi Prototype',
        actionText: 'Anda memimpin presentasi dengan lancar. Klien sangat puas dengan kemajuan!',
        rewardPoints: 20,
        targetNpc: 'agung',
        achievementId: 'client_closer'
      },
      {
        id: 'delegate_bunga',
        label: '🎨 Dukung Bunga Jelaskan Desain',
        actionText: 'Bunga memaparkan design system dengan memukau. Klien langsung menyetujui!',
        rewardPoints: 20,
        targetNpc: 'bunga',
        achievementId: 'client_closer'
      }
    ]
  },
  COFFEE_BROKEN: {
    id: 'COFFEE_BROKEN',
    title: '☕ Mesin Kopi Espresso Rusak!',
    icon: '☕',
    theme: '#d97706',
    bgGradient: 'linear-gradient(135deg, #451a03 0%, #b45309 100%)',
    description: 'Mesin espresso di Pantry mengeluarkan suara berisik dan tekanan airnya mati! Seluruh tim terancam kekurangan asupan kafein.',
    affectedNpcs: ['hadi', 'candra', 'dika'],
    durationSeconds: 45,
    dialogues: {
      hadi: 'Waduh, airnya ngga mau keluar, ada kerak di selang uapnya...',
      candra: 'Waduh, baru mau seduh kopi buat marathon slicing komponen...',
      dika: 'Tanpa espresso hangat, compile backend terasa dua kali lebih lama...'
    },
    intents: {
      hadi: 'BREW_COFFEE',
      candra: 'GO_TO_PANTRY',
      dika: 'GO_TO_PANTRY'
    },
    options: [
      {
        id: 'fix_machine',
        label: '🔧 Bantu Pak Hadi Bersihkan Nozzle Mesin',
        actionText: 'Bersama Pak Hadi, Anda membersihkan kerak mesin kopi. Mesin kembali menyala normal!',
        rewardPoints: 25,
        targetNpc: 'hadi',
        achievementId: 'coffee_hero'
      },
      {
        id: 'order_delivery',
        label: '🛵 Pesankan Es Kopi Susu Online untuk Tim',
        actionText: 'Anda mentraktir kopi artisan untuk seisi kantor! Semangat tim langsung melesat!',
        rewardPoints: 20,
        targetNpc: 'candra',
        achievementId: 'coffee_hero',
        moodBoostAll: true
      }
    ]
  },
  PIZZA_PARTY: {
    id: 'PIZZA_PARTY',
    title: '🍕 Traktiran Pizza Kantor Dadakan!',
    icon: '🍕',
    theme: '#10b981',
    bgGradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
    description: 'CEO merayakan pencapaian rilis fitur terbaru dengan mentraktir 5 kotak pizza premium di Lounge & Pantry!',
    affectedNpcs: ['bunga', 'candra', 'dika', 'eka', 'fajar', 'hadi', 'gita', 'agung'],
    durationSeconds: 40,
    dialogues: {
      bunga: 'Wahhh aromanya enak banget! Pizza party time!',
      candra: 'Gass! Potongan pertama buat yang kelar slicing!',
      hadi: 'Alhamdulillah, silakan dinikmati teman-teman sekalian.'
    },
    intents: {
      bunga: 'GO_TO_LOUNGE',
      candra: 'GO_TO_PANTRY',
      dika: 'GO_TO_LOUNGE',
      eka: 'GO_TO_LOUNGE',
      fajar: 'GO_TO_PANTRY'
    },
    options: [
      {
        id: 'celebrate_all',
        label: '🎉 Nikmati Pizza & Rayakan Kemenangan Tim',
        actionText: 'Seluruh tim berkumpul dengan gembira, saling mengapresiasi dan mengisi tenaga.',
        rewardPoints: 15,
        targetNpc: 'bunga',
        moodBoostAll: true
      }
    ]
  }
};

// Hitung Mood NPC berdasarkan Kanban Workload
export const calculateMoodFromWorkload = (npcId, kanbanData) => {
  if (!kanbanData) return { mood: 'happy', score: 0, activeCount: 0, doneCount: 0, reason: 'Tidak ada task' };

  let todoCount = 0;
  let inProgressCount = 0;
  let reviewCount = 0;
  let doneCount = 0;

  const countTasks = (list, multiplier) => {
    if (!Array.isArray(list)) return 0;
    return list.filter(t => normalizeAssignee(t.assignee) === npcId).length;
  };

  todoCount = countTasks(kanbanData.todo);
  inProgressCount = countTasks(kanbanData.inProgress);
  reviewCount = countTasks(kanbanData.review);
  doneCount = countTasks(kanbanData.done);

  const activeCount = todoCount + inProgressCount + reviewCount;
  // Bobot: InProgress paling berat (2), Todo (1), Review (1.5), Done memberi rasa puas (-0.5)
  const score = (inProgressCount * 2) + (todoCount * 1) + (reviewCount * 1.5) - (doneCount * 0.5);

  let mood = 'happy';
  let reason = '';
  let emoji = '😊';
  let color = '#10b981';

  if (activeCount >= 3 || score >= 4) {
    mood = 'stressed';
    emoji = '😫';
    color = '#ef4444';
    reason = `Beban kerja tinggi (${activeCount} task aktif di Kanban)`;
  } else if (activeCount >= 1 || score >= 1.5) {
    mood = 'neutral';
    emoji = '😐';
    color = '#f59e0b';
    reason = `Fokus mengerjakan ${activeCount} task`;
  } else {
    mood = 'happy';
    emoji = '😊';
    color = '#10b981';
    reason = doneCount > 0 ? `Santai & Puas (${doneCount} task selesai)` : 'Kapasitas santai, siap bantu tim';
  }

  return { mood, score, activeCount, doneCount, reason, emoji, color, todoCount, inProgressCount, reviewCount };
};

// Helper Muat & Simpan LocalStorage
const STORAGE_KEY = 'pandekode_interaction_store_v1';
const loadPersistedState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Gagal memuat interaction state dari localStorage:', e);
    return null;
  }
};

const savePersistedState = (state) => {
  if (typeof window === 'undefined') return;
  try {
    const toSave = {
      playerAffinity: state.playerAffinity,
      npcAffinity: state.npcAffinity,
      achievements: state.achievements,
      stats: state.stats
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Gagal menyimpan interaction state ke localStorage:', e);
  }
};

const persisted = loadPersistedState() || {};

export const useInteractionStore = create((set, get) => ({
  // 1. Mood System State
  npcMoods: {},
  kanbanData: null,
  temporaryMoodBoosts: {}, // { [npcId]: { mood: 'happy', expiresAt: timestamp } }

  // 2. Relationship / Affinity System State
  playerAffinity: persisted.playerAffinity || {
    agung: 15,
    bunga: 20,
    candra: 15,
    dika: 10,
    eka: 10,
    fajar: 10,
    gita: 25,
    hadi: 25,
    ceo: 10
  },
  npcAffinity: persisted.npcAffinity || {
    'candra_dika': 35,
    'bunga_candra': 30,
    'agung_bunga': 25,
    'eka_fajar': 20,
    'hadi_gita': 40
  },

  // 3. Office & Tech Events State (Pluggable: Procedural & Webhook-Ready)
  activeEvent: null,
  eventTimer: null,
  eventBannerVisible: false,
  eventHistory: [],
  lastEventTimestamp: Date.now(),
  minEventIntervalMs: 35 * 60 * 1000, // Interval sangat jarang (35-50 menit untuk menjaga kondusifitas kantor)

  // 4. Achievement System State
  achievements: persisted.achievements || INITIAL_ACHIEVEMENTS,
  unlockedToast: null, // Achievement objek yang sedang ditayangkan sebagai perayaan

  // Statistik Gameplay
  stats: persisted.stats || {
    totalChats: 0,
    eventsResolved: 0,
    tasksCompleted: 0,
    ceoTimeMinutes: 0
  },

  // --- ACTIONS: MOOD & KANBAN ---
  setKanbanData: (data) => {
    if (!data) return;
    const moods = {};
    Object.keys(initialNPCs).forEach(id => {
      moods[id] = calculateMoodFromWorkload(id, data);
    });

    const doneCount = Array.isArray(data.done) ? data.done.length : 0;

    set({ kanbanData: data, npcMoods: moods });

    // Cek achievement task
    if (doneCount >= 1) {
      get().updateAchievementProgress('first_project_completed', doneCount);
    }
    if (doneCount >= 5) {
      get().updateAchievementProgress('sprint_master', doneCount);
    }
  },

  recalculateMoods: () => {
    const { kanbanData, temporaryMoodBoosts } = get();
    const moods = {};
    const now = Date.now();

    Object.keys(initialNPCs).forEach(id => {
      const base = calculateMoodFromWorkload(id, kanbanData);
      if (temporaryMoodBoosts[id] && temporaryMoodBoosts[id].expiresAt > now) {
        moods[id] = {
          ...base,
          mood: temporaryMoodBoosts[id].mood,
          emoji: temporaryMoodBoosts[id].mood === 'happy' ? '😊' : base.emoji,
          color: temporaryMoodBoosts[id].mood === 'happy' ? '#10b981' : base.color,
          reason: temporaryMoodBoosts[id].reason || base.reason
        };
      } else {
        moods[id] = base;
      }
    });

    set({ npcMoods: moods });
  },

  applyMoodBoost: (npcId, mood = 'happy', durationMs = 60000, reason = 'Merasa senang!') => {
    const now = Date.now();
    set(state => ({
      temporaryMoodBoosts: {
        ...state.temporaryMoodBoosts,
        [npcId]: { mood, expiresAt: now + durationMs, reason }
      }
    }));
    get().recalculateMoods();
  },

  applyMoodBoostToAll: (mood = 'happy', durationMs = 90000, reason = 'Semangat dari traktiran kantor!') => {
    const now = Date.now();
    const boosts = {};
    Object.keys(initialNPCs).forEach(id => {
      boosts[id] = { mood, expiresAt: now + durationMs, reason };
    });
    set(state => ({
      temporaryMoodBoosts: { ...state.temporaryMoodBoosts, ...boosts }
    }));
    get().recalculateMoods();
  },

  // --- ACTIONS: RELATIONSHIP & AFFINITY ---
  addPlayerAffinity: (npcId, points = 3) => {
    if (!npcId) return;
    set(state => {
      const current = state.playerAffinity[npcId] || 0;
      const nextVal = current + points;
      const nextAffinity = { ...state.playerAffinity, [npcId]: nextVal };

      // Cek apakah mencapai tier baru untuk achievement
      const countLv2 = Object.values(nextAffinity).filter(pts => pts >= 25).length;
      const maxPts = Math.max(...Object.values(nextAffinity));

      const updatedState = { ...state, playerAffinity: nextAffinity };
      savePersistedState(updatedState);
      return { playerAffinity: nextAffinity };
    });

    // Periksa pencapaian relasi
    const state = get();
    const countLv2 = Object.values(state.playerAffinity).filter(pts => pts >= 25).length;
    get().updateAchievementProgress('social_butterfly', countLv2);

    const hasLv3 = Object.values(state.playerAffinity).some(pts => pts >= 60);
    if (hasLv3) {
      get().updateAchievementProgress('soulmate_office', 1);
    }
  },

  addNpcAffinity: (npcA, npcB, points = 2) => {
    if (!npcA || !npcB || npcA === npcB) return;
    const key = [npcA, npcB].sort().join('_');
    set(state => {
      const current = state.npcAffinity[key] || 0;
      const nextAffinity = { ...state.npcAffinity, [key]: current + points };
      const updatedState = { ...state, npcAffinity: nextAffinity };
      savePersistedState(updatedState);
      return { npcAffinity: nextAffinity };
    });
  },

  getNpcBestFriend: (npcId) => {
    const { npcAffinity } = get();
    let bestFriend = null;
    let maxPts = -1;

    Object.entries(npcAffinity).forEach(([pair, pts]) => {
      const [a, b] = pair.split('_');
      if (a === npcId && pts > maxPts) {
        maxPts = pts;
        bestFriend = { id: b, name: initialNPCs[b]?.name || b, points: pts };
      } else if (b === npcId && pts > maxPts) {
        maxPts = pts;
        bestFriend = { id: a, name: initialNPCs[a]?.name || a, points: pts };
      }
    });

    return bestFriend;
  },

  // --- ACTIONS: OFFICE & TECH EVENTS (PLUGGABLE: PROCEDURAL & WEBHOOK) ---
  dispatchOfficeEvent: (eventData) => {
    if (!eventData) return null;

    // Bersihkan timer sebelumnya jika ada
    const currentTimer = get().eventTimer;
    if (currentTimer) clearInterval(currentTimer);

    const isAmbient = eventData.severity === 'ambient';
    const duration = eventData.durationSeconds || (isAmbient ? 12 : 45);

    const eventInstance = {
      ...eventData,
      startedAt: Date.now(),
      timeRemaining: duration,
      status: 'active'
    };

    // Jika ambient: tidak memunculkan banner besar, hanya dialog NPC
    set(state => ({
      activeEvent: eventInstance,
      eventBannerVisible: !isAmbient,
      lastEventTimestamp: Date.now(),
      eventHistory: [eventInstance, ...state.eventHistory.slice(0, 9)]
    }));

    if (isAmbient) {
      // Event ambient otomatis selesai setelah 9 detik tanpa mengganggu pemain
      const ambientTimer = setTimeout(() => {
        set({ activeEvent: null, eventBannerVisible: false, eventTimer: null });
      }, 9000);
      set({ eventTimer: ambientTimer });
      return eventInstance;
    }

    // Countdown interval untuk event info / warning / critical
    const timer = setInterval(() => {
      const ev = get().activeEvent;
      if (!ev || ev.status !== 'active') {
        clearInterval(timer);
        return;
      }

      if (ev.timeRemaining <= 1) {
        clearInterval(timer);
        get().expireEvent();
      } else {
        set(state => ({
          activeEvent: state.activeEvent ? { ...state.activeEvent, timeRemaining: state.activeEvent.timeRemaining - 1 } : null
        }));
      }
    }, 1000);

    set({ eventTimer: timer });
    return eventInstance;
  },

  // Memicu event dari Webhook nyata eksternal (GitHub, Sentry, CI/CD, dsb.)
  triggerWebhookEvent: (payload) => {
    const webhookEvent = createEventFromWebhook(payload);
    if (webhookEvent) {
      return get().dispatchOfficeEvent(webhookEvent);
    }
    return null;
  },

  // Pengecekan otomatis latar belakang dengan frekuensi sangat rendah (low-frequency check)
  checkAndTriggerBackgroundEvent: () => {
    const { activeEvent, lastEventTimestamp, minEventIntervalMs } = get();
    // Jangan picu jika sedang ada event berjalan
    if (activeEvent && activeEvent.status === 'active') return false;

    const elapsed = Date.now() - lastEventTimestamp;
    // Hanya picu jika interval panjang telah berlalu
    if (elapsed >= minEventIntervalMs) {
      const proceduralEvent = generateProceduralEvent();
      get().dispatchOfficeEvent(proceduralEvent);
      return true;
    }
    return false;
  },

  // Kompatibilitas mundur
  triggerRandomEvent: (eventTypeKey = null) => {
    if (eventTypeKey && RANDOM_EVENTS[eventTypeKey]) {
      return get().dispatchOfficeEvent(RANDOM_EVENTS[eventTypeKey]);
    }
    const proceduralEvent = generateProceduralEvent();
    return get().dispatchOfficeEvent(proceduralEvent);
  },

  resolveEvent: (optionId) => {
    const { activeEvent, eventTimer } = get();
    if (!activeEvent || activeEvent.status !== 'active') return;

    if (eventTimer) clearInterval(eventTimer);

    const selectedOption = activeEvent.options.find(o => o.id === optionId) || activeEvent.options[0];
    
    // Berikan reward afinitas
    if (selectedOption?.targetNpc) {
      get().addPlayerAffinity(selectedOption.targetNpc, selectedOption.rewardPoints || 15);
    }
    activeEvent.affectedNpcs.forEach(nId => {
      get().addPlayerAffinity(nId, 5);
    });

    // Cek mood boost
    if (selectedOption?.moodBoostAll) {
      get().applyMoodBoostToAll('happy', 90000);
    }

    // Cek achievement
    if (selectedOption?.achievementId) {
      get().updateAchievementProgress(selectedOption.achievementId, 1);
    }

    set(state => {
      const resolved = {
        ...state.activeEvent,
        status: 'resolved',
        resolvedOption: selectedOption
      };
      const newStats = {
        ...state.stats,
        eventsResolved: (state.stats.eventsResolved || 0) + 1
      };
      const updated = {
        activeEvent: resolved,
        eventBannerVisible: true,
        eventTimer: null,
        stats: newStats,
        eventHistory: [resolved, ...state.eventHistory.slice(0, 9)]
      };
      savePersistedState(updated);
      return updated;
    });

    // Otomatis tutup banner setelah 4.5 detik
    setTimeout(() => {
      set({ eventBannerVisible: false, activeEvent: null });
    }, 4500);
  },

  expireEvent: () => {
    const { activeEvent } = get();
    if (!activeEvent || activeEvent.status !== 'active') return;

    set(state => ({
      activeEvent: { ...state.activeEvent, status: 'expired' },
      eventBannerVisible: true
    }));

    setTimeout(() => {
      set({ eventBannerVisible: false, activeEvent: null });
    }, 3500);
  },

  dismissEventBanner: () => {
    set({ eventBannerVisible: false });
  },

  // --- ACTIONS: ACHIEVEMENTS & STATS ---
  incrementChatCount: (npcId) => {
    set(state => {
      const nextChats = (state.stats.totalChats || 0) + 1;
      const newStats = { ...state.stats, totalChats: nextChats };
      const updated = { ...state, stats: newStats };
      savePersistedState(updated);
      return { stats: newStats };
    });

    get().addPlayerAffinity(npcId, 3);
    const chats = get().stats.totalChats;
    get().updateAchievementProgress('first_chat', chats);
    get().updateAchievementProgress('chat_100', chats);
  },

  updateAchievementProgress: (achievementId, value) => {
    set(state => {
      let newlyUnlocked = null;
      const nextAchievements = state.achievements.map(ach => {
        if (ach.id !== achievementId || ach.unlocked) return ach;
        const newProgress = Math.min(ach.target, typeof value === 'number' ? value : ach.progress + 1);
        const willUnlock = newProgress >= ach.target;
        if (willUnlock) {
          newlyUnlocked = { ...ach, progress: newProgress, unlocked: true, unlockedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) };
          return newlyUnlocked;
        }
        return { ...ach, progress: newProgress };
      });

      // Hitung total unlocked untuk meta-achievement "company_legend"
      const totalUnlocked = nextAchievements.filter(a => a.unlocked && a.id !== 'company_legend').length;
      let finalAchievements = nextAchievements;

      const meta = nextAchievements.find(a => a.id === 'company_legend');
      if (meta && !meta.unlocked && totalUnlocked >= meta.target) {
        finalAchievements = nextAchievements.map(a => 
          a.id === 'company_legend' 
            ? { ...a, progress: meta.target, unlocked: true, unlockedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }
            : a
        );
        newlyUnlocked = finalAchievements.find(a => a.id === 'company_legend');
      }

      const updated = {
        achievements: finalAchievements,
        unlockedToast: newlyUnlocked || state.unlockedToast
      };
      savePersistedState({ ...state, achievements: finalAchievements });
      return updated;
    });
  },

  dismissToast: () => set({ unlockedToast: null })
}));

export default useInteractionStore;
