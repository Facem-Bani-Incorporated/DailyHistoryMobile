// components/SharePickerModal.tsx
import * as Sharing from 'expo-sharing';
import { Check, Share2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { ShareCard } from './Sharecard';

const extractYear = (event: any): string => {
  const rawDate = event?.eventDate ?? event?.event_date ?? event?.year ?? '';
  const s = String(rawDate).trim();
  if (/^\d{4}$/.test(s)) return s;
  if (s.includes('-') && s.split('-')[0].length === 4) return s.split('-')[0];
  return '';
};

interface Props {
  visible: boolean;
  event: any;
  language: string;
  gallery: string[];
  onClose: () => void;
}

export const SharePickerModal = ({ visible, event, language, gallery, onClose }: Props) => {
  const { theme, isDark, isPremium } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    if (visible) setSelectedIdx(0);
  }, [visible]);

  const handleShare = async () => {
    setSharing(true);
    await new Promise(r => setTimeout(r, 300));
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        const title = event?.titleTranslations?.[language] ?? event?.titleTranslations?.en ?? '';
        const year = extractYear(event);
        await Sharing.shareAsync(uri, {
          dialogTitle: `${title} (${year})`,
          mimeType: 'image/png',
          UTI: 'public.png',
        });
      }
    } catch {} finally {
      setSharing(false);
    }
  };

  const bg = isPremium ? '#05040A' : isDark ? '#090807' : '#FDFBF7';
  const gold = isPremium ? '#D4A843' : isDark ? '#E8B84D' : '#C77E08';

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 20 }]}>
          <View style={s.header}>
            <TouchableOpacity onPress={onClose} style={[s.closeBtn, { borderColor: theme.border }]}>
              <X size={16} color={theme.subtext} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: theme.text }]}>Share Story</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={s.previewWrap}>
            <ShareCard event={event} language={language} cardRef={shareCardRef} imageIndex={selectedIdx} />
          </View>

          {gallery.length > 1 && (
            <View style={s.pickerSection}>
              <Text style={[s.pickerLabel, { color: theme.subtext }]}>Choose image</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pickerScroll}>
                {gallery.map((img, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedIdx(i)}
                    activeOpacity={0.8}
                    style={[s.thumbWrap, { borderColor: i === selectedIdx ? gold : 'transparent', borderWidth: 2 }]}>
                    <Image source={{ uri: img }} style={s.thumb} contentFit="cover" transition={200} />
                    {i === selectedIdx && (
                      <View style={[s.thumbCheck, { backgroundColor: gold }]}>
                        <Check size={10} color="#000" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.8}
            style={[s.shareBtn, { backgroundColor: gold, opacity: sharing ? 0.6 : 1 }]}>
            <Share2 size={16} color="#000" strokeWidth={2.5} />
            <Text style={s.shareBtnText}>{sharing ? 'Sharing...' : 'Share'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  previewWrap: { alignItems: 'center', paddingVertical: 12, transform: [{ scale: 0.55 }], marginVertical: -80 },
  pickerSection: { paddingHorizontal: 20, marginBottom: 16 },
  pickerLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.5,
    marginBottom: 10, textTransform: 'uppercase', opacity: 0.5,
  },
  pickerScroll: { gap: 8, paddingRight: 20 },
  thumbWrap: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbCheck: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 20, paddingVertical: 15, borderRadius: 14,
  },
  shareBtnText: { fontSize: 15, fontWeight: '800', color: '#000', letterSpacing: 0.3 },
});
