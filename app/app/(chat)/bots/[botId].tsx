/**
 * Bot Detail Screen - View bot info, verify, and start chat
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBotRegistry, BotInfo, BotCategory } from '../../../lib/bots/registry';
import { getMatrixClient } from '../../../lib/matrix/client';
import { useChatStore } from '../../../lib/store/chat';

const CATEGORY_LABELS: Record<BotCategory, string> = {
  'ai-assistant': 'AI Assistant',
  'image-generation': 'Image & Video',
  'video-editing': 'Video Editing',
  'code-assistant': 'Code Assistant',
  'translation': 'Translation',
  'writing': 'Writing Tools',
  'research': 'Research',
  'custom': 'Custom',
};

const CATEGORY_ICONS: Record<BotCategory, string> = {
  'ai-assistant': 'chatbubble-ellipses',
  'image-generation': 'image',
  'video-editing': 'videocam',
  'code-assistant': 'code-slash',
  'translation': 'language',
  'writing': 'document-text',
  'research': 'search',
  'custom': 'cube',
};

export default function BotDetailScreen() {
  const { botId } = useLocalSearchParams<{ botId: string }>();
  const [bot, setBot] = useState<BotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [verified, setVerified] = useState(false);
  const setCurrentRoomId = useChatStore((state) => state.setCurrentRoomId);

  useEffect(() => {
    loadBot();
  }, [botId]);

  const loadBot = async () => {
    try {
      const registry = getBotRegistry();
      await registry.initialize();
      const botInfo = await registry.getBot(botId);
      setBot(botInfo || null);
    } catch (error) {
      console.error('Failed to load bot:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!bot) return;

    setConnecting(true);
    try {
      const client = getMatrixClient();

      // Create or get existing room with E2EE
      const roomId = await client.getOrCreateBotRoom(bot.userId, bot.supportsE2EE);

      // Mark bot as connected in registry
      const registry = getBotRegistry();
      await registry.connectBot(bot.id);

      // Navigate to chat
      setCurrentRoomId(roomId);
      router.replace(`/(chat)/${roomId}`);
    } catch (error) {
      console.error('Failed to start chat:', error);
      Alert.alert('Error', 'Failed to connect to bot. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleVerify = async () => {
    if (!bot) return;

    try {
      const client = getMatrixClient();

      if (!client.isE2EEEnabled()) {
        Alert.alert('E2EE Not Available', 'End-to-end encryption is not enabled.');
        return;
      }

      // Get bot's devices
      const devices = await client.getUserDevices(bot.userId);

      if (devices.length === 0) {
        Alert.alert('No Devices', 'This bot has no registered devices.');
        return;
      }

      // For now, show the fingerprint
      const fingerprint = await client.getDeviceFingerprint();

      Alert.alert(
        'Verify Bot',
        `Your device fingerprint:\n\n${fingerprint?.slice(0, 32)}...\n\nCompare this with the bot's public fingerprint to verify you're chatting with the authentic bot.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark as Verified',
            onPress: async () => {
              for (const device of devices) {
                await client.verifyDevice(bot.userId, device.deviceId);
              }
              setVerified(true);
              Alert.alert('Success', 'Bot has been verified.');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Verification failed:', error);
      Alert.alert('Error', 'Failed to verify bot.');
    }
  };

  const handleRemovePrivateBot = async () => {
    if (!bot || bot.provider !== 'private') return;

    Alert.alert(
      'Remove Bot',
      'Are you sure you want to remove this bot from your list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const registry = getBotRegistry();
            await registry.removePrivateBot(bot.id);
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!bot) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ccc" />
        <Text style={styles.errorText}>Bot not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: bot.name,
          headerBackTitle: 'Bots',
        }}
      />
      <ScrollView style={styles.container}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.avatar}>
            <Ionicons
              name={CATEGORY_ICONS[bot.category] as any}
              size={48}
              color="#fff"
            />
          </View>
          <Text style={styles.botName}>{bot.name}</Text>
          <View style={styles.badges}>
            {bot.verified && (
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            )}
            {bot.supportsE2EE && (
              <View style={[styles.badge, styles.e2eeBadge]}>
                <Ionicons name="lock-closed" size={14} color="#34C759" />
                <Text style={[styles.badgeText, styles.e2eeBadgeText]}>E2EE</Text>
              </View>
            )}
            {verified && (
              <View style={[styles.badge, styles.verifiedBadge]}>
                <Ionicons name="shield-checkmark" size={14} color="#fff" />
                <Text style={[styles.badgeText, styles.verifiedBadgeText]}>Trusted</Text>
              </View>
            )}
          </View>
          <Text style={styles.botDescription}>{bot.description}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartChat}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="chatbubble" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Start Chat</Text>
              </>
            )}
          </TouchableOpacity>

          {bot.supportsE2EE && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleVerify}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Verify Bot</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Capabilities */}
        {bot.capabilities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Capabilities</Text>
            <View style={styles.card}>
              {bot.capabilities.map((cap, index) => (
                <View key={cap.id}>
                  {index > 0 && <View style={styles.separator} />}
                  <View style={styles.capabilityRow}>
                    <View style={styles.capabilityIcon}>
                      <Ionicons name="checkmark" size={18} color="#34C759" />
                    </View>
                    <View style={styles.capabilityInfo}>
                      <Text style={styles.capabilityName}>{cap.name}</Text>
                      <Text style={styles.capabilityDescription}>{cap.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{CATEGORY_LABELS[bot.category]}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Provider</Text>
              <Text style={styles.infoValue}>
                {bot.provider === 'official' ? 'exe AI (Official)' :
                 bot.provider === 'private' ? 'Self-hosted' :
                 bot.author || 'Community'}
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>{bot.version}</Text>
            </View>
            {bot.homeserver && (
              <>
                <View style={styles.separator} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Homeserver</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {bot.homeserver}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Links */}
        {(bot.website || bot.sourceCode || bot.privacyPolicy) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Links</Text>
            <View style={styles.card}>
              {bot.website && (
                <TouchableOpacity style={styles.linkRow}>
                  <Ionicons name="globe-outline" size={20} color="#007AFF" />
                  <Text style={styles.linkText}>Website</Text>
                  <Ionicons name="open-outline" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
              {bot.sourceCode && (
                <>
                  {bot.website && <View style={styles.separator} />}
                  <TouchableOpacity style={styles.linkRow}>
                    <Ionicons name="logo-github" size={20} color="#007AFF" />
                    <Text style={styles.linkText}>Source Code</Text>
                    <Ionicons name="open-outline" size={18} color="#ccc" />
                  </TouchableOpacity>
                </>
              )}
              {bot.privacyPolicy && (
                <>
                  {(bot.website || bot.sourceCode) && <View style={styles.separator} />}
                  <TouchableOpacity style={styles.linkRow}>
                    <Ionicons name="document-text-outline" size={20} color="#007AFF" />
                    <Text style={styles.linkText}>Privacy Policy</Text>
                    <Ionicons name="open-outline" size={18} color="#ccc" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Remove Private Bot */}
        {bot.provider === 'private' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.removeButton} onPress={handleRemovePrivateBot}>
              <Text style={styles.removeButtonText}>Remove Bot</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  botName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  e2eeBadge: {
    backgroundColor: '#e8f8eb',
  },
  e2eeBadgeText: {
    color: '#34C759',
  },
  verifiedBadge: {
    backgroundColor: '#007AFF',
  },
  verifiedBadgeText: {
    color: '#fff',
  },
  botDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionSection: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 16,
  },
  capabilityRow: {
    flexDirection: 'row',
    padding: 16,
  },
  capabilityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8f8eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  capabilityInfo: {
    flex: 1,
  },
  capabilityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  capabilityDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: '#007AFF',
  },
  removeButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '500',
  },
  footer: {
    height: 48,
  },
});
