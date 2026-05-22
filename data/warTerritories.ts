// data/warTerritories.ts
// Simplified country territory polygons for WW1 / WW2 alliance highlighting on the map.
// Each polygon is a rough but geographically recognizable outline of the country's territory
// during the war. Coordinates go in order (clockwise) and the polygon auto-closes.

export interface WarTerritory {
  id: string;            // e.g. 'ww2-germany'
  war: 'ww1' | 'ww2';
  country: string;       // display name, e.g. 'Germany', 'United Kingdom'
  side: 'axis' | 'central' | 'allied';  // central = WW1 central powers, axis = WW2 axis
  capital: { latitude: number; longitude: number; name: string };
  coordinates: { latitude: number; longitude: number }[];
}

export const WAR_TERRITORIES: WarTerritory[] = [
  // ============================================================
  // WW1 — CENTRAL POWERS
  // ============================================================
  {
    id: 'ww1-german-empire',
    war: 'ww1',
    country: 'German Empire',
    side: 'central',
    capital: { latitude: 52.52, longitude: 13.405, name: 'Berlin' },
    coordinates: [
      { latitude: 54.9, longitude: 8.3 },   // Schleswig (north)
      { latitude: 55.0, longitude: 14.4 },  // Baltic coast
      { latitude: 54.4, longitude: 19.6 },  // East Prussia
      { latitude: 51.5, longitude: 18.6 },  // eastern border (Poland)
      { latitude: 50.0, longitude: 18.0 },  // Silesia
      { latitude: 48.6, longitude: 13.0 },  // Bavaria SE
      { latitude: 47.5, longitude: 10.2 },  // Alps
      { latitude: 47.6, longitude: 7.6 },   // SW corner
      { latitude: 49.0, longitude: 6.4 },   // Lorraine
      { latitude: 50.3, longitude: 6.1 },   // west (Aachen)
      { latitude: 52.3, longitude: 7.0 },   // Rhineland N
      { latitude: 53.3, longitude: 7.2 },   // North Sea coast
    ],
  },
  {
    id: 'ww1-austria-hungary',
    war: 'ww1',
    country: 'Austria-Hungary',
    side: 'central',
    capital: { latitude: 48.2082, longitude: 16.3738, name: 'Vienna' },
    coordinates: [
      { latitude: 50.1, longitude: 14.4 },  // Bohemia (Prague area)
      { latitude: 49.5, longitude: 18.6 },  // Galicia W
      { latitude: 49.0, longitude: 24.0 },  // Galicia E
      { latitude: 47.9, longitude: 26.3 },  // Bukovina
      { latitude: 45.7, longitude: 22.9 },  // Transylvania SE
      { latitude: 44.6, longitude: 20.9 },  // Banat / Belgrade approach
      { latitude: 45.0, longitude: 18.7 },  // Slavonia
      { latitude: 42.6, longitude: 18.5 },  // Dalmatia (Adriatic S)
      { latitude: 45.6, longitude: 13.6 },  // Trieste / Adriatic N
      { latitude: 46.5, longitude: 10.4 },  // Tyrol / Alps
      { latitude: 47.6, longitude: 9.6 },   // Vorarlberg
      { latitude: 48.6, longitude: 13.0 },  // NW (toward Bohemia)
    ],
  },
  {
    id: 'ww1-ottoman-empire',
    war: 'ww1',
    country: 'Ottoman Empire',
    side: 'central',
    capital: { latitude: 41.0, longitude: 28.95, name: 'Constantinople' },
    coordinates: [
      { latitude: 41.2, longitude: 26.0 },  // Eastern Thrace
      { latitude: 41.3, longitude: 28.9 },  // Bosphorus
      { latitude: 41.7, longitude: 35.0 },  // Black Sea coast
      { latitude: 41.0, longitude: 41.5 },  // NE Anatolia (Caucasus)
      { latitude: 37.5, longitude: 44.5 },  // SE (toward Persia)
      { latitude: 33.3, longitude: 44.4 },  // Mesopotamia (Baghdad)
      { latitude: 31.0, longitude: 47.5 },  // Basra / Persian Gulf
      { latitude: 29.5, longitude: 35.0 },  // Arabia NW (Aqaba)
      { latitude: 33.9, longitude: 35.5 },  // Levant coast (Beirut)
      { latitude: 36.2, longitude: 36.1 },  // Syrian coast (Antioch)
      { latitude: 36.8, longitude: 30.7 },  // S Anatolia (Antalya)
      { latitude: 38.4, longitude: 26.1 },  // W Anatolia (Izmir)
    ],
  },
  {
    id: 'ww1-bulgaria',
    war: 'ww1',
    country: 'Bulgaria',
    side: 'central',
    capital: { latitude: 42.6977, longitude: 23.3219, name: 'Sofia' },
    coordinates: [
      { latitude: 44.0, longitude: 22.7 },  // NW (Danube)
      { latitude: 44.1, longitude: 27.0 },  // NE Danube
      { latitude: 43.7, longitude: 28.6 },  // Black Sea coast N
      { latitude: 42.4, longitude: 27.7 },  // Black Sea coast S (Burgas)
      { latitude: 41.3, longitude: 26.3 },  // SE (Thrace)
      { latitude: 41.1, longitude: 23.0 },  // S (Aegean approach)
      { latitude: 41.4, longitude: 22.6 },  // SW (Macedonia)
      { latitude: 42.3, longitude: 22.3 },  // W
    ],
  },

  // ============================================================
  // WW1 — ALLIED POWERS
  // ============================================================
  {
    id: 'ww1-france',
    war: 'ww1',
    country: 'France',
    side: 'allied',
    capital: { latitude: 48.8566, longitude: 2.3522, name: 'Paris' },
    coordinates: [
      { latitude: 51.0, longitude: 2.5 },   // Dunkirk (N)
      { latitude: 49.3, longitude: 5.8 },   // NE (Verdun area)
      { latitude: 47.6, longitude: 7.5 },   // Alsace border (Belfort)
      { latitude: 45.9, longitude: 6.9 },   // Geneva / Alps
      { latitude: 43.7, longitude: 7.4 },   // Nice (Riviera)
      { latitude: 43.3, longitude: 3.0 },   // Mediterranean coast
      { latitude: 42.5, longitude: 1.6 },   // Pyrenees E
      { latitude: 43.4, longitude: -1.5 },  // Pyrenees W (Biarritz)
      { latitude: 45.6, longitude: -1.1 },  // Atlantic (Gironde)
      { latitude: 47.3, longitude: -2.4 },  // Brittany S
      { latitude: 48.6, longitude: -4.7 },  // Brest (W tip)
      { latitude: 49.7, longitude: -1.6 },  // Cherbourg
      { latitude: 50.1, longitude: 1.6 },   // Normandy / Picardy
    ],
  },
  {
    id: 'ww1-united-kingdom',
    war: 'ww1',
    country: 'United Kingdom',
    side: 'allied',
    capital: { latitude: 51.5074, longitude: -0.1278, name: 'London' },
    coordinates: [
      { latitude: 58.6, longitude: -3.1 },  // N Scotland
      { latitude: 57.5, longitude: -1.8 },  // NE Scotland (Aberdeen)
      { latitude: 55.0, longitude: -1.4 },  // NE England
      { latitude: 52.9, longitude: 1.7 },   // East Anglia
      { latitude: 51.1, longitude: 1.4 },   // SE England (Dover)
      { latitude: 50.1, longitude: -3.5 },  // S coast (Devon)
      { latitude: 50.1, longitude: -5.7 },  // Cornwall (SW tip)
      { latitude: 51.6, longitude: -5.3 },  // Wales SW
      { latitude: 53.4, longitude: -4.7 },  // Wales / NW England
      { latitude: 54.8, longitude: -5.0 },  // SW Scotland
      { latitude: 57.5, longitude: -6.4 },  // W Highlands (Skye)
      { latitude: 58.5, longitude: -5.0 },  // NW Scotland
    ],
  },
  {
    id: 'ww1-russian-empire',
    war: 'ww1',
    country: 'Russian Empire',
    side: 'allied',
    capital: { latitude: 59.93, longitude: 30.34, name: 'Petrograd' },
    coordinates: [
      { latitude: 68.9, longitude: 33.0 },  // Kola (Murmansk N)
      { latitude: 64.5, longitude: 40.5 },  // Arkhangelsk
      { latitude: 61.0, longitude: 60.0 },  // Urals N
      { latitude: 55.0, longitude: 60.0 },  // Urals (Yekaterinburg, eastern cap)
      { latitude: 50.0, longitude: 55.0 },  // S Urals / steppe
      { latitude: 46.0, longitude: 48.0 },  // Caspian (Astrakhan)
      { latitude: 44.0, longitude: 40.0 },  // N Caucasus
      { latitude: 45.3, longitude: 33.0 },  // Crimea
      { latitude: 46.5, longitude: 30.7 },  // Odessa (Black Sea NW)
      { latitude: 50.0, longitude: 24.0 },  // Volhynia (W border)
      { latitude: 54.7, longitude: 20.5 },  // East Prussia border
      { latitude: 60.0, longitude: 28.0 },  // Gulf of Finland
    ],
  },
  {
    id: 'ww1-italy',
    war: 'ww1',
    country: 'Italy',
    side: 'allied',
    capital: { latitude: 41.9028, longitude: 12.4964, name: 'Rome' },
    coordinates: [
      { latitude: 46.5, longitude: 10.4 },  // Alps N (border)
      { latitude: 46.0, longitude: 13.6 },  // Friuli / Isonzo (NE)
      { latitude: 44.8, longitude: 12.5 },  // Po delta (Adriatic)
      { latitude: 42.0, longitude: 14.7 },  // Adriatic mid (Abruzzo)
      { latitude: 40.5, longitude: 18.4 },  // heel (Puglia)
      { latitude: 38.0, longitude: 15.6 },  // toe (Calabria / Messina)
      { latitude: 40.0, longitude: 15.0 },  // Tyrrhenian (Salerno)
      { latitude: 41.9, longitude: 12.4 },  // Rome coast
      { latitude: 43.5, longitude: 10.3 },  // Tuscany coast
      { latitude: 44.4, longitude: 8.9 },   // Genoa (Liguria)
      { latitude: 45.9, longitude: 7.0 },   // NW Alps (Aosta)
    ],
  },
  {
    id: 'ww1-serbia',
    war: 'ww1',
    country: 'Serbia',
    side: 'allied',
    capital: { latitude: 44.7866, longitude: 20.4489, name: 'Belgrade' },
    coordinates: [
      { latitude: 44.9, longitude: 19.6 },  // NW (Sava confluence)
      { latitude: 44.8, longitude: 21.4 },  // NE (Danube)
      { latitude: 43.4, longitude: 22.6 },  // E border
      { latitude: 42.3, longitude: 22.5 },  // SE
      { latitude: 42.0, longitude: 21.4 },  // S (toward Macedonia)
      { latitude: 42.5, longitude: 20.3 },  // SW (Kosovo)
      { latitude: 43.7, longitude: 19.4 },  // W (toward Bosnia)
      { latitude: 44.3, longitude: 19.1 },  // Drina (W border)
    ],
  },
  {
    id: 'ww1-romania',
    war: 'ww1',
    country: 'Romania',
    side: 'allied',
    capital: { latitude: 44.4268, longitude: 26.1025, name: 'Bucharest' },
    coordinates: [
      { latitude: 47.0, longitude: 22.0 },  // NW border
      { latitude: 47.9, longitude: 25.9 },  // N (Bukovina)
      { latitude: 46.5, longitude: 28.2 },  // NE (Prut / Moldavia)
      { latitude: 45.4, longitude: 28.2 },  // E (Galati)
      { latitude: 44.7, longitude: 28.9 },  // Black Sea (Constanta)
      { latitude: 43.7, longitude: 28.6 },  // SE coast
      { latitude: 43.8, longitude: 24.0 },  // S (Danube)
      { latitude: 44.6, longitude: 22.5 },  // SW (Iron Gates)
      { latitude: 45.7, longitude: 22.9 },  // W (Transylvania border)
    ],
  },

  // ============================================================
  // WW2 — AXIS
  // ============================================================
  {
    id: 'ww2-germany',
    war: 'ww2',
    country: 'Germany',
    side: 'axis',
    capital: { latitude: 52.52, longitude: 13.405, name: 'Berlin' },
    coordinates: [
      { latitude: 54.9, longitude: 8.3 },   // Schleswig (N)
      { latitude: 54.5, longitude: 13.0 },  // Baltic coast
      { latitude: 54.4, longitude: 19.6 },  // East Prussia
      { latitude: 51.0, longitude: 18.0 },  // SE (Silesia)
      { latitude: 48.6, longitude: 13.4 },  // Bavaria SE
      { latitude: 47.5, longitude: 10.2 },  // Alps
      { latitude: 47.6, longitude: 7.6 },   // SW corner
      { latitude: 49.5, longitude: 6.3 },   // W (Saar / Lux)
      { latitude: 51.0, longitude: 6.0 },   // Rhineland
      { latitude: 52.4, longitude: 7.0 },   // NW
      { latitude: 53.6, longitude: 7.0 },   // North Sea coast
    ],
  },
  {
    id: 'ww2-italy',
    war: 'ww2',
    country: 'Italy',
    side: 'axis',
    capital: { latitude: 41.9028, longitude: 12.4964, name: 'Rome' },
    coordinates: [
      { latitude: 46.5, longitude: 10.4 },  // Alps N
      { latitude: 46.5, longitude: 13.6 },  // NE (Friuli)
      { latitude: 44.8, longitude: 12.5 },  // Po delta
      { latitude: 42.0, longitude: 14.7 },  // Adriatic mid
      { latitude: 40.5, longitude: 18.4 },  // heel
      { latitude: 38.0, longitude: 15.6 },  // toe (Calabria)
      { latitude: 40.0, longitude: 15.0 },  // Tyrrhenian
      { latitude: 41.9, longitude: 12.4 },  // Rome coast
      { latitude: 43.5, longitude: 10.3 },  // Tuscany
      { latitude: 44.4, longitude: 8.9 },   // Genoa
      { latitude: 45.9, longitude: 7.0 },   // NW Alps
    ],
  },
  {
    id: 'ww2-japan',
    war: 'ww2',
    country: 'Japan',
    side: 'axis',
    capital: { latitude: 35.68, longitude: 139.69, name: 'Tokyo' },
    coordinates: [
      { latitude: 45.5, longitude: 141.9 },  // Hokkaido N
      { latitude: 43.4, longitude: 145.8 },  // Hokkaido E
      { latitude: 41.5, longitude: 141.5 },  // Honshu N (Aomori)
      { latitude: 38.3, longitude: 141.5 },  // Honshu E (Sendai)
      { latitude: 35.0, longitude: 140.9 },  // Honshu SE (Boso)
      { latitude: 34.6, longitude: 138.2 },  // central S coast
      { latitude: 33.5, longitude: 135.8 },  // Kii peninsula
      { latitude: 31.6, longitude: 131.4 },  // Kyushu SE
      { latitude: 31.2, longitude: 130.5 },  // Kyushu S
      { latitude: 33.6, longitude: 129.7 },  // Kyushu W (Nagasaki)
      { latitude: 35.5, longitude: 132.6 },  // Honshu W (Shimane)
      { latitude: 37.9, longitude: 138.3 },  // Honshu NW (Niigata)
    ],
  },

  // ============================================================
  // WW2 — ALLIED
  // ============================================================
  {
    id: 'ww2-united-kingdom',
    war: 'ww2',
    country: 'United Kingdom',
    side: 'allied',
    capital: { latitude: 51.5074, longitude: -0.1278, name: 'London' },
    coordinates: [
      { latitude: 58.6, longitude: -3.1 },  // N Scotland
      { latitude: 57.5, longitude: -1.8 },  // NE Scotland
      { latitude: 55.0, longitude: -1.4 },  // NE England
      { latitude: 52.9, longitude: 1.7 },   // East Anglia
      { latitude: 51.1, longitude: 1.4 },   // SE England (Dover)
      { latitude: 50.1, longitude: -3.5 },  // S coast
      { latitude: 50.1, longitude: -5.7 },  // Cornwall
      { latitude: 51.6, longitude: -5.3 },  // Wales SW
      { latitude: 53.4, longitude: -4.7 },  // NW England / Wales
      { latitude: 54.8, longitude: -5.0 },  // SW Scotland
      { latitude: 57.5, longitude: -6.4 },  // W Highlands
      { latitude: 58.5, longitude: -5.0 },  // NW Scotland
    ],
  },
  {
    id: 'ww2-france',
    war: 'ww2',
    country: 'France',
    side: 'allied',
    capital: { latitude: 48.8566, longitude: 2.3522, name: 'Paris' },
    coordinates: [
      { latitude: 51.0, longitude: 2.5 },   // Dunkirk
      { latitude: 49.3, longitude: 5.8 },   // NE
      { latitude: 47.6, longitude: 7.5 },   // Alsace
      { latitude: 45.9, longitude: 6.9 },   // Alps / Geneva
      { latitude: 43.7, longitude: 7.4 },   // Nice
      { latitude: 43.3, longitude: 3.0 },   // Med coast
      { latitude: 42.5, longitude: 1.6 },   // Pyrenees E
      { latitude: 43.4, longitude: -1.5 },  // Pyrenees W
      { latitude: 45.6, longitude: -1.1 },  // Gironde
      { latitude: 47.3, longitude: -2.4 },  // Brittany S
      { latitude: 48.6, longitude: -4.7 },  // Brest
      { latitude: 49.7, longitude: -1.6 },  // Cherbourg
      { latitude: 50.1, longitude: 1.6 },   // Normandy / Picardy
    ],
  },
  {
    id: 'ww2-soviet-union',
    war: 'ww2',
    country: 'Soviet Union',
    side: 'allied',
    capital: { latitude: 55.75, longitude: 37.62, name: 'Moscow' },
    coordinates: [
      { latitude: 68.9, longitude: 33.0 },  // Kola (Murmansk)
      { latitude: 64.5, longitude: 40.5 },  // Arkhangelsk
      { latitude: 62.0, longitude: 65.0 },  // W Siberia N
      { latitude: 55.0, longitude: 73.0 },  // W Siberia (Omsk, eastern cap)
      { latitude: 50.0, longitude: 70.0 },  // Kazakh steppe
      { latitude: 45.0, longitude: 55.0 },  // Aral region
      { latitude: 46.0, longitude: 48.0 },  // Caspian (Astrakhan)
      { latitude: 43.5, longitude: 42.0 },  // N Caucasus
      { latitude: 45.0, longitude: 35.0 },  // Crimea / Black Sea
      { latitude: 46.5, longitude: 30.7 },  // Odessa
      { latitude: 51.0, longitude: 24.0 },  // W border (Ukraine/Belarus)
      { latitude: 56.0, longitude: 21.0 },  // Baltic (Lithuania)
    ],
  },
  {
    id: 'ww2-united-states',
    war: 'ww2',
    country: 'United States',
    side: 'allied',
    capital: { latitude: 38.9, longitude: -77.04, name: 'Washington, D.C.' },
    coordinates: [
      { latitude: 49.0, longitude: -123.0 }, // NW (Washington state)
      { latitude: 49.0, longitude: -95.0 },  // N border (Minnesota)
      { latitude: 48.0, longitude: -88.0 },  // Great Lakes
      { latitude: 45.0, longitude: -82.5 },  // Lake Huron / Detroit
      { latitude: 44.8, longitude: -67.0 },  // NE (Maine)
      { latitude: 40.5, longitude: -74.0 },  // NY / NJ coast
      { latitude: 35.2, longitude: -75.5 },  // Cape Hatteras
      { latitude: 25.8, longitude: -80.2 },  // Florida (Miami)
      { latitude: 29.7, longitude: -94.0 },  // Gulf (Texas)
      { latitude: 25.9, longitude: -97.5 },  // S Texas (Rio Grande)
      { latitude: 32.5, longitude: -117.1 }, // San Diego
      { latitude: 38.0, longitude: -123.0 }, // Central CA coast
      { latitude: 46.2, longitude: -124.0 }, // Oregon coast
    ],
  },
];
