// Egyptian Governorates with sub-areas (districts/cities)
// Bilingual: English + Arabic
// No API calls — static data for zero-cost location search

export interface SubArea {
  value: string;   // URL-safe slug
  en: string;
  ar: string;
}

export interface Governorate {
  value: string;   // URL-safe slug
  en: string;
  ar: string;
  subAreas: SubArea[];
}

export const EGYPT_LOCATIONS: Governorate[] = [
  {
    value: "cairo", en: "Cairo", ar: "القاهرة",
    subAreas: [
      { value: "new-cairo",          en: "New Cairo",            ar: "القاهرة الجديدة" },
      { value: "fifth-settlement",   en: "Fifth Settlement",     ar: "التجمع الخامس" },
      { value: "nasr-city",          en: "Nasr City",            ar: "مدينة نصر" },
      { value: "heliopolis",         en: "Heliopolis",           ar: "مصر الجديدة" },
      { value: "maadi",              en: "Maadi",                ar: "المعادي" },
      { value: "zamalek",            en: "Zamalek",              ar: "الزمالك" },
      { value: "downtown",           en: "Downtown",             ar: "وسط البلد" },
      { value: "rehab",              en: "Rehab City",           ar: "مدينة الرحاب" },
      { value: "shorouk",            en: "Shorouk City",         ar: "مدينة الشروق" },
      { value: "badr",               en: "Badr City",            ar: "مدينة بدر" },
      { value: "ain-shams",          en: "Ain Shams",            ar: "عين شمس" },
      { value: "shubra",             en: "Shubra",               ar: "شبرا" },
      { value: "tura",               en: "Tura",                 ar: "طرة" },
      { value: "katameya",           en: "Katameya",             ar: "القطامية" },
      { value: "new-capital",        en: "New Administrative Capital", ar: "العاصمة الإدارية الجديدة" },
      { value: "obour",              en: "Obour City",           ar: "مدينة العبور" },
      { value: "tagammu",            en: "First Settlement",     ar: "التجمع الأول" },
    ],
  },
  {
    value: "giza", en: "Giza", ar: "الجيزة",
    subAreas: [
      { value: "sheikh-zayed",       en: "Sheikh Zayed",         ar: "الشيخ زايد" },
      { value: "6th-october",        en: "6th of October",       ar: "السادس من أكتوبر" },
      { value: "dokki",              en: "Dokki",                ar: "الدقي" },
      { value: "mohandessin",        en: "Mohandessin",          ar: "المهندسين" },
      { value: "agouza",             en: "Agouza",               ar: "العجوزة" },
      { value: "haram",              en: "Haram",                ar: "الهرم" },
      { value: "faisal",             en: "Faisal",               ar: "فيصل" },
      { value: "hadayek-ahram",      en: "Hadayek El Ahram",     ar: "حدائق الأهرام" },
      { value: "wahat",              en: "Wahat Road",           ar: "طريق الواحات" },
      { value: "imbaba",             en: "Imbaba",               ar: "إمبابة" },
      { value: "boulaq-dakrour",     en: "Boulaq Dakrour",       ar: "بولاق الدكرور" },
    ],
  },
  {
    value: "alexandria", en: "Alexandria", ar: "الإسكندرية",
    subAreas: [
      { value: "smouha",             en: "Smouha",               ar: "سموحة" },
      { value: "stanley",            en: "Stanley",              ar: "ستانلي" },
      { value: "glim",               en: "Glim",                 ar: "جليم" },
      { value: "miami",              en: "Miami",                ar: "ميامي" },
      { value: "roushdy",            en: "Roushdy",              ar: "روشدي" },
      { value: "cleopatra",          en: "Cleopatra",            ar: "كليوباترا" },
      { value: "montazah",           en: "Montazah",             ar: "المنتزه" },
      { value: "borg-el-arab",       en: "Borg El Arab",         ar: "برج العرب" },
      { value: "agami",              en: "Agami",                ar: "العجمي" },
      { value: "mandara",            en: "Mandara",              ar: "المندرة" },
      { value: "san-stefano",        en: "San Stefano",          ar: "سان ستيفانو" },
      { value: "zizinia",            en: "Zizinia",              ar: "زيزينيا" },
      { value: "ibrahimia",          en: "Ibrahimia",            ar: "الإبراهيمية" },
    ],
  },
  {
    value: "north-coast", en: "North Coast", ar: "الساحل الشمالي",
    subAreas: [
      { value: "sidi-abdelrahman",   en: "Sidi Abdelrahman",     ar: "سيدي عبد الرحمن" },
      { value: "marassi",            en: "Marassi",              ar: "مراسي" },
      { value: "hacienda",           en: "Hacienda Bay",         ar: "هاسيندا باي" },
      { value: "fouka",              en: "Fouka Bay",            ar: "فوكة باي" },
      { value: "alamein",            en: "El Alamein",           ar: "العلمين" },
      { value: "new-alamein",        en: "New Alamein City",     ar: "مدينة العلمين الجديدة" },
      { value: "ras-el-hekma",       en: "Ras El Hekma",        ar: "رأس الحكمة" },
      { value: "marsa-matrouh",      en: "Marsa Matrouh",        ar: "مرسى مطروح" },
    ],
  },
  {
    value: "ain-sokhna", en: "Ain Sokhna", ar: "العين السخنة",
    subAreas: [
      { value: "porto-sokhna",       en: "Porto Sokhna",         ar: "بورتو السخنة" },
      { value: "mountain-view-sokhna", en: "Mountain View",      ar: "ماونتن فيو السخنة" },
      { value: "blumar",             en: "Blumar",               ar: "بلومار" },
      { value: "sokhna-road",        en: "Sokhna Road",          ar: "طريق السخنة" },
    ],
  },
  {
    value: "red-sea", en: "Red Sea", ar: "البحر الأحمر",
    subAreas: [
      { value: "hurghada",           en: "Hurghada",             ar: "الغردقة" },
      { value: "el-gouna",           en: "El Gouna",             ar: "الجونة" },
      { value: "sahl-hasheesh",      en: "Sahl Hasheesh",        ar: "سهل حشيش" },
      { value: "makadi-bay",         en: "Makadi Bay",           ar: "مكادي باي" },
      { value: "soma-bay",           en: "Soma Bay",             ar: "سوما باي" },
    ],
  },
  {
    value: "south-sinai", en: "South Sinai", ar: "جنوب سيناء",
    subAreas: [
      { value: "sharm-el-sheikh",    en: "Sharm El Sheikh",      ar: "شرم الشيخ" },
      { value: "dahab",              en: "Dahab",                ar: "دهب" },
      { value: "nuweiba",            en: "Nuweiba",              ar: "نويبع" },
      { value: "taba",               en: "Taba",                 ar: "طابا" },
    ],
  },
  {
    value: "qalyubia", en: "Qalyubia", ar: "القليوبية",
    subAreas: [
      { value: "benha",              en: "Benha",                ar: "بنها" },
      { value: "qalyub",             en: "Qalyub",               ar: "قليوب" },
      { value: "khanka",             en: "Khanka",               ar: "الخانكة" },
      { value: "shubra-khayma",      en: "Shubra El Kheima",     ar: "شبرا الخيمة" },
    ],
  },
  {
    value: "dakahlia", en: "Dakahlia", ar: "الدقهلية",
    subAreas: [
      { value: "mansoura",           en: "Mansoura",             ar: "المنصورة" },
      { value: "new-mansoura",       en: "New Mansoura",         ar: "المنصورة الجديدة" },
      { value: "talkha",             en: "Talkha",               ar: "طلخا" },
      { value: "mit-ghamr",          en: "Mit Ghamr",            ar: "ميت غمر" },
    ],
  },
  {
    value: "sharqia", en: "Sharqia", ar: "الشرقية",
    subAreas: [
      { value: "zagazig",            en: "Zagazig",              ar: "الزقازيق" },
      { value: "10th-ramadan",       en: "10th of Ramadan",      ar: "العاشر من رمضان" },
      { value: "bilbeis",            en: "Bilbeis",              ar: "بلبيس" },
    ],
  },
  {
    value: "gharbia", en: "Gharbia", ar: "الغربية",
    subAreas: [
      { value: "tanta",              en: "Tanta",                ar: "طنطا" },
      { value: "mahalla",            en: "El Mahalla El Kubra",  ar: "المحلة الكبرى" },
      { value: "kafr-el-zayat",      en: "Kafr El Zayat",        ar: "كفر الزيات" },
    ],
  },
  {
    value: "beheira", en: "Beheira", ar: "البحيرة",
    subAreas: [
      { value: "damanhur",           en: "Damanhur",             ar: "دمنهور" },
      { value: "kafr-el-dawwar",     en: "Kafr El Dawwar",       ar: "كفر الدوار" },
      { value: "rashid",             en: "Rashid (Rosetta)",     ar: "رشيد" },
    ],
  },
  {
    value: "port-said", en: "Port Said", ar: "بورسعيد",
    subAreas: [
      { value: "port-fouad",         en: "Port Fouad",           ar: "بور فؤاد" },
      { value: "arab-district",      en: "Arab District",        ar: "حي العرب" },
    ],
  },
  {
    value: "ismailia", en: "Ismailia", ar: "الإسماعيلية",
    subAreas: [
      { value: "ismailia-city",      en: "Ismailia City",        ar: "مدينة الإسماعيلية" },
      { value: "abu-soweir",         en: "Abu Soweir",           ar: "أبو صوير" },
    ],
  },
  {
    value: "suez", en: "Suez", ar: "السويس",
    subAreas: [
      { value: "suez-city",          en: "Suez City",            ar: "مدينة السويس" },
      { value: "ain-sokhna-suez",    en: "Ain Sokhna (Suez)",    ar: "عين السخنة" },
    ],
  },
  {
    value: "fayoum", en: "Fayoum", ar: "الفيوم",
    subAreas: [
      { value: "fayoum-city",        en: "Fayoum City",          ar: "مدينة الفيوم" },
      { value: "tunis-village",      en: "Tunis Village",        ar: "قرية تونس" },
    ],
  },
  {
    value: "luxor", en: "Luxor", ar: "الأقصر",
    subAreas: [
      { value: "luxor-city",         en: "Luxor City",           ar: "مدينة الأقصر" },
      { value: "west-bank",          en: "West Bank",            ar: "البر الغربي" },
      { value: "karnak",             en: "Karnak",               ar: "الكرنك" },
    ],
  },
  {
    value: "aswan", en: "Aswan", ar: "أسوان",
    subAreas: [
      { value: "aswan-city",         en: "Aswan City",           ar: "مدينة أسوان" },
      { value: "new-aswan",          en: "New Aswan",            ar: "أسوان الجديدة" },
    ],
  },
];

// Flat list of all areas for search matching
export interface FlatLocation {
  govValue: string;
  govEn: string;
  govAr: string;
  subValue?: string;
  subEn?: string;
  subAr?: string;
  // display label
  displayEn: string;
  displayAr: string;
  searchKey: string; // lowercase for matching
}

export const FLAT_LOCATIONS: FlatLocation[] = [];

for (const gov of EGYPT_LOCATIONS) {
  // Governorate itself
  FLAT_LOCATIONS.push({
    govValue: gov.value, govEn: gov.en, govAr: gov.ar,
    displayEn: gov.en, displayAr: gov.ar,
    searchKey: `${gov.en} ${gov.ar}`.toLowerCase(),
  });
  // Sub-areas
  for (const sub of gov.subAreas) {
    FLAT_LOCATIONS.push({
      govValue: gov.value, govEn: gov.en, govAr: gov.ar,
      subValue: sub.value, subEn: sub.en, subAr: sub.ar,
      displayEn: `${sub.en}, ${gov.en}`,
      displayAr: `${sub.ar}، ${gov.ar}`,
      searchKey: `${sub.en} ${sub.ar} ${gov.en} ${gov.ar}`.toLowerCase(),
    });
  }
}

// ── Canonical English city resolver ──────────────────────────────────────────
// Accepts ANY of: slug ("new-cairo"), English ("New Cairo"), Arabic ("القاهرة الجديدة"),
// or "Sub, Gov" display form ("New Cairo, Cairo" / "القاهرة الجديدة، القاهرة").
// Returns the canonical English name (subEn ?? govEn) on match, else input unchanged.
// Used by Search.tsx paramsToState to normalize ?city= params from Arabic/AI URLs.
export function toCanonicalEn(input: string | null | undefined): string {
  if (!input) return "";
  const raw = String(input).trim();
  if (!raw) return raw;

  // "Sub, Gov" / "Sub، Gov" → take leading segment before separator
  const head = raw.split(/[,،]/)[0]?.trim() ?? raw;

  // Normalize hyphens/spaces equivalence for slug-vs-name comparison
  const norm = (s: string) => s.toLowerCase().replace(/[-\s]+/g, " ").trim();
  const target = norm(head);

  for (const loc of FLAT_LOCATIONS) {
    const candidates = [
      loc.subValue, loc.subEn, loc.subAr,
      loc.govValue, loc.govEn, loc.govAr,
      loc.displayEn, loc.displayAr,
    ].filter(Boolean) as string[];
    for (const c of candidates) {
      if (norm(c) === target) return loc.subEn ?? loc.govEn;
    }
  }
  return raw;
}

// ── Approximate GPS coordinates per area (for commute feature) ────────────────
// Used as fallback when Google Maps API is unavailable
export const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  // Cairo governorate
  "new-cairo":        { lat: 30.0131, lng: 31.4356 },
  "fifth-settlement": { lat: 30.0075, lng: 31.4695 },
  "nasr-city":        { lat: 30.0563, lng: 31.3383 },
  "heliopolis":       { lat: 30.0876, lng: 31.3222 },
  "maadi":            { lat: 29.9602, lng: 31.2569 },
  "zamalek":          { lat: 30.0623, lng: 31.2186 },
  "downtown":         { lat: 30.0444, lng: 31.2357 },
  "rehab":            { lat: 30.0606, lng: 31.4953 },
  "shorouk":          { lat: 30.1162, lng: 31.6133 },
  "badr":             { lat: 30.1300, lng: 31.7200 },
  "ain-shams":        { lat: 30.1021, lng: 31.3197 },
  "shubra":           { lat: 30.0985, lng: 31.2469 },
  "katameya":         { lat: 29.9758, lng: 31.4459 },
  "new-capital":      { lat: 30.0167, lng: 31.7500 },
  "obour":            { lat: 30.2000, lng: 31.4833 },
  "tagammu":          { lat: 30.0217, lng: 31.4183 },
  "tura":             { lat: 29.9333, lng: 31.2833 },
  // Giza
  "sheikh-zayed":     { lat: 30.0093, lng: 30.9988 },
  "6th-october":      { lat: 29.9396, lng: 30.9289 },
  "dokki":            { lat: 30.0419, lng: 31.2053 },
  "mohandessin":      { lat: 30.0569, lng: 31.2044 },
  "agouza":           { lat: 30.0617, lng: 31.2139 },
  "haram":            { lat: 29.9774, lng: 31.1308 },
  "faisal":           { lat: 29.9800, lng: 31.1200 },
  "hadayek-ahram":    { lat: 29.9900, lng: 31.1100 },
  "imbaba":           { lat: 30.0767, lng: 31.2108 },
  // Alexandria
  "smouha":           { lat: 31.2156, lng: 29.9553 },
  "stanley":          { lat: 31.2333, lng: 29.9667 },
  "glim":             { lat: 31.2272, lng: 29.9617 },
  "miami":            { lat: 31.2598, lng: 30.0055 },
  "roushdy":          { lat: 31.2200, lng: 29.9533 },
  "montazah":         { lat: 31.2833, lng: 30.0333 },
  "borg-el-arab":     { lat: 30.9108, lng: 29.5983 },
  "agami":            { lat: 31.1583, lng: 29.7667 },
  "san-stefano":      { lat: 31.2250, lng: 29.9583 },
  // North Coast
  "sidi-abdelrahman": { lat: 30.9006, lng: 28.7175 },
  "marassi":          { lat: 30.8717, lng: 28.5500 },
  "hacienda":         { lat: 30.8700, lng: 28.4833 },
  "alamein":          { lat: 30.8333, lng: 28.9500 },
  "new-alamein":      { lat: 30.8700, lng: 28.9600 },
  "ras-el-hekma":     { lat: 31.0400, lng: 27.7100 },
  "marsa-matrouh":    { lat: 31.3539, lng: 27.2373 },
  // Ain Sokhna
  "porto-sokhna":     { lat: 29.5917, lng: 32.3500 },
  "sokhna-road":      { lat: 29.6000, lng: 32.3400 },
  // Red Sea
  "hurghada":         { lat: 27.2574, lng: 33.8129 },
  "el-gouna":         { lat: 27.3956, lng: 33.6783 },
  "sahl-hasheesh":    { lat: 27.0833, lng: 33.9167 },
  // South Sinai
  "sharm-el-sheikh":  { lat: 27.9158, lng: 34.3300 },
  "dahab":            { lat: 28.5004, lng: 34.5130 },
  // Governorate-level fallbacks
  "cairo":            { lat: 30.0444, lng: 31.2357 },
  "giza":             { lat: 30.0131, lng: 31.2089 },
  "alexandria":       { lat: 31.2001, lng: 29.9187 },
  "north-coast":      { lat: 30.9006, lng: 28.7175 },
  "ain-sokhna":       { lat: 29.5917, lng: 32.3500 },
  "red-sea":          { lat: 27.2574, lng: 33.8129 },
  "south-sinai":      { lat: 27.9158, lng: 34.3300 },
  "qalyubia":         { lat: 30.3292, lng: 31.2194 },
  "dakahlia":         { lat: 31.0390, lng: 31.3806 },
  "sharqia":          { lat: 30.5769, lng: 31.5021 },
  "gharbia":          { lat: 30.8667, lng: 31.0000 },
  "beheira":          { lat: 30.8486, lng: 30.3444 },
  "port-said":        { lat: 31.2565, lng: 32.2841 },
  "ismailia":         { lat: 30.5965, lng: 32.2715 },
  "suez":             { lat: 29.9737, lng: 32.5265 },
  "fayoum":           { lat: 29.3084, lng: 30.8428 },
  "luxor":            { lat: 25.6872, lng: 32.6396 },
  "aswan":            { lat: 24.0889, lng: 32.8998 },
  // Sub-area extras
  "mansoura":         { lat: 31.0390, lng: 31.3806 },
  "new-mansoura":     { lat: 31.0500, lng: 31.3900 },
  "zagazig":          { lat: 30.5769, lng: 31.5021 },
  "10th-ramadan":     { lat: 30.2928, lng: 31.7439 },
  "tanta":            { lat: 30.7865, lng: 30.9987 },
  "benha":            { lat: 30.4667, lng: 31.1833 },
  "shubra-khayma":    { lat: 30.1286, lng: 31.2436 },
  "luxor-city":       { lat: 25.6872, lng: 32.6396 },
  "aswan-city":       { lat: 24.0889, lng: 32.8998 },
};

export function getCoordsForArea(govValue: string, subValue?: string): { lat: number; lng: number } | null {
  if (subValue && AREA_COORDS[subValue]) return AREA_COORDS[subValue];
  if (AREA_COORDS[govValue]) return AREA_COORDS[govValue];
  return null;
}

// Resolve a sub-area (district) slug to its display name. Falls back to the
// governorate name when no sub-area is given, and to the slug if unknown.
export function getAreaName(govValue: string, subValue: string | undefined, isAr: boolean): string {
  const gov = EGYPT_LOCATIONS.find((g) => g.value === govValue);
  if (subValue) {
    const sub = gov?.subAreas.find((s) => s.value === subValue);
    if (sub) return isAr ? sub.ar : sub.en;
    return subValue;
  }
  if (gov) return isAr ? gov.ar : gov.en;
  return govValue;
}