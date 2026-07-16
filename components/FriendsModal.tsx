// components/FriendsModal.tsx
// ═══════════════════════════════════════════════════════════════════════════════
//  FRIENDS — add friends by username, manage requests, and a friends-only board.
//  Shares the app's visual language: theme surfaces, the vibrant gold ramp from
//  CoinRewardModal, Georgia for names, system sans with tabular figures for stats.
// ═══════════════════════════════════════════════════════════════════════════════

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Crown, RotateCw, Share2, Trophy, UserPlus, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { getStoreUrl } from '../config/urls';
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
import { useAuthStore } from '../store/useAuthStore';
import { useCoinStore } from '../store/useCoinStore';
import { haptic } from '../utils/haptics';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const SANS = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const NUM: any = { fontFamily: SANS, fontVariant: ['tabular-nums'] };

// Same vibrant ramp as CoinRewardModal / the quiz modals.
const GOLD_LIGHT = '#F7D774';
const GOLD = '#E8B84D';
const GOLD_DEEP = '#D4A017';
const INK = '#3A2A05';
const OK = '#43A854';
const NO = '#D44343';

type Tab = 'board' | 'friends' | 'requests';

// ── Avatar colors (deterministic per name) ──
const AVATAR_COLORS = ['#EF476F', '#06D6A0', '#118AB2', '#8338EC', '#FFD166', '#FF9F1C', '#7C3AED', '#F43F5E'];
const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ── i18n ──
// The whole explanation is two lines — what to do, and what you get. Longer
// copy just gets skipped, and the input placeholder carries the rest.
const L: Record<string, Record<string, string>> = {
  en: {
    kicker: 'YOUR CIRCLE', title: 'Friends',
    rewardTitle: 'Invite a friend, get a day of PRO',
    rewardSub: 'Share your username. Every friend who accepts adds another free day.',
    passLeft: '{time} of PRO left',
    invite: 'Invite',
    addPlaceholder: 'Add by username', add: 'Add',
    addHint: 'Their username is on their profile.',
    tabBoard: 'Ranking', tabFriends: 'Friends', tabRequests: 'Requests',
    incoming: 'Received', outgoing: 'Sent', pending: 'Pending',
    remove: 'Remove', you: 'YOU', pts: 'XP', lvl: 'Lv',
    emptyBoard: 'No ranking yet', emptyBoardSub: 'Add a friend to see who reads more history.',
    emptyFriends: 'No friends yet', emptyFriendsSub: 'Add someone by their username above.',
    emptyRequests: 'Nothing pending', emptyRequestsSub: 'Requests you send or receive show up here.',
    sent: 'Request sent', errNotFound: 'No user with that username',
    errExists: 'Already friends, or a request is pending', errSelf: "That's your own username",
    errEmpty: 'Enter a username', errGeneric: 'Something went wrong',
    removeTitle: 'Remove friend?', removeMsg: 'Remove {name} from your friends?', cancel: 'Cancel',
    inviteMsg: 'Add me on Daily History — my username is:',
  },
  ro: {
    kicker: 'CERCUL TĂU', title: 'Prieteni',
    rewardTitle: 'Invită un prieten, primești o zi de PRO',
    rewardSub: 'Dă-i numele tău de utilizator. Fiecare prieten care acceptă îți adaugă încă o zi gratis.',
    passLeft: 'îți mai rămân {time} de PRO',
    invite: 'Invită',
    addPlaceholder: 'Adaugă după nume', add: 'Adaugă',
    addHint: 'Numele lui de utilizator e pe profilul lui.',
    tabBoard: 'Clasament', tabFriends: 'Prieteni', tabRequests: 'Cereri',
    incoming: 'Primite', outgoing: 'Trimise', pending: 'În așteptare',
    remove: 'Elimină', you: 'TU', pts: 'XP', lvl: 'Niv',
    emptyBoard: 'Niciun clasament încă', emptyBoardSub: 'Adaugă un prieten ca să vezi cine citește mai multă istorie.',
    emptyFriends: 'Niciun prieten încă', emptyFriendsSub: 'Adaugă pe cineva după nume, mai sus.',
    emptyRequests: 'Nimic în așteptare', emptyRequestsSub: 'Cererile trimise sau primite apar aici.',
    sent: 'Cerere trimisă', errNotFound: 'Niciun utilizator cu acest nume',
    errExists: 'Sunteți deja prieteni sau există o cerere', errSelf: 'E chiar numele tău',
    errEmpty: 'Introdu un nume de utilizator', errGeneric: 'Ceva nu a mers bine',
    removeTitle: 'Elimini prietenul?', removeMsg: 'Îl elimini pe {name} din prieteni?', cancel: 'Anulează',
    inviteMsg: 'Adaugă-mă pe Daily History — numele meu de utilizator este:',
  },
  fr: {
    kicker: 'VOTRE CERCLE', title: 'Amis',
    rewardTitle: 'Invitez un ami, gagnez un jour de PRO',
    rewardSub: "Partagez votre nom d'utilisateur. Chaque ami qui accepte ajoute un jour gratuit.",
    passLeft: '{time} de PRO restant',
    invite: 'Inviter',
    addPlaceholder: "Ajouter par nom d'utilisateur", add: 'Ajouter',
    addHint: "Son nom d'utilisateur est sur son profil.",
    tabBoard: 'Classement', tabFriends: 'Amis', tabRequests: 'Demandes',
    incoming: 'Reçues', outgoing: 'Envoyées', pending: 'En attente',
    remove: 'Retirer', you: 'VOUS', pts: 'XP', lvl: 'Niv',
    emptyBoard: 'Pas encore de classement', emptyBoardSub: 'Ajoutez un ami pour voir qui lit le plus.',
    emptyFriends: 'Aucun ami', emptyFriendsSub: "Ajoutez quelqu'un par son nom, ci-dessus.",
    emptyRequests: 'Rien en attente', emptyRequestsSub: 'Les demandes envoyées ou reçues apparaissent ici.',
    sent: 'Demande envoyée', errNotFound: 'Aucun utilisateur avec ce nom',
    errExists: 'Déjà amis ou demande en attente', errSelf: "C'est votre propre nom",
    errEmpty: "Entrez un nom d'utilisateur", errGeneric: 'Une erreur est survenue',
    removeTitle: "Retirer l'ami ?", removeMsg: 'Retirer {name} de vos amis ?', cancel: 'Annuler',
    inviteMsg: "Ajoute-moi sur Daily History — mon nom d'utilisateur est :",
  },
  de: {
    kicker: 'DEIN KREIS', title: 'Freunde',
    rewardTitle: 'Lade einen Freund ein, hol dir einen PRO-Tag',
    rewardSub: 'Teile deinen Benutzernamen. Jeder Freund, der annimmt, bringt einen weiteren Gratistag.',
    passLeft: 'noch {time} PRO',
    invite: 'Einladen',
    addPlaceholder: 'Per Benutzername hinzufügen', add: 'Hinzufügen',
    addHint: 'Sein Benutzername steht in seinem Profil.',
    tabBoard: 'Rangliste', tabFriends: 'Freunde', tabRequests: 'Anfragen',
    incoming: 'Erhalten', outgoing: 'Gesendet', pending: 'Ausstehend',
    remove: 'Entfernen', you: 'DU', pts: 'XP', lvl: 'Lv',
    emptyBoard: 'Noch keine Rangliste', emptyBoardSub: 'Füge einen Freund hinzu und vergleicht euch.',
    emptyFriends: 'Noch keine Freunde', emptyFriendsSub: 'Füge oben jemanden per Benutzername hinzu.',
    emptyRequests: 'Nichts offen', emptyRequestsSub: 'Gesendete und erhaltene Anfragen erscheinen hier.',
    sent: 'Anfrage gesendet', errNotFound: 'Kein Nutzer mit diesem Namen',
    errExists: 'Bereits befreundet oder Anfrage offen', errSelf: 'Das ist dein eigener Name',
    errEmpty: 'Benutzernamen eingeben', errGeneric: 'Etwas ist schiefgelaufen',
    removeTitle: 'Freund entfernen?', removeMsg: '{name} aus deinen Freunden entfernen?', cancel: 'Abbrechen',
    inviteMsg: 'Füge mich bei Daily History hinzu — mein Benutzername ist:',
  },
  es: {
    kicker: 'TU CÍRCULO', title: 'Amigos',
    rewardTitle: 'Invita a un amigo, gana un día de PRO',
    rewardSub: 'Comparte tu nombre de usuario. Cada amigo que acepte añade otro día gratis.',
    passLeft: 'te queda {time} de PRO',
    invite: 'Invitar',
    addPlaceholder: 'Añadir por nombre', add: 'Añadir',
    addHint: 'Su nombre de usuario está en su perfil.',
    tabBoard: 'Ranking', tabFriends: 'Amigos', tabRequests: 'Solicitudes',
    incoming: 'Recibidas', outgoing: 'Enviadas', pending: 'Pendiente',
    remove: 'Eliminar', you: 'TÚ', pts: 'XP', lvl: 'Nv',
    emptyBoard: 'Sin ranking todavía', emptyBoardSub: 'Añade un amigo para ver quién lee más historia.',
    emptyFriends: 'Sin amigos todavía', emptyFriendsSub: 'Añade a alguien por su nombre, arriba.',
    emptyRequests: 'Nada pendiente', emptyRequestsSub: 'Las solicitudes enviadas o recibidas aparecen aquí.',
    sent: 'Solicitud enviada', errNotFound: 'Ningún usuario con ese nombre',
    errExists: 'Ya sois amigos o hay una solicitud', errSelf: 'Ese es tu propio nombre',
    errEmpty: 'Escribe un nombre de usuario', errGeneric: 'Algo salió mal',
    removeTitle: '¿Eliminar amigo?', removeMsg: '¿Eliminar a {name} de tus amigos?', cancel: 'Cancelar',
    inviteMsg: 'Añádeme en Daily History — mi nombre de usuario es:',
  },
};

// ── Avatar ──
const Avatar = ({ uri, name, size = 40, ring }: { uri?: string | null; name: string; size?: number; ring?: string }) => {
  const r = size / 2;
  return (
    <View style={{
      width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center',
      backgroundColor: getAvatarColor(name || 'U'),
      borderWidth: ring ? 1.5 : 0, borderColor: ring ?? 'transparent',
    }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" />
      ) : (
        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: size * 0.4, fontFamily: SANS }}>
          {(name || '?')[0].toUpperCase()}
        </Text>
      )}
    </View>
  );
};

const Empty = ({ icon, title, sub, theme, line }: {
  icon: React.ReactNode; title: string; sub: string; theme: any; line: string;
}) => (
  <View style={s.stateWrap}>
    <View style={[s.emptyIcon, { borderColor: line }]}>{icon}</View>
    <Text style={[s.emptyTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[s.emptySub, { color: theme.subtext }]}>{sub}</Text>
  </View>
);

export default function FriendsModal({
  visible, onClose, onOpenLeaderboard,
}: {
  visible: boolean;
  onClose: () => void;
  /** When set, shows a trophy in the header that jumps to the global leaderboard. */
  onOpenLeaderboard?: () => void;
}) {
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const tx = useCallback((k: string) => (L[language] ?? L.en)[k] ?? L.en[k] ?? k, [language]);

  // Premium ships extra tokens; dark/light don't — fall back to the base palette.
  const surface = (theme as any).card ?? theme.background;
  const line = (theme as any).cardBorder ?? theme.border;
  const inputBg = (theme as any).inputBg ?? (isDark ? '#00000040' : '#FFFFFF');
  const accent = isDark ? GOLD : GOLD_DEEP;

  const user = useAuthStore(s => s.user);
  const myUsername = user?.username || user?.email?.split('@')[0] || '';

  const [tab, setTab] = useState<Tab>('board');
  const [board, setBoard] = useState<FriendLeaderboardEntry[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Friend[]>([]);
  const [outgoing, setOutgoing] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Referral pass countdown — recomputed each time the modal opens.
  const [passLeftMs, setPassLeftMs] = useState(0);
  useEffect(() => {
    if (!visible) return;
    try {
      const until = useCoinStore.getState().getData().referralPassUntil ?? 0;
      setPassLeftMs(Math.max(0, until - Date.now()));
    } catch { setPassLeftMs(0); }
  }, [visible]);
  const passLeftLabel = useMemo(() => {
    if (passLeftMs <= 0) return null;
    const h = Math.floor(passLeftMs / 3600_000);
    const d = Math.floor(h / 24);
    return d >= 1 ? `${d}d ${h % 24}h` : `${Math.max(1, h)}h`;
  }, [passLeftMs]);

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

      // Build id→avatar map so the board shows real photos where we have them.
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

  const onInvite = useCallback(() => {
    haptic('medium');
    Share.share({
      message: `${tx('inviteMsg')}\n\n@${myUsername}\n${getStoreUrl()}`,
    }).catch(() => {});
  }, [tx, myUsername]);

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

  const TABS: { key: Tab; label: string; badge?: number }[] = useMemo(() => [
    { key: 'board', label: tx('tabBoard') },
    { key: 'friends', label: tx('tabFriends'), badge: friends.length || undefined },
    { key: 'requests', label: tx('tabRequests'), badge: incoming.length || undefined },
  ], [tx, friends.length, incoming.length]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={[s.root, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={[GOLD + (isDark ? '12' : '0E'), 'transparent']}
          style={s.topGlow}
          pointerEvents="none"
        />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {/* Header */}
          <View style={[s.header, { paddingTop: insets.top + 10 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.kicker, { color: accent }]}>{tx('kicker')}</Text>
              <Text style={[s.title, { color: theme.text }]}>{tx('title')}</Text>
            </View>
            <View style={s.headerBtns}>
              {onOpenLeaderboard && (
                <TouchableOpacity
                  onPress={() => { haptic('light'); onOpenLeaderboard(); }}
                  style={[s.iconBtn, { backgroundColor: surface, borderColor: line }]}
                  activeOpacity={0.75}
                  accessibilityRole="button" accessibilityLabel={t('leaderboard')}
                >
                  <Trophy size={16} color={accent} strokeWidth={2.2} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { haptic('medium'); loadAll(); }}
                style={[s.iconBtn, { backgroundColor: surface, borderColor: line }]}
                activeOpacity={0.75}
              >
                <RotateCw size={15} color={theme.subtext} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { haptic('light'); onClose(); }}
                style={[s.iconBtn, { backgroundColor: surface, borderColor: line }]}
                activeOpacity={0.75}
              >
                <X size={16} color={theme.subtext} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
          >
            {/* Referral — the whole pitch in two lines, then the action */}
            <View style={[s.reward, { borderColor: GOLD + '38' }]}>
              <Text style={[s.rewardTitle, { color: theme.text }]}>{tx('rewardTitle')}</Text>
              <Text style={[s.rewardSub, { color: theme.subtext }]}>{tx('rewardSub')}</Text>

              <View style={s.rewardRow}>
                <View style={[s.handle, { backgroundColor: inputBg, borderColor: line }]}>
                  <Text style={[s.handleText, { color: theme.text }]} numberOfLines={1}>@{myUsername}</Text>
                </View>
                <TouchableOpacity onPress={onInvite} activeOpacity={0.9} style={s.inviteWrap}>
                  <LinearGradient colors={[GOLD_LIGHT, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.invite}>
                    <Share2 size={13} color={INK} strokeWidth={2.6} />
                    <Text style={s.inviteText}>{tx('invite')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {passLeftLabel && (
                <View style={s.passRow}>
                  <Crown size={11} color={accent} strokeWidth={2.4} fill={accent} />
                  <Text style={[s.passText, { color: accent }]}>
                    {tx('passLeft').replace('{time}', passLeftLabel)}
                  </Text>
                </View>
              )}
            </View>

            {/* Add by username */}
            <View style={s.addWrap}>
              <View style={[s.inputRow, { backgroundColor: inputBg, borderColor: username ? GOLD + '80' : line }]}>
                <UserPlus size={16} color={theme.subtext} strokeWidth={2.2} />
                <TextInput
                  value={username}
                  onChangeText={(v) => { setUsername(v); if (addMsg) setAddMsg(null); }}
                  placeholder={tx('addPlaceholder')}
                  placeholderTextColor={theme.subtext + '80'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={onAdd}
                  style={[s.input, { color: theme.text }]}
                  editable={!adding}
                />
                <TouchableOpacity onPress={onAdd} disabled={adding || !username.trim()} activeOpacity={0.9}
                  style={{ opacity: adding || !username.trim() ? 0.4 : 1 }}>
                  <LinearGradient colors={[GOLD_LIGHT, GOLD_DEEP]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addBtn}>
                    {adding
                      ? <ActivityIndicator size="small" color={INK} />
                      : <Text style={s.addBtnText}>{tx('add')}</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              {/* Doubles as the error/success line — same slot, no layout jump */}
              <Text style={[s.addHint, { color: addMsg ? (addMsg.ok ? OK : NO) : theme.subtext }]}>
                {addMsg ? addMsg.text : tx('addHint')}
              </Text>
            </View>

            {/* Tabs — underline, so the list stays the loudest thing on screen */}
            <View style={[s.tabs, { borderBottomColor: line }]}>
              {TABS.map(({ key, label, badge }) => {
                const active = tab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => { haptic('light'); setTab(key); }}
                    activeOpacity={0.7}
                    style={[s.tab, active && { borderBottomColor: accent }]}
                  >
                    <Text style={[s.tabText, { color: active ? theme.text : theme.subtext }]}>{label}</Text>
                    {badge ? (
                      <View style={[s.badge, { backgroundColor: active ? accent : line }]}>
                        <Text style={[s.badgeText, NUM, { color: active ? INK : theme.subtext }]}>{badge}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.list}>
              {loading ? (
                <View style={s.stateWrap}>
                  <ActivityIndicator size="small" color={accent} />
                </View>
              ) : tab === 'board' ? (
                board.length === 0 ? (
                  <Empty icon={<Trophy size={22} color={accent} strokeWidth={1.9} />}
                    title={tx('emptyBoard')} sub={tx('emptyBoardSub')} theme={theme} line={line} />
                ) : (
                  board.map((e) => (
                    <View key={e.userId} style={[s.row, { borderBottomColor: line }]}>
                      <View style={s.rankCol}>
                        {e.rank === 1
                          ? <Crown size={15} color={GOLD} strokeWidth={2.4} fill={GOLD} />
                          : <Text style={[s.rank, NUM, { color: theme.subtext }]}>{e.rank}</Text>}
                      </View>
                      <Avatar uri={e.photoUrl} name={e.username} ring={e.isCurrentUser ? accent : undefined} />
                      <View style={s.info}>
                        <View style={s.nameRow}>
                          <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{e.username}</Text>
                          {e.isCurrentUser && <Text style={[s.tag, { color: accent }]}>{tx('you')}</Text>}
                        </View>
                        <Text style={[s.meta, NUM, { color: theme.subtext }]}>{tx('lvl')} {e.level}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[s.score, NUM, { color: e.isCurrentUser ? accent : theme.text }]}>
                          {e.value.toLocaleString()}
                        </Text>
                        <Text style={[s.scoreLbl, { color: theme.subtext }]}>{tx('pts')}</Text>
                      </View>
                    </View>
                  ))
                )
              ) : tab === 'friends' ? (
                friends.length === 0 ? (
                  <Empty icon={<Users size={22} color={accent} strokeWidth={1.9} />}
                    title={tx('emptyFriends')} sub={tx('emptyFriendsSub')} theme={theme} line={line} />
                ) : (
                  friends.map((f) => (
                    <View key={f.friendshipId} style={[s.row, { borderBottomColor: line }]}>
                      <Avatar uri={f.avatarUrl} name={f.username} />
                      <View style={s.info}>
                        <View style={s.nameRow}>
                          <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{f.username}</Text>
                          {f.pro && <Text style={[s.tag, { color: GOLD }]}>PRO</Text>}
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => onRemove(f)} activeOpacity={0.7} style={s.textBtn}>
                        <Text style={[s.textBtnLabel, { color: theme.subtext }]}>{tx('remove')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )
              ) : (
                incoming.length === 0 && outgoing.length === 0 ? (
                  <Empty icon={<UserPlus size={22} color={accent} strokeWidth={1.9} />}
                    title={tx('emptyRequests')} sub={tx('emptyRequestsSub')} theme={theme} line={line} />
                ) : (
                  <>
                    {incoming.length > 0 && (
                      <>
                        <Text style={[s.section, { color: theme.subtext }]}>{tx('incoming')}</Text>
                        {incoming.map((r) => (
                          <View key={r.friendshipId} style={[s.row, { borderBottomColor: line }]}>
                            <Avatar uri={r.avatarUrl} name={r.username} />
                            <View style={s.info}>
                              <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{r.username}</Text>
                            </View>
                            <TouchableOpacity onPress={() => onDecline(r.friendshipId)} activeOpacity={0.7}
                              style={[s.circleBtn, { borderColor: line }]}>
                              <X size={15} color={theme.subtext} strokeWidth={2.4} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onAccept(r.friendshipId)} activeOpacity={0.85}
                              style={[s.circleBtn, { backgroundColor: accent, borderColor: accent }]}>
                              <Check size={15} color={INK} strokeWidth={3} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    )}
                    {outgoing.length > 0 && (
                      <>
                        <Text style={[s.section, { color: theme.subtext, marginTop: incoming.length ? 22 : 0 }]}>
                          {tx('outgoing')}
                        </Text>
                        {outgoing.map((r) => (
                          <View key={r.friendshipId} style={[s.row, { borderBottomColor: line }]}>
                            <Avatar uri={r.avatarUrl} name={r.username} />
                            <View style={s.info}>
                              <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{r.username}</Text>
                            </View>
                            <Text style={[s.pending, { color: theme.subtext }]}>{tx('pending')}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                )
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 18,
  },
  kicker: { fontSize: 9.5, fontWeight: '900', letterSpacing: 2.2, fontFamily: SANS },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, fontFamily: SERIF, marginTop: 3 },
  headerBtns: { flexDirection: 'row', gap: 7 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Referral ──
  reward: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 16 },
  rewardTitle: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2, fontFamily: SERIF },
  rewardSub: { fontSize: 12.5, fontWeight: '500', fontFamily: SANS, lineHeight: 17.5, marginTop: 5, opacity: 0.9 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 },
  handle: { flex: 1, height: 38, borderRadius: 11, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 12 },
  handleText: { fontSize: 14, fontWeight: '700', fontFamily: SANS },
  inviteWrap: { borderRadius: 11, overflow: 'hidden' },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: 38 },
  inviteText: { color: INK, fontWeight: '900', fontSize: 13, letterSpacing: 0.2, fontFamily: SANS },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 },
  passText: { fontSize: 11.5, fontWeight: '800', fontFamily: SANS },

  // ── Add ──
  addWrap: { paddingHorizontal: 20, marginTop: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1.5, paddingLeft: 14, paddingRight: 5, height: 50,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '600', fontFamily: SANS, paddingVertical: 0 },
  addBtn: { paddingHorizontal: 16, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 62 },
  addBtnText: { color: INK, fontWeight: '900', fontSize: 13, letterSpacing: 0.2, fontFamily: SANS },
  addHint: { fontSize: 11.5, fontWeight: '600', fontFamily: SANS, marginTop: 8, marginLeft: 3, opacity: 0.85 },

  // ── Tabs ──
  tabs: { flexDirection: 'row', marginTop: 22, marginHorizontal: 20, borderBottomWidth: 1 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 11, marginRight: 22, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1,
  },
  tabText: { fontSize: 13.5, fontWeight: '700', fontFamily: SANS, letterSpacing: -0.1 },
  badge: { minWidth: 17, height: 17, borderRadius: 8.5, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, fontWeight: '900' },

  // ── List ──
  list: { paddingHorizontal: 20, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1 },
  rankCol: { width: 20, alignItems: 'center' },
  rank: { fontSize: 13, fontWeight: '700' },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { fontSize: 15, fontWeight: '700', fontFamily: SERIF, letterSpacing: -0.2, flexShrink: 1 },
  meta: { fontSize: 11.5, fontWeight: '600', marginTop: 2, opacity: 0.75 },
  tag: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1, fontFamily: SANS },
  score: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  scoreLbl: { fontSize: 8.5, fontWeight: '700', fontFamily: SANS, letterSpacing: 0.8, opacity: 0.6, marginTop: 1 },
  textBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  textBtnLabel: { fontSize: 12.5, fontWeight: '700', fontFamily: SANS, opacity: 0.8 },
  circleBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pending: { fontSize: 11.5, fontWeight: '700', fontFamily: SANS, opacity: 0.7 },
  section: {
    fontSize: 9.5, fontWeight: '900', letterSpacing: 1.6, fontFamily: SANS,
    textTransform: 'uppercase', marginBottom: 4, marginTop: 8, opacity: 0.7,
  },

  // ── Empty ──
  stateWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 54 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, fontFamily: SERIF },
  emptySub: {
    fontSize: 12.5, fontWeight: '500', fontFamily: SANS, textAlign: 'center',
    marginTop: 6, lineHeight: 18, opacity: 0.8, paddingHorizontal: 40,
  },
});
