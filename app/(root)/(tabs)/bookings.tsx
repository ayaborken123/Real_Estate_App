import icons from "@/constants/icons";
import { BookingDocument, cancelBooking, createPaymentRecord, getCurrentUser, getUserBookings } from "@/lib/appwrite";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Bookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadBookings = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/sign-in" as any);
        return;
      }

      setCurrentUser(user);
      const fetchedBookings = await getUserBookings(user.$id);
      setBookings(fetchedBookings);
    } catch (error: any) {
      console.error("Error loading bookings:", error);
      const errorMsg = error?.message || "Failed to load bookings";
      Alert.alert(
        "Permission Error", 
        `${errorMsg}\n\nPlease configure permissions in Appwrite:\n1. Go to Bookings collection\n2. Settings → Permissions\n3. Add 'users' role with 'read' permission`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = (bookingId: string, booking: BookingDocument) => {
    const checkIn = new Date(booking.checkInDate);
    const now = new Date();
    const daysUntil = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let message = "Are you sure you want to cancel this booking?\n\n";
    if (daysUntil >= 7) {
      message += "You will receive a full refund (excluding service fee).";
    } else if (daysUntil >= 3) {
      message += "You will receive a 50% refund.";
    } else {
      message += "No refund will be issued as per the cancellation policy.";
    }

    Alert.alert("Cancel Booking", message, [
      { text: "Keep Booking", style: "cancel" },
      {
        text: "Cancel Booking",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelBooking(bookingId, "guest");
            Alert.alert("Success", "Booking cancelled successfully");
            loadBookings();
          } catch (error) {
            Alert.alert("Error", "Failed to cancel booking");
          }
        },
      },
    ]);
  };

  const getFilteredBookings = () => {
    if (filter === "all") return bookings;
    return bookings.filter((b) => b.status === filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "unpaid":
        return "bg-orange-100 text-orange-800";
      case "refunded":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredBookings = getFilteredBookings();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0061FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-1 border-b border-gray-200">
        <Text className="text-2xl font-rubik-bold text-black-300">My Bookings</Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-5 py-0 border-b border-gray-200"
      >
        <View className="flex-row items-center gap-2 ">
          {['all', 'pending', 'confirmed', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilter(status as any)}
              className={`px-5 py-2 rounded-full ${
                filter === status ? 'bg-primary-300' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-sm font-rubik-medium capitalize ${
                  filter === status ? 'text-white' : 'text-black-300'
                }`}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredBookings.length === 0 ? (
          <View className="flex-1 items-center justify-center py-8">
            <Image source={icons.calendar} className="w-20 h-20 mb-4" tintColor="#999" />
            <Text className="text-lg font-rubik-medium text-black-200 mb-2">
              No {filter !== "all" ? filter : ""} bookings found
            </Text>
            <Text className="text-sm font-rubik text-black-200 text-center px-6 mb-4">
              Your booking requests will appear here
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/" as any)}
              className="bg-primary-300 px-6 py-3 rounded-full"
            >
              <Text className="text-white font-rubik-bold">Explore Properties</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="p-2 gap-2">
            {filteredBookings.map((booking) => (
              <TouchableOpacity
                key={booking.$id}
                onPress={() => router.push(`/(root)/propreties/${booking.propertyId}`)}
                className="bg-white border border-gray-200 rounded-2xl p-2 shadow-sm"
              >
                {/* Role badge: Owner vs Guest */}
                <View className="absolute right-4 top-2 z-10">
                  <View className={`px-2 py-1 rounded-full ${booking.agent?.$id === currentUser?.$id ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Text className={`${booking.agent?.$id === currentUser?.$id ? 'text-primary-300' : 'text-black-200'} text-xs font-rubik-medium`}>
                      {booking.agent?.$id === currentUser?.$id ? 'Owner' : 'Guest'}
                    </Text>
                  </View>
                </View>
                {/* Property Info */}
                {booking.property && (
                  <View className="mb-2">
                    <Text className="text-lg font-rubik-bold text-black-300">
                      {booking.property.name}
                    </Text>
                    <Text className="text-sm font-rubik text-black-200 mt-1">
                      {booking.property.address}
                    </Text>
                    {booking.agent?.name && (
                      <Text className="text-xs font-rubik text-black-200 mt-1">
                        Rented from {booking.agent.name}
                      </Text>
                    )}
                  </View>
                )}

                {/* Dates */}
                <View className="flex-row justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-xs font-rubik text-black-200 mb-1">Check-in</Text>
                    <Text className="text-sm font-rubik-semibold text-black-300">
                      {new Date(booking.checkInDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-rubik text-black-200 mb-1">Check-out</Text>
                    <Text className="text-sm font-rubik-semibold text-black-300">
                      {new Date(booking.checkOutDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View className="flex-row justify-between mb-2">
                  <View>
                    <Text className="text-xs font-rubik text-black-200">Guests</Text>
                    <Text className="text-sm font-rubik-semibold text-black-300">
                      {booking.numberOfGuests}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs font-rubik text-black-200">Nights</Text>
                    <Text className="text-sm font-rubik-semibold text-black-300">
                      {booking.numberOfNights}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs font-rubik text-black-200">Total</Text>
                    <Text className="text-sm font-rubik-bold text-primary-300">
                      ${booking.totalPrice.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Status Badges */}
                <View className="flex-row gap-2 mb-2">
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                    <Text className="text-xs font-rubik-medium capitalize">
                      {booking.status}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${getPaymentStatusColor(
                      booking.paymentStatus
                    )}`}
                  >
                    <Text className="text-xs font-rubik-medium capitalize">
                      {booking.paymentStatus}
                    </Text>
                  </View>
                </View>

                {/* Rejection Reason */}
                {booking.status === "rejected" && booking.rejectionReason && (
                  <View className="bg-red-50 p-2 rounded-lg mb-2">
                    <Text className="text-xs font-rubik-medium text-red-800 mb-1">
                      Rejection Reason:
                    </Text>
                    <Text className="text-sm font-rubik text-red-700">
                      {booking.rejectionReason}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row gap-2">
                  {booking.status === "confirmed" && booking.paymentStatus === "unpaid" && (
                    <TouchableOpacity
                      onPress={() => {
                        (async () => {
                          try {
                            const user = await getCurrentUser();
                            if (!user) {
                              router.push('/sign-in' as any);
                              return;
                            }
                            await createPaymentRecord({
                              bookingId: booking.$id,
                              userId: user.$id,
                              amount: booking.totalPrice,
                            } as any);
                            Alert.alert('Success', 'Payment completed');
                            loadBookings();
                          } catch (e) {
                            console.error('Payment error', e);
                            Alert.alert('Error', 'Payment failed');
                          }
                        })();
                      }}
                      className="flex-1 bg-primary-300 py-1.5 rounded-full"
                    >
                      <Text className="text-white text-center font-rubik-bold text-sm">
                        Pay Now
                      </Text>
                    </TouchableOpacity>
                  )}

                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <TouchableOpacity
                      onPress={() => handleCancelBooking(booking.$id, booking)}
                      className="flex-1 bg-red-500 py-1.5 rounded-full"
                    >
                      <Text className="text-white text-center font-rubik-bold text-sm">
                        Cancel Booking
                      </Text>
                    </TouchableOpacity>
                  )}

                  {booking.status === "completed" && (
                    <TouchableOpacity className="flex-1 bg-primary-100 py-2 rounded-full">
                      <Text className="text-primary-300 text-center font-rubik-bold text-sm">
                        Leave Review
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Special Requests */}
                {booking.specialRequests && (
                    <View className="mt-2 pt-2 border-t border-gray-200">
                    <Text className="text-xs font-rubik-medium text-black-200 mb-1">
                      Special Requests:
                    </Text>
                    <Text className="text-sm font-rubik text-black-300">
                      {booking.specialRequests}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
