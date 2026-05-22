// app/(main)/saved.tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, Crown, FolderPlus, FolderOpen, PlusCircle, Share2, Trash2, X, ChevronRight, ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoryModal } from '../../components/StoryModal';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useRevenueCat } from '../../context/RevenueCatContext';
import {
  Collection,
  getEventId,
  useSavedStore,
  useUserCollections,
  useUserSavedEvents,
} from '../../store/useSavedStore';
import { haptic } from '../../utils/haptics';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.28;
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const CARD_IMG_H = 220;

const COLLECTION_EMOJIS = ['📚', '⚔️', '🏛️', '🔭', '🌍', '🎭', '💡', '🔬', '🏰', '👑', '📜', '🌊'];

/* ─── Translations ─── */
const T: Record<string, Record<string, string>> = {
  en: {
    saved: 'Saved', collections: 'Collections',
    event_saved: 'story collected', events_saved: 'stories collected',
    recent: 'Recent', by_year: 'By Year',
    nothing_saved: 'Your collection is empty',
    save_hint: 'Tap the bookmark icon on any story to start building your personal archive.',
    swipe_remove: 'Remove', end_of_list: 'End of collection',
    swipe_hint: 'swipe left to remove', no_filter: 'No stories in this category',
    new_collection: 'New Collection', collection_name: 'Collection name…',
    create: 'Create', cancel: 'Cancel',
    no_collections: 'No collections yet',
    collections_hint: 'Create folders to organise your saved stories.',
    stories: 'stories', story: 'story',
    add_to_collection: 'Add to Collection',
    share_collection: 'Share Collection',
    delete_collection: 'Delete',
    confirm_delete: 'Delete collection?',
    confirm_delete_msg: 'This will only remove the folder, not the stories.',
    delete_confirm: 'Delete',
    collection_shared: 'Shared!',
    open: 'Open',
    back: 'Back',
  },
  ro: {
    saved: 'Salvate', collections: 'Colecții',
    event_saved: 'poveste colectată', events_saved: 'povești colectate',
    recent: 'Recente', by_year: 'După An',
    nothing_saved: 'Colecția ta e goală',
    save_hint: 'Apasă pe bookmark pe orice poveste pentru a-ți construi arhiva personală.',
    swipe_remove: 'Șterge', end_of_list: 'Sfârșitul colecției',
    swipe_hint: 'glisează stânga pentru a șterge', no_filter: 'Nicio poveste în această categorie',
    new_collection: 'Colecție nouă', collection_name: 'Nume colecție…',
    create: 'Creează', cancel: 'Anulează',
    no_collections: 'Nicio colecție încă',
    collections_hint: 'Creează foldere pentru a-ți organiza poveștile salvate.',
    stories: 'povești', story: 'poveste',
    add_to_collection: 'Adaugă în Colecție',
    share_collection: 'Partajează',
    delete_collection: 'Șterge',
    confirm_delete: 'Ștergi colecția?',
    confirm_delete_msg: 'Se șterge doar folderul, nu și poveștile.',
    delete_confirm: 'Șterge',
    collection_shared: 'Partajat!',
    open: 'Deschide',
    back: 'Înapoi',
  },
  fr: {
    saved: 'Enregistrés', collections: 'Collections',
    event_saved: 'histoire collectée', events_saved: 'histoires collectées',
    recent: 'Récents', by_year: 'Par Année',
    nothing_saved: 'Votre collection est vide',
    save_hint: 'Appuyez sur le favori pour commencer votre archive personnelle.',
    swipe_remove: 'Supprimer', end_of_list: 'Fin de la collection',
    swipe_hint: 'glisser à gauche pour supprimer', no_filter: 'Aucune histoire dans cette catégorie',
    new_collection: 'Nouvelle Collection', collection_name: 'Nom de la collection…',
    create: 'Créer', cancel: 'Annuler',
    no_collections: 'Aucune collection',
    collections_hint: 'Créez des dossiers pour organiser vos histoires.',
    stories: 'histoires', story: 'histoire',
    add_to_collection: 'Ajouter à une Collection',
    share_collection: 'Partager',
    delete_collection: 'Supprimer',
    confirm_delete: 'Supprimer la collection ?',
    confirm_delete_msg: 'Seul le dossier sera supprimé, pas les histoires.',
    delete_confirm: 'Supprimer',
    collection_shared: 'Partagé !',
    open: 'Ouvrir',
    back: 'Retour',
  },
  de: {
    saved: 'Gespeichert', collections: 'Sammlungen',
    event_saved: 'Geschichte gesammelt', events_saved: 'Geschichten gesammelt',
    recent: 'Neueste', by_year: 'Nach Jahr',
    nothing_saved: 'Ihre Sammlung ist leer',
    save_hint: 'Tippe auf das Lesezeichen, um dein Archiv aufzubauen.',
    swipe_remove: 'Entfernen', end_of_list: 'Ende der Sammlung',
    swipe_hint: 'nach links wischen zum Entfernen', no_filter: 'Keine Geschichten in dieser Kategorie',
    new_collection: 'Neue Sammlung', collection_name: 'Sammlungsname…',
    create: 'Erstellen', cancel: 'Abbrechen',
    no_collections: 'Noch keine Sammlungen',
    collections_hint: 'Erstellen Sie Ordner zum Organisieren Ihrer Geschichten.',
    stories: 'Geschichten', story: 'Geschichte',
    add_to_collection: 'Zur Sammlung hinzufügen',
    share_collection: 'Teilen',
    delete_collection: 'Löschen',
    confirm_delete: 'Sammlung löschen?',
    confirm_delete_msg: 'Nur der Ordner wird gelöscht, nicht die Geschichten.',
    delete_confirm: 'Löschen',
    collection_shared: 'Geteilt!',
    open: 'Öffnen',
    back: 'Zurück',
  },
  es: {
    saved: 'Guardados', collections: 'Colecciones',
    event_saved: 'historia coleccionada', events_saved: 'historias coleccionadas',
    recent: 'Recientes', by_year: 'Por Año',
    nothing_saved: 'Tu colección está vacía',
    save_hint: 'Toca el marcador en cualquier historia para construir tu archivo personal.',
    swipe_remove: 'Eliminar', end_of_list: 'Fin de la colección',
    swipe_hint: 'desliza a la izquierda para eliminar', no_filter: 'No hay historias en esta categoría',
    new_collection: 'Nueva Colección', collection_name: 'Nombre de colección…',
    create: 'Crear', cancel: 'Cancelar',
    no_collections: 'Sin colecciones aún',
    collections_hint: 'Crea carpetas para organizar tus historias guardadas.',
    stories: 'historias', story: 'historia',
    add_to_collection: 'Añadir a Colección',
    share_collection: 'Compartir',
    delete_collection: 'Eliminar',
    confirm_delete: '¿Eliminar colección?',
    confirm_delete_msg: 'Solo se elimina la carpeta, no las historias.',
    delete_confirm: 'Eliminar',
    collection_shared: '¡Compartido!',
    open: 'Abrir',
    back: 'Volver',
  },
};

const toRoman = (n: number) => {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romans[n] || '';
};

const CAT_COLORS: Record<string, string> = {
  war_conflict: '#E84545', tech_innovation: '#3E7BFA', science_discovery: '#A855F7',
  politics_state: '#F59E0B', culture_arts: '#10B981', natural_disaster: '#F97316',
  exploration: '#06B6D4', religion_phil: '#C2965A',
};
const CAT_LABELS: Record<string, string> = {
  war_conflict: 'War', tech_innovation: 'Tech', science_discovery: 'Science',
  politics_state: 'Politics', culture_arts: 'Arts', natural_disaster: 'Disasters',
  exploration: 'Exploration', religion_phil: 'Philosophy',
};
const getCatColor = (cat: string) => CAT_COLORS[(cat ?? '').toLowerCase().replace(/\s+/g, '_')] ?? '#8B7355';
const getCatLabel = (cat: string) => CAT_LABELS[(cat ?? '').toLowerCase().replace(/\s+/g, '_')] ?? cat.replace(/_/g, ' ');

const extractYear = (event: any): string => {
  const s = String(event?.eventDate ?? event?.event_date ?? event?.year ?? '').trim();
  if (/^\d{4}$/.test(s)) return s;
  if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
  return '';
};

/* ══════════════════════════════════
   Swipe-to-delete card wrapper
══════════════════════════════════ */
const SwipeCard: React.FC<{
  children: React.ReactNode;
  onDelete: () => void;
  onPress: () => void;
  removeLabel: string;
}> = ({ children, onDelete, onPress, removeLabel }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => {
      const horiz = Math.abs(g.dx) > Math.abs(g.dy) * 1.2 && Math.abs(g.dx) > 6;
      if (horiz) isSwipingRef.current = true;
      return horiz;
    },
    onMoveShouldSetPanResponderCapture: (_, g) =>
      Math.abs(g.dx) > Math.abs(g.dy) * 1.2 && Math.abs(g.dx) > 10,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => translateX.stopAnimation(),
    onPanResponderMove: (_, g) => {
      translateX.setValue(g.dx > 10 ? Math.pow(g.dx, 0.5) * 2 : g.dx);
    },
    onPanResponderRelease: (_, g) => {
      isSwipingRef.current = false;
      if (g.dx < -SWIPE_THRESHOLD || g.vx < -0.5) {
        Animated.timing(translateX, { toValue: -W, duration: 250, useNativeDriver: true }).start(() => onDelete());
      } else {
        Animated.spring(translateX, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => {
      isSwipingRef.current = false;
      Animated.spring(translateX, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true }).start();
    },
  })).current;

  const deleteOpacity = translateX.interpolate({ inputRange: [-160, -80, 0], outputRange: [1, 0.9, 0], extrapolate: 'clamp' });
  const deleteScale = translateX.interpolate({ inputRange: [-160, -80, 0], outputRange: [1.1, 1, 0.6], extrapolate: 'clamp' });
  const cardOpacity = translateX.interpolate({ inputRange: [-W * 0.5, -SWIPE_THRESHOLD, 0], outputRange: [0.4, 0.85, 1], extrapolate: 'clamp' });

  return (
    <View style={sw.wrap}>
      <Animated.View style={[sw.deleteBg, { opacity: deleteOpacity }]}>
        <Animated.View style={{ transform: [{ scale: deleteScale }], alignItems: 'center', gap: 6 }}>
          <Trash2 size={22} color="#fff" strokeWidth={2} />
          <Text style={sw.deleteLabel}>{removeLabel}</Text>
        </Animated.View>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }], opacity: cardOpacity }} {...pan.panHandlers}>
        <TouchableOpacity activeOpacity={0.93} onPress={onPress}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};
const sw = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden', borderRadius: 22 },
  deleteBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FF3B30', borderRadius: 22, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 30 },
  deleteLabel: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});

/* ══════════════════════════════════
   Create Collection Modal
══════════════════════════════════ */
const CreateCollectionModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji: string) => void;
  theme: any;
  isDark: boolean;
  ts: (k: string) => string;
}> = ({ visible, onClose, onCreate, theme, isDark, ts }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📚');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), emoji);
    setName('');
    setEmoji('📚');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={cm.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[cm.sheet, { backgroundColor: isDark ? '#0F0E0D' : '#FFFFFF' }]}>
          <View style={cm.handle} />
          <Text style={[cm.title, { color: theme.text }]}>{ts('new_collection')}</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={ts('collection_name')}
            placeholderTextColor={theme.subtext + '60'}
            style={[cm.input, { color: theme.text, backgroundColor: isDark ? '#1C1917' : '#F5F5F4', borderColor: isDark ? '#292524' : '#E5E5E5' }]}
            autoFocus
            maxLength={40}
          />

          <Text style={[cm.emojiLabel, { color: theme.subtext }]}>Icon</Text>
          <View style={cm.emojiGrid}>
            {COLLECTION_EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                onPress={() => { haptic('selection'); setEmoji(e); }}
                style={[cm.emojiBtn, {
                  backgroundColor: emoji === e ? (isDark ? '#292524' : '#F0EDE8') : 'transparent',
                  borderColor: emoji === e ? theme.gold + '60' : 'transparent',
                }]}
              >
                <Text style={cm.emoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={cm.actions}>
            <TouchableOpacity onPress={onClose} style={[cm.btn, { borderColor: isDark ? '#292524' : '#E5E5E5' }]}>
              <Text style={[cm.btnText, { color: theme.subtext }]}>{ts('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!name.trim()}
              style={[cm.btn, cm.btnPrimary, { backgroundColor: name.trim() ? theme.gold : theme.gold + '40' }]}
            >
              <Text style={[cm.btnText, { color: '#FFF' }]}>{ts('create')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const cm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 }, android: { elevation: 16 } }),
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D4D4D4', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '800', fontFamily: SERIF, letterSpacing: -0.3, marginBottom: 16 },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 16, fontSize: 15, fontWeight: '600', marginBottom: 20,
  },
  emojiLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  emojiBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { borderWidth: 0 },
  btnText: { fontSize: 15, fontWeight: '700' },
});

/* ══════════════════════════════════
   Add to Collection Modal
══════════════════════════════════ */
const AddToCollectionModal: React.FC<{
  visible: boolean;
  eventId: string | null;
  collections: Collection[];
  onClose: () => void;
  onAdd: (collId: string) => void;
  onCreateNew: () => void;
  theme: any;
  isDark: boolean;
  ts: (k: string) => string;
}> = ({ visible, eventId, collections, onClose, onAdd, onCreateNew, theme, isDark, ts }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={cm.backdrop} activeOpacity={1} onPress={onClose} />
    <View style={[cm.sheet, { backgroundColor: isDark ? '#0F0E0D' : '#FFFFFF' }]}>
      <View style={cm.handle} />
      <Text style={[cm.title, { color: theme.text, marginBottom: 12 }]}>{ts('add_to_collection')}</Text>
      <ScrollView style={{ maxHeight: H * 0.4 }} showsVerticalScrollIndicator={false}>
        {collections.map(col => {
          const already = eventId ? col.eventIds.includes(eventId) : false;
          return (
            <TouchableOpacity
              key={col.id}
              onPress={() => { if (!already) { haptic('medium'); onAdd(col.id); } }}
              activeOpacity={already ? 1 : 0.7}
              style={[atc.row, { borderColor: isDark ? '#2A2825' : '#E5E5E5', opacity: already ? 0.4 : 1 }]}
            >
              <Text style={atc.emoji}>{col.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[atc.name, { color: theme.text }]}>{col.name}</Text>
                <Text style={[atc.count, { color: theme.subtext }]}>{col.eventIds.length} {ts(col.eventIds.length === 1 ? 'story' : 'stories')}</Text>
              </View>
              {already && <Text style={[atc.count, { color: theme.subtext }]}>✓</Text>}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={() => { onClose(); setTimeout(onCreateNew, 200); }}
          style={[atc.row, { borderColor: isDark ? '#2A2825' : '#E5E5E5' }]}
        >
          <View style={[atc.newIcon, { backgroundColor: theme.gold + '18' }]}>
            <PlusCircle size={18} color={theme.gold} strokeWidth={2} />
          </View>
          <Text style={[atc.name, { color: theme.gold }]}>{ts('new_collection')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </Modal>
);

const atc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  emoji: { fontSize: 26, width: 36, textAlign: 'center' },
  newIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700' },
  count: { fontSize: 11, fontWeight: '500', opacity: 0.5, marginTop: 2 },
});

/* ══════════════════════════════════
   Collection Card
══════════════════════════════════ */
const CollectionCard: React.FC<{
  collection: Collection;
  savedEvents: any[];
  language: string;
  theme: any;
  isDark: boolean;
  ts: (k: string) => string;
  onOpen: () => void;
  onShare: () => void;
  onDelete: () => void;
}> = ({ collection, savedEvents, language, theme, isDark, ts, onOpen, onShare, onDelete }) => {
  const events = savedEvents.filter(e => collection.eventIds.includes(getEventId(e)));
  const previewImgs = events.slice(0, 3).map(e => e.gallery?.[0]).filter(Boolean);
  const count = collection.eventIds.length;

  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.82} style={[cc.card, { backgroundColor: isDark ? '#0F0E0D' : '#FFFFFF', borderColor: isDark ? '#1E1B17' : '#EEEAE3' }]}>
      {/* Cover thumbnails */}
      <View style={cc.coverRow}>
        {previewImgs.length > 0 ? (
          previewImgs.map((uri, i) => (
            <Image key={i} source={{ uri }} style={[cc.thumb, { flex: 1, opacity: 1 - i * 0.15 }]} contentFit="cover" />
          ))
        ) : (
          <View style={[cc.emptyThumb, { backgroundColor: theme.gold + '10' }]}>
            <Text style={cc.emptyEmoji}>{collection.emoji}</Text>
          </View>
        )}
        <LinearGradient colors={['transparent', isDark ? '#0F0E0D' : '#FFFFFF']} style={cc.fadeRight} />
      </View>

      <View style={cc.body}>
        <Text style={cc.mainEmoji}>{collection.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[cc.name, { color: theme.text }]}>{collection.name}</Text>
          <Text style={[cc.meta, { color: theme.subtext }]}>
            {count} {ts(count === 1 ? 'story' : 'stories')}
          </Text>
        </View>
        <View style={cc.actions}>
          <TouchableOpacity onPress={onShare} style={[cc.actionBtn, { backgroundColor: isDark ? '#1C1917' : '#F5F5F4' }]}>
            <Share2 size={14} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[cc.actionBtn, { backgroundColor: '#FF3B3010' }]}>
            <Trash2 size={14} color="#FF3B30" strokeWidth={2} />
          </TouchableOpacity>
          <ChevronRight size={16} color={theme.subtext} strokeWidth={2} style={{ opacity: 0.4 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const cc = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  coverRow: { height: 80, flexDirection: 'row', overflow: 'hidden', position: 'relative' },
  thumb: { height: 80 },
  emptyThumb: { flex: 1, height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 36 },
  fadeRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 80 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  mainEmoji: { fontSize: 28 },
  name: { fontSize: 16, fontWeight: '800', fontFamily: SERIF, letterSpacing: -0.2 },
  meta: { fontSize: 11, fontWeight: '500', opacity: 0.5, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});

/* ══════════════════════════════════
   Main Screen
══════════════════════════════════ */
export default function SavedScreen() {
  const { theme, isDark } = useTheme();
  const { language } = useLanguage();
  const { isPro, presentPaywall } = useRevenueCat();
  const { removeEvent, createCollection, deleteCollection, addEventToCollection } = useSavedStore();
  const savedEvents = useUserSavedEvents();
  const collections = useUserCollections();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'saved' | 'collections'>('saved');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [sortMode, setSortMode] = useState<'recent' | 'year'>('recent');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [addToColEventId, setAddToColEventId] = useState<string | null>(null);
  const [collectionView, setCollectionView] = useState<Collection | null>(null);

  const openCreateCollection = useCallback(() => {
    haptic('medium');
    if (!isPro) { presentPaywall(); return; }
    setCreateVisible(true);
  }, [isPro, presentPaywall]);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, []);

  const ts = useCallback((key: string) => {
    const table = T[language] ?? T['en'];
    return table[key] ?? T['en'][key] ?? key;
  }, [language]);

  /* ── Derived data ── */
  const categories = useMemo(() => {
    const cats = new Set(savedEvents.map(e => e.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [savedEvents]);

  const sortedEvents = useMemo(() => {
    const copy = [...savedEvents];
    if (sortMode === 'year') copy.sort((a, b) => (parseInt(extractYear(b)) || 0) - (parseInt(extractYear(a)) || 0));
    return copy;
  }, [savedEvents, sortMode]);

  const displayEvents = useMemo(() => {
    if (!activeCategory) return sortedEvents;
    return sortedEvents.filter(e => e.category === activeCategory);
  }, [sortedEvents, activeCategory]);

  const collectionViewEvents = useMemo(() => {
    if (!collectionView) return [];
    return savedEvents.filter(e => collectionView.eventIds.includes(getEventId(e)));
  }, [collectionView, savedEvents]);

  const handleDelete = useCallback((id: string) => removeEvent(id), [removeEvent]);

  const handleShareCollection = useCallback(async (col: Collection) => {
    haptic('medium');
    const events = savedEvents.filter(e => col.eventIds.includes(getEventId(e)));
    const lines = events.map(e => {
      const title = e.titleTranslations?.[language] ?? e.titleTranslations?.en ?? '';
      const year = extractYear(e);
      return `• ${title}${year ? ` (${year})` : ''}`;
    });
    const text = `${col.emoji} ${col.name} — Daily History Collection\n${events.length} ${ts('stories')}:\n${lines.join('\n')}`;
    try {
      await Share.share({ message: text, title: col.name });
    } catch {}
  }, [savedEvents, language, ts]);

  const handleDeleteCollection = useCallback((col: Collection) => {
    haptic('heavy');
    Alert.alert(ts('confirm_delete'), ts('confirm_delete_msg'), [
      { text: ts('cancel'), style: 'cancel' },
      { text: ts('delete_confirm'), style: 'destructive', onPress: () => deleteCollection(col.id) },
    ]);
  }, [ts, deleteCollection]);

  /* ── EDITORIAL HEADER ── */
  const renderHeader = () => (
    <View style={[st.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
      <View style={st.masthead}>
        <View style={[st.mastheadLine, { backgroundColor: theme.gold + '30' }]} />
        <Text style={[st.mastheadLabel, { color: theme.text }]}>THE ARCHIVE</Text>
        <Text style={[st.mastheadIssue, { color: theme.gold }]}>N° {toRoman(new Date().getMonth())}</Text>
        <View style={[st.mastheadLine, { backgroundColor: theme.gold + '30' }]} />
      </View>

      {/* Tab toggle */}
      <View style={st.tabRow}>
        {(['saved', 'collections'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => { haptic('selection'); setActiveTab(tab); setCollectionView(null); }}
            style={[st.tabBtn, activeTab === tab && { borderBottomColor: theme.gold, borderBottomWidth: 2 }]}
          >
            <Text style={[st.tabLabel, {
              color: activeTab === tab ? theme.text : theme.subtext,
              fontWeight: activeTab === tab ? '800' : '500',
            }]}>
              {ts(tab).toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'saved' && (
        <>
          <View style={st.headerInner}>
            <View style={st.headerLeft}>
              <Text style={[st.headerTitle, { color: theme.text }]}>{ts('saved')}</Text>
              <Text style={[st.headerMeta, { color: theme.subtext }]}>
                {savedEvents.length > 0
                  ? `${savedEvents.length} ${savedEvents.length === 1 ? ts('event_saved') : ts('events_saved')}`
                  : 'Empty collection'}
              </Text>
            </View>
          </View>

          {savedEvents.length > 1 && (
            <View style={st.sortTabs}>
              {(['recent', 'year'] as const).map(mode => (
                <TouchableOpacity key={mode} onPress={() => setSortMode(mode)} activeOpacity={0.6} style={st.sortTab}>
                  <Text style={[st.sortTabLabel, { color: sortMode === mode ? theme.text : theme.subtext, fontWeight: sortMode === mode ? '800' : '500' }]}>
                    {ts(mode).toUpperCase()}
                  </Text>
                  {sortMode === mode && <View style={[st.sortTabDot, { backgroundColor: theme.gold }]} />}
                </TouchableOpacity>
              ))}
              <View style={{ flex: 1 }} />
            </View>
          )}
        </>
      )}

      {activeTab === 'collections' && collectionView && (
        <View style={st.headerInner}>
          <TouchableOpacity onPress={() => setCollectionView(null)} style={st.backBtn}>
            <ArrowLeft size={16} color={theme.subtext} strokeWidth={2} />
          </TouchableOpacity>
          <View style={st.headerLeft}>
            <Text style={[st.headerTitle, { color: theme.text }]}>{collectionView.emoji} {collectionView.name}</Text>
            <Text style={[st.headerMeta, { color: theme.subtext }]}>
              {collectionViewEvents.length} {ts(collectionViewEvents.length === 1 ? 'story' : 'stories')}
            </Text>
          </View>
        </View>
      )}

      {activeTab === 'collections' && !collectionView && (
        <View style={st.headerInner}>
          <View style={st.headerLeft}>
            <Text style={[st.headerTitle, { color: theme.text }]}>{ts('collections')}</Text>
            <Text style={[st.headerMeta, { color: theme.subtext }]}>
              {collections.length} {collections.length === 1 ? 'folder' : 'folders'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={openCreateCollection}
            style={[st.newColBtn, { backgroundColor: theme.gold + '14', borderColor: theme.gold + '40' }]}
          >
            {isPro
              ? <PlusCircle size={14} color={theme.gold} strokeWidth={2} />
              : <Crown size={14} color={theme.gold} strokeWidth={2} />}
            <Text style={[st.newColText, { color: theme.gold }]}>{ts('new_collection')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  /* ── DISCRETE CATEGORY FILTER ── */
  const renderCategoryFilter = () => {
    if (categories.length < 2) return null;
    return (
      <View style={[st.filterBar, { backgroundColor: theme.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterScroll}>
          <TouchableOpacity
            onPress={() => setActiveCategory(null)}
            style={[st.filterPill, !activeCategory ? { backgroundColor: theme.gold, borderColor: theme.gold } : { borderColor: theme.border }]}
          >
            <Text style={[st.filterPillLabel, { color: !activeCategory ? (isDark ? '#0A0800' : '#fff') : theme.subtext }]}>ALL</Text>
          </TouchableOpacity>
          {categories.map(cat => {
            const color = getCatColor(cat);
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(isActive ? null : cat)}
                style={[st.filterPill, isActive ? { backgroundColor: color + '20', borderColor: color } : { borderColor: theme.border }]}
              >
                <View style={[st.filterDot, { backgroundColor: color }]} />
                <Text style={[st.filterPillLabel, { color: isActive ? color : theme.subtext }]}>{getCatLabel(cat).toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  /* ── CARD ── */
  const renderCard = (event: any, index: number, onAddToCol?: (id: string) => void) => {
    const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
    const narrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
    const year = extractYear(event);
    const category = event.category ?? 'history';
    const catColor = getCatColor(category);
    const catLabel = getCatLabel(category).toUpperCase();
    const imageUri = event.gallery?.[0];
    const eventId = getEventId(event);
    const eventKey = eventId || `ev-${index}`;
    const impact = event.impactScore ?? 0;

    return (
      <SwipeCard
        key={eventKey}
        onDelete={() => handleDelete(eventId)}
        onPress={() => { haptic('light'); setSelectedEvent(event); }}
        removeLabel={ts('swipe_remove')}
      >
        <View style={[st.card, { backgroundColor: theme.card, borderColor: theme.border + '50' }]}>
          <View style={[st.innerFrame, { borderColor: theme.gold + '15' }]} pointerEvents="none" />

          <View style={st.cardImgWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={350} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: catColor + '10', alignItems: 'center', justifyContent: 'center' }]}>
                <Bookmark size={44} color={catColor + '28'} strokeWidth={1} />
              </View>
            )}
            <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.85)']} locations={[0, 0.3, 1]} style={StyleSheet.absoluteFill} />
            <View style={[st.catBadge, { backgroundColor: catColor + 'dd' }]}>
              <View style={st.proPillDot} />
              <Text style={st.catBadgeText}>{catLabel}</Text>
            </View>
            <View style={st.cardImgOverlay}>
              {year !== '' && (
                <View style={st.yearRow}>
                  <Text style={[st.cardYear, { color: theme.gold }]}>{year}</Text>
                  <View style={[st.yearLine, { backgroundColor: theme.gold + '40' }]} />
                </View>
              )}
              <Text style={[st.cardTitle, { fontFamily: SERIF }]} numberOfLines={2}>{title}</Text>
            </View>
          </View>

          <View style={st.cardBody}>
            <Text style={[st.cardExcerpt, { color: theme.subtext, fontFamily: SERIF }]} numberOfLines={2}>{narrative}</Text>
            {impact > 0 && (
              <View style={st.impactRow}>
                <Ionicons name="analytics" size={10} color={catColor} style={{ opacity: 0.7 }} />
                <Text style={[st.impactLabel, { color: theme.subtext }]}>AI IMPACT</Text>
                <View style={[st.impactTrack, { backgroundColor: theme.border }]}>
                  <View style={[st.impactFill, { backgroundColor: catColor, width: `${Math.min(impact, 100)}%` as any }]} />
                </View>
                <Text style={[st.impactScore, { color: catColor }]}>{impact}</Text>
              </View>
            )}
            {onAddToCol && (
              <TouchableOpacity
                onPress={() => { haptic('light'); onAddToCol(eventId); }}
                style={[st.addToColBtn, { borderColor: isDark ? '#292524' : '#E5E5E5' }]}
              >
                <FolderPlus size={12} color={theme.subtext} strokeWidth={2} />
                <Text style={[st.addToColText, { color: theme.subtext }]}>{ts('add_to_collection')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SwipeCard>
    );
  };

  /* ── EMPTY STATE ── */
  const renderEmpty = () => (
    <View style={st.emptyRoot}>
      <View style={st.emptyGlowRing}>
        <View style={st.emptyGlowInner}>
          <Bookmark size={34} color={theme.gold} strokeWidth={1.2} />
        </View>
      </View>
      <Text style={[st.emptyTitle, { color: theme.text, fontFamily: SERIF }]}>{ts('nothing_saved')}</Text>
      <Text style={[st.emptyDesc, { color: theme.subtext }]}>{ts('save_hint')}</Text>
    </View>
  );

  const renderCollectionsEmpty = () => (
    <View style={st.emptyRoot}>
      <View style={st.emptyGlowRing}>
        <View style={st.emptyGlowInner}>
          <FolderOpen size={34} color={theme.gold} strokeWidth={1.2} />
        </View>
      </View>
      <Text style={[st.emptyTitle, { color: theme.text, fontFamily: SERIF }]}>{ts('no_collections')}</Text>
      <Text style={[st.emptyDesc, { color: theme.subtext }]}>{ts('collections_hint')}</Text>
      <TouchableOpacity
        onPress={openCreateCollection}
        style={[st.createBtn, { backgroundColor: theme.gold + '14', borderColor: theme.gold + '40' }]}
      >
        <PlusCircle size={16} color={theme.gold} strokeWidth={2} />
        <Text style={[st.createBtnText, { color: theme.gold }]}>{ts('new_collection')}</Text>
      </TouchableOpacity>
    </View>
  );

  /* ── ROOT ── */
  return (
    <View style={[st.root, { backgroundColor: theme.background }]}>
      {renderHeader()}

      {/* SAVED TAB */}
      {activeTab === 'saved' && (
        <>
          {savedEvents.length > 0 && renderCategoryFilter()}
          {savedEvents.length === 0 ? renderEmpty()
            : displayEvents.length === 0 ? (
              <View style={[st.emptyRoot, { paddingTop: 60 }]}>
                <Text style={[st.emptyTitle, { color: theme.text, fontFamily: SERIF, fontSize: 17 }]}>{ts('no_filter')}</Text>
                <TouchableOpacity onPress={() => setActiveCategory(null)} style={[st.clearFilterBtn, { borderColor: theme.gold + '50', backgroundColor: theme.gold + '0C' }]}>
                  <Text style={[st.clearFilterText, { color: theme.gold }]}>SHOW ALL</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Animated.ScrollView
                style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[st.list, { paddingBottom: insets.bottom + 32 }]}
              >
                {displayEvents.map((event, i) => renderCard(event, i, (id) => setAddToColEventId(id)))}
                <View style={st.listFooter}>
                  <View style={[st.footerLine, { backgroundColor: theme.gold + '25' }]} />
                  <Text style={[st.footerGlyph, { color: theme.gold }]}>✦</Text>
                  <View style={[st.footerLine, { backgroundColor: theme.gold + '25' }]} />
                </View>
                <Text style={[st.footerText, { color: theme.subtext }]}>{ts('end_of_list')}</Text>
              </Animated.ScrollView>
            )}
        </>
      )}

      {/* COLLECTIONS TAB */}
      {activeTab === 'collections' && !collectionView && (
        collections.length === 0 ? renderCollectionsEmpty() : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[st.list, { paddingBottom: insets.bottom + 32 }]}
          >
            {collections.map(col => (
              <CollectionCard
                key={col.id}
                collection={col}
                savedEvents={savedEvents}
                language={language}
                theme={theme}
                isDark={isDark}
                ts={ts}
                onOpen={() => { haptic('light'); setCollectionView(col); }}
                onShare={() => handleShareCollection(col)}
                onDelete={() => handleDeleteCollection(col)}
              />
            ))}
            <TouchableOpacity
              onPress={openCreateCollection}
              style={[st.addMoreBtn, { borderColor: isDark ? '#292524' : '#E5E5E5', backgroundColor: isDark ? '#0F0E0D' : '#FAFAFA' }]}
            >
              <PlusCircle size={16} color={theme.subtext} strokeWidth={2} />
              <Text style={[st.addMoreText, { color: theme.subtext }]}>{ts('new_collection')}</Text>
            </TouchableOpacity>
          </ScrollView>
        )
      )}

      {/* COLLECTION DETAIL VIEW */}
      {activeTab === 'collections' && collectionView && (
        collectionViewEvents.length === 0 ? (
          <View style={[st.emptyRoot, { paddingTop: 40 }]}>
            <Text style={[st.emptyTitle, { color: theme.text, fontFamily: SERIF, fontSize: 17 }]}>Empty collection</Text>
            <Text style={[st.emptyDesc, { color: theme.subtext }]}>Add stories from the Saved tab.</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[st.list, { paddingBottom: insets.bottom + 32 }]}
          >
            {collectionViewEvents.map((event, i) => renderCard(event, i))}
          </ScrollView>
        )
      )}

      <StoryModal visible={!!selectedEvent} event={selectedEvent} onClose={() => setSelectedEvent(null)} theme={theme} />

      <CreateCollectionModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={(name, emoji) => { haptic('heavy'); createCollection(name, emoji); }}
        theme={theme}
        isDark={isDark}
        ts={ts}
      />

      <AddToCollectionModal
        visible={!!addToColEventId}
        eventId={addToColEventId}
        collections={collections}
        onClose={() => setAddToColEventId(null)}
        onAdd={(collId) => {
          if (addToColEventId) addEventToCollection(collId, addToColEventId);
          setAddToColEventId(null);
          haptic('medium');
        }}
        onCreateNew={openCreateCollection}
        theme={theme}
        isDark={isDark}
        ts={ts}
      />
    </View>
  );
}

/* ══════════════════════════════════
   Styles
══════════════════════════════════ */
const st = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingHorizontal: 20, paddingBottom: 10 },
  masthead: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  mastheadLine: { flex: 1, height: StyleSheet.hairlineWidth },
  mastheadLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 4, fontFamily: SANS },
  mastheadIssue: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, fontFamily: SERIF, fontStyle: 'italic' },

  tabRow: { flexDirection: 'row', gap: 24, marginBottom: 12 },
  tabBtn: { paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 11, letterSpacing: 1.5 },

  headerInner: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 36, fontWeight: '900', fontFamily: SERIF, letterSpacing: -1, lineHeight: 38, marginBottom: 4 },
  headerMeta: { fontSize: 11, fontWeight: '700', opacity: 0.45, letterSpacing: 1, textTransform: 'uppercase' },
  sortTabs: { flexDirection: 'row', gap: 20, marginTop: 4 },
  sortTab: { paddingVertical: 6, alignItems: 'center', gap: 4 },
  sortTabLabel: { fontSize: 10, letterSpacing: 1.5 },
  sortTabDot: { width: 4, height: 4, borderRadius: 2 },
  backBtn: { padding: 8, marginRight: 8, marginBottom: 4 },

  newColBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  newColText: { fontSize: 12, fontWeight: '700' },

  filterBar: { paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  filterDot: { width: 5, height: 5, borderRadius: 3 },
  filterPillLabel: { fontSize: 8.5, fontWeight: '800', letterSpacing: 1.2 },

  list: { paddingHorizontal: 20, paddingTop: 10, gap: 20 },

  card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  innerFrame: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, zIndex: 5 },
  cardImgWrap: { width: '100%', height: CARD_IMG_H, position: 'relative', overflow: 'hidden' },
  catBadge: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, zIndex: 10 },
  proPillDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },
  catBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 1.6 },
  cardImgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 60 },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardYear: { fontSize: 28, fontWeight: '900', letterSpacing: 1, fontFamily: SERIF, fontStyle: 'italic' },
  yearLine: { flex: 1, height: 1 },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 26, letterSpacing: -0.5 },

  cardBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18, gap: 12 },
  cardExcerpt: { fontSize: 14, lineHeight: 22, opacity: 0.7, fontStyle: 'italic' },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  impactLabel: { fontSize: 7, fontWeight: '700', letterSpacing: 1.5, opacity: 0.5 },
  impactTrack: { flex: 1, height: 2, borderRadius: 1, overflow: 'hidden' },
  impactFill: { height: 2, borderRadius: 1 },
  impactScore: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  addToColBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4,
  },
  addToColText: { fontSize: 11, fontWeight: '600', opacity: 0.6 },

  listFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 30, marginBottom: 6, opacity: 0.4 },
  footerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  footerGlyph: { fontSize: 10 },
  footerText: { textAlign: 'center', fontSize: 10, fontWeight: '700', opacity: 0.25, marginBottom: 4, letterSpacing: 2 },

  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44, gap: 12 },
  emptyGlowRing: { width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: 'rgba(212,168,67,0.2)', backgroundColor: 'rgba(212,168,67,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyGlowInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,168,67,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(212,168,67,0.25)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.45 },

  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, borderWidth: 1 },
  createBtnText: { fontSize: 13, fontWeight: '700' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  addMoreText: { fontSize: 13, fontWeight: '600', opacity: 0.6 },

  clearFilterBtn: { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  clearFilterText: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
});
