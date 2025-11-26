import icons from "@/constants/icons";
import { useFavorites } from "@/lib/favorites-provider";
import React from "react";
import { ActivityIndicator, Image, TouchableOpacity } from "react-native";

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
  const [loading, setLoading] = React.useState(false);
  
  const favorited = isFavorite(propertyId);

  const handleToggleFavorite = async () => {
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
