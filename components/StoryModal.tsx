import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, Quote, Share2, X } from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const { height: H, width: W } = Dimensions.get('window');

interface StoryModalProps {
visible: boolean;
event: any;
onClose: () => void;
theme: any;
}

export const StoryModal = ({ visible, event, onClose, theme }: StoryModalProps) => {
const { language } = useLanguage();

if (!event) return null;

const gallery = event.gallery || [];
const year = event.eventDate || event.year || '';
const title = event.titleTranslations?.[language] ?? event.titleTranslations?.en ?? '';
const fullNarrative = event.narrativeTranslations?.[language] ?? event.narrativeTranslations?.en ?? '';
const category = event.category ?? 'HISTORY';

const onShare = async () => {
try {
await Share.share({
message: `${title} (${year})\n\n${fullNarrative.substring(0, 100)}...`,
});
} catch (error) {
console.log(error);
}
};

return (
<Modal
visible={visible}
animationType="slide"
presentationStyle="fullScreen"
onRequestClose={onClose}
>
<View style={[styles.container, { backgroundColor: theme.background }]}>
<StatusBar barStyle="light-content" />

<ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

{/* HERO IMAGE SECTION */}
<View style={styles.imageContainer}>
<ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
{gallery.length > 0 ? (
gallery.map((img: string, index: number) => (
<Image key={index} source={{ uri: img }} style={styles.heroImage} contentFit="cover" />
))
) : (
<View style={[styles.heroImage, { backgroundColor: '#1a1a1a' }]} />
)}
</ScrollView>

<LinearGradient
colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.95)']}
style={styles.gradientOverlay}
/>

<View style={styles.actionBar}>
<TouchableOpacity onPress={onClose} style={styles.iconCircle}>
<X color="#fff" size={24} />
</TouchableOpacity>

<View style={{ flexDirection: 'row', gap: 12 }}>
<TouchableOpacity onPress={onShare} style={styles.iconCircle}>
<Share2 color="#fff" size={20} />
</TouchableOpacity>
<TouchableOpacity style={styles.iconCircle}>
<Bookmark color="#fff" size={22} />
</TouchableOpacity>
</View>
</View>

<View style={styles.headerInfo}>
<View style={styles.categoryBadge}>
<Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
</View>
<Text style={styles.yearLabel}>{year}</Text>
</View>
</View>

{/* CONTENT BODY WITH "OLD FRAME" DESIGN */}
<View style={[styles.body, { backgroundColor: theme.background }]}>
<View style={[styles.vintageFrame, { borderColor: theme.gold + '40' }]}>
<View style={[styles.innerFrame, { borderColor: theme.gold + '20' }]} />

<Quote size={40} color={theme.gold + '30'} style={styles.quoteIcon} />

<Text style={[styles.title, { color: theme.text }]}>{title}</Text>

<View style={styles.impactContainer}>
<View style={[styles.impactLine, { backgroundColor: theme.gold }]} />
<Text style={[styles.impactText, { color: theme.gold }]}>
SIGNIFICANCE: {event.impactScore || 0}%
</Text>
<View style={[styles.impactLine, { backgroundColor: theme.gold }]} />
</View>

<Text style={[styles.narrative, { color: theme.text }]}>
{fullNarrative}
</Text>

<View style={styles.footerDecoration}>
<View style={[styles.dot, { backgroundColor: theme.gold }]} />
<View style={[styles.longLine, { backgroundColor: theme.gold }]} />
<View style={[styles.dot, { backgroundColor: theme.gold }]} />
</View>
</View>

<View style={{ height: 60 }} />
</View>
</ScrollView>
</View>
</Modal>
);
};

const styles = StyleSheet.create({
container: { flex: 1 },
scrollContent: { flexGrow: 1 },
imageContainer: { width: W, height: H * 0.52, position: 'relative' },
heroImage: { width: W, height: H * 0.52 },
gradientOverlay: { ...StyleSheet.absoluteFillObject },
actionBar: {
position: 'absolute',
top: Platform.OS === 'ios' ? 50 : 20,
left: 20,
right: 20,
flexDirection: 'row',
justifyContent: 'space-between',
zIndex: 10
},
iconCircle: {
width: 46,
height: 46,
borderRadius: 23,
backgroundColor: 'rgba(255,255,255,0.15)',
alignItems: 'center',
justifyContent: 'center',
borderWidth: 1,
borderColor: 'rgba(255,255,255,0.2)'
},
headerInfo: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
categoryBadge: {
backgroundColor: 'rgba(255, 215, 0, 0.2)',
paddingHorizontal: 15,
paddingVertical: 4,
borderRadius: 20,
borderWidth: 1,
borderColor: '#ffd700',
marginBottom: 10
},
categoryLabel: { color: '#ffd700', fontWeight: '900', fontSize: 12, letterSpacing: 4 },
yearLabel: { color: '#fff', fontSize: 64, fontWeight: '900', letterSpacing: -2 },

body: {
marginTop: -40,
borderTopLeftRadius: 40,
borderTopRightRadius: 40,
padding: 20,
},
vintageFrame: {
borderWidth: 1,
padding: 24,
borderRadius: 20,
position: 'relative',
alignItems: 'center'
},
innerFrame: {
...StyleSheet.absoluteFillObject,
margin: 6,
borderWidth: 0.5,
borderRadius: 14,
},
quoteIcon: { marginBottom: 10 },
title: {
fontSize: 28,
fontWeight: '900',
lineHeight: 36,
marginBottom: 20,
textAlign: 'center',
paddingHorizontal: 10
},
impactContainer: {
flexDirection: 'row',
alignItems: 'center',
gap: 10,
marginBottom: 30
},
impactLine: { height: 1, width: 30, opacity: 0.4 },
impactText: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },

narrative: {
fontSize: 19,
lineHeight: 32,
fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
textAlign: 'justify',
opacity: 0.95
},
footerDecoration: {
flexDirection: 'row',
alignItems: 'center',
gap: 8,
marginTop: 40,
opacity: 0.4
},
dot: { width: 4, height: 4, borderRadius: 2 },
longLine: { width: 60, height: 1 },
});