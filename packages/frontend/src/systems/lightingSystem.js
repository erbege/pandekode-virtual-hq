import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// Inisialisasi shader Three.js agar mendukung RectAreaLight pada MeshStandardMaterial
let uniformsInitialized = false;
export function initRectAreaLights() {
  if (!uniformsInitialized && typeof window !== 'undefined') {
    RectAreaLightUniformsLib.init();
    uniformsInitialized = true;
  }
}

// Inisialisasi otomatis saat modul di-import di browser
initRectAreaLights();

/**
 * Keyframe tabel waktu 24-jam pencahayaan realistis kantor:
 * - Pagi & Sore: Warm / Hangat (2700K - 3200K, amber/golden glow)
 * - Siang: Cool / Sejuk (5500K - 6500K, cool white neon & bright sun)
 * - Malam: Warm Cozy interior lighting (fokus pada lampu meja kerja)
 *
 * Setiap keyframe juga mengatur:
 * - skyColor / groundColor untuk HemisphereLight
 * - grassColor dan pavingColor untuk suasana luar gedung
 * - environmentIntensity (HDRI) dan fogColor/fogDensity
 * - isNight flag untuk memperkuat bloom & vignette
 */
const LIGHT_KEYFRAMES = [
  {
    hour: 0,
    period: 'malam',
    periodLabel: 'Malam (Warm Interior)',
    tempLabel: '2400K (Warm Tungsten)',
    icon: '🌙',
    isNight: true,
    neonColor: '#fdba74',
    neonIntensity: 3.6,
    deskColor: '#f59e0b',
    deskIntensity: 1.5,
    ambientColor: '#1e293b',
    ambientIntensity: 0.16,
    sunColor: '#1e1b4b',
    sunIntensity: 0.03,
    sunPos: [5, 3, -10],
    skyColor: '#030712',
    groundColor: '#02040a',
    hemiIntensity: 0.18,
    grassColor: '#1a2e1a',
    pavingColor: '#3d4654',
    envIntensity: 0.08,
    fogColor: '#030712',
    fogNear: 150,
    fogFar: 600,
    screenEmissiveMult: 1.4,
  },
  {
    hour: 5.5,
    period: 'subuh',
    periodLabel: 'Subuh (Fajar)',
    tempLabel: '2600K (Dawn Warmth)',
    icon: '🌄',
    isNight: false,
    neonColor: '#fed7aa',
    neonIntensity: 2.8,
    deskColor: '#f59e0b',
    deskIntensity: 1.2,
    ambientColor: '#1e293b',
    ambientIntensity: 0.20,
    sunColor: '#ea580c',
    sunIntensity: 0.2,
    sunPos: [25, 6, 15],
    skyColor: '#374151',
    groundColor: '#1e293b',
    hemiIntensity: 0.22,
    grassColor: '#263426',
    pavingColor: '#5c6370',
    envIntensity: 0.18,
    fogColor: '#374151',
    fogNear: 80,
    fogFar: 300,
    screenEmissiveMult: 1.2,
  },
  {
    hour: 6.5,
    period: 'pagi',
    periodLabel: 'Pagi (Warm Sunrise)',
    tempLabel: '3000K (Warm Golden)',
    icon: '🌅',
    isNight: false,
    neonColor: '#fde68a',
    neonIntensity: 2.2,
    deskColor: '#fbbf24',
    deskIntensity: 1.0,
    ambientColor: '#fef3c7',
    ambientIntensity: 0.25,
    sunColor: '#f97316',
    sunIntensity: 0.55,
    sunPos: [20, 12, 12],
    skyColor: '#fed7aa',
    groundColor: '#92400e',
    hemiIntensity: 0.30,
    grassColor: '#2d5a1e',
    pavingColor: '#8a9099',
    envIntensity: 0.32,
    fogColor: '#fef3c7',
    fogNear: 120,
    fogFar: 500,
    screenEmissiveMult: 1.0,
  },
  {
    hour: 8.5,
    period: 'pagi',
    periodLabel: 'Pagi Kerja (Soft Warm)',
    tempLabel: '4000K (Neutral Warm)',
    icon: '🌤️',
    isNight: false,
    neonColor: '#fef08a',
    neonIntensity: 1.8,
    deskColor: '#fde047',
    deskIntensity: 0.6,
    ambientColor: '#ffffff',
    ambientIntensity: 0.28,
    sunColor: '#fde047',
    sunIntensity: 0.85,
    sunPos: [15, 20, 10],
    skyColor: '#e0f2fe',
    groundColor: '#92400e',
    hemiIntensity: 0.35,
    grassColor: '#355e2b',
    pavingColor: '#94a3b8',
    envIntensity: 0.38,
    fogColor: '#e0f2fe',
    fogNear: 150,
    fogFar: 600,
    screenEmissiveMult: 0.85,
  },
  {
    hour: 11.0,
    period: 'siang',
    periodLabel: 'Siang (Cool White Neon)',
    tempLabel: '6500K (Cool Daylight)',
    icon: '☀️',
    isNight: false,
    neonColor: '#e0f2fe',
    neonIntensity: 1.4,
    deskColor: '#f0f9ff',
    deskIntensity: 0.3,
    ambientColor: '#f1f5f9',
    ambientIntensity: 0.28,
    sunColor: '#ffffff',
    sunIntensity: 0.90,
    sunPos: [5, 28, 5],
    skyColor: '#bae6fd',
    groundColor: '#6b7280',
    hemiIntensity: 0.38,
    grassColor: '#355e2b',
    pavingColor: '#94a3b8',
    envIntensity: 0.38,
    fogColor: '#e0f2fe',
    fogNear: 180,
    fogFar: 800,
    screenEmissiveMult: 0.7,
  },
  {
    hour: 13.5,
    period: 'siang',
    periodLabel: 'Siang (Cool White Neon)',
    tempLabel: '6500K (Cool Daylight)',
    icon: '☀️',
    isNight: false,
    neonColor: '#e0f2fe',
    neonIntensity: 1.4,
    deskColor: '#f0f9ff',
    deskIntensity: 0.3,
    ambientColor: '#f1f5f9',
    ambientIntensity: 0.28,
    sunColor: '#ffffff',
    sunIntensity: 0.90,
    sunPos: [-2, 28, 5],
    skyColor: '#bae6fd',
    groundColor: '#6b7280',
    hemiIntensity: 0.38,
    grassColor: '#355e2b',
    pavingColor: '#94a3b8',
    envIntensity: 0.38,
    fogColor: '#e0f2fe',
    fogNear: 180,
    fogFar: 800,
    screenEmissiveMult: 0.7,
  },
  {
    hour: 15.5,
    period: 'sore',
    periodLabel: 'Sore (Transisi Hangat)',
    tempLabel: '4200K (Golden Afternoon)',
    icon: '🌤️',
    isNight: false,
    neonColor: '#fef08a',
    neonIntensity: 1.8,
    deskColor: '#fde047',
    deskIntensity: 0.6,
    ambientColor: '#fffbeb',
    ambientIntensity: 0.28,
    sunColor: '#fde047',
    sunIntensity: 0.80,
    sunPos: [-12, 18, 8],
    skyColor: '#fef3c7',
    groundColor: '#78716c',
    hemiIntensity: 0.35,
    grassColor: '#355e2b',
    pavingColor: '#94a3b8',
    envIntensity: 0.38,
    fogColor: '#fef3c7',
    fogNear: 150,
    fogFar: 600,
    screenEmissiveMult: 0.85,
  },
  {
    hour: 17.0,
    period: 'sore',
    periodLabel: 'Sore (Warm Golden Hour)',
    tempLabel: '3000K (Warm Amber)',
    icon: '🌇',
    isNight: false,
    neonColor: '#fed7aa',
    neonIntensity: 2.2,
    deskColor: '#fbbf24',
    deskIntensity: 1.0,
    ambientColor: '#fed7aa',
    ambientIntensity: 0.25,
    sunColor: '#f97316',
    sunIntensity: 0.55,
    sunPos: [-18, 10, 10],
    skyColor: '#fdba74',
    groundColor: '#78350f',
    hemiIntensity: 0.30,
    grassColor: '#2d4a22',
    pavingColor: '#847a70',
    envIntensity: 0.30,
    fogColor: '#fed7aa',
    fogNear: 120,
    fogFar: 450,
    screenEmissiveMult: 1.0,
  },
  {
    hour: 18.5,
    period: 'senja',
    periodLabel: 'Senja (Warm Sunset)',
    tempLabel: '2600K (Sunset Glow)',
    icon: '🌆',
    isNight: false,
    neonColor: '#fdba74',
    neonIntensity: 2.8,
    deskColor: '#f59e0b',
    deskIntensity: 1.3,
    ambientColor: '#78350f',
    ambientIntensity: 0.18,
    sunColor: '#ea580c',
    sunIntensity: 0.20,
    sunPos: [-24, 4, 12],
    skyColor: '#78350f',
    groundColor: '#1c1917',
    hemiIntensity: 0.22,
    grassColor: '#233020',
    pavingColor: '#5c5850',
    envIntensity: 0.20,
    fogColor: '#78350f',
    fogNear: 80,
    fogFar: 300,
    screenEmissiveMult: 1.2,
  },
  {
    hour: 20.0,
    period: 'malam',
    periodLabel: 'Malam (Warm Interior)',
    tempLabel: '2400K (Warm Cozy)',
    icon: '🌙',
    isNight: true,
    neonColor: '#fdba74',
    neonIntensity: 3.6,
    deskColor: '#f59e0b',
    deskIntensity: 1.5,
    ambientColor: '#1e293b',
    ambientIntensity: 0.16,
    sunColor: '#1e1b4b',
    sunIntensity: 0.03,
    sunPos: [-15, 3, -10],
    skyColor: '#030712',
    groundColor: '#02040a',
    hemiIntensity: 0.18,
    grassColor: '#1a2e1a',
    pavingColor: '#3d4654',
    envIntensity: 0.08,
    fogColor: '#030712',
    fogNear: 150,
    fogFar: 600,
    screenEmissiveMult: 1.4,
  },
  {
    hour: 24.0,
    period: 'malam',
    periodLabel: 'Malam (Warm Interior)',
    tempLabel: '2400K (Warm Tungsten)',
    icon: '🌙',
    isNight: true,
    neonColor: '#fdba74',
    neonIntensity: 3.6,
    deskColor: '#f59e0b',
    deskIntensity: 1.5,
    ambientColor: '#1e293b',
    ambientIntensity: 0.16,
    sunColor: '#1e1b4b',
    sunIntensity: 0.03,
    sunPos: [5, 3, -10],
    skyColor: '#030712',
    groundColor: '#02040a',
    hemiIntensity: 0.18,
    grassColor: '#1a2e1a',
    pavingColor: '#3d4654',
    envIntensity: 0.08,
    fogColor: '#030712',
    fogNear: 150,
    fogFar: 600,
    screenEmissiveMult: 1.4,
  }
];

// Helper lerp numerik
function lerp(a, b, t) { return a + (b - a) * t; }

// Helper lerp warna Three.Color
function lerpColor(hex1, hex2, t) {
  return '#' + new THREE.Color(hex1).lerp(new THREE.Color(hex2), t).getHexString();
}

/**
 * Menghitung interpolasi pencahayaan berdasarkan waktu game saat ini (0..1440 menit)
 */
export function getLightingForGameTime(gameTime) {
  const normalizedMinutes = ((gameTime % 1440) + 1440) % 1440;
  const hour = normalizedMinutes / 60;

  // Temukan dua keyframe pengapit
  let idx = 0;
  while (idx < LIGHT_KEYFRAMES.length - 1 && LIGHT_KEYFRAMES[idx + 1].hour <= hour) {
    idx++;
  }

  const k1 = LIGHT_KEYFRAMES[idx];
  const k2 = LIGHT_KEYFRAMES[idx + 1] || LIGHT_KEYFRAMES[0];
  const span = k2.hour - k1.hour;
  const t = span > 0 ? (hour - k1.hour) / span : 0;

  // Interpolasi warna
  const ceilingColor = lerpColor(k1.neonColor, k2.neonColor, t);
  const deskColor = lerpColor(k1.deskColor, k2.deskColor, t);
  const ambientColor = lerpColor(k1.ambientColor, k2.ambientColor, t);
  const sunColor = lerpColor(k1.sunColor, k2.sunColor, t);
  const skyColor = lerpColor(k1.skyColor, k2.skyColor, t);
  const groundColor = lerpColor(k1.groundColor, k2.groundColor, t);
  const grassColor = lerpColor(k1.grassColor, k2.grassColor, t);
  const pavingColor = lerpColor(k1.pavingColor, k2.pavingColor, t);
  const fogColor = lerpColor(k1.fogColor, k2.fogColor, t);

  // Interpolasi numerik
  const ceilingIntensity = Number(lerp(k1.neonIntensity, k2.neonIntensity, t).toFixed(2));
  const deskIntensity = Number(lerp(k1.deskIntensity, k2.deskIntensity, t).toFixed(2));
  const ambientIntensity = Number(lerp(k1.ambientIntensity, k2.ambientIntensity, t).toFixed(2));
  const sunIntensity = Number(lerp(k1.sunIntensity, k2.sunIntensity, t).toFixed(2));
  const hemiIntensity = Number(lerp(k1.hemiIntensity, k2.hemiIntensity, t).toFixed(2));
  const envIntensity = Number(lerp(k1.envIntensity, k2.envIntensity, t).toFixed(2));
  const fogNear = Number(lerp(k1.fogNear, k2.fogNear, t).toFixed(0));
  const fogFar = Number(lerp(k1.fogFar, k2.fogFar, t).toFixed(0));
  const screenEmissiveMult = Number(lerp(k1.screenEmissiveMult, k2.screenEmissiveMult, t).toFixed(2));

  const sunPosition = [
    lerp(k1.sunPos[0], k2.sunPos[0], t),
    lerp(k1.sunPos[1], k2.sunPos[1], t),
    lerp(k1.sunPos[2], k2.sunPos[2], t),
  ];

  // Kategori pencahayaan aktif
  const isCool = hour >= 10.5 && hour < 15.0;
  const isWarm = !isCool;
  const isNight = (hour >= 19.5 || hour < 5.5);

  return {
    hour,
    period: k1.period,
    periodLabel: t < 0.5 ? k1.periodLabel : k2.periodLabel,
    tempLabel: t < 0.5 ? k1.tempLabel : k2.tempLabel,
    icon: t < 0.5 ? k1.icon : k2.icon,
    isWarm,
    isCool,
    isNight,
    lightingModeDesc: isCool ? 'Cool White (Siang Hari)' : 'Warm Tone (Pagi/Sore/Malam)',
    badgeColor: isCool ? '#38bdf8' : '#fbbf24',
    
    // Warna untuk RectAreaLight (Lampu Neon Langit-langit)
    ceilingColor,
    ceilingIntensity,
    
    // Warna untuk PointLight (Lampu Meja Kerja)
    deskColor,
    deskIntensity,
    
    // Warna dan intensitas matahari & ambient
    ambientColor,
    ambientIntensity,
    sunColor,
    sunIntensity,
    sunPosition,

    // HemisphereLight (langit atas vs pantulan tanah)
    skyColor,
    groundColor,
    hemiIntensity,

    // Warna lingkungan luar (rumput, paving)
    grassColor,
    pavingColor,

    // Environment HDRI intensity
    envIntensity,

    // Fog
    fogColor,
    fogNear,
    fogFar,

    // Pengali emissive layar (lebih terang saat gelap)
    screenEmissiveMult,
  };
}

export default getLightingForGameTime;
