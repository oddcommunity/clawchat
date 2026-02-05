/**
 * ClawChat Rooms List Screen
 *
 * Shows all conversations with E2EE indicators and bot badges
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../lib/store/chat';
import { Room, getMatrixClient } from '../../lib/matrix/client';
import { getBotRegistry, BotInfo, OFFICIAL_BOTS } from '../../lib/bots/registry';
import config from '../../lib/config';

export default function RoomsScreen() {
  const { rooms, isLoading, initialize, startBotChat, refresh, checkE2EEStatus, e2eeEnabled } = useChatStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [botMap, setBotMap] = useState<Map<string, BotInfo>>(new Map());

  useEffect(() => {
    initialize();
    checkE2EEStatus();
    loadBotInfo();
  }, []);

  const loadBotInfo = async () => {
    const registry = getBotRegistry();
    await registry.initialize();
    const allBots = await registry.getAllBots();

    const map = new Map<string, BotInfo>();
    allBots.forEach(bot => {
      map.set(bot.userId, bot);
    });
    setBotMap(map);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refresh();
    await loadBotInfo();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refresh]);

  const handleStartBotChat = async () => {
    try {
      const roomId = await startBotChat(config.botUserId, true);
      router.push(`/(chat)/${encodeURIComponent(roomId)}`);
    } catch (e) {
      console.error('Failed to start bot chat:', e);
    }
  };

  const handleRoomPress = (room: Room) => {
    router.push(`/(chat)/${encodeURIComponent(room.id)}`);
  };

  const handleBrowseBots = () => {
    router.push('/(chat)/bots');
  };

  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getBotForRoom = (room: Room): BotInfo | undefined => {
    // Check if any member of the room is a known bot
    // For DM rooms, the name often contains the other user
    const possibleBotIds = [
      `@${room.name.toLowerCase()}:${config.matrixHomeserver.replace('https://', '').replace('http://', '')}`,
      config.botUserId,
    ];

    for (const botId of possibleBotIds) {
      const bot = botMap.get(botId);
      if (bot) return bot;
    }

    // Check official bots by name match
    const nameLower = room.name.toLowerCase();
    return OFFICIAL_BOTS.find(b =>
      b.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(b.name.toLowerCase().split(' ')[0])
    );
  };

  const renderRoom = ({ item }: { item: Room }) => {
    const bot = item.isDirect ? getBotForRoom(item) : undefined;
    const isBot = !!bot;

    return (
      <TouchableOpacity style={styles.roomItem} onPress={() => handleRoomPress(item)}>
        <View style={[
          styles.avatar,
          isBot && styles.avatarBot,
          bot?.provider === 'official' && styles.avatarOfficial,
        ]}>
          {isBot ? (
            <Ionicons
              name={bot.category === 'image-generation' ? 'image' : 'chatbubble-ellipses'}
              size={24}
              color="#fff"
            />
          ) : (
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.roomInfo}>
          <View style={styles.roomHeader}>
            <View style={styles.roomNameRow}>
              <Text style={styles.roomName} numberOfLines={1}>
                {bot?.name || item.name}
              </Text>
              {item.encrypted && (
                <Ionicons name="lock-closed" size={12} color="#34C759" style={styles.lockIcon} />
              )}
              {bot?.verified && (
                <Ionicons name="checkmark-circle" size={14} color="#007AFF" style={styles.verifiedIcon} />
              )}
            </View>
            {item.lastMessage && (
              <Text style={styles.timestamp}>
                {formatTimestamp(item.lastMessage.timestamp)}
              </Text>
            )}
          </View>
          <View style={styles.roomMeta}>
            {bot && (
              <Text style={styles.botLabel}>
                {bot.provider === 'official' ? 'exe AI' :
                 bot.provider === 'private' ? 'Private' : 'Bot'}
              </Text>
            )}
            {item.lastMessage && (
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage.body}
              </Text>
            )}
          </View>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* E2EE Status Banner */}
      {e2eeEnabled && (
        <View style={styles.e2eeBanner}>
          <Ionicons name="shield-checkmark" size={16} color="#34C759" />
          <Text style={styles.e2eeBannerText}>End-to-end encryption enabled</Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.newChatButton} onPress={handleStartBotChat}>
          <View style={styles.newChatIconContainer}>
            <Ionicons name="sparkles" size={24} color="#fff" />
          </View>
          <View style={styles.newChatContent}>
            <Text style={styles.newChatText}>Chat with Claude</Text>
            <Text style={styles.newChatSubtext}>exe AI Assistant</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.browseBotsButton} onPress={handleBrowseBots}>
          <View style={styles.browseBotsIcon}>
            <Ionicons name="apps" size={20} color="#007AFF" />
          </View>
          <Text style={styles.browseBotsText}>Browse Bots</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Conversations Header */}
      {rooms.length > 0 && (
        <Text style={styles.sectionTitle}>Conversations</Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No conversations yet</Text>
      <Text style={styles.emptySubtext}>
        Start chatting with Claude or browse other AI bots
      </Text>
    </View>
  );

  if (isLoading && rooms.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          rooms.length === 0 && styles.listContentEmpty,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    paddingBottom: 8,
  },
  e2eeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#e8f8eb',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  e2eeBannerText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
  },
  quickActions: {
    padding: 16,
    gap: 12,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    gap: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newChatIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatContent: {
    flex: 1,
  },
  newChatText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  newChatSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  browseBotsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    gap: 12,
  },
  browseBotsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  browseBotsText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBot: {
    backgroundColor: '#007AFF',
  },
  avatarOfficial: {
    backgroundColor: '#5856D6',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  roomInfo: {
    flex: 1,
    gap: 4,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  lockIcon: {
    marginLeft: 4,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botLabel: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 78,
  },
});
