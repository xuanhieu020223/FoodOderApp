import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { sendMessageToOllama, ChatMessage, checkOllamaConnection } from '../services/ollamaService';
import BotAvatar from './BotAvatar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/Firebase';

const { width, height } = Dimensions.get('window');

interface AIChatboxProps {
  visible: boolean;
  onClose: () => void;
}

const AnimatedTouchable = Reanimated.createAnimatedComponent(TouchableOpacity);

const STORAGE_KEY = 'ai_chat_history';

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content:
      'Xin chào! Tôi là trợ lý AI của ứng dụng đặt đồ ăn. Tôi có thể giúp bạn tìm món ăn, nhà hàng, hoặc giải đáp thắc mắc. Bạn cần tôi giúp gì?',
  },
];

const AIChatbox: React.FC<AIChatboxProps> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [storageKey, setStorageKey] = useState(`${STORAGE_KEY}_guest`);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const headerStatusText = () => {
    if (isCheckingConnection) {
      return 'Đang kiểm tra kết nối...';
    }
    if (isOnline === false) {
      return 'Không thể kết nối AI';
    }
    if (isLoading) {
      return 'Đang suy nghĩ...';
    }
    return 'Sẵn sàng giúp đỡ';
  };

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsCheckingConnection(true);
    try {
      const alive = await checkOllamaConnection();
      setIsOnline(alive);
      if (!alive) {
        setError('Không thể kết nối tới máy chủ AI. Hãy kiểm tra lại dịch vụ hoặc mạng.');
      } else {
        setError(null);
      }
      return alive;
    } catch (connectionError: any) {
      setIsOnline(false);
      setError(connectionError?.message || 'Không thể kiểm tra kết nối AI.');
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const userId = user?.uid || 'guest';
      setStorageKey(`${STORAGE_KEY}_${userId}`);
      setMessages(DEFAULT_MESSAGES); // reset khi đổi user để tránh lộ lịch sử
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed: ChatMessage[] = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (historyError) {
        if (__DEV__) {
          console.warn('Không thể tải lịch sử chat AI:', historyError);
        }
      }
    };

    loadHistory();
  }, [storageKey]);

  useEffect(() => {
    const persistHistory = async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (saveError) {
        if (__DEV__) {
          console.warn('Không thể lưu lịch sử chat AI:', saveError);
        }
      }
    };

    if (messages.length > 0) {
      persistHistory();
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (visible) {
      checkConnection();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, checkConnection, slideAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glowAnim]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    if (isOnline === false) {
      setError('Không thể gửi vì AI đang ngoại tuyến. Thử kiểm tra kết nối.');
      const backOnline = await checkConnection();
      if (!backOnline) {
        return;
      }
    }

    if (isOnline === null && !isCheckingConnection) {
      const stillOnline = await checkConnection();
      if (!stillOnline) return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
    };

    // Thêm user message vào danh sách
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Gửi message đến Ollama với conversation history (loại bỏ welcome message nếu cần)
      // Chỉ gửi các message thực sự từ conversation, không gửi welcome message
      const conversationHistory = messages.length > 1 
        ? messages.slice(1) // Bỏ qua welcome message đầu tiên
        : [];
      
      console.log('Sending message:', inputText.trim());
      console.log('Conversation history length:', conversationHistory.length);
      
      const response = await sendMessageToOllama(inputText.trim(), conversationHistory);

      console.log('Received response:', response);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi gửi tin nhắn');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Xin lỗi, tôi không thể kết nối đến AI service. ${err.message || 'Vui lòng thử lại sau.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';

    return (
      <Reanimated.View
        entering={FadeInUp.duration(300).delay(index * 50)}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGlow} />
            <BotAvatar size={34} showStatus={false} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.assistantMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {item.content}
          </Text>
        </View>
        {isUser && (
          <View style={styles.userAvatarContainer}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={18} color="#ee4d2d" />
            </View>
            </View>
        )}
      </Reanimated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.decorContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.decorCircle,
              styles.decorCircleLarge,
              {
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.1],
                    }),
                  },
                ],
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.3],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.decorCircle,
              styles.decorCircleSmall,
              {
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.12, 0.25],
                }),
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.chatContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={['#ee4d2d', '#ff6b4a']}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerAvatarWrapper}>
                  <Animated.View
                    style={[
                      styles.headerAvatarGlow,
                      {
                        opacity: glowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }),
                        transform: [
                          {
                            scale: glowAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <BotAvatar size={48} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Trợ lý AI</Text>
                  <Text style={styles.headerSubtitle}>
                    {headerStatusText()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerBadgeRow}>
              <View style={styles.headerBadge}>
                <Ionicons name="sparkles" size={14} color="#ffeadf" />
                <Text style={styles.headerBadgeText}>AI thông minh</Text>
              </View>
              <View
                style={[
                  styles.headerBadge,
                  isOnline === false && styles.headerBadgeError,
                  isOnline && styles.headerBadgeSuccess,
                ]}
              >
                <Ionicons
                  name={isOnline === false ? 'alert-circle' : 'flash'}
                  size={14}
                  color="#ffeadf"
                />
                <Text style={styles.headerBadgeText}>
                  {isCheckingConnection
                    ? 'Đang kiểm tra'
                    : isOnline === false
                      ? 'Mất kết nối'
                      : 'Phản hồi nhanh'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Messages List */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.messagesContainer}
            keyboardVerticalOffset={0}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => `message-${index}`}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
            />
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#ee4d2d" />
                <Text style={styles.loadingText}>AI đang trả lời...</Text>
              </View>
            )}
          </KeyboardAvoidingView>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            {isOnline === false && (
              <TouchableOpacity
                style={styles.connectionBanner}
                onPress={checkConnection}
                disabled={isCheckingConnection}
              >
                <Ionicons name="warning-outline" size={16} color="#ee4d2d" />
                <Text style={styles.connectionBannerText}>
                  {isCheckingConnection
                    ? 'Đang thử kết nối lại...'
                    : 'Không thể kết nối AI. Nhấn để thử lại.'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập câu hỏi của bạn..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputText.trim() || isLoading || isOnline === false}
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isLoading || isOnline === false) && styles.sendButtonDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  decorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  decorCircle: {
    position: 'absolute',
    backgroundColor: '#ffcab8',
    opacity: 0.2,
  },
  decorCircleLarge: {
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    top: -width * 0.5,
  },
  decorCircleSmall: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    top: -width * 0.35,
    right: -width * 0.1,
    backgroundColor: '#ffd7ca',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    marginTop: 60,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatarWrapper: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  headerBadgeText: {
    color: '#ffeadf',
    fontSize: 12,
    fontWeight: '500',
  },
  headerBadgeError: {
    borderColor: 'rgba(255, 120, 120, 0.6)',
    backgroundColor: 'rgba(255, 120, 120, 0.18)',
  },
  headerBadgeSuccess: {
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(238, 77, 45, 0.15)',
  },
  userAvatarContainer: {
    marginLeft: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ee4d2d',
  },
  messageBubble: {
    maxWidth: width * 0.7,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userMessageBubble: {
    backgroundColor: '#ee4d2d',
    borderBottomRightRadius: 4,
  },
  assistantMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F7FA',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ee4d2d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFF3F0',
    borderWidth: 1,
    borderColor: '#F8C1B1',
  },
  connectionBannerText: {
    flex: 1,
    color: '#cc3d1c',
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AIChatbox;

