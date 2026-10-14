// Data profil untuk semua NPC di PANDEKODE HQ
// Posisi desk diselaraskan tepat pada kursi kerja, bebas dari tabrakan fisik meja.

export const initialNPCs = {
  ceo: {
    name: "Bege (CEO/Founder)", color: "#4f46e5", desk: [11.0, 2, -10.3],
    fullName: "Bege", role: "CEO / Founder", gender: "Laki-laki",
    birthPlace: "Jakarta", birthDate: "1 Januari 1990", skills: ["Leadership", "Business Strategy", "Product Vision"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=CEO&backgroundColor=e5e7eb",
    persona: "Visioner, berkharisma, suportif, dan selalu melihat potensi masa depan. Mempercayai tim sepenuhnya serta mengarahkan strategi produk dengan tenang dan terukur.",
    traits: ["Visioner", "Strategis", "Suportif", "Solutif"],
    motto: "Inovasi terbaik lahir dari tim yang solid dan fokus pada solusi nyata bagi pengguna.",
    quirks: "Suka memikirkan roadmap sambil minum espresso di lounge, sering mengapresiasi pencapaian kecil tim."
  },
  agung: {
    name: "Agung (CTO/PM)", color: "#ea580c", desk: [-4.0, 2, -7.7],
    fullName: "Agung Setiawan", role: "Chief Technology Officer / PM", gender: "Laki-laki",
    birthPlace: "Surabaya", birthDate: "12 Agustus 1985", skills: ["Project Management", "System Architecture", "Leadership"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AgungSetiawan&backgroundColor=e5e7eb&top=shortFlat&clothing=blazerAndShirt&facialHair=beardMedium",
    persona: "Terstruktur, tegas, disiplin, dan berjiwa pemimpin teknis. Sangat menjaga timeline sprint tanpa mengorbankan kualitas arsitektur maupun kesehatan mental tim.",
    traits: ["Terstruktur", "Tegas", "Pragmatis", "Pelindung Tim"],
    motto: "Deliver value tepat waktu tanpa mengorbankan kualitas kode dan kapasitas tim.",
    quirks: "Selalu memantau Kanban, memastikan standup meeting padat dan tepat waktu."
  },
  bunga: {
    name: "Bunga (UI/UX)", color: "#ec4899", desk: [0.5, 2, -7.7],
    fullName: "Bunga Lestari", role: "UI/UX Designer", gender: "Perempuan",
    birthPlace: "Bandung", birthDate: "3 Maret 1996", skills: ["Figma", "User Research", "Interaction Design"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=BungaLestari&backgroundColor=e5e7eb&top=bob&clothing=collarAndSweater",
    persona: "Empatis tinggi terhadap user, ekspresif, ceria, dan perfeksionis visual. Peka terhadap detail ruang, kontras, dan kemudahan pengalaman pengguna.",
    traits: ["Empatis", "Kreatif", "Perfeksionis Visual", "Ceria"],
    motto: "Desain yang baik membuat hal rumit terasa sederhana dan menyenangkan.",
    quirks: "Langsung sadar jika padding meleset 1px, gemar membawa tumbler lucu ke meja kerja."
  },
  candra: {
    name: "Candra (FE)", color: "#3b82f6", desk: [5.0, 2, -7.7],
    fullName: "Candra Wijaya", role: "Frontend Developer", gender: "Laki-laki",
    birthPlace: "Jakarta", birthDate: "21 November 1994", skills: ["React", "JavaScript", "Tailwind CSS", "Three.js"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=CandraWijaya&backgroundColor=e5e7eb&top=shortWaved&clothing=hoodie",
    persona: "Kasual, eksploratif, humoris, dan antusias dengan teknologi interaktif modern. Senang mengubah mockup statis menjadi antarmuka yang hidup dan responsif.",
    traits: ["Eksploratif", "Kasual", "Detail Animasi", "Humoris"],
    motto: "Kode yang rapi menghasilkan antarmuka yang gesit dan interaktif.",
    quirks: "Selalu pakai headphone besar saat ngoding, suka ngemil snack saat debugging layout."
  },
  dika: {
    name: "Dika (BE)", color: "#10b981", desk: [-4.0, 2, -6.3],
    fullName: "Dika Pratama", role: "Backend Developer", gender: "Laki-laki",
    birthPlace: "Yogyakarta", birthDate: "5 Juli 1993", skills: ["Node.js", "PostgreSQL", "API Design", "Docker"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DikaPratama&backgroundColor=e5e7eb&top=sides&clothing=shirtCrewNeck",
    persona: "Pendiam, observan, sangat logis, dan memiliki humor kering. Sangat peduli integritas data, query optimization, dan reliabilitas endpoint API.",
    traits: ["Analitis", "Kritis", "Dry Humor", "Reliable"],
    motto: "Di balik tampilan yang indah, ada arsitektur backend yang kokoh dan efisien.",
    quirks: "Peminum setia kopi hitam pekat tanpa gula, lebih suka dokumentasi ringkas daripada meeting panjang."
  },
  eka: {
    name: "Eka (QA)", color: "#8b5cf6", desk: [0.5, 2, -6.3],
    fullName: "Eka Putri", role: "Quality Assurance", gender: "Perempuan",
    birthPlace: "Semarang", birthDate: "18 Februari 1995", skills: ["Automated Testing", "Cypress", "Manual Testing"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=EkaPutri&backgroundColor=e5e7eb&top=straight01&clothing=overall",
    persona: "Meticulous (sangat teliti), skeptis konstruktif, dan pantang menyerah dalam memburu bug. Menjadi benteng pertahanan utama kualitas software sebelum rilis.",
    traits: ["Meticulous", "Skeptis Konstruktif", "Gigih", "Objektif"],
    motto: "Mencegah satu bug di awal lebih berharga daripada memperbaiki puluhan komplain di produksi.",
    quirks: "Gemar menguji skenario tak biasa (klik spam cepat, input liar), tersenyum puas saat menemukan edge case."
  },
  fajar: {
    name: "Fajar (DevOps)", color: "#f59e0b", desk: [5.0, 2, -6.3],
    fullName: "Fajar Nugroho", role: "DevOps Engineer", gender: "Laki-laki",
    birthPlace: "Malang", birthDate: "30 September 1992", skills: ["AWS", "Kubernetes", "CI/CD", "Linux"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=FajarNugroho&backgroundColor=e5e7eb&top=dreads01&facialHair=moustacheMagnum&clothing=graphicShirt",
    persona: "Tenang di bawah tekanan, metodis, dan penganut otomatisasi penuh. Percaya bahwa sistem yang baik adalah sistem yang dapat memulihkan dirinya sendiri.",
    traits: ["Cool Under Pressure", "Automasi Fanatik", "Metodis", "Tenang"],
    motto: "Jika harus dilakukan lebih dari dua kali, otomatisasikan.",
    quirks: "Monitor selalu penuh grafik Grafana bergerak, paling tenang saat ada alert server."
  },
  gita: {
    name: "Gita (Reception)", color: "#14b8a6", desk: [11.0, 2, 0.95],
    fullName: "Gita Maharani", role: "Resepsionis / Admin", gender: "Perempuan",
    birthPlace: "Denpasar", birthDate: "10 Desember 1998", skills: ["Komunikasi", "Administrasi", "Customer Service"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=GitaMaharani&backgroundColor=e5e7eb&top=hijab&clothing=shirtScoopNeck",
    persona: "Ramah, anggun, hangat, dan sangat terorganisir. Menjadi wajah pertama kantor yang menyambut siapapun dengan senyuman tulus dan ketertiban administrasi.",
    traits: ["Ramah", "Anggun", "Terorganisir", "Cekatan"],
    motto: "Kesan pertama yang hangat membangun kepercayaan dan kenyamanan bagi setiap orang.",
    quirks: "Meja kerjanya paling rapi dan harum di kantor, penuh catatan sticky notes warna-warni tertata rapi."
  },
  hadi: {
    name: "Hadi (Office Boy)", color: "#6b7280", desk: [-10.5, 2, 6.5],
    fullName: "Hadi Suwarno", role: "Office Boy", gender: "Laki-laki",
    birthPlace: "Solo", birthDate: "22 Mei 1980", skills: ["Maintenance", "Kebersihan", "Hospitality"],
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=HadiSuwarno&backgroundColor=e5e7eb&top=theCaesar&clothing=shirtVNeck",
    persona: "Rendah hati, kebapakan, rajin, tulus, dan penuh perhatian. Menjaga kenyamanan dan kebersihan kantor dengan sepenuh hati seperti keluarga sendiri.",
    traits: ["Rendah Hati", "Kebapakan", "Tulus", "Sangat Perhatian"],
    motto: "Kenyamanan rekan-rekan bekerja adalah kebahagiaan dan pengabdian saya setiap hari.",
    quirks: "Hapal racikan kopi/teh favorit setiap staf tanpa perlu ditanya, suka merapikan pantry sambil bersenandung kecil."
  }
};

/**
 * Generate offset kedatangan dan kepulangan acak untuk setiap NPC.
 * Dipanggil saat setup awal dan setiap tengah malam (hari baru) di game loop.
 */
export const generateAllOffsets = () => {
  const offsets = {};
  let maxDeparture = 0;

  Object.keys(initialNPCs).forEach(k => {
    if (k !== "hadi") {
      const rand = Math.random();
      let arrivalOffset = 0;
      if (rand < 0.2) arrivalOffset = Math.floor(Math.random() * 30) + 5;
      else if (rand < 0.4) arrivalOffset = -(Math.floor(Math.random() * 30) + 5);

      const rand2 = Math.random();
      let departureOffset = 0;
      if (rand2 < 0.2) departureOffset = -(Math.floor(Math.random() * 30) + 5);
      else if (rand2 < 0.4) departureOffset = Math.floor(Math.random() * 120) + 15;

      offsets[k] = { arrivalOffset, departureOffset };
      if (departureOffset > maxDeparture) maxDeparture = departureOffset;
    }
  });

  // Khusus OB (Hadi): Datang 1 jam awal, pulang 15 menit setelah orang paling lambat pulang
  offsets["hadi"] = {
    arrivalOffset: -60,
    departureOffset: maxDeparture + 15
  };

  return offsets;
};

/**
 * Inisialisasi state awal seluruh NPC (posisi di meja, visible, dsb).
 */
export const setupInitialNPCs = () => {
  const state = {};
  const allOffsets = generateAllOffsets();
  Object.keys(initialNPCs).forEach(k => {
    state[k] = {
      ...initialNPCs[k],
      target: initialNPCs[k].desk,
      speech: "",
      visible: true,
      currentPos: initialNPCs[k].desk,
      intent: "DESK",
      arrivalOffset: allOffsets[k].arrivalOffset,
      departureOffset: allOffsets[k].departureOffset
    };
  });
  return state;
};
