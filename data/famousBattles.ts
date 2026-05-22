// data/famousBattles.ts
// Famous Battles dataset with phase-by-phase movement data

export interface BattlePhase {
  phase: number;
  title: string;
  description: string;
  year?: string; // time within battle, e.g. "Day 1 - Morning"
  positions: {
    id: string;
    label: string;
    side: 'attacker' | 'defender' | 'neutral';
    latitude: number;
    longitude: number;
    troops?: string;
    note?: string;
  }[];
  movements?: {
    from: { latitude: number; longitude: number };
    to: { latitude: number; longitude: number };
    side: 'attacker' | 'defender';
    label?: string;
  }[];
}

export interface FamousBattle {
  id: string;
  name: string;
  year: number; // negative = BC
  yearLabel: string;
  latitude: number;
  longitude: number;
  emoji: string;
  color: string;
  attacker: string;
  defender: string;
  outcome: string;
  significance: string;
  description: string;
  casualties: string;
  duration: string;
  commanders: { name: string; side: string }[];
  phases: BattlePhase[];
}

export const FAMOUS_BATTLES: FamousBattle[] = [
  {
    id: 'marathon',
    name: 'Battle of Marathon',
    year: -490,
    yearLabel: '490 BC',
    latitude: 38.1556,
    longitude: 23.9685,
    emoji: '⚔️',
    color: '#DC2626',
    attacker: 'Persian Empire',
    defender: 'Athens & Plataea',
    outcome: 'Greek Victory',
    significance: 'Stopped first Persian invasion of Greece, saved Western democracy',
    description: 'The Athenians and Plataeans crushed a far larger Persian force on the plains of Marathon, a defining moment in the birth of Western civilization. The 26-mile run of the messenger Pheidippides to announce the victory gave birth to the modern marathon race.',
    casualties: '6,400 Persian, 192 Athenian',
    duration: '1 day',
    commanders: [
      { name: 'Miltiades', side: 'Athens' },
      { name: 'Datis', side: 'Persia' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Persian Landing',
        description: 'The Persian fleet under Datis lands 25,000 men on the plains of Marathon, establishing a beachhead and preparing for the march to Athens.',
        year: 'Day 1 — Dawn',
        positions: [
          { id: 'p_main', label: 'Persian Camp', side: 'attacker', latitude: 38.168, longitude: 23.972, troops: '25,000 infantry & cavalry' },
          { id: 'g_hill', label: 'Athenian Camp', side: 'defender', latitude: 38.142, longitude: 23.958, troops: '10,000 Athenians + 1,000 Plataeans' },
        ],
      },
      {
        phase: 2,
        title: 'Greek Advance',
        description: 'Miltiades orders a bold charge at the run across the plain, surprising the Persians who expected a defensive stand. The wings are strengthened at the expense of the center.',
        year: 'Day 5 — Morning',
        positions: [
          { id: 'p_main', label: 'Persian Line', side: 'attacker', latitude: 38.162, longitude: 23.972, troops: '25,000 men in deep formation' },
          { id: 'g_attack', label: 'Greek Charge', side: 'defender', latitude: 38.152, longitude: 23.963, troops: 'Charging at full run' },
        ],
        movements: [
          { from: { latitude: 38.142, longitude: 23.958 }, to: { latitude: 38.155, longitude: 23.968 }, side: 'defender', label: 'Greek charge' },
        ],
      },
      {
        phase: 3,
        title: 'Double Envelopment',
        description: 'The Greek wings break through the Persian flanks while the center holds. The victorious wings then wheel inward to encircle the Persian center, which had pushed through the weaker Greek middle.',
        year: 'Day 5 — Midday',
        positions: [
          { id: 'p_center', label: 'Persian Center (Advancing)', side: 'attacker', latitude: 38.157, longitude: 23.965, troops: 'Elite Immortals advancing' },
          { id: 'g_left', label: 'Greek Left Wing', side: 'defender', latitude: 38.160, longitude: 23.958, troops: 'Flanking attack' },
          { id: 'g_right', label: 'Greek Right Wing', side: 'defender', latitude: 38.160, longitude: 23.978, troops: 'Flanking attack' },
        ],
        movements: [
          { from: { latitude: 38.160, longitude: 23.958 }, to: { latitude: 38.162, longitude: 23.966 }, side: 'defender', label: 'Left flank wheel' },
          { from: { latitude: 38.160, longitude: 23.978 }, to: { latitude: 38.162, longitude: 23.968 }, side: 'defender', label: 'Right flank wheel' },
        ],
      },
      {
        phase: 4,
        title: 'Persian Rout',
        description: 'Encircled and in panic, the Persians flee to their ships. The Greeks pursue to the sea, killing 6,400. The victory is total — Athenian losses are only 192.',
        year: 'Day 5 — Afternoon',
        positions: [
          { id: 'p_rout', label: 'Persian Retreat', side: 'attacker', latitude: 38.170, longitude: 23.972, note: 'Fleeing to ships' },
          { id: 'g_pursue', label: 'Greek Pursuit', side: 'defender', latitude: 38.165, longitude: 23.970, note: 'Pursuing to the shore' },
        ],
        movements: [
          { from: { latitude: 38.160, longitude: 23.968 }, to: { latitude: 38.173, longitude: 23.975 }, side: 'attacker', label: 'Persian rout to ships' },
        ],
      },
    ],
  },
  {
    id: 'gaugamela',
    name: 'Battle of Gaugamela',
    year: -331,
    yearLabel: '331 BC',
    latitude: 36.3625,
    longitude: 43.0656,
    emoji: '🐎',
    color: '#7C3AED',
    attacker: 'Macedon (Alexander the Great)',
    defender: 'Persian Empire (Darius III)',
    outcome: 'Macedonian Victory — end of the Persian Empire',
    significance: 'Alexander destroyed the Achaemenid Persian Empire and opened the path to his conquests of Asia',
    description: 'On the vast plains of Gaugamela in modern Iraq, Alexander the Great defeated the massive Persian army of Darius III with a bold cavalry charge that split the Persian line. Darius fled, and the Persian Empire effectively ended that day.',
    casualties: '47,000+ Persian, ~1,200 Macedonian',
    duration: '1 day',
    commanders: [
      { name: 'Alexander the Great', side: 'Macedon' },
      { name: 'Darius III', side: 'Persia' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Deployment',
        description: 'Darius arrays his massive army—estimated at 100,000+—on a flat plain specially chosen and leveled for his scythed chariots and elephants. Alexander positions his Macedonians in an oblique formation, refusing his left.',
        year: 'October 1 — Dawn',
        positions: [
          { id: 'p_center', label: 'Darius & Persian Center', side: 'defender', latitude: 36.364, longitude: 43.068, troops: '100,000+ including Immortals & chariots' },
          { id: 'a_comp', label: 'Alexander\'s Companion Cavalry', side: 'attacker', latitude: 36.362, longitude: 43.058, troops: '7,000 elite cavalry' },
          { id: 'a_inf', label: 'Macedonian Phalanx', side: 'attacker', latitude: 36.362, longitude: 43.065, troops: '40,000 infantry, sarissa pikes' },
        ],
      },
      {
        phase: 2,
        title: 'Oblique Advance',
        description: 'Alexander leads his right wing on an oblique march to the right, stretching the Persian line. The Persians send cavalry to counter, revealing a gap in their formation.',
        year: 'October 1 — Morning',
        positions: [
          { id: 'a_drift', label: 'Alexander\'s Drift Right', side: 'attacker', latitude: 36.361, longitude: 43.054, troops: 'Companion Cavalry' },
          { id: 'p_gap', label: 'Gap Opening in Persian Line', side: 'defender', latitude: 36.364, longitude: 43.063, note: 'Persian cavalry pulled out of position' },
        ],
        movements: [
          { from: { latitude: 36.362, longitude: 43.058 }, to: { latitude: 36.361, longitude: 43.054 }, side: 'attacker', label: 'Oblique march right' },
        ],
      },
      {
        phase: 3,
        title: 'Alexander\'s Charge',
        description: 'Spotting the gap left by the distracted Persian cavalry, Alexander personally leads the Companions in a wedge charge directly at Darius. The Macedonian phalanx advances simultaneously.',
        year: 'October 1 — Midday',
        positions: [
          { id: 'a_charge', label: 'Alexander\'s Charge', side: 'attacker', latitude: 36.362, longitude: 43.060, troops: 'Companions at full gallop' },
          { id: 'd_flee', label: 'Darius Threatened', side: 'defender', latitude: 36.364, longitude: 43.064, note: 'Darius in danger of being killed' },
        ],
        movements: [
          { from: { latitude: 36.361, longitude: 43.054 }, to: { latitude: 36.363, longitude: 43.062 }, side: 'attacker', label: 'Companion charge into gap' },
        ],
      },
      {
        phase: 4,
        title: 'Darius Flees — Persian Collapse',
        description: 'Darius flees the battlefield for the second time. Without leadership, the Persian army collapses. Alexander\'s left wing holds against Persian encirclement until help arrives. Total victory is achieved.',
        year: 'October 1 — Afternoon',
        positions: [
          { id: 'd_rout', label: 'Persian Army in Rout', side: 'defender', latitude: 36.368, longitude: 43.072, note: 'Fleeing eastward' },
          { id: 'a_pursuit', label: 'Macedonian Pursuit', side: 'attacker', latitude: 36.365, longitude: 43.068, note: 'Cutting down fleeing Persians' },
        ],
        movements: [
          { from: { latitude: 36.364, longitude: 43.065 }, to: { latitude: 36.371, longitude: 43.078 }, side: 'defender', label: 'Darius flees east' },
        ],
      },
    ],
  },
  {
    id: 'hastings',
    name: 'Battle of Hastings',
    year: 1066,
    yearLabel: '1066 AD',
    latitude: 50.9105,
    longitude: 0.4889,
    emoji: '🏹',
    color: '#B45309',
    attacker: 'Norman France (William the Conqueror)',
    defender: 'Anglo-Saxon England (Harold II)',
    outcome: 'Norman Victory — England transformed forever',
    significance: 'Changed the English language, culture, and governance permanently; introduced feudalism to England',
    description: 'On a ridge near Hastings, King Harold\'s exhausted Anglo-Saxon army faced William\'s fresh Norman force. A combination of Norman archery and cavalry, plus a feigned retreat that broke the English shield wall, decided the fate of England.',
    casualties: '~2,000 Norman, ~4,000 English',
    duration: '9 hours',
    commanders: [
      { name: 'William the Conqueror', side: 'Normans' },
      { name: 'Harold II', side: 'Anglo-Saxons' },
    ],
    phases: [
      {
        phase: 1,
        title: 'The Shield Wall',
        description: 'Harold positions his Housecarls and fyrdmen in a dense shield wall along the ridge of Senlac Hill. William deploys archers, infantry, and cavalry in three lines below.',
        year: '14 October — 9:00 AM',
        positions: [
          { id: 'h_wall', label: 'Harold\'s Shield Wall', side: 'defender', latitude: 50.9108, longitude: 0.4886, troops: '7,000-8,000 on Senlac Hill' },
          { id: 'w_arch', label: 'Norman Archers', side: 'attacker', latitude: 50.9075, longitude: 0.4885, troops: 'Front line: crossbowmen & bowmen' },
          { id: 'w_cav', label: 'Norman Cavalry', side: 'attacker', latitude: 50.9065, longitude: 0.4880, troops: 'Knights in reserve' },
        ],
      },
      {
        phase: 2,
        title: 'Norman Assault',
        description: 'Norman archers fail against the shield wall. Infantry assaults are repulsed with heavy losses. The Bretons on the left flank begin to retreat in disorder, drawing reckless English pursuers off the ridge.',
        year: '14 October — 11:00 AM',
        positions: [
          { id: 'w_push', label: 'Norman Infantry Assault', side: 'attacker', latitude: 50.9090, longitude: 0.4884, note: 'Repulsed with casualties' },
          { id: 'e_chase', label: 'English Pursuers (Mistake)', side: 'defender', latitude: 50.9082, longitude: 0.4878, note: 'Abandoned shield wall to chase' },
        ],
        movements: [
          { from: { latitude: 50.9108, longitude: 0.4886 }, to: { latitude: 50.9090, longitude: 0.4880 }, side: 'defender', label: 'Reckless pursuit down the hill' },
        ],
      },
      {
        phase: 3,
        title: 'Feigned Retreat',
        description: 'William orders deliberate feigned retreats to lure more English from the shield wall. Norman cavalry wheels around to cut down the isolated English. The wall begins to thin.',
        year: '14 October — 2:00 PM',
        positions: [
          { id: 'w_feign', label: 'Feigned Norman Retreat', side: 'attacker', latitude: 50.9080, longitude: 0.4882, note: 'Deliberately luring English down' },
          { id: 'w_wheel', label: 'Norman Cavalry Countercharge', side: 'attacker', latitude: 50.9085, longitude: 0.4876, troops: 'Knights cutting off pursuers' },
        ],
        movements: [
          { from: { latitude: 50.9068, longitude: 0.4880 }, to: { latitude: 50.9075, longitude: 0.4878 }, side: 'attacker', label: 'Feigned retreat south' },
          { from: { latitude: 50.9068, longitude: 0.4880 }, to: { latitude: 50.9085, longitude: 0.4876 }, side: 'attacker', label: 'Cavalry wheel to cut off English' },
        ],
      },
      {
        phase: 4,
        title: 'Harold Falls',
        description: 'As the shield wall weakens, Norman archers are ordered to shoot high. An arrow strikes Harold in or near the eye. Norman cavalry break through and Harold is cut down by knights. England falls to William.',
        year: '14 October — 6:00 PM',
        positions: [
          { id: 'h_falls', label: 'Harold\'s Last Stand', side: 'defender', latitude: 50.9112, longitude: 0.4890, note: 'Harold struck by arrow, then killed by knights' },
          { id: 'w_break', label: 'Norman Breakthrough', side: 'attacker', latitude: 50.9110, longitude: 0.4888, note: 'Shield wall finally broken' },
        ],
      },
    ],
  },
  {
    id: 'waterloo',
    name: 'Battle of Waterloo',
    year: 1815,
    yearLabel: '1815 AD',
    latitude: 50.6798,
    longitude: 4.4120,
    emoji: '💥',
    color: '#1D4ED8',
    attacker: 'Napoleon Bonaparte (France)',
    defender: 'Wellington (Britain) & Blücher (Prussia)',
    outcome: 'Allied Victory — Napoleon\'s final defeat',
    significance: 'Ended the Napoleonic Wars and reshaped Europe at the Congress of Vienna for a century',
    description: 'Napoleon\'s last bid to restore French dominance ended on a ridge south of Brussels. Wellington\'s Anglo-Dutch army held grimly until Prussian reinforcements arrived, then a combined assault shattered the Imperial Guard and with it, Napoleon\'s empire.',
    casualties: '40,000 French, 22,000 Allied',
    duration: '2 days',
    commanders: [
      { name: 'Napoleon Bonaparte', side: 'France' },
      { name: 'Duke of Wellington', side: 'Britain' },
      { name: 'Field Marshal Blücher', side: 'Prussia' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Napoleon Delays',
        description: 'Napoleon delays the attack until 11:30 AM to let the ground dry after overnight rain. Wellington uses the time to consolidate his ridge line. The French assault on Hougoumont farm begins the battle.',
        year: 'June 18 — 11:30 AM',
        positions: [
          { id: 'n_line', label: 'French Army', side: 'attacker', latitude: 50.675, longitude: 4.412, troops: '72,000 with 250 guns' },
          { id: 'w_ridge', label: 'Wellington\'s Ridge (Mont-Saint-Jean)', side: 'defender', latitude: 50.682, longitude: 4.410, troops: '68,000 Anglo-Dutch forces' },
          { id: 'houg', label: 'Hougoumont Farm', side: 'defender', latitude: 50.6782, longitude: 4.4008, note: 'Crucial fortified position' },
        ],
      },
      {
        phase: 2,
        title: 'D\'Erlon\'s Great Attack',
        description: 'Count D\'Erlon leads 16,000 infantry up the ridge in massive columns. The French reach the crest but are shattered by British musketry and a devastating cavalry charge by the Scots Greys and Household Brigade.',
        year: 'June 18 — 1:30 PM',
        positions: [
          { id: 'derlon', label: 'D\'Erlon\'s Corps', side: 'attacker', latitude: 50.679, longitude: 4.418, troops: '16,000 in deep columns' },
          { id: 'brit_cav', label: 'British Cavalry Charge', side: 'defender', latitude: 50.681, longitude: 4.417, troops: 'Scots Greys & Household Brigade' },
        ],
        movements: [
          { from: { latitude: 50.675, longitude: 4.418 }, to: { latitude: 50.681, longitude: 4.417 }, side: 'attacker', label: 'D\'Erlon advances up ridge' },
          { from: { latitude: 50.683, longitude: 4.416 }, to: { latitude: 50.677, longitude: 4.418 }, side: 'defender', label: 'British cavalry counter-charge' },
        ],
      },
      {
        phase: 3,
        title: 'Ney\'s Cavalry Charges',
        description: 'Marshal Ney misinterprets British movements as retreat and sends 9,000 cavalry in repeated charges against Wellington\'s infantry squares. The squares hold, but the French exhaust their cavalry reserve uselessly.',
        year: 'June 18 — 4:00 PM',
        positions: [
          { id: 'ney_cav', label: 'Ney\'s Massed Cavalry', side: 'attacker', latitude: 50.678, longitude: 4.413, troops: '9,000 cavalry in charge' },
          { id: 'brit_sq', label: 'British Infantry Squares', side: 'defender', latitude: 50.681, longitude: 4.412, troops: 'Squares bristling with bayonets' },
        ],
        movements: [
          { from: { latitude: 50.676, longitude: 4.412 }, to: { latitude: 50.681, longitude: 4.412 }, side: 'attacker', label: 'Cavalry charges up the slope' },
        ],
      },
      {
        phase: 4,
        title: 'Prussians Arrive — Guard Defeated',
        description: 'Prussian forces begin arriving on Napoleon\'s right flank after 4 PM. Napoleon plays his last card: the Imperial Guard is sent forward. Wellington\'s Guards stand up from behind the ridge crest and deliver a devastating volley. The Guard breaks — the first time in history. The French army collapses in rout.',
        year: 'June 18 — 7:00 PM',
        positions: [
          { id: 'guard', label: 'Imperial Guard Attack', side: 'attacker', latitude: 50.6795, longitude: 4.413, troops: 'Napoleon\'s elite Old Guard' },
          { id: 'w_guard', label: 'British Guards Stand Up', side: 'defender', latitude: 50.682, longitude: 4.413, note: '"Now, Maitland! Now\'s your time!"' },
          { id: 'prussian', label: 'Prussian Flanking Force', side: 'defender', latitude: 50.680, longitude: 4.430, troops: '50,000 Prussians' },
        ],
        movements: [
          { from: { latitude: 50.677, longitude: 4.413 }, to: { latitude: 50.681, longitude: 4.413 }, side: 'attacker', label: 'Guard marches to death' },
          { from: { latitude: 50.675, longitude: 4.430 }, to: { latitude: 50.678, longitude: 4.425 }, side: 'defender', label: 'Prussians press the flank' },
        ],
      },
    ],
  },
  {
    id: 'stalingrad',
    name: 'Battle of Stalingrad',
    year: 1942,
    yearLabel: '1942–1943 AD',
    latitude: 48.7080,
    longitude: 44.5133,
    emoji: '🏙️',
    color: '#B91C1C',
    attacker: 'Soviet Union (Operation Uranus)',
    defender: 'Nazi Germany (6th Army)',
    outcome: 'Soviet Victory — turning point of WWII',
    significance: 'The largest battle in history by casualties; turned the tide of WWII on the Eastern Front',
    description: 'The battle for Stalingrad was a brutal, months-long urban struggle that consumed an entire German army. From house-to-house fighting in the city\'s rubble to a massive Soviet encirclement, Stalingrad shattered German offensive power in the East forever.',
    casualties: '800,000 German & Axis, 1,100,000 Soviet',
    duration: '6 months (August 1942 – February 1943)',
    commanders: [
      { name: 'Gen. Vasily Chuikov', side: 'Soviet 62nd Army' },
      { name: 'Field Marshal Friedrich Paulus', side: 'German 6th Army' },
      { name: 'Gen. Georgy Zhukov', side: 'Soviet (Operation Uranus)' },
    ],
    phases: [
      {
        phase: 1,
        title: 'German Advance to the Volga',
        description: 'Army Group B drives toward the Volga. German bombers reduce Stalingrad to rubble in massive raids. Chuikov\'s 62nd Army is pushed to a narrow strip along the Volga\'s western bank.',
        year: 'August–September 1942',
        positions: [
          { id: 'g_advance', label: 'German 6th Army Advance', side: 'attacker', latitude: 48.740, longitude: 44.470, troops: '300,000 Germans & Axis troops' },
          { id: 's_strip', label: 'Soviet Volga Strip', side: 'defender', latitude: 48.710, longitude: 44.512, troops: 'Chuikov\'s 62nd Army clinging to the bank' },
        ],
        movements: [
          { from: { latitude: 48.750, longitude: 44.440 }, to: { latitude: 48.720, longitude: 44.500 }, side: 'attacker', label: 'German push to the Volga' },
        ],
      },
      {
        phase: 2,
        title: 'The Rattenkrieg (Rat War)',
        description: 'Intense street-by-street, floor-by-floor fighting. Chuikov\'s strategy: hug the Germans so closely their air power becomes useless. Mamayev Kurgan hill changes hands many times. Snipers dominate.',
        year: 'October–November 1942',
        positions: [
          { id: 'mamayev', label: 'Mamayev Kurgan Hill', side: 'neutral', latitude: 48.7425, longitude: 44.5244, note: 'Bloodiest position, changed hands 14 times' },
          { id: 'pavlov', label: 'Pavlov\'s House', side: 'defender', latitude: 48.7060, longitude: 44.5193, note: 'Held by 25 men for 60 days' },
          { id: 'tractor', label: 'Tractor Factory', side: 'attacker', latitude: 48.7650, longitude: 44.5020, note: 'Taken by Germans' },
        ],
      },
      {
        phase: 3,
        title: 'Operation Uranus — The Encirclement',
        description: 'Soviet General Zhukov launches a massive pincer attack targeting the weak Romanian flanks north and south of the city. Within 4 days, 330,000 German and Axis troops are surrounded in the Stalingrad Kessel (cauldron).',
        year: '19–23 November 1942',
        positions: [
          { id: 'n_pincer', label: 'Soviet Northern Pincer', side: 'defender', latitude: 48.870, longitude: 44.350, troops: 'Southwest Front attacking' },
          { id: 's_pincer', label: 'Soviet Southern Pincer', side: 'defender', latitude: 48.540, longitude: 44.500, troops: 'Stalingrad Front attacking' },
          { id: 'kessel', label: 'German Kessel (Pocket)', side: 'attacker', latitude: 48.720, longitude: 44.510, troops: '330,000 trapped men' },
        ],
        movements: [
          { from: { latitude: 48.870, longitude: 44.350 }, to: { latitude: 48.760, longitude: 44.470 }, side: 'defender', label: 'Northern pincer closes in' },
          { from: { latitude: 48.540, longitude: 44.500 }, to: { latitude: 48.660, longitude: 44.490 }, side: 'defender', label: 'Southern pincer closes in' },
        ],
      },
      {
        phase: 4,
        title: 'German Surrender',
        description: 'Hitler forbids breakout. The relief attempt (Operation Winter Storm) is stopped 50km short. By January 1943, the pocket is shrinking. Paulus surrenders on February 2, 1943 — the first German Field Marshal ever to do so. Germany lost an entire army.',
        year: 'January–February 1943',
        positions: [
          { id: 'paulus_hq', label: 'Paulus\'s Headquarters', side: 'attacker', latitude: 48.7080, longitude: 44.5133, note: 'Department Store basement — surrender signed here' },
          { id: 'soviet_ring', label: 'Soviet Ring Tightened', side: 'defender', latitude: 48.715, longitude: 44.500, troops: 'Don Front pressing in' },
        ],
        movements: [
          { from: { latitude: 48.760, longitude: 44.480 }, to: { latitude: 48.720, longitude: 44.500 }, side: 'defender', label: 'Soviet ring closes final' },
        ],
      },
    ],
  },
  {
    id: 'agincourt',
    name: 'Battle of Agincourt',
    year: 1415,
    yearLabel: '1415 AD',
    latitude: 50.4639,
    longitude: 2.1417,
    emoji: '🏹',
    color: '#15803D',
    attacker: 'England (Henry V)',
    defender: 'France',
    outcome: 'English Victory',
    significance: 'Secured English dominance in the Hundred Years\' War; immortalized by Shakespeare\'s Henry V',
    description: 'Outnumbered 5 to 1, Henry V\'s exhausted English army decimated the French nobility with massed longbow fire. French knights in heavy armor charged across a muddy field and were slaughtered before reaching the English lines.',
    casualties: '~6,000 French nobles killed, ~400 English',
    duration: '3 hours',
    commanders: [
      { name: 'Henry V of England', side: 'England' },
      { name: 'Constable Charles d\'Albret', side: 'France' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Standoff',
        description: 'The French, confident in their numbers, wait for the English to tire. Henry positions his archers on the flanks with sharpened stakes. Both sides wait in the narrow field between two woods for three hours.',
        year: 'October 25 — Dawn',
        positions: [
          { id: 'f_mass', label: 'French Army (3 Lines)', side: 'defender', latitude: 50.466, longitude: 2.142, troops: '~20,000-36,000 knights and soldiers' },
          { id: 'e_line', label: 'English Line', side: 'attacker', latitude: 50.462, longitude: 2.141, troops: '~8,000 with 5,000-6,000 longbowmen' },
        ],
      },
      {
        phase: 2,
        title: 'English Advance',
        description: 'Henry orders a slow advance to bring the French within longbow range. The archers plant new stakes and begin firing. The French, stung by arrows, launch their cavalry charge.',
        year: 'October 25 — 11:00 AM',
        positions: [
          { id: 'e_advance', label: 'English Advance', side: 'attacker', latitude: 50.4635, longitude: 2.141, note: 'Moving to longbow range' },
        ],
        movements: [
          { from: { latitude: 50.462, longitude: 2.141 }, to: { latitude: 50.4635, longitude: 2.141 }, side: 'attacker', label: 'Advance to longbow range' },
        ],
      },
      {
        phase: 3,
        title: 'The Longbow Slaughter',
        description: 'French cavalry charge into a storm of arrows. Horses fall in the mud, trapping knights beneath them. The main French infantry advance into the narrow field, packed so tightly they cannot raise their weapons. Thousands of arrows pour down.',
        year: 'October 25 — 11:30 AM',
        positions: [
          { id: 'f_cav', label: 'French Cavalry Charge', side: 'defender', latitude: 50.4645, longitude: 2.141, note: 'Horses falling in mud' },
          { id: 'e_arch', label: 'English Longbow Fire', side: 'attacker', latitude: 50.4625, longitude: 2.140, troops: '5,000 archers firing 12/min' },
        ],
        movements: [
          { from: { latitude: 50.466, longitude: 2.141 }, to: { latitude: 50.4635, longitude: 2.141 }, side: 'defender', label: 'French advance into arrow storm' },
        ],
      },
      {
        phase: 4,
        title: 'English Victory',
        description: 'The French vanguard, exhausted from wading through mud in heavy armor, is dispatched by English men-at-arms and even archers with mallets. Henry orders his prisoners killed when a rumored French counterattack threatens his rear. The flower of French nobility lies dead.',
        year: 'October 25 — Midday',
        positions: [
          { id: 'f_dead', label: 'French Dead & Surrendered', side: 'defender', latitude: 50.464, longitude: 2.141, note: 'Thousands of noble prisoners executed' },
          { id: 'e_victors', label: 'English Hold the Field', side: 'attacker', latitude: 50.462, longitude: 2.141, note: 'Losses of under 500' },
        ],
      },
    ],
  },
  {
    id: 'thermopylae',
    name: 'Battle of Thermopylae',
    year: -480,
    yearLabel: '480 BC',
    latitude: 38.7953,
    longitude: 22.5389,
    emoji: '⚔️',
    color: '#DC2626',
    attacker: 'Persian Empire (Xerxes I)',
    defender: 'Greek City-States (Leonidas I of Sparta)',
    outcome: 'Persian tactical victory — Greek moral and strategic triumph',
    significance: 'Bought time for the Greek fleet at Salamis; became the eternal symbol of courage against overwhelming odds',
    description: 'King Leonidas and 300 Spartans, alongside roughly 7,000 other Greeks, held the narrow coastal pass of Thermopylae for three days against Xerxes\'s vast Persian army estimated at over 100,000 men. Betrayed by a local Greek named Ephialtes who revealed a mountain path around the pass, Leonidas dismissed most of the allied forces and fought to the last man, creating one of history\'s most celebrated last stands.',
    casualties: '~20,000 Persian, ~4,000 Greek (including all 300 Spartans)',
    duration: '3 days',
    commanders: [
      { name: 'Leonidas I', side: 'Sparta' },
      { name: 'Xerxes I', side: 'Persia' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Greek Defensive Position at the Hot Gates',
        description: 'Leonidas and the Greek allies occupy the narrowest point of the pass at Thermopylae, where the mountains meet the sea, rendering Persian numerical superiority useless. The Greeks rebuild an ancient Phocian wall across the pass and prepare their phalanx for close-quarters combat.',
        year: 'Day 1 — Dawn',
        positions: [
          { id: 'g_wall', label: 'Greek Phalanx at the Wall', side: 'defender', latitude: 38.7953, longitude: 22.5389, troops: '300 Spartans + ~7,000 Greek allies' },
          { id: 'p_mass', label: 'Persian Army Massing', side: 'attacker', latitude: 38.8010, longitude: 22.5450, troops: '100,000+ infantry and cavalry' },
        ],
      },
      {
        phase: 2,
        title: 'Persian Waves Repulsed for Two Days',
        description: 'Xerxes sends wave after wave of his best troops, including the elite Immortals, against the Greek position. The Spartan phalanx with its long spears and disciplined rotation of exhausted fighters devastates the attackers in the narrow pass. Persian losses mount catastrophically while Greek casualties remain light.',
        year: 'Day 1–2',
        positions: [
          { id: 'p_assault', label: 'Persian Assault Waves', side: 'attacker', latitude: 38.7980, longitude: 22.5410, troops: 'Medes, Immortals — repulsed repeatedly' },
          { id: 'g_hold', label: 'Greek Phalanx Holding', side: 'defender', latitude: 38.7953, longitude: 22.5389, note: 'Rotating fighters to maintain fresh front ranks' },
        ],
        movements: [
          { from: { latitude: 38.8010, longitude: 22.5450 }, to: { latitude: 38.7970, longitude: 22.5410 }, side: 'attacker', label: 'Persian waves charge the pass' },
          { from: { latitude: 38.7970, longitude: 22.5410 }, to: { latitude: 38.8000, longitude: 22.5440 }, side: 'attacker', label: 'Persians driven back in disorder' },
        ],
      },
      {
        phase: 3,
        title: 'Ephialtes Betrayal — Persian Flanking',
        description: 'A local Greek named Ephialtes reveals the Anopaea mountain path that loops around the Greek position to Xerxes. Persian Immortals march through the night and appear at dawn behind the Greek rear guard of 1,000 Phocians, who are scattered. Leonidas, informed of the encirclement, dismisses most of the allied contingents to save them.',
        year: 'Night of Day 2 / Dawn of Day 3',
        positions: [
          { id: 'p_flank', label: 'Persian Immortals on Mountain Path', side: 'attacker', latitude: 38.8100, longitude: 22.5200, troops: '10,000 Immortals flanking overnight' },
          { id: 'phocian', label: 'Phocian Rear Guard Scattered', side: 'defender', latitude: 38.8050, longitude: 22.5300, note: 'Phocians overwhelmed at dawn' },
          { id: 'g_dismiss', label: 'Greek Allies Dismissed', side: 'defender', latitude: 38.7953, longitude: 22.5389, note: 'Leonidas orders allies to retreat' },
        ],
        movements: [
          { from: { latitude: 38.8150, longitude: 22.5100 }, to: { latitude: 38.8050, longitude: 22.5300 }, side: 'attacker', label: 'Night march around Greek position' },
        ],
      },
      {
        phase: 4,
        title: 'Leonidas\'s Last Stand with 300 Spartans',
        description: 'Leonidas remains with his 300 Spartans, 700 Thespians who refused to leave, and 400 Thebans. They advance beyond the wall to a small hill and fight until overwhelmed by Persian arrows and numbers. Leonidas is killed in the melee. The Spartans fight on around his body until the last man falls, buying Athens weeks to prepare its naval defense at Salamis.',
        year: 'Day 3 — Final Hour',
        positions: [
          { id: 'g_last', label: '300 Spartans — Final Position', side: 'defender', latitude: 38.7940, longitude: 22.5375, troops: '300 Spartans + 700 Thespians' },
          { id: 'leonidas', label: 'Leonidas Falls', side: 'defender', latitude: 38.7945, longitude: 22.5380, note: 'Killed in the forward melee' },
          { id: 'p_surround', label: 'Persian Encirclement', side: 'attacker', latitude: 38.7953, longitude: 22.5395, troops: 'Persians attacking from front and rear' },
        ],
        movements: [
          { from: { latitude: 38.7953, longitude: 22.5389 }, to: { latitude: 38.7940, longitude: 22.5375 }, side: 'defender', label: 'Spartans advance to die fighting' },
          { from: { latitude: 38.8040, longitude: 22.5350 }, to: { latitude: 38.7945, longitude: 22.5380 }, side: 'attacker', label: 'Persian encirclement from the rear' },
        ],
      },
    ],
  },
  {
    id: 'gettysburg',
    name: 'Battle of Gettysburg',
    year: 1863,
    yearLabel: '1863 AD',
    latitude: 39.8118,
    longitude: -77.2252,
    emoji: '🏳️',
    color: '#1D4ED8',
    attacker: 'Confederate States of America (Gen. Robert E. Lee)',
    defender: 'Union Army of the Potomac (Gen. George Meade)',
    outcome: 'Union Victory — turning point of the American Civil War',
    significance: 'Ended Confederate General Lee\'s second and final invasion of the North; coupled with Vicksburg, it shifted momentum decisively to the Union',
    description: 'The three-day battle at Gettysburg, Pennsylvania in July 1863 was the bloodiest engagement of the American Civil War and the decisive defeat of Robert E. Lee\'s Army of Northern Virginia. The Confederate failure to dislodge Union forces from the high ground, culminating in the catastrophic Pickett\'s Charge, shattered the offensive power of the South.',
    casualties: '~28,000 Confederate, ~23,000 Union',
    duration: '3 days (July 1–3, 1863)',
    commanders: [
      { name: 'Gen. Robert E. Lee', side: 'Confederacy' },
      { name: 'Gen. George G. Meade', side: 'Union' },
      { name: 'Gen. John Buford', side: 'Union' },
    ],
    phases: [
      {
        phase: 1,
        title: 'First Day — Confederate Advantage, Union Retreat to Cemetery Ridge',
        description: 'Confederate forces advancing on Gettysburg encounter Union cavalry under General Buford, who delays them long enough for Union infantry to arrive. By afternoon, Confederate II Corps flanks the Union line north of town, routing two Union corps through the streets of Gettysburg. The beaten Union forces rally on the commanding high ground of Cemetery Hill and Cemetery Ridge south of town.',
        year: 'July 1 — Dawn to Evening',
        positions: [
          { id: 'c_advance', label: 'Confederate Advance from North & West', side: 'attacker', latitude: 39.8350, longitude: -77.2310, troops: 'Heth\'s & Rodes\'s Divisions' },
          { id: 'u_buford', label: 'Buford\'s Cavalry Delay', side: 'defender', latitude: 39.8300, longitude: -77.2380, troops: '2,500 cavalry fighting dismounted' },
          { id: 'u_ridge', label: 'Union Rally on Cemetery Ridge', side: 'defender', latitude: 39.8118, longitude: -77.2252, note: 'High ground secured for the battle' },
        ],
        movements: [
          { from: { latitude: 39.8350, longitude: -77.2310 }, to: { latitude: 39.8200, longitude: -77.2300 }, side: 'attacker', label: 'Confederate push through Gettysburg' },
          { from: { latitude: 39.8250, longitude: -77.2290 }, to: { latitude: 39.8118, longitude: -77.2252 }, side: 'defender', label: 'Union retreat to Cemetery Ridge' },
        ],
      },
      {
        phase: 2,
        title: 'Second Day — Little Round Top and Devil\'s Den',
        description: 'Lee orders attacks on both Union flanks. On the south, Confederate General Hood\'s division storms through Devil\'s Den and up Little Round Top, the key to the entire Union left flank. In a desperate fight, Colonel Joshua Chamberlain\'s 20th Maine fixes bayonets and charges downhill, saving the hill and possibly the battle.',
        year: 'July 2 — Afternoon',
        positions: [
          { id: 'lrt', label: 'Little Round Top', side: 'defender', latitude: 39.7927, longitude: -77.2397, note: 'Key to Union left flank — barely held' },
          { id: 'devils_den', label: 'Devil\'s Den', side: 'attacker', latitude: 39.7940, longitude: -77.2435, note: 'Confederate sharpshooter position' },
          { id: 'c_attack_s', label: 'Confederate Attack on Union Left', side: 'attacker', latitude: 39.7980, longitude: -77.2450, troops: 'Hood\'s & McLaws\'s Divisions' },
          { id: 'c_attack_n', label: 'Confederate Attack on Culp\'s Hill', side: 'attacker', latitude: 39.8200, longitude: -77.2130, troops: 'Johnson\'s Division' },
        ],
        movements: [
          { from: { latitude: 39.7980, longitude: -77.2450 }, to: { latitude: 39.7927, longitude: -77.2397 }, side: 'attacker', label: 'Confederate assault on Little Round Top' },
        ],
      },
      {
        phase: 3,
        title: 'Pickett\'s Charge — Confederate Assault on Union Center',
        description: 'After a two-hour Confederate artillery bombardment that largely overshoots the Union lines, Lee orders 12,500 Confederate troops under General Pickett, Pettigrew, and Trimble to march in formation across nearly a mile of open ground against the Union center on Cemetery Ridge. The assault is met with devastating artillery and rifle fire.',
        year: 'July 3 — 3:00 PM',
        positions: [
          { id: 'c_line', label: 'Confederate Start Line (Seminary Ridge)', side: 'attacker', latitude: 39.8118, longitude: -77.2450, troops: '12,500 infantry in parade formation' },
          { id: 'u_center', label: 'Union Center — "The Angle"', side: 'defender', latitude: 39.8118, longitude: -77.2252, troops: 'Union II Corps with artillery' },
          { id: 'c_breach', label: 'Temporary Confederate Breach ("High Water Mark")', side: 'attacker', latitude: 39.8118, longitude: -77.2270, note: 'Confederate breakthrough quickly sealed' },
        ],
        movements: [
          { from: { latitude: 39.8118, longitude: -77.2450 }, to: { latitude: 39.8118, longitude: -77.2270 }, side: 'attacker', label: 'Pickett\'s Charge across open ground' },
        ],
      },
      {
        phase: 4,
        title: 'Confederate Repulse — Turning Point of the Civil War',
        description: 'Pickett\'s Charge is destroyed — over half the attacking force is killed, wounded, or captured. Lee rides among the broken survivors saying "It is all my fault." He withdraws his army back across the Potomac into Virginia, never to launch a major offensive into the North again. Lincoln delivers the Gettysburg Address at the dedication of the cemetery four months later.',
        year: 'July 3 — Evening',
        positions: [
          { id: 'c_rout', label: 'Confederate Survivors Retreating', side: 'attacker', latitude: 39.8118, longitude: -77.2380, note: 'More than 50% casualties in the charge' },
          { id: 'u_holds', label: 'Union Line Holds — Victory Secured', side: 'defender', latitude: 39.8118, longitude: -77.2252, note: 'Lee retreats to Virginia' },
        ],
        movements: [
          { from: { latitude: 39.8118, longitude: -77.2270 }, to: { latitude: 39.8118, longitude: -77.2450 }, side: 'attacker', label: 'Confederate retreat to Seminary Ridge' },
        ],
      },
    ],
  },
  {
    id: 'dday-normandy',
    name: 'D-Day: Battle of Normandy',
    year: 1944,
    yearLabel: '1944 AD',
    latitude: 49.3718,
    longitude: -0.9084,
    emoji: '🚢',
    color: '#1D4ED8',
    attacker: 'Allied Forces (Eisenhower)',
    defender: 'Nazi Germany (Rommel / von Rundstedt)',
    outcome: 'Allied Victory — foothold in France secured',
    significance: 'Opened the long-awaited second front in Western Europe, leading to the liberation of France and the defeat of Nazi Germany',
    description: 'Operation Overlord on June 6, 1944 was the largest seaborne invasion in history, landing over 156,000 Allied troops on five Normandy beaches in a single day. Despite catastrophic losses at Omaha Beach, the Allies secured their beachheads and within weeks poured enough men and material into France to make the liberation of Western Europe unstoppable.',
    casualties: '~10,000–12,000 Allied killed/wounded on D-Day alone; ~425,000 total in the Normandy Campaign',
    duration: 'Weeks (June–August 1944)',
    commanders: [
      { name: 'Gen. Dwight D. Eisenhower', side: 'Supreme Allied Commander' },
      { name: 'Field Marshal Erwin Rommel', side: 'German Army Group B' },
      { name: 'Gen. Omar Bradley', side: 'US First Army' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Naval Bombardment and Paratrooper Drops (Night, June 5)',
        description: 'In the darkness before the landings, 13,000 US paratroopers of the 82nd and 101st Airborne Divisions drop behind Utah Beach to secure causeways and prevent German reinforcement. British 6th Airborne seizes Pegasus Bridge east of the beaches. The Allied naval armada of 6,939 vessels takes up position offshore as 1,200 bombers pound German defenses.',
        year: 'June 5–6 — Midnight to 6:00 AM',
        positions: [
          { id: 'para_us', label: 'US Paratroopers (82nd & 101st Airborne)', side: 'attacker', latitude: 49.4000, longitude: -1.2500, troops: '13,000 paratroopers behind Utah Beach' },
          { id: 'para_br', label: 'British 6th Airborne — Pegasus Bridge', side: 'attacker', latitude: 49.2440, longitude: -0.2750, troops: '8,500 paratroopers east of Sword Beach' },
          { id: 'fleet', label: 'Allied Fleet (6,939 vessels)', side: 'attacker', latitude: 49.5000, longitude: -0.9000, note: 'Largest invasion fleet in history' },
        ],
      },
      {
        phase: 2,
        title: 'Beach Landings at Dawn (Omaha, Utah, Gold, Juno, Sword)',
        description: 'At 6:30 AM, Allied troops hit five beaches simultaneously along a 50-mile stretch of the Normandy coast. American forces land at Utah and Omaha, British at Gold and Sword, Canadians at Juno. Utah Beach is taken with surprisingly light casualties while Gold, Juno, and Sword face stiff but manageable resistance.',
        year: 'June 6 — 6:30 AM',
        positions: [
          { id: 'utah', label: 'Utah Beach (US 4th Division)', side: 'attacker', latitude: 49.4080, longitude: -1.1675, troops: '~23,000 troops — light casualties' },
          { id: 'omaha', label: 'Omaha Beach (US 1st & 29th Divisions)', side: 'attacker', latitude: 49.3718, longitude: -0.9084, troops: '~34,000 troops — catastrophic casualties' },
          { id: 'gold', label: 'Gold Beach (British 50th Division)', side: 'attacker', latitude: 49.3410, longitude: -0.5520, troops: '~25,000 troops' },
          { id: 'juno', label: 'Juno Beach (Canadian 3rd Division)', side: 'attacker', latitude: 49.3330, longitude: -0.3860, troops: '~21,400 troops' },
          { id: 'sword', label: 'Sword Beach (British 3rd Division)', side: 'attacker', latitude: 49.2970, longitude: -0.2960, troops: '~29,000 troops' },
        ],
      },
      {
        phase: 3,
        title: 'Omaha Beach — Heaviest Fighting, Near Failure',
        description: 'At Omaha Beach, landing craft are hit by strong currents, DD tanks sink in the choppy sea, and preliminary bombing entirely misses the German defenses. Troops of the US 1st and 29th Divisions are cut down on the exposed beach by the well-entrenched German 352nd Infantry Division. For hours the outcome hangs in the balance before small groups of soldiers fight their way up the bluffs.',
        year: 'June 6 — 6:30 AM to Noon',
        positions: [
          { id: 'omaha_bluffs', label: 'German 352nd Division on the Bluffs', side: 'defender', latitude: 49.3750, longitude: -0.9100, troops: '~8,000 German defenders in bunkers' },
          { id: 'omaha_beach', label: 'US Infantry Pinned on Beach', side: 'attacker', latitude: 49.3718, longitude: -0.9084, note: 'Men sheltering behind obstacles under fire' },
          { id: 'dog_green', label: 'Dog Green — Worst Carnage', side: 'attacker', latitude: 49.3700, longitude: -0.9300, note: 'A Company, 116th Infantry nearly wiped out' },
        ],
        movements: [
          { from: { latitude: 49.3718, longitude: -0.9084 }, to: { latitude: 49.3740, longitude: -0.9090 }, side: 'attacker', label: 'Small groups fight up the bluffs' },
        ],
      },
      {
        phase: 4,
        title: 'Beachheads Secured — Liberation of Europe Begins',
        description: 'By nightfall on June 6, all five beachheads are secured, though Omaha\'s perimeter is barely 1–2 miles deep. In the weeks that follow, the Allies build artificial Mulberry harbours and pour in reinforcements. The breakout from Normandy in late July leads to the liberation of Paris in August 1944 and the liberation of Western Europe by May 1945.',
        year: 'June 6 — Nightfall and Beyond',
        positions: [
          { id: 'beachhead', label: 'Allied Beachhead Consolidated', side: 'attacker', latitude: 49.3718, longitude: -0.9084, note: '156,000 troops ashore by end of D-Day' },
          { id: 'mulberry', label: 'Mulberry Harbour (Arromanches)', side: 'attacker', latitude: 49.3410, longitude: -0.6200, note: 'Artificial harbour floated in from England' },
          { id: 'g_reserve', label: 'German Panzers Held Back', side: 'defender', latitude: 49.1800, longitude: -0.3500, note: 'Hitler withholds reserves — decisive mistake' },
        ],
        movements: [
          { from: { latitude: 49.3718, longitude: -0.9084 }, to: { latitude: 49.2000, longitude: -0.6000 }, side: 'attacker', label: 'Allied advance inland toward Caen' },
        ],
      },
    ],
  },
  {
    id: 'midway',
    name: 'Battle of Midway',
    year: 1942,
    yearLabel: '1942 AD',
    latitude: 28.2072,
    longitude: -177.3735,
    emoji: '🛩️',
    color: '#2563EB',
    attacker: 'United States Navy (Adm. Chester Nimitz)',
    defender: 'Imperial Japanese Navy (Adm. Isoroku Yamamoto)',
    outcome: 'American Victory — Japan loses 4 fleet carriers',
    significance: 'Turned the tide of the Pacific War; Japan never recovered its offensive carrier capability after Midway',
    description: 'The Battle of Midway, fought June 4–7, 1942, was the most decisive naval battle of the Pacific War. American codebreakers learned of the Japanese attack in advance, allowing Nimitz to position his three carriers in ambush. In a matter of minutes, US dive bombers sank three Japanese carriers, and a fourth was destroyed hours later.',
    casualties: '~3,057 Japanese, 307 American killed; Japan lost 4 carriers and 248 aircraft, US lost 1 carrier and 98 aircraft',
    duration: '4 days (June 4–7, 1942)',
    commanders: [
      { name: 'Adm. Chester Nimitz', side: 'USA (overall)' },
      { name: 'Rear Adm. Frank Fletcher', side: 'USA (carriers)' },
      { name: 'Adm. Isoroku Yamamoto', side: 'Japan' },
      { name: 'Vice Adm. Chuichi Nagumo', side: 'Japan (carrier force)' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Japanese Strike on Midway — US Fleet Discovered',
        description: 'Nagumo launches 108 aircraft against Midway Atoll at dawn on June 4. A second strike is deemed necessary, so Nagumo orders his reserve bombers re-armed with general-purpose bombs instead of torpedoes. At this critical moment, a Japanese scout plane reports finding American warships — including a carrier — forcing Nagumo to reverse the re-arming order again.',
        year: 'June 4 — 4:30 AM to 8:00 AM',
        positions: [
          { id: 'jp_carrier', label: 'Japanese Carrier Force (Kido Butai)', side: 'attacker', latitude: 30.5000, longitude: -178.5000, troops: '4 fleet carriers: Akagi, Kaga, Soryu, Hiryu' },
          { id: 'midway', label: 'Midway Atoll', side: 'defender', latitude: 28.2072, longitude: -177.3735, note: 'Land-based aircraft and garrison' },
          { id: 'us_carrier', label: 'US Carrier Task Force (Enterprise, Hornet, Yorktown)', side: 'defender', latitude: 32.0000, longitude: -174.0000, note: 'Positioned in ambush NE of Midway' },
        ],
        movements: [
          { from: { latitude: 30.5000, longitude: -178.5000 }, to: { latitude: 28.2072, longitude: -177.3735 }, side: 'attacker', label: 'Japanese first strike on Midway' },
        ],
      },
      {
        phase: 2,
        title: 'US Torpedo Bomber Attacks — Heavy American Losses',
        description: 'Three US torpedo bomber squadrons attack the Japanese carriers without fighter escort. VT-8 from Hornet is completely destroyed — all 15 planes shot down with only one survivor. VT-6 and VT-3 suffer similar near-annihilation. Not a single torpedo hits a Japanese ship. Yet their sacrifice draws Japanese Zero fighters down to sea level, leaving the carriers unprotected above.',
        year: 'June 4 — 9:20 AM to 10:24 AM',
        positions: [
          { id: 'vt8', label: 'VT-8 (Hornet) — All 15 Planes Lost', side: 'defender', latitude: 30.5500, longitude: -178.6000, note: 'Ens. George Gay — sole survivor' },
          { id: 'jp_zeros', label: 'Japanese Zero CAP Drawn to Sea Level', side: 'attacker', latitude: 30.5000, longitude: -178.5000, note: 'Zeros exhausted chasing torpedo planes' },
        ],
        movements: [
          { from: { latitude: 32.0000, longitude: -174.0000 }, to: { latitude: 30.5000, longitude: -178.5000 }, side: 'defender', label: 'US torpedo bombers attack at wave-top height' },
        ],
      },
      {
        phase: 3,
        title: 'SBD Dauntless Dive Bombers Destroy 3 Japanese Carriers in 6 Minutes',
        description: 'Lieutenant Commander Wade McClusky\'s SBD Dauntless dive bombers from Enterprise, and Max Leslie\'s from Yorktown, arrive over the Japanese fleet to find the carriers with decks crammed with re-arming aircraft, fuel lines exposed, and Zero fighters at low altitude. In a six-minute attack starting at 10:22 AM, three carriers — Akagi, Kaga, and Soryu — are set ablaze and fatally damaged.',
        year: 'June 4 — 10:22 AM to 10:28 AM',
        positions: [
          { id: 'akagi', label: 'Akagi — Struck and Burning', side: 'attacker', latitude: 30.5100, longitude: -178.5200, note: 'Hit by 3 bombs — Nagumo\'s flagship' },
          { id: 'kaga', label: 'Kaga — Struck and Burning', side: 'attacker', latitude: 30.5000, longitude: -178.5000, note: 'Hit by 4 bombs — largest carrier' },
          { id: 'soryu', label: 'Soryu — Struck and Burning', side: 'attacker', latitude: 30.4900, longitude: -178.4800, note: 'Hit by 3 bombs — sinks in 20 minutes' },
          { id: 'mcclusky', label: 'McClusky\'s Dauntlesses Diving', side: 'defender', latitude: 30.5050, longitude: -178.5100, troops: 'SBDs diving at 70-degree angle' },
        ],
        movements: [
          { from: { latitude: 32.2000, longitude: -175.0000 }, to: { latitude: 30.5000, longitude: -178.5000 }, side: 'defender', label: 'Dauntlesses arrive from high altitude' },
        ],
      },
      {
        phase: 4,
        title: 'Hiryu Sunk — Japan Loses 4 Carriers, Turning Point in Pacific',
        description: 'The sole surviving Japanese carrier Hiryu launches two strike waves that badly damage and ultimately sink USS Yorktown. But American dive bombers find and strike Hiryu late in the afternoon, leaving Japan with no operational fleet carriers. Yamamoto calls off the Midway operation and turns his fleet for home. Japan lost 4 irreplaceable fleet carriers, 248 aircraft, and 3,057 men, including many of its best naval aviators — losses it could never fully replace.',
        year: 'June 4 — 5:00 PM',
        positions: [
          { id: 'hiryu', label: 'Hiryu Struck by US Dive Bombers', side: 'attacker', latitude: 30.6000, longitude: -178.8000, note: 'Last Japanese carrier — hit by 4 bombs' },
          { id: 'yorktown', label: 'USS Yorktown Sinking', side: 'defender', latitude: 30.2000, longitude: -176.5000, note: 'Struck by Hiryu\'s aircraft; sinks June 7' },
          { id: 'jp_retreat', label: 'Japanese Fleet Retreating', side: 'attacker', latitude: 32.0000, longitude: -178.0000, note: 'Yamamoto cancels operation and withdraws' },
        ],
        movements: [
          { from: { latitude: 30.6000, longitude: -178.8000 }, to: { latitude: 34.0000, longitude: 175.0000 }, side: 'attacker', label: 'Japanese fleet retreats westward' },
        ],
      },
    ],
  },
  {
    id: 'trafalgar',
    name: 'Battle of Trafalgar',
    year: 1805,
    yearLabel: '1805 AD',
    latitude: 36.1600,
    longitude: -6.0200,
    emoji: '⚓',
    color: '#7C3AED',
    attacker: 'Royal Navy (Vice-Admiral Horatio Nelson)',
    defender: 'Combined Franco-Spanish Fleet (Admiral Villeneuve)',
    outcome: 'British Total Victory — Nelson killed at the moment of triumph',
    significance: 'Secured British naval supremacy for a century and shattered Napoleon\'s hope of invading England',
    description: 'At Cape Trafalgar off the Spanish coast on October 21, 1805, Admiral Nelson led 27 British warships in two columns directly into the line of 33 Franco-Spanish ships, breaking it in two places and capturing or destroying 22 enemy vessels without losing a single British ship. Nelson was mortally wounded by a French sharpshooter at the height of the battle and died knowing he had achieved complete victory.',
    casualties: '~458 British killed, ~4,400 Franco-Spanish killed, 20,000 captured',
    duration: '1 day (October 21, 1805)',
    commanders: [
      { name: 'Vice-Admiral Horatio Nelson', side: 'Britain (killed in action)' },
      { name: 'Admiral Pierre-Charles Villeneuve', side: 'France/Spain' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Nelson\'s Two-Column Approach Cuts Franco-Spanish Line',
        description: 'Nelson divides his fleet into two columns and sails them directly at right angles into the enemy line, a tactic that exposes his leading ships to raking broadsides but guarantees a close-range melee once contact is made. Nelson leads the weather column in HMS Victory; Admiral Collingwood leads the lee column in HMS Royal Sovereign. The enemy line is cut in two places simultaneously.',
        year: 'October 21 — 11:45 AM',
        positions: [
          { id: 'franco_line', label: 'Franco-Spanish Line (33 ships)', side: 'defender', latitude: 36.1600, longitude: -6.0300, troops: '33 ships of the line in a curved formation' },
          { id: 'nelson_col', label: 'Nelson\'s Weather Column (HMS Victory)', side: 'attacker', latitude: 36.2000, longitude: -5.9500, troops: '12 ships heading for the enemy center' },
          { id: 'collingwood', label: 'Collingwood\'s Lee Column (HMS Royal Sovereign)', side: 'attacker', latitude: 36.1200, longitude: -5.9600, troops: '15 ships heading for enemy rear' },
        ],
        movements: [
          { from: { latitude: 36.2000, longitude: -5.9500 }, to: { latitude: 36.1650, longitude: -6.0200 }, side: 'attacker', label: 'Nelson\'s column cuts the enemy line' },
          { from: { latitude: 36.1200, longitude: -5.9600 }, to: { latitude: 36.1350, longitude: -6.0100 }, side: 'attacker', label: 'Collingwood\'s column cuts the rear' },
        ],
      },
      {
        phase: 2,
        title: 'HMS Victory Engages Bucentaure at Close Range',
        description: 'HMS Victory crashes through the Franco-Spanish line astern of Villeneuve\'s flagship Bucentaure and delivers a devastating raking broadside through her stern windows that kills or wounds 400 men with a single discharge. Victory then locks in close combat with Redoutable, whose crew prepares to board.',
        year: 'October 21 — 12:15 PM',
        positions: [
          { id: 'victory', label: 'HMS Victory (Nelson)', side: 'attacker', latitude: 36.1620, longitude: -6.0250, note: 'Flagship crashes through the enemy line' },
          { id: 'bucentaure', label: 'Bucentaure (Villeneuve\'s flagship)', side: 'defender', latitude: 36.1640, longitude: -6.0280, note: 'Devastated by raking broadside' },
          { id: 'redoutable', label: 'Redoutable — Locked with Victory', side: 'defender', latitude: 36.1610, longitude: -6.0240, note: 'French crew prepares to board' },
        ],
        movements: [
          { from: { latitude: 36.1650, longitude: -6.0200 }, to: { latitude: 36.1630, longitude: -6.0260 }, side: 'attacker', label: 'Victory breaks through the line' },
        ],
      },
      {
        phase: 3,
        title: 'Nelson Shot by a French Sniper',
        description: 'A French musketeer in the mizzentop of Redoutable fires at a range of about 15 metres and strikes Nelson on the left shoulder, driving a musket ball through his spine. Nelson is carried below deck, knowing the wound is mortal. The battle rages above him for three more hours as he lies dying in the cockpit of Victory.',
        year: 'October 21 — 1:25 PM',
        positions: [
          { id: 'nelson_shot', label: 'Nelson Falls on Victory\'s Quarterdeck', side: 'attacker', latitude: 36.1620, longitude: -6.0250, note: '"They have done for me at last, Hardy."' },
          { id: 'sniper', label: 'French Sniper in Redoutable\'s Mizzentop', side: 'defender', latitude: 36.1615, longitude: -6.0245, note: 'Sergeant Robert Guillemard — fatal shot at 15m' },
        ],
      },
      {
        phase: 4,
        title: 'British Total Victory — Napoleon\'s Naval Power Broken',
        description: 'The battle ends in total British victory — 22 Franco-Spanish ships are captured or destroyed, none escape undamaged. Not a single British ship is lost. Villeneuve is captured. Nelson dies at 4:30 PM, told that victory is complete. Napoleon abandons all plans to invade England and turns east, leading to Austerlitz. Britain rules the seas unchallenged for the next century.',
        year: 'October 21 — 4:30 PM',
        positions: [
          { id: 'nelson_dies', label: 'Nelson Dies Aboard Victory', side: 'attacker', latitude: 36.1620, longitude: -6.0250, note: '"Thank God I have done my duty." — Last words' },
          { id: 'captured', label: '22 Enemy Ships Captured or Sunk', side: 'defender', latitude: 36.1500, longitude: -6.0100, note: 'Greatest naval victory in history' },
          { id: 'survivors', label: 'Franco-Spanish Survivors Fleeing to Cadiz', side: 'defender', latitude: 36.5300, longitude: -6.2900, note: '11 ships escape but never fight again' },
        ],
        movements: [
          { from: { latitude: 36.1600, longitude: -6.0200 }, to: { latitude: 36.5300, longitude: -6.2900 }, side: 'defender', label: 'Surviving Franco-Spanish ships flee to Cadiz' },
        ],
      },
    ],
  },
  {
    id: 'kursk',
    name: 'Battle of Kursk',
    year: 1943,
    yearLabel: '1943 AD',
    latitude: 51.7373,
    longitude: 36.1873,
    emoji: '🔥',
    color: '#DC2626',
    attacker: 'Nazi Germany — Operation Citadel (Field Marshal von Manstein)',
    defender: 'Soviet Union (Gen. Georgy Zhukov)',
    outcome: 'Soviet Victory — Germany never regains strategic initiative on Eastern Front',
    significance: 'The largest tank battle in history; after Kursk, Germany was permanently on the defensive in the East',
    description: 'In July 1943, Germany launched Operation Citadel to pinch off the Kursk salient with massive armored forces from north and south. Soviet intelligence knew the attack was coming and prepared the most elaborate defensive system in military history. The German assault shattered itself against these defenses, and the subsequent Soviet counteroffensives drove Germany back for the rest of the war.',
    casualties: '~200,000 German, ~860,000 Soviet (killed, wounded, captured)',
    duration: '2 weeks (July 5–23, 1943)',
    commanders: [
      { name: 'Field Marshal Erich von Manstein', side: 'Germany (south)' },
      { name: 'Field Marshal Günther von Kluge', side: 'Germany (north)' },
      { name: 'Gen. Georgy Zhukov', side: 'Soviet Union' },
      { name: 'Gen. Konstantin Rokossovsky', side: 'Soviet Central Front' },
    ],
    phases: [
      {
        phase: 1,
        title: 'German Operation Citadel — Massive Armored Assault from North and South',
        description: 'After months of delays while new Tiger and Panther tanks are rushed to the front, Germany launches Operation Citadel on July 5, 1943 with 780,000 men and nearly 3,000 tanks. Army Group Center attacks from the north under Kluge while Army Group South under Manstein drives from the south, intending to meet behind Kursk and destroy the Soviet forces in the salient.',
        year: 'July 5 — Dawn',
        positions: [
          { id: 'g_north', label: 'German 9th Army (North Pincer)', side: 'attacker', latitude: 52.6000, longitude: 36.1000, troops: '335,000 men, 1,200 tanks — Model\'s group' },
          { id: 'g_south', label: 'German 4th Panzer Army (South Pincer)', side: 'attacker', latitude: 50.8500, longitude: 36.2000, troops: '350,000 men, 1,500 tanks — Manstein\'s group' },
          { id: 'kursk_bulge', label: 'Kursk Salient (Soviet positions)', side: 'defender', latitude: 51.7373, longitude: 36.1873, troops: '1,300,000 Soviet troops in 8 defensive belts' },
        ],
        movements: [
          { from: { latitude: 52.6000, longitude: 36.1000 }, to: { latitude: 52.2000, longitude: 36.1500 }, side: 'attacker', label: 'Northern pincer drives south' },
          { from: { latitude: 50.8500, longitude: 36.2000 }, to: { latitude: 51.3000, longitude: 36.2000 }, side: 'attacker', label: 'Southern pincer drives north' },
        ],
      },
      {
        phase: 2,
        title: 'Soviet Defense Holds — Minefields and Anti-Tank Guns Devastate Panzers',
        description: 'Zhukov has prepared eight successive defensive belts stretching 300 kilometres deep, with the highest concentration of mines and anti-tank guns ever assembled. The Germans, expecting to achieve their objectives in days, find every advance costing enormous losses. The northern attack stalls after gaining only 12 kilometres — half the previous year\'s gains at comparable cost.',
        year: 'July 5–10',
        positions: [
          { id: 'minefield', label: 'Soviet Minefields & Anti-Tank Zones', side: 'defender', latitude: 52.1000, longitude: 36.1500, note: '6,000+ mines per kilometre of front' },
          { id: 'tiger_loss', label: 'German Tiger Tanks Stopped', side: 'attacker', latitude: 52.0000, longitude: 36.1700, note: 'Panthers suffer mechanical breakdowns; Tigers hit from side and rear' },
          { id: 'il2', label: 'Soviet IL-2 Sturmoviks — Anti-Tank Aircraft', side: 'defender', latitude: 51.8000, longitude: 36.2000, note: 'Armored ground-attack aircraft devastating German columns' },
        ],
        movements: [
          { from: { latitude: 52.2000, longitude: 36.1500 }, to: { latitude: 52.0800, longitude: 36.1500 }, side: 'attacker', label: 'German north — only 12km gained at enormous cost' },
        ],
      },
      {
        phase: 3,
        title: 'Battle of Prokhorovka — Largest Tank Battle in History',
        description: 'On July 12, Manstein\'s SS Panzer Corps and the Soviet 5th Guards Tank Army collide at Prokhorovka in a massive tank engagement involving over 800 vehicles. Fighting at close range neutralizes the longer-range advantage of German Tigers. The battle is devastating for both sides but the Soviet army can replace its losses — Germany cannot.',
        year: 'July 12 — All Day',
        positions: [
          { id: 'prokh', label: 'Prokhorovka — Clash of Armor', side: 'neutral', latitude: 51.0300, longitude: 36.7300, note: '800+ tanks engage at close range in open fields' },
          { id: 'ss_pz', label: 'SS Panzer Corps (Germany)', side: 'attacker', latitude: 51.0000, longitude: 36.6500, troops: 'Leibstandarte, Das Reich, Totenkopf Divisions' },
          { id: 'guards_ta', label: '5th Guards Tank Army (Soviet)', side: 'defender', latitude: 51.0600, longitude: 36.8000, troops: '850 tanks charging into SS panzers' },
        ],
        movements: [
          { from: { latitude: 51.0600, longitude: 36.8000 }, to: { latitude: 51.0300, longitude: 36.7300 }, side: 'defender', label: 'Soviet tank charge at Prokhorovka' },
          { from: { latitude: 51.0000, longitude: 36.6500 }, to: { latitude: 51.0300, longitude: 36.7300 }, side: 'attacker', label: 'SS panzers drive northeast' },
        ],
      },
      {
        phase: 4,
        title: 'Soviet Counteroffensive — Germany Never Recovers Initiative on Eastern Front',
        description: 'Hitler cancels Citadel on July 13 citing the Allied landing in Sicily. The Soviet counteroffensives Operations Kutuzov (against the north) and Rumyantsev (against the south) immediately begin, driving Germany back. Orel, Kharkov, and Belgorod are liberated. For the rest of the war, Germany fights a losing defensive battle eastward until Berlin falls in May 1945.',
        year: 'July 13 — August 1943',
        positions: [
          { id: 'kutuzov', label: 'Operation Kutuzov — Soviet Northern Attack', side: 'defender', latitude: 52.9500, longitude: 36.0700, troops: 'Three Soviet fronts attacking German salient at Orel' },
          { id: 'rumyantsev', label: 'Operation Rumyantsev — Soviet Southern Attack', side: 'defender', latitude: 50.0050, longitude: 36.2290, troops: 'Voronezh & Steppe Fronts retake Belgorod & Kharkov' },
          { id: 'g_retreat_k', label: 'German Retreat from Orel Salient', side: 'attacker', latitude: 52.9700, longitude: 36.0800, note: 'Forced to withdraw under Soviet pressure' },
        ],
        movements: [
          { from: { latitude: 52.6000, longitude: 36.1000 }, to: { latitude: 52.9700, longitude: 36.0800 }, side: 'attacker', label: 'German forced retreat north from Orel' },
          { from: { latitude: 50.0050, longitude: 36.2290 }, to: { latitude: 50.8500, longitude: 36.2000 }, side: 'defender', label: 'Soviet forces retake Kharkov and Belgorod' },
        ],
      },
    ],
  },
  {
    id: 'cannae',
    name: 'Battle of Cannae',
    year: -216,
    yearLabel: '216 BC',
    latitude: 41.3068,
    longitude: 16.1325,
    emoji: '🛡️',
    color: '#B45309',
    attacker: 'Carthage (Hannibal Barca)',
    defender: 'Roman Republic (Consuls Paullus & Varro)',
    outcome: 'Carthaginian Victory — Rome suffers greatest defeat in its history',
    significance: 'The perfect battle of annihilation; Hannibal\'s double envelopment at Cannae became the model studied by commanders for 2,200 years',
    description: 'On August 2, 216 BC, Hannibal Barca destroyed a Roman army of roughly 86,000 men with a force of 50,000 Carthaginians through a masterpiece of tactical deception. His double envelopment at Cannae killed approximately 70,000 Romans in a single day — a rate of slaughter unmatched in Western military history.',
    casualties: '~70,000 Roman killed, ~6,000 Carthaginian killed',
    duration: '1 day (August 2, 216 BC)',
    commanders: [
      { name: 'Hannibal Barca', side: 'Carthage' },
      { name: 'Consul Lucius Aemilius Paullus', side: 'Rome (killed)' },
      { name: 'Consul Gaius Terentius Varro', side: 'Rome (survived)' },
    ],
    phases: [
      {
        phase: 1,
        title: 'Hannibal Deploys Weak Center and Strong Wings in Crescent Formation',
        description: 'Hannibal arranges his army in a deliberate convex crescent shape: his weakest Gallic and Spanish infantry form the bulging center while his best African heavy infantry anchor both wings. His cavalry — superior to Rome\'s — takes the flanks. The Romans pack their legions in abnormal depth, planning to smash through the center by sheer mass.',
        year: 'August 2 — Dawn',
        positions: [
          { id: 'h_center', label: 'Carthaginian Weak Center (Gauls & Spaniards)', side: 'attacker', latitude: 41.3068, longitude: 16.1325, troops: '~20,000 — positioned to bend, not break' },
          { id: 'h_left', label: 'African Heavy Infantry — Left Wing', side: 'attacker', latitude: 41.3130, longitude: 16.1200, troops: '6,000 veteran Africans' },
          { id: 'h_right', label: 'African Heavy Infantry — Right Wing', side: 'attacker', latitude: 41.3130, longitude: 16.1450, troops: '6,000 veteran Africans' },
          { id: 'r_mass', label: 'Roman Legions — Mass Formation', side: 'defender', latitude: 41.2990, longitude: 16.1325, troops: '~65,000 infantry packed in deep columns' },
        ],
      },
      {
        phase: 2,
        title: 'Roman Legions Advance, Pushing Carthaginian Center Back',
        description: 'The Roman legions push forward in their deep formation and the Carthaginian center begins to give way, bending backward as planned. The Romans sense victory and crowd forward, pushing ever deeper into what seems like a collapsing enemy. Hannibal\'s center retreats in a controlled formation, drawing the Roman mass into an ever-tightening pocket.',
        year: 'August 2 — Morning',
        positions: [
          { id: 'r_push', label: 'Romans Pushing Carthaginian Center Back', side: 'defender', latitude: 41.3040, longitude: 16.1325, note: 'Romans believe they are winning' },
          { id: 'h_bend', label: 'Carthaginian Center Bending as Planned', side: 'attacker', latitude: 41.3070, longitude: 16.1325, note: 'Controlled retreat drawing Romans in' },
        ],
        movements: [
          { from: { latitude: 41.2990, longitude: 16.1325 }, to: { latitude: 41.3040, longitude: 16.1325 }, side: 'defender', label: 'Roman advance into the trap' },
          { from: { latitude: 41.3068, longitude: 16.1325 }, to: { latitude: 41.3085, longitude: 16.1325 }, side: 'attacker', label: 'Carthaginian center retreats drawing Romans in' },
        ],
      },
      {
        phase: 3,
        title: 'Carthaginian Wings Encircle the Romans — Double Envelopment',
        description: 'Hasdrubal\'s heavy cavalry on the left routs the Roman cavalry, rides around the entire Roman army, and crushes the allied cavalry on the other flank. Simultaneously, the African infantry on both wings pivot inward 90 degrees, attacking the Romans on both flanks. The Roman army is enveloped on all four sides — they cannot maneuver, cannot retreat, can only die.',
        year: 'August 2 — Midday',
        positions: [
          { id: 'h_cav_sweep', label: 'Carthaginian Cavalry Sweeps Around Roman Rear', side: 'attacker', latitude: 41.2900, longitude: 16.1325, note: 'Hasdrubal\'s cavalry completes the encirclement' },
          { id: 'african_l', label: 'African Infantry Pivots Inward — Left', side: 'attacker', latitude: 41.3060, longitude: 16.1200, note: 'Attacking the Roman right flank' },
          { id: 'african_r', label: 'African Infantry Pivots Inward — Right', side: 'attacker', latitude: 41.3060, longitude: 16.1450, note: 'Attacking the Roman left flank' },
          { id: 'r_trapped', label: 'Roman Army — Completely Surrounded', side: 'defender', latitude: 41.3040, longitude: 16.1325, note: 'Too tightly packed to fight effectively' },
        ],
        movements: [
          { from: { latitude: 41.3130, longitude: 16.1200 }, to: { latitude: 41.3060, longitude: 16.1270 }, side: 'attacker', label: 'African left wing pivots to attack Roman flank' },
          { from: { latitude: 41.3130, longitude: 16.1450 }, to: { latitude: 41.3060, longitude: 16.1380 }, side: 'attacker', label: 'African right wing pivots to attack Roman flank' },
          { from: { latitude: 41.3000, longitude: 16.1100 }, to: { latitude: 41.2950, longitude: 16.1325 }, side: 'attacker', label: 'Cavalry seals the rear — total encirclement' },
        ],
      },
      {
        phase: 4,
        title: '70,000 Romans Killed in One Day — Hannibal\'s Masterpiece',
        description: 'Packed so tightly they cannot raise their shields or swing their swords, 70,000 Romans are systematically slaughtered over several hours. Consul Paullus dies on the field; 80 senators are killed — a third of the Senate. The historian Livy described survivors telling how they could not stop the killing even if they wanted to. It remains one of the worst defeats any army has ever suffered.',
        year: 'August 2 — Afternoon',
        positions: [
          { id: 'slaughter', label: 'Roman Army Annihilated', side: 'defender', latitude: 41.3040, longitude: 16.1325, note: '~70,000 killed; some suffocated in the crush' },
          { id: 'paullus', label: 'Consul Paullus Killed', side: 'defender', latitude: 41.3050, longitude: 16.1350, note: 'Refused a horse to escape; died with his men' },
          { id: 'h_triumph', label: 'Hannibal — Victor of Cannae', side: 'attacker', latitude: 41.3068, longitude: 16.1325, note: '"Carthaginian generals do not weep over their victories"' },
        ],
      },
    ],
  },
  {
    id: 'battle-of-the-bulge',
    name: 'Battle of the Bulge',
    year: 1944,
    yearLabel: '1944–1945 AD',
    latitude: 50.0000,
    longitude: 6.0000,
    emoji: '❄️',
    color: '#1E40AF',
    attacker: 'Nazi Germany (Field Marshal von Rundstedt / Gen. von Manteuffel)',
    defender: 'United States & Allied Forces (Gen. Eisenhower / Gen. Patton)',
    outcome: 'Allied Victory — last major German offensive of the war',
    significance: 'Germany\'s final strategic offensive in the West exhausted its last armored reserves; Allied victory made the final push into Germany possible',
    description: 'In December 1944, Germany launched its last major offensive in the West through the Ardennes forest, creating a large bulge in Allied lines and surrounding the American 101st Airborne Division at Bastogne. General Patton\'s rapid 90-degree turn of the Third Army to relieve Bastogne, and the eventual failure of German fuel supplies, ended the offensive and shattered Germany\'s last armored reserves.',
    casualties: '~100,000 German, ~75,000 American killed, wounded, or captured',
    duration: '6 weeks (December 16, 1944 – January 25, 1945)',
    commanders: [
      { name: 'Field Marshal Gerd von Rundstedt', side: 'Germany (overall)' },
      { name: 'Gen. Hasso von Manteuffel', side: 'Germany (5th Panzer Army)' },
      { name: 'Gen. Dwight Eisenhower', side: 'Supreme Allied Commander' },
      { name: 'Gen. George S. Patton', side: 'US Third Army' },
      { name: 'Brig. Gen. Anthony McAuliffe', side: 'US 101st Airborne at Bastogne' },
    ],
    phases: [
      {
        phase: 1,
        title: 'German Surprise Attack Through Ardennes Fog — Americans Overwhelmed',
        description: 'On December 16, 1944, under cover of fog that grounds Allied air power, three German armies with 250,000 men and 1,000 tanks smash into lightly held American positions in the Ardennes. The surprise is total — some American units are overwhelmed within hours. German SS forces under Joachim Peiper race ahead, massacring 84 American prisoners at Malmedy.',
        year: 'December 16 — Dawn',
        positions: [
          { id: 'g_attack', label: 'German Three-Army Assault', side: 'attacker', latitude: 50.2000, longitude: 6.3000, troops: '250,000 men, 1,000 tanks in pre-dawn attack' },
          { id: 'us_thin', label: 'US Lines — Thinly Held Sector', side: 'defender', latitude: 50.0000, longitude: 6.0000, troops: 'Inexperienced & recuperating units in "Ghost Front"' },
          { id: 'malmedy', label: 'Malmedy Massacre', side: 'attacker', latitude: 50.4254, longitude: 6.0285, note: '84 US POWs murdered by Peiper\'s SS unit' },
        ],
        movements: [
          { from: { latitude: 50.2000, longitude: 6.3000 }, to: { latitude: 50.0000, longitude: 5.5000 }, side: 'attacker', label: 'German armored spearheads drive west' },
        ],
      },
      {
        phase: 2,
        title: '101st Airborne Surrounded at Bastogne — "Nuts!" Reply to Surrender Demand',
        description: 'The key road junction of Bastogne is held by the US 101st Airborne Division, which is quickly surrounded by German forces. In dense fog with no air resupply or air support, the paratroopers hold off repeated German assaults while critically short of ammunition, food, and medical supplies. When German commanders demand surrender, Brigadier General McAuliffe\'s one-word reply is "Nuts!" — a response that becomes legendary.',
        year: 'December 19–26',
        positions: [
          { id: 'bastogne', label: 'Bastogne — 101st Airborne Surrounded', side: 'defender', latitude: 50.0020, longitude: 5.7180, troops: '~18,000 defenders — surrounded and outnumbered' },
          { id: 'g_ring', label: 'German Encirclement of Bastogne', side: 'attacker', latitude: 50.0100, longitude: 5.7200, note: 'Multiple German divisions surrounding the town' },
          { id: 'nuts', label: '"Nuts!" — McAuliffe\'s HQ', side: 'defender', latitude: 50.0020, longitude: 5.7180, note: 'Reply to German surrender demand — December 22' },
        ],
      },
      {
        phase: 3,
        title: 'Patton\'s Relief of Bastogne — 3rd Army Turns 90 Degrees in Winter',
        description: 'General Patton, told to relieve Bastogne, performs one of the most remarkable logistical feats of the war: turning his entire Third Army 90 degrees north and attacking through winter conditions in just 72 hours. On December 26, lead elements of the 4th Armored Division break through the German ring and reach Bastogne, ending the siege.',
        year: 'December 22–26',
        positions: [
          { id: 'patton_start', label: 'Patton\'s 3rd Army (Initial Position — Facing East)', side: 'defender', latitude: 49.3000, longitude: 6.1700, troops: '~250,000 troops pivoting 90 degrees' },
          { id: 'patton_drive', label: 'Patton\'s Drive North Through Snow', side: 'defender', latitude: 49.6500, longitude: 5.8000, note: '60 miles in 72 hours through winter conditions' },
          { id: 'relief', label: '4th Armored Division Breaks Through to Bastogne', side: 'defender', latitude: 49.9500, longitude: 5.7300, note: 'Corridor opened December 26' },
        ],
        movements: [
          { from: { latitude: 49.3000, longitude: 6.1700 }, to: { latitude: 50.0020, longitude: 5.7180 }, side: 'defender', label: 'Patton\'s 90-degree turn and relief of Bastogne' },
        ],
      },
      {
        phase: 4,
        title: 'German Offensive Stalls — Last Major German Offensive of the War',
        description: 'German armored spearheads run out of fuel short of the Meuse River — their primary objective. Allied air power pounds German supply lines when the fog finally clears on December 23. By January 1945, the Allied counteroffensive pushes Germany back beyond its start line. The offensive cost Germany 100,000 casualties and most of its remaining tank reserves, making the final Allied drive into Germany unstoppable.',
        year: 'December 23, 1944 – January 25, 1945',
        positions: [
          { id: 'g_stall', label: 'German Spearhead Stalls — Out of Fuel', side: 'attacker', latitude: 50.3500, longitude: 5.3200, note: 'Panzers stop at Celles — 4 miles from the Meuse' },
          { id: 'allied_air', label: 'Allied Air Supremacy Returns (Dec 23)', side: 'defender', latitude: 50.1000, longitude: 5.9000, note: 'Thousands of sorties pound German supply lines' },
          { id: 'allied_push', label: 'Allied Counteroffensive Restores Original Line', side: 'defender', latitude: 50.0000, longitude: 6.0000, note: 'Bulge eliminated by January 25 — Germany\'s last offensive' },
        ],
        movements: [
          { from: { latitude: 50.0000, longitude: 5.5000 }, to: { latitude: 50.2000, longitude: 6.3000 }, side: 'attacker', label: 'German retreat back to start line' },
          { from: { latitude: 50.0000, longitude: 6.0000 }, to: { latitude: 50.2500, longitude: 6.3000 }, side: 'defender', label: 'Allied counteroffensive pushes Germans back' },
        ],
      },
    ],
  },
];
