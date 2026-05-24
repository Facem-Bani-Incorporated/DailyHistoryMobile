// data/plagues.ts
// Historical pandemic / plague spread data for the map overlay

export interface PlagueRegion {
  latitude: number;
  longitude: number;
  radius: number;   // meters (500000 to 3000000)
  intensity: number; // 0.0–1.0 (affects circle opacity)
}

export interface PlagueSpread {
  year: number;     // actual historical year
  label: string;    // e.g. "Reaches Constantinople"
  regions: PlagueRegion[];
}

export interface Plague {
  id: string;
  name: string;
  emoji: string;
  color: string;    // hex color for circles and UI
  period: string;   // e.g. "541–549 AD"
  yearMin: number;
  yearMax: number;
  origin: { latitude: number; longitude: number; label: string };
  deathToll: string; // e.g. "25–50 million"
  description: string; // 2-3 sentences
  funFact: string;   // one striking fact
  spread: PlagueSpread[]; // chronological spread data
}

// ─── Year bounds across all pandemics ──────────────────────────────────────
export const PLAGUE_YEAR_MIN = 541;
export const PLAGUE_YEAR_MAX = 1920;

// ─── Pandemic data ─────────────────────────────────────────────────────────
export const PANDEMICS: Plague[] = [
  // =========================================================================
  // 1. PLAGUE OF JUSTINIAN  541–549 AD
  // =========================================================================
  {
    id: 'justinian',
    name: 'Plague of Justinian',
    emoji: '☠️',
    color: '#7C3AED',
    period: '541–549 AD',
    yearMin: 541,
    yearMax: 549,
    origin: {
      latitude: 30.5502,
      longitude: 32.5498,
      label: 'Pelusium, Egypt',
    },
    deathToll: '25–50 million',
    description:
      'The first great bubonic plague pandemic of the recorded world, the Plague of Justinian struck the Byzantine Empire at the height of Emperor Justinian I\'s attempted reconquest of the Roman west. Arriving via grain ships from Egypt, it devastated Constantinople, killing up to 10,000 people per day at its peak. The pandemic shattered Byzantine military and economic power, contributing to the permanent loss of the western provinces and reshaping the medieval world.',
    funFact:
      'Emperor Justinian himself contracted the plague but survived; his court historian Procopius recorded that the dead were so numerous that bodies were stacked in towers and left in the streets, with survivors too few to bury them.',
    spread: [
      {
        year: 541,
        label: 'Emerges in Pelusium, Egypt — spreads along the Nile',
        regions: [
          // Pelusium / Nile Delta
          { latitude: 30.5502, longitude: 32.5498, radius: 600000, intensity: 1.0 },
          // Alexandria
          { latitude: 31.2001, longitude: 29.9187, radius: 500000, intensity: 0.9 },
          // Upper Nile / Thebes region
          { latitude: 25.6872, longitude: 32.6396, radius: 600000, intensity: 0.7 },
          // Levantine coast — Antioch
          { latitude: 36.2021, longitude: 36.1603, radius: 550000, intensity: 0.6 },
        ],
      },
      {
        year: 542,
        label: 'Reaches Constantinople — peak mortality in the capital',
        regions: [
          // Constantinople
          { latitude: 41.0082, longitude: 28.9784, radius: 700000, intensity: 1.0 },
          // Asia Minor coast
          { latitude: 38.4192, longitude: 27.1287, radius: 800000, intensity: 0.85 },
          // Greece / Aegean
          { latitude: 38.0, longitude: 23.7, radius: 700000, intensity: 0.8 },
          // Syria / Palestine
          { latitude: 33.5138, longitude: 36.2765, radius: 700000, intensity: 0.8 },
          // Egypt still active
          { latitude: 30.0444, longitude: 31.2357, radius: 650000, intensity: 0.7 },
          // Anatolia interior
          { latitude: 39.9208, longitude: 32.8541, radius: 750000, intensity: 0.75 },
        ],
      },
      {
        year: 543,
        label: 'Spreads through the Western Mediterranean',
        regions: [
          // Italy — Rome
          { latitude: 41.9028, longitude: 12.4964, radius: 800000, intensity: 0.9 },
          // North Africa — Carthage
          { latitude: 36.8528, longitude: 10.1715, radius: 750000, intensity: 0.8 },
          // Iberian Peninsula coast
          { latitude: 40.4168, longitude: -3.7038, radius: 900000, intensity: 0.55 },
          // Southern Gaul
          { latitude: 43.2965, longitude: 5.3698, radius: 700000, intensity: 0.65 },
          // Balkans
          { latitude: 42.6977, longitude: 23.3219, radius: 800000, intensity: 0.7 },
        ],
      },
      {
        year: 544,
        label: 'Reaches the British Isles and penetrates deeper into Gaul',
        regions: [
          // Britain / Ireland
          { latitude: 53.3811, longitude: -1.4701, radius: 700000, intensity: 0.55 },
          // Northern Gaul / Paris basin
          { latitude: 48.8566, longitude: 2.3522, radius: 850000, intensity: 0.65 },
          // Rhineland
          { latitude: 50.9333, longitude: 6.9500, radius: 750000, intensity: 0.55 },
          // Persia / Mesopotamia
          { latitude: 33.3152, longitude: 44.3661, radius: 800000, intensity: 0.6 },
          // Arabian Peninsula coast
          { latitude: 24.4539, longitude: 54.3773, radius: 700000, intensity: 0.45 },
        ],
      },
      {
        year: 546,
        label: 'Second wave strikes Constantinople and the East',
        regions: [
          // Constantinople second wave
          { latitude: 41.0082, longitude: 28.9784, radius: 650000, intensity: 0.85 },
          // Anatolia
          { latitude: 38.9637, longitude: 35.2433, radius: 900000, intensity: 0.7 },
          // Levant & Egypt
          { latitude: 31.0, longitude: 34.5, radius: 800000, intensity: 0.65 },
          // Balkans & Danube frontier
          { latitude: 44.0, longitude: 22.0, radius: 900000, intensity: 0.55 },
        ],
      },
      {
        year: 549,
        label: 'Third wave — waning but still lethal across the empire',
        regions: [
          // Byzantine heartland residual
          { latitude: 41.0082, longitude: 28.9784, radius: 1000000, intensity: 0.5 },
          // Italy residual
          { latitude: 43.0, longitude: 12.0, radius: 900000, intensity: 0.45 },
          // Egypt / North Africa residual
          { latitude: 29.0, longitude: 31.0, radius: 900000, intensity: 0.4 },
          // Anatolia residual
          { latitude: 39.0, longitude: 35.0, radius: 1000000, intensity: 0.4 },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. BLACK DEATH  1347–1353
  // =========================================================================
  {
    id: 'black_death',
    name: 'Black Death',
    emoji: '🐀',
    color: '#1C1917',
    period: '1347–1353',
    yearMin: 1345,
    yearMax: 1353,
    origin: {
      latitude: 42.87,
      longitude: 74.59,
      label: 'Near Lake Issyk-Kul, Kyrgyzstan',
    },
    deathToll: '75–200 million',
    description:
      'The deadliest pandemic in human history, the Black Death was caused by the bacterium Yersinia pestis and swept from Central Asia to the tip of Scandinavia in under a decade. Between 30 and 60 percent of Europe\'s entire population perished, along with vast numbers across the Middle East, North Africa, and Central Asia. The catastrophe fundamentally restructured feudal society, accelerated the Renaissance, and haunted European consciousness for centuries.',
    funFact:
      'In Florence in 1348, Giovanni Boccaccio witnessed corpses piled in the streets and wrote "The Decameron" as an artistic response; the city lost an estimated 60–70 % of its 90,000 inhabitants within months.',
    spread: [
      {
        year: 1345,
        label: 'Outbreak near Lake Issyk-Kul — travels the Silk Road',
        regions: [
          // Kyrgyzstan / Issyk-Kul
          { latitude: 42.87, longitude: 74.59, radius: 700000, intensity: 1.0 },
          // Talas / Almaty region
          { latitude: 43.25, longitude: 76.95, radius: 650000, intensity: 0.85 },
          // Samarkand / Transoxiana
          { latitude: 39.6542, longitude: 66.9597, radius: 750000, intensity: 0.7 },
        ],
      },
      {
        year: 1346,
        label: 'Reaches the Golden Horde — Caffa siege begins',
        regions: [
          // Caffa (Feodosia), Crimea
          { latitude: 45.0, longitude: 35.3779, radius: 600000, intensity: 1.0 },
          // Astrakhan / lower Volga
          { latitude: 46.3497, longitude: 48.0408, radius: 750000, intensity: 0.85 },
          // Don / Azov coast
          { latitude: 47.2, longitude: 39.7, radius: 650000, intensity: 0.8 },
          // Caspian littoral — Derbent
          { latitude: 42.0579, longitude: 48.2877, radius: 700000, intensity: 0.7 },
          // Persia — Tabriz
          { latitude: 38.0962, longitude: 46.2738, radius: 750000, intensity: 0.65 },
        ],
      },
      {
        year: 1347,
        label: 'Genoese ships carry plague to Constantinople and Sicily',
        regions: [
          // Constantinople
          { latitude: 41.0082, longitude: 28.9784, radius: 700000, intensity: 1.0 },
          // Sicily — Messina
          { latitude: 38.1938, longitude: 15.5540, radius: 600000, intensity: 1.0 },
          // Cyprus
          { latitude: 35.1264, longitude: 33.4299, radius: 500000, intensity: 0.9 },
          // Sardinia
          { latitude: 40.1209, longitude: 9.0129, radius: 550000, intensity: 0.8 },
          // Alexandria, Egypt
          { latitude: 31.2001, longitude: 29.9187, radius: 650000, intensity: 0.85 },
          // Levantine coast
          { latitude: 33.8938, longitude: 35.5018, radius: 600000, intensity: 0.75 },
        ],
      },
      {
        year: 1348,
        label: 'Explodes across Italy, France, Iberia — simultaneous outbreaks',
        regions: [
          // Northern Italy — Florence, Venice, Genoa, Milan
          { latitude: 44.4949, longitude: 11.3426, radius: 700000, intensity: 1.0 },
          // Central Italy — Rome, Naples
          { latitude: 41.9028, longitude: 12.4964, radius: 650000, intensity: 0.95 },
          // Southern France — Marseille, Avignon (Papal residence)
          { latitude: 43.6047, longitude: 1.4442, radius: 800000, intensity: 1.0 },
          // Spain — Barcelona, Valencia, Seville
          { latitude: 40.4168, longitude: -3.7038, radius: 950000, intensity: 0.9 },
          // Portugal
          { latitude: 38.7169, longitude: -9.1399, radius: 600000, intensity: 0.85 },
          // Switzerland / Germany south
          { latitude: 47.3769, longitude: 8.5417, radius: 750000, intensity: 0.8 },
          // North Africa — Tunis, Morocco
          { latitude: 33.8869, longitude: 9.5375, radius: 900000, intensity: 0.75 },
          // Anatolia interior
          { latitude: 39.0, longitude: 35.0, radius: 850000, intensity: 0.7 },
        ],
      },
      {
        year: 1349,
        label: 'Northern Europe engulfed — Germany, Low Countries, England',
        regions: [
          // England — London
          { latitude: 51.5074, longitude: -0.1278, radius: 750000, intensity: 1.0 },
          // Germany — Cologne, Frankfurt, Hamburg
          { latitude: 51.2217, longitude: 10.5, radius: 1000000, intensity: 0.95 },
          // Low Countries — Bruges, Ghent
          { latitude: 51.0, longitude: 4.0, radius: 700000, intensity: 0.9 },
          // Austria / Hungary
          { latitude: 47.8095, longitude: 13.0550, radius: 850000, intensity: 0.85 },
          // Poland
          { latitude: 52.2297, longitude: 21.0122, radius: 850000, intensity: 0.6 },
          // Balkans — Serbia, Bulgaria
          { latitude: 44.0, longitude: 21.0, radius: 850000, intensity: 0.8 },
          // Scandinavia south — Denmark
          { latitude: 55.6761, longitude: 12.5683, radius: 700000, intensity: 0.75 },
        ],
      },
      {
        year: 1350,
        label: 'Spreads into Scandinavia and deep into Central Europe',
        regions: [
          // Norway
          { latitude: 59.9139, longitude: 10.7522, radius: 800000, intensity: 0.85 },
          // Sweden
          { latitude: 59.3293, longitude: 18.0686, radius: 750000, intensity: 0.8 },
          // Scotland / Ireland
          { latitude: 56.4907, longitude: -4.2026, radius: 650000, intensity: 0.75 },
          // Baltic coast — Gdansk, Riga
          { latitude: 54.3520, longitude: 18.6466, radius: 800000, intensity: 0.8 },
          // Bohemia / Czech lands
          { latitude: 50.0755, longitude: 14.4378, radius: 700000, intensity: 0.75 },
          // Middle East — Baghdad, Cairo full spread
          { latitude: 33.3152, longitude: 44.3661, radius: 850000, intensity: 0.7 },
        ],
      },
      {
        year: 1351,
        label: 'Enters Russia — Moscow and Novgorod regions',
        regions: [
          // Novgorod
          { latitude: 58.5217, longitude: 31.2755, radius: 800000, intensity: 0.9 },
          // Moscow
          { latitude: 55.7558, longitude: 37.6173, radius: 750000, intensity: 0.8 },
          // Ukraine / Kiev
          { latitude: 50.4501, longitude: 30.5234, radius: 800000, intensity: 0.8 },
          // Lithuania / Baltic states
          { latitude: 54.6872, longitude: 25.2797, radius: 750000, intensity: 0.7 },
          // Finland
          { latitude: 60.1699, longitude: 24.9384, radius: 700000, intensity: 0.65 },
        ],
      },
      {
        year: 1353,
        label: 'Final major wave — waning in the West, persisting in Russia',
        regions: [
          // Central Russia residual
          { latitude: 55.7558, longitude: 37.6173, radius: 1000000, intensity: 0.6 },
          // Siberia frontier
          { latitude: 56.85, longitude: 60.61, radius: 900000, intensity: 0.4 },
          // Scandinavia residual
          { latitude: 62.0, longitude: 15.0, radius: 1000000, intensity: 0.45 },
          // Eastern Europe residual
          { latitude: 50.0, longitude: 20.0, radius: 1100000, intensity: 0.4 },
        ],
      },
    ],
  },

  // =========================================================================
  // 3. SMALLPOX IN THE AMERICAS  1519–1600
  // =========================================================================
  {
    id: 'smallpox_americas',
    name: 'Smallpox in the Americas',
    emoji: '⚔️',
    color: '#DC2626',
    period: '1519–1600',
    yearMin: 1519,
    yearMax: 1600,
    origin: {
      latitude: 18.7357,
      longitude: -70.1627,
      label: 'Hispaniola / Caribbean (Cortés expedition)',
    },
    deathToll: '56 million indigenous people',
    description:
      'When Spanish conquistadors arrived in the Americas, they unknowingly carried smallpox — a disease for which indigenous populations had zero immunity after millennia of isolation. The virus spread faster than the Spanish armies themselves, often killing populations before Europeans even arrived. An estimated 90 percent of the pre-Columbian population, perhaps 56 million people, perished from smallpox and related Old World diseases within a century, the single greatest demographic catastrophe in human history.',
    funFact:
      'The Aztec emperor Cuitláhuac, who led the successful repulsion of Cortés\'s first invasion ("La Noche Triste"), died of smallpox just 80 days after taking the throne — never having met a European in person.',
    spread: [
      {
        year: 1519,
        label: 'Smallpox established in Caribbean — Cortés lands in Mexico',
        regions: [
          // Hispaniola
          { latitude: 18.7357, longitude: -70.1627, radius: 500000, intensity: 1.0 },
          // Cuba
          { latitude: 21.5218, longitude: -77.7812, radius: 500000, intensity: 0.9 },
          // Puerto Rico
          { latitude: 18.2208, longitude: -66.5901, radius: 450000, intensity: 0.85 },
          // Yucatán coast — Cortés expedition landing
          { latitude: 19.4326, longitude: -89.5, radius: 500000, intensity: 0.8 },
        ],
      },
      {
        year: 1520,
        label: 'Tenochtitlan falls — central Mexico devastated',
        regions: [
          // Tenochtitlan / Mexico City
          { latitude: 19.4326, longitude: -99.1332, radius: 700000, intensity: 1.0 },
          // Central Mexican plateau
          { latitude: 20.0, longitude: -99.0, radius: 800000, intensity: 0.95 },
          // Tlaxcala region
          { latitude: 19.3182, longitude: -98.2375, radius: 600000, intensity: 0.9 },
          // Gulf coast — Veracruz
          { latitude: 19.1738, longitude: -96.1342, radius: 600000, intensity: 0.85 },
          // Oaxaca region
          { latitude: 17.0732, longitude: -96.7266, radius: 650000, intensity: 0.8 },
          // Caribbean — Jamaica
          { latitude: 18.1096, longitude: -77.2975, radius: 500000, intensity: 0.75 },
        ],
      },
      {
        year: 1524,
        label: 'Reaches Central America and the Maya heartland',
        regions: [
          // Guatemala highland Maya
          { latitude: 15.7835, longitude: -90.2308, radius: 700000, intensity: 0.95 },
          // Honduras / Yucatán
          { latitude: 15.2, longitude: -86.2, radius: 700000, intensity: 0.9 },
          // Nicaragua / Costa Rica
          { latitude: 12.87, longitude: -85.2, radius: 650000, intensity: 0.85 },
          // Northern Mexico — advancing north
          { latitude: 25.0, longitude: -104.0, radius: 800000, intensity: 0.7 },
          // Colombia coast — via sea
          { latitude: 4.7110, longitude: -74.0721, radius: 600000, intensity: 0.65 },
        ],
      },
      {
        year: 1530,
        label: 'Inca Empire collapses — South America engulfed',
        regions: [
          // Peru — Cuzco (Inca capital)
          { latitude: -13.5319, longitude: -71.9675, radius: 800000, intensity: 1.0 },
          // Ecuador / Quito region
          { latitude: -0.2299, longitude: -78.5249, radius: 700000, intensity: 0.9 },
          // Colombia interior
          { latitude: 4.7110, longitude: -74.0721, radius: 750000, intensity: 0.85 },
          // Bolivia highlands
          { latitude: -16.5, longitude: -68.15, radius: 800000, intensity: 0.85 },
          // Venezuela coast
          { latitude: 10.48, longitude: -66.9, radius: 700000, intensity: 0.75 },
          // Northern Chile
          { latitude: -23.65, longitude: -70.4, radius: 700000, intensity: 0.7 },
          // Amazon basin advancing
          { latitude: -3.0, longitude: -60.0, radius: 1000000, intensity: 0.6 },
        ],
      },
      {
        year: 1545,
        label: 'Cocoliztli epidemic compound wave — Mexico loses 80% of survivors',
        regions: [
          // Central Mexico resurgence
          { latitude: 20.0, longitude: -100.0, radius: 900000, intensity: 0.95 },
          // Southern Mexico / Chiapas
          { latitude: 16.75, longitude: -93.1, radius: 750000, intensity: 0.9 },
          // Northern Mexico — Sonora, Chihuahua
          { latitude: 29.0, longitude: -106.0, radius: 900000, intensity: 0.75 },
          // Brazil — Portuguese settlements
          { latitude: -12.97, longitude: -38.5, radius: 800000, intensity: 0.7 },
          // River Plate / Argentina north
          { latitude: -27.0, longitude: -65.0, radius: 850000, intensity: 0.6 },
          // Andes south — Chile central
          { latitude: -33.45, longitude: -70.67, radius: 700000, intensity: 0.65 },
        ],
      },
      {
        year: 1560,
        label: 'Spreads into the Brazilian interior and La Plata basin',
        regions: [
          // Brazil interior — São Paulo, Rio
          { latitude: -15.78, longitude: -47.93, radius: 1100000, intensity: 0.85 },
          // Paraguay / Guaraní territory
          { latitude: -25.29, longitude: -57.65, radius: 800000, intensity: 0.8 },
          // Argentina / Río de la Plata
          { latitude: -34.6037, longitude: -58.3816, radius: 800000, intensity: 0.7 },
          // Amazon basin deep
          { latitude: -5.0, longitude: -55.0, radius: 1200000, intensity: 0.65 },
          // Southeast North America — via Caribbean trade
          { latitude: 30.0, longitude: -85.0, radius: 800000, intensity: 0.55 },
        ],
      },
      {
        year: 1580,
        label: 'North America interior — Pueblo peoples and Great Plains fringes',
        regions: [
          // Southwest USA — Pueblo regions
          { latitude: 35.0, longitude: -106.65, radius: 800000, intensity: 0.8 },
          // Mississippi Valley
          { latitude: 35.15, longitude: -90.05, radius: 900000, intensity: 0.7 },
          // Eastern seaboard — Virginia / Carolinas
          { latitude: 35.0, longitude: -78.0, radius: 750000, intensity: 0.65 },
          // New England coastal
          { latitude: 42.0, longitude: -71.0, radius: 700000, intensity: 0.6 },
          // Patagonia / southern Andes
          { latitude: -45.0, longitude: -68.0, radius: 900000, intensity: 0.55 },
        ],
      },
      {
        year: 1600,
        label: 'Pandemic wanes — entire hemisphere transformed',
        regions: [
          // Great Plains — central North America
          { latitude: 41.0, longitude: -100.0, radius: 1200000, intensity: 0.5 },
          // Pacific Northwest coast
          { latitude: 49.0, longitude: -123.0, radius: 900000, intensity: 0.45 },
          // Hudson Bay / Canada
          { latitude: 55.0, longitude: -85.0, radius: 1200000, intensity: 0.4 },
          // Tierra del Fuego / extreme south
          { latitude: -54.0, longitude: -68.0, radius: 800000, intensity: 0.4 },
        ],
      },
    ],
  },

  // =========================================================================
  // 4. SPANISH FLU  1918–1920
  // =========================================================================
  {
    id: 'spanish_flu',
    name: 'Spanish Flu',
    emoji: '🤧',
    color: '#2563EB',
    period: '1918–1920',
    yearMin: 1918,
    yearMax: 1920,
    origin: {
      latitude: 39.0917,
      longitude: -96.8467,
      label: 'Camp Funston, Kansas, USA',
    },
    deathToll: '50–100 million',
    description:
      'The 1918 influenza pandemic was the most lethal pandemic of the 20th century, killing more people in 24 weeks than AIDS killed in 24 years. Spreading at the speed of World War I troop ships and trains, it infected an estimated 500 million people — one-third of the world\'s population — in under two years. Unusually, it killed young adults aged 20–40 most severely, inverting the typical flu mortality curve, possibly because it triggered a catastrophic immune overreaction (cytokine storm).',
    funFact:
      'The pandemic was nicknamed "Spanish Flu" not because it originated in Spain, but because Spain — a neutral WWI country — was the only nation without wartime press censorship and therefore the only one that reported the epidemic openly; the warring nations suppressed news to avoid demoralizing troops.',
    spread: [
      {
        year: 1918,
        label: 'First wave (March–June) — military camps, USA and Western Front',
        regions: [
          // Camp Funston, Kansas
          { latitude: 39.0917, longitude: -96.8467, radius: 800000, intensity: 1.0 },
          // Eastern USA — New York, Boston
          { latitude: 40.7128, longitude: -74.0060, radius: 1000000, intensity: 0.9 },
          // Western Front — France, Belgium
          { latitude: 50.0, longitude: 3.0, radius: 1000000, intensity: 0.95 },
          // Britain — Aldershot, London
          { latitude: 51.5074, longitude: -0.1278, radius: 900000, intensity: 0.9 },
          // Germany — Rhine front
          { latitude: 51.0, longitude: 9.0, radius: 1000000, intensity: 0.85 },
          // Paris
          { latitude: 48.8566, longitude: 2.3522, radius: 800000, intensity: 0.85 },
          // Spain — Madrid (gives pandemic its name)
          { latitude: 40.4168, longitude: -3.7038, radius: 900000, intensity: 0.8 },
        ],
      },
      {
        year: 1918,
        label: 'Second wave (October–December) — deadliest; spreads globally via ports',
        regions: [
          // Entire USA
          { latitude: 39.5, longitude: -98.35, radius: 2500000, intensity: 1.0 },
          // Canada
          { latitude: 56.13, longitude: -106.35, radius: 2500000, intensity: 0.9 },
          // Western Europe — full continent
          { latitude: 51.0, longitude: 10.0, radius: 2000000, intensity: 1.0 },
          // Eastern Europe / Russia
          { latitude: 55.0, longitude: 37.0, radius: 2200000, intensity: 0.9 },
          // West Africa — Sierra Leone (Freetown port)
          { latitude: 8.46, longitude: -13.23, radius: 1200000, intensity: 0.95 },
          // South Africa
          { latitude: -29.0, longitude: 25.0, radius: 1500000, intensity: 0.9 },
          // India — British troops returning
          { latitude: 20.5937, longitude: 78.9629, radius: 2500000, intensity: 1.0 },
          // Australia
          { latitude: -25.27, longitude: 133.77, radius: 2000000, intensity: 0.85 },
          // Southeast Asia
          { latitude: 13.75, longitude: 100.5, radius: 1800000, intensity: 0.9 },
          // China
          { latitude: 35.86, longitude: 104.19, radius: 2200000, intensity: 0.85 },
          // Brazil — Santos, Rio de Janeiro
          { latitude: -14.24, longitude: -51.93, radius: 2000000, intensity: 0.9 },
          // Argentina — Buenos Aires
          { latitude: -38.42, longitude: -63.62, radius: 1800000, intensity: 0.8 },
          // Scandinavia
          { latitude: 62.0, longitude: 15.0, radius: 1300000, intensity: 0.85 },
          // Middle East
          { latitude: 30.0, longitude: 40.0, radius: 1800000, intensity: 0.8 },
          // Japan
          { latitude: 36.2048, longitude: 138.2529, radius: 1500000, intensity: 0.85 },
        ],
      },
      {
        year: 1919,
        label: 'Third wave — circulating globally, diminishing severity',
        regions: [
          // North America residual
          { latitude: 44.0, longitude: -80.0, radius: 2000000, intensity: 0.65 },
          // Europe residual
          { latitude: 50.0, longitude: 15.0, radius: 2200000, intensity: 0.6 },
          // India residual — still severe
          { latitude: 22.0, longitude: 80.0, radius: 2500000, intensity: 0.75 },
          // Sub-Saharan Africa
          { latitude: -5.0, longitude: 25.0, radius: 2500000, intensity: 0.65 },
          // Pacific Islands — Samoa worst hit
          { latitude: -13.76, longitude: -172.1, radius: 800000, intensity: 0.9 },
          // Central Asia / Russia
          { latitude: 50.0, longitude: 65.0, radius: 2500000, intensity: 0.6 },
          // Latin America residual
          { latitude: -15.0, longitude: -55.0, radius: 2500000, intensity: 0.55 },
        ],
      },
      {
        year: 1920,
        label: 'Fourth wave — final flare-ups, pandemic ends',
        regions: [
          // North America final
          { latitude: 45.0, longitude: -90.0, radius: 2000000, intensity: 0.4 },
          // Europe final
          { latitude: 52.0, longitude: 18.0, radius: 2000000, intensity: 0.35 },
          // Russia / Eastern Europe
          { latitude: 57.0, longitude: 50.0, radius: 2500000, intensity: 0.45 },
          // East Asia final
          { latitude: 35.0, longitude: 110.0, radius: 2000000, intensity: 0.35 },
        ],
      },
    ],
  },

  // =========================================================================
  // 5. CHOLERA — FIRST PANDEMIC  1817–1824
  // =========================================================================
  {
    id: 'cholera',
    name: 'Cholera (First Pandemic)',
    emoji: '💧',
    color: '#059669',
    period: '1817–1824',
    yearMin: 1817,
    yearMax: 1824,
    origin: {
      latitude: 23.17,
      longitude: 89.21,
      label: 'Jessore, Bengal, India',
    },
    deathToll: 'Tens of millions across Asia',
    description:
      'The first of seven cholera pandemics that would batter the world across the 19th and 20th centuries, the 1817 outbreak originated in the Ganges Delta and spread along British Indian trade routes with lethal efficiency. British military movements carried it from Bengal to the Persian Gulf, East Africa, Southeast Asia, and the doorstep of Europe before a bitter Russian winter finally halted its westward advance. The pandemic killed hundreds of thousands of British and native Indian soldiers and devastated coastal trading cities across Asia.',
    funFact:
      'The Asiatic cholera pandemic killed so many of the Grand Army of the Ottoman Empire that the Sultan\'s military capacity was temporarily crippled; British India lost an estimated 10,000 troops to the disease in a single year, more than to all combat in the same period.',
    spread: [
      {
        year: 1817,
        label: 'Erupts in Bengal — spreads along Ganges and Indian coast',
        regions: [
          // Jessore / Bengal Delta
          { latitude: 23.17, longitude: 89.21, radius: 600000, intensity: 1.0 },
          // Calcutta (Kolkata)
          { latitude: 22.5726, longitude: 88.3639, radius: 550000, intensity: 1.0 },
          // Ganges plain — Patna, Benares
          { latitude: 25.6, longitude: 84.0, radius: 700000, intensity: 0.85 },
          // Delhi / Doab region
          { latitude: 28.6139, longitude: 77.2090, radius: 700000, intensity: 0.75 },
          // Madras (Chennai) coast
          { latitude: 13.0827, longitude: 80.2707, radius: 600000, intensity: 0.8 },
          // Bombay (Mumbai) coast
          { latitude: 19.076, longitude: 72.8777, radius: 600000, intensity: 0.75 },
        ],
      },
      {
        year: 1818,
        label: 'British military carries it across India and to Ceylon',
        regions: [
          // All of Hindustan interior
          { latitude: 22.0, longitude: 80.0, radius: 1500000, intensity: 0.9 },
          // Ceylon (Sri Lanka)
          { latitude: 7.8731, longitude: 80.7718, radius: 500000, intensity: 0.85 },
          // Bombay coast — Arabian Sea ports
          { latitude: 19.076, longitude: 72.8777, radius: 750000, intensity: 0.85 },
          // Burma (Myanmar) — Rangoon
          { latitude: 16.8661, longitude: 96.1951, radius: 650000, intensity: 0.75 },
          // Malacca Straits — Penang
          { latitude: 5.4164, longitude: 100.3327, radius: 600000, intensity: 0.7 },
        ],
      },
      {
        year: 1820,
        label: 'Reaches Southeast Asia, China, and the Persian Gulf',
        regions: [
          // Siam (Thailand) — Bangkok
          { latitude: 13.7563, longitude: 100.5018, radius: 700000, intensity: 0.9 },
          // Vietnam / Indochina coast
          { latitude: 16.0, longitude: 108.0, radius: 750000, intensity: 0.85 },
          // Philippines — Manila
          { latitude: 14.5995, longitude: 120.9842, radius: 600000, intensity: 0.85 },
          // China — Canton (Guangzhou) coast
          { latitude: 23.1291, longitude: 113.2644, radius: 750000, intensity: 0.8 },
          // Java / Indonesia — Batavia (Jakarta)
          { latitude: -6.2088, longitude: 106.8456, radius: 700000, intensity: 0.8 },
          // Persian Gulf — Muscat, Basra
          { latitude: 23.6, longitude: 58.6, radius: 700000, intensity: 0.8 },
          // Oman coast
          { latitude: 21.47, longitude: 55.97, radius: 600000, intensity: 0.75 },
        ],
      },
      {
        year: 1821,
        label: 'Spreads into the Ottoman Middle East and East Africa',
        regions: [
          // Iraq — Baghdad, Basra
          { latitude: 33.3152, longitude: 44.3661, radius: 750000, intensity: 0.9 },
          // Persia — Tehran, Shiraz
          { latitude: 32.43, longitude: 53.69, radius: 900000, intensity: 0.85 },
          // Arabia — Mecca, Medina (pilgrimage route)
          { latitude: 23.89, longitude: 45.08, radius: 850000, intensity: 0.85 },
          // Yemen coast
          { latitude: 15.55, longitude: 48.52, radius: 700000, intensity: 0.8 },
          // East Africa — Zanzibar, Mozambique coast
          { latitude: -6.16, longitude: 39.19, radius: 700000, intensity: 0.8 },
          // Egypt — Alexandria, Cairo
          { latitude: 30.0444, longitude: 31.2357, radius: 700000, intensity: 0.75 },
          // Caucasus — Georgia, Azerbaijan
          { latitude: 41.7, longitude: 44.8, radius: 700000, intensity: 0.65 },
        ],
      },
      {
        year: 1822,
        label: 'Reaches Syria, Anatolia, and threatens Europe via Black Sea',
        regions: [
          // Syria — Damascus, Aleppo
          { latitude: 35.0, longitude: 38.0, radius: 800000, intensity: 0.85 },
          // Anatolia (Turkey)
          { latitude: 39.0, longitude: 35.0, radius: 1000000, intensity: 0.8 },
          // Black Sea coast — Crimea / Odessa
          { latitude: 46.0, longitude: 30.0, radius: 800000, intensity: 0.75 },
          // Caspian region — Astrakhan
          { latitude: 46.35, longitude: 48.04, radius: 700000, intensity: 0.8 },
          // China interior — Yangzi basin
          { latitude: 30.0, longitude: 112.0, radius: 1200000, intensity: 0.7 },
          // Korea / Japanese coast — first approach
          { latitude: 37.5665, longitude: 126.9780, radius: 700000, intensity: 0.6 },
        ],
      },
      {
        year: 1824,
        label: 'Pandemic halts — winter stops European advance; waning in Asia',
        regions: [
          // Russia — Caucasus / Volga residual (Ural winter stops it)
          { latitude: 52.0, longitude: 50.0, radius: 1000000, intensity: 0.55 },
          // Levant / Egypt residual
          { latitude: 31.0, longitude: 35.0, radius: 900000, intensity: 0.45 },
          // East Africa residual
          { latitude: -10.0, longitude: 37.0, radius: 1000000, intensity: 0.45 },
          // India endemic baseline
          { latitude: 23.0, longitude: 82.0, radius: 1500000, intensity: 0.4 },
          // South China Sea residual
          { latitude: 15.0, longitude: 110.0, radius: 1200000, intensity: 0.35 },
        ],
      },
    ],
  },
];
