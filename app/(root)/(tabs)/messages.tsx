import AgentSelectorModal from '@/components/AgentSelectorModal';
import icons from '@/constants/icons';
import { useAgents } from '@/lib/agents-provider';
import { client, config, ConversationDocument, createOrGetConversation, deleteConversation, getAgentById, getUserConversations, markConversationAsRead, searchAgentsByName } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ChatListScreen = () => {
  const { user } = useGlobalContext();

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Image source={icons.chat} style={{ width: 80, height: 80, marginBottom: 24 }} tintColor="#CCCCCC" />
          <Text style={styles.loginTitle}>Login Required</Text>
          <Text style={styles.loginMessage}>
            You need to sign in to view and send messages
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/sign-in')}
            style={styles.loginButton}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { getAgent, setAgent } = useAgents();
  const [conversations, setConversations] = useState<ConversationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [agentData, setAgentData] = useState<Record<string, any>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    subscribeToConversationsRealtime();
    
    return () => {
      // Cleanup subscription
    };
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const userConversations = await getUserConversations();
      console.log('📱 Loaded conversations:', userConversations.length);
      setConversations(userConversations);
      
      // Load agent data for each conversation
      await loadAgentData(userConversations);
      
      // Load unread message count
      let totalUnread = 0;
      userConversations.forEach(conv => {
        if (!conv.isRead && conv.lastMessageSender !== user?.$id) {
          totalUnread++;
        }
      });
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentData = async (conversations: ConversationDocument[]) => {
    const agentIds = conversations.map(conv => 
      conv.participantIds.find(id => id !== user?.$id)
    ).filter(Boolean);

    const uniqueAgentIds = [...new Set(agentIds)];
    const agentDataMap: Record<string, any> = {};

    for (const agentId of uniqueAgentIds) {
      try {
        // Vérifier d'abord le cache
        let agent = agentId ? getAgent(agentId) : null;
        
        if (!agent && agentId) {
          // Charger depuis la base de données si pas en cache
          agent = await getAgentById(agentId);
          if (agent) {
            setAgent(agentId, agent); // Sauvegarder dans le cache
          }
        }
        
        if (agent && agentId) {
          agentDataMap[agentId] = agent;
        }
      } catch (error) {
        console.error('Error loading agent data:', error);
      }
    }

    setAgentData(agentDataMap);
  };

  const subscribeToConversationsRealtime = () => {
    try {
      const subscription = client.subscribe(
        `databases.${config.databaseId}.collections.${config.conversationsCollectionId}.documents`,
        (response: any) => {
          try {
            // Only process if we have valid events
            if (!response.events || !response.events[0]) return;
            
            const payload = response.payload as ConversationDocument;
            
            // Check if current user is a participant
            if (!payload.participantIds.includes(user?.$id || '')) {
              return;
            }
            
            if (response.events[0]?.includes('.create')) {
              setConversations(prev => {
                const exists = prev.some(conv => conv.$id === payload.$id);
                if (exists) return prev;
                
                return [payload, ...prev].sort((a, b) => 
                  new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
                );
              });
            } else if (response.events[0]?.includes('.update')) {
              setConversations(prev => 
                prev.map(conv => 
                  conv.$id === payload.$id ? payload : conv
                ).sort((a, b) => 
                  new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
                )
              );
            }
          } catch (error) {
            // Silently handle errors
          }
        }
      );
      
      return subscription;
    } catch (error) {
      // Silently handle subscription errors
      return null;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleNewChat = () => {
    setShowAgentSelector(true);
  };

  const handleDeleteConversation = (conversation: ConversationDocument) => {
    Alert.alert(
      'Supprimer la conversation',
      'Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const result = await deleteConversation(conversation.$id);
              if (result.success) {
                // Remove from local state
                setConversations(prev => prev.filter(conv => conv.$id !== conversation.$id));
                Alert.alert('Succès', 'Conversation supprimée');
              } else {
                Alert.alert('Erreur', 'Impossible de supprimer la conversation');
              }
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        },
      ]
    );
  };

  const getOtherParticipantId = (conversation: ConversationDocument) => {
    return conversation.participantIds.find(id => id !== user?.$id);
  };

  const searchAgents = async (query: string) => {
    if (query.trim().length > 1) {
      try {
        const agents = await searchAgentsByName(query);
        setSearchSuggestions(agents);
        setShowSuggestions(agents.length > 0);
      } catch (error) {
        console.error('Erreur recherche agents:', error);
      }
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchAgents(text);
  };

  const handleAgentSelect = async (agent: any) => {
    try {
      setShowSuggestions(false);
      setSearchQuery('');
      
      if (!user?.$id) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      const result = await createOrGetConversation(user.$id, agent.$id);
      
      if (result.success && result.conversation) {
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: result.conversation.$id,
            otherUserId: agent.$id
          }
        });
      } else {
        Alert.alert('Erreur', 'Impossible de créer la conversation');
      }
    } catch (error) {
      console.error('Erreur lors de la sélection agent:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const getFilteredConversations = () => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    
    return conversations.filter(conv => {
      const otherParticipantId = getOtherParticipantId(conv);
      const agent = agentData[otherParticipantId || ''];
      const agentName = agent?.name || 'Agent';
      
      // Recherche dans le nom de l'agent, email, téléphone, agence
      const searchableFields = [
        agentName,
        agent?.email || '',
        agent?.phone || '',
        agent?.agency || '',
        conv.lastMessage
      ].join(' ').toLowerCase();
      
      return searchableFields.includes(query);
    });
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const getUnreadCount = (conversation: ConversationDocument) => {
    // Simplified: show as unread if last sender is not current user and not read
    return (!conversation.isRead && conversation.lastMessageSender !== user?.$id) ? 1 : 0;
  };

  const renderConversationItem = ({ item }: { item: ConversationDocument }) => {
    const otherParticipantId = getOtherParticipantId(item);
    const unreadCount = getUnreadCount(item);
    const agent = agentData[otherParticipantId || ''];

    const handleConversationPress = async () => {
      // Marquer comme lu avant d'ouvrir
      if (unreadCount > 0) {
        await markConversationAsRead(item.$id);
        // Recharger les conversations pour mettre à jour l'état
        loadConversations();
      }
      
      router.push({
        pathname: '/chat/[id]',
        params: { 
          id: item.$id,
          otherUserId: otherParticipantId,
          propertyId: item.propertyId 
        }
      });
    };

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={handleConversationPress}
        onLongPress={() => handleDeleteConversation(item)}
      >
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => handleViewAgentProfile(agent)}
        >
          <Image
            source={{ 
              uri: agent?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent?.name || 'Agent')}&size=200&background=007AFF&color=fff`
            }}
            style={styles.avatar}
          />
          {agent?.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </TouchableOpacity>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <TouchableOpacity onPress={() => handleViewAgentProfile(agent)}>
              <Text style={styles.participantName}>
                {agent?.name || 'Agent'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.lastMessageTime}>
              {formatLastMessageTime(item.lastMessageAt)}
            </Text>
          </View>

          <View style={styles.conversationBody}>
            <Text 
              style={[
                styles.lastMessage,
                unreadCount > 0 && styles.unreadMessage
              ]}
              numberOfLines={2}
            >
              {item.lastMessage || 'Nouvelle conversation'}
            </Text>
            
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>

          {item.propertyId && (
            <View style={styles.propertyTag}>
              <Ionicons name="home" size={12} color="#007AFF" />
              <Text style={styles.propertyTagText}>Propriété</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleViewAgentProfile = (agent: any) => {
    if (agent) {
      const profileInfo = [
        `📧 Email: ${agent.email || 'Non renseigné'}`,
        `📞 Téléphone: ${agent.phone || 'Non renseigné'}`,
        `🏢 Agence: ${agent.agency || 'Indépendant'}`,
        `⭐ Note: ${agent.rating ? agent.rating + '/5' : 'Pas encore noté'}`,
        `📍 Localisation: ${agent.location || 'Non renseignée'}`,
        agent.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'
      ].join('\n\n');

      Alert.alert(
        `👨‍💼 ${agent.name}`,
        profileInfo,
        [
          { text: 'Fermer', style: 'cancel' },
          { 
            text: '👁️ Voir Profil Complet', 
            onPress: () => {
              // Navigation vers le profil complet de l'agent
              router.push({
                pathname: '/agent-profile/[id]',
                params: { id: agent.$id }
              });
            } 
          },
          {
            text: '📞 Appeler',
            onPress: () => {
              if (agent.phone) {
                // TODO: Implémenter appel téléphonique
                Alert.alert('Appel', `Appeler ${agent.phone} ?`);
              }
            }
          }
        ]
      );
    }
  };

  const renderEmptyState = () => {
    const isSearching = searchQuery.trim().length > 0;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={isSearching ? "search-outline" : "chatbubbles-outline"} 
          size={64} 
          color="#ccc" 
        />
        <Text style={styles.emptyTitle}>
          {isSearching ? "Aucun résultat" : "Aucune conversation"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isSearching 
            ? "Aucune conversation ne correspond à votre recherche" 
            : "Vos conversations avec les agents apparaîtront ici"
          }
        </Text>
      </View>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher agents ou conversations..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          onFocus={() => searchAgents(searchQuery)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions d'agents */}
      {showSuggestions && searchSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Agents disponibles :</Text>
          {searchSuggestions.slice(0, 5).map((agent) => (
            <TouchableOpacity
              key={agent.$id}
              style={styles.suggestionItem}
              onPress={() => handleAgentSelect(agent)}
            >
              <Image
                source={{
                  uri: agent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=100&background=0061FF&color=fff`
                }}
                style={styles.suggestionAvatar}
              />
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionName}>{agent.name}</Text>
                <Text style={styles.suggestionDetails}>
                  {agent.agency || 'Indépendant'} • {agent.location || 'Localisation non renseignée'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={getFilteredConversations()}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={getFilteredConversations().length === 0 ? styles.emptyListContainer : undefined}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <AgentSelectorModal
        visible={showAgentSelector}
        onClose={() => setShowAgentSelector(false)}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#888',
  },
  conversationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: '500',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 16,
    marginBottom: 8,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  suggestionDetails: {
    fontSize: 14,
    color: '#666',
  },
  propertyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  propertyTagText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
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
    fontSize: 20,
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
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  loginMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#0061FF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 9999,
    width: '100%',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ChatListScreen;