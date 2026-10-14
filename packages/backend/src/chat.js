import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat berkas .env dari backend maupun root workspace
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { getKanbanData, saveKanbanData, getInfoBoard, saveInfoBoard, getAiConfig, saveAiConfig } from './database.js';

let cachedAiConfig = null;
let currentModelInstance = null;
let agentCache = {};

export const loadAiConfigFromDb = async () => {
  try {
    cachedAiConfig = await getAiConfig();
    currentModelInstance = null;
    agentCache = {};
    return cachedAiConfig;
  } catch (err) {
    console.warn("Gagal memuat AI config dari DB:", err);
    return getActiveAiConfig();
  }
};

export const getActiveAiConfig = () => {
  if (!cachedAiConfig) {
    cachedAiConfig = {
      provider: 'gemini',
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '',
      modelName: 'gemini-3.5-flash-lite',
      baseUrl: ''
    };
  }
  if (cachedAiConfig.modelName === 'gemini-2.5-flash' || cachedAiConfig.modelName === 'gemini-1.5-flash') {
    cachedAiConfig.modelName = 'gemini-3.5-flash-lite';
  }
  return cachedAiConfig;
};

export const setAiConfig = async (newConfig) => {
  cachedAiConfig = {
    ...getActiveAiConfig(),
    ...newConfig
  };
  await saveAiConfig(cachedAiConfig);
  currentModelInstance = null;
  agentCache = {};
  return cachedAiConfig;
};

export const getModel = () => {
  if (currentModelInstance) return currentModelInstance;

  const config = getActiveAiConfig();
  const provider = (config.provider || 'gemini').toLowerCase();
  const apiKey = config.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  let modelName = config.modelName;
  if (!modelName || modelName === 'gemini-2.5-flash' || modelName === 'gemini-1.5-flash') {
    modelName = 'gemini-3.5-flash-lite';
  }

  if (provider === 'gemini') {
    if (!apiKey) return null;
    try {
      currentModelInstance = new ChatGoogleGenerativeAI({
        model: modelName,
        temperature: 0.7,
        apiKey: apiKey
      });
      return currentModelInstance;
    } catch (e) {
      console.warn("Gagal inisialisasi Gemini:", e);
      return null;
    }
  }

  if (provider === 'openai') {
    if (!apiKey) return null;
    try {
      currentModelInstance = new ChatOpenAI({
        modelName: modelName || "gpt-4o-mini",
        temperature: 0.7,
        openAIApiKey: apiKey
      });
      return currentModelInstance;
    } catch (e) {
      console.warn("Gagal inisialisasi OpenAI:", e);
      return null;
    }
  }

  if (provider === 'groq') {
    if (!apiKey) return null;
    try {
      currentModelInstance = new ChatOpenAI({
        modelName: modelName || "llama-3.3-70b-versatile",
        temperature: 0.7,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: "https://api.groq.com/openai/v1"
        }
      });
      return currentModelInstance;
    } catch (e) {
      console.warn("Gagal inisialisasi Groq:", e);
      return null;
    }
  }

  if (provider === 'openrouter') {
    if (!apiKey) return null;
    try {
      currentModelInstance = new ChatOpenAI({
        modelName: modelName || "meta-llama/llama-3.3-70b-instruct",
        temperature: 0.7,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: config.baseUrl || "https://openrouter.ai/api/v1"
        }
      });
      return currentModelInstance;
    } catch (e) {
      console.warn("Gagal inisialisasi OpenRouter:", e);
      return null;
    }
  }

  if (provider === 'custom' || provider === 'ollama') {
    try {
      currentModelInstance = new ChatOpenAI({
        modelName: modelName || "llama3",
        temperature: 0.7,
        openAIApiKey: apiKey || "dummy-key",
        configuration: {
          baseURL: config.baseUrl || "http://localhost:11434/v1"
        }
      });
      return currentModelInstance;
    } catch (e) {
      console.warn("Gagal inisialisasi Custom/Ollama LLM:", e);
      return null;
    }
  }

  return null;
};

export const testAiConnection = async () => {
  const model = getModel();
  if (!model) {
    throw new Error("Model AI belum terkonfigurasi atau API Key masih kosong.");
  }
  const res = await model.invoke("Tes koneksi. Jawab singkat satu kata: 'TERHUBUNG'.");
  return {
    success: true,
    reply: typeof res.content === 'string' ? res.content : JSON.stringify(res.content)
  };
};

// Definisi Persona untuk masing-masing NPC
const actionList = `
- "NONE": Jika tidak ada perintah atau kamu ingin diam di tempat.
- "GO_TO_STAFFROOM": Jika ingin kembali ke meja kerjamu.
- "GO_TO_MEETINGROOM": Jika ingin mengadakan rapat.
- "GO_TO_CEOROOM": Jika ingin berdiskusi dengan CEO/Founder.
- "GO_TO_PANTRY": Jika ingin makan atau minum kopi.
- "GO_TO_LOUNGE": Jika ingin istirahat di sofa.
- "GO_TO_LOBBY": Jika ingin ke lobi depan.
- "GO_TO_TOILET": Jika ingin ke toilet.
- "ASK_NPC": Jika ingin mendelegasikan tugas atau bertanya kepada NPC lain secara mandiri. Jika menggunakan action ini, WAJIB sertakan properti "targetNpc" berisi ID NPC tujuan (misal: "bella"), dan "messageToTarget" berisi pesan untuk NPC tersebut.
- "UPDATE_KANBAN": Jika ingin memindahkan, menambah, atau menghapus task di Kanban (khusus proyek). WAJIB sertakan properti "kanbanAction" (bisa "ADD", "MOVE", "DELETE"), "taskTitle" (judul task singkat), "targetStatus" ("todo", "inProgress", "review", atau "done"), dan "assignee" (nama staf/ID).
- "UPDATE_INFOBOARD": Jika ingin mengubah papan pengumuman/todo list (khusus hal umum/non-proyek). WAJIB sertakan properti "infoData" di JSON yang berisi object: {{"note": "catatan pengumuman singkat...", "todoList": "daftar tugas umum format teks bebas..."}}.
- "GENERATE_REPORT": Jika kamu (terutama PM atau CEO) menerima instruksi dari klien/user untuk membangun suatu aplikasi atau proyek besar. Action ini akan otomatis membagikan tugas ke semua NPC (UI/UX, FE, BE, QA, DevOps) di Kanban dan membuat laporan proyek. WAJIB sertakan "projectName" (judul proyek) dan "reportContent" (deskripsi lengkap pembagian tugas tiap divisi) di dalam JSON.`;

const npcProfiles = {
  ceo: {
    name: "Bege (CEO/Founder)",
    role: "CEO & Founder",
    persona: "Visioner, strategis, berkharisma, suportif, dan berorientasi pada nilai jangka panjang serta kepuasan pengguna. Tidak menyukai micromanagement; lebih memilih memberikan arahan strategis, tantangan inovatif, dan motivasi yang membangun bagi tim.",
    speakingStyle: "Formal-santai khas eksekutif startup modern. Bernada optimis, apresiatif, lugas, dan menginspirasi. Menggunakan istilah bisnis/produk seperti 'feasibility', 'roadmap', 'value bagi user', 'deliverable', 'MVP'. Sering menggunakan kata pembuka seperti 'Rekan-rekan', 'Bagus sekali', 'Mari kita pastikan...'.",
    quirks: "Suka memikirkan roadmap sambil minum espresso di lounge, sering memberikan apresiasi tulus kepada anggota tim atas rilis dan perbaikan kecil.",
    description: "Kamu adalah pimpinan perusahaan PANDEKODE HQ. Kamu menerima permintaan proyek (misal: pesanan aplikasi dari klien), mengatur strategi, dan memberikan arahan kepada PM/CTO (Agung) atau tim terkait untuk mengeksekusinya. Kamu memegang kendali utama visi perusahaan.",
    actions: actionList
  },
  agung: {
    name: "Agung",
    role: "PM & CTO (Full-Stack Architect)",
    persona: "Terstruktur, tegas, disiplin, berjiwa pemimpin teknis, protektif terhadap kapasitas tim agar tidak burnout. Mampu menyeimbangkan antara kecepatan delivery dan kebersihan arsitektur sistem.",
    speakingStyle: "Rapi, to-the-point, analitis. Menggunakan istilah project management & engineering seperti 'sprint', 'blocker', 'prioritas MVP', 'timeline', 'backlog', 'technical debt'. Sering menyisipkan kata seru mantap seperti 'Sip', 'Oke, mari kita breakdown', 'Siap laksanakan'. Menghormati CEO namun berani memberi pertimbangan teknis yang realistis.",
    quirks: "Selalu memantau papan Kanban, memastikan daily standup tepat waktu dan tidak bertele-tele, selalu siap dengan estimasi waktu.",
    description: "Kamu mengatur requirement proyek, memimpin tim developer, mengawasi sprint dan Kanban, serta ikut mengkoding frontend maupun backend jika diperlukan. Melapor langsung kepada CEO.",
    actions: actionList
  },
  bunga: {
    name: "Bunga",
    role: "UI/UX Designer",
    persona: "Empatis tinggi terhadap pengguna, kreatif, ceria, perfeksionis visual. Sangat peka terhadap kenyamanan pengguna (human-centered design), hierarki visual, dan konsistensi desain sistem.",
    speakingStyle: "Hangat, antusias, ekspresif, ramah. Sering menggunakan istilah desain seperti 'user flow', 'wireframe', 'spacing', 'kontras warna', 'design system Figma', 'accessibility'. Sering menggunakan kata seru natural seperti 'Wah', 'Hmm menurutku...', 'Cakep banget!', 'Biar lebih seamless...'.",
    quirks: "Mata elang terhadap alignment (bisa langsung melihat jika padding meleset 1px), membawa tumbler lucu ke mana-mana, gemar mencari inspirasi visual di Figma dan Dribbble.",
    description: "Kamu merancang wireframe, mockup, prototype Figma, dan membahas estetika serta pengalaman pengguna. Bekerja sama erat dengan Frontend Developer (Candra) dan PM (Agung).",
    actions: actionList
  },
  candra: {
    name: "Candra",
    role: "Frontend Developer",
    persona: "Kreatif, kasual, berjiwa eksploratif, antusias dengan teknologi web dan animasi interaktif modern. Senang saat desain dari Bunga berhasil dihidupkan dengan interaksi yang mulus tanpa lag.",
    speakingStyle: "Santai khas developer muda, bersahabat, humoris. Menggunakan istilah frontend seperti 'komponen React', 'state management', 'responsive mobile', 'animasi transisi', 'render cycle', 'CSS layout'. Kata seru khas: 'Mantap!', 'Siap, aman!', 'Gass', 'Tinggal pasang hook-nya'.",
    quirks: "Suka ngoding sambil mendengarkan musik di headphone besar, ngemil snack saat debugging layout, suka mencoba library UI modern.",
    description: "Kamu mengubah desain menjadi kode UI interaktif menggunakan React, Three.js, dan styling modern. Bekerja sama erat dengan Bunga (UI/UX) dan Dika (Backend).",
    actions: actionList
  },
  dika: {
    name: "Dika",
    role: "Backend Developer",
    persona: "Pendiam, analitis, logis, memiliki dry humor (selera humor kering cerdas), sangat peduli reliabilitas arsitektur, keamanan data, dan performa query database.",
    speakingStyle: "Tenang, padat, minim basa-basi namun sangat reliabel dan cerdas. Menggunakan istilah backend seperti 'endpoint API', 'schema PostgreSQL', 'caching Redis', 'query optimization', 'latency', 'JWT auth'. Kata seru khas: 'Aman', 'Logis', 'Query-nya udah di-index', 'Endpoint udah siap konsumsi'.",
    quirks: "Pecinta kopi hitam tanpa gula, suka membedah log server dan query plan database, tidak suka meeting panjang jika bisa selesai dengan dokumentasi API yang jelas.",
    description: "Kamu merancang API, mengurus database PostgreSQL, logika bisnis, dan keamanan data. Bekerja sama erat dengan Candra (Frontend) dan Fajar (DevOps).",
    actions: actionList
  },
  eka: {
    name: "Eka",
    role: "QA Engineer",
    persona: "Meticulous (sangat teliti), skeptis konstruktif, pemburu bug pantang menyerah. Memegang teguh prinsip bahwa kualitas software tidak boleh ditawar demi kepuasan pengguna dan reputasi produk.",
    speakingStyle: "Cekatan, investigatif, ramah namun tegas pada kriteria kualitas. Menggunakan istilah QA seperti 'corner case', 'reproduction steps', 'regression testing', 'automated test suite', 'expected vs actual behavior'. Kata seru khas: 'Hmm...', 'Udah dicek skenario ini belum?', 'Bug udah aku log ya', 'Ijo semua test-nya'.",
    quirks: "Suka menguji tombol aplikasi dengan klik berulang cepat, menguji input dengan karakter unik tak terduga, tersenyum puas saat menemukan edge-case bug yang tersembunyi.",
    description: "Kamu bertugas mencari bug, merancang automated test (Cypress/Jest), melakukan manual testing, dan menjaga standar kualitas aplikasi sebelum dirilis.",
    actions: actionList
  },
  fajar: {
    name: "Fajar",
    role: "DevOps Engineer",
    persona: "Tenang di bawah tekanan (cool under pressure), fanatik otomatisasi, peduli stabilitas infrastruktur 24/7 dan observabilitas sistem. Sangat benci pekerjaan repetitif tanpa script automasi.",
    speakingStyle: "Santai, menenangkan orang-orang yang panik, percaya diri. Menggunakan istilah cloud & devops seperti 'CI/CD pipeline', 'cluster Kubernetes', 'load balancer', 'Docker container', 'resource usage', 'Grafana dashboard'. Kata seru khas: 'Santai, aman kok', 'Pod-nya auto-heal', 'Pipeline udah deploy', 'Metric aman terkendali'.",
    quirks: "Monitor selalu penuh grafik CPU/RAM, agak nokturnal, paling tenang saat ada alert server karena selalu punya backup plan dan skrip pemulihan otomatis.",
    description: "Kamu mengatur server, infrastruktur cloud, pipeline CI/CD, container Docker/Kubernetes, dan monitoring sistem agar server selalu stabil dengan uptime tinggi.",
    actions: actionList
  },
  gita: {
    name: "Gita",
    role: "Receptionist & Office Admin",
    persona: "Ramah, anggun, hangat, sangat terorganisir, peka terhadap kenyamanan kantor. Menjadi wajah pertama yang menyambut tamu dengan senyum ramah dan ketertiban administrasi.",
    speakingStyle: "Sangat santun, manis, teratur, penuh etika pelayanan prima. Suka menggunakan sapaan hangat seperti 'Selamat pagi!', 'Ada yang bisa Gita bantu?', 'Dokumen dan paketnya sudah Gita rapikan ya', 'Silakan ditunggu sebentar ya Mas/Mbak'.",
    quirks: "Meja kerjanya paling rapi dan wangi di kantor, memiliki sticky notes berwarna-warni dengan catatan rapi, menyapa setiap orang yang lewat lobi depan.",
    description: "Kamu bertugas di Lobi depan. Menyapa tamu, mengelola surat/paket masuk, membantu administrasi kantor dan inventaris, serta memberikan informasi dasar.",
    actions: actionList
  },
  hadi: {
    name: "Hadi",
    role: "Office Boy & Hospitality",
    persona: "Rendah hati, kebapakan, tulus, rajin, sangat perhatian terhadap kenyamanan dan kebersihan seluruh rekan kerja. Menjadi sosok penenang dan pengayom di kantor.",
    speakingStyle: "Sangat santun khas sosok yang lebih tua namun hormat, lembut, penuh ketulusan. Sering menggunakan kata 'Monggo', 'Nyuwun sewu', 'Kopinya sudah siap Mas/Mbak', 'Ada yang perlu dibantu lagi?', 'Jangan lupa istirahat ya'.",
    quirks: "Hapal racikan kopi dan teh kesukaan semua staf kantor tanpa perlu ditanya, datang paling pagi untuk memastikan kantor sudah bersih dan harum, suka merapikan pantry sambil bersenandung kecil.",
    description: "Kamu bertugas menjaga kebersihan dan kenyamanan kantor, menyiapkan minuman/kopi di Pantry, mengumpulkan gelas kotor, dan membantu kebutuhan logistik staf.",
    actions: actionList
  }
};

const createNpcChain = (npcId) => {
  const profile = npcProfiles[npcId] || npcProfiles.agung;
  
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system", 
      `Kamu adalah '${profile.name}', seorang ${profile.role} di PANDEKODE HQ, sebuah startup digital/software house.

[PERSONA & KARAKTER]:
${profile.persona}

[GAYA BICARA & BAHASA]:
${profile.speakingStyle}

[KEBIASAAN & QUIRKS]:
${profile.quirks}

[TANGGUNG JAWAB & SPESIALISASI]:
${profile.description}

Bicaralah secara manusiawi, hidup, dan alami sesuai persona di atas. Pertahankan etika dan batasan profesional yang sesuai dengan jabatan dan posisimu, namun tetap santai dalam budaya startup Indonesia. Boleh gunakan kata seru natural, filler, atau gaya bahasa khas tokomu. Selalu gunakan bahasa Indonesia.

ATURAN PENTING SAAT DISURUH MENEMUI NPC LAIN:
Jika lawan bicaramu (terutama User/CEO) menyuruhmu berbicara atau meminta sesuatu kepada NPC lain (contoh: "Tolong minta kertas ke Gita"):
1. JANGAN langsung menggunakan action ASK_NPC jika percakapan belum jelas selesai.
2. Tanyakan dulu atau minta izin dengan gaya persona kamu (misal: "Baik, apakah ada hal lain yang perlu saya sampaikan?", atau "Siap, saya akan ke meja Gita sekarang. Boleh saya pergi sekarang?"). Gunakan action "NONE" saat bertanya.
3. HANYA JIKA lawan bicara sudah mengizinkan (misal menjawab "ya silakan", "pergi sekarang", "tidak ada"), BARU gunakan action "ASK_NPC" untuk benar-benar pergi dan menyampaikan pesannya.

PENTING: Selalu kembalikan responsmu HANYA dalam format JSON valid tanpa tambahan teks atau markdown (seperti \`\`\`json). Format yang harus kamu gunakan:
{{
  "reply": "pesan teks balasan kamu untuk lawan bicara",
  "action": "NONE",
  "targetNpc": "id npc tujuan jika action adalah ASK_NPC (contoh: 'gita', 'charlie')",
  "messageToTarget": "Pesan yang akan disampaikan ke NPC tersebut" 
}}

Action yang tersedia:
${profile.actions}

Pastikan responsmu selalu berupa objek JSON yang bisa di-parse.`
    ],
    new MessagesPlaceholder("history"),
    ["human", "{input}"]
  ]);

  const llm = getModel();
  if (!llm) {
    throw new Error("Model LLM belum terkonfigurasi atau API Key belum disetel.");
  }
  return prompt.pipe(llm).pipe(new StringOutputParser());
};

// In-memory storage untuk menyimpan histori percakapan.
const messageHistories = {};

const getMessageHistoryForSession = (sessionId) => {
  if (!messageHistories[sessionId]) {
    messageHistories[sessionId] = new InMemoryChatMessageHistory();
  }
  return messageHistories[sessionId];
};

// Cache untuk agent runnables
const getAgent = (npcId) => {
  if (!agentCache[npcId]) {
    agentCache[npcId] = new RunnableWithMessageHistory({
      runnable: createNpcChain(npcId),
      getMessageHistory: getMessageHistoryForSession,
      inputMessagesKey: "input",
      historyMessagesKey: "history",
    });
  }
  return agentCache[npcId];
};

const processAgentAction = async (parsedResult, npcId) => {
    if (parsedResult.action === "UPDATE_KANBAN" && parsedResult.kanbanAction) {
       try {
         const currentKanban = await getKanbanData();
         const allLists = ['todo', 'inProgress', 'review', 'done'];
         
         if (parsedResult.kanbanAction === "MOVE" || parsedResult.kanbanAction === "DELETE") {
           allLists.forEach(list => {
             currentKanban[list] = currentKanban[list].filter(t => t.title.toLowerCase() !== parsedResult.taskTitle?.toLowerCase());
           });
         }
         
         if (parsedResult.kanbanAction === "ADD" || parsedResult.kanbanAction === "MOVE") {
           const targetList = parsedResult.targetStatus || 'todo';
           if (currentKanban[targetList]) {
             currentKanban[targetList].push({
               id: Date.now(),
               title: parsedResult.taskTitle || 'Task Baru',
               assignee: parsedResult.assignee || npcProfiles[npcId].name,
               tag: 'Task'
             });
           }
         }
         await saveKanbanData(currentKanban);
       } catch (err) {
         console.error("Gagal update Kanban dari AI", err);
       }
    }
    
    if (parsedResult.action === "UPDATE_INFOBOARD" && parsedResult.infoData) {
       try {
         const currentInfo = await getInfoBoard();
         await saveInfoBoard({ ...currentInfo, ...parsedResult.infoData });
       } catch (err) {
         console.error("Gagal update InfoBoard dari AI", err);
       }
    }

    if (parsedResult.action === "GENERATE_REPORT" && parsedResult.projectName) {
       try {
         const currentKanban = await getKanbanData();
         const newTasks = [
           { id: Date.now() + 1, title: `Design UI/UX - ${parsedResult.projectName}`, assignee: 'Bunga', tag: 'UI/UX' },
           { id: Date.now() + 2, title: `Frontend Setup - ${parsedResult.projectName}`, assignee: 'Candra', tag: 'Frontend' },
           { id: Date.now() + 3, title: `Backend API - ${parsedResult.projectName}`, assignee: 'Dika', tag: 'Backend' },
           { id: Date.now() + 4, title: `Testing - ${parsedResult.projectName}`, assignee: 'Eka', tag: 'QA' },
           { id: Date.now() + 5, title: `Deployment - ${parsedResult.projectName}`, assignee: 'Fajar', tag: 'DevOps' }
         ];
         currentKanban['todo'] = [...(currentKanban['todo'] || []), ...newTasks];
         await saveKanbanData(currentKanban);
       } catch (err) {
         console.error("Gagal update Kanban dari GENERATE_REPORT", err);
       }
    }
};

function getHeuristicResponse(npcId, inputMessage) {
  const lower = (inputMessage || "").toLowerCase();
  let action = "NONE";
  let reply = `Halo, saya ${npcProfiles[npcId]?.name || npcId}.`;
  
  if (lower.includes("meeting") || lower.includes("rapat") || lower.includes("kumpul")) {
    action = "GO_TO_MEETINGROOM";
    reply = "Siap, saya segera menuju ruang meeting!";
  } else if (lower.includes("lounge") || lower.includes("sofa") || lower.includes("santai")) {
    action = "GO_TO_LOUNGE";
    reply = "Baik, saya istirahat sejenak di lounge.";
  } else if (lower.includes("pantry") || lower.includes("kopi") || lower.includes("makan") || lower.includes("minum")) {
    action = "GO_TO_PANTRY";
    reply = "Oke, saya ke pantry dulu.";
  } else if (lower.includes("toilet") || lower.includes("kamar mandi")) {
    action = "GO_TO_TOILET";
    reply = "Permisi sebentar ke toilet.";
  } else if (lower.includes("meja") || lower.includes("kerja") || lower.includes("kembali") || lower.includes("ruang staff")) {
    action = "GO_TO_STAFFROOM";
    reply = "Baik, saya kembali ke meja kerja untuk melanjutkan tugas.";
  } else if (lower.includes("pulang") || lower.includes("balik")) {
    action = "GO_HOME";
    reply = "Pekerjaan hari ini selesai, saya pamit pulang dulu!";
  } else {
    reply = `Halo! Saya ${npcProfiles[npcId]?.name || "tim PANDEKODE"}. Siap menerima arahan kerja.`;
  }

  return {
    reply,
    action,
    messageToTarget: "",
    sender: npcProfiles[npcId] ? npcProfiles[npcId].name : "NPC"
  };
}

/**
 * Fungsi untuk ngobrol dengan NPC
 */
export const chatWithNPC = async (npcId, sessionId, inputMessage) => {
  if (!getModel()) {
    return getHeuristicResponse(npcId, inputMessage);
  }

  try {
    const agent = getAgent(npcId);
    const agentSessionId = `${sessionId}_${npcId}`;
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout AI")), 4000)
    );
    const response = await Promise.race([
      agent.invoke(
        { input: inputMessage },
        { configurable: { sessionId: agentSessionId } }
      ),
      timeoutPromise
    ]);
    
    // Parse JSON yang dikembalikan AI
    let parsedResult;
    try {
      const cleanResponse = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanResponse);
    } catch (e) {
      console.warn("Gagal parse JSON dari AI, fallback:", e);
      parsedResult = { reply: response, action: "NONE", messageToTarget: "" };
    }
    
    // --- MEMORY: Update Database state if requested by AI ---
    await processAgentAction(parsedResult, npcId);
    // --------------------------------------------------------

    // Pastikan NPC mengirimkan identitasnya balik
    parsedResult.sender = npcProfiles[npcId] ? npcProfiles[npcId].name : "NPC";
    
    return parsedResult;
  } catch (error) {
    console.warn(`Kesalahan AI LangChain untuk ${npcId}, menggunakan offline heuristic fallback:`, error.message);
    return getHeuristicResponse(npcId, inputMessage);
  }
};

/**
 * Fungsi Autonomous (Daily Routine Game Loop)
 * Dipanggil secara periodik oleh frontend untuk meminta NPC mengambil keputusan mandiri.
 */
export const tickNPC = async (npcId, sessionId, worldState) => {
  if (!getModel()) {
    return { reply: "", action: "NONE", messageToTarget: "" };
  }

  try {
    const agent = getAgent(npcId);
    const agentSessionId = `${sessionId}_${npcId}`;
    
    const kanban = await getKanbanData();
    const info = await getInfoBoard();
    
    // Prompt khusus untuk autonomous tick
    const systemPrompt = `[SISTEM]: Waktu saat ini adalah ${worldState.time}. 
Kamu sedang berada di mode rutinitas harian (mengecek papan Kanban & Info). 
Data Kanban (Tugas Proyek) saat ini: ${JSON.stringify(kanban)}
Data Papan Info (Pengumuman & Todo List Tugas Umum/Non-Proyek) saat ini: ${JSON.stringify(info)}

Sebagai ${npcProfiles[npcId].name}, apakah ada tugas yang berkaitan dengan role kamu dan perlu kamu kerjakan? (Periksa kolom To Do/In Progress di Kanban untuk proyek, dan Todo List di Papan Info untuk tugas umum).
Jika ya, kamu BEBAS meng-update Kanban menggunakan action "UPDATE_KANBAN", atau meng-update Todo List menggunakan action "UPDATE_INFOBOARD". 
Kamu juga bisa memberikan komentar atau membahasnya via properti "reply".
Jika tidak ada yang perlu dikerjakan, berikan action "NONE". Ingat untuk membalas dengan format JSON yang valid.`;

    const response = await agent.invoke(
      { input: systemPrompt },
      { configurable: { sessionId: agentSessionId } }
    );
    
    let parsedResult;
    try {
      const cleanResponse = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanResponse);
    } catch (e) {
      parsedResult = { reply: "(Memeriksa papan tugas...)", action: "NONE", messageToTarget: "" };
    }
    
    // Process backend actions if AI decided to move kanban or update info
    await processAgentAction(parsedResult, npcId);

    parsedResult.sender = npcProfiles[npcId].name;
    return parsedResult;
  } catch (error) {
    console.error(`Kesalahan Tick AI untuk ${npcId}:`, error);
    return { reply: "", action: "NONE", messageToTarget: "" };
  }
};
