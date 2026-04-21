// utils/locationExtractor.ts
// ═══════════════════════════════════════════════════════════════════════════════
// LOCATION EXTRACTOR — Multi-strategy cascade:
//   1. Use event.location if present (format: "City, Country")
//   2. If null, scan event text (title, narrative, sourceUrl) for known places
//   3. Tolerates natural-feature locations (oceans, gulfs, deserts) → country
//   4. Falls back to country centroid if only a country can be identified
// ═══════════════════════════════════════════════════════════════════════════════

export interface LocationResult {
  latitude: number;
  longitude: number;
  label: string;       // display-ready "City, Country" or region name
  city: string;
  country: string;
}

// ─── Country centroids ────────────────────────────────────────────────────────
const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'Afghanistan': { lat: 33.93, lng: 67.71 },
  'Albania': { lat: 41.15, lng: 20.17 },
  'Algeria': { lat: 28.03, lng: 1.66 },
  'Angola': { lat: -11.2, lng: 17.87 },
  'Argentina': { lat: -38.42, lng: -63.62 },
  'Armenia': { lat: 40.07, lng: 45.04 },
  'Australia': { lat: -25.27, lng: 133.78 },
  'Austria': { lat: 47.52, lng: 14.55 },
  'Azerbaijan': { lat: 40.14, lng: 47.58 },
  'Bahrain': { lat: 26.0, lng: 50.55 },
  'Bangladesh': { lat: 23.68, lng: 90.36 },
  'Belarus': { lat: 53.71, lng: 27.95 },
  'Belgium': { lat: 50.5, lng: 4.47 },
  'Bolivia': { lat: -16.29, lng: -63.59 },
  'Bosnia': { lat: 43.92, lng: 17.68 },
  'Brazil': { lat: -14.24, lng: -51.93 },
  'Bulgaria': { lat: 42.73, lng: 25.49 },
  'Cambodia': { lat: 12.57, lng: 104.99 },
  'Cameroon': { lat: 7.37, lng: 12.35 },
  'Canada': { lat: 56.13, lng: -106.35 },
  'Chile': { lat: -35.68, lng: -71.54 },
  'China': { lat: 35.86, lng: 104.19 },
  'Colombia': { lat: 4.57, lng: -74.30 },
  'Congo': { lat: -4.04, lng: 21.76 },
  'Croatia': { lat: 45.1, lng: 15.2 },
  'Cuba': { lat: 21.52, lng: -77.78 },
  'Cyprus': { lat: 35.13, lng: 33.43 },
  'Czech Republic': { lat: 49.82, lng: 15.47 },
  'Czechoslovakia': { lat: 49.82, lng: 15.47 },
  'Denmark': { lat: 56.26, lng: 9.5 },
  'Ecuador': { lat: -1.83, lng: -78.18 },
  'Egypt': { lat: 26.82, lng: 30.8 },
  'England': { lat: 52.36, lng: -1.17 },
  'Estonia': { lat: 58.6, lng: 25.01 },
  'Ethiopia': { lat: 9.15, lng: 40.49 },
  'Finland': { lat: 61.92, lng: 25.75 },
  'France': { lat: 46.23, lng: 2.21 },
  'Georgia': { lat: 42.32, lng: 43.36 },
  'Germany': { lat: 51.17, lng: 10.45 },
  'West Germany': { lat: 51.17, lng: 10.45 },
  'East Germany': { lat: 52.52, lng: 13.41 },
  'Ghana': { lat: 7.95, lng: -1.02 },
  'Greece': { lat: 39.07, lng: 21.82 },
  'Guatemala': { lat: 15.78, lng: -90.23 },
  'Hungary': { lat: 47.16, lng: 19.5 },
  'Iceland': { lat: 64.96, lng: -19.02 },
  'India': { lat: 20.59, lng: 78.96 },
  'Indonesia': { lat: -0.79, lng: 113.92 },
  'Iran': { lat: 32.43, lng: 53.69 },
  'Persia': { lat: 32.43, lng: 53.69 },
  'Iraq': { lat: 33.22, lng: 43.68 },
  'Ireland': { lat: 53.41, lng: -8.24 },
  'Israel': { lat: 31.05, lng: 34.85 },
  'Palestine': { lat: 31.95, lng: 35.23 },
  'Italy': { lat: 41.87, lng: 12.57 },
  'Jamaica': { lat: 18.11, lng: -77.3 },
  'Japan': { lat: 36.2, lng: 138.25 },
  'Jordan': { lat: 30.59, lng: 36.24 },
  'Kazakhstan': { lat: 48.02, lng: 66.92 },
  'Kenya': { lat: -0.02, lng: 37.91 },
  'Kuwait': { lat: 29.31, lng: 47.48 },
  'Latvia': { lat: 56.88, lng: 24.60 },
  'Lebanon': { lat: 33.85, lng: 35.86 },
  'Libya': { lat: 26.34, lng: 17.23 },
  'Lithuania': { lat: 55.17, lng: 23.88 },
  'Luxembourg': { lat: 49.82, lng: 6.13 },
  'Malaysia': { lat: 4.21, lng: 101.98 },
  'Mexico': { lat: 23.63, lng: -102.55 },
  'Moldova': { lat: 47.41, lng: 28.37 },
  'Mongolia': { lat: 46.86, lng: 103.85 },
  'Morocco': { lat: 31.79, lng: -7.09 },
  'Mozambique': { lat: -18.67, lng: 35.53 },
  'Myanmar': { lat: 21.92, lng: 95.96 },
  'Burma': { lat: 21.92, lng: 95.96 },
  'Nepal': { lat: 28.39, lng: 84.12 },
  'Netherlands': { lat: 52.13, lng: 5.29 },
  'Holland': { lat: 52.13, lng: 5.29 },
  'New Zealand': { lat: -40.9, lng: 174.89 },
  'Nigeria': { lat: 9.08, lng: 8.68 },
  'North Korea': { lat: 40.34, lng: 127.51 },
  'Norway': { lat: 60.47, lng: 8.47 },
  'Pakistan': { lat: 30.38, lng: 69.35 },
  'Panama': { lat: 8.54, lng: -80.78 },
  'Peru': { lat: -9.19, lng: -75.02 },
  'Philippines': { lat: 12.88, lng: 121.77 },
  'Poland': { lat: 51.92, lng: 19.15 },
  'Portugal': { lat: 39.40, lng: -8.22 },
  'Romania': { lat: 45.94, lng: 24.97 },
  'Russia': { lat: 61.52, lng: 105.32 },
  'Soviet Union': { lat: 61.52, lng: 105.32 },
  'USSR': { lat: 61.52, lng: 105.32 },
  'Saudi Arabia': { lat: 23.89, lng: 45.08 },
  'Scotland': { lat: 56.49, lng: -4.20 },
  'Serbia': { lat: 44.02, lng: 21.01 },
  'Yugoslavia': { lat: 44.02, lng: 21.01 },
  'Singapore': { lat: 1.35, lng: 103.82 },
  'Slovakia': { lat: 48.67, lng: 19.70 },
  'Slovenia': { lat: 46.15, lng: 14.99 },
  'Somalia': { lat: 5.15, lng: 46.20 },
  'South Africa': { lat: -30.56, lng: 22.94 },
  'South Korea': { lat: 35.91, lng: 127.77 },
  'Korea': { lat: 35.91, lng: 127.77 },
  'Spain': { lat: 40.46, lng: -3.75 },
  'Sri Lanka': { lat: 7.87, lng: 80.77 },
  'Ceylon': { lat: 7.87, lng: 80.77 },
  'Sudan': { lat: 12.86, lng: 30.22 },
  'Sweden': { lat: 60.13, lng: 18.64 },
  'Switzerland': { lat: 46.82, lng: 8.23 },
  'Syria': { lat: 34.80, lng: 38.99 },
  'Taiwan': { lat: 23.70, lng: 120.96 },
  'Tanzania': { lat: -6.37, lng: 34.89 },
  'Thailand': { lat: 15.87, lng: 100.99 },
  'Siam': { lat: 15.87, lng: 100.99 },
  'Tunisia': { lat: 33.89, lng: 9.54 },
  'Turkey': { lat: 38.96, lng: 35.24 },
  'Ottoman Empire': { lat: 38.96, lng: 35.24 },
  'Uganda': { lat: 1.37, lng: 32.29 },
  'Ukraine': { lat: 48.38, lng: 31.17 },
  'United Arab Emirates': { lat: 23.42, lng: 53.85 },
  'UAE': { lat: 23.42, lng: 53.85 },
  'United Kingdom': { lat: 55.38, lng: -3.44 },
  'UK': { lat: 55.38, lng: -3.44 },
  'Wales': { lat: 52.13, lng: -3.78 },
  'United States': { lat: 37.09, lng: -95.71 },
  'USA': { lat: 37.09, lng: -95.71 },
  'Uruguay': { lat: -32.52, lng: -55.77 },
  'Uzbekistan': { lat: 41.38, lng: 64.59 },
  'Venezuela': { lat: 6.42, lng: -66.59 },
  'Vietnam': { lat: 14.06, lng: 108.28 },
  'Yemen': { lat: 15.55, lng: 48.52 },
  'Zimbabwe': { lat: -19.02, lng: 29.15 },
};

// ─── City coordinates ─────────────────────────────────────────────────────────
// Each city is tagged with its country so that text-based lookups
// can resolve "country" from a matched city.
const CITY_COORDS: Record<string, { lat: number; lng: number; country: string }> = {
  // ── Europe ──
  'London': { lat: 51.5074, lng: -0.1278, country: 'United Kingdom' },
  'Paris': { lat: 48.8566, lng: 2.3522, country: 'France' },
  'Berlin': { lat: 52.5200, lng: 13.4050, country: 'Germany' },
  'Rome': { lat: 41.9028, lng: 12.4964, country: 'Italy' },
  'Madrid': { lat: 40.4168, lng: -3.7038, country: 'Spain' },
  'Vienna': { lat: 48.2082, lng: 16.3738, country: 'Austria' },
  'Warsaw': { lat: 52.2297, lng: 21.0122, country: 'Poland' },
  'Prague': { lat: 50.0755, lng: 14.4378, country: 'Czech Republic' },
  'Budapest': { lat: 47.4979, lng: 19.0402, country: 'Hungary' },
  'Bucharest': { lat: 44.4268, lng: 26.1025, country: 'Romania' },
  'Athens': { lat: 37.9838, lng: 23.7275, country: 'Greece' },
  'Amsterdam': { lat: 52.3676, lng: 4.9041, country: 'Netherlands' },
  'Brussels': { lat: 50.8503, lng: 4.3517, country: 'Belgium' },
  'Stockholm': { lat: 59.3293, lng: 18.0686, country: 'Sweden' },
  'Oslo': { lat: 59.9139, lng: 10.7522, country: 'Norway' },
  'Copenhagen': { lat: 55.6761, lng: 12.5683, country: 'Denmark' },
  'Helsinki': { lat: 60.1699, lng: 24.9384, country: 'Finland' },
  'Lisbon': { lat: 38.7169, lng: -9.1399, country: 'Portugal' },
  'Dublin': { lat: 53.3498, lng: -6.2603, country: 'Ireland' },
  'Edinburgh': { lat: 55.9533, lng: -3.1883, country: 'United Kingdom' },
  'Zurich': { lat: 47.3769, lng: 8.5417, country: 'Switzerland' },
  'Geneva': { lat: 46.2044, lng: 6.1432, country: 'Switzerland' },
  'Bern': { lat: 46.9480, lng: 7.4474, country: 'Switzerland' },
  'Kyiv': { lat: 50.4501, lng: 30.5234, country: 'Ukraine' },
  'Kiev': { lat: 50.4501, lng: 30.5234, country: 'Ukraine' },
  'Moscow': { lat: 55.7558, lng: 37.6173, country: 'Russia' },
  'St. Petersburg': { lat: 59.9311, lng: 30.3609, country: 'Russia' },
  'Saint Petersburg': { lat: 59.9311, lng: 30.3609, country: 'Russia' },
  'Leningrad': { lat: 59.9311, lng: 30.3609, country: 'Russia' },
  'Petrograd': { lat: 59.9311, lng: 30.3609, country: 'Russia' },
  'Barcelona': { lat: 41.3851, lng: 2.1734, country: 'Spain' },
  'Munich': { lat: 48.1351, lng: 11.5820, country: 'Germany' },
  'Hamburg': { lat: 53.5753, lng: 10.0153, country: 'Germany' },
  'Frankfurt': { lat: 50.1109, lng: 8.6821, country: 'Germany' },
  'Cologne': { lat: 50.9333, lng: 6.9500, country: 'Germany' },
  'Nuremberg': { lat: 49.4521, lng: 11.0767, country: 'Germany' },
  'Dresden': { lat: 51.0504, lng: 13.7373, country: 'Germany' },
  'Leipzig': { lat: 51.3397, lng: 12.3731, country: 'Germany' },
  'Milan': { lat: 45.4654, lng: 9.1859, country: 'Italy' },
  'Naples': { lat: 40.8518, lng: 14.2681, country: 'Italy' },
  'Turin': { lat: 45.0703, lng: 7.6869, country: 'Italy' },
  'Venice': { lat: 45.4408, lng: 12.3155, country: 'Italy' },
  'Florence': { lat: 43.7696, lng: 11.2558, country: 'Italy' },
  'Genoa': { lat: 44.4056, lng: 8.9463, country: 'Italy' },
  'Sarajevo': { lat: 43.8476, lng: 18.3564, country: 'Bosnia' },
  'Belgrade': { lat: 44.8176, lng: 20.4633, country: 'Serbia' },
  'Zagreb': { lat: 45.8150, lng: 15.9819, country: 'Croatia' },
  'Bratislava': { lat: 48.1486, lng: 17.1077, country: 'Slovakia' },
  'Sofia': { lat: 42.6977, lng: 23.3219, country: 'Bulgaria' },
  'Riga': { lat: 56.9496, lng: 24.1052, country: 'Latvia' },
  'Tallinn': { lat: 59.4370, lng: 24.7536, country: 'Estonia' },
  'Vilnius': { lat: 54.6872, lng: 25.2797, country: 'Lithuania' },
  'Minsk': { lat: 53.9045, lng: 27.5615, country: 'Belarus' },
  'Chisinau': { lat: 47.0105, lng: 28.8638, country: 'Moldova' },
  'Reykjavik': { lat: 64.1265, lng: -21.8174, country: 'Iceland' },
  'Luxembourg City': { lat: 49.6116, lng: 6.1319, country: 'Luxembourg' },
  'Monaco': { lat: 43.7384, lng: 7.4246, country: 'Monaco' },
  'Valletta': { lat: 35.8997, lng: 14.5147, country: 'Malta' },
  'Marseille': { lat: 43.2965, lng: 5.3698, country: 'France' },
  'Lyon': { lat: 45.7640, lng: 4.8357, country: 'France' },
  'Versailles': { lat: 48.8014, lng: 2.1301, country: 'France' },
  'Waterloo': { lat: 50.7147, lng: 4.3992, country: 'Belgium' },
  'Stalingrad': { lat: 48.7194, lng: 44.5018, country: 'Russia' },
  'Volgograd': { lat: 48.7194, lng: 44.5018, country: 'Russia' },
  'Kursk': { lat: 51.7304, lng: 36.1927, country: 'Russia' },
  'Liverpool': { lat: 53.4084, lng: -2.9916, country: 'United Kingdom' },
  'Manchester': { lat: 53.4808, lng: -2.2426, country: 'United Kingdom' },
  'Birmingham': { lat: 52.4862, lng: -1.8904, country: 'United Kingdom' },
  'Glasgow': { lat: 55.8642, lng: -4.2518, country: 'United Kingdom' },

  // ── Middle East & North Africa ──
  'Jerusalem': { lat: 31.7683, lng: 35.2137, country: 'Israel' },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818, country: 'Israel' },
  'Cairo': { lat: 30.0444, lng: 31.2357, country: 'Egypt' },
  'Alexandria': { lat: 31.2001, lng: 29.9187, country: 'Egypt' },
  'Baghdad': { lat: 33.3152, lng: 44.3661, country: 'Iraq' },
  'Beirut': { lat: 33.8938, lng: 35.5018, country: 'Lebanon' },
  'Damascus': { lat: 33.5138, lng: 36.2765, country: 'Syria' },
  'Amman': { lat: 31.9454, lng: 35.9284, country: 'Jordan' },
  'Riyadh': { lat: 24.7136, lng: 46.6753, country: 'Saudi Arabia' },
  'Mecca': { lat: 21.4225, lng: 39.8262, country: 'Saudi Arabia' },
  'Medina': { lat: 24.5247, lng: 39.5692, country: 'Saudi Arabia' },
  'Tehran': { lat: 35.6892, lng: 51.3890, country: 'Iran' },
  'Istanbul': { lat: 41.0082, lng: 28.9784, country: 'Turkey' },
  'Constantinople': { lat: 41.0082, lng: 28.9784, country: 'Turkey' },
  'Ankara': { lat: 39.9334, lng: 32.8597, country: 'Turkey' },
  'Tripoli': { lat: 32.9027, lng: 13.1771, country: 'Libya' },
  'Tunis': { lat: 36.8065, lng: 10.1815, country: 'Tunisia' },
  'Algiers': { lat: 36.7372, lng: 3.0865, country: 'Algeria' },
  'Casablanca': { lat: 33.5731, lng: -7.5898, country: 'Morocco' },
  'Rabat': { lat: 34.0209, lng: -6.8416, country: 'Morocco' },
  'Muscat': { lat: 23.5880, lng: 58.3829, country: 'Oman' },
  'Dubai': { lat: 25.2048, lng: 55.2708, country: 'UAE' },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773, country: 'UAE' },
  'Doha': { lat: 25.2854, lng: 51.5310, country: 'Qatar' },
  'Kuwait City': { lat: 29.3759, lng: 47.9774, country: 'Kuwait' },
  'Sanaa': { lat: 15.3694, lng: 44.1910, country: 'Yemen' },

  // ── Sub-Saharan Africa ──
  'Nairobi': { lat: -1.2921, lng: 36.8219, country: 'Kenya' },
  'Addis Ababa': { lat: 9.1450, lng: 40.4897, country: 'Ethiopia' },
  'Lagos': { lat: 6.5244, lng: 3.3792, country: 'Nigeria' },
  'Abuja': { lat: 9.0765, lng: 7.3986, country: 'Nigeria' },
  'Accra': { lat: 5.5600, lng: -0.2057, country: 'Ghana' },
  'Dakar': { lat: 14.7167, lng: -17.4677, country: 'Senegal' },
  'Khartoum': { lat: 15.5007, lng: 32.5599, country: 'Sudan' },
  'Cape Town': { lat: -33.9249, lng: 18.4241, country: 'South Africa' },
  'Johannesburg': { lat: -26.2041, lng: 28.0473, country: 'South Africa' },
  'Pretoria': { lat: -25.7479, lng: 28.2293, country: 'South Africa' },
  'Kinshasa': { lat: -4.4419, lng: 15.2663, country: 'Congo' },
  'Lusaka': { lat: -15.4167, lng: 28.2833, country: 'Zambia' },
  'Harare': { lat: -17.8252, lng: 31.0335, country: 'Zimbabwe' },
  'Mogadishu': { lat: 2.0469, lng: 45.3182, country: 'Somalia' },
  'Kampala': { lat: 0.3476, lng: 32.5825, country: 'Uganda' },
  'Dar es Salaam': { lat: -6.7924, lng: 39.2083, country: 'Tanzania' },
  'Maputo': { lat: -25.9692, lng: 32.5732, country: 'Mozambique' },
  'Luanda': { lat: -8.8368, lng: 13.2343, country: 'Angola' },

  // ── South & Southeast Asia ──
  'Delhi': { lat: 28.7041, lng: 77.1025, country: 'India' },
  'New Delhi': { lat: 28.6139, lng: 77.2090, country: 'India' },
  'Panipat': { lat: 29.3909, lng: 76.9635, country: 'India' },
  'Mumbai': { lat: 19.0760, lng: 72.8777, country: 'India' },
  'Bombay': { lat: 19.0760, lng: 72.8777, country: 'India' },
  'Calcutta': { lat: 22.5726, lng: 88.3639, country: 'India' },
  'Kolkata': { lat: 22.5726, lng: 88.3639, country: 'India' },
  'Chennai': { lat: 13.0827, lng: 80.2707, country: 'India' },
  'Madras': { lat: 13.0827, lng: 80.2707, country: 'India' },
  'Bangalore': { lat: 12.9716, lng: 77.5946, country: 'India' },
  'Islamabad': { lat: 33.7294, lng: 73.0931, country: 'Pakistan' },
  'Karachi': { lat: 24.8607, lng: 67.0011, country: 'Pakistan' },
  'Dhaka': { lat: 23.8103, lng: 90.4125, country: 'Bangladesh' },
  'Colombo': { lat: 6.9271, lng: 79.8612, country: 'Sri Lanka' },
  'Kathmandu': { lat: 27.7172, lng: 85.3240, country: 'Nepal' },
  'Bangkok': { lat: 13.7563, lng: 100.5018, country: 'Thailand' },
  'Jakarta': { lat: -6.2088, lng: 106.8456, country: 'Indonesia' },
  'Manila': { lat: 14.5995, lng: 120.9842, country: 'Philippines' },
  'Kuala Lumpur': { lat: 3.1390, lng: 101.6869, country: 'Malaysia' },
  'Rangoon': { lat: 16.8661, lng: 96.1951, country: 'Myanmar' },
  'Yangon': { lat: 16.8661, lng: 96.1951, country: 'Myanmar' },
  'Phnom Penh': { lat: 11.5564, lng: 104.9282, country: 'Cambodia' },
  'Hanoi': { lat: 21.0285, lng: 105.8542, country: 'Vietnam' },
  'Ho Chi Minh City': { lat: 10.8231, lng: 106.6297, country: 'Vietnam' },
  'Saigon': { lat: 10.8231, lng: 106.6297, country: 'Vietnam' },
  'Vientiane': { lat: 17.9757, lng: 102.6331, country: 'Laos' },

  // ── East Asia ──
  'Beijing': { lat: 39.9042, lng: 116.4074, country: 'China' },
  'Peking': { lat: 39.9042, lng: 116.4074, country: 'China' },
  'Shanghai': { lat: 31.2304, lng: 121.4737, country: 'China' },
  'Guangzhou': { lat: 23.1291, lng: 113.2644, country: 'China' },
  'Shenzhen': { lat: 22.5431, lng: 114.0579, country: 'China' },
  'Chengdu': { lat: 30.5728, lng: 104.0668, country: 'China' },
  'Nanjing': { lat: 32.0603, lng: 118.7969, country: 'China' },
  'Wuhan': { lat: 30.5928, lng: 114.3055, country: 'China' },
  "Xi'an": { lat: 34.3416, lng: 108.9398, country: 'China' },
  'Hong Kong': { lat: 22.3193, lng: 114.1694, country: 'China' },
  'Taipei': { lat: 25.0330, lng: 121.5654, country: 'Taiwan' },
  'Tokyo': { lat: 35.6762, lng: 139.6503, country: 'Japan' },
  'Osaka': { lat: 34.6937, lng: 135.5023, country: 'Japan' },
  'Kyoto': { lat: 35.0116, lng: 135.7681, country: 'Japan' },
  'Hiroshima': { lat: 34.3853, lng: 132.4553, country: 'Japan' },
  'Nagasaki': { lat: 32.7503, lng: 129.8779, country: 'Japan' },
  'Nagoya': { lat: 35.1815, lng: 136.9066, country: 'Japan' },
  'Yokohama': { lat: 35.4437, lng: 139.6380, country: 'Japan' },
  'Seoul': { lat: 37.5665, lng: 126.9780, country: 'South Korea' },
  'Pyongyang': { lat: 39.0392, lng: 125.7625, country: 'North Korea' },
  'Ulaanbaatar': { lat: 47.8864, lng: 106.9057, country: 'Mongolia' },

  // ── Central Asia ──
  'Tashkent': { lat: 41.2995, lng: 69.2401, country: 'Uzbekistan' },
  'Almaty': { lat: 43.2220, lng: 76.8512, country: 'Kazakhstan' },
  'Kabul': { lat: 34.5553, lng: 69.2075, country: 'Afghanistan' },

  // ── Americas ──
  'New York': { lat: 40.7128, lng: -74.0060, country: 'United States' },
  'New York City': { lat: 40.7128, lng: -74.0060, country: 'United States' },
  'Los Angeles': { lat: 34.0522, lng: -118.2437, country: 'United States' },
  'Chicago': { lat: 41.8781, lng: -87.6298, country: 'United States' },
  'Houston': { lat: 29.7604, lng: -95.3698, country: 'United States' },
  'Phoenix': { lat: 33.4484, lng: -112.0740, country: 'United States' },
  'Philadelphia': { lat: 39.9526, lng: -75.1652, country: 'United States' },
  'San Antonio': { lat: 29.4241, lng: -98.4936, country: 'United States' },
  'San Diego': { lat: 32.7157, lng: -117.1611, country: 'United States' },
  'Dallas': { lat: 32.7767, lng: -96.7970, country: 'United States' },
  'San Francisco': { lat: 37.7749, lng: -122.4194, country: 'United States' },
  'Washington': { lat: 38.9072, lng: -77.0369, country: 'United States' },
  'Washington D.C.': { lat: 38.9072, lng: -77.0369, country: 'United States' },
  'Washington, D.C.': { lat: 38.9072, lng: -77.0369, country: 'United States' },
  'Seattle': { lat: 47.6062, lng: -122.3321, country: 'United States' },
  'Denver': { lat: 39.7392, lng: -104.9903, country: 'United States' },
  'Boston': { lat: 42.3601, lng: -71.0589, country: 'United States' },
  'Atlanta': { lat: 33.7490, lng: -84.3880, country: 'United States' },
  'Miami': { lat: 25.7617, lng: -80.1918, country: 'United States' },
  'Las Vegas': { lat: 36.1699, lng: -115.1398, country: 'United States' },
  'Minneapolis': { lat: 44.9778, lng: -93.2650, country: 'United States' },
  'Detroit': { lat: 42.3314, lng: -83.0458, country: 'United States' },
  'Portland': { lat: 45.5051, lng: -122.6750, country: 'United States' },
  'Nashville': { lat: 36.1627, lng: -86.7816, country: 'United States' },
  'Memphis': { lat: 35.1495, lng: -90.0490, country: 'United States' },
  'Baltimore': { lat: 39.2904, lng: -76.6122, country: 'United States' },
  'New Orleans': { lat: 29.9511, lng: -90.0715, country: 'United States' },
  'Pearl Harbor': { lat: 21.3645, lng: -157.9764, country: 'United States' },
  'Honolulu': { lat: 21.3069, lng: -157.8583, country: 'United States' },
  'Hillsborough': { lat: 53.4103, lng: -1.5033, country: 'United Kingdom' },
  'Sheffield': { lat: 53.3811, lng: -1.4701, country: 'United Kingdom' },
  'Toronto': { lat: 43.6532, lng: -79.3832, country: 'Canada' },
  'Montreal': { lat: 45.5017, lng: -73.5673, country: 'Canada' },
  'Vancouver': { lat: 49.2827, lng: -123.1207, country: 'Canada' },
  'Ottawa': { lat: 45.4215, lng: -75.6972, country: 'Canada' },
  'Mexico City': { lat: 19.4326, lng: -99.1332, country: 'Mexico' },
  'Havana': { lat: 23.1136, lng: -82.3666, country: 'Cuba' },
  'Guatemala City': { lat: 14.6349, lng: -90.5069, country: 'Guatemala' },
  'Panama City': { lat: 8.9936, lng: -79.5197, country: 'Panama' },
  'Bogotá': { lat: 4.7110, lng: -74.0721, country: 'Colombia' },
  'Bogota': { lat: 4.7110, lng: -74.0721, country: 'Colombia' },
  'Lima': { lat: -12.0464, lng: -77.0428, country: 'Peru' },
  'Caracas': { lat: 10.4806, lng: -66.9036, country: 'Venezuela' },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816, country: 'Argentina' },
  'Santiago': { lat: -33.4489, lng: -70.6693, country: 'Chile' },
  'São Paulo': { lat: -23.5505, lng: -46.6333, country: 'Brazil' },
  'Sao Paulo': { lat: -23.5505, lng: -46.6333, country: 'Brazil' },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729, country: 'Brazil' },
  'Brasilia': { lat: -15.8267, lng: -47.9218, country: 'Brazil' },
  'Montevideo': { lat: -34.9011, lng: -56.1645, country: 'Uruguay' },
  'La Paz': { lat: -16.5000, lng: -68.1500, country: 'Bolivia' },
  'Quito': { lat: -0.1807, lng: -78.4678, country: 'Ecuador' },

  // ── Oceania ──
  'Sydney': { lat: -33.8688, lng: 151.2093, country: 'Australia' },
  'Melbourne': { lat: -37.8136, lng: 144.9631, country: 'Australia' },
  'Brisbane': { lat: -27.4698, lng: 153.0251, country: 'Australia' },
  'Perth': { lat: -31.9505, lng: 115.8605, country: 'Australia' },
  'Auckland': { lat: -36.8485, lng: 174.7633, country: 'New Zealand' },
  'Wellington': { lat: -41.2865, lng: 174.7762, country: 'New Zealand' },
};

// ─── Natural features / regions (oceans, gulfs, deserts, islands) ─────────────
// These are for things like "Gulf of Mexico" or "Sahara Desert" — we map them
// to representative coords AND assign them a display country (or "Region").
const REGION_COORDS: Record<string, { lat: number; lng: number; country: string }> = {
  'Gulf of Mexico': { lat: 25.0, lng: -90.0, country: 'Mexico' },
  'Gulf of Tonkin': { lat: 20.0, lng: 108.0, country: 'Vietnam' },
  'Persian Gulf': { lat: 26.5, lng: 52.0, country: 'Iran' },
  'Mediterranean Sea': { lat: 35.0, lng: 18.0, country: 'Italy' },
  'Black Sea': { lat: 43.5, lng: 34.0, country: 'Turkey' },
  'Red Sea': { lat: 20.0, lng: 38.0, country: 'Egypt' },
  'Caspian Sea': { lat: 41.6, lng: 50.6, country: 'Azerbaijan' },
  'North Sea': { lat: 56.0, lng: 3.0, country: 'United Kingdom' },
  'Baltic Sea': { lat: 58.0, lng: 20.0, country: 'Sweden' },
  'Aegean Sea': { lat: 38.5, lng: 25.0, country: 'Greece' },
  'Adriatic Sea': { lat: 43.0, lng: 15.5, country: 'Italy' },
  'Bay of Bengal': { lat: 15.0, lng: 88.0, country: 'India' },
  'South China Sea': { lat: 15.0, lng: 115.0, country: 'China' },
  'East China Sea': { lat: 30.0, lng: 125.0, country: 'China' },
  'Sea of Japan': { lat: 40.0, lng: 135.0, country: 'Japan' },
  'Coral Sea': { lat: -15.0, lng: 155.0, country: 'Australia' },
  'Atlantic Ocean': { lat: 0.0, lng: -30.0, country: 'Ocean' },
  'Pacific Ocean': { lat: 0.0, lng: -160.0, country: 'Ocean' },
  'Indian Ocean': { lat: -20.0, lng: 80.0, country: 'Ocean' },
  'Arctic Ocean': { lat: 85.0, lng: 0.0, country: 'Ocean' },
  'Southern Ocean': { lat: -65.0, lng: 0.0, country: 'Ocean' },
  'English Channel': { lat: 50.2, lng: -0.5, country: 'United Kingdom' },
  'Sahara': { lat: 23.0, lng: 13.0, country: 'Algeria' },
  'Sahara Desert': { lat: 23.0, lng: 13.0, country: 'Algeria' },
  'Gobi Desert': { lat: 42.5, lng: 103.0, country: 'Mongolia' },
  'Himalayas': { lat: 28.0, lng: 85.0, country: 'Nepal' },
  'Alps': { lat: 46.5, lng: 9.0, country: 'Switzerland' },
  'Andes': { lat: -20.0, lng: -68.0, country: 'Chile' },
  'Amazon': { lat: -3.5, lng: -62.0, country: 'Brazil' },
  'Amazon Rainforest': { lat: -3.5, lng: -62.0, country: 'Brazil' },
  'Nile': { lat: 25.0, lng: 32.5, country: 'Egypt' },
  'Nile River': { lat: 25.0, lng: 32.5, country: 'Egypt' },
  'Antarctica': { lat: -82.0, lng: 0.0, country: 'Antarctica' },
  'Arctic': { lat: 85.0, lng: 0.0, country: 'Arctic' },
  'Caribbean': { lat: 15.0, lng: -75.0, country: 'Caribbean' },
  'Balkans': { lat: 43.0, lng: 22.0, country: 'Serbia' },
  'Scandinavia': { lat: 63.0, lng: 16.0, country: 'Sweden' },
  'Normandy': { lat: 49.2, lng: 0.5, country: 'France' },
  'Iberian Peninsula': { lat: 40.0, lng: -5.0, country: 'Spain' },
  'Space': { lat: 0.0, lng: 0.0, country: 'Space' },
  'Moon': { lat: 0.0, lng: 0.0, country: 'Space' },
  'Outer Space': { lat: 0.0, lng: 0.0, country: 'Space' },
};

// ─── Alias normalization ───────────────────────────────────────────────────────
const COUNTRY_ALIASES: Record<string, string> = {
  'UK': 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'Britain': 'United Kingdom',
  'USA': 'United States',
  'US': 'United States',
  'U.S.': 'United States',
  'U.S.A.': 'United States',
  'America': 'United States',
  'Soviet Union': 'Russia',
  'USSR': 'Russia',
  'West Germany': 'Germany',
  'East Germany': 'Germany',
  'Persia': 'Iran',
  'Siam': 'Thailand',
  'Burma': 'Myanmar',
  'Ceylon': 'Sri Lanka',
  'Yugoslavia': 'Serbia',
  'Czechoslovakia': 'Czech Republic',
  'Ottoman Empire': 'Turkey',
  'Holland': 'Netherlands',
  'The Netherlands': 'Netherlands',
  'South Vietnam': 'Vietnam',
  'North Vietnam': 'Vietnam',
};

// ─── Core geocoding ───────────────────────────────────────────────────────────

function normalizeCountry(raw: string): string {
  const trimmed = raw.trim();
  return COUNTRY_ALIASES[trimmed] ?? trimmed;
}

function geocodeCity(city: string): { lat: number; lng: number; country: string } | null {
  if (CITY_COORDS[city]) return CITY_COORDS[city];

  const lower = city.toLowerCase();
  for (const [key, val] of Object.entries(CITY_COORDS)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

function geocodeCountry(country: string): { lat: number; lng: number } | null {
  const normalized = normalizeCountry(country);
  if (COUNTRY_CENTROIDS[normalized]) return COUNTRY_CENTROIDS[normalized];

  const lower = normalized.toLowerCase();
  for (const [key, coords] of Object.entries(COUNTRY_CENTROIDS)) {
    if (key.toLowerCase() === lower) return coords;
  }
  return null;
}

function geocodeRegion(region: string): { lat: number; lng: number; country: string } | null {
  if (REGION_COORDS[region]) return REGION_COORDS[region];

  const lower = region.toLowerCase();
  for (const [key, val] of Object.entries(REGION_COORDS)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

// ─── Strategy 1: parse explicit location field ───────────────────────────────
function parseExplicitLocation(raw: string): LocationResult | null {
  const label = raw.trim();
  if (!label) return null;

  // Try matching as a full region name first (e.g. "Gulf of Mexico")
  const regionDirect = geocodeRegion(label);
  if (regionDirect) {
    return {
      latitude: regionDirect.lat,
      longitude: regionDirect.lng,
      label,
      city: label,
      country: regionDirect.country,
    };
  }

  const parts = label.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  // "City, Country" format
  if (parts.length >= 2) {
    const city = parts[0];
    const rawCountry = parts[parts.length - 1];
    const country = normalizeCountry(rawCountry);

    // Try city first
    const cityCoords = geocodeCity(city);
    if (cityCoords) {
      return {
        latitude: cityCoords.lat,
        longitude: cityCoords.lng,
        label,
        city,
        country: cityCoords.country || country,
      };
    }

    // Try region (e.g. "Normandy, France")
    const regionCoords = geocodeRegion(city);
    if (regionCoords) {
      return {
        latitude: regionCoords.lat,
        longitude: regionCoords.lng,
        label,
        city,
        country: regionCoords.country || country,
      };
    }

    // Fall back to country centroid
    const countryCoords = geocodeCountry(country);
    if (countryCoords) {
      return {
        latitude: countryCoords.lat,
        longitude: countryCoords.lng,
        label,
        city,
        country,
      };
    }

    return null;
  }

  // Single value — try city, then region, then country
  const single = parts[0];

  const cityCoords = geocodeCity(single);
  if (cityCoords) {
    return {
      latitude: cityCoords.lat,
      longitude: cityCoords.lng,
      label,
      city: single,
      country: cityCoords.country,
    };
  }

  const regionCoords = geocodeRegion(single);
  if (regionCoords) {
    return {
      latitude: regionCoords.lat,
      longitude: regionCoords.lng,
      label,
      city: single,
      country: regionCoords.country,
    };
  }

  const countryCoords = geocodeCountry(single);
  if (countryCoords) {
    return {
      latitude: countryCoords.lat,
      longitude: countryCoords.lng,
      label,
      city: '',
      country: normalizeCountry(single),
    };
  }

  return null;
}

// ─── Strategy 2: scan text for known places ──────────────────────────────────
// Builds a prioritized list of candidates found in the text. Cities beat
// countries (more specific). First occurrence wins if tied.

type TextMatch = {
  name: string;
  index: number;
  kind: 'city' | 'region' | 'country';
  lat: number;
  lng: number;
  country: string;
};

// Precompute search keys sorted by length DESC so "New York City" beats "New York"
const CITY_KEYS = Object.keys(CITY_COORDS).sort((a, b) => b.length - a.length);
const REGION_KEYS = Object.keys(REGION_COORDS).sort((a, b) => b.length - a.length);
const COUNTRY_KEYS = Object.keys(COUNTRY_CENTROIDS).sort((a, b) => b.length - a.length);
const ALIAS_KEYS = Object.keys(COUNTRY_ALIASES).sort((a, b) => b.length - a.length);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findInText(text: string, name: string): number {
  // Word-boundary match, case-insensitive
  const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
  const m = pattern.exec(text);
  return m ? m.index : -1;
}

function scanTextForLocation(text: string): LocationResult | null {
  if (!text || typeof text !== 'string' || text.length < 3) return null;

  const matches: TextMatch[] = [];

  // Cities (highest priority)
  for (const city of CITY_KEYS) {
    const idx = findInText(text, city);
    if (idx !== -1) {
      const val = CITY_COORDS[city];
      matches.push({
        name: city,
        index: idx,
        kind: 'city',
        lat: val.lat,
        lng: val.lng,
        country: val.country,
      });
    }
  }

  // Regions
  for (const region of REGION_KEYS) {
    const idx = findInText(text, region);
    if (idx !== -1) {
      const val = REGION_COORDS[region];
      matches.push({
        name: region,
        index: idx,
        kind: 'region',
        lat: val.lat,
        lng: val.lng,
        country: val.country,
      });
    }
  }

  // Countries (lowest priority, but still useful)
  for (const country of COUNTRY_KEYS) {
    const idx = findInText(text, country);
    if (idx !== -1) {
      const coords = COUNTRY_CENTROIDS[country];
      matches.push({
        name: country,
        index: idx,
        kind: 'country',
        lat: coords.lat,
        lng: coords.lng,
        country: normalizeCountry(country),
      });
    }
  }

  // Aliases (map to their canonical country)
  for (const alias of ALIAS_KEYS) {
    const idx = findInText(text, alias);
    if (idx !== -1) {
      const canonical = COUNTRY_ALIASES[alias];
      const coords = COUNTRY_CENTROIDS[canonical];
      if (coords) {
        matches.push({
          name: alias,
          index: idx,
          kind: 'country',
          lat: coords.lat,
          lng: coords.lng,
          country: canonical,
        });
      }
    }
  }

  if (matches.length === 0) return null;

  // Pick the best match:
  //   1. Prefer cities over regions over countries
  //   2. Among same kind, prefer earliest occurrence in text
  const kindRank: Record<string, number> = { city: 0, region: 1, country: 2 };
  matches.sort((a, b) => {
    const kindDiff = kindRank[a.kind] - kindRank[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.index - b.index;
  });

  const best = matches[0];

  return {
    latitude: best.lat,
    longitude: best.lng,
    label: best.kind === 'city' ? `${best.name}, ${best.country}` : best.name,
    city: best.kind === 'city' ? best.name : '',
    country: best.country,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extracts and geocodes a location for an event.
 *
 * Strategy cascade:
 *   1. Use event.location if it's a non-empty string (populated on PRO events)
 *   2. Fall back to scanning event text (title, narrative, source URL) for
 *      known cities, regions, or countries (works for FREE events)
 *   3. Returns null only if nothing usable can be found
 */
export function extractLocation(event: any): LocationResult | null {
  if (!event || typeof event !== 'object') return null;

  // ── Strategy 1: explicit event.location field ──
  const rawLocation = event.location;
  if (typeof rawLocation === 'string' && rawLocation.trim() !== '') {
    const fromField = parseExplicitLocation(rawLocation);
    if (fromField) return fromField;
    // If parsing failed, fall through to text scanning — don't drop the event
  }

  // ── Strategy 2: scan event text ──
  // Gather anything that might contain a place name. Order matters: title
  // matches are most authoritative, then narratives, then the Wikipedia URL.
  const candidates: string[] = [];

  const titleTrans = event.titleTranslations ?? {};
  if (typeof titleTrans.en === 'string') candidates.push(titleTrans.en);
  if (typeof titleTrans.ro === 'string') candidates.push(titleTrans.ro);

  const narrTrans = event.narrativeTranslations ?? event.summaryTranslations ?? {};
  if (typeof narrTrans.en === 'string') candidates.push(narrTrans.en);

  // Wikipedia URL often encodes the location in the slug
  // e.g. "Battle_of_Panipat_(1526)" → scanning finds "Panipat"
  const sourceUrl = event.sourceUrl ?? event.source_url;
  if (typeof sourceUrl === 'string') {
    // Decode and replace underscores so regex word boundaries work
    try {
      const decoded = decodeURIComponent(sourceUrl).replace(/_/g, ' ');
      candidates.push(decoded);
    } catch {
      candidates.push(sourceUrl.replace(/_/g, ' '));
    }
  }

  for (const text of candidates) {
    const found = scanTextForLocation(text);
    if (found) return found;
  }

  return null;
}

/**
 * Extracts just the country name from a location label.
 * Used for display purposes when clustering.
 */
export function extractCountryFromLabel(label: string): string {
  if (!label) return 'Unknown';
  const parts = label.split(',').map((s) => s.trim());
  const raw = parts.length >= 2 ? parts[parts.length - 1] : label;
  return normalizeCountry(raw);
}