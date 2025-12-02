import { Card, FeaturedCard, PropertyDocument } from "@/components/Cards";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import Search from "@/components/Search";
import icons from "@/constants/icons";
import { getLatesProperties, getProperties } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
//ScrollView
//FlatList (for list of items)


export default function Index() {
  const { user} = useGlobalContext();
  const params= useLocalSearchParams<{
    query?: string;
    filter?: string;
    minPrice?: string;
    maxPrice?: string;
    minBeds?: string;
    maxBeds?: string;
    bathrooms?: string;
    facilities?: string;
    sort?: string;
  }>();
  
  const {data: latesProperties ,loading:latesPropertiesLoading }= useAppwrite( {
    fn: getLatesProperties
  });
  const { data:properties, loading, refetch } = useAppwrite<PropertyDocument[], any>({
    fn: getProperties,
    params: {
      filter:  params.filter === "All" ? "" : params.filter ?? "",
      query: params.query ?? "",
      limit: 6,
    },
    skip: true,
  })
  const handlerCardPress = (id: string) => router.push({ pathname: "/propreties/[id]", params: { id } }); 
  useEffect(() => {
    const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
    const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
    const minBeds = params.minBeds ? Number(params.minBeds) : undefined;
    const maxBeds = params.maxBeds ? Number(params.maxBeds) : undefined;
    const bathrooms = params.bathrooms ? Number(params.bathrooms) : undefined;
    const facilities = params.facilities ? (params.facilities as string).split(',') : undefined;
    const sort = (params.sort as string) || undefined;

    refetch({
      filter:  params.filter === "All" ? "" : params.filter ?? "",
      query: params.query ?? "",
      limit: 6,
      minPrice,
      maxPrice,
      minBeds,
      maxBeds,
      bathrooms,
      facilities,
      sort,
    });
  }, [params.filter, params.query, params.minPrice, params.maxPrice, params.minBeds, params.bathrooms, params.facilities, params.sort]);

  return (
    <SafeAreaView className="bg-white h-full">
     
      <FlatList
        data= {properties} 
          renderItem={({item}) =><Card item={item as unknown as PropertyDocument} onPress={()=> handlerCardPress(item.$id)}/>}
          keyExtractor={(item) => item.$id}
          numColumns={2}
          contentContainerClassName="pb-32"
          columnWrapperClassName="flex gap-5 px-5"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" className="text-primary-300 mt-5" />
            ) : (
              <NoResults />
            )
          }
          ListHeaderComponent={ 
           <View className="px-5">
              <View className="flex flex-row items-center justify-between mt-5">
                <TouchableOpacity 
                  className="flex flex-row items-center"
                  onPress={() => router.push('/(root)/(tabs)/profile')}
                >
                  <Image 
                    source={user?.avatar ? { uri: user.avatar } : icons.person} 
                    className="size-12 rounded-full" />
                    <View className="flex flex-col items-start ml-2 justify-center">
                      <Text className="text-xs font-rubik text-black-100">Good Morning</Text>
                      <Text className="text-base font-rubik-medium text-black-300">{user?.name}</Text>
                    </View>
                </TouchableOpacity>
                <Image source={icons.bell} className="size-6" />
            </View>

        <Search />

          <View className="my-5">
            <View className="flex flex-row items-center justify-between">
              <Text className="text-xl font-rubik-bold text-black-300">Featured</Text>
              <TouchableOpacity>
                <Text className="text-base font-rubik-bold text-primary-300">See All</Text>
              </TouchableOpacity>
            </View>
            {latesPropertiesLoading ? (
                <ActivityIndicator size="large"  className="text-primary-300 mt-5"/>
              ) : !latesProperties || latesProperties.length === 0 ? (
                <NoResults />
              ) : (
                <FlatList
                  data={latesProperties}
                  renderItem={({item}) => <FeaturedCard item={item as unknown as PropertyDocument} onPress={()=> handlerCardPress(item.$id)}/>}
                  keyExtractor={(item) => item.$id}
                  horizontal
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="flex gap-5 mt-5"
                />
              )}
          </View>
          <View className="flex flex-row items-center justify-between">
            <Text className="text-xl font-rubik-bold text-black-300">Our Recommendation</Text>
            <TouchableOpacity>
              <Text className="text-base font-rubik-bold text-primary-300">See All</Text>
            </TouchableOpacity>
          </View>
      <Filters showCategories initial={{
        filter: typeof params.filter === 'string' ? params.filter : undefined,
        minPrice: params.minPrice ? Number(params.minPrice) : undefined,
        maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
        minBeds: params.minBeds ? Number(params.minBeds) : undefined,
        bathrooms: params.bathrooms ? Number(params.bathrooms) : undefined,
        facilities: params.facilities ? String(params.facilities).split(',') : [],
        sort: (params.sort as any) || 'newest',
      }} />

      </View>}
      
      />   
    </SafeAreaView>
  );
}
