/**
 * ClawChat Search Screen
 */

import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../../lib/store/search';

export default function SearchScreen() {
  const inputRef = useRef<TextInput>(null);
  const { query, results, isSearching, hasSearched, setQuery, clearSearch } = useSearchStore();

  useEffect(() => {
    // Focus input on mount
    setTimeout(() => inputRef.current?.focus(), 100);

    // Clear search on unmount
    return () => clearSearch();
  }, []);

  const handleResultPress = (roomId: string, messageId: string) => {
    router.push(`/(chat)/${encodeURIComponent(roomId)}?highlight=${messageId}`);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderResult = ({ item }: { item: typeof results[0] }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item.roomId, item.message.id)}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.roomName}>{item.roomName}</Text>
        <Text style={styles.date}>{formatDate(item.message.timestamp)}</Text>
      </View>
      <Text style={styles.senderName}>{item.message.senderName}</Text>
      <Text style={styles.messageBody} numberOfLines={3}>
        {item.message.body}
      </Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (isSearching) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (hasSearched && results.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>Search messages</Text>
        <Text style={styles.emptySubtext}>Enter at least 2 characters to search</Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search',
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.message.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            results.length === 0 && styles.listContentEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1a1a1a',
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
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
  },
  resultItem: {
    paddingVertical: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  messageBody: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});
