// data/religionSpread.ts
// Religion spread data — time-based regional circles for map overlay

export interface ReligionRegion {
  id: string;
  name: string; // region name
  latitude: number;
  longitude: number;
  radius: number; // meters
  yearStart: number; // when this region adopted the religion
  intensity: number; // 0.3–1.0 fill opacity multiplier
  note?: string;
}

export interface Religion {
  id: string;
  name: string;
  founded: number; // year (negative = BC)
  foundedLabel: string;
  color: string;
  emoji: string;
  origin: { latitude: number; longitude: number; label: string };
  description: string;
  currentFollowers: string;
  regions: ReligionRegion[];
}

export const RELIGIONS: Religion[] = [
  {
    id: 'christianity',
    name: 'Christianity',
    founded: 30,
    foundedLabel: '~30 AD',
    color: '#2563EB',
    emoji: '✝️',
    origin: { latitude: 31.7767, longitude: 35.2345, label: 'Jerusalem' },
    description: 'Founded by the followers of Jesus of Nazareth in Judea, Christianity spread rapidly through the Roman Empire\'s trade and road networks. From a persecuted Jewish sect, it became the official religion of Rome under Constantine in 313 AD and went on to shape the culture, law, and politics of Western civilization.',
    currentFollowers: '2.4 billion',
    regions: [
      { id: 'c_judea', name: 'Judea/Palestine', latitude: 31.7767, longitude: 35.2345, radius: 200000, yearStart: 30, intensity: 1.0, note: 'Origin — Jerusalem, Galilee' },
      { id: 'c_antioch', name: 'Antioch & Syria', latitude: 36.2021, longitude: 36.1608, radius: 300000, yearStart: 40, intensity: 0.9, note: 'First called "Christians" in Antioch' },
      { id: 'c_egypt', name: 'Egypt', latitude: 29.9792, longitude: 31.1342, radius: 400000, yearStart: 60, intensity: 0.8, note: 'Mark\'s Gospel brought to Alexandria' },
      { id: 'c_rome', name: 'Rome & Italy', latitude: 41.9028, longitude: 12.4964, radius: 400000, yearStart: 60, intensity: 0.9, note: 'Paul\'s letters, Peter\'s ministry' },
      { id: 'c_greece', name: 'Greece', latitude: 37.9838, longitude: 23.7275, radius: 350000, yearStart: 50, intensity: 0.8 },
      { id: 'c_turkey', name: 'Asia Minor', latitude: 39.0, longitude: 35.0, radius: 600000, yearStart: 50, intensity: 0.8, note: 'Paul\'s missionary journeys' },
      { id: 'c_persia', name: 'Mesopotamia & Persia', latitude: 34.0, longitude: 44.0, radius: 500000, yearStart: 150, intensity: 0.6 },
      { id: 'c_nubia', name: 'Nubia & Ethiopia', latitude: 14.0, longitude: 38.0, radius: 400000, yearStart: 340, intensity: 0.7, note: 'Ethiopian Coptic Church founded 340 AD' },
      { id: 'c_iberia', name: 'Iberia (Spain)', latitude: 40.0, longitude: -4.0, radius: 500000, yearStart: 300, intensity: 0.7 },
      { id: 'c_britain', name: 'Britain & Ireland', latitude: 53.0, longitude: -3.0, radius: 400000, yearStart: 400, intensity: 0.7, note: 'Celtic Christianity, Patrick in Ireland' },
      { id: 'c_gaul', name: 'France & Gaul', latitude: 46.0, longitude: 2.0, radius: 500000, yearStart: 300, intensity: 0.7 },
      { id: 'c_germany', name: 'Germanic Tribes', latitude: 51.0, longitude: 10.0, radius: 600000, yearStart: 500, intensity: 0.6 },
      { id: 'c_scandinavia', name: 'Scandinavia', latitude: 60.0, longitude: 15.0, radius: 600000, yearStart: 900, intensity: 0.6, note: 'Viking conversion, 900-1100 AD' },
      { id: 'c_russia', name: 'Kievan Rus', latitude: 50.0, longitude: 30.0, radius: 700000, yearStart: 988, intensity: 0.7, note: 'Vladimir\'s mass baptism 988 AD' },
      { id: 'c_americas', name: 'Central America', latitude: 19.0, longitude: -99.0, radius: 800000, yearStart: 1520, intensity: 0.6, note: 'Spanish colonization of Americas' },
      { id: 'c_s_america', name: 'South America', latitude: -15.0, longitude: -55.0, radius: 1500000, yearStart: 1550, intensity: 0.6 },
      { id: 'c_sub_sahara', name: 'Sub-Saharan Africa', latitude: 0.0, longitude: 20.0, radius: 1500000, yearStart: 1800, intensity: 0.5, note: 'Colonial-era missions' },
    ],
  },
  {
    id: 'islam',
    name: 'Islam',
    founded: 622,
    foundedLabel: '622 AD',
    color: '#059669',
    emoji: '☪️',
    origin: { latitude: 21.4225, longitude: 39.8262, label: 'Mecca, Arabia' },
    description: 'Founded by the Prophet Muhammad in Arabia, Islam spread with extraordinary speed. Within 100 years of Muhammad\'s death, Muslim armies had conquered the Persian Empire, Egypt, North Africa, and Spain. Islam became a sophisticated civilization preserving Greek knowledge and advancing mathematics, astronomy, and medicine.',
    currentFollowers: '1.9 billion',
    regions: [
      { id: 'i_mecca', name: 'Mecca & Arabia', latitude: 21.4225, longitude: 39.8262, radius: 400000, yearStart: 622, intensity: 1.0, note: 'Origin — the Hijaz region' },
      { id: 'i_medina', name: 'Medina & Northern Arabia', latitude: 24.4672, longitude: 39.6150, radius: 300000, yearStart: 622, intensity: 1.0, note: 'Muhammad\'s capital after Hijra' },
      { id: 'i_levant', name: 'Syria & Levant', latitude: 35.0, longitude: 38.0, radius: 500000, yearStart: 636, intensity: 0.9, note: 'Battle of Yarmouk, Byzantine defeat' },
      { id: 'i_persia', name: 'Persia (Iran)', latitude: 32.0, longitude: 53.0, radius: 700000, yearStart: 651, intensity: 0.9, note: 'Sassanid Empire falls to Arab armies' },
      { id: 'i_egypt', name: 'Egypt', latitude: 26.0, longitude: 30.0, radius: 600000, yearStart: 641, intensity: 0.9 },
      { id: 'i_n_africa', name: 'North Africa', latitude: 30.0, longitude: 5.0, radius: 1500000, yearStart: 700, intensity: 0.9 },
      { id: 'i_iberia', name: 'Al-Andalus (Spain)', latitude: 38.0, longitude: -4.0, radius: 500000, yearStart: 711, intensity: 0.8, note: 'Umayyad conquest of Iberia 711 AD' },
      { id: 'i_sindh', name: 'Sindh (Pakistan)', latitude: 26.0, longitude: 68.0, radius: 400000, yearStart: 712, intensity: 0.8, note: 'Muhammad bin Qasim\'s conquest' },
      { id: 'i_c_asia', name: 'Central Asia', latitude: 40.0, longitude: 60.0, radius: 700000, yearStart: 750, intensity: 0.8 },
      { id: 'i_w_africa', name: 'West Africa', latitude: 13.0, longitude: -5.0, radius: 800000, yearStart: 1000, intensity: 0.7, note: 'Via trans-Saharan trade routes' },
      { id: 'i_anatolia', name: 'Anatolia (Turkey)', latitude: 39.0, longitude: 35.0, radius: 700000, yearStart: 1200, intensity: 0.9, note: 'Seljuk and Ottoman conquests' },
      { id: 'i_s_asia', name: 'Northern India', latitude: 28.0, longitude: 77.0, radius: 600000, yearStart: 1200, intensity: 0.7, note: 'Delhi Sultanate, Mughal Empire' },
      { id: 'i_se_asia', name: 'Maritime Southeast Asia', latitude: 3.0, longitude: 110.0, radius: 1000000, yearStart: 1300, intensity: 0.7, note: 'Trade networks converted Malay world' },
      { id: 'i_e_africa', name: 'East Africa', latitude: -5.0, longitude: 40.0, radius: 500000, yearStart: 900, intensity: 0.7, note: 'Swahili Coast, Indian Ocean trade' },
      { id: 'i_balkans', name: 'Balkans', latitude: 43.0, longitude: 21.0, radius: 500000, yearStart: 1400, intensity: 0.7, note: 'Ottoman expansion into Europe' },
    ],
  },
  {
    id: 'buddhism',
    name: 'Buddhism',
    founded: -528,
    foundedLabel: '~528 BC',
    color: '#D97706',
    emoji: '☸️',
    origin: { latitude: 27.4860, longitude: 83.8500, label: 'Bodh Gaya, India' },
    description: 'Founded by Siddhartha Gautama (the Buddha) in northeastern India around 528 BC, Buddhism spread along trade routes across Asia. Emperor Ashoka\'s conversion in 261 BC was a turning point — he sent missionaries across Asia. Buddhism eventually faded in its homeland India but became dominant across Southeast and East Asia.',
    currentFollowers: '520 million',
    regions: [
      { id: 'b_india', name: 'Northeastern India (Origin)', latitude: 27.4860, longitude: 83.8500, radius: 400000, yearStart: -528, intensity: 1.0, note: 'Magadha kingdom — the Buddha\'s homeland' },
      { id: 'b_india_full', name: 'Indian Subcontinent', latitude: 20.0, longitude: 78.0, radius: 900000, yearStart: -261, intensity: 0.9, note: 'Ashoka converts and spreads Buddhism 261 BC' },
      { id: 'b_sri_lanka', name: 'Sri Lanka', latitude: 7.8731, longitude: 80.7718, radius: 200000, yearStart: -247, intensity: 1.0, note: 'Ashoka\'s son Mahinda brings Buddhism c. 247 BC; Theravada preserved here' },
      { id: 'b_bactria', name: 'Bactria (Afghanistan)', latitude: 36.0, longitude: 66.0, radius: 400000, yearStart: -200, intensity: 0.8, note: 'Greco-Buddhist synthesis — fascinating fusion culture' },
      { id: 'b_silk_road', name: 'Central Asian Oases', latitude: 40.0, longitude: 75.0, radius: 500000, yearStart: 100, intensity: 0.7, note: 'Spread along Silk Road oasis cities' },
      { id: 'b_china', name: 'China', latitude: 35.0, longitude: 105.0, radius: 1200000, yearStart: 67, intensity: 0.8, note: 'Han Emperor Mingdi\'s dream — Buddhism officially arrives 67 AD' },
      { id: 'b_korea', name: 'Korea', latitude: 37.5, longitude: 127.5, radius: 300000, yearStart: 372, intensity: 0.8, note: 'Goguryeo kingdom receives Buddhism 372 AD' },
      { id: 'b_japan', name: 'Japan', latitude: 36.0, longitude: 138.0, radius: 400000, yearStart: 552, intensity: 0.9, note: 'From Korea 552 AD; Prince Shotoku becomes great Buddhist patron' },
      { id: 'b_se_asia', name: 'Southeast Asia Mainland', latitude: 15.0, longitude: 100.0, radius: 800000, yearStart: 300, intensity: 0.9, note: 'Thailand, Myanmar, Cambodia — Theravada dominant' },
      { id: 'b_indonesia', name: 'Maritime Southeast Asia', latitude: -7.0, longitude: 110.0, radius: 700000, yearStart: 400, intensity: 0.7, note: 'Borobudur in Java is the world\'s largest Buddhist temple, built c. 800 AD' },
      { id: 'b_tibet', name: 'Tibet & Himalayas', latitude: 31.0, longitude: 88.0, radius: 600000, yearStart: 641, intensity: 1.0, note: 'King Songtsen Gampo — Vajrayana Buddhism uniquely preserved here' },
      { id: 'b_mongolia', name: 'Mongolia', latitude: 46.0, longitude: 105.0, radius: 700000, yearStart: 1578, intensity: 0.8, note: 'Conversion of Altan Khan 1578; Dalai Lama title created' },
    ],
  },
  {
    id: 'hinduism',
    name: 'Hinduism',
    founded: -1500,
    foundedLabel: '~1500 BC',
    color: '#DC2626',
    emoji: '🕉️',
    origin: { latitude: 29.9667, longitude: 76.8000, label: 'Indus-Saraswati Region' },
    description: 'The world\'s oldest major living religion, Hinduism evolved from the Vedic traditions of the Indus Valley civilization. Unlike other religions it has no single founder or founding event — it grew organically over 4,000 years. Hinduism spread through trade and cultural influence to Southeast Asia, where it inspired magnificent temple complexes like Angkor Wat.',
    currentFollowers: '1.2 billion',
    regions: [
      { id: 'h_indus', name: 'Indus Valley (Origin)', latitude: 29.0, longitude: 71.0, radius: 500000, yearStart: -1500, intensity: 1.0, note: 'Vedic civilization — Rig Veda composed here' },
      { id: 'h_ganges', name: 'Ganges Plain', latitude: 25.0, longitude: 82.0, radius: 600000, yearStart: -1000, intensity: 1.0, note: 'Heart of Vedic culture; Varanasi (Kashi) — oldest living city' },
      { id: 'h_deccan', name: 'Deccan Plateau', latitude: 18.0, longitude: 79.0, radius: 700000, yearStart: -500, intensity: 0.9 },
      { id: 'h_south', name: 'South India', latitude: 11.0, longitude: 78.0, radius: 600000, yearStart: -300, intensity: 0.9, note: 'Dravidian temples, Tamil Sangam literature' },
      { id: 'h_sri_lanka', name: 'Sri Lanka', latitude: 8.0, longitude: 81.0, radius: 150000, yearStart: -500, intensity: 0.6 },
      { id: 'h_se_asia', name: 'Mainland Southeast Asia', latitude: 14.0, longitude: 102.0, radius: 700000, yearStart: 100, intensity: 0.8, note: 'Funan, Khmer Empire adopt Hinduism; Angkor Wat is a Hindu temple' },
      { id: 'h_java', name: 'Java & Bali', latitude: -8.0, longitude: 115.0, radius: 400000, yearStart: 200, intensity: 0.8, note: 'Majapahit Empire; Bali remains Hindu today after Java\'s Islamization' },
      { id: 'h_champa', name: 'Champa (Vietnam)', latitude: 15.0, longitude: 108.0, radius: 300000, yearStart: 200, intensity: 0.7, note: 'My Son sanctuary — Hindu temple complex in Vietnam' },
      { id: 'h_kashmir', name: 'Kashmir & Northwest', latitude: 34.0, longitude: 74.0, radius: 300000, yearStart: -800, intensity: 0.9 },
      { id: 'h_modern', name: 'Modern India', latitude: 22.0, longitude: 82.0, radius: 1500000, yearStart: 1000, intensity: 0.9, note: '80% of India\'s 1.4 billion population practices Hinduism' },
    ],
  },
];
