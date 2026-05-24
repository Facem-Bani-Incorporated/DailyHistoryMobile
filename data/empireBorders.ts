// data/empireBorders.ts — Simplified but geographically accurate empire polygons
export interface EmpireBorder {
  id: string;
  name: string;
  period: string;
  color: string;
  description: string;
  coordinates: { latitude: number; longitude: number }[];
  translations?: {
    ro?: { name: string; description: string };
    fr?: { name: string; description: string };
    de?: { name: string; description: string };
    es?: { name: string; description: string };
  };
}

export const EMPIRE_BORDERS: EmpireBorder[] = [
  {
    id: 'roman',
    name: 'Roman Empire',
    period: '117 AD — Trajan\'s peak',
    color: '#DC2626',
    description: '~5 million km², ~70 million people. "All roads lead to Rome."',
    translations: {
      ro: { name: 'Imperiul Roman', description: '~5 milioane km², ~70 milioane de locuitori. "Toate drumurile duc la Roma."' },
      fr: { name: 'Empire Romain', description: '~5 millions km², ~70 millions de personnes. "Tous les chemins mènent à Rome."' },
      de: { name: 'Römisches Reich', description: '~5 Millionen km², ~70 Millionen Menschen. „Alle Wege führen nach Rom."' },
      es: { name: 'Imperio Romano', description: '~5 millones km², ~70 millones de personas. "Todos los caminos llevan a Roma."' },
    },
    coordinates: [
      // Britain (Hadrian's Wall marks northern limit)
      { latitude: 55.5,  longitude: -3.0  },
      { latitude: 55.5,  longitude: 2.0   },
      // Rhine frontier (Germany, Benelux)
      { latitude: 52.0,  longitude: 8.5   },
      { latitude: 50.5,  longitude: 8.5   },
      // Upper Rhine → Danube source
      { latitude: 48.5,  longitude: 9.0   },
      // Danube frontier (Austria → Hungary → Croatia → Serbia → Romania)
      { latitude: 47.8,  longitude: 12.5  },
      { latitude: 46.5,  longitude: 16.0  },
      { latitude: 45.5,  longitude: 19.0  },
      { latitude: 44.8,  longitude: 22.0  },
      { latitude: 44.5,  longitude: 28.5  }, // Danube delta / Black Sea
      // East: Pontus coast, Anatolia, upper Mesopotamia
      { latitude: 42.5,  longitude: 35.0  },
      { latitude: 40.0,  longitude: 40.0  },
      { latitude: 37.5,  longitude: 42.5  },
      { latitude: 33.5,  longitude: 44.5  }, // Mesopotamia — Trajan's eastern peak
      { latitude: 30.0,  longitude: 47.5  }, // Near Persian Gulf
      // South: Red Sea, Egypt, Nubia border
      { latitude: 29.5,  longitude: 34.5  },
      { latitude: 23.5,  longitude: 32.0  }, // First cataract of the Nile (Aswan area)
      // North Africa coast west
      { latitude: 24.0,  longitude: 26.0  },
      { latitude: 28.0,  longitude: 14.0  },
      { latitude: 30.0,  longitude: 9.5   },
      { latitude: 33.5,  longitude: 7.5   },
      { latitude: 35.0,  longitude: 2.0   },
      { latitude: 35.5,  longitude: -2.0  },
      { latitude: 36.0,  longitude: -5.5  }, // Strait of Gibraltar / Tingis (Tangier)
      // Iberian Peninsula
      { latitude: 36.0,  longitude: -9.0  },
      { latitude: 43.7,  longitude: -8.5  },
      { latitude: 43.5,  longitude: -2.0  }, // Pyrenees
      // Gaul and back to Britain
      { latitude: 46.5,  longitude: 2.0   },
      { latitude: 50.5,  longitude: 2.5   },
      { latitude: 52.5,  longitude: 1.5   },
      { latitude: 55.5,  longitude: -3.0  }, // close
    ],
  },
  {
    id: 'mongol',
    name: 'Mongol Empire',
    period: '1279 AD — Kublai Khan\'s peak',
    color: '#D97706',
    description: 'Largest contiguous land empire in history — ~24 million km².',
    translations: {
      ro: { name: 'Imperiul Mongol', description: 'Cel mai mare imperiu terestru contigu din istorie — ~24 milioane km².' },
      fr: { name: 'Empire Mongol', description: 'Le plus grand empire terrestre contigu de l\'histoire — ~24 millions km².' },
      de: { name: 'Mongolisches Reich', description: 'Größtes zusammenhängendes Landreich der Geschichte — ~24 Millionen km².' },
      es: { name: 'Imperio Mongol', description: 'El mayor imperio terrestre contiguo de la historia — ~24 millones km².' },
    },
    coordinates: [
      // Westernmost extent: Poland, Ukraine
      { latitude: 52.0,  longitude: 23.0  },
      { latitude: 48.0,  longitude: 30.0  },
      { latitude: 44.0,  longitude: 39.0  }, // Caucasus
      { latitude: 37.0,  longitude: 44.0  }, // Persia / Azerbaijan
      // South: Gulf of Oman, eastern Arabia
      { latitude: 25.0,  longitude: 56.0  },
      { latitude: 22.5,  longitude: 60.5  },
      // India (western fringe — Mongols raided but Delhi Sultanate held)
      { latitude: 24.0,  longitude: 70.0  },
      // Southeast Asia border
      { latitude: 22.0,  longitude: 92.0  }, // Bengal / Burma border
      { latitude: 20.0,  longitude: 104.0 },
      // China coast
      { latitude: 21.0,  longitude: 110.0 },
      { latitude: 30.0,  longitude: 121.5 },
      { latitude: 39.0,  longitude: 122.0 },
      // Manchuria, Korea border
      { latitude: 42.0,  longitude: 130.0 },
      // Far East
      { latitude: 52.0,  longitude: 136.0 },
      // Siberia (controlled or strongly influenced)
      { latitude: 64.0,  longitude: 120.0 },
      { latitude: 62.0,  longitude: 68.0  },
      { latitude: 58.0,  longitude: 50.0  },
      // Russia (Moscow was sacked 1238)
      { latitude: 55.5,  longitude: 37.5  },
      { latitude: 52.0,  longitude: 23.0  }, // close
    ],
  },
  {
    id: 'ottoman',
    name: 'Ottoman Empire',
    period: '1683 AD — Siege of Vienna (peak)',
    color: '#059669',
    description: '600 years on 3 continents. "The Sublime Porte" ruled from Morocco to Iraq.',
    translations: {
      ro: { name: 'Imperiul Otoman', description: '600 de ani pe 3 continente. "Sublima Poartă" a stăpânit de la Maroc până în Irak.' },
      fr: { name: 'Empire Ottoman', description: '600 ans sur 3 continents. "La Sublime Porte" régnait du Maroc à l\'Irak.' },
      de: { name: 'Osmanisches Reich', description: '600 Jahre auf 3 Kontinenten. Die "Hohe Pforte" herrschte von Marokko bis in den Irak.' },
      es: { name: 'Imperio Otomano', description: '600 años en 3 continentes. La "Sublime Puerta" gobernó desde Marruecos hasta Irak.' },
    },
    coordinates: [
      // Vienna — high watermark 1683
      { latitude: 48.2,  longitude: 16.5  },
      { latitude: 45.5,  longitude: 24.5  }, // Transylvania
      { latitude: 44.0,  longitude: 29.0  }, // Black Sea coast (Romania)
      { latitude: 41.5,  longitude: 37.0  }, // Pontus coast
      { latitude: 38.0,  longitude: 45.5  }, // Armenian/Azerbaijani border
      // Safavid (Persian) border — contested but never conquered
      { latitude: 33.5,  longitude: 61.0  },
      // Arabian Peninsula
      { latitude: 22.0,  longitude: 59.0  }, // Oman coast
      { latitude: 14.0,  longitude: 45.5  }, // Yemen
      // Horn of Africa
      { latitude: 11.5,  longitude: 43.5  },
      { latitude: 11.5,  longitude: 39.5  }, // Ethiopia border
      // Red Sea, Egypt, Sudan
      { latitude: 22.5,  longitude: 37.0  },
      { latitude: 22.0,  longitude: 30.5  }, // Upper Egypt/Nubia
      { latitude: 31.0,  longitude: 32.5  }, // Sinai / Suez
      // North Africa (Libya, Tunisia, Algeria)
      { latitude: 30.5,  longitude: 14.5  },
      { latitude: 30.0,  longitude: 9.0   },
      { latitude: 30.5,  longitude: -2.5  }, // Algeria/Morocco border
      // North African coast back east
      { latitude: 36.5,  longitude: 3.0   },
      { latitude: 38.0,  longitude: 10.5  },
      // Southern Italy (Otranto briefly, Sicily targeted but held by Spain)
      { latitude: 40.5,  longitude: 19.0  }, // Albania
      // Balkans back to Vienna
      { latitude: 44.0,  longitude: 18.5  }, // Bosnia
      { latitude: 47.5,  longitude: 18.5  }, // Hungary
      { latitude: 48.2,  longitude: 16.5  }, // close
    ],
  },
  {
    id: 'alexander',
    name: "Alexander's Empire",
    period: '323 BC — After 13 years of conquest',
    color: '#7C3AED',
    description: 'Built in just 13 years. From Greece to the edge of the known world — never defeated in battle.',
    translations: {
      ro: { name: 'Imperiul lui Alexandru', description: 'Construit în doar 13 ani. De la Grecia până la marginea lumii cunoscute — niciodată înfrânt în luptă.' },
      fr: { name: 'Empire d\'Alexandre', description: 'Construit en seulement 13 ans. De la Grèce au bout du monde connu — jamais vaincu au combat.' },
      de: { name: 'Reich Alexanders', description: 'In nur 13 Jahren erbaut. Von Griechenland bis ans Ende der bekannten Welt — in keiner Schlacht besiegt.' },
      es: { name: 'Imperio de Alejandro', description: 'Construido en solo 13 años. De Grecia al límite del mundo conocido — nunca derrotado en batalla.' },
    },
    coordinates: [
      // Macedonia / Greece
      { latitude: 41.5,  longitude: 22.0  },
      { latitude: 37.5,  longitude: 27.0  }, // Ionia (Aegean coast)
      { latitude: 36.5,  longitude: 36.0  }, // Cilicia
      { latitude: 33.5,  longitude: 36.5  }, // Syria / Lebanon
      // Egypt
      { latitude: 31.0,  longitude: 32.0  },
      { latitude: 25.0,  longitude: 33.0  }, // Upper Egypt
      // Persia, Babylon, Persian Gulf
      { latitude: 29.5,  longitude: 48.0  },
      { latitude: 26.5,  longitude: 56.5  }, // Hormuz / Gulf coast
      // Gedrosia (southern Pakistan) — terrible desert march
      { latitude: 25.5,  longitude: 65.0  },
      // India — Punjab, Hydaspes River (turned back here)
      { latitude: 32.0,  longitude: 75.5  },
      { latitude: 26.5,  longitude: 68.5  }, // Indus Valley southward
      { latitude: 23.5,  longitude: 60.5  }, // Back through Gedrosia
      // Central Asia — Bactria, Sogdiana (Afghanistan / Uzbekistan)
      { latitude: 30.0,  longitude: 62.0  },
      { latitude: 36.0,  longitude: 61.0  },
      { latitude: 40.5,  longitude: 70.5  }, // Fergana — northernmost extent
      { latitude: 38.5,  longitude: 58.5  }, // Hyrcania (Caspian south)
      // Armenia, Anatolia
      { latitude: 38.5,  longitude: 48.0  },
      { latitude: 39.5,  longitude: 41.0  },
      { latitude: 40.5,  longitude: 36.0  }, // Black Sea coast
      { latitude: 41.5,  longitude: 22.0  }, // close
    ],
  },
  {
    id: 'achaemenid',
    name: 'Achaemenid Persian Empire',
    period: '500 BC — Darius I\'s peak',
    color: '#B45309',
    description: '~8 million km², ~44% of world population. First true world empire — from Thrace to the Indus.',
    translations: {
      ro: { name: 'Imperiul Persan Ahemenid', description: '~8 milioane km², ~44% din populația lumii. Primul adevărat imperiu mondial — de la Tracia până la Indus.' },
      fr: { name: 'Empire Perse Achéménide', description: '~8 millions km², ~44% de la population mondiale. Premier véritable empire mondial — de la Thrace à l\'Indus.' },
      de: { name: 'Achämenidisches Perserreich', description: '~8 Millionen km², ~44% der Weltbevölkerung. Erstes echtes Weltreich — von Thrakien bis zum Indus.' },
      es: { name: 'Imperio Persa Aqueménida', description: '~8 millones km², ~44% de la población mundial. Primer verdadero imperio mundial — de Tracia al Indo.' },
    },
    coordinates: [
      { latitude: 41.5, longitude: 26.0  }, // Thrace (European territory)
      { latitude: 38.5, longitude: 26.5  }, // Ionian coast of Anatolia
      { latitude: 36.5, longitude: 29.5  }, // Lycia (SW Anatolia)
      { latitude: 36.5, longitude: 36.5  }, // Cilicia / Antioch
      { latitude: 33.0, longitude: 35.5  }, // Palestine / Levant
      { latitude: 30.0, longitude: 32.0  }, // Egypt / Nile delta
      { latitude: 24.0, longitude: 33.0  }, // Upper Egypt / Nubia border
      { latitude: 22.0, longitude: 39.0  }, // Hejaz / Red Sea coast
      { latitude: 23.5, longitude: 57.5  }, // Musandam / Oman coast
      { latitude: 24.5, longitude: 67.5  }, // Sindh / Indus valley
      { latitude: 33.5, longitude: 73.5  }, // Punjab (eastern border)
      { latitude: 36.0, longitude: 70.0  }, // Bactria / Hindu Kush
      { latitude: 39.5, longitude: 63.0  }, // Sogdiana (Uzbekistan)
      { latitude: 42.0, longitude: 59.0  }, // Chorasmia / Aral Sea
      { latitude: 41.5, longitude: 50.5  }, // Caspian coast / Azerbaijan
      { latitude: 41.5, longitude: 43.5  }, // Armenia
      { latitude: 42.0, longitude: 35.0  }, // Pontus / Black Sea
      { latitude: 41.5, longitude: 26.0  }, // close
    ],
  },
  {
    id: 'byzantine',
    name: 'Byzantine Empire',
    period: '565 AD — Justinian I\'s reconquests',
    color: '#9D174D',
    description: 'Eastern Rome survived another 1,000 years — reconquered Italy, North Africa & coastal Spain.',
    translations: {
      ro: { name: 'Imperiul Bizantin', description: 'Roma de Est a supraviețuit încă 1.000 de ani — a reconquerit Italia, Africa de Nord și coasta Spaniei.' },
      fr: { name: 'Empire Byzantin', description: 'Rome orientale survécut 1 000 ans de plus — reconquête de l\'Italie, l\'Afrique du Nord et l\'Espagne côtière.' },
      de: { name: 'Byzantinisches Reich', description: 'Oströmisches Reich überlebte weitere 1.000 Jahre — Rückeroberung von Italien, Nordafrika und Küstenspanien.' },
      es: { name: 'Imperio Bizantino', description: 'Roma oriental sobrevivió 1.000 años más — reconquistó Italia, Norte de África y la costa española.' },
    },
    coordinates: [
      { latitude: 46.5, longitude: 26.0  }, // Danube frontier (Romania)
      { latitude: 44.0, longitude: 20.5  }, // Belgrade area (Pannonia)
      { latitude: 42.0, longitude: 19.5  }, // Albania / Epirus
      { latitude: 44.0, longitude: 12.0  }, // Ravenna (Byzantine capital in Italy)
      { latitude: 40.8, longitude: 14.5  }, // Naples
      { latitude: 38.1, longitude: 15.6  }, // Reggio Calabria
      { latitude: 37.5, longitude: 12.5  }, // Sicily (Palermo)
      { latitude: 37.0, longitude: 10.0  }, // Carthage / Tunisia
      { latitude: 37.8, longitude: -1.0  }, // Cartagena (Spania province)
      { latitude: 36.0, longitude: 5.5   }, // Ceuta / Septem
      { latitude: 32.5, longitude: 13.0  }, // Tripolitania (Libya)
      { latitude: 30.0, longitude: 25.0  }, // Cyrenaica
      { latitude: 31.0, longitude: 32.0  }, // Egypt / Alexandria
      { latitude: 24.0, longitude: 33.0  }, // Upper Egypt
      { latitude: 29.5, longitude: 35.0  }, // Aqaba / Sinai
      { latitude: 33.5, longitude: 36.5  }, // Damascus / Syria
      { latitude: 36.5, longitude: 41.0  }, // Northern Syria / Euphrates
      { latitude: 38.5, longitude: 44.5  }, // Eastern Anatolia border
      { latitude: 40.5, longitude: 44.0  }, // Armenia border
      { latitude: 42.0, longitude: 42.0  }, // Colchis / Georgian coast
      { latitude: 43.0, longitude: 39.0  }, // Pontus / Trabzon
      { latitude: 44.5, longitude: 34.0  }, // Crimea (Cherson)
      { latitude: 46.5, longitude: 26.0  }, // close
    ],
  },
  {
    id: 'umayyad',
    name: 'Umayyad Caliphate',
    period: '750 AD — Greatest extent before Abbasid revolution',
    color: '#0D9488',
    description: 'From Spain to the Indus in 100 years — fastest imperial expansion in history.',
    translations: {
      ro: { name: 'Califatul Omeiad', description: 'De la Spania până la Indus în 100 de ani — cea mai rapidă expansiune imperială din istorie.' },
      fr: { name: 'Califat Omeyyade', description: 'De l\'Espagne à l\'Indus en 100 ans — expansion impériale la plus rapide de l\'histoire.' },
      de: { name: 'Umayyadisches Kalifat', description: 'Von Spanien bis zum Indus in 100 Jahren — schnellste imperiale Expansion der Geschichte.' },
      es: { name: 'Califato Omeya', description: 'De España al Indo en 100 años — la expansión imperial más rápida de la historia.' },
    },
    coordinates: [
      { latitude: 43.5, longitude: -4.0  }, // Asturias border (unconquered north Spain)
      { latitude: 43.5, longitude: 3.5   }, // Narbonne / Septimania (southern France, brief)
      { latitude: 36.1, longitude: -5.4  }, // Gibraltar
      { latitude: 31.0, longitude: -7.5  }, // Morocco interior
      { latitude: 28.0, longitude: 1.0   }, // Algeria desert
      { latitude: 30.0, longitude: 13.0  }, // Tripolitania (Libya)
      { latitude: 31.0, longitude: 25.0  }, // Cyrenaica
      { latitude: 30.5, longitude: 32.5  }, // Suez / Sinai
      { latitude: 22.0, longitude: 37.0  }, // Hejaz / Red Sea
      { latitude: 12.0, longitude: 44.5  }, // Gulf of Aden
      { latitude: 22.0, longitude: 59.0  }, // Oman
      { latitude: 25.0, longitude: 67.0  }, // Sindh / Indus delta (conquered 711 AD)
      { latitude: 33.5, longitude: 73.0  }, // Punjab border
      { latitude: 37.0, longitude: 68.0  }, // Transoxiana (Uzbekistan)
      { latitude: 43.0, longitude: 58.0  }, // Aral Sea / Khwarezm
      { latitude: 40.0, longitude: 52.0  }, // Caspian east coast
      { latitude: 42.0, longitude: 48.0  }, // Azerbaijan
      { latitude: 41.5, longitude: 44.0  }, // Armenia / Georgia
      { latitude: 41.0, longitude: 36.0  }, // Pontus border (Byzantine)
      { latitude: 37.0, longitude: 36.0  }, // Cilicia / Anatolia border
      { latitude: 34.0, longitude: 36.0  }, // Syria
      { latitude: 43.5, longitude: -4.0  }, // close
    ],
  },
  {
    id: 'napoleon',
    name: 'Napoleonic Empire',
    period: '1812 AD — Before the Russian campaign',
    color: '#2563EB',
    description: 'Direct control + satellite states covering 70 million Europeans under one man.',
    translations: {
      ro: { name: 'Imperiul Napoleonian', description: 'Control direct + state satelit cuprinzând 70 de milioane de europeni sub un singur om.' },
      fr: { name: 'Empire Napoléonien', description: 'Contrôle direct + États satellites couvrant 70 millions d\'Européens sous un seul homme.' },
      de: { name: 'Napoleonisches Reich', description: 'Direkte Kontrolle + Satellitenstaaten mit 70 Millionen Europäern unter einem Mann.' },
      es: { name: 'Imperio Napoleónico', description: 'Control directo + estados satélite con 70 millones de europeos bajo un solo hombre.' },
    },
    coordinates: [
      { latitude: 53.6, longitude: 9.9   }, // Hamburg (annexed 1810)
      { latitude: 52.0, longitude: 21.0  }, // Warsaw (Grand Duchy)
      { latitude: 49.5, longitude: 24.0  }, // Galicia border (Austrian Empire)
      { latitude: 46.5, longitude: 20.5  }, // Hungary border
      { latitude: 46.0, longitude: 14.5  }, // Illyrian Provinces (Ljubljana)
      { latitude: 42.5, longitude: 18.5  }, // Montenegro / Adriatic coast
      { latitude: 41.0, longitude: 15.0  }, // Kingdom of Naples (Murat)
      { latitude: 38.1, longitude: 15.6  }, // Reggio Calabria (southern tip)
      { latitude: 41.9, longitude: 12.5  }, // Rome (Papal States annexed 1809)
      { latitude: 44.4, longitude: 8.9   }, // Genoa
      { latitude: 43.3, longitude: 5.4   }, // Marseille
      { latitude: 42.7, longitude: 2.9   }, // Eastern Pyrenees
      { latitude: 40.4, longitude: -3.7  }, // Madrid (Joseph Bonaparte)
      { latitude: 36.7, longitude: -4.4  }, // Málaga (southern Spain)
      { latitude: 43.4, longitude: -1.8  }, // Western Pyrenees / Basque coast
      { latitude: 47.0, longitude: -2.5  }, // Vendée / Loire Atlantic
      { latitude: 51.1, longitude: 2.5   }, // Calais / Belgian coast
      { latitude: 52.4, longitude: 4.9   }, // Amsterdam (Netherlands annexed)
      { latitude: 53.6, longitude: 9.9   }, // Hamburg (close)
    ],
  },
  {
    id: 'han_china',
    name: 'Han Dynasty China',
    period: '100 AD — Emperor Wu\'s expansion',
    color: '#E11D48',
    description: 'Han China rivalled Rome in power and population — defined Chinese civilization for 2,000 years.',
    translations: {
      ro: { name: 'China Dinastiei Han', description: 'China Han rivaliza cu Roma în putere și populație — a definit civilizația chineză timp de 2.000 de ani.' },
      fr: { name: 'Chine de la Dynastie Han', description: 'La Chine Han rivalisait avec Rome en puissance et population — a défini la civilisation chinoise pour 2 000 ans.' },
      de: { name: 'China der Han-Dynastie', description: 'Das Han-China rivalisierte mit Rom an Macht und Bevölkerung — prägte die chinesische Zivilisation für 2.000 Jahre.' },
      es: { name: 'China de la Dinastía Han', description: 'La China Han rivalizaba con Roma en poder y población — definió la civilización china durante 2.000 años.' },
    },
    coordinates: [
      { latitude: 40.0, longitude: 116.0 }, // Beijing / Yan commandery
      { latitude: 43.0, longitude: 128.0 }, // Liaodong / Manchuria
      { latitude: 38.0, longitude: 128.0 }, // Korean commanderies (Lelang)
      { latitude: 32.0, longitude: 122.0 }, // East China Sea coast
      { latitude: 23.0, longitude: 114.0 }, // Guangzhou / Pearl River delta
      { latitude: 21.0, longitude: 107.0 }, // Tonkin / northern Vietnam (Jiao commandery)
      { latitude: 23.0, longitude: 100.0 }, // Yunnan border (SW)
      { latitude: 30.0, longitude: 85.0  }, // Tibet plateau (never conquered — border)
      { latitude: 39.5, longitude: 76.0  }, // Tarim Basin / Xinjiang protectorate
      { latitude: 42.5, longitude: 89.0  }, // Hami / Turpan (Silk Road gate)
      { latitude: 45.0, longitude: 112.0 }, // Gobi / Inner Mongolia frontier
      { latitude: 42.0, longitude: 118.0 }, // Eastern Mongolia border
      { latitude: 40.0, longitude: 116.0 }, // close
    ],
  },
];
