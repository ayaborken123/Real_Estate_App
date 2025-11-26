import { Card } from "@/components/Cards";
import NoResults from "@/components/NoResults";
import { useFavorites } from "@/lib/favorites-provider";
import { router } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Favorites = () => {
  const { favorites, loading, refetch } = useFavorites();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading && favorites.length === 0) {
    return (
      <SafeAreaView className="h-full bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0061FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="h-full bg-white">
      <View className="px-7">
        <View className="flex flex-row items-center justify-between mt-5 mb-3">
          <Text className="text-2xl font-rubik-bold">My Favorites</Text>
          <Text className="text-base font-rubik text-black-300">
            {favorites.length} {favorites.length === 1 ? "property" : "properties"}
          </Text>
        </View>

        <FlatList
          data={favorites}
          renderItem={({ item }) => (
            <Card
              item={item}
              onPress={() => router.push(`/propreties/${item.$id}`)}
            />
          )}
          keyExtractor={(item) => item.$id}
          numColumns={1}
          contentContainerClassName="pb-32"
          columnWrapperClassName={undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <NoResults title="No favorites yet" subtitle="Start adding properties to your favorites to see them here" />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0061FF"]}
              tintColor="#0061FF"
            />
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default Favorites;
