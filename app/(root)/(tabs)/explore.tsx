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


export default function Explore() {
  const params= useLocalSearchParams<{query?: string, filter?: string}>();

  const { data:properties, loading, refetch } = useAppwrite<PropertyDocument[], {filter: string; query: string; limit?: number}>({
    fn: getProperties,
    params: {
      filter:  params.filter === "All" ? "" : params.filter ?? "",
      query: params.query ?? "",
      limit: 20,
    },
    skip: true,
  })
  const handlerCardPress = (id: string) => router.push({ pathname: "/propreties/[id]", params: { id } }); 
  useEffect(() => {
    refetch({
      filter:  params.filter === "All" ? "" : params.filter ?? "",
      query: params.query ?? "",
      limit: 20,
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
                    <TouchableOpacity onPress={() => router.back()} className="flex flrx-row 
                    bg-primary-200 rounded-full size-11 items-center justify-center"> 
                        <Image source={icons.backArrow} className="size-5" />
                    </TouchableOpacity>
                    <Text className="text-center font-rubik-medium text-black-300">Search for your Ideal Home</Text>
                    <Image source={icons.bell} className="w-6 h-6" />

                </View>
                <Search />

                <View className="mt-5">
                    <Filters/>
                    <Text className="text-xl font-rubik-bold text-black-300 mt-5">
                        Found {properties?.length} Properties
                    </Text>
                </View>
            </View>
          }  
      />   
    </SafeAreaView>
  );
}
