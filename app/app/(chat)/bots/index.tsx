/**
 * Bot Directory - Browse and discover AI bots
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getBotRegistry,
  BotInfo,
  BotCategory,
  OFFICIAL_BOTS,
} from '../../../lib/bots/registry';

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

export default function BotDirectoryScreen() {
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [filteredBots, setFilteredBots] = useState<BotInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BotCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBots = useCallback(async () => {
    try {
      const registry = getBotRegistry();
      await registry.initialize();
      const allBots = await registry.getAllBots();
      setBots(allBots);
      setFilteredBots(allBots);
    } catch (error) {
      console.error('Failed to load bots:', error);
      // Fallback to official bots
      setBots(OFFICIAL_BOTS);
      setFilteredBots(OFFICIAL_BOTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  useEffect(() => {
    let filtered = bots;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        bot =>
          bot.name.toLowerCase().includes(query) ||
          bot.description.toLowerCase().includes(query) ||
          bot.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(bot => bot.category === selectedCategory);
    }

    setFilteredBots(filtered);
  }, [searchQuery, selectedCategory, bots]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBots();
    setRefreshing(false);
  };

  const renderCategoryFilter = () => {
    const categories: { key: BotCategory | null; label: string }[] = [
      { key: null, label: 'All' },
      { key: 'ai-assistant', label: 'Assistants' },
      { key: 'image-generation', label: 'Images' },
      { key: 'code-assistant', label: 'Code' },
      { key: 'writing', label: 'Writing' },
    ];

    return (
      <View style={styles.categoryContainer}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.key || 'all'}
            style={[
              styles.categoryChip,
              selectedCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.key && styles.categoryChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderBotItem = ({ item }: { item: BotInfo }) => (
    <TouchableOpacity
      style={styles.botCard}
      onPress={() => router.push(`/(chat)/bots/${item.id}`)}
    >
      <View style={styles.botAvatar}>
        <Ionicons
          name={CATEGORY_ICONS[item.category] as any}
          size={28}
          color="#fff"
        />
      </View>
      <View style={styles.botInfo}>
        <View style={styles.botHeader}>
          <Text style={styles.botName}>{item.name}</Text>
          <View style={styles.botBadges}>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
              </View>
            )}
            {item.supportsE2EE && (
              <View style={styles.e2eeBadge}>
                <Ionicons name="lock-closed" size={14} color="#34C759" />
              </View>
            )}
          </View>
        </View>
        <Text style={styles.botDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.botMeta}>
          <Text style={styles.botProvider}>
            {item.provider === 'official' ? 'exe AI' :
             item.provider === 'private' ? 'Self-hosted' : item.author}
          </Text>
          {item.userCount && (
            <Text style={styles.botUsers}>
              {item.userCount.toLocaleString()} users
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string, subtitle?: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading bots...</Text>
      </View>
    );
  }

  const officialBots = filteredBots.filter(b => b.provider === 'official');
  const communityBots = filteredBots.filter(b => b.provider !== 'official' && b.provider !== 'private');
  const privateBots = filteredBots.filter(b => b.provider === 'private');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Bot Directory',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(chat)/bots/add-private')}
              style={styles.headerButton}
            >
              <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bots..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        {renderCategoryFilter()}

        {/* Bot List */}
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <>
              {/* Official Bots */}
              {officialBots.length > 0 && (
                <>
                  {renderSectionHeader('Official', 'By exe AI')}
                  {officialBots.map(bot => (
                    <View key={bot.id}>{renderBotItem({ item: bot })}</View>
                  ))}
                </>
              )}

              {/* Community Bots */}
              {communityBots.length > 0 && (
                <>
                  {renderSectionHeader('Community', 'Third-party bots')}
                  {communityBots.map(bot => (
                    <View key={bot.id}>{renderBotItem({ item: bot })}</View>
                  ))}
                </>
              )}

              {/* Private Bots */}
              {privateBots.length > 0 && (
                <>
                  {renderSectionHeader('Your Bots', 'Self-hosted')}
                  {privateBots.map(bot => (
                    <View key={bot.id}>{renderBotItem({ item: bot })}</View>
                  ))}
                </>
              )}

              {/* Empty State */}
              {filteredBots.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search" size={48} color="#ccc" />
                  <Text style={styles.emptyTitle}>No bots found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try adjusting your search or filters
                  </Text>
                </View>
              )}
            </>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerButton: {
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  botCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
  },
  botAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botInfo: {
    flex: 1,
    marginLeft: 12,
  },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  botBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  verifiedBadge: {},
  e2eeBadge: {},
  botDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  botMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  botProvider: {
    fontSize: 12,
    color: '#999',
  },
  botUsers: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
