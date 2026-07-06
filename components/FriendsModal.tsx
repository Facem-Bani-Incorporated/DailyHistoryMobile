// components/FriendsModal.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  FRIENDS — add friends by username, manage requests, and a friends-only leaderboard.
//  Opened from the LeaderboardModal header. Visual language matches LeaderboardModal.
// ═══════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Crown, UserPlus, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  acceptRequest,
  declineRequest,
  Friend,
  FriendLeaderboardEntry,
  getFriends,
  getFriendsLeaderboard,
  getIncomingRequests,
  getOutgoingRequests,
  removeFriend,
  sendFriendRequest,
} from '../services/friendsService';
import { haptic } from '../utils/haptics';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const ACCENT = '#FFB300';

type Tab = 'board' | 'friends' | 'requests';

// ── Avatar colors (deterministic per name) — same trick as LeaderboardModal ──
const AVATAR_COLORS = ['#EF476F', '#06D6A0', '#118AB2', '#8338EC', '#FFD166', '#FF9F1C', '#7C3AED', '#F43F5E'];
const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ── i18n (self-contained, like LeaderboardModal) ──
const L: Record<string, Record<string, string>> = {
  en: {
    title: 'Friends', kicker: 'YOUR CIRCLE',
    addPlaceholder: 'Add friend by username', add: 'Add',
    tabBoard: 'Ranking', tabFriends: 'Friends', tabRequests: 'Requests',
    incoming: 'Received', outgoing: 'Sent', pending: 'Pending',
    accept: 'Accept', decline: 'Decline', remove: 'Remove', you: 'YOU',
    points: 'pts', loading: 'Loading...',
    emptyFriends: 'No friends yet', emptyFriendsSub: 'Add someone by their username to compare stats.',
    emptyRequests: 'No pending requests', emptyBoard: 'Add friends to see how you stack up.',
    sent: 'Request sent!', errNotFound: 'No user with that username',
    errExists: 'Already friends or a request is pending', errSelf: "That's you 🙂",
    errEmpty: 'Enter a username', errGeneric: 'Something went wrong',
    removeTitle: 'Remove friend?', removeMsg: 'Remove {name} from your friends?', cancel: 'Cancel',
  },
  ro: {
    title: 'Prieteni', kicker: 'CERCUL TĂU',
    addPlaceholder: 'Adaugă prieten după nume', add: 'Adaugă',
    tabBoard: 'Clasament', tabFriends: 'Prieteni', tabRequests: 'Cereri',
    incoming: 'Primite', outgoing: 'Trimise', pending: 'În așteptare',
    accept: 'Acceptă', decline: 'Refuză', remove: 'Elimină', you: 'TU',
    points: 'pct', loading: 'Se încarcă...',
    emptyFriends: 'Niciun prieten încă', emptyFriendsSub: 'Adaugă pe cineva după nume ca să comparați statisticile.',
    emptyRequests: 'Nicio cerere în așteptare', emptyBoard: 'Adaugă prieteni ca să vezi cum te clasezi.',
    sent: 'Cerere trimisă!', errNotFound: 'Niciun utilizator cu acest nume',
    errExists: 'Sunteți deja prieteni sau există o cerere', errSelf: 'Ești chiar tu 🙂',
    errEmpty: 'Introdu un nume de utilizator', errGeneric: 'Ceva nu a mers bine',
    removeTitle: 'Elimini prietenul?', removeMsg: 'Îl elimini pe {name} din prieteni?', cancel: 'Anulează',
  },
  fr: {
    title: 'Amis', kicker: 'VOTRE CERCLE',
    addPlaceholder: "Ajouter par nom d'utilisateur", add: 'Ajouter',
    tabBoard: 'Classement', tabFriends: 'Amis', tabRequests: 'Demandes',
    incoming: 'Reçues', outgoing: 'Envoyées', pending: 'En attente',
    accept: 'Accepter', decline: 'Refuser', remove: 'Retirer', you: 'VOUS',
    points: 'pts', loading: 'Chargement...',
    emptyFriends: 'Aucun ami', emptyFriendsSub: "Ajoutez quelqu'un par son nom pour comparer les stats.",
    emptyRequests: 'Aucune demande en attente', emptyBoard: 'Ajoutez des amis pour vous comparer.',
    sent: 'Demande envoyée !', errNotFound: 'Aucun utilisateur avec ce nom',
    errExists: 'Déjà amis ou demande en attente', errSelf: "C'est vous 🙂",
    errEmpty: "Entrez un nom d'utilisateur", errGeneric: 'Une erreur est survenue',
    removeTitle: "Retirer l'ami ?", removeMsg: 'Retirer {name} de vos amis ?', cancel: 'Annuler',
  },
  de: {
    title: 'Freunde', kicker: 'DEIN KREIS',
    addPlaceholder: 'Freund per Benutzername hinzufügen', add: 'Hinzufügen',
    tabBoard: 'Rangliste', tabFriends: 'Freunde', tabRequests: 'Anfragen',
    incoming: 'Erhalten', outgoing: 'Gesendet', pending: 'Ausstehend',
    accept: 'Annehmen', decline: 'Ablehnen', remove: 'Entfernen', you: 'DU',
    points: 'Pkt', loading: 'Wird geladen...',
    emptyFriends: 'Noch keine Freunde', emptyFriendsSub: 'Füge jemanden per Benutzername hinzu, um Stats zu vergleichen.',
    emptyRequests: 'Keine offenen Anfragen', emptyBoard: 'Füge Freunde hinzu, um dich zu vergleichen.',
    sent: 'Anfrage gesendet!', errNotFound: 'Kein Nutzer mit diesem Namen',
    errExists: 'Bereits befreundet oder Anfrage offen', errSelf: 'Das bist du 🙂',
    errEmpty: 'Benutzernamen eingeben', errGeneric: 'Etwas ist schiefgelaufen',
    removeTitle: 'Freund entfernen?', removeMsg: '{name} aus deinen Freunden entfernen?', cancel: 'Abbrechen',
  },
  es: {
    title: 'Amigos', kicker: 'TU CÍRCULO',
    addPlaceholder: 'Añadir por nombre de usuario', add: 'Añadir',
    tabBoard: 'Ranking', tabFriends: 'Amigos', tabRequests: 'Solicitudes',
    incoming: 'Recibidas', outgoing: 'Enviadas', pending: 'Pendiente',
    accept: 'Aceptar', decline: 'Rechazar', remove: 'Eliminar', you: 'TÚ',
    points: 'pts', loading: 'Cargando...',
    emptyFriends: 'Sin amigos todavía', emptyFriendsSub: 'Añade a alguien por su nombre para comparar estadísticas.',
    emptyRequests: 'Sin solicitudes pendientes', emptyBoard: 'Añade amigos para compararte.',
    sent: '¡Solicitud enviada!', errNotFound: 'Ningún usuario con ese nombre',
    errExists: 'Ya sois amigos o hay una solicitud', errSelf: 'Ese eres tú 🙂',
    errEmpty: 'Escribe un nombre de usuario', errGeneric: 'Algo salió mal',
    removeTitle: '¿Eliminar amigo?', removeMsg: '¿Eliminar a {name} de tus amigos?', cancel: 'Cancelar',
  },
};

// ── Small reusable avatar ──
const Avatar = ({ uri, name, size = 42, ring }: { uri?: string | null; name: string; size?: number; ring?: string }) => {
  const r = size / 2;
  return (
    <View style={{
      width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center',
      backgroundColor: getAvatarColor(name || 'U'),
      borderWidth: ring ? 2 : 0, borderColor: ring ?? 'transparent',
    }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" />
      ) : (
        <Text style={{ color: '#FFF', fontWeight: '900', fontSize: size * 0.4 }}>{(name || '?')[0].toUpperCase()}</Text>
      )}
    </View>
  );
};

export default function FriendsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const tx = useCallback((k: string) => (L[language] ?? L.en)[k] ?? L.en[k] ?? k, [language]);

  const [tab, setTab] = useState<Tab>('board');
  const [board, setBoard] = useState<FriendLeaderboardEntry[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [outgoing, setOutgoing] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fr, inc, out] = await Promise.all([
        getFriends(),
        getIncomingRequests(),
        getOutgoingRequests(),
      ]);
      setFriends(fr);
      setIncoming(inc);
      setOutgoing(out);

      // Build id→avatar map so the leaderboard shows real photos where we have them.
      const avatarById = new Map<string, string | undefined>();
      fr.forEach(f => avatarById.set(String(f.userId), f.avatarUrl ?? undefined));
      const lb = await getFriendsLeaderboard(avatarById);
      setBoard(lb);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setAddMsg(null);
      setUsername('');
      loadAll();
    }
  }, [visible, loadAll]);

  const onAdd = useCallback(async () => {
    const name = username.trim();
    if (!name) { setAddMsg({ text: tx('errEmpty'), ok: false }); return; }
    setAdding(true);
    setAddMsg(null);
    haptic('medium');
    try {
      await sendFriendRequest(name);
      setUsername('');
      setAddMsg({ text: tx('sent'), ok: true });
      haptic('success');
      await loadAll();
    } catch (e: any) {
      const status = e?.response?.status;
      const text =
        status === 404 ? tx('errNotFound') :
        status === 409 ? tx('errExists') :
        status === 400 ? tx('errSelf') :
        tx('errGeneric');
      setAddMsg({ text, ok: false });
      haptic('error');
    } finally {
      setAdding(false);
    }
  }, [username, tx, loadAll]);

  const onAccept = useCallback(async (id: number) => {
    haptic('success');
    try { await acceptRequest(id); await loadAll(); } catch { haptic('error'); }
  }, [loadAll]);

  const onDecline = useCallback(async (id: number) => {
    haptic('light');
    try { await declineRequest(id); await loadAll(); } catch { haptic('error'); }
  }, [loadAll]);

  const onRemove = useCallback((friend: Friend) => {
    Alert.alert(
      tx('removeTitle'),
      tx('removeMsg').replace('{name}', friend.username),
      [
        { text: tx('cancel'), style: 'cancel' },
        {
          text: tx('remove'), style: 'destructive',
          onPress: async () => {
            haptic('medium');
            try { await removeFriend(friend.userId); await loadAll(); } catch { haptic('error'); }
          },
        },
      ],
    );
  }, [tx, loadAll]);

  const bg = isDark ? '#0A0810' : '#F8F6FC';
  const cardBg = isDark ? '#141017' : '#FFFFFF';
  const cardBorder = isDark ? '#201B28' : '#ECE6DC';
  const inputBg = isDark ? '#181220' : '#FFFFFF';

  const TABS: { key: Tab; label: string; badge?: number }[] = useMemo(() => [
    { key: 'board', label: tx('tabBoard') },
    { key: 'friends', label: tx('tabFriends'), badge: friends.length || undefined },
    { key: 'requests', label: tx('tabRequests'), badge: incoming.length || undefined },
  ], [tx, friends.length, incoming.length]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[s.root, { backgroundColor: bg, paddingTop: insets.top }]}>
          <LinearGradient
            colors={isDark ? ['#0B0912', '#0F0D17', '#0B0912'] : ['#FBF8FF', '#F5F1FA', '#FBF8FF']}
            style={StyleSheet.absoluteFill}
          />

          {/* Header */}
          <View style={s.hdr}>
            <TouchableOpacity
              onPress={() => { haptic('light'); onClose(); }}
              style={[s.iconBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
              activeOpacity={0.75}
            >
              <X size={18} color={theme.text} strokeWidth={2.4} />
            </TouchableOpacity>
            <View style={s.hdrCenter}>
              <Text style={[s.hdrKicker, { color: ACCENT }]}>{tx('kicker')}</Text>
              <Text style={[s.hdrTitle, { color: theme.text }]}>{tx('title')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => { haptic('medium'); loadAll(); }}
              style={[s.iconBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
              activeOpacity={0.75}
            >
              <Ionicons name="refresh" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Add friend row */}
          <View style={s.addWrap}>
            <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: cardBorder }]}>
              <UserPlus size={17} color={theme.subtext} strokeWidth={2.2} />
              <TextInput
                value={username}
                onChangeText={(v) => { setUsername(v); if (addMsg) setAddMsg(null); }}
                placeholder={tx('addPlaceholder')}
                placeholderTextColor={theme.subtext + '99'}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={onAdd}
                style={[s.input, { color: theme.text }]}
                editable={!adding}
              />
              <TouchableOpacity
                onPress={onAdd}
                disabled={adding}
                activeOpacity={0.8}
                style={[s.addBtn, { backgroundColor: ACCENT, opacity: adding ? 0.6 : 1 }]}
              >
                {adding
                  ? <ActivityIndicator size="small" color="#1a1208" />
                  : <Text style={s.addBtnText}>{tx('add')}</Text>}
              </TouchableOpacity>
            </View>
            {addMsg && (
              <Text style={[s.addMsg, { color: addMsg.ok ? '#34C759' : '#FF6B6B' }]}>
                {addMsg.text}
              </Text>
            )}
          </View>

          {/* Tabs */}
          <View style={s.tabsRow}>
            {TABS.map(({ key, label, badge }) => {
              const active = tab === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => { haptic('light'); setTab(key); }}
                  activeOpacity={0.8}
                  style={{ flex: 1 }}
                >
                  <View style={[s.tab, {
                    backgroundColor: active ? ACCENT : cardBg,
                    borderColor: active ? ACCENT : cardBorder,
                  }]}>
                    <Text style={[s.tabText, { color: active ? '#1a1208' : theme.subtext }]}>{label}</Text>
                    {badge ? (
                      <View style={[s.badge, { backgroundColor: active ? '#1a120833' : ACCENT }]}>
                        <Text style={[s.badgeText, { color: active ? '#1a1208' : '#1a1208' }]}>{badge}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }}
          >
            {loading ? (
              <View style={s.stateWrap}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={[s.stateText, { color: theme.subtext }]}>{tx('loading')}</Text>
              </View>
            ) : tab === 'board' ? (
              board.length === 0 ? (
                <EmptyState icon={<Users size={28} color={ACCENT} strokeWidth={1.8} />}
                  title={tx('emptyFriends')} sub={tx('emptyBoard')} theme={theme} />
              ) : (
                board.map((e) => (
                  <View key={e.userId} style={[s.row, {
                    backgroundColor: e.isCurrentUser ? ACCENT + '12' : cardBg,
                    borderColor: e.isCurrentUser ? ACCENT + '55' : cardBorder,
                  }]}>
                    <View style={s.rankCol}>
                      {e.rank === 1
                        ? <Crown size={16} color="#FFD700" strokeWidth={2.5} fill="#FFD700" />
                        : <Text style={[s.rankText, { color: e.isCurrentUser ? ACCENT : theme.subtext }]}>{e.rank}</Text>}
                    </View>
                    <Avatar uri={e.photoUrl} name={e.username} ring={e.isCurrentUser ? ACCENT + '80' : undefined} />
                    <View style={s.info}>
                      <View style={s.nameRow}>
                        <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{e.username}</Text>
                        {e.isCurrentUser && (
                          <View style={[s.youTag, { backgroundColor: ACCENT }]}>
                            <Text style={s.youTagText}>{tx('you')}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.sub, { color: theme.subtext }]}>{t('level')} {e.level}</Text>
                    </View>
                    <View style={s.scoreCol}>
                      <Text style={[s.score, { color: e.isCurrentUser ? ACCENT : theme.text }]}>
                        {e.value.toLocaleString()}
                      </Text>
                      <Text style={[s.scoreLabel, { color: theme.subtext }]}>{tx('points')}</Text>
                    </View>
                  </View>
                ))
              )
            ) : tab === 'friends' ? (
              friends.length === 0 ? (
                <EmptyState icon={<Users size={28} color={ACCENT} strokeWidth={1.8} />}
                  title={tx('emptyFriends')} sub={tx('emptyFriendsSub')} theme={theme} />
              ) : (
                friends.map((f) => (
                  <View key={f.friendshipId} style={[s.row, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <Avatar uri={f.avatarUrl} name={f.username} />
                    <View style={s.info}>
                      <View style={s.nameRow}>
                        <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{f.username}</Text>
                        {f.pro && (
                          <View style={s.proTag}><Text style={s.proTagText}>PRO</Text></View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => onRemove(f)}
                      activeOpacity={0.8}
                      style={[s.pillBtn, { borderColor: '#FF6B6B55' }]}
                    >
                      <Text style={[s.pillBtnText, { color: '#FF6B6B' }]}>{tx('remove')}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
            ) : (
              // requests
              incoming.length === 0 && outgoing.length === 0 ? (
                <EmptyState icon={<UserPlus size={28} color={ACCENT} strokeWidth={1.8} />}
                  title={tx('emptyRequests')} sub={tx('emptyFriendsSub')} theme={theme} />
              ) : (
                <>
                  {incoming.length > 0 && (
                    <>
                      <Text style={[s.sectionTitle, { color: theme.text }]}>{tx('incoming')}</Text>
                      {incoming.map((r) => (
                        <View key={r.friendshipId} style={[s.row, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                          <Avatar uri={r.avatarUrl} name={r.username} />
                          <View style={s.info}>
                            <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{r.username}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => onDecline(r.friendshipId)}
                            activeOpacity={0.8}
                            style={[s.circleBtn, { borderColor: cardBorder }]}
                          >
                            <X size={16} color={theme.subtext} strokeWidth={2.5} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => onAccept(r.friendshipId)}
                            activeOpacity={0.85}
                            style={[s.circleBtn, { backgroundColor: '#34C759', borderColor: '#34C759' }]}
                          >
                            <Check size={16} color="#FFF" strokeWidth={2.8} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                  {outgoing.length > 0 && (
                    <>
                      <Text style={[s.sectionTitle, { color: theme.text, marginTop: incoming.length ? 18 : 0 }]}>
                        {tx('outgoing')}
                      </Text>
                      {outgoing.map((r) => (
                        <View key={r.friendshipId} style={[s.row, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                          <Avatar uri={r.avatarUrl} name={r.username} />
                          <View style={s.info}>
                            <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{r.username}</Text>
                          </View>
                          <View style={[s.pendingTag, { borderColor: cardBorder }]}>
                            <Text style={[s.pendingText, { color: theme.subtext }]}>{tx('pending')}</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const EmptyState = ({ icon, title, sub, theme }: { icon: React.ReactNode; title: string; sub: string; theme: any }) => (
  <View style={s.stateWrap}>
    <View style={[s.emptyIcon, { backgroundColor: ACCENT + '12' }]}>{icon}</View>
    <Text style={[s.emptyTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[s.stateText, { color: theme.subtext, textAlign: 'center' }]}>{sub}</Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1 },
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  hdrCenter: { flex: 1, alignItems: 'center' },
  hdrKicker: { fontSize: 9.5, fontWeight: '900', letterSpacing: 2.2 },
  hdrTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  addWrap: { paddingHorizontal: 16, marginBottom: 12 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, paddingLeft: 14, paddingRight: 6, height: 50,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  addBtn: { paddingHorizontal: 16, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#1a1208', fontWeight: '900', fontSize: 13, letterSpacing: 0.3 },
  addMsg: { fontSize: 12.5, fontWeight: '700', marginTop: 8, marginLeft: 4 },

  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 14 },
  tab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  tabText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.2 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10.5, fontWeight: '900' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 8,
  },
  rankCol: { width: 26, alignItems: 'center' },
  rankText: { fontSize: 15, fontWeight: '900', fontFamily: SERIF },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, flexShrink: 1 },
  sub: { fontSize: 11, fontWeight: '600', opacity: 0.6, marginTop: 2 },
  youTag: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  youTagText: { color: '#1a1208', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.8 },
  proTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: '#FFD70022' },
  proTagText: { color: '#E8B84D', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.8 },

  scoreCol: { alignItems: 'flex-end', minWidth: 54 },
  score: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3, fontFamily: SERIF },
  scoreLabel: { fontSize: 8.5, fontWeight: '700', opacity: 0.5, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 },

  pillBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  pillBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  circleBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pendingTag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  pendingText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },

  sectionTitle: { fontSize: 12.5, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10, opacity: 0.75 },

  stateWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  stateText: { fontSize: 13, fontWeight: '600', opacity: 0.7, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
});
