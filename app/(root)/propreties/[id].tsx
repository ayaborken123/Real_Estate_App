// FORCE RELOAD: Updated at 2025-11-30 06:59
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BookingCalendar from "@/components/BookingCalendar";
import Comment from "@/components/Comment";
import FavoriteButton from "@/components/FavoriteButton";
import PropertiesMap from "@/components/PropertiesMap";
import { facilities } from "@/constants/data";
import icons from "@/constants/icons";
import images from "@/constants/images";

import { createBooking, deleteProperty, getAgentById, getCurrentUser, getPropertyById } from "@/lib/appwrite";
import { useAppwrite } from "@/lib/useAppwrite";

const Property = () => {
  // CRITICAL DEBUG MARKER - Screen rendering check
  console.error('🔴🔴🔴 DETAIL SCREEN LOADED: propreties/[id].tsx 🔴🔴🔴');
  const { id } = useLocalSearchParams<{ id?: string }>();

  const windowHeight = Dimensions.get("window").height;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: property, loading } = useAppwrite({
    fn: getPropertyById,
    params: {
      id: id!,
    },
  });

  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [agentData, setAgentData] = useState<any>(null);
  
  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [numberOfNights, setNumberOfNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Get all images from the images array
  const allImages = property ? (property.images || []).filter(Boolean) : [];
  
  // Legacy support: if no images array but has old 'image' field
  if (allImages.length === 0 && property?.image) {
    allImages.push(property.image);
  }

  useEffect(() => {
    const checkOwnerAndLoadAgent = async () => {
      const user = await getCurrentUser();
      if (!property) return;
      
      console.log('=== OWNERSHIP CHECK ===');
      console.log('Property agent data:', property.agent);
      console.log('Current user:', user?.$id);
      
      // Check if current user is the owner
      const agentId = typeof property.agent === 'string' ? property.agent : property.agent?.$id || property.agent?.id;
      console.log('Agent ID:', agentId);
      console.log('User ID:', user?.$id);
      console.log('Is Owner:', user && agentId === user.$id);
      
      if (user && agentId === user.$id) {
        setIsOwner(true);
        console.log('✅ User IS owner - button will be disabled');
        // Use current user data for agent info
        const userData = {
          name: user.name,
          avatar: user.avatar,
          email: user.email,
          phone: user.phone
        };
        console.log('Setting agent data from user:', userData);
        setAgentData(userData);
      } else {
        setIsOwner(false);
        console.log('❌ User is NOT owner - button should work');
        // Use property agent data
        if (property.agent && typeof property.agent === 'object') {
          const propAgentData = {
            name: property.agent.name,
            avatar: property.agent.avatar,
            email: property.agent.email,
            phone: property.agent.phone || ''
          };
          console.log('Setting agent data from property:', propAgentData);
          setAgentData(propAgentData);
        } else if (agentId) {
          // Fallback: fetch agent document by ID from Appwrite
          try {
            const fetched = await getAgentById(agentId);
            if (fetched) {
              const fetchedAgent = {
                name: fetched.name,
                avatar: fetched.avatar,
                email: fetched.email,
                phone: fetched.phone || ''
              };
              console.log('Fetched agent by ID:', fetchedAgent);
              setAgentData(fetchedAgent);
            }
          } catch (e) {
            console.warn('Failed to fetch agent by ID:', e);
          }
        }
      }
    };
    checkOwnerAndLoadAgent();
  }, [property]);

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

  const handleBookNow = () => {
    console.log("=== BOOK NOW PRESSED ===");
    console.log("isOwner:", isOwner);
    console.log("property:", property?.$id);
    
    Alert.alert("Debug", `Button pressed! isOwner: ${isOwner}`);
    
    if (isOwner) {
      Alert.alert("Cannot Book", "You cannot book your own property");
      return;
    }
    
    console.log("Opening booking modal...");
    setShowBookingModal(true);
  };

  const handleDatesSelected = (
    checkIn: string,
    checkOut: string,
    nights: number,
    total: number
  ) => {
    setCheckInDate(checkIn);
    setCheckOutDate(checkOut);
    setNumberOfNights(nights);
    setTotalPrice(total);
  };

  const handleSubmitBooking = async () => {
    if (!checkInDate || !checkOutDate) {
      Alert.alert("Missing Dates", "Please select check-in and check-out dates");
      return;
    }

    if (numberOfGuests < 1) {
      Alert.alert("Invalid Guests", "Please enter at least 1 guest");
      return;
    }

    try {
      setSubmittingBooking(true);
      const user = await getCurrentUser();
      
      if (!user) {
        Alert.alert("Authentication Required", "Please sign in to book a property");
        router.push("/sign-in" as any);
        return;
      }

      if (!property) {
        Alert.alert("Error", "Property not found");
        return;
      }

      const agentId = typeof property.agent === 'string' 
        ? property.agent 
        : property.agent?.$id || property.agent?.id;

      await createBooking({
        propertyId: property.$id,
        guestId: user.$id,
        agentId: agentId,
        checkInDate: new Date(checkInDate).toISOString(),
        checkOutDate: new Date(checkOutDate).toISOString(),
        numberOfGuests,
        pricePerNight: property.price,
        specialRequests,
      });

      Alert.alert(
        "Booking Requested",
        "Your booking request has been sent to the property owner. You will be notified once they respond.",
        [
          {
            text: "View My Bookings",
            onPress: () => {
              setShowBookingModal(false);
              router.push("/(root)/(tabs)/bookings" as any);
            },
          },
          {
            text: "OK",
            onPress: () => setShowBookingModal(false),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creating booking:", error);
      const errorMsg = error?.message || "Failed to create booking request";
      
      if (errorMsg.includes("authorized") || errorMsg.includes("permission")) {
        Alert.alert(
          "Permission Error",
          "Cannot create booking due to permission settings.\\n\\nPlease configure Appwrite:\\n1. Go to Bookings collection\\n2. Settings → Permissions\\n3. Add 'users' role with 'create' permission"
        );
      } else {
        Alert.alert("Booking Failed", errorMsg);
      }
    } finally {
      setSubmittingBooking(false);
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

  return (
    <View className="flex-1">
      {/* DEBUG: Test button at top */}
      <TouchableOpacity
        onPress={() => Alert.alert("TEST", "Top button works!")}
        style={{
          position: 'absolute',
          top: 100,
          right: 20,
          zIndex: 9999,
          backgroundColor: 'red',
          padding: 10,
          borderRadius: 5,
        }}
      >
        <Text style={{ color: 'white' }}>TEST</Text>
      </TouchableOpacity>

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
                  {allImages.map((_: string, index: number) => (
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
                <Image source={icons.send} className="size-7" />
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
            {property.name}
          </Text>

          <View className="flex flex-row items-center gap-3">
            <View className="flex flex-row items-center px-4 py-2 bg-primary-100 rounded-full">
              <Text className="text-xs font-rubik-bold text-primary-300">
                {property.type}
              </Text>
            </View>

            <View className="flex flex-row items-center gap-2">
              <Image source={icons.star} className="size-5" />
              <Text className="text-black-200 text-sm mt-1 font-rubik-medium">
                {property.rating} ({property.reviews?.length || 0} reviews)
              </Text>
            </View>
          </View>

          <View className="flex flex-row items-center mt-5">
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10">
              <Image source={icons.bed} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {property.bedrooms} Beds
            </Text>
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
              <Image source={icons.bath} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {property.bathrooms} Baths
            </Text>
            <View className="flex flex-row items-center justify-center bg-primary-100 rounded-full size-10 ml-7">
              <Image source={icons.area} className="size-4" />
            </View>
            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
              {property.area} sqft
            </Text>
          </View>

          <View className="w-full border-t border-primary-200 pt-7 mt-5">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Agent
            </Text>

            <View className="flex flex-row items-center justify-between mt-4">
              <View className="flex flex-row items-center">
                <Image
                  source={{ uri: agentData?.avatar || property.agent?.avatar }}
                  className="size-14 rounded-full"
                />

                <View className="flex flex-col items-start justify-center ml-3">
                  <Text className="text-lg text-black-300 text-start font-rubik-bold">
                    {agentData?.name || property.agent?.name || 'Unknown'}
                  </Text>
                  {agentData?.phone ? (
                    <Text className="text-sm text-black-200 text-start font-rubik-medium">
                      {agentData.phone}
                    </Text>
                  ) : (
                    <Text className="text-sm text-black-200 text-start font-rubik-medium">
                      {agentData?.email || property.agent?.email}
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex flex-row items-center gap-3">
                <TouchableOpacity>
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
              {property.description}
            </Text>
          </View>

          <View className="mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">
              Facilities
            </Text>

            {property.facilities && property.facilities.length > 0 && (
              <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-5">
                {property.facilities.map((item: string, index: number) => {
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
            <Text className="text-black-300 text-xl font-rubik-bold">
              Location
            </Text>
            <View className="flex flex-row items-center justify-start mt-4 gap-2">
              <Image source={icons.location} className="w-7 h-7" />
              <Text className="text-black-200 text-sm font-rubik-medium">
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

          {property.reviews && property.reviews.length > 0 && (
            <View className="mt-7">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center">
                  <Image source={icons.star} className="size-6" />
                  <Text className="text-black-300 text-xl font-rubik-bold ml-2">
                    {property.rating} ({property.reviews.length} reviews)
                  </Text>
                </View>

                <TouchableOpacity>
                  <Text className="text-primary-300 text-base font-rubik-bold">
                    View All
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-5">
                <Comment item={property.reviews[0]} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          padding: 20,
          borderTopWidth: 1,
          borderColor: '#e5e5e5',
          zIndex: 9999,
          elevation: 10,
        }}
        // Ensure this container captures touches for the booking button
        pointerEvents="auto"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} pointerEvents="auto">
          <View style={{ flexDirection: 'column' }}>
            <Text style={{ fontSize: 12, color: '#666' }}>
              Price
            </Text>
            <Text style={{ fontSize: 24, color: '#0061FF', fontWeight: 'bold' }}>
              ${property.price}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              console.log('PRESSABLE PRESSED!');
              Alert.alert('Pressable', 'Button tapped!');
              handleBookNow();
            }}
            disabled={isOwner}
            style={({ pressed }) => ({
              flex: 1,
              marginLeft: 20,
              backgroundColor: isOwner ? '#ccc' : (pressed ? '#0051d5' : '#0061FF'),
              paddingVertical: 16,
              borderRadius: 25,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              {isOwner ? "Your Property" : "BOOK"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-5 border-b border-gray-200">
            <Text className="text-2xl font-rubik-bold text-black-300">
              Book {property?.name}
            </Text>
            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
              <Text className="text-lg font-rubik-medium text-black-200">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            <BookingCalendar
              propertyId={property?.$id || ""}
              pricePerNight={property?.price || 0}
              onDatesSelected={handleDatesSelected}
            />

            <View className="bg-white rounded-2xl p-5 mb-5">
              <Text className="text-xl font-rubik-bold text-black-300 mb-2">
                Guest Details
              </Text>
              
              <Text className="text-sm font-rubik text-black-200 mb-2">
                Number of Guests
              </Text>
              <View className="flex-row items-center justify-between bg-primary-100 rounded-xl p-4 mb-4">
                <TouchableOpacity
                  onPress={() => setNumberOfGuests(Math.max(1, numberOfGuests - 1))}
                  className="w-10 h-10 items-center justify-center bg-white rounded-full"
                >
                  <Text className="text-xl font-rubik-bold text-black-300">-</Text>
                </TouchableOpacity>
                <Text className="text-xl font-rubik-bold text-black-300">
                  {numberOfGuests}
                </Text>
                <TouchableOpacity
                  onPress={() => setNumberOfGuests(numberOfGuests + 1)}
                  className="w-10 h-10 items-center justify-center bg-white rounded-full"
                >
                  <Text className="text-xl font-rubik-bold text-black-300">+</Text>
                </TouchableOpacity>
              </View>

              <Text className="text-sm font-rubik text-black-200 mb-2">
                Special Requests (Optional)
              </Text>
              <TextInput
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder="Any special requirements?"
                multiline
                numberOfLines={4}
                className="bg-primary-100 rounded-xl p-4 text-black-300 font-rubik"
                style={{ textAlignVertical: 'top' }}
              />
            </View>

            {checkInDate && checkOutDate && (
              <View className="bg-primary-100 rounded-2xl p-5 mb-5">
                <Text className="text-xl font-rubik-bold text-black-300 mb-3">
                  Booking Summary
                </Text>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm font-rubik text-black-200">
                    {numberOfNights} nights × ${property?.price}
                  </Text>
                  <Text className="text-sm font-rubik text-black-300">
                    ${(numberOfNights * (property?.price || 0)).toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm font-rubik text-black-200">
                    Service fee (10%)
                  </Text>
                  <Text className="text-sm font-rubik text-black-300">
                    ${(numberOfNights * (property?.price || 0) * 0.1).toFixed(2)}
                  </Text>
                </View>
                <View className="h-px bg-black-100 my-2" />
                <View className="flex-row justify-between">
                  <Text className="text-lg font-rubik-bold text-black-300">
                    Total
                  </Text>
                  <Text className="text-lg font-rubik-bold text-primary-300">
                    ${totalPrice.toFixed(2)} 
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View className="p-5 border-t border-gray-200">
            <TouchableOpacity
              onPress={handleSubmitBooking}
              disabled={!checkInDate || !checkOutDate || submittingBooking}
              className={`py-4 rounded-full ${
                !checkInDate || !checkOutDate || submittingBooking
                  ? "bg-gray-300"
                  : "bg-primary-300"
              }`}
            >
              {submittingBooking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg text-center font-rubik-bold">
                  Request to Book
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Property;