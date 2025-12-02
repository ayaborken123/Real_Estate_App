import { Card, PropertyDocument } from '@/components/Cards';
import icons from '@/constants/icons';
import { deleteProperty, getMyProperties } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { useAppwrite } from '@/lib/useAppwrite';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Redirect, router } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyListings() {
  const { user } = useGlobalContext();

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const { data: properties, loading, refetch } = useAppwrite<PropertyDocument[], any>({
    fn: getMyProperties,
    params: {},
  });

  // Refresh the list when the screen comes into focus (only once per focus)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      if (isActive) {
        refetch({});
      }
      
      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleView = (id: string) => router.push({ pathname: '/propreties/[id]', params: { id } });
  const handleEdit = (id: string) => router.push({ pathname: '/(root)/(tabs)/create-property', params: { id } } as any);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete Property', 'Are you sure you want to delete this listing? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await deleteProperty(id);
        if (res.success) {
          Alert.alert('Success', 'Listing deleted successfully');
          refetch({});
        } else {
          Alert.alert('Error', 'Could not delete listing. Please try again.');
        }
      } }
    ]);
  }, [refetch]);

  return (
    <SafeAreaView className="bg-white h-full">
      <View className="px-5 pt-5 pb-3">
        <View className="flex flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-rubik-bold text-black-300">My Listings</Text>
            <Text className="text-sm text-black-200 font-rubik mt-1">
              {properties?.length || 0} {properties?.length === 1 ? 'property' : 'properties'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(root)/(tabs)/create-property')} 
            className="flex-row items-center bg-primary-300 px-4 py-2.5 rounded-lg shadow-sm"
          >
            <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text className="text-white font-rubik-bold">Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0061FF" />
          <Text className="text-black-200 font-rubik mt-3">Loading your listings...</Text>
        </View>
      ) : !properties || properties.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5">
          <Image source={icons.home} className="w-20 h-20 mb-4" tintColor="#CCCCCC" />
          <Text className="text-xl font-rubik-bold text-black-300 mb-2">No Listings Yet</Text>
          <Text className="text-center text-black-200 font-rubik mb-6">
            Start by creating your first property listing
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/(root)/(tabs)/create-property')} 
            className="bg-primary-300 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-rubik-bold">Create Your First Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.$id}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-6"
          renderItem={({ item }) => (
            <View className="px-5 mb-4">
              <Card item={item as unknown as PropertyDocument} onPress={() => handleView(item.$id)} />
              <View className="flex flex-row gap-3 mt-3">
                <TouchableOpacity 
                  onPress={() => handleEdit(item.$id)} 
                  className="flex-1 flex-row items-center justify-center bg-primary-100 px-4 py-3 rounded-lg border border-primary-200"
                >
                  <Image source={icons.edit} className="w-4 h-4 mr-2" tintColor="#0061FF" />
                  <Text className="text-primary-300 font-rubik-medium">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDelete(item.$id)} 
                  className="flex-1 flex-row items-center justify-center bg-red-50 px-4 py-3 rounded-lg border border-red-200"
                >
                  <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text className="text-red-500 font-rubik-medium">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
