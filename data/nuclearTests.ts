// data/nuclearTests.ts
// Nuclear test sites and major nuclear events dataset

export type NuclearCountry =
  | 'usa'
  | 'ussr'
  | 'uk'
  | 'france'
  | 'china'
  | 'india'
  | 'pakistan'
  | 'north_korea';

export interface NuclearSite {
  id: string;
  name: string;
  country: NuclearCountry;
  color: string;       // hex color for this country
  flag: string;        // emoji flag
  latitude: number;
  longitude: number;
  totalTests: number;
  period: string;      // e.g. "1951–1992"
  maxYieldKt: number;  // largest test in kilotons
  description: string; // 2-3 sentences
  notableFact: string; // one striking fact
  radius: number;      // display radius in meters (scaled by totalTests, range 50000-800000)
}

export type NuclearEventType =
  | 'first_test'
  | 'combat'
  | 'largest'
  | 'accident'
  | 'crisis'
  | 'treaty'
  | 'program';

export interface NuclearEvent {
  id: string;
  title: string;
  year: number;
  month: number;
  latitude: number;
  longitude: number;
  country: NuclearCountry | 'multi';
  type: NuclearEventType;
  yieldKt?: number;    // for actual detonations
  description: string; // 2-3 sentences
  significance: 1 | 2 | 3;
  color: string;       // hex color
}

export const NUCLEAR_SITES: NuclearSite[] = [
  {
    id: 'nevada_test_site',
    name: 'Nevada Test Site',
    country: 'usa',
    color: '#2563EB',
    flag: '🇺🇸',
    latitude: 37.1205,
    longitude: -116.0647,
    totalTests: 928,
    period: '1951–1992',
    maxYieldKt: 1450,
    description:
      'The Nevada Test Site served as the primary American nuclear weapons testing ground for four decades, hosting more tests than any other site on Earth. Atmospheric blasts in the 1950s were visible from Las Vegas, and fallout drifted across hundreds of miles of the American Southwest. The site remains the most heavily nuclear-tested piece of land in history.',
    notableFact:
      'During the 1950s, Las Vegas marketed itself as "Atomic City" and hotels offered rooftop viewing parties for above-ground detonations visible 65 miles away.',
    radius: 800000,
  },
  {
    id: 'semipalatinsk',
    name: 'Semipalatinsk Test Site',
    country: 'ussr',
    color: '#DC2626',
    flag: '🇰🇿',
    latitude: 50.4,
    longitude: 78.9,
    totalTests: 456,
    period: '1949–1989',
    maxYieldKt: 900,
    description:
      'Known as "The Polygon," the Semipalatinsk site in northeastern Kazakhstan was the Soviet Union\'s principal nuclear testing ground and the scene of the very first Soviet detonation in 1949. Approximately 1.5 million people in the surrounding region were exposed to radioactive fallout without their knowledge or consent over four decades. The legacy endures today in sharply elevated rates of cancer, birth defects, and immune disorders among the region\'s population.',
    notableFact:
      'Soviet authorities never informed the 700,000 residents of nearby Semipalatinsk city about the radiation danger; local people called the mysterious flashes on the horizon "the thunder of the heavens."',
    radius: 600000,
  },
  {
    id: 'novaya_zemlya',
    name: 'Novaya Zemlya',
    country: 'ussr',
    color: '#DC2626',
    flag: '🇷🇺',
    latitude: 73.4,
    longitude: 54.0,
    totalTests: 130,
    period: '1955–1990',
    maxYieldKt: 50000,
    description:
      'This remote Arctic archipelago became the stage for the most violent man-made explosions in history, culminating in the Tsar Bomba detonation of 1961 — a hydrogen bomb 3,000 times more powerful than the Hiroshima blast. The remoteness of the site allowed the Soviets to test weapons of a scale that would have been unthinkable anywhere near population centers. The detonations shattered windows in Norway and Finland and sent seismic waves around the globe multiple times.',
    notableFact:
      'The Tsar Bomba\'s fireball was nearly five miles wide and visible from 620 miles away; the mushroom cloud rose to 40 miles, punching into the mesosphere.',
    radius: 450000,
  },
  {
    id: 'christmas_johnston',
    name: 'Christmas Island / Johnston Atoll',
    country: 'usa',
    color: '#2563EB',
    flag: '🇺🇸',
    latitude: 1.98,
    longitude: 157.48,
    totalTests: 24,
    period: '1956–1962',
    maxYieldKt: 9000,
    description:
      'These remote Pacific atolls hosted joint American and British atmospheric hydrogen bomb tests during the height of the Cold War arms race, including some of the most powerful weapons ever detonated by the English-speaking world. Operation Dominic in 1962 alone saw 36 nuclear detonations in the Pacific as the US rushed to complete a final round of atmospheric testing before a treaty would ban them. Service personnel on nearby ships witnessed the blasts with no more protection than dark goggles.',
    notableFact:
      'During Operation Hardtack in 1958, a high-altitude test inadvertently created artificial radiation belts around Earth that disabled several satellites and disrupted radio communications across the Pacific for weeks.',
    radius: 250000,
  },
  {
    id: 'bikini_atoll',
    name: 'Bikini Atoll',
    country: 'usa',
    color: '#2563EB',
    flag: '🇺🇸',
    latitude: 11.5655,
    longitude: 165.3839,
    totalTests: 23,
    period: '1946–1958',
    maxYieldKt: 15000,
    description:
      'Bikini Atoll was the site of Operation Crossroads in 1946 — the first postwar nuclear tests — and later of the Castle Bravo thermonuclear detonation in 1954, which at 15 megatons was the most powerful American nuclear weapon ever tested and far exceeded its design yield. The 167 Bikinian islanders were relocated before testing began, promised they could return; they never have. The atoll was declared a UNESCO World Heritage Site in 2010 as a monument to the nuclear age — its lagoon still too contaminated for permanent habitation.',
    notableFact:
      'Castle Bravo\'s fallout coated the Japanese fishing vessel Lucky Dragon No. 5 in radioactive ash 80 miles downwind; all 23 crew were hospitalized and one died, triggering worldwide anti-nuclear protest.',
    radius: 300000,
  },
  {
    id: 'mururoa',
    name: 'Mururoa Atoll',
    country: 'france',
    color: '#059669',
    flag: '🇫🇷',
    latitude: -21.83,
    longitude: -138.9,
    totalTests: 193,
    period: '1966–1996',
    maxYieldKt: 2600,
    description:
      'France conducted nearly two hundred nuclear tests at this remote French Polynesian atoll, making it the most heavily tested site in the Southern Hemisphere. Initial atmospheric tests were replaced by underground detonations after international pressure, though these fractured the coral atoll\'s substrate and likely leaked radioactive material into the surrounding ocean. France finally halted testing in 1996 after a worldwide boycott following the resumption of tests under President Chirac provoked international outrage.',
    notableFact:
      'Greenpeace\'s protest ship Rainbow Warrior was bombed and sunk in Auckland Harbour in 1985 by French intelligence agents to prevent it from reaching Mururoa — killing one crew member and triggering a major diplomatic crisis.',
    radius: 500000,
  },
  {
    id: 'maralinga',
    name: 'Maralinga',
    country: 'uk',
    color: '#7C3AED',
    flag: '🇬🇧',
    latitude: -30.16,
    longitude: 131.57,
    totalTests: 12,
    period: '1956–1963',
    maxYieldKt: 26,
    description:
      'Britain used this remote South Australian desert to conduct its nuclear weapons tests during the 1950s, displacing the Maralinga Tjarutja Aboriginal people from their ancestral lands without consultation or compensation. In addition to seven major nuclear blasts, hundreds of smaller "safety trials" scattered plutonium and beryllium across the desert, contaminating an area larger than England. A full cleanup was not completed until 2000, and the land was only partially returned to its traditional owners.',
    notableFact:
      'British soldiers were ordered to march toward the blast site immediately after detonation to test the effect of atomic weapons on combat troops; many later died of leukemia and other radiation-linked cancers.',
    radius: 200000,
  },
  {
    id: 'lop_nor',
    name: 'Lop Nor',
    country: 'china',
    color: '#D97706',
    flag: '🇨🇳',
    latitude: 40.7,
    longitude: 89.9,
    totalTests: 45,
    period: '1964–1996',
    maxYieldKt: 4000,
    description:
      'China\'s Lop Nor test site, situated in the remote Taklamakan desert of Xinjiang, hosted every Chinese nuclear test from the first in 1964 to the last in 1996 — a span that saw China progress from a primitive atomic bomb to thermonuclear weapons in just thirty-two months, the fastest such development in history. Atmospheric tests continued here long after the superpowers had moved underground, exposing millions of downwind Uyghur and Kazakh inhabitants to radioactive fallout. Chinese authorities have never published an official accounting of radiation exposures or health effects.',
    notableFact:
      'A 2009 study estimated that Chinese atmospheric testing at Lop Nor may have caused up to 1.48 million cancer deaths among the downwind population — a toll that remains entirely unacknowledged by Beijing.',
    radius: 350000,
  },
  {
    id: 'pokhran',
    name: 'Pokhran Test Range',
    country: 'india',
    color: '#EA580C',
    flag: '🇮🇳',
    latitude: 27.0591,
    longitude: 71.7748,
    totalTests: 5,
    period: '1974–1998',
    maxYieldKt: 45,
    description:
      'The Pokhran range in Rajasthan\'s Thar Desert was the site of India\'s two rounds of nuclear tests: the single "Smiling Buddha" test of 1974 — the first nuclear detonation by a country outside the five permanent UN Security Council members — and Operation Shakti in May 1998, when India detonated five devices in 48 hours and declared itself a nuclear-weapons state. The 1998 tests triggered immediate sanctions from the US and international condemnation, but also prompted Pakistan to conduct its own tests within weeks.',
    notableFact:
      'India conducted the 1974 test in total secrecy by disguising the weapons team as a group of army engineers digging a well; the CIA was caught completely off guard.',
    radius: 120000,
  },
  {
    id: 'chagai_hills',
    name: 'Chagai Hills',
    country: 'pakistan',
    color: '#0891B2',
    flag: '🇵🇰',
    latitude: 28.99,
    longitude: 65.25,
    totalTests: 6,
    period: '1998',
    maxYieldKt: 36,
    description:
      'Pakistan\'s nuclear tests at the Chagai Hills in Balochistan in May 1998 came just 17 days after India\'s Operation Shakti, completing a nuclear standoff between two nations that have fought three wars and share a contested border running through Kashmir. The simultaneous nuclearization of India and Pakistan introduced the world\'s most dangerous nuclear flashpoint: two states with unresolved territorial disputes, short missile flight times, and no formal hotlines or crisis communication protocols at the time of testing.',
    notableFact:
      'The mountain used for the May 28, 1998 test — Koh Kambaran — turned white from the heat of the blast and glowed for hours afterward; Pakistani scientists called the moment "Chagai-I" and the nation erupted in street celebrations.',
    radius: 130000,
  },
];

export const NUCLEAR_EVENTS: NuclearEvent[] = [
  {
    id: 'trinity',
    title: 'Trinity Test — The First Nuclear Detonation',
    year: 1945,
    month: 7,
    latitude: 33.6756,
    longitude: -106.4754,
    country: 'usa',
    type: 'first_test',
    yieldKt: 21,
    description:
      'At 5:29 AM on July 16, 1945, the Manhattan Project\'s plutonium implosion device detonated in the New Mexico desert, producing a blinding flash visible 160 miles away and a 40,000-foot mushroom cloud. Witnessing the blast, project director J. Robert Oppenheimer recalled a line from the Bhagavad Gita: "Now I am become Death, the destroyer of worlds." Less than three weeks later, nuclear weapons were used in combat for the first and only time in history.',
    significance: 3,
    color: '#2563EB',
  },
  {
    id: 'hiroshima',
    title: 'Hiroshima — First Combat Use of a Nuclear Weapon',
    year: 1945,
    month: 8,
    latitude: 34.3853,
    longitude: 132.4553,
    country: 'usa',
    type: 'combat',
    yieldKt: 15,
    description:
      'At 8:15 AM on August 6, 1945, the B-29 Enola Gay dropped "Little Boy" — a uranium gun-type bomb — over Hiroshima, Japan, detonating at 1,900 feet with a flash that vaporized the city center. Approximately 80,000 people were killed instantly; by the end of 1945, the death toll reached an estimated 140,000 as survivors succumbed to burns, blast injuries, and acute radiation sickness. The bombing remains the only offensive use of a nuclear weapon against a civilian population in history.',
    significance: 3,
    color: '#2563EB',
  },
  {
    id: 'nagasaki',
    title: 'Nagasaki — Second and Last Combat Nuclear Strike',
    year: 1945,
    month: 8,
    latitude: 32.7503,
    longitude: 129.8777,
    country: 'usa',
    type: 'combat',
    yieldKt: 21,
    description:
      'Three days after Hiroshima, "Fat Man" — a plutonium implosion bomb — was dropped on Nagasaki, Japan, killing an estimated 40,000 people immediately and up to 80,000 by year\'s end. The surrounding hills partially contained the blast, limiting casualties compared to Hiroshima, but entire districts were still obliterated in seconds. Japan\'s Emperor Hirohito announced surrender on August 15, citing the new weapon of "most cruel bombs" that had a power to cause "incalculable damage."',
    significance: 3,
    color: '#2563EB',
  },
  {
    id: 'joe_1',
    title: '"Joe-1" — The Soviet Union\'s First Nuclear Test',
    year: 1949,
    month: 8,
    latitude: 50.4,
    longitude: 78.9,
    country: 'ussr',
    type: 'first_test',
    yieldKt: 22,
    description:
      'On August 29, 1949, the Soviet Union secretly detonated its first nuclear device — code-named "First Lightning" by the Soviets and "Joe-1" by Western intelligence — at Semipalatinsk, Kazakhstan, shattering the American monopoly on nuclear weapons just four years after Hiroshima. US President Truman announced the test to a stunned American public on September 23, accelerating the nuclear arms race and prompting the US to begin developing the hydrogen bomb. Soviet espionage — including intelligence from Manhattan Project spy Klaus Fuchs — had given the program a crucial head start.',
    significance: 3,
    color: '#DC2626',
  },
  {
    id: 'tsar_bomba',
    title: 'Tsar Bomba — The Largest Nuclear Weapon Ever Detonated',
    year: 1961,
    month: 10,
    latitude: 73.4,
    longitude: 54.0,
    country: 'ussr',
    type: 'largest',
    yieldKt: 50000,
    description:
      'On October 30, 1961, a Soviet Tu-95 bomber dropped the AN602 hydrogen bomb — nicknamed Tsar Bomba — over Novaya Zemlya, detonating a device with a yield of 50 megatons, more than the total of all explosives used in World War II combined, including both atomic bombs. The fireball was nearly five miles across, and the blast wave circled the globe three times; windows were shattered 560 miles from ground zero in Finland and Norway. The bomb had been deliberately reduced to half its theoretical 100-megaton yield to allow the aircraft any chance of surviving.',
    significance: 3,
    color: '#DC2626',
  },
  {
    id: 'cuban_missile_crisis',
    title: 'Cuban Missile Crisis — The World at the Nuclear Brink',
    year: 1962,
    month: 10,
    latitude: 22.0,
    longitude: -80.0,
    country: 'multi',
    type: 'crisis',
    description:
      'For thirteen days in October 1962, the United States and Soviet Union stood at the edge of nuclear war after U.S. reconnaissance photos revealed Soviet ballistic missiles being installed in Cuba, 90 miles from Florida. President Kennedy ordered a naval blockade and placed nuclear forces on DEFCON 2 — the highest state of readiness short of war; Soviet submarines carrying nuclear torpedoes operated in the blockade zone. The crisis was resolved when Soviet Premier Khrushchev agreed to remove the missiles in exchange for a secret US pledge not to invade Cuba and to remove American Jupiter missiles from Turkey.',
    significance: 3,
    color: '#6B7280',
  },
  {
    id: 'partial_test_ban_treaty',
    title: 'Partial Test Ban Treaty Signed',
    year: 1963,
    month: 8,
    latitude: 55.7558,
    longitude: 37.6173,
    country: 'multi',
    type: 'treaty',
    description:
      'On August 5, 1963, the United States, Soviet Union, and United Kingdom signed the Partial Nuclear Test Ban Treaty in Moscow, prohibiting nuclear weapons tests in the atmosphere, underwater, and in outer space — but not underground. The treaty was driven by widespread public fear of radioactive fallout contaminating the global food supply, particularly strontium-90 detected in children\'s teeth and milk. Underground testing continued for decades, but the treaty marked the first arms-control agreement of the nuclear age and signaled that even adversaries could negotiate limits on their most destructive weapons.',
    significance: 3,
    color: '#6B7280',
  },
  {
    id: 'china_first_test',
    title: 'China\'s First Nuclear Test — "596"',
    year: 1964,
    month: 10,
    latitude: 40.7,
    longitude: 89.9,
    country: 'china',
    type: 'first_test',
    yieldKt: 22,
    description:
      'On October 16, 1964, China detonated its first nuclear device at Lop Nor, becoming the fifth nation to join the nuclear club and the first in Asia. The test — code-named "596," reportedly for the June 1959 date on which the Soviets withdrew their technical assistance — was a uranium device that stunned Western intelligence with its sophistication. Within 32 months, China had tested a thermonuclear weapon, completing the fastest progression from fission to fusion bomb in history.',
    significance: 2,
    color: '#D97706',
  },
  {
    id: 'three_mile_island',
    title: 'Three Mile Island — America\'s Worst Nuclear Accident',
    year: 1979,
    month: 3,
    latitude: 40.1529,
    longitude: -76.7249,
    country: 'usa',
    type: 'accident',
    description:
      'On March 28, 1979, a combination of equipment failure, design deficiency, and operator error caused a partial core meltdown at the Three Mile Island nuclear power plant in Pennsylvania — the most serious nuclear accident in American history. A cooling malfunction caused the reactor\'s core to overheat, releasing radioactive gases and iodine-131 into the atmosphere and triggering the evacuation of 140,000 pregnant women and young children from the surrounding area. Though no definitive deaths were attributed to the accident, it effectively ended the construction of new nuclear power plants in the United States for a generation.',
    significance: 2,
    color: '#2563EB',
  },
  {
    id: 'chernobyl',
    title: 'Chernobyl — The Worst Nuclear Disaster in History',
    year: 1986,
    month: 4,
    latitude: 51.389,
    longitude: 30.0978,
    country: 'ussr',
    type: 'accident',
    description:
      'At 1:23 AM on April 26, 1986, a botched safety test at Reactor No. 4 of the Chernobyl Nuclear Power Plant in Soviet Ukraine triggered a steam explosion and open-air graphite fire that burned for ten days, ejecting radioactive material across all of Europe in what became the worst nuclear accident in history. Two plant workers died in the initial explosion; twenty-eight emergency responders died within months from acute radiation syndrome; the UN estimates a further 4,000 will ultimately die from long-term cancer effects, though advocacy groups place the toll far higher. The 30-kilometer exclusion zone around the plant remains uninhabitable, and the concrete sarcophagus encasing the destroyed reactor is one of the most hazardous structures on Earth.',
    significance: 3,
    color: '#DC2626',
  },
  {
    id: 'ctbt',
    title: 'Comprehensive Test Ban Treaty Opened for Signature',
    year: 1996,
    month: 9,
    latitude: 40.7128,
    longitude: -74.006,
    country: 'multi',
    type: 'treaty',
    description:
      'On September 24, 1996, the Comprehensive Nuclear-Test-Ban Treaty (CTBT) opened for signature at the United Nations, prohibiting all nuclear explosions for any purpose anywhere on Earth. As of 2024, 187 nations have signed and 178 have ratified the treaty — but it cannot enter into legal force until all 44 nations with nuclear technology ratify it, eight of which (including the USA, China, India, Pakistan, and Israel) have not done so. A global network of 337 monitoring stations can now detect clandestine nuclear tests anywhere on the planet within hours.',
    significance: 2,
    color: '#6B7280',
  },
  {
    id: 'pokhran_ii',
    title: 'Operation Shakti — India Declares Itself a Nuclear Power',
    year: 1998,
    month: 5,
    latitude: 27.0591,
    longitude: 71.7748,
    country: 'india',
    type: 'first_test',
    description:
      'Between May 11 and 13, 1998, India detonated five nuclear devices at Pokhran in the Thar Desert in a series of tests code-named Operation Shakti, officially declaring itself a nuclear-weapons state for the first time. The tests — conducted under intense secrecy that fooled US satellite surveillance — included a thermonuclear device, a fission weapon, and sub-kiloton tactical devices. Indian Prime Minister Vajpayee announced the tests as necessary for national security; Pakistan responded with its own tests 17 days later, completing South Asia\'s entry into the nuclear age.',
    significance: 2,
    color: '#EA580C',
  },
  {
    id: 'north_korea_first_test',
    title: 'North Korea\'s First Nuclear Test',
    year: 2006,
    month: 10,
    latitude: 41.3,
    longitude: 129.1,
    country: 'north_korea',
    type: 'first_test',
    yieldKt: 1,
    description:
      'On October 9, 2006, North Korea detonated a nuclear device deep beneath the Punggye-ri mountain complex in the country\'s northeast, becoming the eighth nation to test a nuclear weapon and the first to do so in the 21st century. The test — condemned unanimously by the UN Security Council — registered as a 4.3-magnitude seismic event and is estimated to have yielded less than one kiloton, suggesting either a partial fizzle or a deliberately small device. Over the following years, North Korea conducted five more nuclear tests of steadily increasing yield, ultimately claiming to have developed thermonuclear weapons by 2017.',
    significance: 2,
    color: '#1C1917',
  },
  {
    id: 'fukushima',
    title: 'Fukushima Daiichi — Japan\'s Nuclear Catastrophe',
    year: 2011,
    month: 3,
    latitude: 37.4211,
    longitude: 141.0329,
    country: 'multi',
    type: 'accident',
    description:
      'On March 11, 2011, the most powerful earthquake in Japanese recorded history triggered a devastating tsunami that overwhelmed the sea walls of the Fukushima Daiichi nuclear power plant, disabling its backup generators and causing three reactor core meltdowns — the second Level 7 nuclear event after Chernobyl on the International Nuclear Event Scale. Over 154,000 residents were evacuated from a 20-kilometer exclusion zone; radioactive water continued leaking into the Pacific Ocean for years, and the cleanup is expected to take until 2051. No radiation-related deaths have been confirmed, but the psychological and economic toll has been immeasurable.',
    significance: 2,
    color: '#6B7280',
  },
];
