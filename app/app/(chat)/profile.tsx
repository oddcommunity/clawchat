/**
 * ClawChat User Profile Screen
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../lib/store/auth';

export default function ProfileScreen() {
  const session = useAuthStore((state) => state.session);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    session?.userId?.split(':')[0]?.replace('@', '') || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // TODO: Upload avatar to Matrix server
      Alert.alert('Coming Soon', 'Avatar upload will be available in a future update.');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Update display name on Matrix server
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getUserInitial = (): string => {
    return (session?.userId?.replace('@', '').charAt(0) || '?').toUpperCase();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerBackTitle: 'Settings',
          headerRight: () =>
            isEditing ? (
              <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={styles.saveButton}>Save</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            ),
        }}
      />
      <ScrollView style={styles.container}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            disabled={!isEditing}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getUserInitial()}</Text>
            </View>
            {isEditing && (
              <View style={styles.avatarOverlay}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          {isEditing && (
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter display name"
                  autoCapitalize="words"
                />
              ) : (
                <Text style={styles.fieldValue}>{displayName}</Text>
              )}
            </View>
            <View style={styles.separator} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>User ID</Text>
              <Text style={styles.fieldValueMuted}>{session?.userId || 'Unknown'}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Homeserver</Text>
              <Text style={styles.fieldValueMuted} numberOfLines={1}>
                {session?.homeserver || 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        {/* Device Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device</Text>
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Device ID</Text>
              <Text style={styles.fieldValueMuted}>{session?.deviceId || 'Unknown'}</Text>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.actionContent}>
                <Ionicons name="key-outline" size={22} color="#007AFF" />
                <Text style={styles.actionText}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.actionContent}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#007AFF" />
                <Text style={styles.actionText}>Two-Factor Authentication</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.actionContent}>
                <Ionicons name="phone-portrait-outline" size={22} color="#007AFF" />
                <Text style={styles.actionText}>Active Sessions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  editButton: {
    color: '#007AFF',
    fontSize: 17,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#fff',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
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
  field: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  fieldValueMuted: {
    fontSize: 16,
    color: '#666',
  },
  fieldInput: {
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});
