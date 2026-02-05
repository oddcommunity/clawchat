/**
 * Add Private Bot Screen - Configure self-hosted bot
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBotRegistry, PrivateBotConfig } from '../../../lib/bots/registry';

export default function AddPrivateBotScreen() {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [homeserver, setHomeserver] = useState('');
  const [saving, setSaving] = useState(false);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the bot');
      return false;
    }

    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter the bot\'s Matrix user ID');
      return false;
    }

    // Validate Matrix user ID format
    if (!userId.match(/^@[\w.-]+:[\w.-]+$/)) {
      Alert.alert(
        'Invalid User ID',
        'Matrix user ID should be in format @username:server.com'
      );
      return false;
    }

    if (!homeserver.trim()) {
      Alert.alert('Error', 'Please enter the homeserver URL');
      return false;
    }

    // Validate URL format
    if (!homeserver.match(/^https?:\/\/.+/)) {
      Alert.alert(
        'Invalid URL',
        'Homeserver URL should start with http:// or https://'
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const registry = getBotRegistry();
      await registry.initialize();

      const config: PrivateBotConfig = {
        name: name.trim(),
        userId: userId.trim(),
        homeserver: homeserver.trim(),
        accessToken: '', // Not stored locally for security
      };

      await registry.addPrivateBot(config);

      Alert.alert(
        'Bot Added',
        `${name} has been added to your bot list.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to add bot:', error);
      Alert.alert('Error', 'Failed to add bot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Private Bot',
          headerBackTitle: 'Cancel',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color="#007AFF" />
            <Text style={styles.infoBannerText}>
              Add your own self-hosted bot running on your infrastructure.
              Your bot must be registered on a Matrix homeserver and able to
              accept invites.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bot Information</Text>
              <View style={styles.card}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Display Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="My Private Bot"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.separator} />
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Matrix User ID</Text>
                  <TextInput
                    style={styles.input}
                    value={userId}
                    onChangeText={setUserId}
                    placeholder="@mybot:matrix.org"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                  <Text style={styles.hint}>
                    The bot's full Matrix ID including server
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connection</Text>
              <View style={styles.card}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Homeserver URL</Text>
                  <TextInput
                    style={styles.input}
                    value={homeserver}
                    onChangeText={setHomeserver}
                    placeholder="https://matrix.org"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  <Text style={styles.hint}>
                    The Matrix homeserver where your bot is registered
                  </Text>
                </View>
              </View>
            </View>

            {/* E2EE Info */}
            <View style={styles.section}>
              <View style={styles.e2eeInfo}>
                <View style={styles.e2eeHeader}>
                  <Ionicons name="lock-closed" size={20} color="#34C759" />
                  <Text style={styles.e2eeTitle}>End-to-End Encryption</Text>
                </View>
                <Text style={styles.e2eeText}>
                  Messages with your private bot will be encrypted using the Matrix
                  Olm/Megolm protocol. Your bot must support E2EE to decrypt messages.
                </Text>
              </View>
            </View>

            {/* Setup Instructions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Setup Instructions</Text>
              <View style={styles.card}>
                <View style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Run clawdbot on your server with your Anthropic API key
                  </Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Register the bot user on your Matrix homeserver
                  </Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Enter the bot's Matrix ID and homeserver above
                  </Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Start a chat - your bot will receive an invite
                  </Text>
                </View>
              </View>
            </View>

            {/* Code Example */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Start</Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>
                  {`# Run with Docker
docker run -d \\
  -e ANTHROPIC_API_KEY=sk-ant-... \\
  -e MATRIX_HOMESERVER=https://matrix.org \\
  -e MATRIX_USER=@mybot:matrix.org \\
  -e MATRIX_PASSWORD=... \\
  ghcr.io/oddcommunity/clawchat/clawdbot`}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Add Bot</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#e8f4fd',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  form: {
    paddingBottom: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 8,
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
  inputGroup: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  e2eeInfo: {
    backgroundColor: '#e8f8eb',
    padding: 16,
    borderRadius: 12,
  },
  e2eeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  e2eeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  e2eeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  codeBlock: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#34C759',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
