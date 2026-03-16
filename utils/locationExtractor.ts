// utils/locationExtractor.ts
// Extrage coordonate din titlul și narațiunea unui eveniment
// Fără API extern, fără coordonate în DB — totul local

export interface ExtractedLocation {
  latitude: number;
  longitude: number;
  label: string; // numele locației găsite
}

// ── Dicționar complet: orașe mari + țări + imperii istorice + regiuni
// Ordine importantă: orașele sunt ÎNAINTE de țări (match mai specific câștigă)
const LOCATION_KEYWORDS: Array<{
  keywords: string[];
  latitude: number;
  longitude: number;
  label: string;
  priority: number; // mai mare = mai specific
}> = [
  // ── ORAȘE MAJORE (priority 3)
  { keywords: ['paris', 'île-de-france', 'ile-de-france'], latitude: 48.8566, longitude: 2.3522, label: 'Paris, France', priority: 3 },
  { keywords: ['london', 'londra', 'westminster'], latitude: 51.5074, longitude: -0.1278, label: 'London, UK', priority: 3 },
  { keywords: ['berlin', 'potsdam', 'prussia', 'prusia', 'prusia'], latitude: 52.52, longitude: 13.405, label: 'Berlin, Germany', priority: 3 },
  { keywords: ['rome', 'roma', 'vatican', 'lazio'], latitude: 41.9028, longitude: 12.4964, label: 'Rome, Italy', priority: 3 },
  { keywords: ['moscow', 'moscova', 'kremlin', 'moskva'], latitude: 55.7558, longitude: 37.6173, label: 'Moscow, Russia', priority: 3 },
  { keywords: ['st. petersburg', 'saint petersburg', 'petrograd', 'leningrad', 'stalingrad', 'volgograd'], latitude: 59.9343, longitude: 30.3351, label: 'St. Petersburg, Russia', priority: 3 },
  { keywords: ['new york', 'manhattan', 'brooklyn', 'wall street'], latitude: 40.7128, longitude: -74.006, label: 'New York, USA', priority: 3 },
  { keywords: ['washington dc', 'washington d.c', 'white house', 'pentagon', 'capitol hill'], latitude: 38.9072, longitude: -77.0369, label: 'Washington D.C., USA', priority: 3 },
  { keywords: ['hiroshima'], latitude: 34.3853, longitude: 132.4553, label: 'Hiroshima, Japan', priority: 3 },
  { keywords: ['nagasaki'], latitude: 32.7503, longitude: 129.8779, label: 'Nagasaki, Japan', priority: 3 },
  { keywords: ['tokyo', 'edo', 'tokio'], latitude: 35.6762, longitude: 139.6503, label: 'Tokyo, Japan', priority: 3 },
  { keywords: ['beijing', 'peking', 'forbidden city'], latitude: 39.9042, longitude: 116.4074, label: 'Beijing, China', priority: 3 },
  { keywords: ['shanghai'], latitude: 31.2304, longitude: 121.4737, label: 'Shanghai, China', priority: 3 },
  { keywords: ['istanbul', 'constantinople', 'byzantium', 'bizant'], latitude: 41.0082, longitude: 28.9784, label: 'Istanbul, Turkey', priority: 3 },
  { keywords: ['jerusalem', 'ierusalim', 'holy city', 'temple mount'], latitude: 31.7683, longitude: 35.2137, label: 'Jerusalem', priority: 3 },
  { keywords: ['cairo', 'cairo', 'giza', 'memphis egypt'], latitude: 30.0444, longitude: 31.2357, label: 'Cairo, Egypt', priority: 3 },
  { keywords: ['athens', 'atena', 'athenian', 'acropolis'], latitude: 37.9838, longitude: 23.7275, label: 'Athens, Greece', priority: 3 },
  { keywords: ['vienna', 'wien', 'viana', 'habsbur', 'austrian capital'], latitude: 48.2082, longitude: 16.3738, label: 'Vienna, Austria', priority: 3 },
  { keywords: ['madrid', 'castile', 'castilia'], latitude: 40.4168, longitude: -3.7038, label: 'Madrid, Spain', priority: 3 },
  { keywords: ['barcelona'], latitude: 41.3851, longitude: 2.1734, label: 'Barcelona, Spain', priority: 3 },
  { keywords: ['lisbon', 'lisboa', 'portugal capital'], latitude: 38.7223, longitude: -9.1393, label: 'Lisbon, Portugal', priority: 3 },
  { keywords: ['amsterdam', 'dutch republic', 'netherlands capital'], latitude: 52.3676, longitude: 4.9041, label: 'Amsterdam, Netherlands', priority: 3 },
  { keywords: ['brussels', 'bruxelles', 'brüssel'], latitude: 50.8503, longitude: 4.3517, label: 'Brussels, Belgium', priority: 3 },
  { keywords: ['warsaw', 'warszawa', 'varsovia'], latitude: 52.2297, longitude: 21.0122, label: 'Warsaw, Poland', priority: 3 },
  { keywords: ['prague', 'praga', 'bohemia'], latitude: 50.0755, longitude: 14.4378, label: 'Prague, Czech Republic', priority: 3 },
  { keywords: ['budapest', 'buda', 'pest', 'hungary capital'], latitude: 47.4979, longitude: 19.0402, label: 'Budapest, Hungary', priority: 3 },
  { keywords: ['bucharest', 'bucurești', 'bucuresti'], latitude: 44.4268, longitude: 26.1025, label: 'Bucharest, Romania', priority: 3 },
  { keywords: ['belgrade', 'beograd'], latitude: 44.8176, longitude: 20.4633, label: 'Belgrade, Serbia', priority: 3 },
  { keywords: ['kyiv', 'kiev', 'kiev'], latitude: 50.4501, longitude: 30.5234, label: 'Kyiv, Ukraine', priority: 3 },
  { keywords: ['stockholm', 'swedish capital'], latitude: 59.3293, longitude: 18.0686, label: 'Stockholm, Sweden', priority: 3 },
  { keywords: ['oslo', 'norwegian capital'], latitude: 59.9139, longitude: 10.7522, label: 'Oslo, Norway', priority: 3 },
  { keywords: ['copenhagen', 'københavn', 'danish capital'], latitude: 55.6761, longitude: 12.5683, label: 'Copenhagen, Denmark', priority: 3 },
  { keywords: ['helsinki'], latitude: 60.1699, longitude: 24.9384, label: 'Helsinki, Finland', priority: 3 },
  { keywords: ['zürich', 'zurich', 'bern', 'swiss capital'], latitude: 47.3769, longitude: 8.5417, label: 'Zürich, Switzerland', priority: 3 },
  { keywords: ['baghdad', 'mesopotamia', 'babylon', 'babylonia', 'iraq capital'], latitude: 33.3152, longitude: 44.3661, label: 'Baghdad, Iraq', priority: 3 },
  { keywords: ['tehran', 'teheran', 'iran capital'], latitude: 35.6892, longitude: 51.389, label: 'Tehran, Iran', priority: 3 },
  { keywords: ['delhi', 'new delhi', 'mughal'], latitude: 28.6139, longitude: 77.209, label: 'Delhi, India', priority: 3 },
  { keywords: ['mumbai', 'bombay'], latitude: 19.076, longitude: 72.8777, label: 'Mumbai, India', priority: 3 },
  { keywords: ['sydney'], latitude: -33.8688, longitude: 151.2093, label: 'Sydney, Australia', priority: 3 },
  { keywords: ['buenos aires'], latitude: -34.6037, longitude: -58.3816, label: 'Buenos Aires, Argentina', priority: 3 },
  { keywords: ['rio de janeiro', 'rio de janeiro'], latitude: -22.9068, longitude: -43.1729, label: 'Rio de Janeiro, Brazil', priority: 3 },
  { keywords: ['mexico city', 'ciudad de mexico', 'tenochtitlan', 'aztec capital'], latitude: 19.4326, longitude: -99.1332, label: 'Mexico City, Mexico', priority: 3 },
  { keywords: ['havana', 'habana', 'cuba capital'], latitude: 23.1136, longitude: -82.3666, label: 'Havana, Cuba', priority: 3 },
  { keywords: ['cape town', 'capetown'], latitude: -33.9249, longitude: 18.4241, label: 'Cape Town, South Africa', priority: 3 },
  { keywords: ['nairobi'], latitude: -1.2921, longitude: 36.8219, label: 'Nairobi, Kenya', priority: 3 },
  { keywords: ['lagos'], latitude: 6.5244, longitude: 3.3792, label: 'Lagos, Nigeria', priority: 3 },
  { keywords: ['singapore', 'singapur'], latitude: 1.3521, longitude: 103.8198, label: 'Singapore', priority: 3 },
  { keywords: ['hong kong', 'hongkong'], latitude: 22.3193, longitude: 114.1694, label: 'Hong Kong', priority: 3 },
  { keywords: ['seoul', 'seul', 'joseon', 'chosun'], latitude: 37.5665, longitude: 126.978, label: 'Seoul, South Korea', priority: 3 },
  { keywords: ['pyongyang', 'north korea capital'], latitude: 39.0392, longitude: 125.7625, label: 'Pyongyang, North Korea', priority: 3 },
  { keywords: ['hanoi', 'saigon', 'ho chi minh'], latitude: 21.0285, longitude: 105.8542, label: 'Hanoi, Vietnam', priority: 3 },
  { keywords: ['bangkok', 'siam capital'], latitude: 13.7563, longitude: 100.5018, label: 'Bangkok, Thailand', priority: 3 },
  { keywords: ['manila', 'philippine capital'], latitude: 14.5995, longitude: 120.9842, label: 'Manila, Philippines', priority: 3 },
  { keywords: ['jakarta', 'batavia', 'dutch east indies capital'], latitude: -6.2088, longitude: 106.8456, label: 'Jakarta, Indonesia', priority: 3 },
  { keywords: ['karachi', 'lahore', 'islamabad'], latitude: 33.6844, longitude: 73.0479, label: 'Islamabad, Pakistan', priority: 3 },
  { keywords: ['kabul', 'afghan capital'], latitude: 34.5553, longitude: 69.2075, label: 'Kabul, Afghanistan', priority: 3 },

  // ── BĂTĂLII & LOCURI ISTORICE CELEBRE (priority 4 — cel mai specific)
  { keywords: ['waterloo'], latitude: 50.6954, longitude: 4.3975, label: 'Waterloo, Belgium', priority: 4 },
  { keywords: ['gettysburg'], latitude: 39.8309, longitude: -77.2311, label: 'Gettysburg, USA', priority: 4 },
  { keywords: ['pearl harbor', 'pearl harbour'], latitude: 21.3619, longitude: -157.9766, label: 'Pearl Harbor, Hawaii', priority: 4 },
  { keywords: ['normandy', 'normandie', 'd-day', 'omaha beach'], latitude: 49.3705, longitude: -0.5607, label: 'Normandy, France', priority: 4 },
  { keywords: ['auschwitz', 'birkenau', 'oświęcim'], latitude: 50.0343, longitude: 19.1784, label: 'Auschwitz, Poland', priority: 4 },
  { keywords: ['thermopylae', 'thermopyle'], latitude: 38.7953, longitude: 22.5331, label: 'Thermopylae, Greece', priority: 4 },
  { keywords: ['marathon'], latitude: 38.1453, longitude: 23.9614, label: 'Marathon, Greece', priority: 4 },
  { keywords: ['hastings'], latitude: 50.8543, longitude: 0.5732, label: 'Hastings, England', priority: 4 },
  { keywords: ['agincourt', 'azincourt'], latitude: 50.4637, longitude: 2.1388, label: 'Agincourt, France', priority: 4 },
  { keywords: ['trafalgar'], latitude: 36.1855, longitude: -6.0339, label: 'Cape Trafalgar, Spain', priority: 4 },
  { keywords: ['verdun'], latitude: 49.162, longitude: 5.3872, label: 'Verdun, France', priority: 4 },
  { keywords: ['somme'], latitude: 50.0122, longitude: 2.7777, label: 'Somme, France', priority: 4 },
  { keywords: ['gallipoli', 'çanakkale'], latitude: 40.1957, longitude: 26.4093, label: 'Gallipoli, Turkey', priority: 4 },
  { keywords: ['kursk'], latitude: 51.7304, longitude: 36.1936, label: 'Kursk, Russia', priority: 4 },
  { keywords: ['chernobyl', 'cernobîl', 'pripyat'], latitude: 51.2729, longitude: 30.2218, label: 'Chernobyl, Ukraine', priority: 4 },
  { keywords: ['pompeii', 'pompei', 'vesuvius', 'vezuviu'], latitude: 40.7485, longitude: 14.4848, label: 'Pompeii, Italy', priority: 4 },
  { keywords: ['troy', 'troia', 'trojan'], latitude: 39.9573, longitude: 26.2389, label: 'Troy, Turkey', priority: 4 },
  { keywords: ['carthage', 'cartagina'], latitude: 36.8528, longitude: 10.3233, label: 'Carthage, Tunisia', priority: 4 },
  { keywords: ['alexandria', 'alexandria egypt'], latitude: 31.1975, longitude: 29.8925, label: 'Alexandria, Egypt', priority: 4 },
  { keywords: ['stalingrad'], latitude: 48.7, longitude: 44.5, label: 'Stalingrad (Volgograd), Russia', priority: 4 },

  // ── ȚĂRI (priority 2)
  { keywords: ['afghanistan', 'afghan'], latitude: 33.9391, longitude: 67.71, label: 'Afghanistan', priority: 2 },
  { keywords: ['albania', 'albanian'], latitude: 41.1533, longitude: 20.1683, label: 'Albania', priority: 2 },
  { keywords: ['algeria', 'algerian'], latitude: 28.0339, longitude: 1.6596, label: 'Algeria', priority: 2 },
  { keywords: ['angola', 'angolan'], latitude: -11.2027, longitude: 17.8739, label: 'Angola', priority: 2 },
  { keywords: ['argentina', 'argentine', 'argentinian'], latitude: -38.416, longitude: -63.6167, label: 'Argentina', priority: 2 },
  { keywords: ['australia', 'australian'], latitude: -25.2744, longitude: 133.7751, label: 'Australia', priority: 2 },
  { keywords: ['austria', 'austrian', 'habsburg', 'habsburg empire'], latitude: 47.5162, longitude: 14.5501, label: 'Austria', priority: 2 },
  { keywords: ['belgium', 'belgian', 'belgique'], latitude: 50.5039, longitude: 4.4699, label: 'Belgium', priority: 2 },
  { keywords: ['bolivia', 'bolivian'], latitude: -16.2902, longitude: -63.5887, label: 'Bolivia', priority: 2 },
  { keywords: ['brazil', 'brasil', 'brazilian'], latitude: -14.235, longitude: -51.9253, label: 'Brazil', priority: 2 },
  { keywords: ['bulgaria', 'bulgarian'], latitude: 42.7339, longitude: 25.4858, label: 'Bulgaria', priority: 2 },
  { keywords: ['cambodia', 'cambodian', 'khmer'], latitude: 12.5657, longitude: 104.991, label: 'Cambodia', priority: 2 },
  { keywords: ['canada', 'canadian'], latitude: 56.1304, longitude: -106.3468, label: 'Canada', priority: 2 },
  { keywords: ['chile', 'chilean'], latitude: -35.6751, longitude: -71.543, label: 'Chile', priority: 2 },
  { keywords: ['china', 'chinese', 'qing dynasty', 'ming dynasty', 'han dynasty', 'tang dynasty', 'song dynasty'], latitude: 35.8617, longitude: 104.1954, label: 'China', priority: 2 },
  { keywords: ['colombia', 'colombian'], latitude: 4.5709, longitude: -74.2973, label: 'Colombia', priority: 2 },
  { keywords: ['croatia', 'croatian', 'croat', 'hrvatska'], latitude: 45.1, longitude: 15.2, label: 'Croatia', priority: 2 },
  { keywords: ['cuba', 'cuban'], latitude: 21.5218, longitude: -77.7812, label: 'Cuba', priority: 2 },
  { keywords: ['czech', 'czechoslovakia', 'bohemia', 'moravia'], latitude: 49.8175, longitude: 15.473, label: 'Czech Republic', priority: 2 },
  { keywords: ['denmark', 'danish', 'danes'], latitude: 56.2639, longitude: 9.5018, label: 'Denmark', priority: 2 },
  { keywords: ['egypt', 'egyptian', 'pharaoh', 'ancient egypt', 'nile'], latitude: 26.8206, longitude: 30.8025, label: 'Egypt', priority: 2 },
  { keywords: ['ethiopia', 'ethiopian', 'abyssinia'], latitude: 9.145, longitude: 40.4897, label: 'Ethiopia', priority: 2 },
  { keywords: ['finland', 'finnish', 'finns'], latitude: 61.9241, longitude: 25.7482, label: 'Finland', priority: 2 },
  { keywords: ['france', 'french', 'gaul', 'frankish', 'gallic'], latitude: 46.2276, longitude: 2.2137, label: 'France', priority: 2 },
  { keywords: ['germany', 'german', 'deutschland', 'reich', 'nazi', 'weimar', 'prussia', 'prussian'], latitude: 51.1657, longitude: 10.4515, label: 'Germany', priority: 2 },
  { keywords: ['ghana', 'ghanaian', 'gold coast'], latitude: 7.9465, longitude: -1.0232, label: 'Ghana', priority: 2 },
  { keywords: ['greece', 'greek', 'hellenic', 'hellenistic'], latitude: 39.0742, longitude: 21.8243, label: 'Greece', priority: 2 },
  { keywords: ['hungary', 'hungarian', 'magyarország'], latitude: 47.1625, longitude: 19.5033, label: 'Hungary', priority: 2 },
  { keywords: ['india', 'indian', 'hindustan', 'bengal', 'maratha', 'british india', 'mughal empire'], latitude: 20.5937, longitude: 78.9629, label: 'India', priority: 2 },
  { keywords: ['indonesia', 'indonesian', 'dutch east indies', 'java', 'sumatra', 'borneo'], latitude: -0.7893, longitude: 113.9213, label: 'Indonesia', priority: 2 },
  { keywords: ['iran', 'persian', 'persia', 'iranian'], latitude: 32.4279, longitude: 53.688, label: 'Iran / Persia', priority: 2 },
  { keywords: ['iraq', 'iraqi', 'mesopotamian'], latitude: 33.2232, longitude: 43.6793, label: 'Iraq', priority: 2 },
  { keywords: ['ireland', 'irish', 'éire'], latitude: 53.4129, longitude: -8.2439, label: 'Ireland', priority: 2 },
  { keywords: ['israel', 'israeli', 'palestine', 'palestinian', 'canaan', 'judea', 'galilee'], latitude: 31.0461, longitude: 34.8516, label: 'Israel / Palestine', priority: 2 },
  { keywords: ['italy', 'italian', 'italia', 'papal states', 'venetian', 'genoa', 'florence', 'milan', 'naples'], latitude: 41.8719, longitude: 12.5674, label: 'Italy', priority: 2 },
  { keywords: ['japan', 'japanese', 'nippon', 'samurai', 'shogun', 'meiji', 'tokugawa', 'edo period'], latitude: 36.2048, longitude: 138.2529, label: 'Japan', priority: 2 },
  { keywords: ['jordan', 'jordanian', 'hashemite'], latitude: 30.5852, longitude: 36.2384, label: 'Jordan', priority: 2 },
  { keywords: ['kenya', 'kenyan'], latitude: -0.0236, longitude: 37.9062, label: 'Kenya', priority: 2 },
  { keywords: ['north korea', 'dprk', 'north korean'], latitude: 40.3399, longitude: 127.5101, label: 'North Korea', priority: 2 },
  { keywords: ['south korea', 'republic of korea', 'south korean'], latitude: 35.9078, longitude: 127.7669, label: 'South Korea', priority: 2 },
  { keywords: ['lebanon', 'lebanese', 'phoenicia', 'phoenician'], latitude: 33.8547, longitude: 35.8623, label: 'Lebanon', priority: 2 },
  { keywords: ['libya', 'libyan'], latitude: 26.3351, longitude: 17.2283, label: 'Libya', priority: 2 },
  { keywords: ['malaysia', 'malaysian', 'malaya', 'malayan'], latitude: 4.2105, longitude: 101.9758, label: 'Malaysia', priority: 2 },
  { keywords: ['mexico', 'mexican', 'aztec', 'maya', 'mayan', 'new spain'], latitude: 23.6345, longitude: -102.5528, label: 'Mexico', priority: 2 },
  { keywords: ['mongolia', 'mongolian', 'mongol', 'genghis', 'kublai'], latitude: 46.8625, longitude: 103.8467, label: 'Mongolia', priority: 2 },
  { keywords: ['morocco', 'moroccan', 'maroc'], latitude: 31.7917, longitude: -7.0926, label: 'Morocco', priority: 2 },
  { keywords: ['myanmar', 'burma', 'burmese'], latitude: 21.914, longitude: 95.9562, label: 'Myanmar / Burma', priority: 2 },
  { keywords: ['netherlands', 'dutch', 'holland', 'hollander'], latitude: 52.1326, longitude: 5.2913, label: 'Netherlands', priority: 2 },
  { keywords: ['new zealand', 'maori'], latitude: -40.9006, longitude: 174.886, label: 'New Zealand', priority: 2 },
  { keywords: ['nigeria', 'nigerian'], latitude: 9.082, longitude: 8.6753, label: 'Nigeria', priority: 2 },
  { keywords: ['norway', 'norwegian', 'norse', 'viking'], latitude: 60.472, longitude: 8.4689, label: 'Norway', priority: 2 },
  { keywords: ['pakistan', 'pakistani'], latitude: 30.3753, longitude: 69.3451, label: 'Pakistan', priority: 2 },
  { keywords: ['peru', 'peruvian', 'inca', 'incan'], latitude: -9.19, longitude: -75.0152, label: 'Peru', priority: 2 },
  { keywords: ['philippines', 'filipino', 'philippine'], latitude: 12.8797, longitude: 121.774, label: 'Philippines', priority: 2 },
  { keywords: ['poland', 'polish', 'polska'], latitude: 51.9194, longitude: 19.1451, label: 'Poland', priority: 2 },
  { keywords: ['portugal', 'portuguese'], latitude: 39.3999, longitude: -8.2245, label: 'Portugal', priority: 2 },
  { keywords: ['romania', 'romanian', 'wallachia', 'moldavia', 'transylvania', 'dacia', 'dacian'], latitude: 45.9432, longitude: 24.9668, label: 'Romania', priority: 2 },
  { keywords: ['russia', 'russian', 'soviet', 'ussr', 'tsarist', 'romanov', 'rus'], latitude: 61.524, longitude: 105.3188, label: 'Russia', priority: 2 },
  { keywords: ['saudi arabia', 'saudi', 'arabian'], latitude: 23.8859, longitude: 45.0792, label: 'Saudi Arabia', priority: 2 },
  { keywords: ['serbia', 'serbian', 'yugoslav', 'yugoslavia'], latitude: 44.0165, longitude: 21.0059, label: 'Serbia', priority: 2 },
  { keywords: ['south africa', 'afrikaner', 'boer', 'zulu', 'apartheid'], latitude: -30.5595, longitude: 22.9375, label: 'South Africa', priority: 2 },
  { keywords: ['spain', 'spanish', 'castile', 'aragon', 'iberian', 'iberia'], latitude: 40.4637, longitude: -3.7492, label: 'Spain', priority: 2 },
  { keywords: ['sudan', 'sudanese', 'nubia', 'nubian'], latitude: 12.8628, longitude: 30.2176, label: 'Sudan', priority: 2 },
  { keywords: ['sweden', 'swedish', 'swedes'], latitude: 60.1282, longitude: 18.6435, label: 'Sweden', priority: 2 },
  { keywords: ['switzerland', 'swiss', 'swiss confederation'], latitude: 46.8182, longitude: 8.2275, label: 'Switzerland', priority: 2 },
  { keywords: ['syria', 'syrian', 'damascus'], latitude: 34.802, longitude: 38.9968, label: 'Syria', priority: 2 },
  { keywords: ['taiwan', 'taiwanese', 'formosa'], latitude: 23.6978, longitude: 120.9605, label: 'Taiwan', priority: 2 },
  { keywords: ['thailand', 'thai', 'siam', 'siamese'], latitude: 15.87, longitude: 100.9925, label: 'Thailand', priority: 2 },
  { keywords: ['tunisia', 'tunisian'], latitude: 33.8869, longitude: 9.5375, label: 'Tunisia', priority: 2 },
  { keywords: ['turkey', 'turkish', 'ottoman', 'anatolia', 'anatolian', 'seljuk'], latitude: 38.9637, longitude: 35.2433, label: 'Turkey', priority: 2 },
  { keywords: ['ukraine', 'ukrainian'], latitude: 48.3794, longitude: 31.1656, label: 'Ukraine', priority: 2 },
  { keywords: ['united kingdom', 'britain', 'british', 'england', 'english', 'scotland', 'scottish', 'wales', 'welsh', 'uk'], latitude: 55.3781, longitude: -3.4360, label: 'United Kingdom', priority: 2 },
  { keywords: ['united states', 'america', 'american', 'usa', 'us army', 'us navy', 'confederate', 'union army'], latitude: 37.0902, longitude: -95.7129, label: 'United States', priority: 2 },
  { keywords: ['venezuela', 'venezuelan'], latitude: 6.4238, longitude: -66.5897, label: 'Venezuela', priority: 2 },
  { keywords: ['vietnam', 'vietnamese', 'viet', 'indochina'], latitude: 14.0583, longitude: 108.2772, label: 'Vietnam', priority: 2 },
  { keywords: ['yemen', 'yemeni'], latitude: 15.5527, longitude: 48.5164, label: 'Yemen', priority: 2 },

  // ── IMPERII & ENTITĂȚI ISTORICE (priority 1)
  { keywords: ['roman empire', 'roman republic', 'ancient rome'], latitude: 41.9028, longitude: 12.4964, label: 'Roman Empire', priority: 1 },
  { keywords: ['byzantine', 'byzantine empire', 'eastern roman'], latitude: 41.0082, longitude: 28.9784, label: 'Byzantine Empire', priority: 1 },
  { keywords: ['ottoman empire', 'ottoman sultanate'], latitude: 39.0, longitude: 35.0, label: 'Ottoman Empire', priority: 1 },
  { keywords: ['mongol empire', 'mongol horde', 'golden horde'], latitude: 47.0, longitude: 103.0, label: 'Mongol Empire', priority: 1 },
  { keywords: ['british empire', 'british colonies'], latitude: 55.3781, longitude: -3.436, label: 'British Empire', priority: 1 },
  { keywords: ['french empire', 'napoleonic', 'napoleon'], latitude: 46.2276, longitude: 2.2137, label: 'France (Napoleonic)', priority: 1 },
  { keywords: ['austro-hungarian', 'austro hungarian', 'habsburg empire'], latitude: 47.5162, longitude: 14.5501, label: 'Austro-Hungarian Empire', priority: 1 },
  { keywords: ['soviet union', 'soviet', 'ussr', 'red army'], latitude: 61.524, longitude: 105.3188, label: 'Soviet Union', priority: 1 },
  { keywords: ['holy roman empire', 'holy roman'], latitude: 50.1109, longitude: 8.6821, label: 'Holy Roman Empire', priority: 1 },
  { keywords: ['ancient greece', 'greek city-states', 'sparta', 'spartan', 'macedonian', 'alexander the great'], latitude: 39.0742, longitude: 21.8243, label: 'Ancient Greece', priority: 1 },
];

/**
 * Extrage locația dintr-un eveniment bazat pe text
 * @returns ExtractedLocation | null
 */
export function extractLocation(event: any): ExtractedLocation | null {
  const lang = ['en', 'ro', 'fr', 'de', 'es'];
  const titleParts: string[] = [];
  const narrativeParts: string[] = [];

  // Adună titluri și narațiuni din toate limbile
  for (const l of lang) {
    const t = event.titleTranslations?.[l];
    const n = event.narrativeTranslations?.[l];
    if (t) titleParts.push(t);
    if (n) narrativeParts.push(n.slice(0, 300)); // primele 300 chars din narațiune
  }

  // Fallback pe câmpuri directe
  if (event.title) titleParts.push(event.title);
  if (event.narrative) narrativeParts.push(event.narrative?.slice(0, 300));

  const titleText = titleParts.join(' ').toLowerCase();
  const narrativeText = narrativeParts.join(' ').toLowerCase();

  let bestMatch: typeof LOCATION_KEYWORDS[0] | null = null;
  let bestScore = -1;

  for (const loc of LOCATION_KEYWORDS) {
    for (const keyword of loc.keywords) {
      const kw = keyword.toLowerCase();

      // Check titlu mai întâi (bonus de scor)
      const inTitle = titleText.includes(kw);
      const inNarrative = narrativeText.includes(kw);

      if (!inTitle && !inNarrative) continue;

      // Scor: priority + bonus titlu + lungime keyword (match mai lung = mai specific)
      const score = loc.priority * 10 + (inTitle ? 20 : 0) + kw.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = loc;
      }
    }
  }

  if (!bestMatch) return null;

  return {
    latitude: bestMatch.latitude,
    longitude: bestMatch.longitude,
    label: bestMatch.label,
  };
}

/**
 * Grupează evenimentele după locație (același label = același grup)
 */
export interface LocationGroup {
  label: string;
  latitude: number;
  longitude: number;
  events: any[];
}

export function groupEventsByLocation(events: any[]): LocationGroup[] {
  const groups: Record<string, LocationGroup> = {};

  for (const event of events) {
    const loc = extractLocation(event);
    if (!loc) continue;

    if (!groups[loc.label]) {
      groups[loc.label] = {
        label: loc.label,
        latitude: loc.latitude,
        longitude: loc.longitude,
        events: [],
      };
    }
    groups[loc.label].events.push(event);
  }

  return Object.values(groups);
}