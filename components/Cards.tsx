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
      className="flex-1 w-full mt-4"
      activeOpacity={0.95}
    >
      <View
        className="rounded-3xl bg-white p-3"
        style={{
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 5,
        }}
      >
        <View className="relative">
          <Image source={{ uri: imageUrl }} className="w-full h-40 rounded-2xl" resizeMode="cover" />
          <View className="flex flex-row items-center absolute px-2.5 py-1 top-3 right-3 bg-black/55 rounded-full">
            <Image source={icons.star} className="w-3.5 h-3.5" />
            <Text className="text-xs font-rubik-bold text-white ml-1">{rating > 0 ? rating.toFixed(1) : '0.0'}</Text>
          </View>
          <View className="absolute top-3 left-3">
            <FavoriteButton propertyId={item.$id} size={22} />
          </View>
        </View>

        <View className="flex flex-col mt-4">
          <Text className="text-base font-rubik-bold text-black-300" numberOfLines={1}>{item.name}</Text>
          <Text className="text-xs font-rubik text-black-200 mt-1" numberOfLines={1}>{item.address}</Text>
          <View className="flex flex-row items-center justify-between mt-3">
            <Text className="text-lg font-rubik-extrabold text-primary-300">
              ${typeof item.price === 'number' ? (item.price as number).toLocaleString() : item.price}
            </Text>
            <View className="flex flex-row items-center">
              <Text className="text-[11px] font-rubik text-black-100 mr-1">per night</Text>
              <Image source={icons.rightArrow} className="w-4 h-4" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};