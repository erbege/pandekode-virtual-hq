import React, { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Environment, Stars, useTexture } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { OfficeEnvironment, playScreenSound } from './OfficeEnvironment';
import { getPath } from './pathfinder';

import { keys } from './systems/keyboard';
import { initialNPCs, generateAllOffsets, setupInitialNPCs } from './data/npcProfiles';
import { getSlotPosition, getHadiRoutePosition, HOME_POSITION } from './data/officeLayout';
import GenericNPC from './components/game/GenericNPC';
import CameraResetter from './components/game/CameraResetter';
import ChatBox from './components/ui/ChatBox';
import SettingsBox from './components/ui/SettingsBox';
import LandingPage from './components/ui/LandingPage';
import PostProcessingEffects from './components/game/PostProcessingEffects';
import usePlayerStore from './stores/usePlayerStore';

import LoadingScreen from './components/ui/LoadingScreen';
import useInteractionStore, { RANDOM_EVENTS } from './stores/useInteractionStore';
import EventBanner from './components/ui/EventBanner';
import AchievementToast from './components/ui/AchievementToast';

const KanbanModal = React.lazy(() => import('./components/ui/KanbanModal'));
const InfoModal = React.lazy(() => import('./components/ui/InfoModal'));
const ProfileModal = React.lazy(() => import('./components/ui/ProfileModal'));
const ReportModal = React.lazy(() => import('./components/ui/ReportModal'));
const AchievementModal = React.lazy(() => import('./components/ui/AchievementModal'));
const AffinityModal = React.lazy(() => import('./components/ui/AffinityModal'));
import { getLightingForGameTime, initRectAreaLights } from './systems/lightingSystem';

initRectAreaLights();

// Preload Rapier 3D Physics WASM sedini mungkin di background agar instan saat user klik start
if (typeof window !== 'undefined') {
  import('@dimforge/rapier3d-compat')
    .then((r) => {
      if (r && typeof r.init === 'function') {
        r.init().catch(() => {});
      }
    })
    .catch(() => {});
}

// Preload tekstur lantai kantor agar tidak blocking saat render pertama
useTexture.preload([
  './assets/parquet/textures/rectangular_parquet_diff_1k.jpg',
  './assets/parquet/textures/rectangular_parquet_nor_gl_1k.png',
  './assets/parquet/textures/rectangular_parquet_ao_1k.jpg',
]);

// Komponen Hamparan Rumput Alam Luas & Fondasi Kantor (Solid Material & Performa Tinggi)
const GroundTerrain = React.memo(({ grassColor, pavingColor, isNight }) => (
  <group>
    {/* Permukaan Rumput Alam Luas (800x800) membentang hingga cakrawala (Warna adaptif mengikuti jam game) */}
    <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[800, 800]} />
      <meshStandardMaterial color={grassColor || "#355e2b"} roughness={0.9} metalness={0.05} />
    </mesh>

    {/* Area Paving / Plaza Beton Fondasi di Sekeliling Gedung Kantor */}
    <mesh position={[0, 0.005, -1.5]} receiveShadow>
      <boxGeometry args={[42, 0.01, 32]} />
      <meshStandardMaterial color={pavingColor || "#94a3b8"} roughness={0.7} />
    </mesh>

    {/* Akses Jalan Aspal / Driveway ke Carport & Parkiran */}
    <mesh position={[-7, 0.008, 22]} receiveShadow>
      <boxGeometry args={[16, 0.01, 18]} />
      <meshStandardMaterial color={isNight ? "#1e293b" : "#475569"} roughness={0.8} />
    </mesh>
  </group>
));

// Komponen Langit & Atmosfer Dinamis (Siang: HDR Kloofendal, Malam: Langit Malam Pekat + Taburan Bintang)
const DynamicSky = React.memo(({ lighting }) => {
  const { scene } = useThree();

  useEffect(() => {
    if (lighting.isNight) {
      scene.background = new THREE.Color(lighting.skyColor || '#030712');
      scene.environment = null;
    }
  }, [lighting.isNight, lighting.skyColor, scene]);

  return (
    <>
      <fog attach="fog" args={[lighting.fogColor || '#030712', lighting.fogNear || 150, lighting.fogFar || 600]} />

      {lighting.isNight ? (
        <>
          <color attach="background" args={[lighting.skyColor || '#030712']} />
          <Stars radius={150} depth={60} count={3500} factor={5} saturation={0} fade speed={1.5} />
        </>
      ) : (
        <Suspense fallback={null}>
          <Environment 
            files="./assets/sky/kloofendal_48d_partly_cloudy_puresky_1k.hdr" 
            background={true} 
            environmentIntensity={lighting.envIntensity !== undefined ? lighting.envIntensity : 0.3}
          />
        </Suspense>
      )}
    </>
  );
});

// Komponen pelacak kesiapan frame render Three.js pertama
const SceneReadyTracker = ({ onReady }) => {
  const readyRef = useRef(false);
  useFrame(({ gl }) => {
    if (!readyRef.current && gl) {
      readyRef.current = true;
      onReady();
    }
  });
  return null;
};

const MainGame = ({ savedState, timeMode, setTimeMode, startTime, setStartTime, endTime, setEndTime, workingHoursEnabled, setWorkingHoursEnabled, postFxSettings, setPostFxSettings, onQuit }) => {
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [npcState, setNpcState] = useState(() => {
    const defaultState = setupInitialNPCs();
    if (savedState && savedState.npcState) {
      const merged = { ...defaultState };
      Object.keys(savedState.npcState).forEach(k => {
        if (merged[k]) {
          merged[k] = { ...merged[k], ...savedState.npcState[k] };
        }
      });
      // Khusus untuk CEO yang baru ditambahkan, pastikan dia visible saat jam kerja
      if (!savedState.npcState.ceo) {
        merged.ceo.visible = true; // Langsung muncul
      }
      return defaultState; // Bypass savedState sementara untuk mereset posisi
    }
    return defaultState;
  });
  const controlledNpcId = usePlayerStore((s) => s.controlledNpcId);
  const setControlledNpcId = usePlayerStore((s) => s.setControlledNpcId);
  const cameraMode = usePlayerStore((s) => s.cameraMode);
  const setCameraMode = usePlayerStore((s) => s.setCameraMode);
  const isCameraLocked = usePlayerStore((s) => s.isCameraLocked);
  const setIsCameraLocked = usePlayerStore((s) => s.setIsCameraLocked);

  useEffect(() => {
    if (savedState?.cameraMode !== undefined) {
      usePlayerStore.getState().setCameraMode(savedState.cameraMode);
    }
  }, [savedState?.cameraMode]);

  const [isKanbanOpen, setIsKanbanOpen] = useState(false);
  const [selectedInfoBoard, setSelectedInfoBoard] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(savedState?.isPlayerVisible || false);
  const [isPlayerGoingHome, setIsPlayerGoingHome] = useState(savedState?.isPlayerGoingHome || false);
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [showGoHomeConfirm, setShowGoHomeConfirm] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isCeoEnteringOffice, setIsCeoEnteringOffice] = useState(false);
  const [ceoOverridesWorkingHours, setCeoOverridesWorkingHours] = useState(false);
  
  const [playerEndTime, setPlayerEndTime] = useState(savedState?.playerEndTime !== undefined ? savedState.playerEndTime : 17 * 60);
  
  const defaultGameTime = (startTime > 1.5 ? startTime - 1.5 : 0) * 60;
  const [gameTime, setGameTime] = useState(600); // Setel ke jam 10 pagi agar NPC sudah bekerja
  const [gameDay, setGameDay] = useState(savedState?.gameDay !== undefined ? savedState.gameDay : 1); 
  
  // Perhitungan pencahayaan realistis dinamis tersinkronisasi waktu kantor
  const lighting = useMemo(() => getLightingForGameTime(gameTime), [gameTime]);

  const lastProcessedKey = useRef(null);
  const latestPositionsRef = useRef({ player: savedState?.playerPos || [11, 2, 11] });
  const [playerPos] = useState(savedState?.playerPos || [11, 2, 11]);

  const [projectReport, setProjectReport] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('pandekode_latest_project_report');
      if (saved) return JSON.parse(saved);
      return {
        title: "Blueprint Arsitektur PANDEKODE HQ",
        content: `STATUS PROYEK: INITIAL ARCHITECTURE ACTIVE\n\n1. Ringkasan Eksekutif:\nPandekode HQ beroperasi sebagai kantor startup virtual 3D untuk agensi pengembangan AI cerdas terdesentralisasi.\n\n2. Tim Inti & Agen:\n- Agung: CTO & Lead System Architect\n- Dika: Senior Backend Engineer\n- Candra: Frontend & UI/UX Developer\n- Eka: QA & Reliability Tester\n- Fajar: DevOps & Site Reliability\n- Bunga: Product Designer & Visuals\n- Gita: Product Manager & Receptionist\n- Hadi: Office & Operations Support\n\n3. Sistem Utama yang Aktif:\n- Papan Kanban Interaktif tersinkronisasi database\n- Dinamika Mood & Beban Kerja Tim\n- Sinergi & Afinitas Relasi Antar-Agen\n- Pencahayaan Dinamis 24 Jam dengan Siklus Waktu Kantor\n- Event Engine Terpadu yang siap terhubung ke Webhook GitHub/Sentry`
      };
    } catch (e) {
      return null;
    }
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isControlHudCollapsed, setIsControlHudCollapsed] = useState(false);

  // State untuk Modal & Menu Interaksi (Mood, Sinergi, Achievement)
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showAffinityModal, setShowAffinityModal] = useState(false);

  const setStoreKanban = useInteractionStore(state => state.setKanbanData);
  const checkBackgroundEvent = useInteractionStore(state => state.checkAndTriggerBackgroundEvent);
  const activeEvent = useInteractionStore(state => state.activeEvent);
  const achievements = useInteractionStore(state => state.achievements);
  const unlockedBadgesCount = useMemo(() => achievements.filter(a => a.unlocked).length, [achievements]);

  // Penjadwal event latar belakang otomatis: Sangat jarang (35-50 menit interval) untuk menjaga kondusifitas kerja AI agent
  useEffect(() => {
    const bgEventInterval = setInterval(() => {
      checkBackgroundEvent();
    }, 60000);
    return () => clearInterval(bgEventInterval);
  }, [checkBackgroundEvent]);

  // Muat data Kanban awal untuk inisialisasi Mood System seluruh staf
  useEffect(() => {
    fetch('http://localhost:3000/api/kanban')
      .then(res => res.json())
      .then(data => {
        if (data) setStoreKanban(data);
      })
      .catch(err => console.error("Gagal sinkron kanban awal:", err));
  }, [setStoreKanban]);

  // Otomatis lipat HUD kontrol karakter jika chat box dibuka agar tidak menumpuk / menghalangi
  useEffect(() => {
    if (isChatOpen) {
      setIsControlHudCollapsed(true);
    }
  }, [isChatOpen]);


  // State layar laptop & monitor di setiap meja kerja NPC (true = menyala, false = mati)
  const isInitialWorkHours = useMemo(() => {
    const isWk = workingHoursEnabled && (gameDay === 0 || gameDay === 6);
    return !isWk && gameTime >= startTime * 60 && gameTime < endTime * 60;
  }, [workingHoursEnabled, gameDay, gameTime, startTime, endTime]);

  // Otomatisasi lampu luar kantor (memoized boolean agar OfficeEnvironment terisolasi dari re-render tiap detik)
  const isOutdoorLightsOn = useMemo(() => {
    const startMins = startTime * 60;
    const endMins = endTime * 60;
    return gameTime >= endMins || gameTime < startMins;
  }, [gameTime, startTime, endTime]);

  const [deskScreens, setDeskScreens] = useState(() => ({
    agung: true,
    bunga: true,
    candra: true,
    dika: true,
    eka: true,
    fajar: true,
    ceo: true,
    gita: true,
  }));

  // State televisi di kantor (Meeting Room, CEO Room, Lobby) — dikontrol oleh Hadi (OB)
  const [tvScreens, setTvScreens] = useState(() => ({
    meeting: true,
    ceo: true,
    lobby: true,
  }));

  // Handler interaktif klik layar laptop/monitor meja (memoized)
  const toggleDeskScreen = useCallback((npcId) => {
    setDeskScreens(prev => {
      const next = !prev[npcId];
      playScreenSound(next);
      return { ...prev, [npcId]: next };
    });
  }, []);

  // Handler interaktif klik televisi (memoized)
  const toggleTvScreen = useCallback((tvKey) => {
    setTvScreens(prev => {
      const next = !prev[tvKey];
      playScreenSound(next);
      return { ...prev, [tvKey]: next };
    });
  }, []);

  // State kulkas pantry dan mesin kopi
  const [fridgeOpen, setFridgeOpen] = useState(false);
  const [coffeeBrewing, setCoffeeBrewing] = useState(false);
  const [drinksPreparedByHadi, setDrinksPreparedByHadi] = useState(false);

  const triggerOpenFridge = useCallback((durationMs = 4000) => {
    setFridgeOpen(true);
    setTimeout(() => {
      setFridgeOpen(false);
    }, durationMs);
  }, []);

  const triggerBrewCoffee = useCallback((durationMs = 4500) => {
    setCoffeeBrewing(true);
    setTimeout(() => {
      setCoffeeBrewing(false);
    }, durationMs);
  }, []);

  // Modal open handlers (memoized agar OfficeEnvironment tidak re-render)
  const handleOpenKanban = useCallback(() => setIsKanbanOpen(true), []);
  const handleOpenInfoBoard = useCallback((info) => setSelectedInfoBoard(info), []);
  const handleSelectProfile = useCallback((id) => setSelectedProfileId(id), []);

  // Filter khusus visibilitas kendaraan (mengisolasi OfficeEnvironment dari pergerakan & chat NPC)
  const vehicleVisibility = useMemo(() => ({
    bunga: !!npcState?.bunga?.visible,
    candra: !!npcState?.candra?.visible,
    fajar: !!npcState?.fajar?.visible,
  }), [npcState?.bunga?.visible, npcState?.candra?.visible, npcState?.fajar?.visible]);

  const handleReportGenerated = (data) => {
    // Simulasi delegasi dan pengerjaan tim selama 5 detik sebelum memunculkan file
    setTimeout(() => {
      const newReport = {
        title: data.projectName || "Laporan Proyek",
        content: data.reportContent || "Detail laporan pengerjaan fitur."
      };
      setProjectReport(newReport);
      try {
        localStorage.setItem('pandekode_latest_project_report', JSON.stringify(newReport));
      } catch (e) {}
      setShowReportModal(true);
    }, 5000);
  };

  const handleQuit = async () => {
    const currentState = {
      npcState,
      playerPos: latestPositionsRef.current.player,
      timeMode,
      workingHoursEnabled,
      startTime,
      endTime,
      cameraMode,
      isPlayerVisible,
      isPlayerGoingHome
    };

    // Selalu simpan ke localStorage sebagai cache lokal instan
    try {
      localStorage.setItem('pandekode_saved_game_state', JSON.stringify(currentState));
    } catch (e) {
      console.warn("Gagal simpan ke localStorage:", e);
    }

    try {
      const res = await fetch('http://localhost:3000/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState)
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      if (onQuit) onQuit();
    } catch (err) {
      console.warn("Penyimpanan server gagal, progress tetap aman di cache lokal:", err);
      // Karena sudah tersimpan di localStorage, user tetap dapat keluar dengan aman
      if (onQuit) onQuit();
    }
  };

  // Ganti nama CEO secara dinamis berdasarkan peran pemain saat ini
  useEffect(() => {
    setNpcState(prev => {
      const isCEO = controlledNpcId === 'ceo';
      const expectedName = isCEO ? "Anda (CEO/Founder)" : "Bege (CEO/Founder)";
      const expectedFullName = isCEO ? "Anda" : "Bege";
      if (!prev.ceo || prev.ceo.name === expectedName) return prev;
      return {
        ...prev,
        ceo: {
          ...prev.ceo,
          name: expectedName,
          fullName: expectedFullName
        }
      };
    });
  }, [controlledNpcId]);

  const handleSpeech = useCallback((npcId, text) => {
    setNpcState(prev => ({ ...prev, [npcId]: { ...prev[npcId], speech: text } }));
    setTimeout(() => {
      setNpcState(prev => ({ ...prev, [npcId]: { ...prev[npcId], speech: "" } }));
    }, 10000);
  }, []);

  const handleCeoEnteredOffice = useCallback(() => {
    setIsCeoEnteringOffice(prev => {
      if (!prev) return false;
      setControlledNpcId('ceo');
      setIsCameraLocked(true);
      return false;
    });
  }, [setControlledNpcId, setIsCameraLocked]);

  const handleToggleCEO = useCallback(() => {
    if (controlledNpcId === 'ceo') {
      // Keluar dari peran CEO
      setControlledNpcId(null);
      setIsCameraLocked(false);
      setCameraMode(0);
      setIsCeoEnteringOffice(false);
      if (ceoOverridesWorkingHours) {
        setCeoOverridesWorkingHours(false);
        setNpcState(prev => {
          if (!prev.ceo) return prev;
          return {
            ...prev,
            ceo: {
              ...prev.ceo,
              intent: "GO_HOME",
              target: HOME_POSITION
            }
          };
        });
      }
    } else if (isCeoEnteringOffice) {
      // Batalkan proses masuk jika tombol R / tombol UI diklik saat sedang berjalan masuk
      setIsCeoEnteringOffice(false);
      setCeoOverridesWorkingHours(false);
      setNpcState(prev => {
        if (!prev.ceo) return prev;
        return {
          ...prev,
          ceo: {
            ...prev.ceo,
            visible: false,
            intent: "IDLE",
            currentPos: HOME_POSITION,
            target: HOME_POSITION
          }
        };
      });
    } else {
      // Mulai peran CEO
      const isCeoAbsent = !npcState.ceo || !npcState.ceo.visible;
      if (isCeoAbsent) {
        // CEO sedang absen/tidak di kantor -> Abaikan jam kerja & jalan masuk dari teras depan lobi
        setCeoOverridesWorkingHours(true);
        setIsCeoEnteringOffice(true);
        setIsCameraLocked(false);
        setNpcState(prev => ({
          ...prev,
          ceo: {
            ...prev.ceo,
            visible: true,
            currentPos: [11.0, 1.0, 11.8],
            target: [11.0, 2.0, 5.0],
            intent: "CEO_WALK_IN"
          }
        }));
        handleSpeech("ceo", "Saya datang ke kantor untuk meninjau pekerjaan.");
      } else {
        // CEO sudah ada di kantor -> Langsung kendalikan CEO & kunci kamera
        setControlledNpcId('ceo');
        setIsCameraLocked(true);
      }
    }
  }, [controlledNpcId, isCeoEnteringOffice, ceoOverridesWorkingHours, npcState.ceo, setControlledNpcId, setIsCameraLocked, setCameraMode, handleSpeech]);

  // Listener keyboard untuk toggle CEO (tombol R)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;
      if (e.key.toLowerCase() === 'r') {
        handleToggleCEO();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleCEO]);
  const stateRef = useRef();
  useEffect(() => {
    stateRef.current = {
      npcState, isPlayerVisible, isPlayerGoingHome, cameraMode, timeMode,
      workingHoursEnabled, startTime, endTime, playerEndTime, gameTime, gameDay
    };
  }, [npcState, isPlayerVisible, isPlayerGoingHome, cameraMode, timeMode, workingHoursEnabled, startTime, endTime, playerEndTime, gameTime, gameDay]);

  // Auto-save game state to Server (Interval & BeforeUnload)
  useEffect(() => {
    const saveState = () => {
      if (!stateRef.current) return;
      const currentState = stateRef.current;
      
      const stateToSave = {
        ...currentState,
        npcState: Object.fromEntries(
          Object.entries(currentState.npcState).map(([id, state]) => [
            id,
            { ...state, currentPos: latestPositionsRef.current[id] || state.currentPos }
          ])
        ),
        playerPos: latestPositionsRef.current.player
      };
      
      fetch('http://localhost:3000/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateToSave)
      }).catch(err => {
        // Jangan crash UI jika server backend sedang restart atau offline
        console.warn("Server backend sementara tidak terjangkau saat menyimpan state:", err.message);
      });
    };

    const timer = setInterval(saveState, 5000); // Save every 5 seconds
    window.addEventListener('beforeunload', saveState);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', saveState);
    };
  }, []);

  // Sesuaikan jadwal pulang jika diubah dari settings
  useEffect(() => {
    setPlayerEndTime(endTime * 60);
  }, [endTime]);

  // Global Key Listener untuk Camera Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key.toLowerCase() === 'v') {
        setCameraMode(prev => (prev + 1) % 3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Timer: Realtime atau Simulasi
  useEffect(() => {
    let timer;
    if (timeMode === "simulated") {
      timer = setInterval(() => {
        setGameTime(prev => {
          const next = prev + 1;
          if (next >= 1440) {
            setGameDay(d => (d + 1) % 7);
          }
          return next % 1440;
        });
      }, 1000);
    } else {
      timer = setInterval(() => {
        const now = new Date();
        setGameTime(now.getHours() * 60 + now.getMinutes());
        setGameDay(now.getDay());
      }, 1000);
      const now = new Date();
      setGameTime(now.getHours() * 60 + now.getMinutes());
      setGameDay(now.getDay());
    }
    return () => clearInterval(timer);
  }, [timeMode]);

  const handleIntent = (npcId, intent) => {
    let newTarget = null;
    
    if (intent === "GO_TO_STAFFROOM" || intent === "DESK" || intent === "SHUTDOWN_BEFORE_GO_HOME" || (intent === "GO_TO_CEOROOM" && npcId === "ceo")) {
      newTarget = initialNPCs[npcId].desk;
    } else if (intent === "GO_TO_CEOROOM") {
      // NPC dipanggil menghadap ke ruangan CEO (berdiri di depan meja CEO)
      const ids = Object.keys(initialNPCs);
      const index = ids.indexOf(npcId);
      newTarget = getSlotPosition("GO_TO_CEOROOM", index >= 0 ? index : 0);
    } else if (intent === "AGUNG_REPORT_TO_CEO") {
      // Agung/PM masuk ke ruang CEO menyerahkan laporan (posisi tepat di depan meja CEO)
      newTarget = [10.5, 2, -6.8];
    } else if (intent === "HADI_TIDY_CEO_DESK") {
      // Hadi/OB masuk ke ruang CEO merapikan meja kerja (sisi meja CEO)
      newTarget = [10.0, 2, -7.5];
    } else if (intent === "GET_COLD_DRINK" || intent === "GO_TO_FRIDGE") {
      // NPC menuju ke depan kulkas pantry untuk mengambil minuman dingin
      newTarget = [-13.5, 2, 6.8];
    } else if (intent === "BREW_COFFEE" || intent === "HADI_BREW_COFFEE" || intent === "GO_TO_COFFEE") {
      // Hadi atau NPC menuju ke depan mesin kopi espresso
      newTarget = [-11.5, 2, 6.7];
    } else if (intent === "GO_TO_LOBBY") {
      // Kumpul di lobi depan meja resepsionis Gita
      const ids = Object.keys(initialNPCs);
      const index = ids.indexOf(npcId);
      newTarget = getSlotPosition("GO_TO_LOBBY", index >= 0 ? index : 0);
    } else if (intent === "CEO_WALK_IN") {
      newTarget = [11.0, 2.0, 5.0];
    } else if (intent === "GO_HOME") {
      newTarget = HOME_POSITION;
    } else if (intent.startsWith("HADI_DESK_")) {
      const routeIndex = parseInt(intent.split("_")[2]);
      newTarget = getHadiRoutePosition(routeIndex);
    } else if (intent === "HADI_TV_ON_MEETING" || intent === "HADI_TV_OFF_MEETING") {
      newTarget = [-10.5, 2, -10.0];
    } else if (intent === "HADI_TV_ON_CEO" || intent === "HADI_TV_OFF_CEO") {
      newTarget = [11.0, 2, -1.5];
    } else if (intent === "HADI_TV_ON_LOBBY" || intent === "HADI_TV_OFF_LOBBY") {
      newTarget = [8.8, 2, 7.3];
    } else if (intent.startsWith("GO_TO_NPC_")) {
      const targetId = intent.split("_")[3].toLowerCase();
      // NPC akan berjalan ke posisi terbaru dari NPC tujuan (di-offset sedikit agar tidak menabrak)
      const tPos = latestPositionsRef.current[targetId] || (initialNPCs[targetId] && initialNPCs[targetId].desk);
      if (tPos) {
        newTarget = [tPos[0] + (Math.random() * 1 - 0.5), 2, tPos[2] + (Math.random() * 1 - 0.5)];
      }
    } else {
      const ids = Object.keys(initialNPCs);
      const index = ids.indexOf(npcId);
      newTarget = getSlotPosition(intent, index >= 0 ? index : 0);
    }
    
    if (newTarget) {
      setNpcState(prev => ({
        ...prev,
        [npcId]: { ...prev[npcId], target: newTarget, intent: intent }
      }));
    }
  };

  // Sinkronisasi Random Event yang aktif ke aksi & dialog darurat NPC terkait
  useEffect(() => {
    if (activeEvent && activeEvent.status === 'active') {
      if (activeEvent.dialogues) {
        Object.entries(activeEvent.dialogues).forEach(([nId, txt]) => {
          handleSpeech(nId, txt);
        });
      }
      if (activeEvent.intents) {
        Object.entries(activeEvent.intents).forEach(([nId, intnt]) => {
          handleIntent(nId, intnt);
        });
      }
    }
  }, [activeEvent?.id, activeEvent?.status, handleSpeech]);

  const handleNpcArrive = (npcId, intent) => {

    if (intent === "GO_HOME") {
      setNpcState(prev => ({
        ...prev,
        [npcId]: { ...prev[npcId], visible: false }
      }));
    } else if (intent === "CEO_WALK_IN" && npcId === "ceo") {
      handleCeoEnteredOffice();
    } else if (intent === "SHUTDOWN_BEFORE_GO_HOME") {
      // NPC tiba di mejanya untuk mematikan laptop & monitor sebelum pulang
      setDeskScreens(prev => ({ ...prev, [npcId]: false }));
      playScreenSound(false);
      handleSpeech(npcId, "Laptop & monitor sudah dimatikan. Sampai besok semua!");
      setTimeout(() => {
        handleIntent(npcId, "GO_HOME");
      }, 2000);
    } else if (intent === "GO_TO_STAFFROOM" || intent === "DESK" || (intent === "GO_TO_CEOROOM" && npcId === "ceo")) {
      // Pastikan state intent NPC diperbarui menjadi "DESK" agar konsisten
      setNpcState(prev => ({
        ...prev,
        [npcId]: { ...prev[npcId], intent: "DESK" }
      }));

      // Saat tiba di meja kerja (pagi hari / masuk kantor), nyalakan laptop & monitor jika masih mati
      setDeskScreens(prev => {
        if (!prev[npcId]) {
          playScreenSound(true);
          const arrivalGreetings = {
            agung: "Nyalakan monitor & laptop. Siap pimpin sprint hari ini.",
            bunga: "Layar on! Lanjut eksplorasi desain di Figma.",
            candra: "Workstation nyala. Buka VS Code, siap ngoding.",
            dika: "Nyalakan laptop, cek service backend & database.",
            eka: "Monitor on, mari verifikasi test case & buru bug.",
            fajar: "Layar nyala, dashboard server & cloud terpantau aman.",
            ceo: "Workstation CEO aktif, mulai review roadmap bisnis.",
            gita: "Sistem resepsionis online, siap menyambut tamu."
          };
          if (arrivalGreetings[npcId]) {
            handleSpeech(npcId, arrivalGreetings[npcId]);
          }
          return { ...prev, [npcId]: true };
        }
        return prev;
      });
    } else if (intent === "GO_TO_CEOROOM") {
      // NPC dipanggil menghadap ke ruangan CEO oleh CEO
      const npcFirstName = initialNPCs[npcId]?.name?.split(" ")[0] || npcId;
      handleSpeech(npcId, `Permisi Pak Bege, saya menghadap ke ruangan Bapak. Ada arahan atau diskusi yang perlu saya catat?`);
      if (npcState.ceo && !npcState.ceo.speech && controlledNpcId !== 'ceo') {
        setTimeout(() => {
          handleSpeech("ceo", `Terima kasih ${npcFirstName}, silakan. Mari kita bahas roadmap dan prioritas selanjutnya.`);
        }, 3000);
      }
      // Setelah meeting selesai (~20 detik), NPC kembali ke meja kerja
      setTimeout(() => {
        setNpcState(prev => {
          if (prev[npcId] && prev[npcId].intent === "GO_TO_CEOROOM") {
            setTimeout(() => {
              handleSpeech(npcId, "Terima kasih banyak atas arahannya Pak. Saya izin kembali ke meja kerja.");
              handleIntent(npcId, "GO_TO_STAFFROOM");
            }, 0);
          }
          return prev;
        });
      }, 20000);
    } else if (intent === "AGUNG_REPORT_TO_CEO") {
      // Agung (PM/CTO) masuk ke ruangan CEO untuk submit report secara mandiri tanpa perlu dipanggil
      handleSpeech("agung", "Pak Bege, permisi saya submit report progress sprint dan roadmap teknis terbaru. Semua fitur utama on-track.");
      if (npcState.ceo && !npcState.ceo.speech && controlledNpcId !== 'ceo') {
        setTimeout(() => {
          handleSpeech("ceo", "Bagus sekali Agung. Saya review laporannya, delivery dan performa tim mantap.");
        }, 3200);
      }
      // Setelah submit report (~15 detik), Agung kembali ke staff room
      setTimeout(() => {
        setNpcState(prev => {
          if (prev.agung && prev.agung.intent === "AGUNG_REPORT_TO_CEO") {
            setTimeout(() => {
              handleSpeech("agung", "Laporan sudah diserahkan, saya kembali ke staff room untuk pimpin tim.");
              handleIntent("agung", "GO_TO_STAFFROOM");
            }, 0);
          }
          return prev;
        });
      }, 15000);
    } else if (intent === "HADI_TIDY_CEO_DESK") {
      // Hadi masuk ke ruangan CEO untuk merapikan meja kerja
      handleSpeech("hadi", "Permisi Pak, saya rapikan meja kerja dan pastikan dokumen serta ruangan tertata bersih.");
      setTimeout(() => {
        setNpcState(prev => {
          if (prev.hadi && prev.hadi.intent === "HADI_TIDY_CEO_DESK") {
            setTimeout(() => {
              handleSpeech("hadi", "Meja kerja Pak CEO sudah bersih dan rapi. Saya permisi kembali ke pantry ya Pak.");
              handleIntent("hadi", "GO_TO_PANTRY");
            }, 0);
          }
          return prev;
        });
      }, 12000);
    } else if (intent === "GO_TO_LOBBY") {
      // NPC berkumpul di lobi dan menyapa Gita (Resepsionis)
      const visitorGreetings = {
        bunga: "Hai Gita! Nyantai sebentar di lobi, pemandangan luar dari jendela kaca lobi adem banget.",
        candra: "Halo Git! Rehat sejenak di sofa lobi sambil regangin punggung.",
        dika: "Siang Gita, permisi rehat 5 menit di lobi.",
        eka: "Hai Gita! Enak ya suasananya, lobi terasa terang dan lega dengan jendela kaca.",
        fajar: "Halo Gita, ngecek suasana lobi sebentar sambil rehat.",
        agung: "Halo Gita, saya cek area depan sebentar ya.",
        hadi: "Mbak Gita, saya bersihkan meja lobi sebentar ya."
      };
      handleSpeech(npcId, visitorGreetings[npcId] || "Halo Gita, rehat sejenak di lobi ya.");
      if (npcState.gita && !npcState.gita.speech) {
        setTimeout(() => {
          const vName = initialNPCs[npcId]?.name?.split(" ")[0] || npcId;
          handleSpeech("gita", `Halo ${vName}! Silakan santai sejenak di lobi, suasananya lagi tenang banget.`);
        }, 2500);
      }
    } else if (intent === "KANBAN") {
      setTimeout(() => {
        handleIntent(npcId, "GO_TO_STAFFROOM"); // Balik kerja setelah ngecek Kanban
      }, 15000); 
    } else if (intent === "GET_COLD_DRINK" || intent === "GO_TO_FRIDGE") {
      // NPC tiba di kulkas pantry untuk mengambil minuman dingin
      triggerOpenFridge(4000);
      const drinkPhrases = {
        bunga: "Buka kulkas pantry... Wah, ada jus buah dingin dan soda segar!",
        candra: "Ngambil soda dingin dari kulkas dulu biar segar setelah debug seharian.",
        dika: "Ambil es kopi kaleng dingin di kulkas, mantap nih buat nambah fokus.",
        eka: "Segarnya air es dan minuman dingin dari kulkas kantor!",
        fajar: "Ambil energy drink dingin dari kulkas pantry, recharge energi.",
        agung: "Buka kulkas, ambil minuman dingin sebelum review sprint.",
        hadi: "Cek isi kulkas, pastikan stok minuman dingin tetap terisi rapi.",
        ceo: "Ambil sparkling water dingin dari kulkas pantry."
      };
      handleSpeech(npcId, drinkPhrases[npcId] || "Buka kulkas pantry, ambil minuman dingin yang segar.");
      
      setTimeout(() => {
        setNpcState(prev => {
          if (prev[npcId] && (prev[npcId].intent === "GET_COLD_DRINK" || prev[npcId].intent === "GO_TO_FRIDGE")) {
            setTimeout(() => {
              handleSpeech(npcId, "Minuman dinginnya segar banget! Siap lanjut produktif.");
              handleIntent(npcId, "GO_TO_STAFFROOM");
            }, 0);
          }
          return prev;
        });
      }, 4500);
    } else if (intent === "BREW_COFFEE" || intent === "HADI_BREW_COFFEE" || intent === "GO_TO_COFFEE") {
      // Hadi atau NPC menyeduh kopi di mesin kopi
      triggerBrewCoffee(4500);
      if (npcId === "hadi") {
        handleSpeech("hadi", "Saya seduh espresso segar dulu di mesin kopi untuk disajikan ke meja kerja.");
        setTimeout(() => {
          setNpcState(prev => {
            if (prev.hadi && prev.hadi.intent === "HADI_BREW_COFFEE") {
              setDrinksPreparedByHadi(true);
              setTimeout(() => {
                handleSpeech("hadi", "Kopi espresso sudah siap. Sekarang saya antarkan ke meja masing-masing.");
                handleIntent("hadi", "HADI_DESK_0_SERVE");
              }, 0);
            }
            return prev;
          });
        }, 5000);
      } else {
        const coffeePhrases = {
          candra: drinksPreparedByHadi 
            ? "Mau nambah kopi espresso lagi di mesin kopi biar makin ngebut ngoding."
            : "Hadi belum sempat keliling bawa kopi, saya seduh espresso sendiri aja di pantry.",
          dika: drinksPreparedByHadi
            ? "Seduh kopi hitam kedua hari ini, aroma espresso-nya enak banget."
            : "Butuh kafein buat tracing query database, bikin kopi sendiri dulu di mesin kopi.",
          fajar: drinksPreparedByHadi
            ? "Bikin kopi hangat sambil pantau CI/CD pipeline."
            : "Seduh americano sendiri di coffee machine, simpel dan wangi.",
          bunga: "Bikin latte hangat di mesin kopi, aromanya harum banget bikin rileks.",
          eka: "Pencet tombol espresso di mesin kopi... mantap, langsung siap diminum.",
          agung: "Seduh espresso sendiri sebelum sync up dengan tim engineering."
        };
        handleSpeech(npcId, coffeePhrases[npcId] || "Menyeduh espresso segar di mesin kopi... aromanya nikmat!");
        
        setTimeout(() => {
          setNpcState(prev => {
            if (prev[npcId] && (prev[npcId].intent === "BREW_COFFEE" || prev[npcId].intent === "GO_TO_COFFEE")) {
              setTimeout(() => {
                handleSpeech(npcId, "Kopi espresso sudah jadi! Nikmat dan segar, kembali ke meja kerja.");
                handleIntent(npcId, "GO_TO_STAFFROOM");
              }, 0);
            }
            return prev;
          });
        }, 5000);
      }
    } else if (intent === "GO_TO_PANTRY" && npcId !== "hadi") {
      // Non-Hadi tiba di pantry: interaksi dengan kulkas atau mesin kopi jika dekat
      const currentPos = latestPositionsRef.current[npcId === 'ceo' ? 'player' : npcId];
      const isNearFridge = currentPos && currentPos[0] < -12.5;
      const isNearCoffee = currentPos && currentPos[0] >= -12.5 && currentPos[0] < -10.5;
      if (isNearFridge) {
        triggerOpenFridge(3500);
        handleSpeech(npcId, "Buka kulkas pantry, ambil minuman dingin segar.");
      } else if (isNearCoffee) {
        triggerBrewCoffee(4000);
        handleSpeech(npcId, "Menyeduh kopi espresso hangat di mesin kopi pantry.");
      } else {
        handleSpeech(npcId, "Rehat sejenak di pantry sambil ngobrol santai.");
      }
      setTimeout(() => {
        handleIntent(npcId, "GO_TO_STAFFROOM");
      }, 10000);
    } else if (npcId === "hadi") {
      // Rutinitas Hadi Mengontrol TV
      if (intent === "HADI_TV_ON_MEETING") {
        setTvScreens(prev => ({ ...prev, meeting: true }));
        playScreenSound(true);
        handleSpeech("hadi", "TV ruang meeting sudah nyala.");
        setTimeout(() => {
          handleIntent("hadi", "HADI_TV_ON_CEO");
        }, 2000);
      } else if (intent === "HADI_TV_ON_CEO") {
        setTvScreens(prev => ({ ...prev, ceo: true }));
        playScreenSound(true);
        handleSpeech("hadi", "TV ruang CEO sudah nyala.");
        setTimeout(() => {
          handleIntent("hadi", "HADI_TV_ON_LOBBY");
        }, 2000);
      } else if (intent === "HADI_TV_ON_LOBBY") {
        setTvScreens(prev => ({ ...prev, lobby: true }));
        playScreenSound(true);
        handleSpeech("hadi", "TV lobi sudah nyala. Semua TV kantor aktif, saya siapkan minum di pantry.");
        setTimeout(() => {
          handleIntent("hadi", "GO_TO_PANTRY");
        }, 2000);
      } else if (intent === "HADI_TV_OFF_MEETING") {
        setTvScreens(prev => ({ ...prev, meeting: false }));
        playScreenSound(false);
        handleSpeech("hadi", "TV ruang meeting sudah dimatikan.");
        setTimeout(() => {
          handleIntent("hadi", "HADI_TV_OFF_CEO");
        }, 2000);
      } else if (intent === "HADI_TV_OFF_CEO") {
        setTvScreens(prev => ({ ...prev, ceo: false }));
        playScreenSound(false);
        handleSpeech("hadi", "TV ruang CEO sudah dimatikan.");
        setTimeout(() => {
          handleIntent("hadi", "HADI_TV_OFF_LOBBY");
        }, 2000);
      } else if (intent === "HADI_TV_OFF_LOBBY") {
        setTvScreens(prev => ({ ...prev, lobby: false }));
        playScreenSound(false);
        handleSpeech("hadi", "Semua TV sudah dimatikan, kantor aman. Saya pamit pulang!");
        setTimeout(() => {
          handleIntent("hadi", "GO_HOME");
        }, 2500);
      } else if (intent === "GO_TO_PANTRY") {
        const hours = Math.floor(gameTime / 60);
        // Jika Hadi di pantry pagi hari sebelum jam 12 dan belum seduh kopi, mulai seduh di mesin kopi
        if (hours < 12 && !drinksPreparedByHadi) {
          setTimeout(() => {
            handleIntent("hadi", "HADI_BREW_COFFEE");
          }, 2000);
        } else if (hours < 12 && drinksPreparedByHadi) {
          setTimeout(() => {
            setNpcState(prev => {
              if (prev.hadi && prev.hadi.intent === "GO_TO_PANTRY") {
                setTimeout(() => {
                  handleSpeech("hadi", "Permisi, saya antar minumannya.");
                  handleIntent("hadi", "HADI_DESK_0_SERVE");
                }, 0);
              }
              return prev;
            });
          }, 12000);
        }
      } else if (intent.startsWith("HADI_DESK_")) {
        const parts = intent.split("_");
        const routeIndex = parseInt(parts[2]);
        const action = parts[3]; // SERVE atau COLLECT
        
        // Di meja ruang CEO (routeIndex === 6), beri waktu dan ucapan khusus
        const stayDuration = routeIndex === 6 ? 4500 : 3000;
        if (routeIndex === 6) {
          if (action === "SERVE") {
            handleSpeech("hadi", "Permisi Pak CEO, saya antarkan kopi/teh hangat dan rapikan meja kerja Bapak.");
          } else {
            handleSpeech("hadi", "Permisi Pak CEO, saya ambil gelas kotornya dan pastikan meja kerja tetap bersih.");
          }
        }

        // Simulasikan menaruh/mengambil gelas
        setTimeout(() => {
          setNpcState(prev => {
            if (prev.hadi && prev.hadi.intent === intent) {
              setTimeout(() => {
                const nextIndex = routeIndex + 1;
                if (nextIndex < 8) {
                  handleIntent("hadi", `HADI_DESK_${nextIndex}_${action}`);
                } else {
                  handleSpeech("hadi", action === "SERVE" ? "Semua minuman sudah diantar ke meja staf dan ruang CEO." : "Semua gelas kotor dari staf dan ruang CEO sudah beres dicuci.");
                  handleIntent("hadi", "IDLE"); // Selesai rutinitas
                }
              }, 0);
            }
            return prev;
          });
        }, stayDuration);
      }
    }
  };

  // --- FSM (FINITE STATE MACHINE) GAME LOOP ---
  useEffect(() => {
    const processKey = `${gameTime}_${workingHoursEnabled}_${startTime}_${endTime}_${gameDay}`;
    if (lastProcessedKey.current === processKey) return;
    lastProcessedKey.current = processKey;

    const hours = Math.floor(gameTime / 60);
    const minutes = gameTime % 60;
    const midDay = Math.floor((startTime + endTime) / 2);
    const timeInMinutes = hours * 60 + minutes;
    const isWeekend = workingHoursEnabled && (gameDay === 0 || gameDay === 6);

    // Trigger generate offset tengah malam HANYA SEKALI
    if (hours === 0 && minutes === 0 && !isWeekend) {
      const newOffsets = generateAllOffsets();
      setNpcState(prev => {
        const nextState = { ...prev };
        Object.keys(nextState).forEach(k => {
          nextState[k] = { 
            ...nextState[k], 
            arrivalOffset: newOffsets[k].arrivalOffset, 
            departureOffset: newOffsets[k].departureOffset 
          };
        });
        return nextState;
      });
      
      // Update mutable copy agar iterasi state di bawah ini langsung menggunakan jadwal baru
      Object.keys(npcState).forEach(k => {
        if (npcState[k]) {
          npcState[k].arrivalOffset = newOffsets[k].arrivalOffset;
          npcState[k].departureOffset = newOffsets[k].departureOffset;
        }
      });
      // Reset player status pulang di hari baru
      if (workingHoursEnabled) {
        setIsPlayerGoingHome(false);
      }
      setPlayerEndTime(endTime * 60);
    }

    // --- LOGIKA KLIEN/PEMAIN SEKARANG ADALAH CEO ---
    if (workingHoursEnabled && timeInMinutes === playerEndTime && npcState["ceo"]?.visible) {
      if (controlledNpcId === "ceo" && !ceoOverridesWorkingHours) {
        setShowOvertimeDialog(true);
      }
    }

    Object.entries(npcState).forEach(([npcId, state]) => {
      // Pengecualian jam kerja untuk CEO jika sedang dikontrol pemain, sedang jalan masuk, atau override jam kerja aktif
      if (npcId === "ceo" && (controlledNpcId === "ceo" || isCeoEnteringOffice || ceoOverridesWorkingHours)) {
        return;
      }

      const npcStartTime = startTime * 60 + state.arrivalOffset;
      const npcEndTime = endTime * 60 + state.departureOffset;

      const isWorkingDay = !workingHoursEnabled || !isWeekend;
      const isWithinHours = !workingHoursEnabled || (
        isWorkingDay && timeInMinutes >= npcStartTime && timeInMinutes < npcEndTime
      );

      // KASUS 1: JAM KERJA SEDANG AKTIF
      if (isWithinHours) {
        // 1a. Tepat saat jam masuk (animasi kedatangan dari teras luar)
        if (timeInMinutes === npcStartTime && !isWeekend) {
          setNpcState(prev => ({
            ...prev,
            [npcId]: { ...prev[npcId], visible: true, currentPos: [11 + (Math.random() - 0.5) * 2, 2, 11 + (Math.random() - 0.5) * 2] } // Teras Luar
          }));
          
          let firstIntent = "GO_TO_STAFFROOM";
          if (npcId === "gita") firstIntent = "DESK"; // GITA FIX (kembali ke balik meja resepsionis)
          else if (npcId === "hadi") firstIntent = "HADI_TV_ON_MEETING"; // Hadi mulai rutinitas pagi menyalakan TV
          else if (timeInMinutes < startTime * 60) {
            // Datang lebih awal -> ngobrol dulu di Lounge, Pantry, atau Lobi depan
            const earlySpots = ["GO_TO_LOUNGE", "GO_TO_PANTRY", "GO_TO_LOBBY"];
            firstIntent = earlySpots[(npcId.charCodeAt(0)) % earlySpots.length];
          }
          handleIntent(npcId, firstIntent);
          
          if (npcId === "hadi") {
            handleSpeech(npcId, "Pagi semua! Saya keliling nyalakan TV kantor dulu.");
          } else {
            if (state.arrivalOffset > 0) handleSpeech(npcId, "Maaf saya telat!");
            else if (state.arrivalOffset < 0) handleSpeech(npcId, "Pagi! Saya datang awal.");
            else handleSpeech(npcId, "Selamat pagi semua.");
          }
        } 
        // 1b. Jika NPC belum visible padahal sedang jam kerja (misal awal game atau lompat waktu ke siang)
        else if (!state.visible) {
          const deskPos = initialNPCs[npcId]?.desk || [0, 2, 0];
          setNpcState(prev => ({
            ...prev,
            [npcId]: {
              ...prev[npcId],
              visible: true,
              currentPos: deskPos,
              target: deskPos,
              intent: "DESK"
            }
          }));
          setDeskScreens(prev => ({ ...prev, [npcId]: true }));
        }
      } 
      // KASUS 2: DI LUAR JAM KERJA (JAM KERJA AKTIF DAN SUDAH PULANG / MALAM / AKHIR PEKAN)
      else if (workingHoursEnabled && !isWithinHours) {
        const isQuittingWindow = (timeInMinutes >= npcEndTime && timeInMinutes <= npcEndTime + 5);

        // 2a. Jendela waktu pulang (tepat saat jam pulang s/d 5 menit setelahnya) & NPC masih di kantor
        if (state.visible && state.intent !== "GO_HOME" && isQuittingWindow) {
          if (npcId === "hadi") {
            // Hadi Office Boy: keliling matikan semua TV sebelum pulang
            handleSpeech("hadi", "Sudah jam pulang, saya keliling matikan semua TV dulu.");
            handleIntent("hadi", "HADI_TV_OFF_MEETING");
          } else {
            // NPC langsung mematikan laptop & monitor di mejanya sebelum pulang
            setDeskScreens(prev => ({ ...prev, [npcId]: false }));
            playScreenSound(false);

            const departureFarewells = {
              agung: "Matikan monitor & laptop dulu... Sampai besok tim!",
              bunga: "Save Figma, shutdown laptop... Duluan ya semua!",
              candra: "Commit & push kode, turn off laptop... Mari pulang!",
              dika: "Shutdown server lokal & laptop... Duluan ya.",
              eka: "Tutup report QA, matikan monitor... Sampai besok!",
              fajar: "Monitoring aman di cloud, shutdown laptop kerja... Bye all!",
              ceo: "Matikan workstation... Terima kasih atas kerja kerasnya hari ini.",
              gita: "Logoff sistem resepsionis, matikan laptop... Selamat malam semua."
            };
            handleSpeech(npcId, departureFarewells[npcId] || "Matikan laptop & monitor dulu, sampai besok!");

            setTimeout(() => {
              handleIntent(npcId, "GO_HOME");
            }, 2000);
          }
        } 
        // 2b. Sudah lewat dari jam pulang (> 5 menit), malam hari, akhir pekan, atau sebelum jam masuk
        else if (state.visible) {
          setNpcState(prev => ({
            ...prev,
            [npcId]: {
              ...prev[npcId],
              visible: false,
              intent: "IDLE",
              currentPos: HOME_POSITION,
              target: HOME_POSITION
            }
          }));
          setDeskScreens(prev => ({ ...prev, [npcId]: false }));
          // Matikan semua TV jika malam hari / weekend
          if (timeInMinutes >= endTime * 60 || timeInMinutes < startTime * 60 || isWeekend) {
            setTvScreens({ meeting: false, ceo: false, lobby: false });
          }
        }
      }

      // Group events (HANYA berjalan jika jam kerja aktif, NPC ada, dan tidak sedang pulang)
      if (isWithinHours && state.visible && state.intent !== "GO_HOME") {
        const toiletHour = startTime + 1 + (npcId.charCodeAt(0) % 4); 
        
        if (hours === toiletHour && minutes === 15) {
          handleIntent(npcId, "GO_TO_TOILET");
          if (Math.random() > 0.5) handleSpeech(npcId, "Permisi, ke toilet sebentar.");
        } else if (hours === toiletHour && minutes === 30 && state.intent === "GO_TO_TOILET") {
          handleIntent(npcId, npcId === "ceo" ? "GO_TO_CEOROOM" : (npcId === "gita" || npcId === "hadi" ? "DESK" : "GO_TO_STAFFROOM"));
        } else if (hours === startTime + 1 && minutes === 0 && !drinksPreparedByHadi && npcId === "candra") {
          // Jika Hadi belum sempat keliling bawa kopi, staf dapat menyeduh kopi sendiri di mesin kopi
          handleSpeech("candra", "Hadi belum sempat keliling bawa kopi, saya seduh espresso sendiri dulu di pantry.");
          handleIntent("candra", "BREW_COFFEE");
        } else if (hours === startTime + 1 && minutes === 15 && npcId === "hadi") {
          // Hadi menyeduh kopi di mesin kopi sebelum menyajikan ke meja-meja
          handleIntent("hadi", "HADI_BREW_COFFEE");
        } else if (hours === startTime + 2 && minutes === 0) {
          if (["agung", "bunga", "candra", "dika"].includes(npcId)) {
            handleIntent(npcId, "GO_TO_MEETINGROOM");
            if (npcId === "agung") handleSpeech(npcId, "Tim inti, kumpul untuk standup.");
          }
        } else if (hours === startTime + 2 && minutes === 30 && state.intent === "GO_TO_MEETINGROOM") {
          handleIntent(npcId, "GO_TO_STAFFROOM");
          if (npcId === "agung") handleSpeech(npcId, "Standup selesai, mari kembali kerja di meja masing-masing.");
        } else if (hours === startTime + 3 && minutes === 0 && npcId === "agung") {
          // Agung masuk ke ruang CEO untuk submit progress report setelah standup
          handleSpeech("agung", "Standup beres. Saya ke ruangan Pak Bege dulu untuk submit laporan progress sprint.");
          handleIntent("agung", "AGUNG_REPORT_TO_CEO");
        } else if (hours === midDay && minutes === 0) {
          if (npcId !== "gita" && npcId !== "ceo") {
            // Sebagian ambil minuman dingin di kulkas, sebagian bikin kopi, sebagian kumpul di lobi & lounge
            const lunchSpots = ["GET_COLD_DRINK", "BREW_COFFEE", "GO_TO_LOBBY", "GO_TO_LOUNGE"];
            const spot = lunchSpots[(npcId.charCodeAt(0)) % lunchSpots.length];
            handleIntent(npcId, spot);
          }
          if (npcId === "bunga") handleSpeech(npcId, "Waktunya istirahat siang! Enak nih ngobrol santai di lobi atau ambil minuman dingin di kulkas.");
        } else if (hours === midDay + 1 && minutes === 0) {
          handleIntent(npcId, npcId === "gita" ? "DESK" : "GO_TO_STAFFROOM");
          if (npcId === "agung") handleSpeech(npcId, "Ayo kembali fokus kerja!");
        } else if (hours === midDay + 1 && minutes === 30 && npcId === "hadi") {
          // Hadi masuk ke ruang CEO untuk merapikan meja kerja
          handleSpeech("hadi", "Saya ke ruangan Pak CEO dulu untuk merapikan meja kerja dan menyeka debu.");
          handleIntent("hadi", "HADI_TIDY_CEO_DESK");
        } else if (hours === midDay + 2 && minutes === 30 && npcId === "agung") {
          // Agung masuk ke ruang CEO menyerahkan laporan sore & PR review status
          handleSpeech("agung", "Permisi, saya ke ruangan CEO untuk serahkan update sprint dan approval PR.");
          handleIntent("agung", "AGUNG_REPORT_TO_CEO");
        } else if (hours === endTime - 2 && minutes === 0) {
          if (["candra", "bunga", "eka"].includes(npcId)) {
            handleIntent(npcId, "GO_TO_LOBBY"); // Kumpul di lobi ngobrol santai sama Gita
          } else if (npcId === "dika") {
            handleIntent(npcId, "BREW_COFFEE"); // Dika menyeduh espresso sore di mesin kopi
          } else if (npcId === "fajar") {
            handleIntent(npcId, "GET_COLD_DRINK"); // Fajar mengambil minuman dingin di kulkas pantry
          }
          if (npcId === "hadi") {
            handleIntent(npcId, "GO_TO_PANTRY"); // Hadi bersiap di pantry
          }
        } else if (hours === endTime - 2 && minutes === 30) {
          // Selesai break sore, kembali ke meja kerja
          if (["candra", "bunga", "eka", "dika", "fajar"].includes(npcId) && (state.intent === "GO_TO_LOBBY" || state.intent === "GO_TO_LOUNGE" || state.intent === "GET_COLD_DRINK" || state.intent === "BREW_COFFEE")) {
            handleIntent(npcId, "GO_TO_STAFFROOM");
          }
        } else if (hours === endTime - 1 && minutes === 0) {
          if (npcId === "hadi") {
            handleSpeech(npcId, "Permisi, saya ambil gelas kotornya ya.");
            handleIntent(npcId, "HADI_DESK_0_COLLECT"); // Mulai keliling ambil gelas termasuk dari ruang CEO
          }
        }
      }
    });
    
    // --- EVENT GLOBAL BERDASARKAN WAKTU ---
    
    // Jam 08:00 Pas -> Semua yang nongkrong masuk kerja (kecuali Gita & Hadi yang sudah punya role)
    if (timeInMinutes === startTime * 60 && !isWeekend) {
      Object.entries(npcState).forEach(([id, state]) => {
        if (state.visible && id !== "gita" && id !== "hadi" && state.intent !== "GO_HOME") {
          if (state.intent !== "GO_TO_STAFFROOM" && state.intent !== "DESK") {
            handleIntent(id, "GO_TO_STAFFROOM");
          }
        }
      });
    }

    // Jam 08:30 Pas -> Trigger Autonomous Tick untuk NPC membaca Kanban & InfoBoard
    if (timeInMinutes === startTime * 60 + 30 && !isWeekend) {
      const activeNpcs = Object.entries(npcState)
        .filter(([id, state]) => state.visible && id !== "gita" && id !== "hadi" && state.intent !== "GO_HOME")
        .map(([id]) => id);
      
      activeNpcs.forEach((id, index) => {
        // Beri jeda 5 detik antar NPC agar tidak terkena limit API AI (Rate Limiting)
        setTimeout(() => {
          fetch('http://localhost:3000/api/tick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: "pemain-1", npcId: id, worldState: { time: formatTime(gameTime) } })
          })
          .then(res => res.json())
          .then(data => {
            if (data.reply && data.reply !== "(Memeriksa papan tugas...)") {
              handleSpeech(id, data.reply);
            }
            if (data.action && data.action.startsWith("GO_TO_")) {
              handleIntent(id, data.action);
            }
          })
          .catch(err => console.error("Gagal menjalankan tick AI:", err));
        }, index * 5000);
      });
    }

    // --- EVALUASI PENCAPAIAN GAMEPLAY & RANDOM EVENT ---
    if (gameTime >= 18 * 60) {
      useInteractionStore.getState().updateAchievementProgress('night_owl', 1);
    }
    if (controlledNpcId === 'ceo') {
      useInteractionStore.getState().updateAchievementProgress('ceo_leader', 1);
    }

    // Pengecekan event kantor otomatis di latar belakang (sangat jarang, menjaga kondusifitas kerja AI agent)
    if (workingHoursEnabled && !isWeekend && !activeEvent) {
      useInteractionStore.getState().checkAndTriggerBackgroundEvent();
    }

    // --- CHATTING & DISKUSI ANTAR REKAN KERJA DI RUANGAN YANG SAMA ---
    if (minutes % 3 === 0) {
      const visibleNpcs = Object.entries(npcState).filter(([id, state]) => state.visible && state.intent !== "GO_HOME");

      // Kelompokkan NPC berdasarkan ruangan tempat mereka berada
      const staffRoomNpcs = visibleNpcs.filter(([id, state]) => 
        (state.intent === "DESK" || state.intent === "GO_TO_STAFFROOM") && 
        id !== "gita" && id !== "hadi" && id !== "ceo"
      );
      const loungeNpcs = visibleNpcs.filter(([id, state]) => state.intent === "GO_TO_LOUNGE");
      const pantryNpcs = visibleNpcs.filter(([id, state]) => state.intent === "GO_TO_PANTRY");
      const meetingNpcs = visibleNpcs.filter(([id, state]) => state.intent === "GO_TO_MEETINGROOM" || state.intent === "KANBAN");
      const lobbyNpcs = visibleNpcs.filter(([id, state]) => state.intent === "GO_TO_LOBBY");

      // Fungsi pengecekan jarak antar NPC (radius 2.5 meter)
      const isCloseEnough = (id1, id2, radius = 2.5) => {
        const p1 = latestPositionsRef.current[id1];
        const p2 = latestPositionsRef.current[id2];
        if (!p1 || !p2) return false;
        const dx = p1[0] - p2[0];
        const dz = p1[2] - p2[2];
        return Math.sqrt(dx*dx + dz*dz) <= radius;
      };

      // 1. Diskusi dari Meja Kerja di Staff Room (Duduk, Mengetik, Berdiskusi)
      if (staffRoomNpcs.length >= 2) {
        const availableStaff = staffRoomNpcs.filter(([id, state]) => !state.speech);
        const shuffled = [...availableStaff].sort(() => 0.5 - Math.random());
        
        let selectedPair = null;
        for (let i = 0; i < shuffled.length; i++) {
          for (let j = i + 1; j < shuffled.length; j++) {
            if (isCloseEnough(shuffled[i][0], shuffled[j][0], 2.5)) {
              selectedPair = [shuffled[i][0], shuffled[j][0]];
              break;
            }
          }
          if (selectedPair) break;
        }

        if (selectedPair) {
          const npc1 = selectedPair[0];
          const npc2 = selectedPair[1];

          const roleTopics = {
            agung: ["gimana progress sprint kita hari ini?", "ada blocker ngga buat task kamu?", "udah cek update terbaru di papan Kanban belum?"],
            bunga: ["komponen UI yang baru udah sesuai mock-up belum?", "aku baru update design system di Figma nih, udah dicek?", "ada feedback buat user flow onboarding yang baru?"],
            candra: ["state management di frontend udah aku rapihin nih.", "aset responsifnya udah aman belum kalau di-test di mobile?", "komponen React-nya udah aku pisah biar lebih clean reusable."],
            dika: ["endpoint API yang baru udah aku deploy ke staging ya.", "schema database-nya udah fix, query-nya juga udah di-optimize.", "jangan lupa kirim token JWT di header ya kalau hit API."],
            eka: ["aku udah bikin script automated test baru di Cypress.", "tadi ada beberapa bug minor, tapi udah aku report di Jira.", "test coverage aplikasi kita sekarang udah lumayan naik nih."],
            fajar: ["pipeline CI/CD GitHub Actions udah aku benerin, build time-nya turun 40%.", "cluster Kubernetes kita masih aman kok resource CPU-nya.", "server staging barusan aku restart biar lebih fresh."]
          };

          const roleReplies = {
            agung: ["Aman, semua masih on-track sesuai timeline kita.", "Siap, nanti aku review lagi buat mastiin semuanya jalan.", "Oke, nanti kita bahas detailnya pas daily standup ya."],
            bunga: ["Oke siap, nanti aku cek lagi padding sama margin-nya.", "Sip, warnanya udah pas kok sama brand guidelines kita.", "Mantap, nanti kalau ada aset SVG yang kurang, kabarin aja."],
            candra: ["Sip, datanya udah berhasil aku fetch dan render di komponen.", "Minta tolong cek tampilannya di mobile view ya, takutnya ada yang geser.", "Oke, state-nya juga udah aman ngga ada memory leak."],
            dika: ["Sip, payload JSON-nya juga udah sesuai sama dokumentasi.", "Log backend-nya udah bersih kok, ngga ada error unhandled promise.", "Nanti aku tambahin caching Redis biar endpoint-nya lebih ngebut."],
            eka: ["Oke, nanti aku running regression test-nya lagi ya.", "Sip, bug-nya udah aku verify dan udah beres kok.", "Bagus deh, soalnya environment QA kita juga lagi stabil banget nih."],
            fajar: ["Mantap, proses auto-deploy ke production juga udah aku siapin.", "Oke, nanti aku pantau lewat log monitoring di Grafana ya.", "Sip, load balancer-nya juga udah jalan normal."]
          };

          const name1 = initialNPCs[npc1].name.split(" ")[0];
          const name2 = initialNPCs[npc2].name.split(" ")[0];
          
          const topics = roleTopics[npc1] || ["lagi ngerjain apa nih?"];
          const replies = roleReplies[npc2] || ["lagi ngeberesin task biasa nih."];

          const topic = `Eh ${name2}, ${topics[Math.floor(Math.random() * topics.length)]}`;
          const reply = `Wah mantap ${name1}. ${replies[Math.floor(Math.random() * replies.length)]}`;

          handleSpeech(npc1, topic);
          setTimeout(() => {
            handleSpeech(npc2, reply);
            useInteractionStore.getState().addNpcAffinity(npc1, npc2, 2);
          }, 3200);
        }
      }

      // 2. Obrolan santai di Lounge / Pantry / Meeting Room / Lobi Antar-Staf
      const otherRooms = [loungeNpcs, pantryNpcs, meetingNpcs, lobbyNpcs];
      otherRooms.forEach(roomNpcs => {
        if (roomNpcs.length >= 2) {
          const available = roomNpcs.filter(([id, state]) => !state.speech);
          const shuffled = [...available].sort(() => 0.5 - Math.random());
          
          let selectedPair = null;
          for (let i = 0; i < shuffled.length; i++) {
            for (let j = i + 1; j < shuffled.length; j++) {
              // Toleransi jarak sedikit lebih jauh di lounge/pantry/meeting room/lobi
              if (isCloseEnough(shuffled[i][0], shuffled[j][0], 3.5)) {
                selectedPair = [shuffled[i][0], shuffled[j][0]];
                break;
              }
            }
            if (selectedPair) break;
          }

          if (selectedPair) {
            const n1 = selectedPair[0];
            const n2 = selectedPair[1];
            const name1 = initialNPCs[n1].name.split(" ")[0];
            const name2 = initialNPCs[n2].name.split(" ")[0];

            const npcCasualTopics = {
              hadi: ["monggo kopinya sudah siap diseduh di pantry ya.", "kalau butuh teh hangat atau air minum bilang ke saya ya."],
              gita: ["tadi ada kurir antar dokumen kantor, sudah Gita rapikan di lobi ya.", "senang deh lihat suasana kantor kita selalu rapi dan nyaman."],
              ceo: ["rehat sejenak bagus buat recharge energi dan kejernihan berpikir kita.", "gimana ritme tim hari ini, semua berjalan kondusif kan?"],
              agung: ["manfaatkan break sejenak biar sprint kita tetap sustainable dan nggak burnout.", "komunikasi santai kayak gini penting banget buat kekompakan tim."],
              bunga: ["pencahayaan di sini enak banget ya, bikin mood desain langsung naik.", "kopi hangat sambil santai sejenak bikin ide visual baru bermunculan."],
              candra: ["abis beresin komponen React rasanya plong, lumayan bisa regangin punggung.", "duduk santai di sini asik juga ya, pikiran jadi lebih segar."],
              dika: ["kopi hitam Pak Hadi emang paling juara buat nemenin mikir logika query.", "rehat 5 menit efisien banget buat reset fokus sebelum refactor."],
              eka: ["rehat dulu sebentar biar mata seger lagi sebelum lanjut hunting bug.", "tadi baru kelar review test suite, lumayan test case-nya aman."],
              fajar: ["santai, Grafana hijau semua hari ini, server adem ayem.", "seneng banget kalau pipeline CI/CD lancar jaya tanpa kendala."]
            };

            const npcCasualReplies = {
              hadi: ["Iya Mas/Mbak, monggo dinikmati waktu istirahatnya ya.", "Sami-sami, sehat-sehat selalu ya buat semua."],
              gita: ["Iya bener banget, Gita juga ngerasa suasana hari ini fresh banget.", "Terima kasih banyak, semangat ya kerjanya!"],
              ceo: ["Setuju sekali, tim yang bahagia pasti menghasilkan produk terbaik.", "Bagus, terus jaga semangat dan kekompakan ya."],
              agung: ["Sip mantap, nanti setelah ini kita lanjut dengan pikiran lebih jernih.", "Betul, ritme kerja yang seimbang itu kunci jangka panjang."],
              bunga: ["Wah iya bener banget! Vibes-nya dapet banget nih.", "Hehe setuju, mata dan pikiran langsung fresh lagi!"],
              candra: ["Gass! Abis ini lanjut ngoding makin ngebut deh.", "Haha bener banget, santai sejenak tapi output tetap maksimal."],
              dika: ["Logis. Istirahat terukur gini emang naikin produktivitas.", "Sip, baterai udah keisi lagi nih buat lanjut backend."],
              eka: ["Betul, mata fresh bikin lebih jeli ngeliat anomali di sistem.", "Sip, abis ini siap verifikasi skenario lainnya."],
              fajar: ["Mantap, situasi terkendali, rehat pun jadi tenang tanpa panik.", "Haha bener, downtime nol bikin hati tenang."]
            };

            const defaultTopics = [
              "kopi di pantry hari ini aromanya enak banget ya.",
              "seger juga ya istirahat sebentar setelah fokus kerja seharian.",
              "rileks dulu sejenak biar pikiran fresh lagi."
            ];
            const defaultReplies = [
              "Iya nih, pas banget buat nge-recharge energi.",
              "Betul, break sebentar bikin mata dan pikiran fresh lagi.",
              "Setuju, habis ini gas lagi lanjutin kerjaan."
            ];

            const poolTopics = npcCasualTopics[n1] || defaultTopics;
            const poolReplies = npcCasualReplies[n2] || defaultReplies;
            
            const topicText = poolTopics[Math.floor(Math.random() * poolTopics.length)];
            const replyText = poolReplies[Math.floor(Math.random() * poolReplies.length)];

            const topic = `Eh ${name2}, ${topicText}`;
            const reply = `${replyText}`;

            handleSpeech(n1, topic);
            setTimeout(() => {
              handleSpeech(n2, reply);
              useInteractionStore.getState().addNpcAffinity(n1, n2, 2);
            }, 3000);
          }
        }
      });

      // 3. Obrolan di Lobi Depan dengan Gita (Resepsionis) saat Istirahat
      if (lobbyNpcs.length >= 1 && npcState.gita?.visible) {
        const availableVisitor = lobbyNpcs.find(([id, state]) => !state.speech && !npcState.gita.speech && id !== "gita");
        if (availableVisitor) {
          const vId = availableVisitor[0];

          const gitaLobbyDialogues = {
            bunga: {
              ask: "Git, jendela kaca lobi ini bagus banget ya! Pencahayaan alaminya bikin suasana resepsionis makin estetik.",
              reply: "Iya Kak Bunga! Gita suka banget, jadi lebih terang dan pemandangan luar kelihatan jelas."
            },
            candra: {
              ask: "Halo Git! Rehat sebentar di sofa lobi nih. Ada kurir antar paket komponen atau hardware baru nggak hari ini?",
              reply: "Halo Mas Candra! Tadi belum ada paket masuk kok, nanti kalau ada kurir Gita langsung kabari ya!"
            },
            dika: {
              ask: "Siang Gita. Lobi kantor tenang dan nyaman ya, pas banget buat refresh pikiran sejenak.",
              reply: "Iya Mas Dika, silakan santai sejenak. Nanti kalau butuh air minum atau kopi tinggal ke pantry ya."
            },
            eka: {
              ask: "Hai Gita! Hari ini ada jadwal partner atau tamu dari luar yang mau visit kantor nggak?",
              reply: "Hai Mbak Eka! Jadwal kunjungan hari ini aman terkendali, belum ada tamu mendadak kok."
            },
            fajar: {
              ask: "Git, koneksi WiFi di area lobi lancar kan? Nggak ada kendala sinyal kan?",
              reply: "Lancar banget Mas Fajar! Sinyalnya stabil dan kencang, terima kasih ya!"
            },
            agung: {
              ask: "Gita, kalau ada klien atau stakeholder datang cari saya atau Pak Bege, langsung arahkan ya.",
              reply: "Siap Mas Agung, langsung Gita sambut dan persilakan menunggu di sofa lobi atau ruang meeting."
            },
            hadi: {
              ask: "Mbak Gita, air minum di lobi masih cukup kan? Kalau butuh bantuan bersih-bersih kabari ya.",
              reply: "Masih aman Pak Hadi, terima kasih banyak ya selalu perhatian sama kenyamanan lobi."
            },
            ceo: {
              ask: "Selamat siang Gita. Semua administrasi dan tamu kantor di depan berjalan lancar kan?",
              reply: "Selamat siang Pak Bege! Semua administrasi dan buku tamu tercatat rapi, situasi kondusif Pak."
            }
          };

          const pair = gitaLobbyDialogues[vId] || {
            ask: "Hai Gita, rehat sejenak di lobi santai juga ya.",
            reply: "Halo! Iya betul, silakan santai dan nikmati waktu istirahatnya ya."
          };

          handleSpeech(vId, pair.ask);
          setTimeout(() => {
            handleSpeech("gita", pair.reply);
            useInteractionStore.getState().addNpcAffinity(vId, "gita", 2);
          }, 3200);
        }
      }
    }

  }, [gameTime, startTime, endTime, npcState, workingHoursEnabled]);

  // Format Waktu UI
  const formatTime = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Layar Transisi Loading Modern & Halus Menghilangkan Layar Hitam */}
      <LoadingScreen isSceneReady={isSceneReady} />

      {/* Tombol Toggle Kamera */}
      <button 
        onClick={() => setIsCameraLocked(!isCameraLocked)}
        style={{
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: isCameraLocked ? '#10b981' : '#3b82f6', color: 'white', padding: '10px 24px',
          borderRadius: '24px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px'
        }}
      >
        <span>{isCameraLocked ? '🔒 Locked (Press to Free-Cam)' : '🔓 Free-Cam (Press to Lock)'}</span>
      </button>

      <Canvas 

        shadows 
        dpr={[1, 1.5]} 
        camera={{ position: [0, 15, 20], fov: 50 }}
        style={{ background: lighting.skyColor || '#030712' }}
      >
        {/* Notifier kesiapan render frame Three.js pertama */}
        <SceneReadyTracker onReady={() => setIsSceneReady(true)} />

        {/* Langit, Atmosfer, Kabut, dan Bintang Dinamis Terkoneksi Jam Game */}
        <DynamicSky lighting={lighting} />

        {/* Ambient & Hemisphere fill lighting untuk bayangan lembut alami */}
        <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
        <hemisphereLight 
          args={[lighting.skyColor, lighting.groundColor, lighting.hemiIntensity || 0.3]} 
        />

        {/* Directional Sun/Moon Light dengan frustum bayangan presisi membungkus seluruh kantor */}
        <directionalLight 
          castShadow 
          position={lighting.sunPosition} 
          intensity={lighting.sunIntensity} 
          color={lighting.sunColor}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-26}
          shadow-camera-right={26}
          shadow-camera-top={26}
          shadow-camera-bottom={-26}
          shadow-camera-near={0.5}
          shadow-camera-far={90}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />

        {/* Bungkus obyek ke dalam Physics Engine dengan fixed 60Hz timestep untuk stabilitas kontak */}
        <Physics timeStep={1 / 60}>
          {/* Tanah Alam Luas & Area Fondasi Kantor (Membentang luas agar kantor tidak terlihat mengambang) */}
          <RigidBody type="fixed" colliders={false}>
            {/* Permukaan Rumput Alam Luas & Fondasi Kantor */}
            <GroundTerrain 
              grassColor={lighting.grassColor} 
              pavingColor={lighting.pavingColor} 
              isNight={lighting.isNight} 
            />

            {/* Collider Rapier besar untuk collision tanah solid */}
            <CuboidCollider args={[400, 1, 400]} position={[0, -1, 0]} />
          </RigidBody>

          {/* --- PROPERTI 3D KANTOR (Terisolasi dari re-render pergerakan NPC & font suspense) --- */}
          <Suspense fallback={null}>
            <OfficeEnvironment 
              onKanbanClick={handleOpenKanban} 
              onInfoBoardClick={handleOpenInfoBoard}
              vehicleVisibility={vehicleVisibility} 
              lighting={lighting}
              deskScreens={deskScreens}
              tvScreens={tvScreens}
              onToggleDeskScreen={toggleDeskScreen}
              onToggleTvScreen={toggleTvScreen}
              isOutdoorLightsOn={isOutdoorLightsOn}
              fridgeOpen={fridgeOpen}
              onToggleFridge={() => triggerOpenFridge(4000)}
              coffeeBrewing={coffeeBrewing}
              onToggleCoffee={() => triggerBrewCoffee(4500)}
            />
          </Suspense>

          {/* --- KARAKTER --- */}
          {Object.entries(npcState).map(([id, state]) => (
            <GenericNPC 
              key={id} 
              id={id}
              name={state.name} 
              color={state.color} 
              position={state.currentPos} 
              targetPosition={state.target} 
              intent={state.intent}
              isVisible={state.visible}
              onArrive={handleNpcArrive}
              onProfileClick={handleSelectProfile}
              dialogue={state.speech}
              latestPositionsRef={latestPositionsRef}
              isPlayer={id === controlledNpcId}
              cameraMode={cameraMode}
              isCameraLocked={isCameraLocked}
              setIsCameraLocked={setIsCameraLocked}
              onWalkThroughDoor={() => setIsPlayerGoingHome(false)}
              onWalkOutDoor={() => setShowGoHomeConfirm(true)}
              isChatOpen={isChatOpen}
            />
          ))}
          
        </Physics>

        {/* --- KONTROL KAMERA --- */}
        <OrbitControls 
          makeDefault 
          enabled={!isCameraLocked} 
          maxPolarAngle={Math.PI / 2.15}
          minPolarAngle={Math.PI / 6}
          minDistance={3}
          maxDistance={35}
          target={[0, 1, 0]}
        />
        <CameraResetter 
          controlledNpcId={controlledNpcId} 
          latestPositionsRef={latestPositionsRef}
          ceoPos={latestPositionsRef.current?.ceo || npcState.ceo?.currentPos} 
          isCeoVisible={Boolean(npcState.ceo && npcState.ceo.visible)}
          isCeoEnteringOffice={isCeoEnteringOffice}
          onCeoEnteredOffice={handleCeoEnteredOffice}
        />

        {/* --- POST-PROCESSING PIPELINE (Bloom, SSAO, ToneMapping, Vignette) --- */}
        <PostProcessingEffects 
          bloom={postFxSettings?.bloom}
          ssao={postFxSettings?.ssao}
          vignette={postFxSettings?.vignette}
          toneMapping={postFxSettings?.toneMapping}
          isNight={lighting.isNight}
        />
      </Canvas>

      {/* UI Overlay Chat */}
      <ChatBox 
        onDetectIntent={handleIntent} 
        onSpeech={handleSpeech} 
        controlledNpcId={controlledNpcId} 
        onReportGenerated={handleReportGenerated} 
        onChatToggle={setIsChatOpen}
        latestPositionsRef={latestPositionsRef}
        npcState={npcState}
      />



      {/* Modal Laporan Proyek */}
      {showReportModal && projectReport && (
        <Suspense fallback={null}>
          <ReportModal 
            projectReport={projectReport} 
            onClose={() => setShowReportModal(false)} 
          />
        </Suspense>
      )}

      {/* ======================================================== */}
      {/* UNIFIED TOP HUD: Left (Controls/Logo), Center (Time/Lighting), Right (Actions) */}
      {/* ======================================================== */}
      <header style={{
        position: 'absolute',
        top: 14,
        left: 16,
        right: 16,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {/* SISI KIRI: Foldable Controls HUD atau Badge Logo Kantor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto', minWidth: '160px' }}>
          {controlledNpcId ? (
            <div style={{
              background: 'rgba(15, 23, 42, 0.90)',
              backdropFilter: 'blur(12px)',
              color: '#e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.12)',
              overflow: 'hidden',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              maxWidth: '300px',
              userSelect: 'none'
            }}>
              {/* Header Bar Interaktif dengan Tombol Fold / Unfold */}
              <div 
                onClick={() => setIsControlHudCollapsed(prev => !prev)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 12px', cursor: 'pointer',
                  background: isControlHudCollapsed ? 'transparent' : 'rgba(30, 41, 59, 0.65)',
                  borderBottom: isControlHudCollapsed ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  transition: 'background 0.2s',
                  gap: '12px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)'}
                onMouseLeave={e => e.currentTarget.style.background = isControlHudCollapsed ? 'transparent' : 'rgba(30, 41, 59, 0.65)'}
                title={isControlHudCollapsed ? "Buka petunjuk kontrol (Expand)" : "Lipat petunjuk kontrol (Fold)"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px' }}>🎮</span>
                  <span style={{ 
                    fontWeight: 600, color: '#38bdf8', fontSize: '11px', 
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    whiteSpace: 'nowrap'
                  }}>
                    Kontrol ({cameraMode === 0 ? 'Iso' : cameraMode === 1 ? 'Over-Shoulder' : 'FPS'})
                  </span>
                </div>
                <div
                  style={{
                    width: '18px', height: '18px', borderRadius: '5px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', fontSize: '10px',
                    transition: 'transform 0.2s ease',
                    transform: isControlHudCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'
                  }}
                >
                  ▼
                </div>
              </div>

              {/* Konten Detail Kontrol (Dapat dilipat) */}
              {!isControlHudCollapsed && (
                <div style={{
                  padding: '8px 12px', fontSize: '11px', lineHeight: '1.6'
                }}>
                  {cameraMode === 0 ? (
                    <>
                      <div>🧭 <b>W / A / S / D</b>: Bergerak</div>
                      <div>⚡ <b>Shift</b>: Sprint | 🦘 <b>Spasi</b>: Lompat</div>
                      <div style={{ color: '#38bdf8' }}>🔄 <b>Q / E</b>: Putar Kamera Iso (45°)</div>
                      <div>🎥 <b>V</b>: Ganti Mode Kamera</div>
                    </>
                  ) : (
                    <>
                      <div>🎮 <b>W / S</b>: Maju/Mundur | ↔️ <b>A / D</b>: Strafe</div>
                      <div>🖱️ <b>Mouse</b>: Arah Pandang & Kamera</div>
                      <div>⚡ <b>Shift</b>: Sprint | 🦘 <b>Spasi</b>: Lompat</div>
                      <div>🎥 <b>V</b>: Ganti Mode Kamera</div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(10px)',
              color: '#f8fafc',
              borderRadius: '20px',
              padding: '6px 14px',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              alignSelf: 'flex-start'
            }}>
              <span style={{ fontSize: '14px' }}>🏢</span>
              <span style={{
                background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800
              }}>
                PANDEKODE HQ
              </span>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px #10b981'
              }} />
            </div>
          )}
        </div>

        {/* SISI TENGAH: Status Waktu Kantor & Pencahayaan Realistis Dinamis */}
        <div style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '6px 16px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          gap: '12px',
          color: '#f8fafc',
          whiteSpace: 'nowrap'
        }}>
          {/* Jam & Hari Kantor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px' }}>🕒</span>
            <span style={{
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: '13px',
              color: '#fbbf24',
              letterSpacing: '0.02em'
            }}>
              {["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][gameDay]}, {formatTime(gameTime)}
            </span>
          </div>

          {/* Pemisah Vertikal */}
          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.16)' }} />

          {/* Indikator Pencahayaan */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: lighting.badgeColor || '#38bdf8',
            fontWeight: 600
          }}>
            <span>{lighting.icon}</span>
            <span>{lighting.periodLabel}</span>
            {lighting.kelvin && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '1px 6px',
                borderRadius: '6px',
                fontSize: '10px',
                color: '#94a3b8',
                fontWeight: 500
              }}>
                {lighting.kelvin}K
              </span>
            )}
          </div>
        </div>

        {/* SISI KANAN: Cluster Tombol Aksi (Event, Sinergi, Badge, CEO) */}
        <div style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0
        }}>
          {/* Tombol Dokumen / Laporan Proyek */}
          {projectReport && (
            <button
              onClick={() => setShowReportModal(true)}
              style={{
                background: 'rgba(30, 41, 59, 0.88)',
                backdropFilter: 'blur(8px)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                padding: '7px 13px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(51, 65, 85, 0.95)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(30, 41, 59, 0.88)'}
              title="Buka Dokumen & Laporan Proyek Terkini"
            >
              <span>📄</span>
              <span>Laporan</span>
            </button>
          )}

          {/* Tombol Hubungan & Sinergi Tim */}
          <button
            onClick={() => setShowAffinityModal(true)}
            style={{
              background: 'rgba(30, 41, 59, 0.88)',
              backdropFilter: 'blur(8px)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              padding: '7px 13px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(51, 65, 85, 0.95)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(30, 41, 59, 0.88)'}
            title="Buka Relasi & Sinergi Antar-Staf"
          >
            <span>❤️</span>
            <span>Sinergi Tim</span>
          </button>

          {/* Tombol Pencapaian / Achievements */}
          <button
            onClick={() => setShowAchievementModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.92) 0%, rgba(217, 119, 6, 0.92) 100%)',
              color: '#ffffff',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              padding: '7px 13px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseOut={e => e.currentTarget.style.filter = 'none'}
            title="Buka Koleksi Badge Pencapaian"
          >
            <span>🏆</span>
            <span>Badge</span>
            <span style={{
              background: 'rgba(0, 0, 0, 0.28)',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              {unlockedBadgesCount}
            </span>
          </button>

          {/* Tombol Toggle CEO di Layar */}
          <button
            onClick={handleToggleCEO}
            style={{
              background: isCeoEnteringOffice 
                ? 'rgba(217, 119, 6, 0.95)' 
                : controlledNpcId === 'ceo' 
                  ? 'rgba(239, 68, 68, 0.9)' 
                  : 'rgba(79, 70, 229, 0.9)',
              color: 'white', border: 'none',
              padding: '7px 15px', borderRadius: '24px', cursor: 'pointer',
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'all 0.2s',
              fontSize: '12px'
            }}
            onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseOut={e => e.currentTarget.style.filter = 'none'}
          >
            {isCeoEnteringOffice 
              ? '🚶‍♂️ Masuk...' 
              : controlledNpcId === 'ceo' 
                ? '🛑 Berhenti CEO (R)' 
                : '👔 Main CEO (R)'}
          </button>
        </div>
      </header>

      <SettingsBox 
        timeMode={timeMode} setTimeMode={setTimeMode} 
        startTime={startTime} setStartTime={setStartTime} 
        endTime={endTime} setEndTime={setEndTime} 
        workingHoursEnabled={workingHoursEnabled} setWorkingHoursEnabled={setWorkingHoursEnabled}
        postFxSettings={postFxSettings} setPostFxSettings={setPostFxSettings}
        gameTime={gameTime} setGameTime={setGameTime}
        lighting={lighting}
      />

      <button 
        onClick={() => setShowQuitConfirm(true)}
        style={{
          position: 'absolute', bottom: 20, right: 80, width: 48, height: 48,
          backgroundColor: '#ef4444', color: 'white', borderRadius: '50%',
          border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          cursor: 'pointer', fontSize: 24, zIndex: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        title="Keluar & Simpan"
      >
        🚪
      </button>

      {selectedProfileId && (
        <Suspense fallback={null}>
          <ProfileModal 
            npcId={selectedProfileId}
            npc={initialNPCs[selectedProfileId]} 
            onClose={() => setSelectedProfileId(null)} 
            controlledNpcId={controlledNpcId}
            setControlledNpcId={setControlledNpcId}
            setIsCameraLocked={setIsCameraLocked}
            onToggleCEO={handleToggleCEO}
          />
        </Suspense>
      )}

      {isKanbanOpen && (
        <Suspense fallback={null}>
          <KanbanModal onClose={() => setIsKanbanOpen(false)} />
        </Suspense>
      )}
      {selectedInfoBoard && (
        <Suspense fallback={null}>
          <InfoModal info={selectedInfoBoard} onClose={() => setSelectedInfoBoard(null)} />
        </Suspense>
      )}

      {/* Banner Notifikasi & Respon Random Event Aktif */}
      <EventBanner />

      {/* Toast Notifikasi Perayaan Saat Badge Pencapaian Terbuka */}
      <AchievementToast />

      {/* Modal Galeri Pencapaian / Achievements */}
      {showAchievementModal && (
        <Suspense fallback={null}>
          <AchievementModal onClose={() => setShowAchievementModal(false)} />
        </Suspense>
      )}

      {/* Modal Jaringan Afinitas & Sinergi Tim */}
      {showAffinityModal && (
        <Suspense fallback={null}>
          <AffinityModal onClose={() => setShowAffinityModal(false)} />
        </Suspense>
      )}


      {showOvertimeDialog && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 2000, color: 'black', textAlign: 'center', fontFamily: 'sans-serif', minWidth: '350px'
        }}>
          <h2 style={{ marginTop: 0 }}>Waktu Pulang! 🏠</h2>
          <p style={{ color: '#4b5563', marginBottom: '24px' }}>Jam kerja Anda sudah habis. Apakah Anda ingin bersiap pulang sekarang atau menunda waktu pulang (lembur 1 Jam)?</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button 
              onClick={() => {
                setIsPlayerGoingHome(true);
                setShowOvertimeDialog(false);
              }}
              style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Berjalan Pulang
            </button>
            <button 
              onClick={() => {
                setPlayerEndTime(prev => prev + 60);
                setShowOvertimeDialog(false);
              }}
              style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Lembur (+1 Jam)
            </button>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Pulang Manual */}
      {showGoHomeConfirm && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', color: '#1f2937'
          }}>
            <h2 style={{ marginTop: 0 }}>Konfirmasi Pulang</h2>
            <p style={{ marginBottom: '24px' }}>Apakah anda ingin pulang?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                onClick={() => {
                  setShowGoHomeConfirm(false);
                  if (controlledNpcId) {
                    setDeskScreens(prev => ({ ...prev, [controlledNpcId]: false }));
                    playScreenSound(false);
                    setNpcState(prev => ({ ...prev, [controlledNpcId]: { ...prev[controlledNpcId], visible: false } }));
                    setControlledNpcId(null);
                    setIsCameraLocked(false);
                    setCameraMode(0);
                    setCeoOverridesWorkingHours(false);
                    setIsCeoEnteringOffice(false);
                  }
                }}
                style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Ya
              </button>
              <button 
                onClick={() => setShowGoHomeConfirm(false)}
                style={{ padding: '10px 20px', backgroundColor: '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Tidak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Quit */}
      {showQuitConfirm && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', color: '#1f2937'
          }}>
            <h2 style={{ marginTop: 0 }}>Kembali ke dunia nyata?</h2>
            <p style={{ marginBottom: '24px' }}>Semua progress dan state game akan disimpan.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button 
                onClick={() => {
                  setShowQuitConfirm(false);
                  handleQuit();
                }}
                style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Ya
              </button>
              <button 
                onClick={() => setShowQuitConfirm(false)}
                style={{ padding: '10px 20px', backgroundColor: '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Tidak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const App = () => {
  const [isStateLoaded, setIsStateLoaded] = useState(false);
  const [savedState, setSavedState] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);

  const [timeMode, setTimeMode] = useState("simulated");
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(true);
  const [startTime, setStartTime] = useState(8);
  const [endTime, setEndTime] = useState(17);
  const [postFxSettings, setPostFxSettings] = useState({
    bloom: true,
    ssao: true,
    vignette: true,
    toneMapping: true
  });

  useEffect(() => {
    const applyState = (data) => {
      if (data && Object.keys(data).length > 0) {
        setSavedState(data);
        if (data.timeMode) setTimeMode(data.timeMode);
        if (data.workingHoursEnabled !== undefined) setWorkingHoursEnabled(data.workingHoursEnabled);
        if (data.startTime !== undefined) setStartTime(data.startTime);
        if (data.endTime !== undefined) setEndTime(data.endTime);
      }
    };

    // Fetch state dari server (SQLite DB)
    fetch('http://localhost:3000/api/state')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          applyState(data);
        } else {
          try {
            const local = localStorage.getItem('pandekode_saved_game_state');
            if (local) applyState(JSON.parse(local));
          } catch (e) {}
        }
        setIsStateLoaded(true);
      })
      .catch(err => {
        console.warn("Gagal mengambil state dari server, membaca dari cache lokal:", err);
        try {
          const local = localStorage.getItem('pandekode_saved_game_state');
          if (local) applyState(JSON.parse(local));
        } catch (e) {}
        setIsStateLoaded(true);
      });
  }, []);

  if (!hasStarted) {
    return (
      <LandingPage 
        onStart={() => setHasStarted(true)} 
        timeMode={timeMode} setTimeMode={setTimeMode} 
        startTime={startTime} setStartTime={setStartTime} 
        endTime={endTime} setEndTime={setEndTime} 
        workingHoursEnabled={workingHoursEnabled} setWorkingHoursEnabled={setWorkingHoursEnabled}
        postFxSettings={postFxSettings} setPostFxSettings={setPostFxSettings}
      />
    );
  }

  if (!isStateLoaded) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827', color: 'white', fontFamily: 'sans-serif', flexDirection: 'column' }}>
        <h2>Memuat Lingkungan Kantor...</h2>
        <p style={{ color: '#9ca3af' }}>Sinkronisasi data dengan server</p>
      </div>
    );
  }

  return (
    <MainGame 
      savedState={savedState} 
      timeMode={timeMode} setTimeMode={setTimeMode} 
      startTime={startTime} setStartTime={setStartTime} 
      endTime={endTime} setEndTime={setEndTime} 
      workingHoursEnabled={workingHoursEnabled} setWorkingHoursEnabled={setWorkingHoursEnabled}
      postFxSettings={postFxSettings} setPostFxSettings={setPostFxSettings}
      onQuit={() => setHasStarted(false)}
    />
  );
};

export default App;
