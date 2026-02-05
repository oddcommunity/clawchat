/**
 * Device Verification Screen - Verify E2EE identity
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMatrixClient, DeviceInfo } from '../../lib/matrix/client';

export default function VerifyScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [myFingerprint, setMyFingerprint] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, [userId]);

  const loadDevices = async () => {
    try {
      const client = getMatrixClient();

      // Get my fingerprint
      const fingerprint = await client.getDeviceFingerprint();
      setMyFingerprint(fingerprint);

      // Get target user's devices
      if (userId) {
        const userDevices = await client.getUserDevices(userId);
        setDevices(userDevices);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDevice = async (deviceId: string) => {
    if (!userId) return;

    setVerifying(deviceId);
    try {
      const client = getMatrixClient();
      await client.verifyDevice(userId, deviceId);

      // Refresh devices
      const userDevices = await client.getUserDevices(userId);
      setDevices(userDevices);
    } catch (error) {
      console.error('Failed to verify device:', error);
    } finally {
      setVerifying(null);
    }
  };

  const formatFingerprint = (fp: string): string => {
    // Format as groups of 4 characters
    const groups: string[] = [];
    for (let i = 0; i < fp.length && i < 32; i += 4) {
      groups.push(fp.slice(i, i + 4));
    }
    return groups.join(' ');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading encryption info...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Verify Encryption',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container}>
        {/* Explanation */}
        <View style={styles.infoSection}>
          <View style={styles.lockIcon}>
            <Ionicons name="shield-checkmark" size={48} color="#34C759" />
          </View>
          <Text style={styles.infoTitle}>End-to-End Encryption</Text>
          <Text style={styles.infoText}>
            Messages are encrypted and can only be read by you and the recipient.
            Verify devices to ensure you're communicating with the right person or bot.
          </Text>
        </View>

        {/* My Fingerprint */}
        {myFingerprint && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Device Fingerprint</Text>
            <View style={styles.fingerprintCard}>
              <Text style={styles.fingerprintText}>
                {formatFingerprint(myFingerprint)}
              </Text>
              <Text style={styles.fingerprintHint}>
                Share this with others to let them verify your identity
              </Text>
            </View>
          </View>
        )}

        {/* User's Devices */}
        {userId && devices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {userId.split(':')[0].replace('@', '')}'s Devices
            </Text>
            <View style={styles.devicesCard}>
              {devices.map((device, index) => (
                <View key={device.deviceId}>
                  {index > 0 && <View style={styles.separator} />}
                  <View style={styles.deviceRow}>
                    <View style={styles.deviceInfo}>
                      <View style={styles.deviceHeader}>
                        <Ionicons
                          name={device.verified ? 'shield-checkmark' : 'phone-portrait-outline'}
                          size={20}
                          color={device.verified ? '#34C759' : '#666'}
                        />
                        <Text style={styles.deviceName}>{device.displayName}</Text>
                      </View>
                      <Text style={styles.deviceId}>{device.deviceId}</Text>
                    </View>
                    {device.verified ? (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark" size={16} color="#34C759" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.verifyButton}
                        onPress={() => handleVerifyDevice(device.deviceId)}
                        disabled={verifying === device.deviceId}
                      >
                        {verifying === device.deviceId ? (
                          <ActivityIndicator size="small" color="#007AFF" />
                        ) : (
                          <Text style={styles.verifyButtonText}>Verify</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No Devices */}
        {userId && devices.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="phone-portrait-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No devices found</Text>
            <Text style={styles.emptySubtitle}>
              This user hasn't set up encryption yet
            </Text>
          </View>
        )}

        {/* How Verification Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Verification Works</Text>
          <View style={styles.howItWorksCard}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Compare fingerprints with the other person through a separate,
                trusted channel (in person, phone call, etc.)
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                If the fingerprints match, tap "Verify" to mark the device as trusted
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Verified devices show a green shield icon, indicating the encryption
                is secure
              </Text>
            </View>
          </View>
        </View>

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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  infoSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  lockIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f8eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
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
  fingerprintCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  fingerprintText: {
    fontFamily: 'monospace',
    fontSize: 18,
    color: '#34C759',
    letterSpacing: 2,
    marginBottom: 12,
  },
  fingerprintHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  devicesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deviceId: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 28,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e8f8eb',
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  verifyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
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
    textAlign: 'center',
  },
  howItWorksCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  footer: {
    height: 48,
  },
});
