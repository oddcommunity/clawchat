import { View, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ChatLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'ClawChat',
          headerLargeTitle: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/(chat)/bots')}
              style={{ marginLeft: 8 }}
            >
              <Ionicons name="apps-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 16, marginRight: 8 }}>
              <TouchableOpacity onPress={() => router.push('/(chat)/search')}>
                <Ionicons name="search-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(chat)/settings')}>
                <Ionicons name="settings-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="[roomId]"
        options={{
          title: 'Chat',
        }}
      />
      <Stack.Screen
        name="search"
        options={{
          title: 'Search',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="bots"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="verify"
        options={{
          title: 'Verify Encryption',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
