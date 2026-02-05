/**
 * ClawChat Room Screen
 *
 * Individual chat room with the AI bot
 */

import { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  GiftedChat,
  IMessage,
  Bubble,
  InputToolbar,
  Actions,
  Composer,
  Send,
} from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useChatStore, selectCurrentMessages, selectCurrentRoom } from '../../lib/store/chat';
import { useAuthStore } from '../../lib/store/auth';
import { Message } from '../../lib/matrix/client';

export default function RoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const decodedRoomId = decodeURIComponent(roomId || '');

  const { setCurrentRoom, sendMessage, sendImage, isSending } = useChatStore();
  const messages = useChatStore(selectCurrentMessages);
  const currentRoom = useChatStore(selectCurrentRoom);
  const session = useAuthStore((state) => state.session);

  const [giftedMessages, setGiftedMessages] = useState<IMessage[]>([]);

  useEffect(() => {
    if (decodedRoomId) {
      setCurrentRoom(decodedRoomId);
    }
  }, [decodedRoomId]);

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

  const renderBubble = (props: any) => (
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
    <Composer
      {...props}
      textInputStyle={styles.composer}
      placeholder="Message..."
      placeholderTextColor="#999"
    />
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

  return (
    <>
      <Stack.Screen
        options={{
          title: currentRoom?.name || 'Chat',
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
          renderInputToolbar={renderInputToolbar}
          renderActions={renderActions}
          renderComposer={renderComposer}
          renderSend={renderSend}
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

function matrixToGiftedMessage(msg: Message, currentUserId: string): IMessage {
  const baseMessage: IMessage = {
    _id: msg.id,
    text: msg.body,
    createdAt: new Date(msg.timestamp),
    user: {
      _id: msg.sender,
      name: msg.senderName,
      avatar: msg.sender === currentUserId ? undefined : generateAvatarUrl(msg.sender),
    },
  };

  // Handle image messages
  if (msg.type === 'image') {
    return {
      ...baseMessage,
      image: msg.body, // For images, body contains the URL
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
  composer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 8,
    fontSize: 16,
    lineHeight: 20,
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
});
