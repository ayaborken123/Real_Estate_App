import { PropertyDocument } from "@/components/Cards";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { addFavorite as addFavoriteAPI, getFavoriteIds, getFavorites, removeFavorite as removeFavoriteAPI } from "./appwrite";
import { useGlobalContext } from "./global-provider";

interface FavoritesContextType {
  favorites: PropertyDocument[];
  favoriteIds: string[];
  loading: boolean;
  addFavorite: (propertyId: string) => Promise<void>;
  removeFavorite: (propertyId: string) => Promise<void>;
  isFavorite: (propertyId: string) => boolean;
  refetch: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider = ({ children }: FavoritesProviderProps) => {
  const { user } = useGlobalContext();
  const [favorites, setFavorites] = useState<PropertyDocument[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds([]);
      return;
    }

    try {
      setLoading(true);
      const [favoritesData, idsData] = await Promise.all([
        getFavorites(),
        getFavoriteIds(),
      ]);
      setFavorites(favoritesData);
      setFavoriteIds(idsData);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const addFavorite = async (propertyId: string) => {
    if (!user) {
      Alert.alert("Not Logged In", "Please log in to save favorites");
      return;
    }

    try {
      // Optimistic update
      setFavoriteIds((prev) => [...prev, propertyId]);

      const result = await addFavoriteAPI(propertyId);
      
      if (result.success) {
        // Refresh full favorites list
        await fetchFavorites();
        // Show success message
        // Alert.alert("Success", "Added to favorites");
      } else {
        // Revert optimistic update
        setFavoriteIds((prev) => prev.filter((id) => id !== propertyId));
        Alert.alert("Error", "Failed to add to favorites");
      }
    } catch (error) {
      // Revert optimistic update
      setFavoriteIds((prev) => prev.filter((id) => id !== propertyId));
      Alert.alert("Error", "Failed to add to favorites");
    }
  };

  const removeFavorite = async (propertyId: string) => {
    if (!user) {
      return;
    }

    try {
      // Optimistic update
      setFavoriteIds((prev) => prev.filter((id) => id !== propertyId));
      setFavorites((prev) => prev.filter((fav) => fav.$id !== propertyId));

      const result = await removeFavoriteAPI(propertyId);
      
      if (result.success) {
        // Refresh to ensure sync
        await fetchFavorites();
        // Alert.alert("Success", "Removed from favorites");
      } else {
        // Revert optimistic update
        await fetchFavorites();
        Alert.alert("Error", "Failed to remove from favorites");
      }
    } catch (error) {
      // Revert optimistic update
      await fetchFavorites();
      Alert.alert("Error", "Failed to remove from favorites");
    }
  };

  const isFavorite = (propertyId: string) => {
    return favoriteIds.includes(propertyId);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteIds,
        loading,
        addFavorite,
        removeFavorite,
        isFavorite,
        refetch: fetchFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};

export default FavoritesProvider;
