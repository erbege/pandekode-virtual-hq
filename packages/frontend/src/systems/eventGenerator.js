/**
 * eventGenerator.js - Pluggable Procedural & Webhook Event Engine for PANDEKODE HQ
 * 
 * Menghasilkan ribuan variasi kejadian kantor & tech startup yang realistis,
 * dirancang dengan skema terpadu (Unified Event Schema) yang siap digantikan
 * atau diperkaya oleh Webhook nyata (GitHub, CI/CD, Sentry, Linear, dsb.) di masa depan.
 */

// Bank Data Arketipe & Slot Kontekstual
export const TECH_COMPONENTS = [
  { name: 'Cluster Kubernetes Prod', role: 'fajar', altRole: 'agung' },
  { name: 'Database PostgreSQL Utama', role: 'dika', altRole: 'agung' },
  { name: 'Cache Layer Redis', role: 'dika', altRole: 'fajar' },
  { name: 'Pipeline CI/CD GitHub Actions', role: 'fajar', altRole: 'eka' },
  { name: 'Bundler Frontend & Asset CDN', role: 'candra', altRole: 'eka' },
  { name: 'Gateway Pembayaran / Stripe API', role: 'dika', altRole: 'gita' },
  { name: 'Service Autentikasi OAuth2', role: 'dika', altRole: 'fajar' },
  { name: 'Automated Test Suite End-to-End', role: 'eka', altRole: 'candra' },
  { name: 'Sertifikat SSL / TLS Domain Utama', role: 'fajar', altRole: 'agung' },
  { name: 'Microservice Notifikasi & Email', role: 'dika', altRole: 'candra' }
];

export const TECH_INCIDENTS = [
  {
    type: 'HIGH_LATENCY',
    severity: 'warning',
    title: 'Latency Spike & Slow Query',
    descTemplate: '{component} mengalami kenaikan response time drastis ke {metric}. Kueri lambat perlu dianalisa.',
    metric: () => `${Math.floor(Math.random() * 800 + 400)}ms`,
    primaryDialogue: 'Response time melonjak tinggi, lagi profiling query bottleneck!',
    secondaryDialogue: 'Kita perlu add index dan scale connection pool segera.'
  },
  {
    type: 'MEMORY_LEAK',
    severity: 'warning',
    title: 'Memory Leak & High RAM Usage',
    descTemplate: 'Pod worker pada {component} menyentuh batas memory limit ({metric}). Risiko OOM kill!',
    metric: () => `${(Math.random() * 1.5 + 85).toFixed(1)}%`,
    primaryDialogue: 'Garbage collector kewalahan, ada unclosed stream di worker.',
    secondaryDialogue: 'Restart rolling update sambil patch memory leak-nya ya.'
  },
  {
    type: 'TEST_FAILURE',
    severity: 'ambient',
    title: 'Test Suite Flaky di Staging',
    descTemplate: 'Beberapa integration test pada {component} intermittent gagal akibat timeout mocking.',
    metric: () => 'Flaky rate 12%',
    primaryDialogue: 'Ada 2 test case flaky yang lolos ke staging, lagi di-mock ulang.',
    secondaryDialogue: 'Bagus segera ketahuan sebelum rilis ke production.'
  },
  {
    type: 'BUILD_SUCCESS',
    severity: 'ambient',
    title: 'Green Pipeline & Fast Deploy',
    descTemplate: 'Optimasi caching Docker layer berhasil memotong waktu build {component} hingga 40%!',
    metric: () => 'Build time 1m 24s',
    primaryDialogue: 'Mantap, build time sekarang cuma semenit lebih sedikit!',
    secondaryDialogue: 'Developer experience kita makin ngebut hari ini.'
  }
];

export const CLIENT_PRODUCTS = [
  { client: 'PT Mega Finansia', project: 'Core Payment Gateway' },
  { client: 'SaaS Edukasi Nusantara', project: 'Learning Management System' },
  { client: 'Logistik Kilat Ekspres', project: 'Fleet Tracking Dashboard' },
  { client: 'Startup MedikaSehat', project: 'Telemedicine Booking App' },
  { client: 'Retail Omnichannel Pro', project: 'Point of Sale & Inventory Sync' }
];

export const CLIENT_STORIES = [
  {
    type: 'SCOPE_CHANGE',
    severity: 'info',
    title: 'Permintaan Penyesuaian Fitur Klien',
    descTemplate: 'Klien dari {client} mengusulkan tambahan flow validasi pada modul {project}.',
    primaryRole: 'agung',
    secondaryRole: 'bunga',
    dialogue1: 'Klien ada ide bagus untuk UX checkout, kita estimasi bobot sprint-nya.',
    dialogue2: 'Siap Mas Agung, aku buatkan wireframe revisinya dalam 15 menit.'
  },
  {
    type: 'POSITIVE_FEEDBACK',
    severity: 'ambient',
    title: 'Apresiasi & Feedback Positif Klien',
    descTemplate: 'Klien {client} mengirimkan ucapan terima kasih atas kestabilan rilis {project} minggu ini.',
    primaryRole: 'gita',
    secondaryRole: 'agung',
    dialogue1: 'Ada email apresiasi masuk dari tim {client}, mereka puas banget!',
    dialogue2: 'Keren! Bukti kerja keras dan standar kualitas kode tim kita.'
  },
  {
    type: 'DEMO_PREP',
    severity: 'info',
    title: 'Persiapan Sprint Review & Demo',
    descTemplate: 'Jadwal sprint demo untuk {client} dijadwalkan besok. Tim menyiapkan environment demo.',
    primaryRole: 'agung',
    secondaryRole: 'candra',
    dialogue1: 'Teman-teman, pastikan data dummy di server demo sudah rapi ya.',
    dialogue2: 'Aman, semua komponen UI sudah teruji responsif di semua resolusi.'
  }
];

export const OFFICE_PANTRY_SNACKS = [
  'Bakpia Kukus Jogja Premium',
  'Pempek Palembang Asli',
  'Kue Lapis Legit Spesial',
  'Martabak Manis Cokelat Keju',
  'Donat Artisan Aneka Rasa',
  'Kripik Pedas Makaroni Daun Jeruk',
  'Pisang Goreng Madu Renyah',
  'Es Kopi Susu Gula Aren Literan'
];

export const OFFICE_AMBIENT_STORIES = [
  {
    type: 'SNACK_SURPRISE',
    severity: 'ambient',
    title: 'Oleh-oleh Lezat di Pantry!',
    descTemplate: 'Ada kiriman {snack} segar diletakkan di meja Pantry untuk dinikmati seluruh tim.',
    speaker1: 'hadi',
    speaker2: 'bunga',
    dialogue1: 'Monggo teman-teman, ada {snack} di pantry, silakan dicicipi.',
    dialogue2: 'Wah mantap banget! Rehat sejenak sambil ngemil enak nih.'
  },
  {
    type: 'AC_FREEZING',
    severity: 'ambient',
    title: 'Suhu Kantor ala Kutub Utara',
    descTemplate: 'AC central di ruang kerja terasa sangat dingin menusuk tulang.',
    speaker1: 'candra',
    speaker2: 'hadi',
    dialogue1: 'Brrr, AC-nya dingin banget kayak di server room!',
    dialogue2: 'Iya Mas Candra, saya bantu naikkan remote suhunya ke 24°C ya.'
  },
  {
    type: 'STRAY_CAT',
    severity: 'ambient',
    title: 'Tamu Kucing Menggemaskan di Teras',
    descTemplate: 'Kucing oranye ramah berteduh santai di teras dekat carport kantor.',
    speaker1: 'gita',
    speaker2: 'bunga',
    dialogue1: 'Lucu banget kucing oren di teras luar, lagi tidur pules.',
    dialogue2: 'Awww gemes! Nanti pas istirahat aku bawain snack basah ya.'
  },
  {
    type: 'COFFEE_RESTOCKED',
    severity: 'ambient',
    title: 'Biji Kopi Arabika Baru Tiba',
    descTemplate: 'Pak Hadi baru saja mengisi ulang grinder dengan biji kopi single origin segar.',
    speaker1: 'hadi',
    speaker2: 'dika',
    dialogue1: 'Biji kopi baru sudah saya tuang ke mesin ya Mas, aromanya harum sekali.',
    dialogue2: 'Terima kasih banyak Pak Hadi! Pas banget buat nemenin ngoding siang ini.'
  }
];

export const TEAM_PERSONAL_STORIES = [
  {
    type: 'KEYBOARD_FLEX',
    severity: 'ambient',
    title: 'Keyboard Mekanik Baru Candra',
    descTemplate: 'Candra baru merakit keyboard mekanik custom dengan switch tactile yang empuk.',
    speaker1: 'candra',
    speaker2: 'dika',
    dialogue1: 'Dengerin suara switch-nya, thock banget kan? Lubing-nya pas!',
    dialogue2: 'Wah iya halus banget, ngga berisik bikin nyaman se-ruangan.'
  },
  {
    type: 'ERGONOMIC_STRETCH',
    severity: 'ambient',
    title: 'Peregangan Otot Ergonomis 3 Menit',
    descTemplate: 'Tim QA dan Dev saling mengingatkan untuk menegakkan postur dan merilekskan leher.',
    speaker1: 'eka',
    speaker2: 'fajar',
    dialogue1: 'Yuk tarik bahu ke belakang sebentar, jangan bungkuk terus di depan monitor.',
    dialogue2: 'Haha bener Mbak Eka, leher langsung berasa enteng lagi.'
  },
  {
    type: 'HYDRATION_CHECK',
    severity: 'ambient',
    title: 'Pengingat Minum Air Putih',
    descTemplate: 'Peringatan bersahabat untuk menjaga asupan air minum di tengah fokus kerja.',
    speaker1: 'gita',
    speaker2: 'agung',
    dialogue1: 'Jangan lupa isi ulang tumbler ya semua, biar tetap terhidrasi.',
    dialogue2: 'Sip Gita, fokus kode sering bikin lupa minum kalau ngga diingetin.'
  }
];

/**
 * Generator Prosedural Utama: Menghasilkan satu OfficeEvent unik
 * dengan kombinasi acak terbobot dari spektrum tech, client, office, & team.
 */
export function generateProceduralEvent() {
  const categoryRoll = Math.random();
  const timestamp = Date.now();
  const eventId = `evt_proc_${timestamp}_${Math.floor(Math.random() * 1000)}`;

  // 45% Tech, 20% Client, 20% Office/Pantry, 15% Team/Personal
  if (categoryRoll < 0.45) {
    // KATEGORI TECH & INFRA
    const comp = TECH_COMPONENTS[Math.floor(Math.random() * TECH_COMPONENTS.length)];
    const incident = TECH_INCIDENTS[Math.floor(Math.random() * TECH_INCIDENTS.length)];
    const desc = incident.descTemplate
      .replace('{component}', comp.name)
      .replace('{metric}', incident.metric());

    const isCritical = incident.severity === 'warning';

    return {
      id: eventId,
      source: 'procedural',
      category: 'tech',
      severity: incident.severity,
      title: `${incident.severity === 'warning' ? '⚡' : '💻'} ${incident.title}`,
      icon: incident.severity === 'warning' ? '⚡' : '💻',
      theme: incident.severity === 'warning' ? '#f59e0b' : '#38bdf8',
      bgGradient: incident.severity === 'warning' 
        ? 'linear-gradient(135deg, #78350f 0%, #d97706 100%)' 
        : 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)',
      description: desc,
      affectedNpcs: [comp.role, comp.altRole],
      durationSeconds: isCritical ? 50 : 25,
      dialogues: {
        [comp.role]: incident.primaryDialogue,
        [comp.altRole]: incident.secondaryDialogue
      },
      intents: {
        [comp.role]: 'DESK',
        [comp.altRole]: 'DESK'
      },
      options: isCritical ? [
        {
          id: 'quick_resolve',
          label: `🛠️ Analisa & Optimasi ${comp.name}`,
          actionText: `Anda bersama tim berhasil menstabilkan ${comp.name}. Metrik kembali hijau normal!`,
          rewardPoints: 15,
          targetNpc: comp.role
        }
      ] : []
    };

  } else if (categoryRoll < 0.65) {
    // KATEGORI KLIEN & PRODUK
    const client = CLIENT_PRODUCTS[Math.floor(Math.random() * CLIENT_PRODUCTS.length)];
    const story = CLIENT_STORIES[Math.floor(Math.random() * CLIENT_STORIES.length)];
    const desc = story.descTemplate
      .replace('{client}', client.client)
      .replace('{project}', client.project);

    return {
      id: eventId,
      source: 'procedural',
      category: 'client',
      severity: story.severity,
      title: `💼 ${story.title}`,
      icon: '💼',
      theme: '#8b5cf6',
      bgGradient: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)',
      description: desc,
      affectedNpcs: [story.primaryRole, story.secondaryRole],
      durationSeconds: 35,
      dialogues: {
        [story.primaryRole]: story.dialogue1.replace('{client}', client.client),
        [story.secondaryRole]: story.dialogue2.replace('{client}', client.client)
      },
      intents: {
        [story.primaryRole]: 'DESK',
        [story.secondaryRole]: 'DESK'
      },
      options: story.severity !== 'ambient' ? [
        {
          id: 'accept_client_note',
          label: '🤝 Catat & Selaraskan dengan Roadmap',
          actionText: 'Tim mencatat poin klien dan memperbarui dokumentasi proyek.',
          rewardPoints: 12,
          targetNpc: story.primaryRole
        }
      ] : []
    };

  } else if (categoryRoll < 0.85) {
    // KATEGORI PANTRY & KANTOR
    const snack = OFFICE_PANTRY_SNACKS[Math.floor(Math.random() * OFFICE_PANTRY_SNACKS.length)];
    const story = OFFICE_AMBIENT_STORIES[Math.floor(Math.random() * OFFICE_AMBIENT_STORIES.length)];
    const desc = story.descTemplate.replace('{snack}', snack);

    return {
      id: eventId,
      source: 'procedural',
      category: 'office',
      severity: story.severity,
      title: `☕ ${story.title}`,
      icon: '☕',
      theme: '#10b981',
      bgGradient: 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
      description: desc,
      affectedNpcs: [story.speaker1, story.speaker2],
      durationSeconds: 25,
      dialogues: {
        [story.speaker1]: story.dialogue1.replace('{snack}', snack),
        [story.speaker2]: story.dialogue2.replace('{snack}', snack)
      },
      intents: {
        [story.speaker1]: 'GO_TO_PANTRY',
        [story.speaker2]: 'DESK'
      },
      options: []
    };

  } else {
    // KATEGORI PERSONAL & BUDAYA TIM
    const story = TEAM_PERSONAL_STORIES[Math.floor(Math.random() * TEAM_PERSONAL_STORIES.length)];

    return {
      id: eventId,
      source: 'procedural',
      category: 'team',
      severity: story.severity,
      title: `✨ ${story.title}`,
      icon: '✨',
      theme: '#ec4899',
      bgGradient: 'linear-gradient(135deg, #831843 0%, #ec4899 100%)',
      description: story.descTemplate,
      affectedNpcs: [story.speaker1, story.speaker2],
      durationSeconds: 25,
      dialogues: {
        [story.speaker1]: story.dialogue1,
        [story.speaker2]: story.dialogue2
      },
      intents: {
        [story.speaker1]: 'DESK',
        [story.speaker2]: 'DESK'
      },
      options: []
    };
  }
}

/**
 * Webhook Event Adapter: Mengubah payload webhook eksternal (GitHub, Sentry, dsb.)
 * menjadi format standar OfficeEvent yang siap dijalankan oleh game engine.
 */
export function createEventFromWebhook(webhookPayload) {
  if (!webhookPayload) return null;

  const {
    source = 'webhook', // 'github' | 'sentry' | 'linear' | 'ci_cd'
    type = 'ALERT',
    title = 'Notifikasi Sistem Eksternal',
    message = '',
    metadata = {}
  } = webhookPayload;

  const eventId = `evt_hook_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Default pemetaan webhook GitHub
  if (source === 'github') {
    const isBuildFailed = type.includes('workflow_run.failed') || type.includes('failure');
    return {
      id: eventId,
      source: 'github',
      category: 'tech',
      severity: isBuildFailed ? 'warning' : 'info',
      title: isBuildFailed ? '🚨 GitHub Actions Build Failed' : '🚀 GitHub Deployment Succeeded',
      icon: isBuildFailed ? '🚨' : '🚀',
      theme: isBuildFailed ? '#ef4444' : '#10b981',
      bgGradient: isBuildFailed 
        ? 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)' 
        : 'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
      description: message || (isBuildFailed 
        ? `Workflow pada branch ${metadata.branch || 'main'} gagal dieksekusi.` 
        : `Branch ${metadata.branch || 'main'} berhasil di-deploy ke production.`),
      affectedNpcs: ['fajar', 'eka'],
      durationSeconds: 45,
      dialogues: {
        fajar: isBuildFailed ? 'Pipeline GitHub merah, saya cek runner log-nya dulu.' : 'Deploy pipeline hijau semua, sukses!',
        eka: isBuildFailed ? 'Periksa status test assertion yang gagal ya Fajar.' : 'Sip, mari verifikasi smoke test di production.'
      },
      metadata,
      options: isBuildFailed ? [
        {
          id: 'rerun_ci',
          label: '🔄 Re-run Workflow Runner',
          actionText: 'Workflow di-trigger ulang dan sedang berjalan di cloud runner.',
          rewardPoints: 15,
          targetNpc: 'fajar'
        }
      ] : []
    };
  }

  // Default pemetaan webhook Sentry / Error Monitoring
  if (source === 'sentry') {
    return {
      id: eventId,
      source: 'sentry',
      category: 'tech',
      severity: 'warning',
      title: '⚠️ Sentry: Unhandled Exception Spike',
      icon: '⚠️',
      theme: '#f97316',
      bgGradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
      description: message || 'Terdeteksi lonjakan error baru pada API gateway backend.',
      affectedNpcs: ['dika', 'agung'],
      durationSeconds: 45,
      dialogues: {
        dika: 'Sentry nangkep unhandled promise rejection di auth controller.',
        agung: 'Dika, langsung pasang hotfix try-catch dan logging trace-nya ya.'
      },
      metadata,
      options: [
        {
          id: 'resolve_sentry_issue',
          label: '🛠️ Tandai Resolved & Push Hotfix',
          actionText: 'Hotfix telah di-merge, issue Sentry ditandai terselesaikan.',
          rewardPoints: 20,
          targetNpc: 'dika'
        }
      ]
    };
  }

  // Fallback Webhook Generic
  return {
    id: eventId,
    source,
    category: 'tech',
    severity: webhookPayload.severity || 'info',
    title: `📡 ${title}`,
    icon: '📡',
    theme: '#6366f1',
    bgGradient: 'linear-gradient(135deg, #312e81 0%, #6366f1 100%)',
    description: message,
    affectedNpcs: ['agung', 'gita'],
    durationSeconds: 30,
    dialogues: {
      agung: 'Ada update masuk dari integrasi eksternal tim.',
      gita: 'Sudah saya catat di log operasional ya Pak.'
    },
    metadata,
    options: []
  };
}
