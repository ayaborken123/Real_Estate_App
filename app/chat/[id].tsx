import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChatInput from '@/components/ChatInput';
import MessageBubble from '@/components/MessageBubble';
import { useAgents } from '@/lib/agents-provider';
import { MessageDocument, client, config, getAgentById, getConversationMessages } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';

const ChatScreen = () => {
  const { user } = useGlobalContext();

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const router = useRouter();
  const { getAgent, setAgent } = useAgents();
  const params = useLocalSearchParams();
  const flatListRef = useRef<FlatList>(null);
  
  const conversationId = params.id as string;
  const otherUserId = params.otherUserId as string;
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [agentData, setAgentData] = useState<any>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  // Load messages on mount
  useEffect(() => {
    if (conversationId) {
      loadMessages();
      loadAgentData();
      const sub = subscribeToRealtime();
      setSubscription(sub);
    }

    return () => {
      if (subscription) {
        subscription();
        setSubscription(null);
      }
    };
  }, [conversationId]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const conversationMessages = await getConversationMessages(conversationId);
      console.log('Loaded messages:', conversationMessages.length);
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Erreur', 'Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  };

  const loadAgentData = async () => {
    try {
      setAgentLoading(true);
      if (otherUserId) {
        // Vérifier d'abord le cache
        const cachedAgent = getAgent(otherUserId);
        if (cachedAgent) {
          setAgentData(cachedAgent);
          console.log('📦 Using cached agent data:', cachedAgent.name);
          setAgentLoading(false);
          return;
        }
        
        // Sinon charger depuis la base de données
        const agent = await getAgentById(otherUserId);
        if (agent) {
          setAgentData(agent);
          setAgent(otherUserId, agent); // Sauvegarder dans le cache
          console.log('👨‍💼 Loaded agent data:', agent?.name);
        }
      }
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setAgentLoading(false);
    }
  };

  const subscribeToRealtime = () => {
    try {
      const subscription = client.subscribe(
        `databases.${config.databaseId}.collections.${config.messagesCollectionId}.documents`,
        (response: any) => {
          try {
            // Only log important events, not connection status
            if (response.events && response.events[0]) {
              const payload = response.payload as MessageDocument;
              
              // Only handle messages for the current conversation
              if (payload.conversationId !== conversationId) {
                return;
              }
              
              // Handle different event types
              if (response.events[0]?.includes('.create')) {
                setMessages(prev => {
                  // Check if message already exists to avoid duplicates
                  const exists = prev.some(msg => msg.$id === payload.$id);
                  if (exists) return prev;
                  
                  // Remove any temporary message with similar content
                  const filteredMessages = prev.filter(msg => 
                    !(msg.$id.startsWith('temp_') && msg.content === payload.content && msg.senderId === payload.senderId)
                  );
                  
                  const newMessages = [...filteredMessages, payload].sort((a, b) => 
                    new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
                  );
                  
                  // Auto-scroll to bottom for new messages
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                  
                  return newMessages;
                });
              } else if (response.events[0]?.includes('.update')) {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.$id === payload.$id ? payload : msg
                  )
                );
              }
            }
          } catch (error) {
            // Silently handle errors to avoid console spam
          }
        }
      );
      
      return subscription;
    } catch (error) {
      // Silently handle subscription errors
      return null;
    }
  };



  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  const handleAgentProfilePress = () => {
    if (otherUserId && agentData) {
      router.push({
        pathname: '/agent-profile/[id]',
        params: { id: otherUserId }
      });
    }
  };

  const handleCallAgent = () => {
    if (agentData?.phone && agentData.phone.trim()) {
      Alert.alert(
        'Appeler',
        `Souhaitez-vous appeler ${agentData.name || 'cet agent'} au ${agentData.phone} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Appeler', onPress: () => console.log('Appel...') }
        ]
      );
    } else {
      Alert.alert('Information', 'Numéro de téléphone non disponible');
    }
  };

  const handleLongPressMessage = (message: MessageDocument) => {
    if (message.senderId === user?.$id) {
      Alert.alert(
        'Options du message',
        'Que souhaitez-vous faire ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: () => handleDeleteMessage(message) },
        ]
      );
    }
  };

  const handleDeleteMessage = (message: MessageDocument) => {
    // TODO: Implement message deletion
    Alert.alert('Info', 'Fonctionnalité de suppression à implémenter');
  };

  const handleTyping = (isTyping: boolean) => {
    // TODO: Implement typing indicator
    console.log('Typing:', isTyping);
  };

  const handleMessageSent = async () => {
    // La subscription temps réel devrait déjà avoir ajouté le message
    // Mais on force un scroll vers le bas au cas où
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Optionnel : recharger si le message n'apparaît pas via subscription
    setTimeout(async () => {
      await loadMessages();
    }, 1000);
  };

  const addMessageOptimistically = (messageText: string) => {
    // Ajouter le message immédiatement à l'UI (optimistic update)
    const tempMessage: MessageDocument = {
      $id: 'temp_' + Date.now(),
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      conversationId: conversationId,
      senderId: user?.$id || '',
      receiverId: otherUserId,
      content: messageText,
      messageType: 'text',
      isRead: false,
      isDelivered: false,
      isEdited: false,

    };
    
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const renderMessage = ({ item }: { item: MessageDocument }) => (
    <MessageBubble
      message={item}
      onImagePress={handleImagePress}
      onLongPress={handleLongPressMessage}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.headerContent}
        onPress={handleAgentProfilePress}
      >
        <Image
          source={{
            uri: agentData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentData?.name || 'Agent')}&size=200&background=007AFF&color=fff`
          }}
          style={styles.headerAvatar}
        />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{agentData?.name || 'Agent'}</Text>
          <Text style={styles.headerSubtitle}>
            {agentLoading ? 'Chargement...' : (agentData?.isOnline ? 'En ligne' : 'Hors ligne')}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.headerActionButton}
          onPress={handleCallAgent}
        >
          <Ionicons name="call" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerActionButton}
          onPress={handleAgentProfilePress}
        >
          <Ionicons name="person" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>Nouvelle conversation</Text>
      <Text style={styles.emptySubtitle}>
        Envoyez votre premier message pour commencer la conversation
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={messages.length === 0 ? styles.emptyListContainer : styles.messagesList}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <ChatInput
          conversationId={conversationId}
          receiverId={otherUserId}
          onMessageSent={handleMessageSent}
          onMessageStart={addMessageOptimistically}
          onTyping={handleTyping}
        />
      </KeyboardAvoidingView>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalOverlay}
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <TouchableOpacity style={styles.imageModalCloseButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: '90%',
    height: '70%',
  },
});

export default ChatScreen;