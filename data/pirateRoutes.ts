// data/pirateRoutes.ts — Real historical pirate routes with verified coordinates

export type PirateStopType = 'haven' | 'raid' | 'battle' | 'base' | 'hunting_ground';

export interface PirateStop {
  label: string;
  latitude: number;
  longitude: number;
  note: string;        // 2-3 sentences of historical detail
  type: PirateStopType;
  year?: number;       // year of notable event here
}

export interface PirateRoute {
  id: string;
  name: string;        // e.g. "Blackbeard's Caribbean Terror"
  era: string;         // e.g. "Golden Age of Piracy"
  period: string;      // e.g. "1716–1718"
  color: string;       // hex
  emoji: string;
  captain: string;     // famous pirate(s) associated
  ship: string;        // famous ship name
  description: string; // 2-3 sentences
  notoriety: string;   // what made them famous
  fate: string;        // how it ended
  coordinates: { latitude: number; longitude: number }[]; // the route polyline
  keyStops: PirateStop[];
}

export const PIRATE_ROUTES: PirateRoute[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BLACKBEARD'S CARIBBEAN TERROR
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'blackbeard',
    name: "Blackbeard's Caribbean Terror",
    era: 'Golden Age of Piracy',
    period: '1716–1718',
    color: '#1C1917',
    emoji: '💀',
    captain: 'Edward "Blackbeard" Teach',
    ship: 'Queen Anne\'s Revenge',
    description:
      'Edward Teach, known as Blackbeard, terrorised the Atlantic seaboard and Caribbean for just two years yet became the most iconic pirate in history. He wove slow-burning fuses into his thick black beard during battle, surrounding his face in sulphurous smoke to appear as a demon risen from hell. Operating from the pirate republic of Nassau, his fleet grew to four ships and nearly 400 men at its peak.',
    notoriety:
      'In May 1718 Blackbeard blockaded the entire port of Charleston, South Carolina — the fourth-largest city in British North America — with four ships, holding prominent citizens hostage and demanding a chest of medicine. The audacity of shutting down a colonial capital shocked the empire and cemented his legend.',
    fate:
      'On November 22, 1718, Royal Navy Lieutenant Robert Maynard cornered Blackbeard at Ocracoke Inlet, North Carolina. In savage hand-to-hand combat Blackbeard received five musket ball wounds and twenty sword cuts before finally falling. Maynard hung the severed head from his bowsprit and sailed back to Virginia.',
    coordinates: [
      { latitude: 51.45,  longitude: -2.60  }, // Bristol, England — Teach's likely origin
      { latitude: 35.18,  longitude: -23.50 }, // Mid-Atlantic crossing south of Azores
      { latitude: 18.47,  longitude: -66.10 }, // Puerto Rico — early raiding
      { latitude: 23.13,  longitude: -75.37 }, // Nassau, Bahamas — pirate republic
      { latitude: 23.15,  longitude: -82.35 }, // Havana approaches
      { latitude: 19.86,  longitude: -75.08 }, // Eastern Cuba coast
      { latitude: 18.46,  longitude: -77.92 }, // Jamaica north coast
      { latitude: 25.05,  longitude: -77.34 }, // Nassau — home port
      { latitude: 32.78,  longitude: -79.93 }, // Charleston, South Carolina — blockade
      { latitude: 35.12,  longitude: -75.88 }, // Cape Hatteras, North Carolina
      { latitude: 35.12,  longitude: -76.04 }, // Ocracoke Inlet — final battle
    ],
    keyStops: [
      {
        label: 'Nassau, Bahamas',
        latitude: 25.05,
        longitude: -77.34,
        note: 'Nassau was the epicentre of the Golden Age of Piracy, home to over 2,000 pirates at its height and governed in name only. Blackbeard used its harbour as his main base of operations, carousing with fellow captains Benjamin Hornigold and Charles Vane. The Crown eventually sent Woodes Rogers to "clean up" Nassau in July 1718, forcing Blackbeard northward.',
        type: 'haven',
        year: 1717,
      },
      {
        label: 'Havana, Cuba',
        latitude: 23.14,
        longitude: -82.35,
        note: "Blackbeard prowled the shipping lanes west of Havana, targeting Spanish galleons loaded with silver and tobacco returning to Seville. The Gulf of Mexico exit was one of the most lucrative hunting grounds in the Caribbean. Though Spanish warships patrolled the route, Blackbeard's speed and aggression let him strike and vanish before any response could be mounted.",
        type: 'raid',
        year: 1717,
      },
      {
        label: 'Charleston, South Carolina',
        latitude: 32.78,
        longitude: -79.93,
        note: 'In May 1718, Blackbeard blockaded Charleston harbor for nearly a week with four ships, capturing nine vessels and taking several prominent citizens hostage. He sent a messenger ashore demanding a chest of medicine — threatening to execute the prisoners and send their heads to the governor if refused. The colony capitulated, making this one of the most brazen acts of piracy on the American colonial seaboard.',
        type: 'raid',
        year: 1718,
      },
      {
        label: 'Bath Town, North Carolina',
        latitude: 35.47,
        longitude: -76.81,
        note: "After running the Queen Anne's Revenge aground near Beaufort Inlet — possibly deliberately to shed his larger crew — Blackbeard accepted a royal pardon from North Carolina's governor Charles Eden. The two men reportedly struck a corrupt arrangement: Blackbeard would continue raiding and share plunder with Eden in exchange for protection. The arrangement lasted only months before complaints reached Virginia's governor.",
        type: 'haven',
        year: 1718,
      },
      {
        label: 'Ocracoke Inlet, North Carolina',
        latitude: 35.12,
        longitude: -76.04,
        note: "Ocracoke Island was Blackbeard's favourite anchorage — a shallow-water maze that large naval vessels could not easily navigate. On November 21, 1718, Lieutenant Robert Maynard of HMS Pearl arrived with two small sloops at dusk. At dawn on November 22 the battle began; Blackbeard's crew of 25 fought ferociously before the captain himself fell, reportedly taking five bullets and twenty sword wounds. His head was hung from the bowsprit of Maynard's sloop.",
        type: 'battle',
        year: 1718,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. BARBARY CORSAIRS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'barbary',
    name: 'Barbary Corsairs — Terror of the Mediterranean',
    era: 'Ottoman Corsair Era',
    period: '1500–1800',
    color: '#D97706',
    emoji: '⚔️',
    captain: 'Hayreddin Barbarossa (and later Murat Reis, Ali Bitchin, and others)',
    ship: 'Various Ottoman war galleys and xebecs',
    description:
      'Operating from the Barbary Coast of North Africa — principally Algiers, Tunis, and Tripoli — the corsairs were state-sponsored privateers who terrorised Mediterranean trade and coastal settlements for three centuries. At their height under Hayreddin Barbarossa, the corsairs functioned as the naval arm of the Ottoman Empire and defeated Spanish and Venetian fleets in open battle. Their reach eventually extended through the Strait of Gibraltar as far as Iceland.',
    notoriety:
      'Over their long history the Barbary corsairs enslaved an estimated one million Europeans, raiding coastlines from Spain and Italy to Ireland and Iceland. Entire Sicilian villages were emptied overnight; coastal populations in southern Europe abandoned their homes and built settlements inland to escape the threat. The corsairs also seized hundreds of Atlantic merchant vessels and extracted massive ransoms from European governments.',
    fate:
      'The corsairs were progressively suppressed by American naval action (First and Second Barbary Wars, 1801–1815), a combined Anglo-Dutch bombardment of Algiers in 1816, and finally the French conquest of Algeria beginning in 1830.',
    coordinates: [
      { latitude: 36.73,  longitude:   3.09 }, // Algiers — main base
      { latitude: 36.81,  longitude:  10.18 }, // Tunis
      { latitude: 32.90,  longitude:  13.18 }, // Tripoli
      { latitude: 37.50,  longitude:  12.65 }, // Sicilian Channel — hunting ground
      { latitude: 39.22,  longitude:   9.11 }, // Sardinia — frequent raids
      { latitude: 43.30,  longitude:   5.37 }, // Marseille approaches
      { latitude: 40.42,  longitude:  -3.70 }, // Spain (Madrid area coast proxy)
      { latitude: 36.14,  longitude:  -5.35 }, // Strait of Gibraltar
      { latitude: 32.65,  longitude: -16.90 }, // Madeira — Atlantic raids
      { latitude: 28.00,  longitude: -14.00 }, // Canary Islands approaches
      { latitude: 64.13,  longitude: -21.93 }, // Iceland — 1627 raid (Turkish Abductions)
    ],
    keyStops: [
      {
        label: 'Algiers, Algeria',
        latitude: 36.73,
        longitude: 3.09,
        note: 'Algiers was the capital of corsair power — a city whose economy ran almost entirely on piracy, slavery, and ransom. At its peak in the early 17th century, over 25,000 Christian slaves laboured in Algiers, and the city held more captive Europeans than all of sub-Saharan Africa combined. Hayreddin Barbarossa transformed it from a small Ottoman outpost into the mightiest naval base in the western Mediterranean.',
        type: 'base',
        year: 1516,
      },
      {
        label: 'Tunis, Tunisia',
        latitude: 36.81,
        longitude: 10.18,
        note: 'Tunis was the second great corsair city, home to the bey and his fleet of fast xebecs. Holy Roman Emperor Charles V captured Tunis in 1535, briefly ending corsair operations, but Barbarossa retook it and the corsairs returned stronger than ever. The great Tunisian admiral Dragut operated from here, raiding deep into the central Mediterranean and collaborating with the French against Habsburg Spain.',
        type: 'base',
        year: 1534,
      },
      {
        label: 'Sardinia',
        latitude: 39.22,
        longitude: 9.11,
        note: "Sardinia's coastal villages suffered some of the most devastating corsair raids in history. In 1616 Algerian corsairs sacked Bosa, carrying off hundreds of inhabitants. The island's southwestern coast, facing the open Tyrrhenian Sea, was so exposed that settlements were abandoned and the entire population retreated to fortified hilltop towns — a settlement pattern that persists to this day.",
        type: 'raid',
        year: 1616,
      },
      {
        label: 'Strait of Gibraltar',
        latitude: 36.14,
        longitude: -5.35,
        note: "In 1607 corsairs led by Simon de Danser — a renegade Flemish captain — became the first to bring oared galleys through the Strait into the Atlantic, opening an entirely new theater of operations. Within a decade, larger sailing corsair vessels were routinely raiding the Atlantic coasts of Portugal, Spain, France, Ireland, and Britain. The Strait became the gateway to a vastly expanded hunting ground.",
        type: 'hunting_ground',
        year: 1607,
      },
      {
        label: 'Madeira, Portugal',
        latitude: 32.65,
        longitude: -16.90,
        note: "Corsairs raided Madeira several times in the early 17th century, taking hundreds of islanders as slaves. The 1617 raid on Funchal, led by the Dutch renegade Jan Janszoon (Murat Reis the Younger), saw corsair ships boldly enter the main harbour and carry off over 1,200 captives in a single operation. Murat Reis later performed the most northerly corsair raid in history — on Iceland.",
        type: 'raid',
        year: 1617,
      },
      {
        label: "Westman Islands, Iceland",
        latitude: 63.44,
        longitude: -20.27,
        note: "In July 1627, Murat Reis led an extraordinary raid on the Vestmannaeyjar (Westman Islands) off Iceland — the most northerly corsair operation ever recorded. Over three days the corsairs killed 40 islanders and abducted 242 men, women, and children, transporting them to Algiers as slaves. The event entered Icelandic cultural memory as the \"Turkish Abductions\" (Tyrkjaránið) and is commemorated to this day.",
        type: 'raid',
        year: 1627,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. THE PIRATE ROUND — INDIAN OCEAN
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'pirate_round',
    name: 'The Pirate Round — Red Sea & Indian Ocean',
    era: 'Golden Age of Piracy',
    period: '1693–1710',
    color: '#DC2626',
    emoji: '🌊',
    captain: 'Henry Every ("Long Ben"), Thomas Tew, Robert Culliford, and others',
    ship: 'Fancy (Henry Every)',
    description:
      "The 'Pirate Round' was the long-haul circuit sailed by English and American pirates from Atlantic ports, around the Cape of Good Hope, to Madagascar and the Red Sea, then back again. Madagascar's St. Mary's Island (Île Sainte-Marie) served as the pirate republic of the Indian Ocean — a base from which crews ambushed the immensely rich Mughal treasure fleets sailing between India and the holy city of Mecca. A single successful voyage could make every man aboard wealthy for life.",
    notoriety:
      "Henry Every's 1695 capture of the Ganj-i-Sawai — a Mughal treasure ship returning from Mecca with Emperor Aurangzeb's own granddaughter aboard — was the most profitable single act of piracy in history. The haul was worth approximately £600,000 (over £100 million today). The attack so outraged the Mughal Emperor that he threatened to expel the East India Company from India, forcing the English government to hunt Every with unprecedented urgency.",
    fate:
      "Henry Every vanished after reaching the Bahamas and was never captured — becoming one of history's few pirates to retire on his plunder. The Pirate Round itself was broken up by the East India Company's increased naval patrols and the Royal Navy's anti-piracy campaigns around 1710.",
    coordinates: [
      { latitude: 51.45,  longitude:  -2.60 }, // Bristol / Plymouth, England
      { latitude: 28.47,  longitude: -13.78 }, // Canary Islands
      { latitude:  6.36,  longitude: -10.80 }, // Gulf of Guinea, West Africa
      { latitude:-33.92,  longitude:  18.42 }, // Cape of Good Hope
      { latitude:-17.55,  longitude:  49.87 }, // St. Mary's Island (Île Sainte-Marie), Madagascar
      { latitude:-20.10,  longitude:  57.55 }, // Réunion (then Île Bourbon)
      { latitude:-20.28,  longitude:  57.44 }, // Mauritius
      { latitude: 11.57,  longitude:  43.14 }, // Gulf of Aden / Bab-el-Mandeb Strait
      { latitude: 21.48,  longitude:  39.19 }, // Jeddah / Red Sea
      { latitude: 18.25,  longitude:  66.52 }, // Arabian Sea
      { latitude: 22.30,  longitude:  68.96 }, // Gulf of Kutch, India
      { latitude: 23.73,  longitude: -75.82 }, // Bahamas (Every's final destination)
    ],
    keyStops: [
      {
        label: "St. Mary's Island (Île Sainte-Marie), Madagascar",
        latitude: -17.00,
        longitude: 49.87,
        note: "St. Mary's Island — a sheltered natural harbour on Madagascar's northeast coast — was the de facto capital of piracy in the Indian Ocean. At its peak around 1700, over a thousand pirates lived here, trading plunder for supplies with local Malagasy chieftains who they married into. The legendary Libertalia, described in Captain Johnson's 1724 history as a pirate utopian republic, was supposedly located on Madagascar, though historians debate whether it was real or a romantic invention.",
        type: 'base',
        year: 1695,
      },
      {
        label: 'Réunion (Île Bourbon)',
        latitude: -21.11,
        longitude: 55.53,
        note: "Réunion was a victualling stop for Pirate Round vessels heading toward the Red Sea hunting grounds. The island's sheltered bays allowed careening — hauling a ship onto its side to scrape barnacles and repair the hull — essential maintenance before the long voyage north. Pirates traded plunder with French colonists here in defiance of French mercantilist law.",
        type: 'haven',
        year: 1696,
      },
      {
        label: 'Bab-el-Mandeb Strait, Gulf of Aden',
        latitude: 12.58,
        longitude: 43.43,
        note: "The Bab-el-Mandeb — 'Gate of Tears' in Arabic — was the choke point where all Indian Ocean shipping funnelled into the Red Sea toward Mecca. Thomas Tew pioneered this strategy in 1693, realising that Mughal pilgrim fleets (the hajj convoys) passed through twice a year laden with treasure. A single frigate lurking at the straits could intercept ships worth millions. Every replicated Tew's plan with far greater success in 1695.",
        type: 'hunting_ground',
        year: 1695,
      },
      {
        label: 'Surat, India (Capture of Ganj-i-Sawai)',
        latitude: 21.17,
        longitude: 72.83,
        note: "On August 7, 1695, Henry Every's Fancy intercepted the Ganj-i-Sawai — the largest ship in the Mughal fleet — off the Indian coast near Surat. After a fierce battle the pirates boarded the vessel and committed atrocities against the passengers before making off with an unimaginable haul: chests of gold and silver, jewels, and fine cloth worth an estimated £600,000. The Mughal Emperor was so furious he imprisoned East India Company officials in Surat and threatened to end all English trade in India.",
        type: 'raid',
        year: 1695,
      },
      {
        label: 'Cape of Good Hope, South Africa',
        latitude: -33.92,
        longitude: 18.42,
        note: "Rounding the Cape of Good Hope was the great ordeal of the Pirate Round — weeks of violent seas, freezing temperatures, and constant risk of shipwreck in the 'Cape of Storms.' Pirates often stopped at Cape Town's Dutch settlement to reprovision, bribing VOC (Dutch East India Company) officials or trading plunder for supplies. The Cape was both the entry and exit gate to the Indian Ocean world.",
        type: 'haven',
        year: 1694,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. ZHENG YI SAO — SOUTH CHINA SEA
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'zheng_yi_sao',
    name: "Zheng Yi Sao — Mistress of the South China Sea",
    era: 'Chinese Piracy Golden Age',
    period: '1807–1810',
    color: '#BE185D',
    emoji: '🐉',
    captain: 'Zheng Yi Sao (Shek Yeung / Ching Shih)',
    ship: 'Red Flag Fleet (1,800 junks)',
    description:
      "Zheng Yi Sao — 'Wife of Zheng Yi' — rose from a Guangzhou pleasure boat to command the largest pirate organisation in human history. After her husband's death in 1807, she took full command of the Red Flag Fleet, which at its height comprised 1,800 ships, 400 large junks, and over 80,000 men and women. She imposed a strict legal code on her fleet — looting without permission was punishable by death — and created a proto-state that taxed coastal villages as tribute.",
    notoriety:
      "Zheng Yi Sao humiliated every power that opposed her. In 1809 her fleet destroyed a Portuguese squadron that dared to engage her near Macau. The combined Chinese Imperial Navy and allied British and Portuguese forces failed repeatedly to defeat her. She controlled the Pearl River Delta so completely that coastal commerce ground to a halt and merchant ships required her permission — and paid tribute — to operate.",
    fate:
      "In 1810, with no military force capable of defeating her, the Qing government offered a stunning peace deal: Zheng Yi Sao could keep all her plunder, her men would receive pardons, and her lieutenant Zhang Bao (whom she had married) would be given a naval commission. She accepted, retired fabulously wealthy, opened a gambling house, and died at 69 in 1844 — one of the very few great pirates to die peacefully of old age.",
    coordinates: [
      { latitude: 23.13,  longitude: 113.26 }, // Guangzhou (Canton)
      { latitude: 22.20,  longitude: 113.55 }, // Macau
      { latitude: 22.25,  longitude: 114.17 }, // Hong Kong / Lantau Island
      { latitude: 21.03,  longitude: 110.35 }, // Leizhou Peninsula, Guangdong
      { latitude: 20.03,  longitude: 110.35 }, // Hainan Island
      { latitude: 18.33,  longitude: 109.52 }, // Southern Hainan
      { latitude: 17.47,  longitude: 107.10 }, // Quảng Bình, Vietnam coast
      { latitude: 20.87,  longitude: 106.68 }, // Hải Phòng, Vietnam
      { latitude: 21.50,  longitude: 108.05 }, // Gulf of Tonkin
      { latitude: 22.32,  longitude: 114.17 }, // Return — Hong Kong area
      { latitude: 22.20,  longitude: 113.55 }, // Macau — final base
    ],
    keyStops: [
      {
        label: 'Guangzhou (Canton), China',
        latitude: 23.13,
        longitude: 113.26,
        note: "Guangzhou was the commercial heart of southern China and the focal point of Zheng Yi Sao's taxation network. She didn't just raid merchant ships — she extorted the entire regional economy, demanding protection payments from fishing villages, salt merchants, and river traders. Merchants who refused faced destruction; those who paid received official Red Flag Fleet passes guaranteeing safe passage. Her operation was as much a parallel government as a pirate fleet.",
        type: 'base',
        year: 1807,
      },
      {
        label: 'Macau',
        latitude: 22.20,
        longitude: 113.55,
        note: "In September 1809, a Portuguese squadron of two frigates and two brigs sailed out of Macau to engage the Red Flag Fleet — and was utterly destroyed. Zheng Yi Sao's junks, though individually smaller, were brilliantly handled and vastly more numerous; the Portuguese lost two ships and were forced to withdraw in humiliation. The defeat shocked European powers and demonstrated that Chinese piracy could resist Western naval firepower.",
        type: 'battle',
        year: 1809,
      },
      {
        label: 'Lantau Island (Tai O), Hong Kong',
        latitude: 22.25,
        longitude: 113.86,
        note: "Lantau Island's sheltered western coast — the area around the stilt-house fishing village of Tai O — served as a key anchorage for the Red Flag Fleet. The labyrinthine Pearl River Delta with its hundreds of islands, channels, and inlets was the perfect environment for a large shallow-draft fleet, providing both hiding places and rapid access to major shipping lanes. Qing naval vessels avoided entering these waters after repeated failed ambushes.",
        type: 'base',
        year: 1808,
      },
      {
        label: 'Hải Phòng, Vietnam',
        latitude: 20.87,
        longitude: 106.68,
        note: "Zheng Yi Sao extended operations deep into Vietnamese waters, raiding coastal settlements and preying on Vietnamese junks trading between the Gulf of Tonkin ports. The Vietnamese Nguyen dynasty, newly consolidated after defeating the Tây Sơn rebels, could do little to stop her. Her presence in Vietnamese waters demonstrated the Red Flag Fleet's ability to project power far beyond its Guangdong home base.",
        type: 'raid',
        year: 1809,
      },
      {
        label: 'Pearl River Delta — Battle of Tiger Island',
        latitude: 22.50,
        longitude: 113.65,
        note: "In the winter of 1809–1810, the Qing government assembled its largest ever anti-piracy coalition: Chinese imperial warships, Portuguese frigates, and English East India Company vessels. The combined fleet attempted to blockade Zheng Yi Sao in the Pearl River Delta. The effort failed catastrophically when her fleet broke through the blockade, destroyed several government vessels, and slipped away. It was this demonstration of total military invulnerability that prompted the Qing to offer peace terms.",
        type: 'battle',
        year: 1810,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. CALICO JACK, ANNE BONNY & MARY READ
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'calico_jack',
    name: "Calico Jack — The Pirates of Nassau",
    era: 'Golden Age of Piracy',
    period: '1718–1720',
    color: '#7C3AED',
    emoji: '🏴',
    captain: 'Jack Rackham ("Calico Jack"), Anne Bonny, and Mary Read',
    ship: 'William (sloop)',
    description:
      "John Rackham — nicknamed 'Calico Jack' for his fondness for calico cotton clothing — is remembered less for his plundering than for his remarkable crew. Among his small band of pirates were Anne Bonny, his lover who left her husband to sail with him, and Mary Read, who disguised herself as a man. The three made their names in the waters of the Bahamas, Cuba, Jamaica, and Hispaniola aboard the small but swift sloop William.",
    notoriety:
      "Calico Jack's crew is historically unique for including two women — Anne Bonny and Mary Read — who by all contemporary accounts fought with ferocity that shamed their male crewmates. When British privateers finally captured the sloop at Point Negril, most of the male crew were reportedly too drunk to fight; it was Bonny and Read who held off the attackers while the men hid below decks.",
    fate:
      "On October 22, 1720, pirate hunter Jonathan Barnet caught Calico Jack's sloop at Dry Harbour Bay near Point Negril, Jamaica. Most of the crew was drunk on rum; Rackham himself was captured without a fight. He was hanged at Port Royal on November 18, 1720. Anne Bonny, pregnant, received a stay of execution and her fate remains unknown. Mary Read died of fever in prison before she could be executed.",
    coordinates: [
      { latitude: 25.05,  longitude: -77.34 }, // Nassau, Bahamas — starting point
      { latitude: 24.00,  longitude: -74.50 }, // Exumas, Bahamas — petty theft of sloop
      { latitude: 20.45,  longitude: -75.16 }, // East Cuba coast
      { latitude: 23.14,  longitude: -82.35 }, // Havana approaches — fishing vessels raided
      { latitude: 21.00,  longitude: -79.50 }, // Southern Cuba — careenage
      { latitude: 17.99,  longitude: -76.79 }, // Kingston, Jamaica
      { latitude: 17.72,  longitude: -77.80 }, // Negril, Jamaica — Point Negril capture
      { latitude: 17.93,  longitude: -76.84 }, // Port Royal, Jamaica — execution site
      { latitude: 18.54,  longitude: -72.34 }, // Hispaniola north coast — raiding
      { latitude: 20.45,  longitude: -75.16 }, // Eastern Cuba approaches
    ],
    keyStops: [
      {
        label: 'Nassau, Bahamas',
        latitude: 25.05,
        longitude: -77.34,
        note: "Calico Jack and Anne Bonny's story began at Nassau in the summer of 1718. Anne was the wife of small-time pirate James Bonny, but she fell passionately for Rackham while he was carousing in Nassau's waterfront taverns. When newly arrived Governor Woodes Rogers threatened to crack down on piracy, Rackham stole a sloop from the harbour in the dead of night — with Anne aboard — and fled into the open sea. It was a romantically bold escape that set the tone for his brief career.",
        type: 'haven',
        year: 1718,
      },
      {
        label: 'Havana, Cuba (approaches)',
        latitude: 23.14,
        longitude: -82.35,
        note: "Calico Jack's fleet was modest compared to Blackbeard or Bartholomew Roberts — typically a single sloop and a crew of two dozen. He preyed mostly on small fishing vessels and coastal traders in Cuban and Jamaican waters, stealing catches of fish, nets, and small goods rather than Spanish silver. One of his captures near Havana was two English sloops from which he conscripted experienced sailors, including the disguised Mary Read, into his crew.",
        type: 'raid',
        year: 1719,
      },
      {
        label: 'Hispaniola (northern coast)',
        latitude: 19.93,
        longitude: -72.69,
        note: "The northern coast of Hispaniola offered Calico Jack shallow anchorages, ample fresh water, and proximity to the rich shipping lanes between Jamaica and Europe. His crew careened the sloop on isolated beaches to remove weed and barnacles from the hull, traded with local fishermen, and raided coastal settlements for provisions. It was in these waters that Mary Read's true sex was reportedly first revealed to crewmates, though accounts conflict.",
        type: 'haven',
        year: 1719,
      },
      {
        label: 'Dry Harbour Bay, Jamaica (Point Negril)',
        latitude: 18.37,
        longitude: -78.36,
        note: "On October 22, 1720, pirate hunter Captain Jonathan Barnet found the William anchored at Dry Harbour Bay near Negril Point, Jamaica. The crew was celebrating with rum; when Barnet's armed sloop fired a swivel gun across the bow, most of the pirates scrambled below decks. According to trial testimony, it was Anne Bonny and Mary Read — and one other man — who stood on deck and fought while the rest cowered. Read shouted down the hatch, cursing her crewmates as cowards.",
        type: 'battle',
        year: 1720,
      },
      {
        label: 'Port Royal, Jamaica',
        latitude: 17.93,
        longitude: -76.84,
        note: "Port Royal was the site of Calico Jack's trial and execution. Once the most notorious pirate haven in the Americas, Port Royal had been partially destroyed by an earthquake and tidal wave in 1692 and was now a centre of British colonial justice. Rackham was hanged on November 18, 1720; his body was then displayed in a gibbet cage at the entrance to Kingston Harbour as a warning to sailors. Anne Bonny reportedly visited him before the execution and told him he died like a dog.",
        type: 'battle',
        year: 1720,
      },
    ],
  },
];
