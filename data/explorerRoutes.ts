// data/explorerRoutes.ts — Real historical explorer routes with verified coordinates
export interface RouteWaypoint {
  latitude: number;
  longitude: number;
  label: string;
  note?: string;
}

export interface ExplorerRoute {
  id: string;
  name: string;
  explorer: string;
  years: string;
  color: string;
  emoji: string;
  shortDesc: string;
  coordinates: { latitude: number; longitude: number }[];
  keyStops: RouteWaypoint[];
  translations?: {
    ro?: { name: string; shortDesc: string };
    fr?: { name: string; shortDesc: string };
    de?: { name: string; shortDesc: string };
    es?: { name: string; shortDesc: string };
  };
}

export const EXPLORER_ROUTES: ExplorerRoute[] = [
  {
    id: 'columbus_1492',
    name: 'Columbus — First Voyage',
    explorer: 'Christopher Columbus',
    years: '1492–1493',
    color: '#E84545',
    emoji: '⚓',
    shortDesc: 'Discovery of the Americas',
    translations: {
      ro: { name: 'Columbus — Prima Călătorie', shortDesc: 'Descoperirea Americilor' },
      fr: { name: 'Colomb — Premier Voyage', shortDesc: 'Découverte des Amériques' },
      de: { name: 'Kolumbus — Erste Reise', shortDesc: 'Entdeckung Amerikas' },
      es: { name: 'Colón — Primer Viaje', shortDesc: 'Descubrimiento de las Américas' },
    },
    coordinates: [
      { latitude: 37.23,  longitude: -6.89  }, // Palos de la Frontera, Spain
      { latitude: 28.09,  longitude: -17.10 }, // La Gomera, Canary Islands (last European stop)
      { latitude: 24.05,  longitude: -74.53 }, // San Salvador / Guanahani, Bahamas — Oct 12, 1492
      { latitude: 21.51,  longitude: -77.77 }, // Northeast Cuba
      { latitude: 19.74,  longitude: -71.78 }, // Hispaniola — La Navidad fort
      { latitude: 37.06,  longitude: -25.14 }, // Santa Maria, Azores (storm refuge, return)
      { latitude: 38.71,  longitude: -9.14  }, // Lisbon (brief stop)
      { latitude: 37.23,  longitude: -6.89  }, // Palos de la Frontera (return — Mar 15, 1493)
    ],
    keyStops: [
      { latitude: 37.23,  longitude: -6.89,  label: 'Palos de la Frontera', note: 'Departure — Aug 3, 1492 with 90 men aboard Niña, Pinta & Santa María' },
      { latitude: 28.09,  longitude: -17.10, label: 'Canary Islands',        note: 'Last European landfall — reprovisioned and repaired the Pinta\'s rudder' },
      { latitude: 24.05,  longitude: -74.53, label: 'San Salvador (Bahamas)', note: 'First landfall in the Americas — Oct 12, 1492 after 70 days at sea' },
      { latitude: 19.74,  longitude: -71.78, label: 'Hispaniola',             note: 'Santa María wrecked here — built La Navidad fort from the wreckage' },
    ],
  },
  {
    id: 'dagama_1497',
    name: 'Vasco da Gama — Sea Route to India',
    explorer: 'Vasco da Gama',
    years: '1497–1499',
    color: '#0891B2',
    emoji: '🧭',
    shortDesc: 'First direct sea route from Europe to India',
    translations: {
      ro: { name: 'Vasco da Gama — Ruta Maritimă spre India', shortDesc: 'Prima rută maritimă directă din Europa spre India' },
      fr: { name: 'Vasco de Gama — Route Maritime vers l\'Inde', shortDesc: 'Première route maritime directe d\'Europe vers l\'Inde' },
      de: { name: 'Vasco da Gama — Seeweg nach Indien', shortDesc: 'Erste direkte Seeroute von Europa nach Indien' },
      es: { name: 'Vasco da Gama — Ruta Marítima a India', shortDesc: 'Primera ruta marítima directa de Europa a India' },
    },
    coordinates: [
      { latitude: 38.72,  longitude: -9.14  }, // Lisbon
      { latitude: 28.07,  longitude: -15.43 }, // Canary Islands
      { latitude: 14.93,  longitude: -23.51 }, // Cape Verde Islands
      { latitude: 2.00,   longitude: -28.00 }, // Mid-Atlantic (bold southwestern loop to catch trade winds)
      { latitude: -14.00, longitude: -30.00 }, // South Atlantic loop (closest to Brazil da Gama ever got)
      { latitude: -34.36, longitude: 18.47  }, // Cape of Good Hope — Nov 22, 1497
      { latitude: -34.18, longitude: 22.15  }, // Mossel Bay (first friendly contact with Khoikhoi)
      { latitude: -15.04, longitude: 40.73  }, // Mozambique Island
      { latitude: -4.05,  longitude: 39.66  }, // Mombasa (hostile reception)
      { latitude: -3.22,  longitude: 40.12  }, // Malindi (friendly — hired Ibn Majid as navigator)
      { latitude: 11.25,  longitude: 75.78  }, // Calicut (Kozhikode), India — May 20, 1498
    ],
    keyStops: [
      { latitude: 38.72,  longitude: -9.14,  label: 'Lisbon',                note: 'Departure — July 8, 1497 with 4 ships and 170 men' },
      { latitude: -34.36, longitude: 18.47,  label: 'Cape of Good Hope',     note: 'Rounded Nov 22, 1497 — Bartolomeu Dias had found it in 1488 but not gone further' },
      { latitude: -3.22,  longitude: 40.12,  label: 'Malindi, Kenya',         note: 'Hired Arab navigator Ahmad ibn Majid — crossed Indian Ocean in 23 days' },
      { latitude: 11.25,  longitude: 75.78,  label: 'Calicut, India',         note: 'Arrived May 20, 1498 — opened sea trade route worth more than 60× the expedition cost' },
    ],
  },
  {
    id: 'magellan_1519',
    name: 'Magellan–Elcano — First Circumnavigation',
    explorer: 'Ferdinand Magellan & Juan Sebastián Elcano',
    years: '1519–1522',
    color: '#7C3AED',
    emoji: '🌍',
    shortDesc: 'First voyage to circumnavigate the globe',
    translations: {
      ro: { name: 'Magellan–Elcano — Prima Circumnavigare', shortDesc: 'Prima călătorie în jurul lumii' },
      fr: { name: 'Magellan–Elcano — Première Circumnavigation', shortDesc: 'Premier voyage autour du globe' },
      de: { name: 'Magellan–Elcano — Erste Weltumsegelung', shortDesc: 'Erste Reise um die Erde' },
      es: { name: 'Magallanes–Elcano — Primera Circunnavegación', shortDesc: 'Primer viaje alrededor del globo' },
    },
    coordinates: [
      { latitude: 36.78,   longitude: -6.35  }, // Sanlúcar de Barrameda, Spain
      { latitude: 28.47,   longitude: -16.25 }, // Tenerife, Canary Islands
      { latitude: -22.91,  longitude: -43.17 }, // Rio de Janeiro (resupply)
      { latitude: -49.31,  longitude: -67.72 }, // San Julián, Patagonia (winter camp — mutiny suppressed)
      { latitude: -52.51,  longitude: -69.63 }, // Strait of Magellan — entry Oct 21, 1520
      { latitude: -52.44,  longitude: -75.55 }, // Pacific — exit Nov 28, 1520
      { latitude: -20.00,  longitude: -140.00}, // Pacific crossing (98 days, no land)
      { latitude: 13.46,   longitude: 144.79 }, // Guam (Mariana Islands) — first land in 98 days
      { latitude: 10.32,   longitude: 123.89 }, // Cebu, Philippines — Magellan killed Apr 27, 1521
      { latitude: 4.94,    longitude: 114.95 }, // Brunei (Borneo)
      { latitude: 0.68,    longitude: 127.45 }, // Tidore, Moluccas — loaded with cloves!
      { latitude: -9.25,   longitude: 124.13 }, // Timor
      { latitude: -34.36,  longitude: 18.47  }, // Cape of Good Hope
      { latitude: 14.93,   longitude: -23.51 }, // Cape Verde Islands (Elcano stopped — arrested briefly)
      { latitude: 36.78,   longitude: -6.35  }, // Sanlúcar — return Sept 6, 1522 (18 of 270 survived)
    ],
    keyStops: [
      { latitude: 36.78,  longitude: -6.35,  label: 'Sanlúcar de Barrameda', note: 'Departure Sept 20, 1519 — 5 ships, 270 men, 3 years of provisions' },
      { latitude: -52.51, longitude: -69.63, label: 'Strait of Magellan',    note: '38 days to navigate the 600km strait — one ship deserted and fled back to Spain' },
      { latitude: 10.32,  longitude: 123.89, label: 'Cebu, Philippines',      note: 'Magellan killed in battle Apr 27, 1521 — Elcano took command' },
      { latitude: 0.68,   longitude: 127.45, label: 'Tidore, Moluccas',       note: 'The whole point of the voyage — loaded spices worth fortunes in Europe' },
      { latitude: 36.78,  longitude: -6.35,  label: 'Return — Sanlúcar',      note: 'Sept 6, 1522 — only 18 of 270 survived to prove Earth is round' },
    ],
  },
  {
    id: 'marco_polo_1271',
    name: 'Marco Polo — Journey to China',
    explorer: 'Marco Polo',
    years: '1271–1295',
    color: '#D97706',
    emoji: '🐪',
    shortDesc: 'The Silk Road to the court of Kublai Khan',
    translations: {
      ro: { name: 'Marco Polo — Călătoria în China', shortDesc: 'Drumul Mătăsii spre curtea lui Kublai Khan' },
      fr: { name: 'Marco Polo — Voyage en Chine', shortDesc: 'La Route de la Soie vers la cour de Kubilaï Khan' },
      de: { name: 'Marco Polo — Reise nach China', shortDesc: 'Die Seidenstraße zum Hof von Kublai Khan' },
      es: { name: 'Marco Polo — Viaje a China', shortDesc: 'La Ruta de la Seda a la corte de Kublai Kan' },
    },
    coordinates: [
      // ── Outward journey (overland) ──
      { latitude: 45.44, longitude: 12.34  }, // Venice
      { latitude: 41.01, longitude: 28.98  }, // Constantinople
      { latitude: 32.93, longitude: 35.07  }, // Acre, Kingdom of Jerusalem
      { latitude: 27.08, longitude: 56.46  }, // Hormuz, Persian Gulf port
      { latitude: 31.90, longitude: 54.37  }, // Yazd, Persia
      { latitude: 37.50, longitude: 59.00  }, // Nishapur / Khorasan
      { latitude: 36.76, longitude: 66.90  }, // Balkh, Afghanistan (ancient city)
      { latitude: 37.25, longitude: 71.25  }, // Badakhshan (high mountain pass)
      { latitude: 38.50, longitude: 73.50  }, // Pamir Plateau — "Roof of the World"
      { latitude: 39.47, longitude: 75.99  }, // Kashgar (key Silk Road junction)
      { latitude: 37.11, longitude: 79.92  }, // Khotan (jade and silk)
      { latitude: 40.14, longitude: 94.67  }, // Dunhuang (Caves of the Thousand Buddhas)
      { latitude: 38.94, longitude: 100.45 }, // Zhangye (Ganzhou)
      { latitude: 42.37, longitude: 116.19 }, // Shangdu — Xanadu, Kublai's summer palace
      { latitude: 39.91, longitude: 116.39 }, // Khanbaliq — Beijing, capital of the Yuan dynasty
      // ── Return journey (by sea) ──
      { latitude: 24.87, longitude: 118.68 }, // Quanzhou (Zaytun) — major port
      { latitude: 2.19,  longitude: 102.25 }, // Malacca Strait
      { latitude: 7.57,  longitude: 80.75  }, // Ceylon (Sri Lanka)
      { latitude: 11.25, longitude: 75.78  }, // Calicut, India
      { latitude: 27.08, longitude: 56.46  }, // Hormuz
      { latitude: 41.00, longitude: 39.73  }, // Trebizond (Trabzon, Turkey)
      { latitude: 41.01, longitude: 28.98  }, // Constantinople
      { latitude: 45.44, longitude: 12.34  }, // Venice — returned 1295 after 24 years
    ],
    keyStops: [
      { latitude: 45.44, longitude: 12.34,  label: 'Venice',                 note: 'Departed 1271 — returned 1295 after 24 years, 40,000 km' },
      { latitude: 38.50, longitude: 73.50,  label: 'Pamir Mountains',         note: '"Roof of the World" — altitude sickness forced a year-long rest' },
      { latitude: 39.91, longitude: 116.39, label: 'Beijing (Khanbaliq)',      note: 'Served Kublai Khan for 17 years as diplomat and governor' },
      { latitude: 42.37, longitude: 116.19, label: 'Xanadu (Shangdu)',         note: 'Kublai Khan\'s legendary summer palace — inspired Coleridge\'s poem' },
    ],
  },
  {
    id: 'drake_1577',
    name: 'Francis Drake — First English Circumnavigation',
    explorer: 'Francis Drake',
    years: '1577–1580',
    color: '#059669',
    emoji: '⚔️',
    shortDesc: 'Privateer, pirate, circumnavigator — knighted by Queen Elizabeth',
    translations: {
      ro: { name: 'Francis Drake — Prima Circumnavigare Engleză', shortDesc: 'Privateer, pirat, circumnavigator — înnobilat de Regina Elisabeta' },
      fr: { name: 'Francis Drake — Première Circumnavigation Anglaise', shortDesc: 'Corsaire, pirate, circumnavigateur — anobli par la reine Élisabeth' },
      de: { name: 'Francis Drake — Erste Englische Weltumsegelung', shortDesc: 'Freibeuter, Pirat, Weltumsegler — von Königin Elisabeth geadelt' },
      es: { name: 'Francis Drake — Primera Circunnavegación Inglesa', shortDesc: 'Corsario, pirata, circunnavegador — nombrado caballero por la reina Isabel' },
    },
    coordinates: [
      { latitude: 50.37,  longitude: -4.14  }, // Plymouth, England
      { latitude: 31.51,  longitude: -9.77  }, // Moroccan coast (Mogador)
      { latitude: -27.31, longitude: -48.55 }, // South Brazil (near Florianópolis)
      { latitude: -47.75, longitude: -65.90 }, // Port Desire (Puerto Deseado), Patagonia
      { latitude: -49.31, longitude: -67.72 }, // San Julián, Patagonia (same bay as Magellan)
      { latitude: -52.51, longitude: -69.63 }, // Strait of Magellan
      { latitude: -57.00, longitude: -72.00 }, // Drake Passage — blown far south in terrible storms
      { latitude: -33.05, longitude: -71.62 }, // Valparaíso, Chile (raided Spanish port)
      { latitude: -12.06, longitude: -77.04 }, // Callao/Lima, Peru (captured treasure ship Cacafuego)
      { latitude: 38.04,  longitude: -122.97}, // Drake's Bay, California — "Nova Albion" claimed for England
      { latitude: 15.00,  longitude: -175.00}, // Pacific crossing (66 days)
      { latitude: 0.78,   longitude: 127.38 }, // Ternate, Moluccas (allied with Sultan Baab)
      { latitude: -6.81,  longitude: 107.14 }, // Java, Indonesia
      { latitude: -34.36, longitude: 18.47  }, // Cape of Good Hope
      { latitude: 8.49,   longitude: -13.23 }, // Sierra Leone
      { latitude: 50.37,  longitude: -4.14  }, // Plymouth — return Sept 26, 1580 (3rd circumnavigation ever)
    ],
    keyStops: [
      { latitude: 50.37,  longitude: -4.14,  label: 'Plymouth, England',     note: 'Departure Dec 13, 1577 — secret mission to raid Spanish Pacific colonies' },
      { latitude: -33.05, longitude: -71.62, label: 'Valparaíso, Chile',      note: 'Ransacked port — locals had no idea English ships would ever reach the Pacific' },
      { latitude: 38.04,  longitude: -122.97,label: "Drake's Bay, California", note: 'Spent 5 weeks — claimed the land as "Nova Albion" for Queen Elizabeth I' },
      { latitude: 0.78,   longitude: 127.38, label: 'Ternate, Moluccas',      note: 'Returned home with £600,000 in treasure — Drake received half, queen the other half' },
    ],
  },
  {
    id: 'zheng_he_1405',
    name: 'Zheng He — Treasure Fleet',
    explorer: 'Admiral Zheng He',
    years: '1405–1433',
    color: '#C026D3',
    emoji: '⛵',
    shortDesc: 'Seven voyages from China to East Africa — largest fleet the world had ever seen',
    translations: {
      ro: { name: 'Zheng He — Flota Comorilor', shortDesc: 'Șapte călătorii din China în Africa de Est — cea mai mare flotă din istorie' },
      fr: { name: 'Zheng He — Flotte au Trésor', shortDesc: 'Sept voyages de Chine jusqu\'en Afrique de l\'Est — la plus grande flotte de l\'histoire' },
      de: { name: 'Zheng He — Schatzflotte', shortDesc: 'Sieben Reisen von China nach Ostafrika — die größte Flotte der Geschichte' },
      es: { name: 'Zheng He — Flota del Tesoro', shortDesc: 'Siete viajes de China a África Oriental — la mayor flota que el mundo había visto' },
    },
    coordinates: [
      { latitude: 31.22, longitude: 121.47 }, // Nanjing / Shanghai (departure port)
      { latitude: 22.33, longitude: 114.17 }, // Hong Kong / Guangzhou area
      { latitude: 10.32, longitude: 103.86 }, // Gulf of Thailand
      { latitude: 1.28,  longitude: 103.82 }, // Singapore / Malacca (key hub)
      { latitude: 5.42,  longitude: 100.33 }, // Penang / Straits of Malacca
      { latitude: 6.93,  longitude: 79.86  }, // Colombo, Ceylon
      { latitude: 11.25, longitude: 75.78  }, // Calicut, India (main destination)
      { latitude: 21.49, longitude: 39.19  }, // Jeddah / Mecca (pilgrimage)
      { latitude: 12.78, longitude: 45.03  }, // Aden, Yemen
      { latitude: 2.04,  longitude: 45.34  }, // Mogadishu, Somalia
      { latitude: -4.04, longitude: 39.67  }, // Mombasa, Kenya (southernmost point)
    ],
    keyStops: [
      { latitude: 31.22, longitude: 121.47, label: 'Nanjing, China',   note: '317 ships and 28,000 men — the largest armada in history at the time. First voyage 1405.' },
      { latitude: 1.28,  longitude: 103.82, label: 'Malacca',          note: 'Established as a Ming tributary state. The key hub of Southeast Asian trade for centuries.' },
      { latitude: 11.25, longitude: 75.78,  label: 'Calicut, India',   note: 'Visited four times. Zheng He brought silks and porcelain, returned with spices and live giraffes.' },
      { latitude: 2.04,  longitude: 45.34,  label: 'Mogadishu',        note: 'Reached East Africa in 1418 — decades before da Gama rounded the Cape of Good Hope.' },
    ],
  },
  {
    id: 'cook_1768',
    name: 'Cook — HMS Endeavour',
    explorer: 'James Cook',
    years: '1768–1771',
    color: '#6366F1',
    emoji: '🗺️',
    shortDesc: 'Charted New Zealand and Australia\'s east coast — first scientific circumnavigation',
    translations: {
      ro: { name: 'Cook — HMS Endeavour', shortDesc: 'A cartografiat Noua Zeelandă și coasta de est a Australiei — prima circumnavigare științifică' },
      fr: { name: 'Cook — HMS Endeavour', shortDesc: 'Cartographia la Nouvelle-Zélande et la côte est de l\'Australie — première circumnavigation scientifique' },
      de: { name: 'Cook — HMS Endeavour', shortDesc: 'Kartografierte Neuseeland und Australiens Ostküste — erste wissenschaftliche Weltumsegelung' },
      es: { name: 'Cook — HMS Endeavour', shortDesc: 'Cartografió Nueva Zelanda y la costa este de Australia — primera circunnavegación científica' },
    },
    coordinates: [
      { latitude: 51.48,  longitude: -0.09  }, // London / Plymouth, England
      { latitude: 28.47,  longitude: -16.25 }, // Tenerife, Canaries
      { latitude: -22.91, longitude: -43.17 }, // Rio de Janeiro
      { latitude: -54.50, longitude: -64.20 }, // Cape Horn (southern tip of South America)
      { latitude: -17.53, longitude: -149.57}, // Tahiti — observe Transit of Venus
      { latitude: -36.86, longitude: 174.76 }, // Auckland, New Zealand
      { latitude: -43.53, longitude: 172.64 }, // Christchurch (south island NZ)
      { latitude: -37.81, longitude: 144.96 }, // Victoria / Port Phillip, Australia
      { latitude: -33.87, longitude: 151.21 }, // Sydney — Botany Bay (April 1770)
      { latitude: -15.75, longitude: 145.58 }, // Great Barrier Reef (Endeavour ran aground here!)
      { latitude: -10.64, longitude: 142.54 }, // Cape York Peninsula (claimed for Britain)
      { latitude: -8.56,  longitude: 125.58 }, // Timor
      { latitude: -6.20,  longitude: 106.82 }, // Batavia / Jakarta (crew decimated by disease)
      { latitude: -34.36, longitude: 18.47  }, // Cape of Good Hope
      { latitude: 51.48,  longitude: -0.09  }, // London (return July 1771)
    ],
    keyStops: [
      { latitude: 51.48,  longitude: -0.09,  label: 'London',          note: 'HMS Endeavour departed August 26, 1768 with Joseph Banks and 11 scientists aboard.' },
      { latitude: -17.53, longitude: -149.57, label: 'Tahiti',          note: 'Primary mission: observe the Transit of Venus to calculate the Earth-Sun distance.' },
      { latitude: -36.86, longitude: 174.76,  label: 'New Zealand',     note: 'Cook spent 6 months charting both islands — first European to map them accurately.' },
      { latitude: -33.87, longitude: 151.21,  label: 'Botany Bay',      note: 'April 29, 1770 — claimed eastern Australia for Britain. Banks collected 30,000 plant specimens.' },
    ],
  },
  {
    id: 'lewis_clark_1804',
    name: 'Lewis & Clark — Corps of Discovery',
    explorer: 'Meriwether Lewis & William Clark',
    years: '1804–1806',
    color: '#65A30D',
    emoji: '🌲',
    shortDesc: 'First US overland expedition to the Pacific — 8,000 miles through the American West',
    translations: {
      ro: { name: 'Lewis & Clark — Corpul Descoperirii', shortDesc: 'Prima expediție SUA spre Pacific — 13.000 km prin Vestul American' },
      fr: { name: 'Lewis & Clark — Corps de Découverte', shortDesc: 'Première expédition américaine vers le Pacifique — 13 000 km à travers l\'Ouest américain' },
      de: { name: 'Lewis & Clark — Korps der Entdeckung', shortDesc: 'Erste amerikanische Überlandexpedition zum Pazifik — 13.000 km durch den Amerikanischen Westen' },
      es: { name: 'Lewis & Clark — Cuerpo de Descubrimiento', shortDesc: 'Primera expedición terrestre de EE.UU. al Pacífico — 13.000 km por el oeste americano' },
    },
    coordinates: [
      { latitude: 38.63, longitude: -90.20  }, // St. Louis, Missouri (departure)
      { latitude: 41.26, longitude: -95.87  }, // Omaha, Nebraska
      { latitude: 42.87, longitude: -97.39  }, // Yankton, South Dakota
      { latitude: 46.81, longitude: -100.77 }, // Bismarck, North Dakota
      { latitude: 47.53, longitude: -101.30 }, // Fort Mandan (winter 1804-05; Sacagawea joined)
      { latitude: 47.95, longitude: -106.50 }, // Yellowstone confluence, Montana
      { latitude: 47.50, longitude: -110.50 }, // Great Falls, Montana (18-mile portage)
      { latitude: 46.87, longitude: -113.99 }, // Lolo Pass (Rocky Mountains!)
      { latitude: 46.23, longitude: -117.50 }, // Walla Walla, Washington
      { latitude: 45.52, longitude: -122.68 }, // Portland / Columbia River
      { latitude: 46.19, longitude: -124.00 }, // Fort Clatsop, Oregon (Pacific coast — winter 1805-06)
    ],
    keyStops: [
      { latitude: 38.63, longitude: -90.20,  label: 'St. Louis',      note: 'May 14, 1804 — 33 men departed to explore the Louisiana Purchase for President Jefferson.' },
      { latitude: 47.53, longitude: -101.30, label: 'Fort Mandan',    note: 'Sacagawea and Charbonneau joined as guides. Without her knowledge, the mission would have failed.' },
      { latitude: 47.50, longitude: -110.50, label: 'Great Falls',    note: '18-mile portage around 5 waterfalls took 3 weeks and nearly destroyed the expedition.' },
      { latitude: 46.19, longitude: -124.00, label: 'Fort Clatsop',   note: 'November 7, 1805. Clark wrote: "Ocian in view! O! the joy!" — the Pacific at last.' },
    ],
  },
  {
    id: 'ibn_battuta_1325',
    name: 'Ibn Battuta — The Great Journey',
    explorer: 'Abu Abdallah Ibn Battuta',
    years: '1325–1354',
    color: '#EA580C',
    emoji: '🐫',
    shortDesc: '75,000 miles across 40 countries — greatest traveler of the medieval world',
    translations: {
      ro: { name: 'Ibn Battuta — Marea Călătorie', shortDesc: '120.000 km prin 40 de țări — cel mai mare călător al lumii medievale' },
      fr: { name: 'Ibn Battuta — Le Grand Voyage', shortDesc: '120 000 km à travers 40 pays — plus grand voyageur du monde médiéval' },
      de: { name: 'Ibn Battuta — Die Große Reise', shortDesc: '120.000 km durch 40 Länder — größter Reisender der mittelalterlichen Welt' },
      es: { name: 'Ibn Battuta — El Gran Viaje', shortDesc: '120.000 km por 40 países — el mayor viajero del mundo medieval' },
    },
    coordinates: [
      { latitude: 34.02, longitude: -5.00  }, // Tangier, Morocco (hometown, departure 1325)
      { latitude: 36.73, longitude: 3.09   }, // Algiers
      { latitude: 36.82, longitude: 10.17  }, // Tunis
      { latitude: 31.23, longitude: 29.96  }, // Alexandria, Egypt
      { latitude: 30.06, longitude: 31.24  }, // Cairo
      { latitude: 21.39, longitude: 39.86  }, // Mecca (first Hajj 1326)
      { latitude: 15.55, longitude: 32.53  }, // Khartoum, Sudan
      { latitude: -4.04, longitude: 39.67  }, // Mombasa, Kenya (East Africa voyage)
      { latitude: 11.86, longitude: 43.15  }, // Djibouti / Aden
      { latitude: 23.59, longitude: 58.59  }, // Muscat, Oman
      { latitude: 33.34, longitude: 44.40  }, // Baghdad
      { latitude: 44.01, longitude: 39.37  }, // Crimea / Black Sea (Golden Horde)
      { latitude: 43.10, longitude: 76.87  }, // Almaty / Central Asia (Chagatai Khanate)
      { latitude: 28.62, longitude: 77.22  }, // Delhi (served the Sultan 8 years)
      { latitude: 7.88,  longitude: 98.40  }, // Thailand / Southeast Asia voyage
      { latitude: 39.91, longitude: 116.39 }, // Beijing (Yuan dynasty court)
      { latitude: 16.87, longitude: -0.18  }, // Timbuktu, Mali Empire (West Africa)
      { latitude: 34.02, longitude: -5.00  }, // Return to Tangier 1354
    ],
    keyStops: [
      { latitude: 34.02, longitude: -5.00,  label: 'Tangier, Morocco', note: 'Departed June 1325, aged 21 — would not return for 29 years and 75,000 miles.' },
      { latitude: 21.39, longitude: 39.86,  label: 'Mecca',            note: 'Performed Hajj multiple times. His pilgrimage account is the most detailed of the medieval era.' },
      { latitude: 28.62, longitude: 77.22,  label: 'Delhi Sultanate',  note: 'Served the Sultan for 8 years as a judge — sent on diplomatic missions across Asia.' },
      { latitude: 16.87, longitude: -0.18,  label: 'Timbuktu',         note: 'Crossed the Sahara to document the Mali Empire — one of the richest kingdoms in history.' },
    ],
  },
];
