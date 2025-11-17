import { Card, FeaturedCard } from "@/components/Cards";
import Filters from "@/components/Filters";
import Search from "@/components/Search";
import icons from "@/constants/icons";
import { getLatesProperties, getProperties } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";
import { useLocalSearchParams , router, Link} from "expo-router";
import React, { useEffect } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { PropertyDocument } from "@/components/Cards";
import { ActivityIndicator } from "react-native";
import NoResults from "@/components/NoResults";
//ScrollView
//FlatList (for list of items)


export default function Index() {
  const { user} = useGlobalContext();
  const params= useLocalSearchParams<{query?: string, filter?: string}>();
  
  const {data: latesProperties ,loading:latesPropertiesLoading }= useAppwrite( {
    fn: getLatesProperties
  });
  const { data:properties, loading, refetch } = useAppwrite<PropertyDocument[], {filter: string; query: string; limit?: number}>({
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
    refetch({
      filter:  params.filter === "All" ? "" : params.filter ?? "",
      query: params.query ?? "",
      limit: 6,
    });
  }, [params.filter, params.query]);

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
                <View className="flex flex-row items-center">
                  <Image 
                    source={user?.avatar ? { uri: user.avatar } : icons.person} 
                    className="size-12 rounded-full" />
                    <View className="flex flex-col items-start ml-2 justify-center">
                      <Text className="text-xs font-rubik text-black-100">Good Morning</Text>
                      <Text className="text-base font-rubik-medium text-black-300">{user?.name}</Text>
                    </View>
                </View>
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
      <Filters />

      </View>}
      
      />   
    </SafeAreaView>
  );
}
