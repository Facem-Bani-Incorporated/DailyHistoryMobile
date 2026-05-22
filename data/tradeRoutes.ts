// data/tradeRoutes.ts
// Historical trade routes overlay for the map

export interface TradeRouteStop {
  label: string;
  latitude: number;
  longitude: number;
  note: string;
}

export interface TradeRoute {
  id: string;
  name: string;
  era: string;
  period: string; // active years
  color: string;
  emoji: string;
  description: string;
  goods: string[];
  significance: string;
  length: string;
  coordinates: { latitude: number; longitude: number }[];
  keyStops: TradeRouteStop[];
}

export const TRADE_ROUTES: TradeRoute[] = [
  {
    id: 'silk_road',
    name: 'The Silk Road',
    era: 'Ancient–Medieval',
    period: '130 BC – 1453 AD',
    color: '#DC2626',
    emoji: '🐪',
    description: 'The greatest trade network of the ancient world, the Silk Road was not a single road but a web of routes linking China to the Mediterranean. Caravans carried silk, spices, gold, and ideas — including Buddhism, Islam, and the Black Death — across 4,000 miles of deserts and mountains.',
    goods: ['Silk', 'Spices', 'Glass', 'Gold', 'Horses', 'Paper', 'Gunpowder', 'Buddhism'],
    significance: 'Connected East Asia to the Mediterranean for 1,600 years, transferring technologies, religions, and diseases that shaped world history',
    length: '6,400 km',
    coordinates: [
      { latitude: 39.9042, longitude: 116.4074 }, // Beijing/Xi'an
      { latitude: 36.5731, longitude: 103.0735 }, // Lanzhou
      { latitude: 43.8100, longitude: 87.6010 },  // Urumqi
      { latitude: 39.6542, longitude: 66.9597 },  // Samarkand
      { latitude: 37.9601, longitude: 58.3261 },  // Merv
      { latitude: 36.2605, longitude: 50.0041 },  // Tehran
      { latitude: 37.0662, longitude: 37.3781 },  // Antioch
      { latitude: 36.2021, longitude: 36.1608 },  // Antioch port
      { latitude: 41.0082, longitude: 28.9784 },  // Constantinople
    ],
    keyStops: [
      { label: "Xi'an (Chang'an)", latitude: 34.3416, longitude: 108.9398, note: "Eastern terminus — capital of the Han and Tang dynasties, where the Silk Road officially began. Over 1 million inhabitants at its peak, the most cosmopolitan city in the world." },
      { label: 'Dunhuang', latitude: 40.1428, longitude: 94.6614, note: 'The Gateway to the Western Regions. Caravans split here between northern and southern routes around the Taklamakan Desert. The Mogao Caves nearby contain 45,000 sq meters of Buddhist murals.' },
      { label: 'Samarkand', latitude: 39.6542, longitude: 66.9597, note: 'The "Jewel of the Islamic World." Controlled by the Sogdians — the greatest merchants of the ancient world — then Alexander, the Kushans, and Timur the Great, who made it his imperial capital.' },
      { label: 'Merv (Mary)', latitude: 37.6622, longitude: 61.8296, note: 'Once one of the largest cities in the world with 200,000 inhabitants. Destroyed by the Mongols in 1221 — Genghis Khan\'s son reportedly killed 700,000 people in a single sack.' },
      { label: 'Baghdad', latitude: 33.3406, longitude: 44.4009, note: 'Under the Abbasid Caliphate, Baghdad was the world\'s largest city with 1.5 million people. The House of Wisdom here translated Greek, Persian, and Indian texts and preserved classical knowledge through the Dark Ages.' },
      { label: 'Constantinople', latitude: 41.0082, longitude: 28.9784, note: 'Western terminus and the greatest trading city of the medieval world. Controlled the Bosphorus strait between Asia and Europe. When it fell to the Ottomans in 1453, European powers scrambled to find new routes to Asia — launching the Age of Exploration.' },
    ],
  },
  {
    id: 'amber_road',
    name: 'The Amber Road',
    era: 'Bronze Age–Roman',
    period: '2000 BC – 400 AD',
    color: '#D97706',
    emoji: '✨',
    description: 'From the Baltic coast to the Mediterranean, traders carried Baltic amber — "the gold of the north" — 2,000+ miles through the heart of Europe. Romans prized amber so highly that a small amber figurine cost more than a healthy slave. The route carried not just amber but ideas, languages, and peoples.',
    goods: ['Amber', 'Fur', 'Slaves', 'Roman Glass', 'Bronze', 'Wine', 'Olive Oil'],
    significance: 'Connected Northern Europe to the Mediterranean for millennia, enabling cultural and technological exchange across the continent',
    length: '2,400 km',
    coordinates: [
      { latitude: 54.6872, longitude: 25.2797 }, // Vilnius (Baltic)
      { latitude: 51.1079, longitude: 17.0385 }, // Wroclaw
      { latitude: 48.1486, longitude: 17.1077 }, // Bratislava
      { latitude: 47.4979, longitude: 19.0402 }, // Budapest
      { latitude: 46.0569, longitude: 14.5058 }, // Ljubljana
      { latitude: 45.4654, longitude: 12.3354 }, // Venice/Aquileia
      { latitude: 44.4056, longitude: 8.9463 },  // Genoa
      { latitude: 41.9028, longitude: 12.4964 }, // Rome
    ],
    keyStops: [
      { label: 'Baltic Coast (Sambia)', latitude: 54.9000, longitude: 20.0000, note: 'The amber-producing heartland in modern Kaliningrad, Russia. Baltic amber (succinite) is 40-50 million years old, formed from extinct conifer trees. Some pieces contain perfectly preserved prehistoric insects — the inspiration for Jurassic Park.' },
      { label: 'Carnuntum', latitude: 48.1108, longitude: 16.8703, note: 'Major Roman legionary fortress on the Danube that served as a key waypoint on the amber road. Emperor Marcus Aurelius wrote parts of his "Meditations" here during the Marcomannic Wars.' },
      { label: 'Aquileia', latitude: 45.7698, longitude: 13.3688, note: 'The northern terminus of Roman Italy and the southern end of the Amber Road. At its peak, Aquileia was the fourth-largest city in the Western Roman Empire with 100,000 people.' },
      { label: 'Rome', latitude: 41.9028, longitude: 12.4964, note: 'Emperor Nero sent an expedition specifically to find the source of Baltic amber. So much amber flowed into Rome that one gladiatorial show decorated all the arena netting, weapons, and equipment with amber pieces.' },
    ],
  },
  {
    id: 'incense_route',
    name: 'The Incense Route',
    era: 'Ancient',
    period: '1000 BC – 500 AD',
    color: '#7C3AED',
    emoji: '💨',
    description: 'From the frankincense trees of Dhofar in Arabia to the harbors of Gaza and Egypt, camel caravans carried the world\'s most valued commodities — frankincense and myrrh. These aromatic resins were worth their weight in gold, burned in temples from Jerusalem to Rome.',
    goods: ['Frankincense', 'Myrrh', 'Spices', 'Gold', 'Precious Stones', 'Indian Goods'],
    significance: 'Funded the Nabataean civilization and their rock city of Petra; connected Africa and Arabia to the Mediterranean world',
    length: '2,000 km',
    coordinates: [
      { latitude: 17.0167, longitude: 54.1000 }, // Dhofar, Oman
      { latitude: 15.5527, longitude: 48.5164 }, // Marib (Sheba)
      { latitude: 21.4225, longitude: 39.8262 }, // Mecca
      { latitude: 26.5113, longitude: 37.9182 }, // Medina area
      { latitude: 30.3209, longitude: 35.4442 }, // Petra
      { latitude: 31.2001, longitude: 34.5002 }, // Gaza
      { latitude: 30.0444, longitude: 31.2357 }, // Cairo/Memphis
    ],
    keyStops: [
      { label: 'Dhofar (Ubar)', latitude: 17.0167, longitude: 54.1000, note: 'The source of frankincense — a remote region of Oman where Boswellia trees still grow. Ancient Ubar (the "Atlantis of the Sands") was a major frankincense trading post, rediscovered by satellite in 1992.' },
      { label: 'Marib (Kingdom of Sheba)', latitude: 15.5527, longitude: 48.5164, note: 'Capital of the legendary Kingdom of Sheba (Saba), whose queen famously visited Solomon. The Marib Dam, built c. 750 BC, was an engineering marvel irrigating 25,000 acres. Its collapse in the 6th century AD triggered a mass migration of Arabian tribes.' },
      { label: 'Petra', latitude: 30.3209, longitude: 35.4442, note: 'The Rose City — capital of the Nabataean Kingdom, carved directly from pink sandstone cliffs. The Nabataeans grew rich controlling the incense trade and built sophisticated water harvesting systems in this desert stronghold.' },
      { label: 'Gaza', latitude: 31.5017, longitude: 34.4668, note: 'The northern terminus and Mediterranean port where incense caravans sold their goods to Phoenician and Greek traders. Gaza has been continuously inhabited and fought over for 5,000 years.' },
    ],
  },
  {
    id: 'trans_saharan',
    name: 'Trans-Saharan Trade Routes',
    era: 'Medieval',
    period: '500–1600 AD',
    color: '#D97706',
    emoji: '🌵',
    description: 'Camel caravans crossing the Sahara Desert connected sub-Saharan Africa to North Africa and the Mediterranean. Gold, salt, and slaves were the primary commodities. The Mali Empire became stupendously wealthy — its emperor Mansa Musa\'s hajj to Mecca in 1324 distributed so much gold it crashed the Egyptian economy for years.',
    goods: ['Gold', 'Salt', 'Slaves', 'Ivory', 'Kola Nuts', 'Leather goods', 'Textiles'],
    significance: 'Made West African empires (Ghana, Mali, Songhai) immensely wealthy and spread Islam throughout West Africa',
    length: '3,000 km',
    coordinates: [
      { latitude: 12.3654, longitude: -1.5354 },  // Ouagadougou area (Mossi)
      { latitude: 16.7735, longitude: -3.0074 },  // Timbuktu
      { latitude: 20.0000, longitude: 1.0000 },   // Sahara crossing
      { latitude: 26.8206, longitude: 8.5194 },   // Ghat
      { latitude: 32.9011, longitude: 13.1800 },  // Tripoli
      { latitude: 36.8065, longitude: 10.1815 },  // Tunis
      { latitude: 31.6295, longitude: -7.9811 },  // Marrakech
    ],
    keyStops: [
      { label: 'Timbuktu', latitude: 16.7735, longitude: -3.0074, note: 'The intellectual and spiritual capital of the Mali Empire and a major trans-Saharan trading city. At its peak it had 100,000 inhabitants and 180 Quranic schools. The Sankore Mosque functioned as a university with 25,000 students.' },
      { label: 'Taghaza (Salt Mines)', latitude: 23.3833, longitude: -5.5333, note: 'The key salt-mining oasis in the central Sahara. Salt was literally worth its weight in gold in sub-Saharan Africa. The town\'s buildings were made entirely of salt blocks — even the mosque.' },
      { label: 'Sijilmasa', latitude: 31.7000, longitude: -4.0000, note: 'The northern gateway to the Sahara and the transshipment point for gold from sub-Saharan Africa to Mediterranean markets. Founded in 757 AD, it was one of the wealthiest cities in the medieval world.' },
    ],
  },
  {
    id: 'spice_route',
    name: 'Indian Ocean Spice Route',
    era: 'Ancient–Colonial',
    period: '200 BC – 1600 AD',
    color: '#059669',
    emoji: '🌶️',
    description: 'Monsoon winds powered seasonal trading voyages connecting Southeast Asia, India, Arabia, and East Africa in a vast maritime network. Spices — pepper, cinnamon, nutmeg, cloves — were so valuable in Europe that the search for a direct sea route to the Spice Islands drove the entire Age of Exploration.',
    goods: ['Pepper', 'Cinnamon', 'Nutmeg', 'Cloves', 'Cotton', 'Porcelain', 'Silk', 'Slaves'],
    significance: 'Powered maritime civilizations from Arabia to Southeast Asia; the drive to control the spice trade motivated European exploration and colonization',
    length: '8,000 km',
    coordinates: [
      { latitude: 1.3521, longitude: 103.8198 },  // Malacca (Spice source)
      { latitude: 8.5241, longitude: 76.9366 },   // Calicut, India
      { latitude: 7.8731, longitude: 80.7718 },   // Sri Lanka (Ceylon)
      { latitude: 22.3193, longitude: 114.1694 }, // wait no, Sri Lanka -> Malabar
      { latitude: 13.0827, longitude: 80.2707 },  // Chennai
      { latitude: 17.3850, longitude: 78.4867 },  // Hyderabad area
      { latitude: 12.8628, longitude: 45.0187 },  // Aden, Yemen
      { latitude: 21.4225, longitude: 39.8262 },  // Jeddah
      { latitude: -4.0435, longitude: 39.6682 },  // Mombasa, Kenya
      { latitude: 41.9028, longitude: 12.4964 },  // Rome (via Egypt)
    ],
    keyStops: [
      { label: 'Malacca', latitude: 2.1896, longitude: 102.2501, note: 'The "Venice of the East" and hub of the spice trade. Over 80 languages were spoken in its streets. Whoever controlled Malacca controlled the flow of spices from the Moluccas to the world. The Portuguese seized it in 1511, launching European domination of Asian trade.' },
      { label: 'Calicut (Kozhikode)', latitude: 11.2588, longitude: 75.7804, note: 'The pepper capital of the world, where Vasco da Gama arrived in 1498 after rounding Africa. The local ruler\'s greeting: "What brought you here?" Da Gama: "Christians and spices." The word "calico" comes from this city.' },
      { label: 'Aden', latitude: 12.7842, longitude: 45.0194, note: 'The strategic gateway between the Indian Ocean and the Red Sea. All trade between Asia and the Mediterranean funneled through this natural harbor. The Romans described Aden as the most important trading post in the world after Alexandria.' },
      { label: 'Kilwa Kisiwani', latitude: -8.9600, longitude: 39.5183, note: 'The most important trading port in East Africa, described by Ibn Battuta as one of the most beautiful cities in the world. Gold from Zimbabwe and Great Zimbabwe\'s mines passed through Kilwa to Arab traders.' },
    ],
  },
  {
    id: 'viking_routes',
    name: 'Viking Trade Routes',
    era: 'Medieval',
    period: '793–1100 AD',
    color: '#1D4ED8',
    emoji: '⚓',
    description: 'The Vikings were not just raiders — they were the greatest long-distance traders of the early medieval world. Their routes connected Scandinavia to Byzantium via Russian rivers (the Varangian Route), the British Isles, Iceland, Greenland, and even North America 500 years before Columbus.',
    goods: ['Amber', 'Furs', 'Slaves', 'Silver', 'Weapons', 'Wine', 'Byzantine Silks'],
    significance: 'Opened Eastern Europe to trade, founded cities (Dublin, Kyiv, Novgorod), and connected the Viking world from Greenland to Constantinople',
    length: '5,000+ km',
    coordinates: [
      { latitude: 59.9139, longitude: 10.7522 },  // Oslo/Scandinavia
      { latitude: 57.7089, longitude: 11.9746 },  // Goteborg
      { latitude: 58.5953, longitude: 25.0136 },  // across Baltic
      { latitude: 59.9311, longitude: 30.3609 },  // Novgorod (Holmgardr)
      { latitude: 50.4501, longitude: 30.5234 },  // Kyiv (Konugardr)
      { latitude: 47.0105, longitude: 28.8638 },  // Dnieper route
      { latitude: 44.0048, longitude: 33.0000 },  // Black Sea
      { latitude: 41.0082, longitude: 28.9784 },  // Constantinople (Miklagardr)
    ],
    keyStops: [
      { label: 'Hedeby (Haithabu)', latitude: 54.6190, longitude: 9.5630, note: 'The largest Viking trading town in Scandinavia, at the base of the Jutland peninsula. At its peak it had 1,500 inhabitants — enormous for the Viking age. Traders from across Europe met here to exchange goods.' },
      { label: 'Novgorod', latitude: 58.5210, longitude: 31.2752, note: 'The Vikings (Varangians) founded Novgorod around 859 AD. It became a republic and one of medieval Europe\'s most important trading cities, controlling the Volga trade route to the Caspian Sea and the Dnieper route to Byzantium.' },
      { label: 'Kyiv', latitude: 50.4501, longitude: 30.5234, note: 'Founded by the Varangian Rurik dynasty, Kyiv became the capital of Kievan Rus — the ancestor state of modern Russia, Ukraine, and Belarus. Prince Vladimir\'s conversion to Orthodox Christianity in 988 shaped Eastern Europe forever.' },
      { label: 'Constantinople', latitude: 41.0082, longitude: 28.9784, note: 'The Vikings called it "Miklagardr" (the Great City) and it was the ultimate destination. Vikings served as the Varangian Guard — the Byzantine Emperor\'s elite personal bodyguard. Norwegian King Harald Hardrada served in the Guard before returning to claim Norway.' },
      { label: 'L\'Anse aux Meadows', latitude: 51.5960, longitude: -55.5227, note: 'The only confirmed Viking settlement in North America, in modern Newfoundland, Canada. Founded c. 1000 AD by Leif Eriksson, it predates Columbus by nearly 500 years. The Vikings called the continent "Vinland."' },
    ],
  },
];
