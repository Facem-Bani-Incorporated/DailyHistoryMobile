// components/MapScreen.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIC MAP — Country clusters at world zoom, city markers when zoomed in
// Uses event.location field directly from DB ("City, Country")
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Book,
  Calendar,
  Castle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle as CircleIcon,
  Clock,
  Crown,
  Globe2,
  Layers,
  Lock,
  MapPin,
  Navigation,
  Swords,
  Thermometer,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  LayoutAnimation,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import MapView, { Circle, Marker, Polygon, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { EMPIRE_BORDERS } from '../data/empireBorders';
import { EXPLORER_ROUTES } from '../data/explorerRoutes';
import { FAMOUS_BATTLES, FamousBattle } from '../data/famousBattles';
import { ANCIENT_CITIES, AncientCity } from '../data/ancientCities';
import { TRADE_ROUTES } from '../data/tradeRoutes';
import { RELIGIONS, Religion } from '../data/religionSpread';
import { WW1_EVENTS, WW1_YEAR_MIN, WW1_YEAR_MAX } from '../data/ww1Events';
import { WW2_EVENTS, WW2_YEAR_MIN, WW2_YEAR_MAX } from '../data/ww2Events';
import { WAR_TERRITORIES } from '../data/warTerritories';
import { PANDEMICS, PLAGUE_YEAR_MIN, PLAGUE_YEAR_MAX } from '../data/plagues';
import { PIRATE_ROUTES } from '../data/pirateRoutes';
import { NUCLEAR_SITES, NUCLEAR_EVENTS } from '../data/nuclearTests';
import { DINOSAUR_SITES } from '../data/dinosaurFossils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useAllEvents } from '../context/AllEventsContext';
import { haptic } from '../utils/haptics';
import { extractLocation } from '../utils/locationExtractor';
import { GameIcon } from '../utils/GameIcon';
import { StoryModal } from './StoryModal';
import { useRewardedUnlock } from '../hooks/useRewardedUnlock';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental)
  UIManager.setLayoutAnimationEnabledExperimental(true);

const { width: W, height: H } = Dimensions.get('window');
const SHEET_CLOSED = 0;
const SHEET_HALF = H * 0.5;
const SHEET_FULL = H * 0.88;

// latitudeDelta threshold: above = world view (clusters), below = city view (individual)
const ZOOM_CLUSTER_THRESHOLD = 35;

// Local-storage cache so the map opens instantly on subsequent app launches
const MAP_CACHE_KEY = 'map_events_v1';
const MAP_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

const INIT_REGION: Region = {
  latitude: 30,
  longitude: 15,
  latitudeDelta: 100,
  longitudeDelta: 120,
};
const INIT_CAM = {
  center: { latitude: 30, longitude: 15 },
  pitch: 0,
  heading: 0,
  altitude: 20000000,
  zoom: 1.5,
};

// ─── Era presets for time slider ───────────────────────────────────────────────
const ERA_PRESETS = [
  { label: 'Ancient', year: 500 },
  { label: 'Medieval', year: 1400 },
  { label: 'Renaissance', year: 1700 },
  { label: 'Industrial', year: 1900 },
  { label: 'Modern', year: 2024 },
];

// ─── War phase narratives (per year, all 5 languages) ─────────────────────────
type PhaseEntry = { name: string; description: string; stat: string };
const WW1_PHASES: Record<number, Record<string, PhaseEntry>> = {
  1914: {
    en: { name: 'Opening Moves', description: "Europe's alliance system triggers a chain reaction. Germany's Schlieffen Plan collapses at the Marne. The war meant to end by Christmas will last four years.", stat: '~2 million casualties in 5 months' },
    ro: { name: 'Primele Mișcări', description: "Sistemul de alianțe al Europei declanșează o reacție în lanț. Planul Schlieffen al Germaniei eșuează la Marna. Războiul care trebuia să se termine de Crăciun va dura patru ani.", stat: '~2 milioane de victime în 5 luni' },
    fr: { name: 'Les Premiers Coups', description: "Le système d'alliances européen déclenche une réaction en chaîne. Le Plan Schlieffen allemand s'effondre sur la Marne. La guerre censée se terminer à Noël durera quatre ans.", stat: '~2 millions de victimes en 5 mois' },
    de: { name: 'Die Eröffnungszüge', description: "Europas Bündnissystem löst eine Kettenreaktion aus. Deutschlands Schlieffen-Plan scheitert an der Marne. Der Krieg, der zu Weihnachten enden sollte, dauert vier Jahre.", stat: '~2 Millionen Opfer in 5 Monaten' },
    es: { name: 'Los Primeros Movimientos', description: "El sistema de alianzas europeo desencadena una reacción en cadena. El Plan Schlieffen alemán colapsa en el Marne. La guerra que debía terminar en Navidad durará cuatro años.", stat: '~2 millones de bajas en 5 meses' },
  },
  1915: {
    en: { name: 'Deadlock', description: "Trenches stretch 700 km from Belgium to Switzerland. The Gallipoli campaign ends in disaster. Poison gas is used for the first time in history.", stat: 'Trench line: 700 km across Europe' },
    ro: { name: 'Blocaj', description: "Tranșeele se întind pe 700 km de la Belgia până în Elveția. Campania de la Gallipoli se încheie în dezastru. Gazul otrăvitor este folosit pentru prima dată în istorie.", stat: 'Linia tranșeelor: 700 km prin Europa' },
    fr: { name: 'L\'Enlisement', description: "Les tranchées s'étendent sur 700 km de la Belgique à la Suisse. La campagne des Dardanelles se termine en catastrophe. Le gaz toxique est utilisé pour la première fois dans l'histoire.", stat: 'Front de tranchées : 700 km' },
    de: { name: 'Stellungskrieg', description: "Schützengräben erstrecken sich über 700 km von Belgien bis zur Schweiz. Die Gallipoli-Kampagne endet in einer Katastrophe. Giftgas wird zum ersten Mal in der Geschichte eingesetzt.", stat: 'Schützengrabenfront: 700 km' },
    es: { name: 'Punto Muerto', description: "Las trincheras se extienden 700 km desde Bélgica hasta Suiza. La campaña de Gallipoli termina en desastre. El gas venenoso se usa por primera vez en la historia.", stat: 'Línea de trincheras: 700 km' },
  },
  1916: {
    en: { name: 'War of Attrition', description: "The bloodiest year of the war. Verdun and the Somme become symbols of industrial slaughter. The naval Battle of Jutland settles North Sea dominance.", stat: 'Verdun + Somme: 2 million+ casualties' },
    ro: { name: 'Război de Uzură', description: "Cel mai sângeros an al războiului. Verdun și Somme devin simboluri ale măcelului industrial. Bătălia navală de la Jutlanda stabilește dominanța asupra Mării Nordului.", stat: 'Verdun + Somme: peste 2 milioane de victime' },
    fr: { name: 'Guerre d\'Usure', description: "L'année la plus sanglante de la guerre. Verdun et la Somme deviennent des symboles du massacre industriel. La bataille navale du Jutland établit la domination en mer du Nord.", stat: 'Verdun + Somme : 2 millions+ de victimes' },
    de: { name: 'Abnutzungskrieg', description: "Das blutigste Jahr des Krieges. Verdun und die Somme werden zu Symbolen des industriellen Gemetzels. Die Seeschlacht vor dem Skagerrak klärt die Vorherrschaft in der Nordsee.", stat: 'Verdun + Somme: 2 Millionen+ Opfer' },
    es: { name: 'Guerra de Desgaste', description: "El año más sangriento de la guerra. Verdún y el Somme se convierten en símbolos de la matanza industrial. La batalla naval de Jutlandia establece el dominio del Mar del Norte.", stat: 'Verdún + Somme: 2 millones+ de bajas' },
  },
  1917: {
    en: { name: 'Turning Point', description: "The USA enters the war. Russia collapses into revolution and exits. Widespread mutinies shake the French army. The tide begins to turn.", stat: 'USA deploys 2 million troops' },
    ro: { name: 'Punct de Cotitură', description: "SUA intră în război. Rusia se prăbușește în revoluție și iese. Revoltele generalizate zguduie armata franceză. Valul începe să se întoarcă.", stat: 'SUA desfășoară 2 milioane de trupe' },
    fr: { name: 'Le Tournant', description: "Les États-Unis entrent en guerre. La Russie s'effondre dans la révolution et se retire. De nombreuses mutineries secouent l'armée française. Le vent commence à tourner.", stat: 'Les USA déploient 2 millions de soldats' },
    de: { name: 'Die Wende', description: "Die USA treten in den Krieg ein. Russland bricht in der Revolution zusammen und scheidet aus. Weitverbreitete Meutereien erschüttern die französische Armee. Das Blatt beginnt sich zu wenden.", stat: 'USA stellen 2 Millionen Soldaten bereit' },
    es: { name: 'Punto de Inflexión', description: "EE.UU. entra en la guerra. Rusia colapsa en revolución y se retira. Los amotinamientos generalizados sacuden al ejército francés. La marea comienza a cambiar.", stat: 'EE.UU. despliega 2 millones de soldados' },
  },
  1918: {
    en: { name: 'The Final Year', description: "Germany's Spring Offensive gains ground then fails. The Allied 100 Days Offensive shatters German lines. At 11 AM on November 11, the guns fall silent.", stat: 'Armistice: November 11 — 11:11 AM' },
    ro: { name: 'Ultimul An', description: "Ofensiva de Primăvară a Germaniei câștigă teren, apoi eșuează. Ofensiva celor 100 de Zile a Aliaților sfărâmă liniile germane. La ora 11 pe 11 noiembrie, armele amuțesc.", stat: 'Armistițiu: 11 noiembrie — 11:11' },
    fr: { name: 'L\'Année Finale', description: "L'offensive de printemps allemande gagne du terrain puis échoue. L'offensive des Cent Jours des Alliés brise les lignes allemandes. À 11h le 11 novembre, les canons se taisent.", stat: 'Armistice : 11 novembre — 11h11' },
    de: { name: 'Das Letzte Jahr', description: "Deutschlands Frühjahrsoffensive gewinnt zunächst Boden, scheitert dann. Die Hundert-Tage-Offensive der Alliierten zerschlägt die deutschen Linien. Um 11 Uhr am 11. November verstummen die Waffen.", stat: 'Waffenstillstand: 11. November — 11:11 Uhr' },
    es: { name: 'El Año Final', description: "La Ofensiva de Primavera alemana gana terreno pero fracasa. La Ofensiva de los Cien Días de los Aliados destruye las líneas alemanas. A las 11 AM del 11 de noviembre, los cañones callan.", stat: 'Armisticio: 11 de noviembre — 11:11 AM' },
  },
};

const WW2_PHASES: Record<number, Record<string, PhaseEntry>> = {
  1939: {
    en: { name: 'Blitzkrieg', description: "Germany's lightning war doctrine reshapes warfare. Poland falls in five weeks. Britain and France declare war. The Soviet Union invades Finland.", stat: 'Poland conquered in 5 weeks' },
    ro: { name: 'Blitzkrieg', description: "Doctrina războiului fulger a Germaniei redefinește războiul modern. Polonia cade în cinci săptămâni. Marea Britanie și Franța declară război. Uniunea Sovietică invadează Finlanda.", stat: 'Polonia cucerită în 5 săptămâni' },
    fr: { name: 'Blitzkrieg', description: "La doctrine de la guerre éclair allemande révolutionne la guerre. La Pologne tombe en cinq semaines. La Grande-Bretagne et la France déclarent la guerre. L'URSS envahit la Finlande.", stat: 'Pologne conquise en 5 semaines' },
    de: { name: 'Blitzkrieg', description: "Deutschlands Blitzkrieg-Doktrin revolutioniert die Kriegsführung. Polen fällt in fünf Wochen. Großbritannien und Frankreich erklären den Krieg. Die Sowjetunion überfällt Finnland.", stat: 'Polen in 5 Wochen besiegt' },
    es: { name: 'Blitzkrieg', description: "La doctrina de guerra relámpago alemana remodela la guerra moderna. Polonia cae en cinco semanas. Gran Bretaña y Francia declaran la guerra. La Unión Soviética invade Finlandia.", stat: 'Polonia conquistada en 5 semanas' },
  },
  1940: {
    en: { name: 'Axis Dominance', description: "France falls in six weeks — faster than anyone predicted. Dunkirk saves 338,000 troops. The Battle of Britain is the first major air campaign in history.", stat: '2,900 aircraft clash over Britain' },
    ro: { name: 'Dominația Axei', description: "Franța cade în șase săptămâni — mai rapid decât oricine prevăzuse. Dunkerque salvează 338.000 de soldați. Bătălia Angliei este prima mare campanie aeriană din istorie.", stat: '2.900 de avioane se înfruntă deasupra Marii Britanii' },
    fr: { name: 'Domination de l\'Axe', description: "La France tombe en six semaines — plus vite que prévu. Dunkerque sauve 338 000 soldats. La Bataille d'Angleterre est la première grande campagne aérienne de l'histoire.", stat: '2 900 avions s\'affrontent au-dessus de la Grande-Bretagne' },
    de: { name: 'Achsenherrschaft', description: "Frankreich fällt in sechs Wochen — schneller als jeder erwartet hatte. Dünkirchen rettet 338.000 Soldaten. Die Luftschlacht um England ist die erste große Luftkampagne der Geschichte.", stat: '2.900 Flugzeuge kämpfen über Großbritannien' },
    es: { name: 'Dominio del Eje', description: "Francia cae en seis semanas — más rápido de lo que nadie predijo. Dunkerque salva a 338.000 soldados. La Batalla de Gran Bretaña es la primera gran campaña aérea de la historia.", stat: '2.900 aviones chocan sobre Gran Bretaña' },
  },
  1941: {
    en: { name: 'Global War', description: "Operation Barbarossa opens the largest front in history: 3,000 km. Japan attacks Pearl Harbor, bringing the USA into a truly global conflict.", stat: '3 million German troops cross into USSR' },
    ro: { name: 'Război Global', description: "Operațiunea Barbarossa deschide cel mai lung front din istorie: 3.000 km. Japonia atacă Pearl Harbor, atrăgând SUA într-un conflict cu adevărat global.", stat: '3 milioane de trupe germane invadează URSS' },
    fr: { name: 'Guerre Mondiale', description: "L'opération Barbarossa ouvre le plus grand front de l'histoire : 3 000 km. Le Japon attaque Pearl Harbor, entraînant les États-Unis dans un conflit véritablement mondial.", stat: '3 millions de soldats allemands entrent en URSS' },
    de: { name: 'Weltkrieg', description: "Operation Barbarossa eröffnet die größte Front der Geschichte: 3.000 km. Japan greift Pearl Harbor an und zieht die USA in einen wahrhaft globalen Konflikt.", stat: '3 Millionen deutsche Soldaten marschieren in die UdSSR ein' },
    es: { name: 'Guerra Global', description: "La Operación Barbarroja abre el frente más largo de la historia: 3.000 km. Japón ataca Pearl Harbor, arrastrando a EE.UU. a un conflicto verdaderamente global.", stat: '3 millones de tropas alemanas cruzan hacia la URSS' },
  },
  1942: {
    en: { name: 'The Turning Points', description: "Three battles shift momentum forever: Stalingrad, El Alamein, and Midway. The Axis has reached its maximum territorial extent — and begins to recede.", stat: '800,000 Axis troops lost at Stalingrad' },
    ro: { name: 'Punctele de Cotitură', description: "Trei bătălii schimbă definitiv cursul războiului: Stalingrad, El Alamein și Midway. Axa a atins extinderea teritorială maximă — și începe să se retragă.", stat: '800.000 de trupe ale Axei pierdute la Stalingrad' },
    fr: { name: 'Les Tournants', description: "Trois batailles changent le cours de la guerre : Stalingrad, El-Alamein et Midway. L'Axe a atteint son extension territoriale maximale — et commence à reculer.", stat: '800 000 soldats de l\'Axe perdus à Stalingrad' },
    de: { name: 'Die Wendepunkte', description: "Drei Schlachten verändern den Kriegsverlauf dauerhaft: Stalingrad, El Alamein und Midway. Die Achse hat ihre maximale territoriale Ausdehnung erreicht — und beginnt zurückzuweichen.", stat: '800.000 Achsensoldaten in Stalingrad verloren' },
    es: { name: 'Los Puntos de Inflexión', description: "Tres batallas cambian el impulso para siempre: Stalingrado, El Alamein y Midway. El Eje ha alcanzado su máxima extensión territorial — y comienza a retroceder.", stat: '800.000 tropas del Eje perdidas en Stalingrado' },
  },
  1943: {
    en: { name: 'Allied Advance', description: "Sicily falls, Italy switches sides. The Battle of Kursk — the largest tank battle in history — permanently breaks German offensive power in the East.", stat: '6,000 tanks clash at Kursk' },
    ro: { name: 'Avansul Aliaților', description: "Sicilia cade, Italia schimbă tabăra. Bătălia de la Kursk — cea mai mare bătălie de tancuri din istorie — distruge definitiv puterea ofensivă germană la Est.", stat: '6.000 de tancuri se înfruntă la Kursk' },
    fr: { name: 'L\'Avancée Alliée', description: "La Sicile tombe, l'Italie change de camp. La Bataille de Koursk — la plus grande bataille de chars de l'histoire — brise définitivement la puissance offensive allemande à l'Est.", stat: '6 000 chars s\'affrontent à Koursk' },
    de: { name: 'Alliierter Vormarsch', description: "Sizilien fällt, Italien wechselt die Seiten. Die Panzerschlacht von Kursk — die größte Panzerschlacht der Geschichte — bricht die deutsche Angriffskraft im Osten dauerhaft.", stat: '6.000 Panzer kämpfen bei Kursk' },
    es: { name: 'Avance Aliado', description: "Sicilia cae, Italia cambia de bando. La Batalla de Kursk — la mayor batalla de tanques de la historia — rompe permanentemente el poder ofensivo alemán en el Este.", stat: '6.000 tanques chocan en Kursk' },
  },
  1944: {
    en: { name: 'Liberation', description: "D-Day opens the Western Front. Paris is liberated. The Red Army surges westward. Germany fights a desperate two-front war it cannot win.", stat: '156,000 troops land on D-Day' },
    ro: { name: 'Eliberarea', description: "Ziua Z deschide Frontul de Vest. Parisul este eliberat. Armata Roșie înaintează spre vest. Germania luptă un război disperat pe două fronturi pe care nu îl poate câștiga.", stat: '156.000 de soldați debarcă în Ziua Z' },
    fr: { name: 'La Libération', description: "Le Débarquement ouvre le front occidental. Paris est libéré. L'Armée rouge avance vers l'ouest. L'Allemagne mène une guerre désespérée sur deux fronts qu'elle ne peut pas gagner.", stat: '156 000 soldats débarquent le Jour J' },
    de: { name: 'Befreiung', description: "D-Day eröffnet die Westfront. Paris wird befreit. Die Rote Armee drängt westwärts. Deutschland kämpft einen verzweifelten Zweifrontenkrieg, den es nicht gewinnen kann.", stat: '156.000 Soldaten landen am D-Day' },
    es: { name: 'La Liberación', description: "El Día D abre el Frente Occidental. París es liberado. El Ejército Rojo avanza hacia el oeste. Alemania lucha una desesperada guerra en dos frentes que no puede ganar.", stat: '156.000 soldados desembarcan en el Día D' },
  },
  1945: {
    en: { name: 'Victory', description: "Berlin falls on May 2nd. VE Day ends the war in Europe. Atomic bombs force Japan's surrender. The deadliest conflict in human history is over.", stat: 'Total dead: estimated 70–85 million' },
    ro: { name: 'Victoria', description: "Berlinul cade pe 2 mai. Ziua Victoriei în Europa pune capăt războiului pe continent. Bombele atomice forțează capitularea Japoniei. Cel mai mortal conflict din istoria omenirii s-a încheiat.", stat: 'Total morți: estimat 70–85 milioane' },
    fr: { name: 'La Victoire', description: "Berlin tombe le 2 mai. Le Jour de la Victoire met fin à la guerre en Europe. Les bombes atomiques forcent la capitulation du Japon. Le conflit le plus meurtrier de l'histoire humaine est terminé.", stat: 'Total des morts : 70–85 millions estimés' },
    de: { name: 'Sieg', description: "Berlin fällt am 2. Mai. Der VE Day beendet den Krieg in Europa. Atombomben erzwingen Japans Kapitulation. Der tödlichste Konflikt der Menschheitsgeschichte ist vorbei.", stat: 'Gesamtverluste: geschätzt 70–85 Millionen' },
    es: { name: 'Victoria', description: "Berlín cae el 2 de mayo. El Día de la Victoria en Europa termina la guerra en Europa. Las bombas atómicas fuerzan la rendición de Japón. El conflicto más mortífero de la historia humana termina.", stat: 'Total de muertos: estimados 70–85 millones' },
  },
};

// ─── i18n ──────────────────────────────────────────────────────────────────────
const T: Record<string, Record<string, string>> = {
  en: {
    loading: 'Loading...',
    events_across: 'events across',
    countries: 'countries',
    no_events: 'No events found',
    events: 'events',
    categories: 'categories',
    back_to_world: 'World View',
    war_conflict: 'Wars & Conflicts',
    tech_innovation: 'Technology',
    science_discovery: 'Science',
    politics_state: 'Politics',
    culture_arts: 'Culture & Arts',
    natural_disaster: 'Natural Disasters',
    exploration: 'Exploration',
    religion_phil: 'Religion',
    personalities: 'Personalities',
    media: 'Media',
    sport: 'Sport',
    tap_to_explore: 'Tap a marker to explore',
    read_more: 'Read Full Story',
    close: 'Close',
    zoom_hint: 'Zoom in to see city markers',
    time_filter: 'Time Filter',
    heat_map: 'Heat Map',
    empires: 'Empires',
    routes: 'Routes',
    battles: 'Famous Battles',
    cities: 'Ancient Cities',
    trade: 'Trade Routes',
    religion: 'Religion Spread',
    all_time: 'All Time',
    phase: 'Phase',
    attacker: 'Attacker',
    defender: 'Defender',
    outcome: 'Outcome',
    significance: 'Significance',
    casualties: 'Casualties',
    // Layer descriptions
    layer_time_desc: 'Explore events through time',
    layer_heatmap_desc: 'Density of historical events',
    layer_empires_desc: 'great empires at peak',
    layer_routes_desc: 'legendary voyages',
    layer_battles_desc: 'famous battles with phases',
    layer_cities_desc: 'great ancient cities',
    layer_trade_desc: 'historical trade routes',
    layer_religion_desc: '4 world religions spreading through time',
    layer_ww_battles: 'battles & key events',
    layer_plagues: '🦠 Plagues',
    layer_plagues_desc: 'pandemics spreading through history',
    layer_pirates: '🏴‍☠️ Pirates',
    layer_pirates_desc: 'legendary pirate routes',
    layer_nuclear: '☢️ Nuclear / Cold War',
    layer_nuclear_desc_sites: 'test sites',
    layer_nuclear_desc_events: 'events',
    layer_dinosaurs: '🦕 Dinosaur Fossils',
    layer_dinosaurs_desc: 'sites across 3 eras',
    clear_layer: 'Clear layer',
    // Plague UI
    plague_move_slider: 'Move slider to see spread',
    plague_select_hint: 'Select a pandemic above, then use the slider to watch it spread',
    // Nuclear UI
    nuclear_tests: 'tests',
    nuclear_max: 'Max',
    // Dinosaur UI
    era_triassic: 'Triassic',
    era_jurassic: 'Jurassic',
    era_cretaceous: 'Cretaceous',
    origin: 'Origin',
    // WW alliances
    central_powers: 'Central Powers',
    axis_powers: 'Axis Powers',
    allied: 'Allied',
    // City status
    city_active: '🏙 Active',
    city_ruins: '🏚 Ruins',
    city_lost: '❓ Lost',
    city_submerged: '🌊 Submerged',
  },
  ro: {
    loading: 'Se încarcă...',
    events_across: 'evenimente în',
    countries: 'țări',
    no_events: 'Niciun eveniment',
    events: 'evenimente',
    categories: 'categorii',
    back_to_world: 'Vedere globală',
    war_conflict: 'Războaie',
    tech_innovation: 'Tehnologie',
    science_discovery: 'Știință',
    politics_state: 'Politică',
    culture_arts: 'Cultură',
    natural_disaster: 'Dezastre',
    exploration: 'Explorare',
    religion_phil: 'Religie',
    personalities: 'Personalități',
    media: 'Media',
    sport: 'Sport',
    tap_to_explore: 'Apasă pe un marker',
    read_more: 'Citește Articolul',
    close: 'Închide',
    zoom_hint: 'Mărește pentru a vedea orașe',
    time_filter: 'Filtru Timp',
    heat_map: 'Hartă Termică',
    empires: 'Imperii',
    routes: 'Rute',
    battles: 'Bătălii Celebre',
    cities: 'Orașe Antice',
    trade: 'Rute Comerciale',
    religion: 'Răspândire Religii',
    all_time: 'Tot Timpul',
    phase: 'Faza',
    attacker: 'Atacant',
    defender: 'Apărător',
    outcome: 'Rezultat',
    significance: 'Semnificație',
    casualties: 'Pierderi',
    // Layer descriptions
    layer_time_desc: 'Explorează evenimentele în timp',
    layer_heatmap_desc: 'Densitatea evenimentelor istorice',
    layer_empires_desc: 'mari imperii la apogeu',
    layer_routes_desc: 'călătorii legendare',
    layer_battles_desc: 'bătălii celebre cu faze',
    layer_cities_desc: 'mari orașe antice',
    layer_trade_desc: 'rute comerciale istorice',
    layer_religion_desc: '4 religii mondiale răspândindu-se în timp',
    layer_ww_battles: 'bătălii și evenimente cheie',
    layer_plagues: '🦠 Epidemii',
    layer_plagues_desc: 'pandemii răspândindu-se de-a lungul istoriei',
    layer_pirates: '🏴‍☠️ Pirați',
    layer_pirates_desc: 'rute legendare ale piraților',
    layer_nuclear: '☢️ Nuclear / Război Rece',
    layer_nuclear_desc_sites: 'situri de testare',
    layer_nuclear_desc_events: 'evenimente',
    layer_dinosaurs: '🦕 Fosile Dinosauri',
    layer_dinosaurs_desc: 'situri din 3 ere',
    clear_layer: 'Șterge stratul',
    // Plague UI
    plague_move_slider: 'Mișcă cursorul pentru a vedea răspândirea',
    plague_select_hint: 'Alege o pandemie de mai sus, apoi folosește cursorul pentru a urmări răspândirea',
    // Nuclear UI
    nuclear_tests: 'teste',
    nuclear_max: 'Max',
    // Dinosaur UI
    era_triassic: 'Triasic',
    era_jurassic: 'Jurasic',
    era_cretaceous: 'Cretacic',
    origin: 'Origine',
    // WW alliances
    central_powers: 'Puterile Centrale',
    axis_powers: 'Puterile Axei',
    allied: 'Aliați',
    // City status
    city_active: '🏙 Activ',
    city_ruins: '🏚 Ruine',
    city_lost: '❓ Pierdut',
    city_submerged: '🌊 Scufundat',
  },
  fr: {
    loading: 'Chargement...',
    events_across: 'événements dans',
    countries: 'pays',
    no_events: 'Aucun événement',
    events: 'événements',
    categories: 'catégories',
    back_to_world: 'Vue mondiale',
    war_conflict: 'Guerres & Conflits',
    tech_innovation: 'Technologie',
    science_discovery: 'Science',
    politics_state: 'Politique',
    culture_arts: 'Culture & Arts',
    natural_disaster: 'Catastrophes naturelles',
    exploration: 'Exploration',
    religion_phil: 'Religion',
    personalities: 'Personnalités',
    media: 'Médias',
    sport: 'Sport',
    tap_to_explore: 'Appuyez sur un marqueur',
    read_more: 'Lire l\'article complet',
    close: 'Fermer',
    zoom_hint: 'Zoomez pour voir les villes',
    time_filter: 'Filtre temporel',
    heat_map: 'Carte de chaleur',
    empires: 'Empires',
    routes: 'Routes',
    battles: 'Batailles célèbres',
    cities: 'Villes antiques',
    trade: 'Routes commerciales',
    religion: 'Propagation religieuse',
    all_time: 'Toute époque',
    phase: 'Phase',
    attacker: 'Attaquant',
    defender: 'Défenseur',
    outcome: 'Résultat',
    significance: 'Importance',
    casualties: 'Pertes',
    // Layer descriptions
    layer_time_desc: 'Explorer les événements dans le temps',
    layer_heatmap_desc: 'Densité des événements historiques',
    layer_empires_desc: 'grands empires à leur apogée',
    layer_routes_desc: 'voyages légendaires',
    layer_battles_desc: 'batailles célèbres avec phases',
    layer_cities_desc: 'grandes villes antiques',
    layer_trade_desc: 'routes commerciales historiques',
    layer_religion_desc: '4 religions mondiales se propageant dans le temps',
    layer_ww_battles: 'batailles & événements clés',
    layer_plagues: '🦠 Épidémies',
    layer_plagues_desc: 'pandémies à travers l\'histoire',
    layer_pirates: '🏴‍☠️ Pirates',
    layer_pirates_desc: 'routes de pirates légendaires',
    layer_nuclear: '☢️ Nucléaire / Guerre froide',
    layer_nuclear_desc_sites: 'sites de test',
    layer_nuclear_desc_events: 'événements',
    layer_dinosaurs: '🦕 Fossiles de dinosaures',
    layer_dinosaurs_desc: 'sites à travers 3 ères',
    clear_layer: 'Effacer le calque',
    // Plague UI
    plague_move_slider: 'Bougez le curseur pour voir la propagation',
    plague_select_hint: 'Sélectionnez une pandémie ci-dessus, puis utilisez le curseur pour suivre sa propagation',
    // Nuclear UI
    nuclear_tests: 'tests',
    nuclear_max: 'Max',
    // Dinosaur UI
    era_triassic: 'Trias',
    era_jurassic: 'Jurassique',
    era_cretaceous: 'Crétacé',
    origin: 'Origine',
    // WW alliances
    central_powers: 'Puissances centrales',
    axis_powers: "Puissances de l'Axe",
    allied: 'Alliés',
    // City status
    city_active: '🏙 Actif',
    city_ruins: '🏚 Ruines',
    city_lost: '❓ Perdu',
    city_submerged: '🌊 Submergé',
  },
  de: {
    loading: 'Lädt...',
    events_across: 'Ereignisse in',
    countries: 'Ländern',
    no_events: 'Keine Ereignisse',
    events: 'Ereignisse',
    categories: 'Kategorien',
    back_to_world: 'Weltansicht',
    war_conflict: 'Kriege & Konflikte',
    tech_innovation: 'Technologie',
    science_discovery: 'Wissenschaft',
    politics_state: 'Politik',
    culture_arts: 'Kultur & Kunst',
    natural_disaster: 'Naturkatastrophen',
    exploration: 'Entdeckung',
    religion_phil: 'Religion',
    personalities: 'Persönlichkeiten',
    media: 'Medien',
    sport: 'Sport',
    tap_to_explore: 'Marker antippen',
    read_more: 'Artikel lesen',
    close: 'Schließen',
    zoom_hint: 'Hereinzoomen für Städte',
    time_filter: 'Zeitfilter',
    heat_map: 'Wärmekarte',
    empires: 'Reiche',
    routes: 'Routen',
    battles: 'Berühmte Schlachten',
    cities: 'Antike Städte',
    trade: 'Handelsrouten',
    religion: 'Religionsverbreitung',
    all_time: 'Alle Zeiten',
    phase: 'Phase',
    attacker: 'Angreifer',
    defender: 'Verteidiger',
    outcome: 'Ergebnis',
    significance: 'Bedeutung',
    casualties: 'Verluste',
    // Layer descriptions
    layer_time_desc: 'Ereignisse durch die Zeit erkunden',
    layer_heatmap_desc: 'Dichte historischer Ereignisse',
    layer_empires_desc: 'große Reiche auf dem Höhepunkt',
    layer_routes_desc: 'legendäre Reisen',
    layer_battles_desc: 'berühmte Schlachten mit Phasen',
    layer_cities_desc: 'große antike Städte',
    layer_trade_desc: 'historische Handelsrouten',
    layer_religion_desc: '4 Weltreligionen breiten sich durch die Zeit aus',
    layer_ww_battles: 'Schlachten & Schlüsselereignisse',
    layer_plagues: '🦠 Seuchen',
    layer_plagues_desc: 'Pandemien durch die Geschichte',
    layer_pirates: '🏴‍☠️ Piraten',
    layer_pirates_desc: 'legendäre Piratenrouten',
    layer_nuclear: '☢️ Nuklear / Kalter Krieg',
    layer_nuclear_desc_sites: 'Testgelände',
    layer_nuclear_desc_events: 'Ereignisse',
    layer_dinosaurs: '🦕 Dinosaurierfossilien',
    layer_dinosaurs_desc: 'Fundstätten aus 3 Epochen',
    clear_layer: 'Ebene löschen',
    // Plague UI
    plague_move_slider: 'Schieberegler bewegen für Ausbreitung',
    plague_select_hint: 'Pandemie oben auswählen, dann Schieberegler nutzen',
    // Nuclear UI
    nuclear_tests: 'Tests',
    nuclear_max: 'Max',
    // Dinosaur UI
    era_triassic: 'Trias',
    era_jurassic: 'Jura',
    era_cretaceous: 'Kreide',
    origin: 'Ursprung',
    // WW alliances
    central_powers: 'Mittelmächte',
    axis_powers: 'Achsenmächte',
    allied: 'Alliierte',
    // City status
    city_active: '🏙 Aktiv',
    city_ruins: '🏚 Ruinen',
    city_lost: '❓ Verloren',
    city_submerged: '🌊 Versunken',
  },
  es: {
    loading: 'Cargando...',
    events_across: 'eventos en',
    countries: 'países',
    no_events: 'Sin eventos',
    events: 'eventos',
    categories: 'categorías',
    back_to_world: 'Vista mundial',
    war_conflict: 'Guerras & Conflictos',
    tech_innovation: 'Tecnología',
    science_discovery: 'Ciencia',
    politics_state: 'Política',
    culture_arts: 'Cultura & Arte',
    natural_disaster: 'Desastres naturales',
    exploration: 'Exploración',
    religion_phil: 'Religión',
    personalities: 'Personalidades',
    media: 'Medios',
    sport: 'Deporte',
    tap_to_explore: 'Toca un marcador',
    read_more: 'Leer artículo completo',
    close: 'Cerrar',
    zoom_hint: 'Acerca para ver ciudades',
    time_filter: 'Filtro de tiempo',
    heat_map: 'Mapa de calor',
    empires: 'Imperios',
    routes: 'Rutas',
    battles: 'Batallas famosas',
    cities: 'Ciudades antiguas',
    trade: 'Rutas comerciales',
    religion: 'Difusión religiosa',
    all_time: 'Toda la historia',
    phase: 'Fase',
    attacker: 'Atacante',
    defender: 'Defensor',
    outcome: 'Resultado',
    significance: 'Importancia',
    casualties: 'Bajas',
    // Layer descriptions
    layer_time_desc: 'Explorar eventos a través del tiempo',
    layer_heatmap_desc: 'Densidad de eventos históricos',
    layer_empires_desc: 'grandes imperios en su apogeo',
    layer_routes_desc: 'viajes legendarios',
    layer_battles_desc: 'batallas famosas con fases',
    layer_cities_desc: 'grandes ciudades antiguas',
    layer_trade_desc: 'rutas comerciales históricas',
    layer_religion_desc: '4 religiones mundiales extendiéndose en el tiempo',
    layer_ww_battles: 'batallas y eventos clave',
    layer_plagues: '🦠 Plagas',
    layer_plagues_desc: 'pandemias a lo largo de la historia',
    layer_pirates: '🏴‍☠️ Piratas',
    layer_pirates_desc: 'rutas de piratas legendarias',
    layer_nuclear: '☢️ Nuclear / Guerra Fría',
    layer_nuclear_desc_sites: 'sitios de prueba',
    layer_nuclear_desc_events: 'eventos',
    layer_dinosaurs: '🦕 Fósiles de Dinosaurios',
    layer_dinosaurs_desc: 'sitios a través de 3 eras',
    clear_layer: 'Limpiar capa',
    // Plague UI
    plague_move_slider: 'Mueve el control para ver la propagación',
    plague_select_hint: 'Selecciona una pandemia arriba, luego usa el control para ver su propagación',
    // Nuclear UI
    nuclear_tests: 'pruebas',
    nuclear_max: 'Máx',
    // Dinosaur UI
    era_triassic: 'Triásico',
    era_jurassic: 'Jurásico',
    era_cretaceous: 'Cretácico',
    origin: 'Origen',
    // WW alliances
    central_powers: 'Potencias Centrales',
    axis_powers: 'Potencias del Eje',
    allied: 'Aliados',
    // City status
    city_active: '🏙 Activo',
    city_ruins: '🏚 Ruinas',
    city_lost: '❓ Perdida',
    city_submerged: '🌊 Sumergida',
  },
};

// ─── Categories ────────────────────────────────────────────────────────────────
const CAT: Record<string, { color: string; tKey: string; emoji: string }> = {
  war_conflict:      { color: '#DC2626', tKey: 'war_conflict',      emoji: 'sword' },
  tech_innovation:   { color: '#2563EB', tKey: 'tech_innovation',   emoji: 'flash' },
  science_discovery: { color: '#7C3AED', tKey: 'science_discovery', emoji: 'microscope' },
  politics_state:    { color: '#D97706', tKey: 'politics_state',    emoji: 'castle' },
  culture_arts:      { color: '#059669', tKey: 'culture_arts',      emoji: 'theater' },
  natural_disaster:  { color: '#EA580C', tKey: 'natural_disaster',  emoji: 'globe' },
  exploration:       { color: '#0891B2', tKey: 'exploration',       emoji: 'compass' },
  religion_phil:     { color: '#92400E', tKey: 'religion_phil',     emoji: 'scroll' },
  personalities:     { color: '#BE185D', tKey: 'personalities',     emoji: 'star' },
  media:             { color: '#0F766E', tKey: 'media',             emoji: 'film' },
  sport:             { color: '#15803D', tKey: 'sport',             emoji: 'sport' },
};
const FALLBACK_COLOR = '#6B7280';

// ─── War event type → GameIcon key (SVG — renders reliably inside markers) ───────
const WAR_TYPE_ICON: Record<string, string> = {
  battle: 'sword',
  invasion: 'shield',
  bombing: 'flash',
  naval: 'compass',
  turning_point: 'star',
  atrocity: 'fire',
  surrender: 'check',
  treaty: 'scroll',
  offensive: 'target',
};

const NUCLEAR_EVENT_EMOJI: Record<string, string> = {
  first_test: '☢️', combat: '💥', largest: '🔥', accident: '⚠️', crisis: '🚨', treaty: '📜', program: '🏭',
};

const DINO_ERA_CONFIG = [
  { id: 'triassic',   label: 'Triassic',   color: '#7C3AED', emoji: '🦎' },
  { id: 'jurassic',   label: 'Jurassic',   color: '#059669', emoji: '🌿' },
  { id: 'cretaceous', label: 'Cretaceous', color: '#D97706', emoji: '🦕' },
] as const;
const sideColorOf = (side: string) =>
  side === 'axis' || side === 'central' ? '#DC2626' : side === 'allied' ? '#2563EB' : '#6B7280';

// Map a country-filter chip key → keyword found in a WarTerritory.country name
const WAR_COUNTRY_KEYWORD: Record<string, string> = {
  germany: 'german', uk: 'united kingdom', france: 'france', usa: 'united states',
  russia: 'russian', ottoman: 'ottoman', austria: 'austria', japan: 'japan',
  ussr: 'soviet', italy: 'italy',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Returns the nearest point on a polyline to a given coordinate.
// Projects onto every segment (not just vertices) for sub-segment precision.
const snapToRoute = (
  pt: { latitude: number; longitude: number },
  coords: { latitude: number; longitude: number }[],
): { latitude: number; longitude: number } => {
  if (coords.length === 0) return pt;
  if (coords.length === 1) return coords[0];
  let best = coords[0];
  let bestDist = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const dx = b.longitude - a.longitude;
    const dy = b.latitude  - a.latitude;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1,
      ((pt.longitude - a.longitude) * dx + (pt.latitude - a.latitude) * dy) / lenSq,
    ));
    const proj = { latitude: a.latitude + t * dy, longitude: a.longitude + t * dx };
    const d = (proj.latitude - pt.latitude) ** 2 + (proj.longitude - pt.longitude) ** 2;
    if (d < bestDist) { bestDist = d; best = proj; }
  }
  return best;
};

const getCat = (e: any): string => (e.category ?? '').toString().toLowerCase();
const getYear = (e: any): string => {
  const r = String(e.eventDate ?? e.event_date ?? e.year ?? '').trim();
  if (/^\d{4}$/.test(r)) return r;
  if (r.includes('-')) return r.split('-')[0];
  return '';
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface EventWithLocation {
  event: any;
  lat: number;
  lng: number;
  label: string;
  city: string;
  country: string;
}

interface CatGroup {
  key: string;
  color: string;
  emoji: string;
  labelKey: string;
  events: EventWithLocation[];
}

interface Cluster {
  country: string;
  lat: number;
  lng: number;
  items: EventWithLocation[];
  cats: CatGroup[];
  mainColor: string;
  count: number;
}

// ─── Build helpers ─────────────────────────────────────────────────────────────

const buildEventsWithLocation = (events: any[]): EventWithLocation[] => {
  const result: EventWithLocation[] = [];
  for (const ev of events) {
    const loc = extractLocation(ev);
    if (loc) {
      result.push({
        event: ev,
        lat: loc.latitude,
        lng: loc.longitude,
        label: loc.label,
        city: loc.city,
        country: loc.country,
      });
    }
  }
  return result;
};

const buildClusters = (eventsWithLoc: EventWithLocation[]): Cluster[] => {
  const byCountry = new Map<string, EventWithLocation[]>();
  for (const item of eventsWithLoc) {
    const c = item.country || 'Unknown';
    if (!byCountry.has(c)) byCountry.set(c, []);
    byCountry.get(c)!.push(item);
  }

  const clusters: Cluster[] = [];
  for (const [country, items] of byCountry) {
    // Cluster center = average of all event coords in that country
    const lat = items.reduce((s, i) => s + i.lat, 0) / items.length;
    const lng = items.reduce((s, i) => s + i.lng, 0) / items.length;

    const byCat = new Map<string, EventWithLocation[]>();
    for (const item of items) {
      const cat = getCat(item.event);
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(item);
    }

    const cats: CatGroup[] = Array.from(byCat.entries())
      .map(([key, evts]) => ({
        key,
        color: CAT[key]?.color ?? FALLBACK_COLOR,
        emoji: CAT[key]?.emoji ?? 'star',
        labelKey: CAT[key]?.tKey ?? key,
        events: evts.sort((a, b) => (b.event.impactScore ?? 0) - (a.event.impactScore ?? 0)),
      }))
      .sort((a, b) => b.events.length - a.events.length);

    clusters.push({
      country,
      lat,
      lng,
      items,
      cats,
      mainColor: cats[0]?.color ?? FALLBACK_COLOR,
      count: items.length,
    });
  }

  return clusters.sort((a, b) => b.count - a.count);
};

// ═══════════════════════════════════════════════════════════════════════════════
// Preview Card
// ═══════════════════════════════════════════════════════════════════════════════
const PreviewCard = ({
  item,
  language,
  theme,
  isDark,
  tm,
  onClose,
  onReadMore,
}: {
  item: EventWithLocation;
  language: string;
  theme: any;
  isDark: boolean;
  tm: (k: string) => string;
  onClose: () => void;
  onReadMore: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 20, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const catKey = getCat(item.event);
  const catInfo = CAT[catKey];
  const color = catInfo?.color ?? FALLBACK_COLOR;
  const emoji = catInfo?.emoji ?? 'star';

  const title =
    item.event.titleTranslations?.[language] ??
    item.event.titleTranslations?.en ??
    'Untitled';
  const summary =
    item.event.summaryTranslations?.[language] ??
    item.event.summaryTranslations?.en ??
    '';
  const year = getYear(item.event);
  const locationLabel = item.city || item.label.split(',')[0]?.trim() || item.label;

  const cardBg = isDark ? '#1C1917' : '#FFFFFF';
  const borderCol = isDark ? '#292524' : '#E5E5E5';
  const subtextCol = isDark ? '#A8A29E' : '#737373';

  return (
    <Animated.View style={[styles.previewOverlay, { opacity: opacityAnim }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      <Animated.View
        style={[
          styles.previewCard,
          { backgroundColor: cardBg, borderColor: borderCol, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.previewHeader, { borderBottomColor: borderCol }]}>
          <View style={[styles.previewBadge, { backgroundColor: color + '15' }]}>
            <GameIcon iconKey={emoji} size={16} color={color} />
            <Text style={[styles.previewCatText, { color }]}>
              {tm(catInfo?.tKey ?? catKey)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={close}
            style={[styles.previewClose, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}
          >
            <X size={18} color={subtextCol} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.previewBody}>
          <Text style={[styles.previewTitle, { color: theme.text }]} numberOfLines={3}>
            {title}
          </Text>
          {summary !== '' && (
            <Text style={[styles.previewSummary, { color: subtextCol }]} numberOfLines={3}>
              {summary}
            </Text>
          )}
          <View style={styles.previewMeta}>
            {year !== '' && (
              <View style={[styles.previewMetaItem, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}>
                <Calendar size={12} color={color} strokeWidth={2.5} />
                <Text style={[styles.previewMetaText, { color: theme.text }]}>{year}</Text>
              </View>
            )}
            <View style={[styles.previewMetaItem, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}>
              <MapPin size={12} color={color} strokeWidth={2.5} />
              <Text style={[styles.previewMetaText, { color: theme.text }]} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={onReadMore}
          activeOpacity={0.8}
          style={[styles.previewButton, { backgroundColor: color }]}
        >
          <Book size={16} color="#FFF" strokeWidth={2} />
          <Text style={styles.previewButtonText}>{tm('read_more')}</Text>
          <ChevronRight size={16} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Event Row
// ═══════════════════════════════════════════════════════════════════════════════
const EventRow = React.memo(
  ({
    item,
    language,
    theme,
    isDark,
    color,
    onPress,
  }: {
    item: EventWithLocation;
    language: string;
    theme: any;
    isDark: boolean;
    color: string;
    onPress: () => void;
  }) => {
    const title =
      item.event.titleTranslations?.[language] ??
      item.event.titleTranslations?.en ??
      '';
    const year = getYear(item.event);
    const cityLabel = item.city || (item.label.includes(',') ? item.label.split(',')[0].trim() : '');

    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.eventRow}>
        <View style={[styles.eventYear, { backgroundColor: color + '12', borderColor: color + '25' }]}>
          <Text style={[styles.eventYearText, { color }]}>{year || '—'}</Text>
        </View>
        <View style={styles.eventContent}>
          <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          {cityLabel !== '' && (
            <View style={styles.eventLoc}>
              <MapPin size={10} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.5 }} />
              <Text style={[styles.eventLocText, { color: theme.subtext }]}>{cityLabel}</Text>
            </View>
          )}
        </View>
        <ChevronRight size={16} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.4 }} />
      </TouchableOpacity>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// Category Section
// ═══════════════════════════════════════════════════════════════════════════════
const CategorySection = ({
  cat,
  language,
  theme,
  isDark,
  tm,
  onEventPress,
}: {
  cat: CatGroup;
  language: string;
  theme: any;
  isDark: boolean;
  tm: (k: string) => string;
  onEventPress: (item: EventWithLocation) => void;
}) => {
  const [expanded, setExpanded] = useState(true);

  const toggle = () => {
    haptic('light');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={[styles.catHeader, { backgroundColor: cat.color + '08' }]}
      >
        <View style={styles.catLeft}>
          <GameIcon iconKey={cat.emoji} size={16} color={cat.color} />
          <Text style={[styles.catLabel, { color: cat.color }]}>{tm(cat.labelKey)}</Text>
          <View style={[styles.catBadge, { backgroundColor: cat.color + '18' }]}>
            <Text style={[styles.catCount, { color: cat.color }]}>{cat.events.length}</Text>
          </View>
        </View>
        <ChevronDown
          size={18}
          color={theme.subtext}
          strokeWidth={2}
          style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }], opacity: 0.5 }}
        />
      </TouchableOpacity>
      {expanded &&
        cat.events.map((item, i) => (
          <View key={`${getYear(item.event)}-${item.label}-${i}`}>
            <EventRow
              item={item}
              language={language}
              theme={theme}
              isDark={isDark}
              color={cat.color}
              onPress={() => onEventPress(item)}
            />
            {i < cat.events.length - 1 && (
              <View
                style={[styles.divider, { backgroundColor: isDark ? '#292524' : '#F0F0F0' }]}
              />
            )}
          </View>
        ))}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SmartMarker — fixes the react-native-maps Android "half/clipped marker" bug.
// Custom-view markers capture a bitmap snapshot; with tracksViewChanges=false that
// snapshot is taken before the view finishes laying out, so only part renders.
// We keep tracking ON until the content has settled, then freeze it for performance.
// Re-tracks whenever `redraw` changes (e.g. selection/colour), then freezes again.
// ═══════════════════════════════════════════════════════════════════════════════
const SmartMarker = ({
  redraw,
  children,
  ...markerProps
}: React.ComponentProps<typeof Marker> & { redraw?: string | number }) => {
  const [track, setTrack] = useState(true);
  useEffect(() => {
    setTrack(true);
    // freeze the bitmap once content has laid out — short window keeps panning smooth
    const t = setTimeout(() => setTrack(false), 500);
    return () => clearTimeout(t);
  }, [redraw]);
  return (
    <Marker tracksViewChanges={track} {...markerProps}>
      {children}
    </Marker>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PinHead — fixed-size teardrop marker. Explicit outer dimensions prevent the
// Android bitmap-snapshot clipping bug. collapsable={false} stops the RN
// layout optimizer from collapsing the view before the snapshot is taken.
// Max head diameter is capped at MAX_PIN (32) so icons/numbers never truncate.
// ═══════════════════════════════════════════════════════════════════════════════
const MAX_PIN = 32;
const PinHead = ({
  color, size = 28, selected, iconKey, emoji, text,
}: {
  color: string;
  size?: number;
  selected?: boolean;
  iconKey?: string;
  emoji?: string;
  text?: string;
}) => {
  const s = Math.min(size, MAX_PIN);
  // tail: borderTopWidth=9 - marginTop=-2 overlap = 7px net
  return (
    <View
      style={{ width: s + 10, height: s + 7, alignItems: 'center' }}
      collapsable={false}
    >
      <View style={[mkr.head, {
        width: s, height: s, borderRadius: s / 2,
        backgroundColor: color, borderWidth: selected ? 3 : 2,
      }]}>
        {iconKey
          ? <GameIcon iconKey={iconKey} size={Math.round(s * 0.5)} color="#FFFFFF" />
          : text != null
          ? <Text style={{
              fontSize: Math.min(Math.round(s * 0.38), 12),
              fontWeight: '900', color: '#FFFFFF', textAlign: 'center', includeFontPadding: false,
            }}>{text}</Text>
          : <Text style={{ fontSize: Math.min(Math.round(s * 0.5), 15), includeFontPadding: false }}>{emoji}</Text>}
      </View>
      <View style={[mkr.tail, { borderTopColor: color }]} />
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function MapScreen({ onInterstitial }: { onInterstitial?: () => void } = {}) {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const tLang = language !== 'en' ? (language as 'ro' | 'fr' | 'de' | 'es') : undefined;
  const insets = useSafeAreaInsets();
  const { isPro, presentPaywall } = useRevenueCat();
  const { showForUnlock } = useRewardedUnlock();
  const [routesUnlocked, setRoutesUnlocked] = useState(false);
  const [tradeUnlocked, setTradeUnlocked] = useState(false);
  const [citiesUnlocked, setCitiesUnlocked] = useState(false);
  const mapRef = useRef<MapView>(null);

  const tm = useCallback(
    (k: string) => (T[language] ?? T.en)[k] ?? T.en[k] ?? k,
    [language],
  );

  // Events already loaded app-wide by the home screen (60 days of daily content)
  const contextEvents = useAllEvents();
  const [allEvents, setAllEvents] = useState<any[]>(contextEvents ?? []);
  const [loading, setLoading] = useState(!(contextEvents && contextEvents.length));

  // isZoomedIn: true when latitudeDelta < ZOOM_CLUSTER_THRESHOLD
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  // Layer state
  type MapLayer = 'off' | 'time' | 'heatmap' | 'empires' | 'routes' | 'battles' | 'cities' | 'trade' | 'religion' | 'ww1' | 'ww2' | 'plagues' | 'pirates' | 'nuclear' | 'dinosaurs';
  const [mapLayer, setMapLayer] = useState<MapLayer>('off');
  const [selectedEmpires, setSelectedEmpires] = useState<Set<string>>(new Set());
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
  const [selectedTradeRoutes, setSelectedTradeRoutes] = useState<Set<string>>(new Set());
  const [selectedReligions, setSelectedReligions] = useState<Set<string>>(new Set());
  const [sliderRatio, setSliderRatio] = useState(1);
  const sliderBarWidthRef = useRef(300);
  const sliderRatioAtGrant = useRef(1);
  const [selectedKeyStop, setSelectedKeyStop] = useState<{ route: any; stop: any } | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);

  // Battles layer state
  const [selectedBattle, setSelectedBattle] = useState<FamousBattle | null>(null);
  const [battlePhase, setBattlePhase] = useState(0);

  // Cities layer state — empire-style: pick cities from top chips, show their area
  const [selectedCity, setSelectedCity] = useState<AncientCity | null>(null);
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());

  // Religion layer state
  const RELIGION_YEAR_MIN = -600;
  const RELIGION_YEAR_MAX = 2000;
  const [religionYear, setReligionYear] = useState(1000);
  const religionSliderWidthRef = useRef(300);
  const religionSliderRatioAtGrant = useRef(0.5);

  // WW1/WW2 layer state
  const [ww1Unlocked, setWw1Unlocked] = useState(false);
  const [ww1Year, setWw1Year] = useState(WW1_YEAR_MIN);
  const [ww2Year, setWw2Year] = useState(WW2_YEAR_MIN);
  const [selectedWarEvent, setSelectedWarEvent] = useState<any>(null);

  // Plagues layer state
  const [selectedPlagueId, setSelectedPlagueId] = useState<string | null>(null);
  const [plagueYear, setPlagueYear] = useState(PLAGUE_YEAR_MIN);
  const plagueSliderWidthRef = useRef(300);
  const plagueSliderRatioAtGrant = useRef(0);

  // Pirates layer state
  const [selectedPirateRoutes, setSelectedPirateRoutes] = useState<Set<string>>(new Set());

  // Nuclear layer state
  const [selectedNuclearCountries, setSelectedNuclearCountries] = useState<Set<string>>(
    new Set(['usa', 'ussr', 'uk', 'france', 'china', 'india', 'pakistan', 'north_korea']),
  );
  const [selectedNuclearEvent, setSelectedNuclearEvent] = useState<any>(null);
  const [selectedNuclearSite, setSelectedNuclearSite] = useState<any>(null);

  // Dinosaurs layer state
  const [selectedDinoEras, setSelectedDinoEras] = useState<Set<string>>(
    new Set(['triassic', 'jurassic', 'cretaceous']),
  );
  const [selectedDinoSite, setSelectedDinoSite] = useState<any>(null);

  // Keep latest selectedBattle accessible inside callbacks (phase navigation)
  const selectedBattleRef = useRef<FamousBattle | null>(null);
  useEffect(() => { selectedBattleRef.current = selectedBattle; }, [selectedBattle]);

  // Active country for bottom sheet (null = no sheet)
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const activeCountryRef = useRef<string | null>(null);

  // Preview card
  const [previewItem, setPreviewItem] = useState<EventWithLocation | null>(null);

  // Story modal
  const [storyEvent, setStoryEvent] = useState<any>(null);
  const [storyVisible, setStoryVisible] = useState(false);
  const storyVisibleRef = useRef(false);
  const justClosedStory = useRef(false);

  useEffect(() => {
    storyVisibleRef.current = storyVisible;
  }, [storyVisible]);

  // Sheet animation
  const sheetY = useRef(new Animated.Value(SHEET_CLOSED)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);

  const snapSheet = useCallback(
    (to: number) => {
      Animated.parallel([
        Animated.spring(sheetY, { toValue: to, tension: 200, friction: 25, useNativeDriver: false }),
        Animated.timing(backdropOp, {
          toValue: to > 0 ? 0.3 : 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [sheetY, backdropOp],
  );

  const closeSheet = useCallback(() => {
    snapSheet(SHEET_CLOSED);
    setTimeout(() => {
      setActiveCountry(null);
      activeCountryRef.current = null;
    }, 250);
  }, [snapSheet]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderGrant: () => {
        dragStart.current = (sheetY as any)._value;
      },
      onPanResponderMove: (_, g) => {
        const val = Math.max(0, Math.min(SHEET_FULL, dragStart.current - g.dy));
        sheetY.setValue(val);
      },
      onPanResponderRelease: (_, g) => {
        const cur = (sheetY as any)._value;
        if (g.vy > 1.2) {
          closeSheet();
          return;
        }
        if (-g.vy > 1.2) {
          snapSheet(SHEET_FULL);
          return;
        }
        const snaps = [SHEET_CLOSED, SHEET_HALF, SHEET_FULL];
        const nearest = snaps.reduce((p, s) =>
          Math.abs(s - cur) < Math.abs(p - cur) ? s : p,
        );
        nearest === SHEET_CLOSED ? closeSheet() : snapSheet(nearest);
      },
    }),
  ).current;

  // ── Source events: reuse home-screen data → cache → network (in that order) ─────
  // The home screen fetches the same 60 days at app start and shares them via
  // AllEventsContext, so opening the map is instant with no extra requests.
  useEffect(() => {
    // 1) Already loaded app-wide — use immediately, no network, no spinner.
    if (contextEvents && contextEvents.length) {
      setAllEvents(contextEvents);
      setLoading(false);
      AsyncStorage.setItem(MAP_CACHE_KEY, JSON.stringify({ ts: Date.now(), events: contextEvents })).catch(() => {});
      return;
    }

    let cancelled = false;
    (async () => {
      // 2) Fall back to the local cache for an instant cold-start render.
      let hadData = false;
      try {
        const raw = await AsyncStorage.getItem(MAP_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.events?.length && !cancelled) {
            setAllEvents(parsed.events);
            setLoading(false);
            hadData = true;
            if (Date.now() - (parsed.ts ?? 0) < MAP_CACHE_TTL) return; // fresh — skip network
          }
        }
      } catch {}

      // 3) Network fallback (first ever launch, or stale cache).
      if (!hadData) setLoading(true);
      try {
        const promises = Array.from({ length: 60 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return api
            .get('/daily-content/by-date', { params: { date: d.toISOString().split('T')[0] } })
            .then((r) => r.data?.events ?? [])
            .catch(() => []);
        });
        const all = (await Promise.all(promises)).flat();
        const seen = new Set<string>();
        const unique = all.filter((e: any) => {
          const id = `${e.eventDate}-${e.titleTranslations?.en}`;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        if (cancelled) return;
        setAllEvents(unique);
        AsyncStorage.setItem(MAP_CACHE_KEY, JSON.stringify({ ts: Date.now(), events: unique })).catch(() => {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contextEvents]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const eventsWithLocation = useMemo(
    () => buildEventsWithLocation(allEvents),
    [allEvents],
  );

  const clusters = useMemo(
    () => buildClusters(eventsWithLocation),
    [eventsWithLocation],
  );

  const total = useMemo(
    () => eventsWithLocation.length,
    [eventsWithLocation],
  );

  // ── Layer: time filter ─────────────────────────────────────────────────────
  const { minYear, maxYear } = useMemo(() => {
    const years = eventsWithLocation.map(e => {
      const raw = String(e.event.eventDate ?? e.event.event_date ?? '');
      const y = parseInt(raw.replace(/^(-?\d+).*/, '$1'));
      return isNaN(y) ? null : y;
    }).filter((y): y is number => y !== null);
    if (years.length === 0) return { minYear: -500, maxYear: 2024 };
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [eventsWithLocation]);

  const filteredYear = Math.round(minYear + (maxYear - minYear) * sliderRatio);

  const activeEventsWithLocation = useMemo(() => {
    if (mapLayer !== 'time' || sliderRatio >= 1) return eventsWithLocation;
    return eventsWithLocation.filter(e => {
      const raw = String(e.event.eventDate ?? e.event.event_date ?? '');
      const y = parseInt(raw.replace(/^(-?\d+).*/, '$1'));
      return !isNaN(y) && y <= filteredYear;
    });
  }, [mapLayer, eventsWithLocation, filteredYear, sliderRatio]);

  const activeClusters = useMemo(() => buildClusters(activeEventsWithLocation), [activeEventsWithLocation]);

  const visibleWW1Events = useMemo(() => {
    if (mapLayer !== 'ww1') return [];
    return WW1_EVENTS.filter(e => e.year === ww1Year)
      .sort((a, b) => b.significance - a.significance);
  }, [mapLayer, ww1Year]);

  const visibleWW2Events = useMemo(() => {
    if (mapLayer !== 'ww2') return [];
    return WW2_EVENTS.filter(e => e.year === ww2Year)
      .sort((a, b) => b.significance - a.significance);
  }, [mapLayer, ww2Year]);

  const visiblePlagueData = useMemo(() => {
    if (mapLayer !== 'plagues' || !selectedPlagueId) return null;
    const pandemic = PANDEMICS.find(p => p.id === selectedPlagueId);
    if (!pandemic) return null;
    const yearSpread = pandemic.spread.filter(s => s.year <= plagueYear);
    return {
      pandemic,
      regions: yearSpread.flatMap(s => s.regions),
      latestLabel: yearSpread.length > 0 ? yearSpread[yearSpread.length - 1].label : '',
    };
  }, [mapLayer, selectedPlagueId, plagueYear]);


  const warEventSideColor = useMemo(() => {
    if (!selectedWarEvent) return '#DC2626';
    const s = selectedWarEvent.side;
    return s === 'axis' || s === 'central' ? '#DC2626' : s === 'allied' ? '#2563EB' : '#6B7280';
  }, [selectedWarEvent]);

  // ── Layer: heat map ────────────────────────────────────────────────────────
  const heatCells = useMemo(() => {
    if (mapLayer !== 'heatmap') return [];
    const CELL = 6;
    const grid = new Map<string, { lat: number; lng: number; count: number }>();
    for (const e of eventsWithLocation) {
      const cLat = Math.floor(e.lat / CELL) * CELL + CELL / 2;
      const cLng = Math.floor(e.lng / CELL) * CELL + CELL / 2;
      const key = `${cLat},${cLng}`;
      if (!grid.has(key)) grid.set(key, { lat: cLat, lng: cLng, count: 0 });
      grid.get(key)!.count++;
    }
    const cells = Array.from(grid.values());
    const maxC = Math.max(1, ...cells.map(c => c.count));
    return cells.map(c => ({ ...c, ratio: c.count / maxC }));
  }, [mapLayer, eventsWithLocation]);

  // ── Slider PanResponder ────────────────────────────────────────────────────
  const sliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const touchX = e.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, touchX / sliderBarWidthRef.current));
      sliderRatioAtGrant.current = ratio;
      setSliderRatio(ratio);
    },
    onPanResponderMove: (_, g) => {
      const ratio = Math.max(0, Math.min(1, sliderRatioAtGrant.current + g.dx / sliderBarWidthRef.current));
      setSliderRatio(ratio);
    },
  })).current;

  // Layer toggle helpers
  const toggleLayer = useCallback((layer: MapLayer) => {
    haptic('medium');

    const freeLayers: MapLayer[] = ['heatmap', 'battles', 'ww1', 'ww2', 'religion'];
    if (!isPro && !freeLayers.includes(layer)) {
      const rewardedLayers: MapLayer[] = ['routes', 'trade', 'cities'];
      if (rewardedLayers.includes(layer)) {
        const unlocked =
          layer === 'routes' ? routesUnlocked :
          layer === 'trade'  ? tradeUnlocked  :
          citiesUnlocked;
        if (!unlocked) {
          setLayersOpen(false);
          showForUnlock(() => {
            if (layer === 'routes')      setRoutesUnlocked(true);
            else if (layer === 'trade')  setTradeUnlocked(true);
            else if (layer === 'cities') setCitiesUnlocked(true);
            setMapLayer(layer);
            setSelectedKeyStop(null);
            setSelectedWarEvent(null);
          });
          return;
        }
        // already unlocked via rewarded — fall through
      } else {
        setLayersOpen(false);
        presentPaywall();
        return;
      }
    }

    setMapLayer(prev => prev === layer ? 'off' : layer);
    setSelectedKeyStop(null);
    setSelectedWarEvent(null);
    setLayersOpen(false);
  }, [isPro, routesUnlocked, tradeUnlocked, citiesUnlocked, ww1Unlocked, showForUnlock, presentPaywall]);

  const toggleEmpire = useCallback((id: string) => {
    haptic('selection');
    setSelectedEmpires(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleRoute = useCallback((id: string) => {
    haptic('selection');
    setSelectedRoutes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleTradeRoute = useCallback((id: string) => {
    haptic('selection');
    setSelectedTradeRoutes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleReligion = useCallback((id: string) => {
    haptic('selection');
    setSelectedReligions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const decrementWW1Year = useCallback(() => {
    haptic('selection');
    setWw1Year(y => Math.max(WW1_YEAR_MIN, y - 1));
    setSelectedWarEvent(null);
  }, []);
  const incrementWW1Year = useCallback(() => {
    haptic('selection');
    setWw1Year(y => Math.min(WW1_YEAR_MAX, y + 1));
    setSelectedWarEvent(null);
  }, []);
  const decrementWW2Year = useCallback(() => {
    haptic('selection');
    setWw2Year(y => Math.max(WW2_YEAR_MIN, y - 1));
    setSelectedWarEvent(null);
  }, []);
  const incrementWW2Year = useCallback(() => {
    haptic('selection');
    setWw2Year(y => Math.min(WW2_YEAR_MAX, y + 1));
    setSelectedWarEvent(null);
  }, []);

  const togglePirateRoute = useCallback((id: string) => {
    haptic('selection');
    setSelectedPirateRoutes(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleNuclearCountry = useCallback((country: string) => {
    haptic('selection');
    setSelectedNuclearCountries(prev => { const next = new Set(prev); if (next.has(country)) next.delete(country); else next.add(country); return next; });
  }, []);

  const toggleDinoEra = useCallback((era: string) => {
    haptic('selection');
    setSelectedDinoEras(prev => { const next = new Set(prev); if (next.has(era)) next.delete(era); else next.add(era); return next; });
  }, []);

  const selectPandemic = useCallback((id: string | null) => {
    haptic('medium');
    setSelectedPlagueId(id);
    if (id) {
      const p = PANDEMICS.find(x => x.id === id);
      if (p) setPlagueYear(p.yearMin);
    }
  }, []);

  // Religion slider pan
  const religionSliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const touchX = e.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, touchX / religionSliderWidthRef.current));
      religionSliderRatioAtGrant.current = ratio;
      const year = Math.round(RELIGION_YEAR_MIN + ratio * (RELIGION_YEAR_MAX - RELIGION_YEAR_MIN));
      setReligionYear(year);
    },
    onPanResponderMove: (_, g) => {
      const ratio = Math.max(0, Math.min(1, religionSliderRatioAtGrant.current + g.dx / religionSliderWidthRef.current));
      const year = Math.round(RELIGION_YEAR_MIN + ratio * (RELIGION_YEAR_MAX - RELIGION_YEAR_MIN));
      setReligionYear(year);
    },
  })).current;


  // Plague year slider pan
  const plagueSliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / plagueSliderWidthRef.current));
      plagueSliderRatioAtGrant.current = ratio;
      setPlagueYear(Math.round(PLAGUE_YEAR_MIN + ratio * (PLAGUE_YEAR_MAX - PLAGUE_YEAR_MIN)));
    },
    onPanResponderMove: (_, g) => {
      const ratio = Math.max(0, Math.min(1, plagueSliderRatioAtGrant.current + g.dx / plagueSliderWidthRef.current));
      setPlagueYear(Math.round(PLAGUE_YEAR_MIN + ratio * (PLAGUE_YEAR_MAX - PLAGUE_YEAR_MIN)));
    },
  })).current;

  // When zoomed in + active country: show only that country's events
  // When zoomed in + no active country: show all individual events
  const visibleCityEvents = useMemo(() => {
    if (!isZoomedIn) return [];
    if (activeCountry) {
      return activeEventsWithLocation.filter((e) => e.country === activeCountry);
    }
    // No country selected: cap markers to the most impactful ones so free-panning
    // never tries to render hundreds of custom markers at once (kills lag).
    if (activeEventsWithLocation.length <= 70) return activeEventsWithLocation;
    return [...activeEventsWithLocation]
      .sort((a, b) => (b.event.impactScore ?? 0) - (a.event.impactScore ?? 0))
      .slice(0, 70);
  }, [isZoomedIn, activeCountry, activeEventsWithLocation]);

  const activeCluster = useMemo(
    () => activeClusters.find((c) => c.country === activeCountry) ?? null,
    [activeClusters, activeCountry],
  );

  // ── Region change — detect zoom level ────────────────────────────────────────
  const onRegionChangeComplete = useCallback(
    (region: Region) => {
      const zoomed = region.latitudeDelta < ZOOM_CLUSTER_THRESHOLD;
      setIsZoomedIn(zoomed);

      // If user zoomed out manually, close country sheet
      if (!zoomed && activeCountryRef.current) {
        closeSheet();
      }
    },
    [closeSheet],
  );

  // ── Interactions ──────────────────────────────────────────────────────────────
  const onClusterPress = useCallback(
    (cluster: Cluster) => {
      haptic('medium');
      setActiveCountry(cluster.country);
      activeCountryRef.current = cluster.country;

      // Zoom into the country
      if (cluster.items.length === 1) {
        mapRef.current?.animateToRegion(
          {
            latitude: cluster.items[0].lat,
            longitude: cluster.items[0].lng,
            latitudeDelta: 8,
            longitudeDelta: 8,
          },
          700,
        );
      } else {
        const lats = cluster.items.map((i) => i.lat);
        const lngs = cluster.items.map((i) => i.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        mapRef.current?.animateToRegion(
          {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max((maxLat - minLat) * 1.8, 5),
            longitudeDelta: Math.max((maxLng - minLng) * 1.8, 5),
          },
          700,
        );
      }

      snapSheet(SHEET_HALF);
    },
    [snapSheet],
  );

  const zoomOut = useCallback(() => {
    haptic('light');
    closeSheet();
    mapRef.current?.animateCamera(INIT_CAM, { duration: 800 });
  }, [closeSheet]);

  // ── Fit map to a set of coordinates ─────────────────────────────────────────
  const fitToCoords = useCallback((coords: { latitude: number; longitude: number }[], pad = 1.6, minDelta = 4, duration = 700) => {
    if (coords.length === 0) return;
    const lats = coords.map(c => c.latitude);
    const lngs = coords.map(c => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    mapRef.current?.animateToRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * pad, minDelta),
      longitudeDelta: Math.max((maxLng - minLng) * pad, minDelta),
    }, duration);
  }, []);

  // Auto-fit map to the current year's events whenever year/layer changes
  useEffect(() => {
    if (mapLayer !== 'ww1') return;
    const events = WW1_EVENTS.filter(e => e.year === ww1Year);
    if (events.length === 0) return;
    fitToCoords(events.map(e => ({ latitude: e.latitude, longitude: e.longitude })), 1.6, 8, 700);
  }, [ww1Year, mapLayer, fitToCoords]);

  useEffect(() => {
    if (mapLayer !== 'ww2') return;
    const events = WW2_EVENTS.filter(e => e.year === ww2Year);
    if (events.length === 0) return;
    fitToCoords(events.map(e => ({ latitude: e.latitude, longitude: e.longitude })), 1.6, 10, 700);
  }, [ww2Year, mapLayer, fitToCoords]);

  useEffect(() => {
    if (mapLayer !== 'plagues' || !selectedPlagueId) return;
    const pandemic = PANDEMICS.find(p => p.id === selectedPlagueId);
    if (!pandemic) return;
    fitToCoords([pandemic.origin], 1.0, 40, 700);
  }, [mapLayer, selectedPlagueId, fitToCoords]);

  useEffect(() => {
    if (mapLayer !== 'pirates' || selectedPirateRoutes.size === 0) return;
    const coords = PIRATE_ROUTES.filter(r => selectedPirateRoutes.has(r.id)).flatMap(r => r.coordinates);
    if (coords.length === 0) return;
    fitToCoords(coords, 1.2, 15, 700);
  }, [mapLayer, selectedPirateRoutes, fitToCoords]);

  useEffect(() => {
    if (mapLayer !== 'nuclear') return;
    const sites = NUCLEAR_SITES.filter(s => selectedNuclearCountries.has(s.country));
    if (sites.length === 0) return;
    fitToCoords(sites.map(s => ({ latitude: s.latitude, longitude: s.longitude })), 1.1, 20, 700);
  }, [mapLayer, fitToCoords]); // intentionally no selectedNuclearCountries dep — only fit on layer open

  useEffect(() => {
    if (mapLayer !== 'dinosaurs') return;
    const sites = DINOSAUR_SITES.filter(s => selectedDinoEras.has(s.era));
    if (sites.length === 0) return;
    fitToCoords(sites.map(s => ({ latitude: s.latitude, longitude: s.longitude })), 1.1, 25, 700);
  }, [mapLayer, fitToCoords]); // only fit on layer open

  // ── Select a battle: open it, reset to phase 1, zoom to its location ─────────
  const selectBattle = useCallback((battle: FamousBattle) => {
    haptic('medium');
    setSelectedBattle(battle);
    setBattlePhase(0);
    const phase0 = battle.phases[0];
    const coords = phase0?.positions?.length
      ? phase0.positions.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
      : [{ latitude: battle.latitude, longitude: battle.longitude }];
    // include the battle center so the marker stays visible
    fitToCoords([...coords, { latitude: battle.latitude, longitude: battle.longitude }], 2.2, 1.5, 800);
  }, [fitToCoords]);

  // ── Move to a battle phase + fit map to that phase's positions ───────────────
  const goToPhase = useCallback((idx: number) => {
    const battle = selectedBattleRef.current;
    if (!battle) return;
    const clamped = Math.max(0, Math.min(battle.phases.length - 1, idx));
    haptic('selection');
    setBattlePhase(clamped);
    const ph = battle.phases[clamped];
    if (ph?.positions?.length) {
      fitToCoords(ph.positions.map(p => ({ latitude: p.latitude, longitude: p.longitude })), 2.4, 0.6, 600);
    }
  }, [fitToCoords]);

  // ── Select an ancient city: open card + zoom in ──────────────────────────────
  const selectCity = useCallback((city: AncientCity) => {
    haptic('medium');
    setSelectedCity(city);
    mapRef.current?.animateToRegion({
      latitude: city.latitude,
      longitude: city.longitude,
      latitudeDelta: 6,
      longitudeDelta: 6,
    }, 800);
  }, []);

  // ── Toggle a city from the top chips (empire-style): show its area + focus it ──
  const toggleCity = useCallback((city: AncientCity) => {
    haptic('selection');
    setSelectedCities(prev => {
      const next = new Set(prev);
      if (next.has(city.id)) {
        next.delete(city.id);
        setSelectedCity(cur => (cur?.id === city.id ? null : cur));
      } else {
        next.add(city.id);
        selectCity(city); // focus + zoom + open card
      }
      return next;
    });
  }, [selectCity]);

  // ── Select a war event: open card + zoom in ──────────────────────────────────
  const selectWarEvent = useCallback((e: any) => {
    haptic('medium');
    setSelectedWarEvent(e);
    mapRef.current?.animateToRegion({
      latitude: e.latitude,
      longitude: e.longitude,
      latitudeDelta: 14,
      longitudeDelta: 14,
    }, 800);
  }, []);

  const openPreview = useCallback((item: EventWithLocation) => {
    haptic('light');
    setPreviewItem(item);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const openStory = useCallback((ev: any) => {
    haptic('light');
    setPreviewItem(null);
    setStoryEvent(ev);
    setStoryVisible(true);
  }, []);

  const closeStory = useCallback(() => {
    setStoryVisible(false);
    justClosedStory.current = true;
    setTimeout(() => {
      justClosedStory.current = false;
    }, 500);
  }, []);

  const onMapPress = useCallback(() => {
    if (storyVisibleRef.current || justClosedStory.current) return;
    if (previewItem) { setPreviewItem(null); return; }
    // Tap anywhere on the map (not a marker) to dismiss any open detail card.
    if (selectedWarEvent) { setSelectedWarEvent(null); return; }
  }, [previewItem, selectedWarEvent]);

  const onMapReady = useCallback(() => {
    mapRef.current?.animateCamera(INIT_CAM, { duration: 1000 });
  }, []);

  // ── Colors ────────────────────────────────────────────────────────────────────
  const accent = isDark ? '#F59E0B' : '#2563EB';
  const cardBg = isDark ? '#1C1917' : '#FFFFFF';
  const borderCol = isDark ? '#292524' : '#E5E5E5';

  // ── Sheet content: show active country events, or all zoomed events ───────────
  const sheetCluster: Cluster | null = useMemo(() => {
    if (activeCluster) return activeCluster;
    if (isZoomedIn && !activeCountry && activeEventsWithLocation.length > 0) {
      // Build a virtual cluster from all visible events
      const byCat = new Map<string, EventWithLocation[]>();
      for (const item of activeEventsWithLocation) {
        const cat = getCat(item.event);
        if (!byCat.has(cat)) byCat.set(cat, []);
        byCat.get(cat)!.push(item);
      }
      const cats: CatGroup[] = Array.from(byCat.entries())
        .map(([key, evts]) => ({
          key,
          color: CAT[key]?.color ?? FALLBACK_COLOR,
          emoji: CAT[key]?.emoji ?? 'star',
          labelKey: CAT[key]?.tKey ?? key,
          events: evts.sort((a, b) => (b.event.impactScore ?? 0) - (a.event.impactScore ?? 0)),
        }))
        .sort((a, b) => b.events.length - a.events.length);
      return {
        country: 'Area',
        lat: 0,
        lng: 0,
        items: activeEventsWithLocation,
        cats,
        mainColor: cats[0]?.color ?? FALLBACK_COLOR,
        count: activeEventsWithLocation.length,
      };
    }
    return null;
  }, [activeCluster, isZoomedIn, activeCountry, eventsWithLocation]);

  const sheetOpen = (sheetY as any)._value > 0 || activeCountry !== null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={INIT_REGION}
        mapType="terrain"
        showsUserLocation
        showsCompass={false}
        showsScale={false}
        pitchEnabled
        rotateEnabled
        minZoomLevel={0}
        onMapReady={onMapReady}
        onPress={onMapPress}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {/* World view — one count-bubble per country (hidden when any overlay layer is active) */}
        {!isZoomedIn && (mapLayer === 'off' || mapLayer === 'time') &&
          activeClusters.map((cluster) => (
            <SmartMarker
              key={`cluster-${cluster.country}`}
              redraw={`${cluster.mainColor}-${cluster.count}`}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
              title={cluster.country}
              description={`${cluster.count} event${cluster.count !== 1 ? 's' : ''}`}
              onPress={() => onClusterPress(cluster)}
              anchor={{ x: 0.5, y: 1 }}
            >
              {(() => {
                const n = cluster.count;
                const dia = n > 99 ? 32 : n > 9 ? 30 : 28;
                return <PinHead color={cluster.mainColor} size={dia} text={n > 99 ? '99+' : String(n)} />;
              })()}
            </SmartMarker>
          ))}

        {/* Zoomed view — individual category pins (hidden when any overlay layer is active) */}
        {isZoomedIn && (mapLayer === 'off' || mapLayer === 'time') &&
          visibleCityEvents.map((item, idx) => {
            const catKey = getCat(item.event);
            const color = CAT[catKey]?.color ?? FALLBACK_COLOR;
            const isPro = !!(item.event?.isPro || item.event?.is_pro);
            const c = isPro ? '#F59E0B' : color;
            return (
              <SmartMarker
                key={`city-${idx}-${item.lat}-${item.lng}`}
                redraw={c}
                coordinate={{ latitude: item.lat, longitude: item.lng }}
                title={isPro ? 'PRO — unlock to read' : undefined}
                onPress={() => openPreview(item)}
                anchor={{ x: 0.5, y: 1 }}
              >
                <PinHead color={c} size={28} iconKey={isPro ? 'crown' : (CAT[catKey]?.emoji ?? 'star')} />
              </SmartMarker>
            );
          })}
        {/* ── Empire Overlays ── */}
        {mapLayer === 'empires' && EMPIRE_BORDERS.filter(e => selectedEmpires.has(e.id)).map(empire => (
          <Polygon
            key={`empire-${empire.id}`}
            coordinates={empire.coordinates}
            strokeColor={empire.color}
            fillColor={empire.color + '28'}
            strokeWidth={2}
            tappable={false}
          />
        ))}

        {/* ── Heat Map ── */}
        {mapLayer === 'heatmap' && heatCells.map((cell, i) => (
          <Circle
            key={`heat-${i}`}
            center={{ latitude: cell.lat, longitude: cell.lng }}
            radius={80000 + cell.ratio * 380000}
            strokeColor="transparent"
            fillColor={`rgba(234,56,24,${(0.12 + cell.ratio * 0.52).toFixed(2)})`}
          />
        ))}

        {/* ── Explorer Routes ── */}
        {mapLayer === 'routes' && EXPLORER_ROUTES.filter(r => selectedRoutes.has(r.id)).map(route => (
          <React.Fragment key={`route-${route.id}`}>
            <Polyline
              coordinates={route.coordinates}
              strokeColor={route.color}
              strokeWidth={3}
              lineDashPattern={[8, 4]}
              geodesic
            />
            {route.keyStops.map((stop: any, idx: number) => {
              const snapped = snapToRoute(stop, route.coordinates);
              return (
                <SmartMarker
                  key={`stop-${route.id}-${idx}`}
                  redraw={route.color}
                  coordinate={{ latitude: snapped.latitude, longitude: snapped.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  title={stop.label}
                  onPress={() => { haptic('light'); setSelectedKeyStop({ route, stop }); }}
                >
                  <View style={[mkr.dot, { backgroundColor: route.color }]} />
                </SmartMarker>
              );
            })}
          </React.Fragment>
        ))}

        {/* ── Trade Routes ── */}
        {mapLayer === 'trade' && TRADE_ROUTES.filter(r => selectedTradeRoutes.has(r.id)).map(route => (
          <React.Fragment key={`trade-${route.id}`}>
            <Polyline
              coordinates={route.coordinates}
              strokeColor={route.color}
              strokeWidth={3}
              lineDashPattern={[10, 6]}
              geodesic
            />
            {route.keyStops.map((stop, idx) => {
              const snapped = snapToRoute(stop, route.coordinates);
              return (
                <SmartMarker
                  key={`trade-stop-${route.id}-${idx}`}
                  redraw={route.color}
                  coordinate={{ latitude: snapped.latitude, longitude: snapped.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  title={stop.label}
                  onPress={() => { haptic('light'); setSelectedKeyStop({ route, stop }); }}
                >
                  <View style={[mkr.dot, { backgroundColor: route.color }]} />
                </SmartMarker>
              );
            })}
          </React.Fragment>
        ))}

        {/* ── Ancient Cities — area "borders" for cities picked in the top chips ── */}
        {mapLayer === 'cities' && ANCIENT_CITIES.filter(c => selectedCities.has(c.id)).map(city => {
          const isFocused = selectedCity?.id === city.id;
          const r = city.status === 'modern_city' ? 130000 : city.status === 'ruins' ? 95000 : 80000;
          return (
            <Circle
              key={`city-zone-${city.id}`}
              center={{ latitude: city.latitude, longitude: city.longitude }}
              radius={isFocused ? r * 1.25 : r}
              strokeColor={city.color}
              fillColor={city.color + (isFocused ? '55' : '33')}
              strokeWidth={isFocused ? 3 : 2}
            />
          );
        })}

        {/* ── Ancient Cities — clean label-less pins (only for picked cities) ── */}
        {mapLayer === 'cities' && ANCIENT_CITIES.filter(c => selectedCities.has(c.id)).map(city => {
          const isFocused = selectedCity?.id === city.id;
          return (
            <SmartMarker
              key={`city-${city.id}`}
              redraw={`${city.color}-${isFocused}`}
              coordinate={{ latitude: city.latitude, longitude: city.longitude }}
              title={city.name}
              description={city.civilization}
              onPress={() => selectCity(city)}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isFocused ? 999 : 1}
            >
              <PinHead color={city.color} size={isFocused ? 32 : 28} emoji={city.emoji} selected={isFocused} />
            </SmartMarker>
          );
        })}

        {/* ── Famous Battles — conflict zone circles ── */}
        {mapLayer === 'battles' && FAMOUS_BATTLES.map(battle => (
          <Circle
            key={`battle-zone-${battle.id}`}
            center={{ latitude: battle.latitude, longitude: battle.longitude }}
            radius={selectedBattle?.id === battle.id ? 55000 : 35000}
            strokeColor={battle.color + (selectedBattle?.id === battle.id ? 'CC' : '60')}
            fillColor={battle.color + (selectedBattle?.id === battle.id ? '28' : '12')}
            strokeWidth={selectedBattle?.id === battle.id ? 2 : 1}
          />
        ))}

        {/* ── Famous Battles — emoji pins ── */}
        {mapLayer === 'battles' && FAMOUS_BATTLES.map(battle => {
          const isSel = selectedBattle?.id === battle.id;
          return (
            <SmartMarker
              key={`battle-${battle.id}`}
              redraw={`${battle.color}-${isSel}`}
              coordinate={{ latitude: battle.latitude, longitude: battle.longitude }}
              title={battle.name}
              description={battle.yearLabel}
              onPress={() => selectBattle(battle)}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isSel ? 999 : 1}
            >
              <PinHead color={battle.color} size={isSel ? 32 : 28} emoji={battle.emoji} selected={isSel} />
            </SmartMarker>
          );
        })}

        {/* Battle phase troop markers — labeled pins by side */}
        {mapLayer === 'battles' && selectedBattle && selectedBattle.phases[battlePhase]?.positions.map((pos, idx) => {
          const sideCol = pos.side === 'attacker' ? '#DC2626' : pos.side === 'defender' ? '#2563EB' : '#6B7280';
          return (
            <SmartMarker
              key={`troop-${selectedBattle.id}-${battlePhase}-${idx}`}
              redraw={`${sideCol}-${battlePhase}`}
              coordinate={{ latitude: pos.latitude, longitude: pos.longitude }}
              title={pos.label}
              description={pos.troops ?? pos.note}
              anchor={{ x: 0.5, y: 1 }}
            >
              <PinHead color={sideCol} size={26} iconKey={pos.side === 'attacker' ? 'sword' : 'shield'} />
            </SmartMarker>
          );
        })}

        {/* Religion Spread Circles */}
        {mapLayer === 'religion' && RELIGIONS.filter(r => selectedReligions.has(r.id)).map(religion =>
          religion.regions
            .filter(region => region.yearStart <= religionYear)
            .map(region => (
              <Circle
                key={`rel-${religion.id}-${region.id}`}
                center={{ latitude: region.latitude, longitude: region.longitude }}
                radius={region.radius}
                strokeColor={religion.color + '60'}
                fillColor={religion.color + Math.round(region.intensity * 40).toString(16).padStart(2, '0')}
                strokeWidth={1}
              />
            ))
        )}
        {mapLayer === 'religion' && RELIGIONS.filter(r => selectedReligions.has(r.id)).map(religion => (
          <SmartMarker
            key={`rel-origin-${religion.id}`}
            redraw={religion.color}
            coordinate={religion.origin}
            title={religion.name}
            anchor={{ x: 0.5, y: 1 }}
          >
            <PinHead color={religion.color} size={28} emoji={religion.emoji} />
          </SmartMarker>
        ))}

        {/* ── Plagues — spread circles ── */}
        {mapLayer === 'plagues' && visiblePlagueData && visiblePlagueData.regions.map((region, i) => (
          <Circle
            key={`plague-circle-${i}`}
            center={{ latitude: region.latitude, longitude: region.longitude }}
            radius={region.radius}
            strokeColor={visiblePlagueData.pandemic.color + '40'}
            fillColor={visiblePlagueData.pandemic.color + Math.round(region.intensity * 38).toString(16).padStart(2, '0')}
            strokeWidth={1}
          />
        ))}
        {/* Plague origin pin */}
        {mapLayer === 'plagues' && selectedPlagueId && (() => {
          const pandemic = PANDEMICS.find(p => p.id === selectedPlagueId);
          if (!pandemic) return null;
          return (
            <SmartMarker
              key={`plague-origin-${pandemic.id}`}
              redraw={pandemic.color}
              coordinate={pandemic.origin}
              title={pandemic.name}
              description={`${tm('origin')}: ${pandemic.origin.label}`}
              anchor={{ x: 0.5, y: 1 }}
            >
              <PinHead color={pandemic.color} size={32} emoji={pandemic.emoji} selected />
            </SmartMarker>
          );
        })()}

        {/* ── Pirate Routes ── */}
        {mapLayer === 'pirates' && PIRATE_ROUTES.filter(r => selectedPirateRoutes.has(r.id)).map(route => (
          <React.Fragment key={`pirate-${route.id}`}>
            <Polyline
              coordinates={route.coordinates}
              strokeColor={route.color}
              strokeWidth={3}
              lineDashPattern={[8, 6]}
              geodesic
            />
            {route.keyStops.map((stop, idx) => {
              const snapped = snapToRoute(stop, route.coordinates);
              return (
                <SmartMarker
                  key={`pirate-stop-${route.id}-${idx}`}
                  redraw={route.color}
                  coordinate={{ latitude: snapped.latitude, longitude: snapped.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  title={stop.label}
                  onPress={() => { haptic('light'); setSelectedKeyStop({ route, stop }); }}
                >
                  <View style={[mkr.dot, { backgroundColor: route.color }]} />
                </SmartMarker>
              );
            })}
          </React.Fragment>
        ))}

        {/* ── Nuclear Test Sites — circles ── */}
        {mapLayer === 'nuclear' && NUCLEAR_SITES.filter(s => selectedNuclearCountries.has(s.country)).map(site => (
          <React.Fragment key={`nuclear-site-${site.id}`}>
            <Circle
              center={{ latitude: site.latitude, longitude: site.longitude }}
              radius={site.radius}
              strokeColor={site.color + '50'}
              fillColor={site.color + '18'}
              strokeWidth={1.5}
            />
            <SmartMarker
              redraw={`${site.color}-${selectedNuclearSite?.id === site.id}`}
              coordinate={{ latitude: site.latitude, longitude: site.longitude }}
              title={site.name}
              description={`${site.totalTests} tests · ${site.period}`}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => { haptic('medium'); setSelectedNuclearSite(site); setSelectedNuclearEvent(null); }}
              zIndex={selectedNuclearSite?.id === site.id ? 999 : 1}
            >
              <PinHead color={site.color} size={selectedNuclearSite?.id === site.id ? 32 : 28}
                text={site.flag} selected={selectedNuclearSite?.id === site.id} />
            </SmartMarker>
          </React.Fragment>
        ))}
        {/* Nuclear Events — event pins */}
        {mapLayer === 'nuclear' && NUCLEAR_EVENTS.filter(e =>
          e.country === 'multi' || selectedNuclearCountries.has(e.country as string)
        ).map(event => {
          const isSel = selectedNuclearEvent?.id === event.id;
          return (
            <SmartMarker
              key={`nuclear-event-${event.id}`}
              redraw={`${event.color}-${isSel}`}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
              title={event.title}
              description={`${event.year} · ${event.type.replace('_', ' ')}`}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => { haptic('medium'); setSelectedNuclearEvent(event); setSelectedNuclearSite(null); }}
              zIndex={isSel ? 999 : event.significance}
            >
              <PinHead color={event.color} size={isSel ? 32 : event.significance === 3 ? 30 : 26}
                emoji={NUCLEAR_EVENT_EMOJI[event.type] ?? '☢️'} selected={isSel} />
            </SmartMarker>
          );
        })}

        {/* ── Dinosaur Fossil Sites ── */}
        {mapLayer === 'dinosaurs' && DINOSAUR_SITES.filter(s => selectedDinoEras.has(s.era)).map(site => {
          const isSel = selectedDinoSite?.id === site.id;
          const r = site.significance === 3 ? 220000 : site.significance === 2 ? 130000 : 75000;
          return (
            <React.Fragment key={`dino-${site.id}`}>
              <Circle
                center={{ latitude: site.latitude, longitude: site.longitude }}
                radius={isSel ? r * 1.3 : r}
                strokeColor={site.color + '60'}
                fillColor={site.color + (isSel ? '28' : '14')}
                strokeWidth={isSel ? 2 : 1}
              />
              <SmartMarker
                redraw={`${site.color}-${isSel}`}
                coordinate={{ latitude: site.latitude, longitude: site.longitude }}
                title={site.name}
                description={site.geologicalPeriod}
                anchor={{ x: 0.5, y: 1 }}
                onPress={() => { haptic('medium'); setSelectedDinoSite(site); }}
                zIndex={isSel ? 999 : site.significance}
              >
                <PinHead color={site.color} size={isSel ? 32 : site.significance === 3 ? 30 : 26}
                  emoji={site.emoji} selected={isSel} />
              </SmartMarker>
            </React.Fragment>
          );
        })}

        {/* ── WW1/WW2 — alliance territory highlights (subtle background) ── */}
        {(mapLayer === 'ww1' || mapLayer === 'ww2') && WAR_TERRITORIES.filter(t => t.war === mapLayer).map(t => {
          const col = sideColorOf(t.side);
          return (
            <Polygon
              key={`terr-${t.id}`}
              coordinates={t.coordinates}
              strokeColor={col + '35'}
              fillColor={col + '18'}
              strokeWidth={0.8}
              tappable={false}
            />
          );
        })}

        {/* ── WW1/WW2 — battle / event pins (red = Axis/Central, blue = Allied) ── */}
        {(mapLayer === 'ww1' ? visibleWW1Events : mapLayer === 'ww2' ? visibleWW2Events : []).map(e => {
          const col = sideColorOf(e.side);
          const isSel = selectedWarEvent?.id === e.id;
          const size = e.significance === 3 ? 32 : e.significance === 2 ? 28 : 24;
          return (
            <SmartMarker
              key={`war-${e.id}`}
              redraw={`${col}-${isSel}`}
              coordinate={{ latitude: e.latitude, longitude: e.longitude }}
              title={e.title}
              description={`${e.year} · ${String(e.type).replace('_', ' ')}`}
              onPress={() => selectWarEvent(e)}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={isSel ? 999 : e.significance}
            >
              <PinHead color={col} size={isSel ? Math.min(size + 4, 32) : size} selected={isSel} iconKey={WAR_TYPE_ICON[e.type] ?? 'sword'} />
            </SmartMarker>
          );
        })}
      </MapView>

      {/* ── Top status pill ── */}
      <View
        style={[styles.topBar, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={[styles.topPill, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {loading ? (
            <>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[styles.topText, { color: accent }]}>{tm('loading')}</Text>
            </>
          ) : activeCountry ? (
            <>
              <View style={[styles.topDot, { backgroundColor: activeCluster?.mainColor ?? accent }]} />
              <Text style={[styles.topTextBold, { color: theme.text }]}>{activeCountry}</Text>
              <Text style={[styles.topText, { color: theme.subtext }]}>
                · {activeCluster?.count ?? 0} {tm('events')}
              </Text>
            </>
          ) : isZoomedIn ? (
            <>
              <MapPin size={14} color={accent} strokeWidth={2} />
              <Text style={[styles.topTextBold, { color: theme.text }]}>{visibleCityEvents.length}</Text>
              <Text style={[styles.topText, { color: theme.subtext }]}>{tm('events')}</Text>
            </>
          ) : (
            <>
              <Globe2 size={16} color={accent} strokeWidth={2} />
              <Text style={[styles.topTextBold, { color: theme.text }]}>{total}</Text>
              <Text style={[styles.topText, { color: theme.subtext }]}>
                {tm('events_across')} {clusters.length} {tm('countries')}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* ── Back to world button ── */}
      {(activeCountry || isZoomedIn) && (
        <TouchableOpacity
          onPress={zoomOut}
          activeOpacity={0.8}
          style={[
            styles.backBtn,
            { top: insets.top + 60, backgroundColor: cardBg, borderColor: borderCol },
          ]}
        >
          <Globe2 size={14} color={accent} strokeWidth={2.5} />
          <Text style={[styles.backText, { color: accent }]}>{tm('back_to_world')}</Text>
        </TouchableOpacity>
      )}

      {/* ── Single Layers button ── */}
      <TouchableOpacity
        onPress={() => { haptic('medium'); setLayersOpen(v => !v); }}
        activeOpacity={0.8}
        style={[styles.layerBtn, styles.layerBtnSingle, {
          top: insets.top + (activeCountry || isZoomedIn ? 110 : 62),
          backgroundColor: (mapLayer !== 'off' || layersOpen) ? accent : cardBg,
          borderColor: (mapLayer !== 'off' || layersOpen) ? accent : borderCol,
        }]}
      >
        <Layers size={17} color={(mapLayer !== 'off' || layersOpen) ? '#FFF' : theme.subtext} strokeWidth={2} />
      </TouchableOpacity>

      {/* ── Layers selection panel ── */}
      {layersOpen && (
        <View style={[styles.layersPanel, {
          top: insets.top + (activeCountry || isZoomedIn ? 162 : 114),
          backgroundColor: cardBg, borderColor: borderCol,
          maxHeight: H * 0.55,
        }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {([
              { id: 'time'     as const, Icon: Clock,       label: tm('time_filter'), desc: tm('layer_time_desc'),                                                                         badge: 'pro'   as const },
              { id: 'heatmap'  as const, Icon: Thermometer, label: tm('heat_map'),    desc: tm('layer_heatmap_desc'),                                                                     badge: 'free'  as const },
              { id: 'empires'  as const, Icon: Castle,      label: tm('empires'),     desc: `${EMPIRE_BORDERS.length} ${tm('layer_empires_desc')}`,                                       badge: 'pro'   as const },
              { id: 'routes'   as const, Icon: Navigation,  label: tm('routes'),      desc: `${EXPLORER_ROUTES.length} ${tm('layer_routes_desc')}`,                                       badge: 'video' as const },
              { id: 'battles'  as const, Icon: Swords,      label: tm('battles'),     desc: `${FAMOUS_BATTLES.length} ${tm('layer_battles_desc')}`,                                       badge: 'free'  as const },
              { id: 'cities'   as const, Icon: CircleIcon,  label: tm('cities'),      desc: `${ANCIENT_CITIES.length} ${tm('layer_cities_desc')}`,                                        badge: 'video' as const },
              { id: 'trade'    as const, Icon: Navigation,  label: tm('trade'),       desc: `${TRADE_ROUTES.length} ${tm('layer_trade_desc')}`,                                           badge: 'video' as const },
              { id: 'religion' as const, Icon: Globe2,      label: tm('religion'),    desc: tm('layer_religion_desc'),                                                                     badge: 'free'  as const },
              { id: 'ww1'       as const, Icon: Swords,      label: 'WW1 1914–1918',  desc: `${WW1_EVENTS.length} ${tm('layer_ww_battles')}`,                                             badge: 'free'  as const },
              { id: 'ww2'       as const, Icon: Swords,      label: 'WW2 1939–1945',  desc: `${WW2_EVENTS.length} ${tm('layer_ww_battles')}`,                                             badge: 'free'  as const },
              { id: 'plagues'   as const, Icon: Thermometer, label: tm('layer_plagues'),   desc: `${PANDEMICS.length} ${tm('layer_plagues_desc')}`,                                       badge: 'pro'   as const },
              { id: 'pirates'   as const, Icon: Navigation,  label: tm('layer_pirates'),   desc: `${PIRATE_ROUTES.length} ${tm('layer_pirates_desc')}`,                                   badge: 'pro'   as const },
              { id: 'nuclear'   as const, Icon: CircleIcon,  label: tm('layer_nuclear'),   desc: `${NUCLEAR_SITES.length} ${tm('layer_nuclear_desc_sites')} · ${NUCLEAR_EVENTS.length} ${tm('layer_nuclear_desc_events')}`, badge: 'pro' as const },
              { id: 'dinosaurs' as const, Icon: Globe2,      label: tm('layer_dinosaurs'), desc: `${DINOSAUR_SITES.length} ${tm('layer_dinosaurs_desc')}`,                                badge: 'pro'   as const },
            ]).map(({ id, Icon, label, desc, badge }) => {
              const active = mapLayer === id;
              const lockedPro = !isPro && badge === 'pro';
              const lockedVideo = !isPro && badge === 'video' && (
                (id === 'routes'  && !routesUnlocked) ||
                (id === 'trade'   && !tradeUnlocked)  ||
                (id === 'cities'  && !citiesUnlocked)
              );
              return (
                <TouchableOpacity key={id} onPress={() => toggleLayer(id)} activeOpacity={0.75}
                  style={[styles.layersPanelRow, active && { backgroundColor: accent + '12' }]}>
                  <View style={[styles.layersPanelIcon, { backgroundColor: active ? accent + '22' : (isDark ? '#292524' : '#F5F5F5') }]}>
                    <Icon size={14} color={active ? accent : theme.subtext} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.layersPanelLabel, { color: active ? accent : theme.text }]}>{label}</Text>
                    <Text style={[styles.layersPanelDesc, { color: theme.subtext }]}>{desc}</Text>
                  </View>
                  {active ? (
                    <View style={[styles.layersPanelDot, { backgroundColor: accent }]} />
                  ) : badge === 'free' ? (
                    <View style={[styles.layersPanelBadge, { backgroundColor: '#05966920' }]}>
                      <Text style={[styles.layersPanelBadgeText, { color: '#059669' }]}>FREE</Text>
                    </View>
                  ) : lockedVideo ? (
                    <View style={[styles.layersPanelBadge, { backgroundColor: '#D9770620' }]}>
                      <Text style={[styles.layersPanelBadgeText, { color: '#D97706' }]}>▶ VIDEO</Text>
                    </View>
                  ) : lockedPro ? (
                    <Crown size={13} color="#D97706" strokeWidth={2.5} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
            {mapLayer !== 'off' && (
              <>
                <View style={[styles.layersPanelSep, { backgroundColor: borderCol }]} />
                <TouchableOpacity onPress={() => { haptic('light'); setMapLayer('off'); setLayersOpen(false); setSelectedKeyStop(null); setSelectedBattle(null); setSelectedCity(null); setSelectedWarEvent(null); setSelectedPlagueId(null); setSelectedNuclearSite(null); setSelectedNuclearEvent(null); setSelectedDinoSite(null); }}
                  activeOpacity={0.75} style={styles.layersPanelRow}>
                  <View style={[styles.layersPanelIcon, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}>
                    <X size={14} color={theme.subtext} strokeWidth={2} />
                  </View>
                  <Text style={[styles.layersPanelLabel, { color: theme.subtext }]}>{tm('clear_layer')}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Backdrop tap to close layers panel ── */}
      {layersOpen && (
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0} onPress={() => setLayersOpen(false)} />
      )}

      {/* ── Empire / Route / Trade / Religion / Battle / War / City chips ── */}
      {(mapLayer === 'empires' || mapLayer === 'routes' || mapLayer === 'trade' || mapLayer === 'religion' || mapLayer === 'battles' || mapLayer === 'cities' || mapLayer === 'plagues' || mapLayer === 'pirates' || mapLayer === 'nuclear' || mapLayer === 'dinosaurs') && (
        <View style={[styles.chipsRow, { top: insets.top + (activeCountry || isZoomedIn ? 110 : 52) }]} pointerEvents="box-none">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {mapLayer === 'empires' ? EMPIRE_BORDERS.map(empire => {
              const on = selectedEmpires.has(empire.id);
              return (
                <TouchableOpacity key={empire.id} onPress={() => toggleEmpire(empire.id)}
                  style={[styles.chip, { backgroundColor: on ? empire.color + '22' : cardBg, borderColor: on ? empire.color : borderCol }]}>
                  <View style={[styles.chipDot, { backgroundColor: empire.color }]} />
                  <Text style={[styles.chipLabel, { color: on ? empire.color : theme.subtext }]} numberOfLines={1}>{(tLang && empire.translations?.[tLang]?.name) ?? empire.name}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'cities' ? ANCIENT_CITIES.map(city => {
              const on = selectedCities.has(city.id);
              return (
                <TouchableOpacity key={city.id} onPress={() => toggleCity(city)}
                  style={[styles.chip, { backgroundColor: on ? city.color + '22' : cardBg, borderColor: on ? city.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{city.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? city.color : theme.subtext }]} numberOfLines={1}>{city.name}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'routes' ? EXPLORER_ROUTES.map(route => {
              const on = selectedRoutes.has(route.id);
              return (
                <TouchableOpacity key={route.id} onPress={() => toggleRoute(route.id)}
                  style={[styles.chip, { backgroundColor: on ? route.color + '22' : cardBg, borderColor: on ? route.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{route.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? route.color : theme.subtext }]} numberOfLines={1}>
                    {route.explorer.split('&')[0].split('–')[0].trim()}
                  </Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'trade' ? TRADE_ROUTES.map(route => {
              const on = selectedTradeRoutes.has(route.id);
              return (
                <TouchableOpacity key={route.id} onPress={() => toggleTradeRoute(route.id)}
                  style={[styles.chip, { backgroundColor: on ? route.color + '22' : cardBg, borderColor: on ? route.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{route.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? route.color : theme.subtext }]} numberOfLines={1}>{((tLang && route.translations?.[tLang]?.name) ?? route.name).split(' ').slice(0, 2).join(' ')}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'religion' ? RELIGIONS.map(rel => {
              const on = selectedReligions.has(rel.id);
              return (
                <TouchableOpacity key={rel.id} onPress={() => toggleReligion(rel.id)}
                  style={[styles.chip, { backgroundColor: on ? rel.color + '22' : cardBg, borderColor: on ? rel.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{rel.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? rel.color : theme.subtext }]} numberOfLines={1}>{(tLang && rel.translations?.[tLang]?.name) ?? rel.name}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'battles' ? FAMOUS_BATTLES.map(battle => {
              const on = selectedBattle?.id === battle.id;
              return (
                <TouchableOpacity key={battle.id} onPress={() => on ? setSelectedBattle(null) : selectBattle(battle)}
                  style={[styles.chip, { backgroundColor: on ? battle.color + '22' : cardBg, borderColor: on ? battle.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{battle.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? battle.color : theme.subtext }]} numberOfLines={1}>{((tLang && battle.translations?.[tLang]?.name) ?? battle.name).replace('Battle of ', '')}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'plagues' ? PANDEMICS.map(p => {
              const on = selectedPlagueId === p.id;
              return (
                <TouchableOpacity key={p.id} onPress={() => selectPandemic(on ? null : p.id)}
                  style={[styles.chip, { backgroundColor: on ? p.color + '22' : cardBg, borderColor: on ? p.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{p.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? p.color : theme.subtext }]} numberOfLines={1}>{p.name.replace('Plague of ', '').replace(' Pandemic', '').slice(0, 18)}</Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'pirates' ? PIRATE_ROUTES.map(route => {
              const on = selectedPirateRoutes.has(route.id);
              return (
                <TouchableOpacity key={route.id} onPress={() => togglePirateRoute(route.id)}
                  style={[styles.chip, { backgroundColor: on ? route.color + '22' : cardBg, borderColor: on ? route.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{route.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? route.color : theme.subtext }]} numberOfLines={1}>
                    {route.captain.split('(')[0].split(',')[0].trim().replace('"', '').replace('"', '').slice(0, 14)}
                  </Text>
                </TouchableOpacity>
              );
            }) : mapLayer === 'nuclear' ? (() => {
              const seen = new Map<string, { color: string; flag: string }>();
              for (const site of NUCLEAR_SITES) {
                if (!seen.has(site.country)) seen.set(site.country, { color: site.color, flag: site.flag });
              }
              return Array.from(seen.entries()).map(([country, info]) => {
                const on = selectedNuclearCountries.has(country);
                const label = country.replace(/_/g, ' ').replace('north korea', 'N.Korea').toUpperCase();
                return (
                  <TouchableOpacity key={country} onPress={() => toggleNuclearCountry(country)}
                    style={[styles.chip, { backgroundColor: on ? info.color + '22' : cardBg, borderColor: on ? info.color : borderCol }]}>
                    <Text style={styles.chipEmoji}>{info.flag}</Text>
                    <Text style={[styles.chipLabel, { color: on ? info.color : theme.subtext }]} numberOfLines={1}>{label}</Text>
                  </TouchableOpacity>
                );
              });
            })() : mapLayer === 'dinosaurs' ? DINO_ERA_CONFIG.map(era => {
              const on = selectedDinoEras.has(era.id);
              return (
                <TouchableOpacity key={era.id} onPress={() => toggleDinoEra(era.id)}
                  style={[styles.chip, { backgroundColor: on ? era.color + '22' : cardBg, borderColor: on ? era.color : borderCol }]}>
                  <Text style={styles.chipEmoji}>{era.emoji}</Text>
                  <Text style={[styles.chipLabel, { color: on ? era.color : theme.subtext }]}>{tm(`era_${era.id}`)}</Text>
                </TouchableOpacity>
              );
            }) : null}
          </ScrollView>
        </View>
      )}

      {/* ── Time Slider ── */}
      {mapLayer === 'time' && (
        <View style={[styles.sliderCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderYearLabel, { color: accent }]}>
              {filteredYear < 0 ? `${Math.abs(filteredYear)} BC` : `${filteredYear} AD`}
            </Text>
            <TouchableOpacity onPress={() => setSliderRatio(1)}>
              <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>{tm('all_time')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}
            contentContainerStyle={{ paddingHorizontal: 2, gap: 6, flexDirection: 'row' }}>
            {ERA_PRESETS.map(p => {
              const pRatio = Math.max(0, Math.min(1, (p.year - minYear) / Math.max(1, maxYear - minYear)));
              const isActive = Math.abs(filteredYear - p.year) < 60;
              return (
                <TouchableOpacity key={p.label}
                  onPress={() => { haptic('selection'); setSliderRatio(pRatio); }}
                  style={[styles.eraPreset, { borderColor: isActive ? accent : borderCol, backgroundColor: isActive ? accent + '14' : 'transparent' }]}>
                  <Text style={[styles.eraPresetText, { color: isActive ? accent : theme.subtext }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sliderTrackWrap}
            onLayout={e => { sliderBarWidthRef.current = e.nativeEvent.layout.width; }}
            {...sliderPan.panHandlers}>
            <View style={[styles.sliderTrack, { backgroundColor: borderCol }]}>
              <View style={[styles.sliderFill, { width: `${sliderRatio * 100}%` as any, backgroundColor: accent }]} />
            </View>
            <View style={[styles.sliderThumb, { left: `${sliderRatio * 100}%` as any, backgroundColor: accent, borderColor: cardBg }]} />
          </View>
        </View>
      )}

      {/* ── Route key stop info card ── */}
      {selectedKeyStop && (
        <View style={[styles.keyStopCard, { bottom: insets.bottom + 16, backgroundColor: cardBg, borderColor: borderCol }]}>
          <TouchableOpacity onPress={() => setSelectedKeyStop(null)} style={styles.keyStopClose}>
            <X size={14} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>
          <View style={[styles.keyStopDot, { backgroundColor: selectedKeyStop.route.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.keyStopTitle, { color: theme.text }]}>{selectedKeyStop.stop.label}</Text>
            <Text style={[styles.keyStopNote, { color: theme.subtext }]} numberOfLines={3}>{selectedKeyStop.stop.note}</Text>
            <Text style={[styles.keyStopRouteName, { color: selectedKeyStop.route.color }]}>{(tLang && selectedKeyStop.route.translations?.[tLang]?.name) ?? selectedKeyStop.route.name}</Text>
          </View>
        </View>
      )}

      {/* ── Religion Year Slider ── */}
      {mapLayer === 'religion' && (
        <View style={[styles.sliderCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderYearLabel, { color: accent }]}>
              {religionYear < 0 ? `${Math.abs(religionYear)} BC` : `${religionYear} AD`}
            </Text>
            <TouchableOpacity onPress={() => setReligionYear(2000)}>
              <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>{tm('all_time')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sliderTrackWrap}
            onLayout={e => { religionSliderWidthRef.current = e.nativeEvent.layout.width; }}
            {...religionSliderPan.panHandlers}>
            <View style={[styles.sliderTrack, { backgroundColor: borderCol }]}>
              <View style={[styles.sliderFill, {
                width: `${((religionYear - RELIGION_YEAR_MIN) / (RELIGION_YEAR_MAX - RELIGION_YEAR_MIN)) * 100}%` as any,
                backgroundColor: accent,
              }]} />
            </View>
            <View style={[styles.sliderThumb, {
              left: `${((religionYear - RELIGION_YEAR_MIN) / (RELIGION_YEAR_MAX - RELIGION_YEAR_MIN)) * 100}%` as any,
              backgroundColor: accent, borderColor: cardBg,
            }]} />
          </View>
        </View>
      )}

      {/* ── WW1 / WW2 Year Navigator ── */}
      {(mapLayer === 'ww1' || mapLayer === 'ww2') && !selectedWarEvent && (() => {
        const isWW1 = mapLayer === 'ww1';
        const currentYear = isWW1 ? ww1Year : ww2Year;
        const yearMin = isWW1 ? WW1_YEAR_MIN : WW2_YEAR_MIN;
        const yearMax = isWW1 ? WW1_YEAR_MAX : WW2_YEAR_MAX;
        const phase = isWW1
          ? (WW1_PHASES[currentYear]?.[language] ?? WW1_PHASES[currentYear]?.en)
          : (WW2_PHASES[currentYear]?.[language] ?? WW2_PHASES[currentYear]?.en);
        const currentEvents = isWW1 ? visibleWW1Events : visibleWW2Events;
        const decrement = isWW1 ? decrementWW1Year : decrementWW2Year;
        const increment = isWW1 ? incrementWW1Year : incrementWW2Year;
        const yearRange = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMin + i);
        const centralLabel = tm(isWW1 ? 'central_powers' : 'axis_powers');
        return (
          <View style={[styles.warYearCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: isDark ? '#DC262628' : '#DC262618' }]}>
            {/* Close — exits the WW1/WW2 layer */}
            <TouchableOpacity
              onPress={() => { haptic('light'); setMapLayer('off'); setSelectedWarEvent(null); }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.warCardClose, { backgroundColor: '#DC262618', borderColor: '#DC262650' }]}
            >
              <X size={18} color="#DC2626" strokeWidth={2.6} />
            </TouchableOpacity>

            {/* Year navigation */}
            <View style={styles.warYearNavRow}>
              <TouchableOpacity
                onPress={decrement}
                disabled={currentYear <= yearMin}
                style={[styles.warYearArrow, { opacity: currentYear <= yearMin ? 0.25 : 1, backgroundColor: '#DC262615' }]}
              >
                <ChevronLeft size={20} color="#DC2626" strokeWidth={2.5} />
              </TouchableOpacity>

              <View style={styles.warYearCenter}>
                <Text style={styles.warYearNumber}>{currentYear}</Text>
                {phase && (
                  <Text style={[styles.warYearPhaseName, { color: theme.text }]}>{phase.name}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={increment}
                disabled={currentYear >= yearMax}
                style={[styles.warYearArrow, { opacity: currentYear >= yearMax ? 0.25 : 1, backgroundColor: '#DC262615' }]}
              >
                <ChevronRight size={20} color="#DC2626" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Year progress dots */}
            <View style={styles.warYearDots}>
              {yearRange.map(y => (
                <TouchableOpacity key={y} onPress={() => { haptic('selection'); isWW1 ? setWw1Year(y) : setWw2Year(y); setSelectedWarEvent(null); }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <View style={{
                    width: y === currentYear ? 20 : 7, height: 7, borderRadius: 3.5,
                    backgroundColor: y === currentYear ? '#DC2626' : (isDark ? '#DC262635' : '#DC262625'),
                  }} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Phase narrative */}
            {phase && (
              <Text style={[styles.warYearDesc, { color: theme.subtext }]}>{phase.description}</Text>
            )}

            {/* Key stat */}
            {phase && (
              <View style={[styles.warYearStatRow, { backgroundColor: '#DC262610', borderColor: '#DC262628' }]}>
                <Text style={styles.warYearStatIcon}>⚔️</Text>
                <Text style={[styles.warYearStatText, { color: theme.text }]}>{phase.stat}</Text>
              </View>
            )}

            {/* Events this year — tappable chips */}
            {currentEvents.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
                <View style={{ flexDirection: 'row', gap: 6, paddingRight: 4 }}>
                  {currentEvents.map(e => {
                    const col = sideColorOf(e.side);
                    const iconKey = WAR_TYPE_ICON[e.type] ?? 'sword';
                    return (
                      <TouchableOpacity
                        key={e.id}
                        onPress={() => selectWarEvent(e)}
                        activeOpacity={0.7}
                        style={[styles.warEventChip, { backgroundColor: col + '15', borderColor: col + '40' }]}
                      >
                        <GameIcon iconKey={iconKey} size={11} color={col} />
                        <Text style={[styles.warEventChipText, { color: col }]} numberOfLines={1}>
                          {e.title.split(':')[0].split('–')[0].trim().slice(0, 28)}
                        </Text>
                        {e.significance === 3 && (
                          <View style={[styles.warEventChipStar, { backgroundColor: col }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* Alliance legend */}
            <View style={styles.warYearLegendRow}>
              <View style={[mls.warLegend, { backgroundColor: '#DC262612' }]}>
                <View style={[mls.warLegendDot, { backgroundColor: '#DC2626' }]} />
                <Text style={[mls.warLegendText, { color: '#DC2626' }]}>{centralLabel}</Text>
              </View>
              <Text style={[styles.warYearEventCount, { color: theme.subtext }]}>
                {currentEvents.length} {tm('events')} · {tm('tap_to_explore')}
              </Text>
              <View style={[mls.warLegend, { backgroundColor: '#2563EB12' }]}>
                <View style={[mls.warLegendDot, { backgroundColor: '#2563EB' }]} />
                <Text style={[mls.warLegendText, { color: '#2563EB' }]}>{tm('allied')}</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* ── War Event Detail Card ── */}
      {(mapLayer === 'ww1' || mapLayer === 'ww2') && selectedWarEvent && (
        <View style={[styles.warEventCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: warEventSideColor + '60' }]}>
          <TouchableOpacity
            onPress={() => { haptic('light'); setSelectedWarEvent(null); }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.warCardClose, { backgroundColor: warEventSideColor + '18', borderColor: warEventSideColor + '50' }]}
          >
            <X size={18} color={warEventSideColor} strokeWidth={2.6} />
          </TouchableOpacity>
          <View style={styles.warEventHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={[styles.warSideBadge, { backgroundColor: warEventSideColor + '20' }]}>
                <View style={[mls.warLegendDot, { backgroundColor: warEventSideColor }]} />
                <Text style={[styles.warSideText, { color: warEventSideColor }]}>{selectedWarEvent.side?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.warEventType, { color: theme.subtext }]}>{selectedWarEvent.type?.replace('_', ' ')}</Text>
              <Text style={[styles.warEventYear, { color: warEventSideColor }]}>{selectedWarEvent.year}</Text>
              {'significance' in selectedWarEvent && (
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3].map(s => (
                    <View key={s} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s <= selectedWarEvent.significance ? warEventSideColor : borderCol }} />
                  ))}
                </View>
              )}
            </View>
            <Text style={[styles.warEventTitle, { color: theme.text }]}>{selectedWarEvent.translations?.[language]?.title ?? selectedWarEvent.title}</Text>
          </View>
          <Text style={[styles.warEventDesc, { color: theme.subtext }]} numberOfLines={4}>{selectedWarEvent.translations?.[language]?.description ?? selectedWarEvent.description}</Text>
          {selectedWarEvent.casualties && (
            <View style={[styles.warCasRow, { backgroundColor: '#DC262610', borderColor: '#DC262625' }]}>
              <Text style={styles.warCasIcon}>⚔️</Text>
              <Text style={[styles.warCasText, { color: theme.text }]}>{selectedWarEvent.casualties}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Battle Phase Card ── */}
      {mapLayer === 'battles' && selectedBattle && (
        <View style={[styles.battleCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: selectedBattle.color + '50' }]}>
          <TouchableOpacity onPress={() => setSelectedBattle(null)} style={styles.keyStopClose}>
            <X size={14} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.battleHeader}>
            <Text style={styles.battleEmoji}>{selectedBattle.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.battleName, { color: theme.text }]}>{(tLang && selectedBattle.translations?.[tLang]?.name) ?? selectedBattle.name}</Text>
              <Text style={[styles.battleYear, { color: selectedBattle.color }]}>{selectedBattle.yearLabel} · {(tLang && selectedBattle.translations?.[tLang]?.outcome) ?? selectedBattle.outcome}</Text>
            </View>
          </View>
          {/* Phase navigation — prev / next arrows */}
          <View style={styles.phaseNav}>
            <TouchableOpacity
              onPress={() => goToPhase(battlePhase - 1)}
              disabled={battlePhase === 0}
              style={[styles.phaseArrow, {
                backgroundColor: battlePhase === 0 ? (isDark ? '#1C1917' : '#F5F5F5') : selectedBattle.color + '18',
                borderColor: battlePhase === 0 ? borderCol : selectedBattle.color + '40',
                opacity: battlePhase === 0 ? 0.4 : 1,
              }]}>
              <ChevronLeft size={20} color={battlePhase === 0 ? theme.subtext : selectedBattle.color} strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.phaseNavCenter}>
              <Text style={[styles.phaseNum, { color: selectedBattle.color }]}>
                {tm('phase')} {battlePhase + 1} / {selectedBattle.phases.length}
              </Text>
              <Text style={[styles.phaseTitle, { color: theme.text, textAlign: 'center' }]} numberOfLines={1}>
                {selectedBattle.phases[battlePhase]?.title}
              </Text>
              {/* progress dots */}
              {selectedBattle.phases.length > 1 && (
                <View style={styles.phaseDots}>
                  {selectedBattle.phases.map((_, idx) => (
                    <TouchableOpacity key={idx} onPress={() => goToPhase(idx)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <View style={{
                        width: idx === battlePhase ? 18 : 7, height: 7, borderRadius: 3.5,
                        backgroundColor: idx === battlePhase ? selectedBattle.color : borderCol,
                      }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => goToPhase(battlePhase + 1)}
              disabled={battlePhase === selectedBattle.phases.length - 1}
              style={[styles.phaseArrow, {
                backgroundColor: battlePhase === selectedBattle.phases.length - 1 ? (isDark ? '#1C1917' : '#F5F5F5') : selectedBattle.color + '18',
                borderColor: battlePhase === selectedBattle.phases.length - 1 ? borderCol : selectedBattle.color + '40',
                opacity: battlePhase === selectedBattle.phases.length - 1 ? 0.4 : 1,
              }]}>
              <ChevronRight size={20} color={battlePhase === selectedBattle.phases.length - 1 ? theme.subtext : selectedBattle.color} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          {selectedBattle.phases[battlePhase] && (
            <View style={[styles.phaseBody, { borderTopColor: borderCol }]}>
              {selectedBattle.phases[battlePhase].year && (
                <Text style={[styles.phaseTime, { color: selectedBattle.color }]}>
                  {selectedBattle.phases[battlePhase].year}
                </Text>
              )}
              <Text style={[styles.phaseDesc, { color: theme.text }]}>
                {selectedBattle.phases[battlePhase].description}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Plague Year Slider ── */}
      {mapLayer === 'plagues' && (() => {
        const activePandemic = selectedPlagueId ? PANDEMICS.find(p => p.id === selectedPlagueId) : null;
        const plagueColor = activePandemic?.color ?? accent;
        const ratio = (plagueYear - PLAGUE_YEAR_MIN) / (PLAGUE_YEAR_MAX - PLAGUE_YEAR_MIN);
        const latestEntry = activePandemic
          ? activePandemic.spread.filter(s => s.year <= plagueYear).slice(-1)[0]
          : null;
        return (
          <View style={[styles.sliderCard, { bottom: insets.bottom + 12, backgroundColor: cardBg, borderColor: borderCol }]}>
            {activePandemic ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 22 }}>{activePandemic.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text }}>{activePandemic.name}</Text>
                  {latestEntry ? (
                    <Text style={{ fontSize: 10.5, color: plagueColor, fontWeight: '600' }} numberOfLines={1}>{latestEntry.label}</Text>
                  ) : (
                    <Text style={{ fontSize: 10.5, color: theme.subtext, fontWeight: '500' }}>{tm('plague_move_slider')}</Text>
                  )}
                </View>
                <View style={[styles.layersPanelBadge, { backgroundColor: plagueColor + '20' }]}>
                  <Text style={[styles.layersPanelBadgeText, { color: plagueColor }]}>{activePandemic.deathToll}</Text>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: theme.subtext, marginBottom: 10, fontStyle: 'italic' }}>
                {tm('plague_select_hint')}
              </Text>
            )}
            <View style={styles.sliderHeader}>
              <Text style={[styles.sliderYearLabel, { color: plagueColor }]}>{plagueYear} AD</Text>
              {activePandemic && (
                <Text style={[styles.sliderAllTime, { color: theme.subtext }]}>{activePandemic.period}</Text>
              )}
            </View>
            <View style={styles.sliderTrackWrap}
              onLayout={e => { plagueSliderWidthRef.current = e.nativeEvent.layout.width; }}
              {...plagueSliderPan.panHandlers}>
              <View style={[styles.sliderTrack, { backgroundColor: borderCol }]}>
                <View style={[styles.sliderFill, { width: `${ratio * 100}%` as any, backgroundColor: plagueColor }]} />
              </View>
              <View style={[styles.sliderThumb, { left: `${ratio * 100}%` as any, backgroundColor: plagueColor, borderColor: cardBg }]} />
            </View>
          </View>
        );
      })()}

      {/* ── Nuclear Site / Event Card ── */}
      {mapLayer === 'nuclear' && (selectedNuclearSite || selectedNuclearEvent) && (() => {
        const isEvent = !!selectedNuclearEvent;
        const item = isEvent ? selectedNuclearEvent : selectedNuclearSite;
        const color: string = item.color;
        return (
          <View style={[styles.cityCard, { bottom: insets.bottom + 16, backgroundColor: cardBg, borderColor: color + '60' }]}>
            <TouchableOpacity onPress={() => { setSelectedNuclearSite(null); setSelectedNuclearEvent(null); }} style={styles.keyStopClose}>
              <X size={14} color={theme.subtext} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.cityCardHero}>
              <View style={[styles.cityCardEmojiWrap, { backgroundColor: color + '18', borderColor: color + '40' }]}>
                <Text style={styles.cityCardEmoji}>
                  {isEvent ? (NUCLEAR_EVENT_EMOJI[item.type] ?? '☢️') : item.flag}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.cityCardName, { color: theme.text }]} numberOfLines={2}>
                  {isEvent ? item.title : item.name}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {isEvent ? (
                    <View style={[styles.cityStatusBadge, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.cityStatusText, { color }]}>{item.year} · {item.type.replace(/_/g, ' ')}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={[styles.cityStatusBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.cityStatusText, { color }]}>{item.period}</Text>
                      </View>
                      <View style={[styles.cityStatusBadge, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
                        <Text style={[styles.cityStatusText, { color: theme.subtext }]}>☢️ {item.totalTests} {tm('nuclear_tests')}</Text>
                      </View>
                      {item.maxYieldKt > 0 && (
                        <View style={[styles.cityStatusBadge, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
                          <Text style={[styles.cityStatusText, { color: theme.subtext }]}>{tm('nuclear_max')} {item.maxYieldKt} KT</Text>
                        </View>
                      )}
                    </>
                  )}
                  {isEvent && item.yieldKt != null && (
                    <View style={[styles.cityStatusBadge, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
                      <Text style={[styles.cityStatusText, { color: theme.subtext }]}>{item.yieldKt} KT</Text>
                    </View>
                  )}
                </View>
                {!isEvent && (
                  <Text style={[styles.cityCardCiv, { color }]}>
                    {(item.country as string).replace(/_/g, ' ').toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
            <Text style={[styles.cityCardDesc, { color: theme.subtext }]} numberOfLines={3}>{item.description}</Text>
            {!isEvent && item.notableFact && (
              <View style={[styles.cityCardFactRow, { backgroundColor: color + '10', borderColor: color + '25' }]}>
                <Text style={[styles.cityCardFactLabel, { color }]}>💡</Text>
                <Text style={[styles.cityCardFact, { color: theme.text }]} numberOfLines={2}>{item.notableFact}</Text>
              </View>
            )}
          </View>
        );
      })()}

      {/* ── Dinosaur Fossil Site Card ── */}
      {mapLayer === 'dinosaurs' && selectedDinoSite && (() => {
        const site = selectedDinoSite;
        const eraLabel = site.era === 'triassic' ? tm('era_triassic') : site.era === 'jurassic' ? tm('era_jurassic') : tm('era_cretaceous');
        return (
          <View style={[styles.cityCard, { bottom: insets.bottom + 16, backgroundColor: cardBg, borderColor: site.color + '60' }]}>
            <TouchableOpacity onPress={() => setSelectedDinoSite(null)} style={styles.keyStopClose}>
              <X size={14} color={theme.subtext} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.cityCardHero}>
              <View style={[styles.cityCardEmojiWrap, { backgroundColor: site.color + '18', borderColor: site.color + '40' }]}>
                <Text style={styles.cityCardEmoji}>{site.emoji}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.cityCardName, { color: theme.text }]}>{site.name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  <View style={[styles.cityStatusBadge, { backgroundColor: site.color + '20' }]}>
                    <Text style={[styles.cityStatusText, { color: site.color }]}>{eraLabel}</Text>
                  </View>
                  <View style={[styles.cityStatusBadge, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
                    <Text style={[styles.cityStatusText, { color: theme.subtext }]}>{site.region}</Text>
                  </View>
                  <View style={[styles.cityStatusBadge, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
                    <Text style={[styles.cityStatusText, { color: theme.subtext }]}>📍 {site.discoveredYear}</Text>
                  </View>
                </View>
                <Text style={[styles.cityCardCiv, { color: site.color }]}>{site.geologicalPeriod}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }}>
              <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingBottom: 2 }}>
                {(site.famousSpecies as string[]).map((sp: string) => (
                  <View key={sp} style={[styles.layersPanelBadge, { backgroundColor: site.color + '18' }]}>
                    <Text style={[styles.layersPanelBadgeText, { color: site.color }]}>{sp}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.cityCardDesc, { color: theme.subtext }]} numberOfLines={3}>{site.description}</Text>
            <View style={[styles.cityCardFactRow, { backgroundColor: site.color + '10', borderColor: site.color + '25' }]}>
              <Text style={[styles.cityCardFactLabel, { color: site.color }]}>💡</Text>
              <Text style={[styles.cityCardFact, { color: theme.text }]} numberOfLines={2}>{site.funFact}</Text>
            </View>
          </View>
        );
      })()}

      {/* ── Ancient City Info Card ── */}
      {mapLayer === 'cities' && selectedCity && (
        <View style={[styles.cityCard, { bottom: insets.bottom + 16, backgroundColor: cardBg, borderColor: selectedCity.color + '60' }]}>
          <TouchableOpacity onPress={() => { haptic('light'); setSelectedCity(null); }} style={styles.keyStopClose}>
            <X size={14} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>

          {/* Hero row */}
          <View style={styles.cityCardHero}>
            <View style={[styles.cityCardEmojiWrap, { backgroundColor: selectedCity.color + '18', borderColor: selectedCity.color + '40' }]}>
              <Text style={styles.cityCardEmoji}>{selectedCity.emoji}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.cityCardName, { color: theme.text }]}>{selectedCity.name}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <View style={[styles.cityStatusBadge, { backgroundColor: selectedCity.color + '20' }]}>
                  <Text style={[styles.cityStatusText, { color: selectedCity.color }]}>
                    {selectedCity.status === 'modern_city' ? tm('city_active') : selectedCity.status === 'ruins' ? tm('city_ruins') : selectedCity.status === 'lost' ? tm('city_lost') : tm('city_submerged')}
                  </Text>
                </View>
                <View style={[styles.cityStatusBadge, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}>
                  <Text style={[styles.cityStatusText, { color: theme.subtext }]}>👥 {selectedCity.peakPopulation}</Text>
                </View>
              </View>
              <Text style={[styles.cityCardCiv, { color: selectedCity.color }]}>
                {selectedCity.civilization} · {selectedCity.period}
              </Text>
            </View>
          </View>

          <Text style={[styles.cityCardDesc, { color: theme.subtext }]} numberOfLines={3}>{(tLang && selectedCity.translations?.[tLang]?.description) ?? selectedCity.description}</Text>

          <View style={[styles.cityCardFactRow, { backgroundColor: selectedCity.color + '10', borderColor: selectedCity.color + '25' }]}>
            <Text style={[styles.cityCardFactLabel, { color: selectedCity.color }]}>💡</Text>
            <Text style={[styles.cityCardFact, { color: theme.text }]} numberOfLines={2}>{(tLang && selectedCity.translations?.[tLang]?.funFact) ?? selectedCity.funFact}</Text>
          </View>
        </View>
      )}

      {/* ── Backdrop ── */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOp }]}
        pointerEvents="none"
      />

      {/* ── Bottom sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetY,
            backgroundColor: isDark ? '#0F0E0D' : '#FAFAFA',
            borderColor: borderCol,
          },
        ]}
      >
        <View style={styles.sheetHandle} {...pan.panHandlers}>
          <View style={[styles.sheetBar, { backgroundColor: isDark ? '#404040' : '#D4D4D4' }]} />
          {sheetCluster && (
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.sheetDot, { backgroundColor: sheetCluster.mainColor }]} />
                <View>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>
                    {sheetCluster.country}
                  </Text>
                  <Text style={[styles.sheetSub, { color: theme.subtext }]}>
                    {sheetCluster.count} {tm('events')} · {sheetCluster.cats.length}{' '}
                    {tm('categories')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={closeSheet}
                style={[styles.sheetClose, { backgroundColor: isDark ? '#292524' : '#F5F5F5' }]}
              >
                <X size={16} color={theme.subtext} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {sheetCluster ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
          >
            {sheetCluster.cats.map((cat, i) => (
              <React.Fragment key={cat.key}>
                <CategorySection
                  cat={cat}
                  language={language}
                  theme={theme}
                  isDark={isDark}
                  tm={tm}
                  onEventPress={openPreview}
                />
                {i < sheetCluster.cats.length - 1 && (
                  <View
                    style={[
                      styles.catDivider,
                      { backgroundColor: isDark ? '#292524' : '#E5E5E5' },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.sheetEmpty}>
            <MapPin size={32} color={theme.subtext + '30'} strokeWidth={1.5} />
            <Text style={[styles.sheetEmptyText, { color: theme.subtext }]}>
              {tm('tap_to_explore')}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* ── Loading overlay ── */}
      {loading && (
        <View
          style={[
            styles.loadingOverlay,
            {
              backgroundColor: isDark ? 'rgba(15,14,13,0.9)' : 'rgba(255,255,255,0.9)',
            },
          ]}
        >
          <View style={[styles.loadingCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Globe2 size={36} color={accent} strokeWidth={1.5} />
            <ActivityIndicator size="large" color={accent} style={{ marginTop: 16 }} />
            <Text style={[styles.loadingText, { color: accent }]}>{tm('loading')}</Text>
          </View>
        </View>
      )}

      {/* ── Preview card ── */}
      {previewItem && (
        <PreviewCard
          item={previewItem}
          language={language}
          theme={theme}
          isDark={isDark}
          tm={tm}
          onClose={closePreview}
          onReadMore={() => openStory(previewItem.event)}
        />
      )}

      {/* ── Story modal ── */}
      <StoryModal
        visible={storyVisible}
        event={storyEvent}
        onClose={closeStory}
        theme={theme}
      />
    </View>
  );
}

// ─── Custom marker graphics (rendered via SmartMarker) ──────────────────────────
const mkr = StyleSheet.create({
  wrap: { alignItems: 'center' },
  head: {
    alignItems: 'center', justifyContent: 'center', borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 7 },
    }),
  },
  tail: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  label: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1.5,
    backgroundColor: '#FFFFFF', marginBottom: 3, maxWidth: 160,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 4 },
    }),
  },
  labelText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    minWidth: 38, height: 34, paddingHorizontal: 11, borderRadius: 17,
    borderWidth: 2.5, borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 7 },
    }),
  },
  countText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  clusterCircle: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 7 },
    }),
  },
  clusterNum: { fontWeight: '900', color: '#FFFFFF' },
  dot: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 5 },
    }),
  },
});

const mls = StyleSheet.create({
  clusterBubble: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 7 },
    }),
  },
  clusterCount: {
    position: 'absolute', top: -5, right: -7,
    minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4,
    backgroundColor: '#1C1917', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  clusterCountText: { fontSize: 10, fontWeight: '900', color: '#FFF' },
  clusterNeedle: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  eventPin: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
    }),
  },
  eventPinNeedle: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  stopOuter: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
  },
  stopInner: { width: 7, height: 7, borderRadius: 3.5 },
  cityMarker: {
    width: 34, height: 34, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  cityEmoji: { fontSize: 17 },
  cityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, borderWidth: 2,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 5 },
    }),
  },
  cityPillEmoji: { fontSize: 15 },
  cityPillName: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2, maxWidth: 120 },
  cityPillNeedle: {
    width: 0, height: 0, marginTop: -1,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  battleMarker: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  battleEmoji: { fontSize: 18 },
  troopMarker: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5,
    maxWidth: 100,
  },
  troopLabel: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.2 },
  religionOrigin: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  warPin: {
    borderColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
    }),
  },
  warPinNeedle: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  warLabel: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1.5,
    marginBottom: 3, maxWidth: 150,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 4 },
    }),
  },
  warLabelText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.2 },
  capLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1.5, opacity: 0.95,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 3 },
    }),
  },
  capStar: { width: 6, height: 6, borderRadius: 3 },
  capName: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.2 },
  warLegend: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  warLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  warLegendText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});

const mapProMarker = StyleSheet.create({
  pin: {
    backgroundColor: '#D4A017',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#D4A017',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  star: { fontSize: 11, color: '#1a1208' },
  label: { fontSize: 10, fontWeight: '900', color: '#1a1208', letterSpacing: 1.4 },
  needle: {
    width: 2,
    height: 7,
    backgroundColor: '#D4A017',
    alignSelf: 'center',
    marginTop: -1,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  topDot: { width: 10, height: 10, borderRadius: 5 },
  topText: { fontSize: 13, fontWeight: '500' },
  topTextBold: { fontSize: 14, fontWeight: '700' },

  backBtn: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  backText: { fontSize: 13, fontWeight: '600' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  sheetHandle: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8 },
  sheetBar: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sheetDot: { width: 12, height: 12, borderRadius: 6 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSub: { fontSize: 12, fontWeight: '500', marginTop: 2, opacity: 0.6 },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetEmpty: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  sheetEmptyText: { fontSize: 14, fontWeight: '500', opacity: 0.5 },

  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catCount: { fontSize: 11, fontWeight: '800' },
  catDivider: { height: 1, marginHorizontal: 20, marginVertical: 8 },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  eventYear: {
    width: 52,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  eventYearText: { fontSize: 11, fontWeight: '800' },
  eventContent: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  eventLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocText: { fontSize: 11, fontWeight: '500', opacity: 0.5 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 84 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  loadingText: { fontSize: 14, fontWeight: '600', marginTop: 8 },

  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  previewCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  previewEmoji: { fontSize: 16 },
  previewCatText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  previewClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBody: { padding: 16, gap: 12 },
  previewTitle: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  previewSummary: { fontSize: 14, lineHeight: 21, opacity: 0.7 },
  previewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  previewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewMetaText: { fontSize: 12, fontWeight: '600' },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  previewButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // ── Layer UI ─────────────────────────────────────────────────────────────
  layerBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  layerBtnSingle: {
    position: 'absolute', right: 12, zIndex: 22,
  },
  layersPanel: {
    position: 'absolute', right: 12, zIndex: 21,
    borderRadius: 16, borderWidth: 1, paddingVertical: 6, minWidth: 210,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  layersPanelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginHorizontal: 4,
  },
  layersPanelIcon: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  layersPanelLabel: { fontSize: 13, fontWeight: '700' },
  layersPanelDesc: { fontSize: 10.5, fontWeight: '500', opacity: 0.55, marginTop: 1 },
  layersPanelDot: { width: 7, height: 7, borderRadius: 3.5 },
  layersPanelSep: { height: StyleSheet.hairlineWidth, marginHorizontal: 12, marginVertical: 4 },
  layersPanelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  layersPanelBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },

  chipsRow: { position: 'absolute', left: 0, right: 0, zIndex: 18 },
  chipsContent: { paddingHorizontal: 12, gap: 6, flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipEmoji: { fontSize: 13 },
  chipLabel: { fontSize: 11, fontWeight: '700', maxWidth: 90 },

  sliderCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 18, borderWidth: 1, padding: 16, zIndex: 30,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sliderYearLabel: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  sliderAllTime: { fontSize: 11, fontWeight: '600', opacity: 0.6 },
  eraPreset: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  eraPresetText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  sliderTrackWrap: { height: 36, justifyContent: 'center', position: 'relative' },
  sliderTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  sliderFill: { height: '100%' as any, borderRadius: 2 },
  sliderThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    marginLeft: -11, top: 7, borderWidth: 3,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },

  keyStopCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 16, borderWidth: 1, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, zIndex: 30,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  keyStopClose: { position: 'absolute', top: 10, right: 10, padding: 6 },
  keyStopDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, flexShrink: 0 },
  keyStopTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, paddingRight: 24 },
  keyStopNote: { fontSize: 12, lineHeight: 18, opacity: 0.65, marginBottom: 6 },
  keyStopRouteName: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  // ── Battle phase card ─────────────────────────────────────────────────────
  battleCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 18, borderWidth: 1.5, padding: 14, zIndex: 30,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  battleHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, paddingRight: 28 },
  battleEmoji: { fontSize: 26, marginTop: 2 },
  battleName: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  battleYear: { fontSize: 11, fontWeight: '600' },
  phaseChip: {
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
    minWidth: 90, alignItems: 'flex-start',
  },
  phaseNav: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  phaseArrow: {
    width: 42, height: 42, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  phaseNavCenter: { flex: 1, alignItems: 'center', gap: 3 },
  phaseDots: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  phaseNum: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  phaseTitle: { fontSize: 11, fontWeight: '700' },
  phaseBody: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  phaseTime: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  phaseDesc: { fontSize: 12, lineHeight: 18 },

  // ── City badge ────────────────────────────────────────────────────────────
  cityStatusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  cityStatusText: { fontSize: 10, fontWeight: '700' },

  // ── Ancient City card (redesigned) ───────────────────────────────────────
  cityCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 20, borderWidth: 1.5, padding: 14, zIndex: 30, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14 },
      android: { elevation: 10 },
    }),
  },
  cityCardHero: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cityCardEmojiWrap: {
    width: 52, height: 52, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cityCardEmoji: { fontSize: 26 },
  cityCardName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  cityCardCiv: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  cityCardDesc: { fontSize: 12, lineHeight: 18, opacity: 0.7 },
  cityCardFactRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8,
  },
  cityCardFactLabel: { fontSize: 14, flexShrink: 0 },
  cityCardFact: { flex: 1, fontSize: 11.5, lineHeight: 17, fontStyle: 'italic', fontWeight: '500' },

  // ── WW1/WW2 Year Navigator card ──────────────────────────────────────────
  warYearCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
    zIndex: 30, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  warYearNavRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  warYearArrow: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  warYearCenter: {
    flex: 1, alignItems: 'center', gap: 2,
  },
  warYearNumber: {
    fontSize: 42, fontWeight: '900', letterSpacing: -2, color: '#DC2626', lineHeight: 46,
    includeFontPadding: false,
  } as any,
  warYearPhaseName: {
    fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase',
  },
  warYearDots: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  warYearDesc: {
    fontSize: 12.5, lineHeight: 19, opacity: 0.8,
  },
  warYearStatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
  },
  warYearStatIcon: { fontSize: 13 },
  warYearStatText: {
    flex: 1, fontSize: 12, fontWeight: '700',
  },
  warEventChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1,
    maxWidth: 200,
  },
  warEventChipText: {
    fontSize: 10.5, fontWeight: '700', flexShrink: 1,
  },
  warEventChipStar: {
    width: 5, height: 5, borderRadius: 2.5, flexShrink: 0,
  },
  warYearLegendRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 2,
  },
  warYearEventCount: {
    fontSize: 9.5, fontWeight: '600', opacity: 0.45,
  },

  // ── War Event card ────────────────────────────────────────────────────────
  warEventCard: {
    position: 'absolute', left: 14, right: 14,
    borderRadius: 18, borderWidth: 1.5, padding: 14, zIndex: 30, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  warEventHeader: { paddingRight: 44 },
  warCardClose: {
    position: 'absolute', top: 10, right: 10, zIndex: 5,
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 3 },
    }),
  },
  warSideBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  warSideText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  warEventType: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', opacity: 0.6 },
  warEventYear: { fontSize: 11, fontWeight: '800' },
  warEventTitle: { fontSize: 15, fontWeight: '800', lineHeight: 21 },
  warEventDesc: { fontSize: 12, lineHeight: 18, opacity: 0.7 },
  warCasRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  warCasIcon: { fontSize: 13, flexShrink: 0 },
  warCasText: { flex: 1, fontSize: 11.5, lineHeight: 17, fontWeight: '500' },
});