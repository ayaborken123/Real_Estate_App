import icons from '@/constants/icons';
import images from '@/constants/images';
import { usePropertyRating } from '@/hooks/usePropertyRating';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Models } from 'react-native-appwrite';
import FavoriteButton from './FavoriteButton';

export interface PropertyDocument extends Models.Document {
  name: string;
  address: string;
  price: string;
  rating: number;
  image?: string; // Legacy support
  images?: string[]; // New array field
  geolocation?: string; // JSON string of coordinates
  bedrooms?: number;
  bathrooms?: number;
}

interface Props {
  item: PropertyDocument;
  onPress?: () => void;
}

export const FeaturedCard = ({ item, onPress }: Props) => {
  // Get the first image from images array, fallback to legacy image field
  const imageUrl = item.images?.[0] || item.image || 'https://via.placeholder.com/400';
  const { rating } = usePropertyRating(item.$id);
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex flex-col items-start w-60 h-80 relative"
    >
      <Image source={{uri: imageUrl}} className="w-full h-full rounded-2xl" />
      <Image
        source={images.cardGradient}
        className="w-full h-full rounded-2xl absolute bottom-0"
      />
      <View className="flex flex-row items-center bg-white/90 px-3 py-1.5 rounded-full absolute top-5 right-5">
        <Image source={icons.star} className="w-3.5 h-3.5" />
         <Text className="text-sm font-rubik-bold text-primary-300">{rating > 0 ? rating.toFixed(1) : '0.0'}</Text>
      </View>
      <View className="absolute top-5 left-5 z-50">
        <FavoriteButton propertyId={item.$id} size={24} />
      </View>
      <View className="flex flex-col items-start absolute bottom-5 inset-x-5">
        <Text
          className="text-xl font-rubik-extrabold text-white"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text className="text-base font-rubik text-white">
          {item.address}
        </Text>
        <View className="flex flex-row items-center justify-between w-full">
          <Text className="text-xl font-rubik-extrabold text-white">
            ${item.price}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const Card = ({item, onPress }: Props) => {
  // Get the first image from images array, fallback to legacy image field
  const imageUrl = item.images?.[0] || item.image || 'https://via.placeholder.com/400';
  const { rating } = usePropertyRating(item.$id);
  
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 w-full mt-4 px-3 py-3 rounded-xl bg-white border border-primary-50 relative"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex flex-row items-center absolute px-2.5 py-1 top-5 right-5 bg-white/95 rounded-full z-50 shadow-sm">
        <Image source={icons.star} className="w-3 h-3" />
         <Text className="text-xs font-rubik-bold text-primary-300 ml-1">{rating > 0 ? rating.toFixed(1) : '0.0'}</Text>
      </View>

      <Image source={{uri: imageUrl}} className="w-full h-40 rounded-lg" resizeMode="cover" />

      <View className="flex flex-col mt-3">
        <Text className="text-base font-rubik-bold text-black-300" numberOfLines={1}>{item.name}</Text>
        <Text className="text-xs font-rubik text-black-200 mt-1" numberOfLines={1}>{item.address}</Text>
        <View className="flex flex-row items-center justify-between mt-2.5">
          <Text className="text-lg font-rubik-extrabold text-primary-300">
            ${typeof item.price === 'number' ? (item.price as number).toLocaleString() : item.price}
          </Text>
          <FavoriteButton propertyId={item.$id} size={22} className="-mr-1" />
        </View>
      </View>
    </TouchableOpacity>
  );
};