import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Image,
    Modal,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemeMode, useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';

interface Props {
    visible: boolean;
    onClose: () => void;
}

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Light', value: 'light', icon: 'sunny-outline' },
    { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
    { label: 'Dark', value: 'dark', icon: 'moon-outline' },
];

export default function ProfileModal({ visible, onClose }: Props) {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();
    const { mode, setMode, theme } = useTheme();

    if (!user) return null;

    const isGoogleUser = user.provider === 'google';
    const displayName = user.username || user.email || 'Explorer';

    const getProfileImage = () => {
        const uri = user.avatar_url || user.avatarUrl || user.picture;
        if (uri) return uri;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffd700&color=000`;
    };

    const imageUrl = getProfileImage();

    const handleLogout = async () => {
        try {
            if (isGoogleUser) {
                await GoogleSignin.signOut();
            }
        } catch (e) {
            console.log('Google signout skipped');
        } finally {
            onClose();
            logout();
            router.replace('/(auth)/welcome');
        }
    };

    const s = makeStyles(theme);

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={s.container}>
                <SafeAreaView style={s.safeArea}>
                    <View style={s.header}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={s.closeButton}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Ionicons name="close" size={32} color={theme.gold} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>YOUR PROFILE</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <View style={s.content}>
                        <View style={s.imageContainer}>
                            <Image
                                source={{ uri: imageUrl }}
                                style={s.bigAvatar}
                                key={imageUrl}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={['transparent', theme.background]}
                                style={s.fade}
                            />
                        </View>

                        <View style={s.infoCard}>
                            <Text style={s.mainName}>{displayName}</Text>

                            <View style={s.badgeContainer}>
                                <View
                                    style={[
                                        s.methodBadge,
                                        { backgroundColor: isGoogleUser ? '#4285F4' : theme.gold },
                                    ]}
                                >
                                    <Ionicons
                                        name={isGoogleUser ? 'logo-google' : 'mail-outline'}
                                        size={16}
                                        color={isGoogleUser ? 'white' : 'black'}
                                    />
                                    <Text
                                        style={[
                                            s.methodText,
                                            { color: isGoogleUser ? 'white' : 'black' },
                                        ]}
                                    >
                                        {isGoogleUser ? 'Google Account' : 'Standard User'}
                                    </Text>
                                </View>
                            </View>

                            <View style={s.statsRow}>
                                <View style={s.stat}>
                                    <Text style={s.statLabel}>Status</Text>
                                    <Text style={s.statValue}>Active</Text>
                                </View>
                                <View style={[s.stat, s.borderLeft]}>
                                    <Text style={s.statLabel}>Role</Text>
                                    <Text style={s.statValue}>
                                        {user.roles?.[0]?.replace('ROLE_', '') || 'USER'}
                                    </Text>
                                </View>
                            </View>

                            {/* Theme Selector */}
                            <View style={s.themeSection}>
                                <Text style={s.themeTitle}>Appearance</Text>
                                <View style={s.themeToggleRow}>
                                    {THEME_OPTIONS.map((opt) => {
                                        const isActive = mode === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[
                                                    s.themeOption,
                                                    isActive && s.themeOptionActive,
                                                ]}
                                                onPress={() => setMode(opt.value)}
                                            >
                                                <Ionicons
                                                    name={opt.icon as any}
                                                    size={18}
                                                    color={isActive ? theme.background : theme.subtext}
                                                />
                                                <Text
                                                    style={[
                                                        s.themeOptionLabel,
                                                        isActive && s.themeOptionLabelActive,
                                                    ]}
                                                >
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                                <Ionicons name="log-out-outline" size={22} color="#ff4444" />
                                <Text style={s.logoutText}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const makeStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        safeArea: {
            flex: 1,
            paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 15,
            height: 70,
        },
        closeButton: { zIndex: 10 },
        headerTitle: {
            color: theme.text,
            fontSize: 14,
            fontWeight: '900',
            letterSpacing: 2,
        },
        content: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 40,
        },
        imageContainer: {
            width: 100,
            height: 100,
            marginBottom: -30,
            zIndex: 5,
            alignSelf: 'center',
        },
        bigAvatar: {
            width: '100%',
            height: '100%',
            borderRadius: 60,
            borderWidth: 3,
            borderColor: theme.gold,
            backgroundColor: theme.card,
        },
        infoCard: {
            width: '85%',
            backgroundColor: theme.card,
            borderRadius: 30,
            paddingTop: 50,
            paddingBottom: 25,
            paddingHorizontal: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.border,
        },
        mainName: {
            color: theme.text,
            fontSize: 22,
            fontWeight: 'bold',
            marginBottom: 10,
            textAlign: 'center',
        },
        badgeContainer: { marginBottom: 25 },
        methodBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 15,
            gap: 6,
        },
        methodText: { fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' },
        statsRow: {
            flexDirection: 'row',
            width: '100%',
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingTop: 20,
            marginBottom: 10,
        },
        stat: { flex: 1, alignItems: 'center' },
        statLabel: {
            color: theme.subtext,
            fontSize: 11,
            marginBottom: 4,
            textTransform: 'uppercase',
        },
        statValue: { color: theme.gold, fontWeight: 'bold', fontSize: 16 },
        borderLeft: { borderLeftWidth: 1, borderLeftColor: theme.border },
        fade: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 30,
            borderRadius: 60,
        },
        themeSection: {
            width: '100%',
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingTop: 18,
            marginTop: 5,
            marginBottom: 5,
            alignItems: 'center',
            gap: 12,
        },
        themeTitle: {
            color: theme.subtext,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1,
            alignSelf: 'flex-start',
        },
        themeToggleRow: {
            flexDirection: 'row',
            backgroundColor: theme.background,
            borderRadius: 14,
            padding: 4,
            gap: 4,
            width: '100%',
        },
        themeOption: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            borderRadius: 10,
            gap: 5,
        },
        themeOptionActive: {
            backgroundColor: theme.gold,
        },
        themeOptionLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: theme.subtext,
        },
        themeOptionLabelActive: {
            color: theme.background,
        },
        logoutBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 15,
            gap: 8,
            padding: 10,
        },
        logoutText: { color: '#ff4444', fontWeight: 'bold', fontSize: 15 },
    });