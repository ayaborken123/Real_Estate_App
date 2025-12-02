import icons from "@/constants/icons";
import { useFavorites } from "@/lib/favorites-provider";
import { useGlobalContext } from "@/lib/global-provider";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Image, TouchableOpacity } from "react-native";

interface FavoriteButtonProps {
  propertyId: string;
  size?: number;
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  propertyId, 
  size = 28,
  className = "" 
}) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { user } = useGlobalContext();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  
  const favorited = isFavorite(propertyId);

  const handleToggleFavorite = async () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please sign in to save favorites',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { text: 'Sign In', onPress: () => router.push('/sign-in') }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      if (favorited) {
        await removeFavorite(propertyId);
      } else {
        await addFavorite(propertyId);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleToggleFavorite}
      disabled={loading}
      className={className}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FF6B6B" />
      ) : (
        <Image
          source={icons.heart}
          style={{ width: size, height: size }}
          tintColor={favorited ? "#FF6B6B" : "#191D31"}
        />
      )}
    </TouchableOpacity>
  );
};

export default FavoriteButton;
