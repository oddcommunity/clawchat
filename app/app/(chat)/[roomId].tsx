/**
 * ClawChat Room Screen
 *
 * Individual chat room with E2EE indicators and bot info
 */

import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import {
  GiftedChat,
  IMessage,
  Bubble,
  InputToolbar,
  Actions,
  Composer,
  Send,
  Time,
} from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useChatStore, selectCurrentMessages, selectCurrentRoom } from '../../lib/store/chat';
import { useAuthStore } from '../../lib/store/auth';
import { Message, getMatrixClient } from '../../lib/matrix/client';
import { getBotRegistry, BotInfo } from '../../lib/bots/registry';

export default function RoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const decodedRoomId = decodeURIComponent(roomId || '');

  const { setCurrentRoom, sendMessage, sendImage, isSending } = useChatStore();
  const messages = useChatStore(selectCurrentMessages);
  const currentRoom = useChatStore(selectCurrentRoom);
  const session = useAuthStore((state) => state.session);

  const [giftedMessages, setGiftedMessages] = useState<IMessage[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);

  useEffect(() => {
    if (decodedRoomId) {
      setCurrentRoom(decodedRoomId);
      checkEncryption();
      detectBot();
    }
  }, [decodedRoomId]);

  const checkEncryption = async () => {
    const client = getMatrixClient();
    const encrypted = client.isRoomEncrypted(decodedRoomId);
    setIsEncrypted(encrypted);
  };

  const detectBot = async () => {
    // Try to find bot info from room members
    const registry = getBotRegistry();
    await registry.initialize();

    // Check if any room member is a known bot
    if (currentRoom?.name) {
      const bot = await registry.getBotByUserId(`@${currentRoom.name.toLowerCase()}:clawchat.io`);
      if (bot) {
        setBotInfo(bot);
      }
    }
  };

  // Convert Matrix messages to GiftedChat format
  useEffect(() => {
    const converted = messages
      .map((msg) => matrixToGiftedMessage(msg, session?.userId || ''))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    setGiftedMessages(converted);
  }, [messages, session?.userId]);

  const handleSend = useCallback(
    (newMessages: IMessage[] = []) => {
      const text = newMessages[0]?.text;
      if (text) {
        sendMessage(text);
      }
    },
    [sendMessage]
  );

  const handlePickImage = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = asset.fileName || `image_${Date.now()}.jpg`;
      await sendImage(asset.uri, filename);
    }
  }, [sendImage]);

  const handleTakePhoto = useCallback(async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = `photo_${Date.now()}.jpg`;
      await sendImage(asset.uri, filename);
    }
  }, [sendImage]);

  const handlePressActionButton = useCallback(() => {
    Alert.alert(
      'Send Media',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handlePickImage, handleTakePhoto]);

  const handleVerifyPress = () => {
    // Get the other user in the room for verification
    const otherUser = messages.find(m => m.sender !== session?.userId)?.sender;
    if (otherUser) {
      router.push(`/(chat)/verify?userId=${encodeURIComponent(otherUser)}`);
    } else {
      router.push('/(chat)/verify');
    }
  };

  const renderHeaderRight = () => (
    <View style={styles.headerRight}>
      {isEncrypted && (
        <TouchableOpacity onPress={handleVerifyPress} style={styles.headerButton}>
          <Ionicons name="lock-closed" size={20} color="#34C759" />
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="ellipsis-horizontal" size={22} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  const renderHeaderTitle = () => (
    <View style={styles.headerTitle}>
      <Text style={styles.headerTitleText} numberOfLines={1}>
        {currentRoom?.name || 'Chat'}
      </Text>
      {isEncrypted && (
        <View style={styles.encryptedBadge}>
          <Ionicons name="lock-closed" size={10} color="#34C759" />
          <Text style={styles.encryptedText}>Encrypted</Text>
        </View>
      )}
    </View>
  );

  const renderBubble = (props: any) => {
    const message = props.currentMessage;
    const isEncryptedMsg = message?.encrypted;

    return (
      <View>
        <Bubble
          {...props}
          wrapperStyle={{
            right: {
              backgroundColor: '#007AFF',
            },
            left: {
              backgroundColor: '#f0f0f0',
            },
          }}
          textStyle={{
            right: {
              color: '#fff',
            },
            left: {
              color: '#1a1a1a',
            },
          }}
        />
        {isEncryptedMsg && (
          <View style={[
            styles.encryptionIndicator,
            props.position === 'right' ? styles.encryptionRight : styles.encryptionLeft
          ]}>
            <Ionicons name="lock-closed" size={10} color="#34C759" />
          </View>
        )}
      </View>
    );
  };

  const renderTime = (props: any) => (
    <Time
      {...props}
      timeTextStyle={{
        right: {
          color: 'rgba(255,255,255,0.7)',
          fontSize: 11,
        },
        left: {
          color: '#999',
          fontSize: 11,
        },
      }}
    />
  );

  const renderInputToolbar = (props: any) => (
    <InputToolbar
      {...props}
      containerStyle={styles.inputToolbar}
      primaryStyle={styles.inputPrimary}
    />
  );

  const renderActions = (props: any) => (
    <Actions
      {...props}
      containerStyle={styles.actionsContainer}
      icon={() => (
        <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
      )}
      onPressActionButton={handlePressActionButton}
    />
  );

  const renderComposer = (props: any) => (
    <View style={styles.composerContainer}>
      {isEncrypted && (
        <View style={styles.composerLock}>
          <Ionicons name="lock-closed" size={12} color="#34C759" />
        </View>
      )}
      <Composer
        {...props}
        textInputStyle={[
          styles.composer,
          isEncrypted && styles.composerEncrypted
        ]}
        placeholder={isEncrypted ? "Encrypted message..." : "Message..."}
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderSend = (props: any) => (
    <Send {...props} containerStyle={styles.sendContainer}>
      <View style={styles.sendButton}>
        <Ionicons
          name="send"
          size={20}
          color={props.text?.trim() ? '#007AFF' : '#ccc'}
        />
      </View>
    </Send>
  );

  const renderFooter = () => {
    if (!isEncrypted) return null;

    return (
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark" size={14} color="#34C759" />
        <Text style={styles.footerText}>
          Messages are end-to-end encrypted
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: renderHeaderTitle,
          headerRight: renderHeaderRight,
          headerBackTitle: 'Back',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <GiftedChat
          messages={giftedMessages}
          onSend={handleSend}
          user={{
            _id: session?.userId || 'unknown',
            name: session?.userId?.split(':')[0]?.replace('@', '') || 'You',
          }}
          renderBubble={renderBubble}
          renderTime={renderTime}
          renderInputToolbar={renderInputToolbar}
          renderActions={renderActions}
          renderComposer={renderComposer}
          renderSend={renderSend}
          renderFooter={renderFooter}
          alwaysShowSend
          isTyping={isSending}
          scrollToBottom
          scrollToBottomComponent={() => (
            <View style={styles.scrollToBottom}>
              <Ionicons name="chevron-down" size={20} color="#007AFF" />
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </>
  );
}

// =============================================================================
// Helpers
// =============================================================================

interface ExtendedMessage extends IMessage {
  encrypted?: boolean;
  verified?: boolean;
}

function matrixToGiftedMessage(msg: Message, currentUserId: string): ExtendedMessage {
  const baseMessage: ExtendedMessage = {
    _id: msg.id,
    text: msg.body,
    createdAt: new Date(msg.timestamp),
    user: {
      _id: msg.sender,
      name: msg.senderName,
      avatar: msg.sender === currentUserId ? undefined : generateAvatarUrl(msg.sender),
    },
    encrypted: msg.encrypted,
    verified: msg.verified,
  };

  // Handle image messages
  if (msg.type === 'image') {
    return {
      ...baseMessage,
      image: msg.body,
      text: '',
    };
  }

  return baseMessage;
}

function generateAvatarUrl(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const color = colors[hash % colors.length].replace('#', '');
  const initial = userId.replace('@', '').charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${initial}&background=${color}&color=fff&size=128`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  encryptedText: {
    fontSize: 10,
    color: '#34C759',
    fontWeight: '500',
  },
  encryptionIndicator: {
    position: 'absolute',
    bottom: 2,
  },
  encryptionRight: {
    right: 8,
  },
  encryptionLeft: {
    left: 8,
  },
  inputToolbar: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    paddingVertical: 4,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  actionsContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 0,
  },
  composerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  composerLock: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  composer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 8,
    fontSize: 16,
    lineHeight: 20,
  },
  composerEncrypted: {
    paddingLeft: 28,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollToBottom: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#34C759',
  },
});
