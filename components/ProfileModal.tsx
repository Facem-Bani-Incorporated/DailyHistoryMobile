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
import { useAuthStore } from '../store/useAuthStore';

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function ProfileModal({ visible, onClose }: Props) {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();

    if (!user) return null;

    const isGoogleUser = user.provider === 'google';
    const displayName = user.username || user.email || 'Explorer';

    const getProfileImage = () => {
        const uri = user.avatar_url || user.avatarUrl || user.picture;
        if (uri) return uri;

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(
            displayName
        )}&background=ffd700&color=000`;
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

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                {/* Fix for status bar overlap */}
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={styles.closeButton}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <Ionicons name="close" size={32} color="#ffd700" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>YOUR PROFILE</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <View style={styles.content}>
                        <View style={styles.imageContainer}>
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.bigAvatar}
                                key={imageUrl}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={['transparent', '#0e1117']}
                                style={styles.fade}
                            />
                        </View>

                        <View style={styles.infoCard}>
                            <Text style={styles.mainName}>{displayName}</Text>

                            <View style={styles.badgeContainer}>
                                <View
                                    style={[
                                        styles.methodBadge,
                                        {
                                            backgroundColor: isGoogleUser
                                                ? '#4285F4'
                                                : '#ffd700',
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={isGoogleUser ? 'logo-google' : 'mail-outline'}
                                        size={16}
                                        color={isGoogleUser ? 'white' : 'black'}
                                    />
                                    <Text
                                        style={[
                                            styles.methodText,
                                            { color: isGoogleUser ? 'white' : 'black' },
                                        ]}
                                    >
                                        {isGoogleUser ? 'Google Account' : 'Standard User'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text style={styles.statLabel}>Status</Text>
                                    <Text style={styles.statValue}>Active</Text>
                                </View>

                                <View style={[styles.stat, styles.borderLeft]}>
                                    <Text style={styles.statLabel}>Role</Text>
                                    <Text style={styles.statValue}>
                                        {user.roles?.[0]?.replace('ROLE_', '') || 'USER'}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.logoutBtn}
                                onPress={handleLogout}
                            >
                                <Ionicons
                                    name="log-out-outline"
                                    size={22}
                                    color="#ff4444"
                                />
                                <Text style={styles.logoutText}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#0e1117' 
    },
    safeArea: { 
        flex: 1,
        // Ensures content starts below the status bar on Android and iOS
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        height: 70, // Fixed height for header
    },
    closeButton: {
        zIndex: 10,
    },
    headerTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    content: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center', // Centers the profile card vertically
        paddingBottom: 40
    },
    imageContainer: { 
        width: 100, 
        height: 100, 
        marginBottom: -30, // Overlaps the card slightly for a better look
        zIndex: 5,
        alignSelf: 'center',
    },
    bigAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 60, 
        borderWidth: 3,
        borderColor: '#ffd700',
        backgroundColor: '#1a1c23'
    },
    infoCard: {
        width: '85%',
        backgroundColor: '#1a1c23',
        borderRadius: 30,
        paddingTop: 50, // Space for the overlapping avatar
        paddingBottom: 25,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2a2d35',
    },
    mainName: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    badgeContainer: { 
        marginBottom: 25 
    },
    methodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 15,
        gap: 6,
    },
    methodText: { 
        fontWeight: 'bold', 
        fontSize: 11,
        textTransform: 'uppercase'
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#2a2d35',
        paddingTop: 20,
        marginBottom: 10
    },
    stat: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#888', fontSize: 11, marginBottom: 4, textTransform: 'uppercase' },
    statValue: {
        color: '#ffd700',
        fontWeight: 'bold',
        fontSize: 16,
    },
    borderLeft: {
        borderLeftWidth: 1,
        borderLeftColor: '#2a2d35',
    },
    fade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
        borderRadius: 60,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        gap: 8,
        padding: 10,
    },
    logoutText: {
        color: '#ff4444',
        fontWeight: 'bold',
        fontSize: 15
    },
});