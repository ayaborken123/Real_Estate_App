import { config, createOrGetConversation, databases, getAgentById, Query } from '@/lib/appwrite';

import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Agent {
  $id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  agency?: string;
  rating?: number;
  location?: string;
  isOnline?: boolean;
  bio?: string;
  experience?: string;
  specialties?: string[];
  totalSales?: number;
}

interface Property {
  $id: string;
  name: string;
  price: number;
  images: string[];
  image?: string;
  address: string;
  type: string;
  bedrooms?: number;
  bathrooms?: number;
}

export default function AgentProfile() {
  const { id } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  const loadAgentProfile = useCallback(async () => {
    try {
      if (id) {
        const agentData = await getAgentById(id as string);
        setAgent(agentData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil agent:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAgentProperties = useCallback(async () => {
    try {
      setPropertiesLoading(true);
      if (id) {
        const response = await databases.listDocuments(
          config.databaseId!,
          config.propertiesCollectionId!,
          [
            Query.equal('agent', id as string),
            Query.limit(20),
            Query.orderDesc('$createdAt')
          ]
        );
        setProperties(response.documents as unknown as Property[]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des propriétés:', error);
    } finally {
      setPropertiesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadAgentProfile();
      loadAgentProperties();
    }
  }, [id, loadAgentProfile, loadAgentProperties]);

  const handleSendMessage = async () => {
    try {
      if (!user) {
        Alert.alert(
          'Login Required',
          'Please sign in to message agents',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {} },
            { text: 'Sign In', onPress: () => router.push('/sign-in') }
          ]
        );
        return;
      }

      if (!agent) {
        Alert.alert('Erreur', 'Informations manquantes');
        return;
      }

      const result = await createOrGetConversation(agent.$id);
      
      if (result.success && result.conversation) {
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: result.conversation.$id,
            otherUserId: agent.$id,
          }
        });
      } else {
        Alert.alert('Erreur', 'Impossible de créer la conversation');
      }
    } catch (error) {
      console.error('Erreur lors de la création de conversation:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleCall = () => {
    if (agent?.phone && agent.phone.trim()) {
      Alert.alert(
        'Appeler',
        `Souhaitez-vous appeler ${agent.name || 'cet agent'} au ${agent.phone} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Appeler', onPress: () => console.log('Appel...') }
        ]
      );
    } else {
      Alert.alert('Information', 'Numéro de téléphone non disponible');
    }
  };

  const handlePropertyPress = (propertyId: string) => {
    router.push({
      pathname: '/propreties/[id]',
      params: { id: propertyId }
    });
  };

  const renderPropertyItem = ({ item }: { item: Property }) => {
    const imageUrl = item.images?.[0] || item.image || 'https://via.placeholder.com/300x200';
    
    return (
      <TouchableOpacity
        onPress={() => handlePropertyPress(item.$id)}
        className="w-40 mr-3 bg-white rounded-lg shadow-sm"
      >
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-24 rounded-t-lg"
          resizeMode="cover"
        />
        <View className="p-2">
          <Text className="font-rubik-medium text-sm text-black-300" numberOfLines={1}>
            {item.name || 'Propriété'}
          </Text>
          <Text className="font-rubik text-xs text-black-200 mt-1" numberOfLines={1}>
            {item.address || 'Adresse non renseignée'}
          </Text>
          <Text className="font-rubik-bold text-primary-300 mt-1">
            ${typeof item.price === 'number' ? item.price.toLocaleString() : (item.price || 'Prix non défini')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0061FF" />
          <Text className="mt-2 font-rubik text-black-200">Chargement du profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!agent) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text className="text-lg font-rubik text-black-200 mt-4">Agent non trouvé</Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mt-4 bg-primary-300 px-6 py-2 rounded-lg"
          >
            <Text className="text-white font-rubik-medium">Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView>
        {/* Header avec bouton retour */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-rubik-bold">Profil Agent</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Photo de profil et info de base */}
        <View className="items-center py-6 px-4">
          <View className="relative">
            <Image
              source={{
                uri: agent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&size=200&background=0061FF&color=fff`
              }}
              className="w-24 h-24 rounded-full"
            />
            {agent.isOnline && (
              <View className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full" />
            )}
          </View>
          
          <Text className="text-2xl font-rubik-bold text-black-300 mt-4">
            {agent.name || 'Agent'}
          </Text>
          
          <View className="flex-row items-center mt-2">
            <Ionicons name="business" size={16} color="#666" />
            <Text className="text-base font-rubik text-black-200 ml-2">
              {(agent.agency && agent.agency.trim()) ? agent.agency : 'Indépendant'}
            </Text>
          </View>

          {agent.rating && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text className="text-base font-rubik text-black-200 ml-1">
                {agent.rating}/5
              </Text>
            </View>
          )}

          <View className="flex-row items-center mt-2">
            <Ionicons name="location" size={16} color="#666" />
            <Text className="text-base font-rubik text-black-200 ml-2">
              {(agent.location && agent.location.trim()) ? agent.location : 'Localisation non renseignée'}
            </Text>
          </View>
        </View>

        {/* Boutons d'action */}
        <View className="flex-row mx-4 mb-6 gap-3">
          <TouchableOpacity
            onPress={handleSendMessage}
            className="flex-1 bg-primary-300 py-3 rounded-xl items-center"
          >
            <Text className="text-white font-rubik-medium text-base">💬 Envoyer un message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleCall}
            className="bg-green-500 py-3 px-6 rounded-xl items-center"
          >
            <Text className="text-white font-rubik-medium text-base">📞</Text>
          </TouchableOpacity>
        </View>

        {/* Statistiques */}
        <View className="flex-row mx-4 mb-6">
          <View className="flex-1 bg-gray-50 rounded-xl p-4 mr-2">
            <Text className="text-2xl font-rubik-bold text-primary-300 text-center">
              {properties.length}
            </Text>
            <Text className="text-sm font-rubik text-black-200 text-center mt-1">
              Propriétés
            </Text>
          </View>
          
          <View className="flex-1 bg-gray-50 rounded-xl p-4 ml-2">
            <Text className="text-2xl font-rubik-bold text-primary-300 text-center">
              {agent.totalSales || 0}
            </Text>
            <Text className="text-sm font-rubik text-black-200 text-center mt-1">
              Vendues
            </Text>
          </View>
        </View>

        {/* Informations détaillées */}
        <View className="px-4">
          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <Text className="text-lg font-rubik-bold text-black-300 mb-3">Informations de contact</Text>
            
            {agent.email && agent.email.trim() && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="mail" size={18} color="#0061FF" />
                <Text className="text-base font-rubik text-black-200 ml-3">{agent.email}</Text>
              </View>
            )}
            
            {agent.phone && agent.phone.trim() && (
              <View className="flex-row items-center mb-2">
                <Ionicons name="call" size={18} color="#0061FF" />
                <Text className="text-base font-rubik text-black-200 ml-3">{agent.phone}</Text>
              </View>
            )}
          </View>

            {agent.bio && agent.bio.trim() && (
            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <Text className="text-lg font-rubik-bold text-black-300 mb-3">À propos</Text>
              <Text className="text-base font-rubik text-black-200 leading-6">{agent.bio}</Text>
            </View>
          )}

          {agent.experience && agent.experience.trim() && (
            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <Text className="text-lg font-rubik-bold text-black-300 mb-3">Expérience</Text>
              <Text className="text-base font-rubik text-black-200">{agent.experience}</Text>
            </View>
          )}

          {agent.specialties && agent.specialties.length > 0 && (
            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <Text className="text-lg font-rubik-bold text-black-300 mb-3">Spécialités</Text>
              <View className="flex-row flex-wrap gap-2">
                {agent.specialties.map((specialty, index) => (
                  <View key={index} className="bg-primary-100 px-3 py-1 rounded-full">
                    <Text className="text-primary-300 font-rubik text-sm">{specialty}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Propriétés de l'agent */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-rubik-bold text-black-300">
                Ses propriétés ({properties.length})
              </Text>
              {properties.length > 0 && (
                <TouchableOpacity>
                  <Text className="text-base font-rubik-medium text-primary-300">Voir tout</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {propertiesLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#0061FF" />
                <Text className="mt-2 text-sm font-rubik text-black-200">Chargement des propriétés...</Text>
              </View>
            ) : properties.length > 0 ? (
              <FlatList
                data={properties.slice(0, 10)}
                renderItem={renderPropertyItem}
                keyExtractor={(item) => item.$id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              />
            ) : (
              <View className="bg-gray-50 rounded-xl p-6 items-center">
                <Ionicons name="home-outline" size={48} color="#ccc" />
                <Text className="text-base font-rubik text-black-200 mt-2 text-center">
                  Aucune propriété publiée pour le moment
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}