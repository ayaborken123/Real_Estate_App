import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Linking,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import DateRangePicker from "@/components/DateRangePicker";
import DirectionsButton from "@/components/DirectionsButton";
import FavoriteButton from "@/components/FavoriteButton";
import PropertiesMap from "@/components/PropertiesMap";
import PropertyReviewsList from "@/components/PropertyReviewsList";
import ShareModal from "@/components/ShareModal";
import { facilities } from "@/constants/data";
import icons from "@/constants/icons";
import images from "@/constants/images";
import { useLocation } from "@/hooks/useLocation";

import { createBooking, createOrGetConversation, deleteProperty, getAgentById, getCurrentUser, getPropertyBookings, getPropertyById } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useAppwrite } from "@/lib/useAppwrite";

const Property = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const windowHeight = Dimensions.get("window").height;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: property, loading } = useAppwrite({
    fn: getPropertyById,
    params: {
      id: id!,
    },
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  const router = useRouter();
  const { user } = useGlobalContext();
  const [isOwner, setIsOwner] = useState(false);
  const [agentData, setAgentData] = useState<any>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { location } = useLocation();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Get all images from the images array
  const allImages = property ? (property.images || []).filter(Boolean) : [];
  
  // Legacy support: if no images array but has old 'image' field
  if (allImages.length === 0 && property?.image) {
    allImages.push(property!.image);
  }

  useEffect(() => {
    const loadUnavailable = async () => {
      if (!property || !user) return; // Only load if user is authenticated
      try {
        const bookings = await getPropertyBookings(property.$id);
        const blocked: string[] = [];

        bookings.forEach((b: any) => {
          try {
            const start = new Date(b.checkInDate);
            const end = new Date(b.checkOutDate);
            const cur = new Date(start);
            while (cur < end) {
              blocked.push(cur.toISOString().split('T')[0]);
              cur.setDate(cur.getDate() + 1);
            }
          } catch (e) {
            // ignore
          }
        });

        setUnavailableDates(Array.from(new Set(blocked)));
      } catch (e) {
        // Silently handle errors for unauthenticated users
      }
    };

    loadUnavailable();

    const checkOwnerAndLoadAgent = async () => {
      const user = await getCurrentUser();
      if (!property) return;
      
      console.log('Property agent data:', property.agent);
      
      // Get agent ID from property
      const agentId = typeof property.agent === 'string' ? property.agent : property.agent?.$id || property.agent?.id;
      
      // Check if current user is the owner
      if (user && agentId === user.$id) {
        setIsOwner(true);
        // Use current user data for agent info
        const userData = {
          $id: user.$id,
          name: user.name,
          avatar: user.avatar,
          email: user.email,
          phone: user.phone
        };
        console.log('Setting agent data from user:', userData);
        setAgentData(userData);
      } else {
        setIsOwner(false);
        // Load agent data from database
        if (agentId) {
          try {
            const agent = await getAgentById(agentId);
            if (agent) {
              console.log('Loaded agent data from database:', agent);
              setAgentData(agent);
            }
          } catch (error) {
            console.error('Error loading agent:', error);
            // Fallback to property agent data if available
            if (property.agent && typeof property.agent === 'object') {
              setAgentData(property.agent);
            }
          }
        }
      }
    };
    checkOwnerAndLoadAgent();
  }, [property]);

  const handleSelectDates = async (checkIn: string, checkOut: string, priceDetails: any) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Connexion requise', 'Vous devez être connecté pour réserver');
        router.push('/sign-in' as any);
        return;
      }

      if (!property) {
        Alert.alert('Erreur', 'Propriété introuvable');
        return;
      }

      const agentId = typeof property.agent === 'string' ? property.agent : property.agent?.$id || property.agent?.id;

      const booking = await createBooking({
        propertyId: property!.$id,
        guestId: user.$id,
        agentId: agentId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: 1,
        pricePerNight: Number(property!.price),
      } as any);

      Alert.alert('Success', 'Booking request created successfully');
      router.push('/(root)/(tabs)/bookings' as any);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', error?.message || 'Failed to create booking');
    }
  };

  const handleCall = () => {
    const phone = agentData?.phone;
    if (!phone) {
      Alert.alert('No Phone', 'Agent phone number not available');
      return;
    }
    
    const phoneUrl = Platform.OS === 'ios' ? `telprompt:${phone}` : `tel:${phone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone call is not supported on this device');
        }
      })
      .catch((err) => console.error('Error opening phone dialer:', err));
  };

  const handleStartChat = async () => {
    if (!user) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour envoyer un message');
      return;
    }

    const agentId = agentData?.$id || property?.agent?.$id || property?.agent;
    if (!agentId) {
      Alert.alert('Erreur', 'Impossible de contacter l\'agent');
      return;
    }

    if (agentId === user.$id) {
      Alert.alert('Info', 'Vous ne pouvez pas vous envoyer un message à vous-même');
      return;
    }

    try {
      const result = await createOrGetConversation(agentId, property?.$id);
      
      if (result.success && result.conversation) {
        router.push({
          pathname: '/chat/[id]',
          params: {
            id: result.conversation.$id,
            otherUserId: agentId,
            propertyId: property?.$id,
          },
        });
      } else {
        Alert.alert('Erreur', 'Impossible de démarrer la conversation');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0061FF" />
      </View>
    );
  }

  if (!property) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-black-300 text-lg font-rubik">Property not found</Text>
      </View>
    );
  }

  const prop = property!;

  return (
    <View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 bg-white"
      >
        <View className="relative w-full" style={{ height: windowHeight / 2 }}>
          {/* Image Carousel */}
          {allImages.length > 0 && (
            <>
              <FlatList
                data={allImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                  setCurrentImageIndex(index);
                }}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    style={{ width: Dimensions.get('window').width, height: windowHeight / 2 }}
                    resizeMode="cover"
                  />
                )}
              />
              
              {/* Image indicator dots */}
              {allImages.length > 1 && (
                <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center z-50">
                  {allImages.map((_: any, index: number) => (
                    <View
                      key={index}
                      className={`h-2 rounded-full mx-1 ${
                        index === currentImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'
                      }`}
                    />
                  ))}
                </View>
              )}
            </>
          )}
          
          <Image
            source={images.whiteGradient}
            className="absolute top-0 w-full z-40"
          />

          <View
            className="z-50 absolute inset-x-7"
            style={{
              top: Platform.OS === "ios" ? 70 : 20,
            }}
          >
            <View className="flex flex-row items-center w-full justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
              >
                <Image source={icons.backArrow} className="size-5" />
              </TouchableOpacity>

              <View className="flex flex-row items-center gap-3">
                <TouchableOpacity className="bg-white/90 rounded-full p-2.5">
                  <FavoriteButton propertyId={id!} size={24} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShareModalVisible(true)}
                  className="bg-white/90 rounded-full p-2.5"
                >
                  <Image source={icons.send} className="size-7" />
                </TouchableOpacity>
                {isOwner && (
                  <>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/(root)/(tabs)/create-property', params: { id } } as any)} className="bg-white/90 rounded-full p-2.5">
                      <Text className="text-primary-300">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      // Confirm deletion
                      const confirmDelete = () => {
                        deleteProperty(id!).then(() => router.back()).catch(e => console.error(e));
                      };
                      Alert.alert('Delete', 'Are you sure you want to delete this listing?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
                      ]);
                    }} className="bg-white/90 rounded-full p-2.5">
                      <Text className="text-red-500">Delete</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 mt-7 flex gap-2">
          <Text className="text-2xl font-rubik-extrabold">
            {prop.name}
          </Text>

          <View className="flex flex-row items-center gap-3">
            <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
                <Text className="text-xs font-rubik-bold text-primary-300">
                {prop.type}
              </Text>
            </View>

            <View className="flex flex-row items-center gap-2">
              <Image source={icons.star} className="size-5" />
                <Text className="text-black-200 text-sm mt-1 font-rubik-medium">
                {reviewRating > 0 ? reviewRating.toFixed(1) : '0.0'} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          </View>

          <View className="flex flex-row items-center mt-5">
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10">
              <Image source={icons.bed} className="size-4" />
            </View>
              <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {prop.bedrooms} Beds
            </Text>
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
              <Image source={icons.bath} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {prop.bathrooms} Baths
            </Text>
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
              <Image source={icons.area} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {prop.area} sqft
            </Text>
          </View>

          <View className="w-full border-t border-primary-200 pt-7 mt-5">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Agent
            </Text>

            <View className="flex flex-row items-center justify-between mt-4">
              <View className="flex flex-row items-center flex-1">
                <Image
                  source={{ uri: agentData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentData?.name || 'Agent')}&size=200&background=0061FF&color=fff` }}
                  className="size-14 rounded-full"
                />

                <View className="flex flex-col items-start justify-center ml-3 flex-1">
                  <Text className="text-lg text-black-300 text-start font-rubik-bold">
                    {agentData?.name || 'Agent'}
                  </Text>
                  {agentData?.phone ? (
                    <Text className="text-sm text-black-200 text-start font-rubik-medium">
                      {agentData.phone}
                    </Text>
                  ) : agentData?.email ? (
                    <Text className="text-sm text-black-200 text-start font-rubik-medium">
                      {agentData.email}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="flex flex-row items-center gap-3">
                <TouchableOpacity onPress={handleStartChat}>
                  <Image source={icons.chat} className="size-7" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCall} disabled={!agentData?.phone}>
                  <Image 
                    source={icons.phone} 
                    className="size-7" 
                    style={{ opacity: agentData?.phone ? 1 : 0.5 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Overview
            </Text>
              <Text className="text-black-200 text-base font-rubik mt-2">
              {prop.description}
            </Text>
          </View>

          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Facilities
            </Text>

            {prop.facilities && prop.facilities.length > 0 && (
              <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-5">
                {prop.facilities.map((item: string, index: number) => {
                  const facility = facilities.find(
                    (facility) => facility.title === item
                  );

                  return (
                    <View
                      key={index}
                      className="flex flex-1 flex-col items-center min-w-16 max-w-20"
                    >
                      <View className="size-14 bg-primary-100 rounded-full flex items-center justify-center">
                        <Image
                          source={facility ? facility.icon : icons.info}
                          className="size-6"
                        />
                      </View>

                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        className="text-black-300 text-sm text-center font-rubik mt-1.5"
                      >
                        {item}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

            {property.gallery && property.gallery.length > 0 && (
            <View className="mt-7">
              <Text className="text-black-300 text-xl font-rubik-bold">
                Gallery
              </Text>
              <FlatList
                contentContainerStyle={{ paddingRight: 20 }}
                data={property.gallery}
                keyExtractor={(item) => item.$id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                    <Image
                    source={{ uri: item.image }}
                    className="size-40 rounded-xl"
                  />
                )}
                contentContainerClassName="flex gap-4 mt-3"
              />
            </View>
          )}

          <View className="mt-7">
            <View className="flex flex-row items-center justify-between mb-2">
              <Text className="text-black-300 text-xl font-rubik-bold">
                Location
              </Text>
              {property.geolocation && (() => {
                try {
                  const geo = typeof property.geolocation === 'string' 
                    ? JSON.parse(property.geolocation) 
                    : property.geolocation;
                  return (
                    <DirectionsButton
                      latitude={geo.latitude}
                      longitude={geo.longitude}
                      propertyName={property.name}
                      userLatitude={location?.latitude}
                      userLongitude={location?.longitude}
                      size={24}
                      color="#0061FF"
                      style={{
                        backgroundColor: 'rgba(0, 97, 255, 0.1)',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                      }}
                    />
                  );
                } catch (e) {
                  return null;
                }
              })()}
            </View>
            <View className="flex flex-row items-center justify-start mt-2 gap-2">
              <Image source={icons.location} className="w-7 h-7" />
              <Text className="text-black-200 text-sm font-rubik-medium flex-1" numberOfLines={2}>
                {property.address}
              </Text>
            </View>

            {property.geolocation && (() => {
              try {
                const geo = typeof property.geolocation === 'string' 
                  ? JSON.parse(property.geolocation) 
                  : property.geolocation;
                return (
                  <View className="h-52 w-full mt-5 rounded-xl overflow-hidden">
                    <PropertiesMap 
                      properties={[property]}
                    />
                  </View>
                );
              } catch (e) {
                console.error('Error parsing geolocation:', e);
                return (
                  <Image
                    source={images.map}
                    className="h-52 w-full mt-5 rounded-xl"
                  />
                );
              }
            })()}
          </View>

          {/* Reviews Section - New Review System */}
          <PropertyReviewsList
            propertyId={id!}
            showWriteButton={true}
            maxReviews={3}
            onReviewCountChange={(count, average) => {
              setReviewCount(count);
              setReviewRating(average || 0);
            }}
          />
        </View>
      </ScrollView>

      <View className="absolute bg-white bottom-0 w-full rounded-t-2xl border-t border-r border-l border-primary-200 p-7">
        <View className="flex flex-row items-center justify-between gap-10">
          <View className="flex flex-col items-start">
            <Text className="text-black-200 text-xs font-rubik-medium">
              Price
            </Text>
            <Text
              numberOfLines={1}
              className="text-primary-300 text-start text-2xl font-rubik-bold"
            >
              ${prop.price}
            </Text>
          </View>

          <TouchableOpacity 
            onPress={() => {
              if (!user) {
                Alert.alert(
                  'Login Required',
                  'Please sign in to book this property',
                  [
                    { text: 'Cancel', style: 'cancel', onPress: () => {} },
                    { text: 'Sign In', onPress: () => router.push('/sign-in') }
                  ]
                );
                return;
              }
              setShowDatePicker(true);
            }}
            className="flex-1 flex flex-row items-center justify-center bg-primary-300 py-3 rounded-full shadow-md shadow-zinc-400"
          >
            <Text className="text-white text-lg text-center font-rubik-bold">
              Book Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <DateRangePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDates={handleSelectDates}
        pricePerNight={Number(prop.price)}
        unavailableDates={unavailableDates}
      />
      
      {property && (
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          property={{
            id: property.$id,
            name: property.name,
            price: typeof property.price === 'string' ? parseFloat(property.price) : property.price,
            address: property.address,
            image: Array.isArray(property.images) && property.images.length > 0 ? property.images[0] : property.image
          }}
        />
      )}
    </View>
  );
};

export default Property;