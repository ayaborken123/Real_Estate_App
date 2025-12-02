import icons from "@/constants/icons";
import {
    BookingDocument,
    getAgentBookings,
    getCurrentUser,
    updateBookingStatus,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BookingRequests() {
  const { user } = useGlobalContext();

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const router = useRouter();
  const [bookings, setBookings] = useState<BookingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("pending");
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  const loadBookings = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/sign-in" as any);
        return;
      }

      // Load bookings where current user is the agent (property owner)
      setCurrentUser(user);
      const fetchedBookings = await getAgentBookings(user.$id);
      setBookings(fetchedBookings);
    } catch (error: any) {
      console.error("Error loading booking requests:", error);
      const errorMsg = error?.message || "Failed to load booking requests";
      Alert.alert(
        "Permission Error",
        `${errorMsg}\n\nPlease configure permissions in Appwrite:\n1. Go to Bookings collection\n2. Settings → Permissions\n3. Add 'users' role with 'read' permission`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleAcceptBooking = async (booking: BookingDocument) => {
    try {
      setProcessingAction(true);
      await updateBookingStatus(booking.$id, "confirmed");
      Alert.alert("Success", "Booking accepted.");
      loadBookings();
    } catch (error) {
      console.error("Accept booking error", error);
      Alert.alert("Error", "Failed to accept booking");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectBooking = (booking: BookingDocument) => {
    setSelectedBooking(booking);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert("Required", "Please provide a reason for rejection");
      return;
    }

    if (!selectedBooking) return;

    try {
      setProcessingAction(true);
      await updateBookingStatus(
        selectedBooking.$id,
        "rejected",
        rejectionReason
      );
      Alert.alert(
        "Success",
        "Booking rejected. The guest has been notified."
      );
      setShowRejectModal(false);
      loadBookings();
    } catch (error) {
      Alert.alert("Error", "Failed to reject booking");
    } finally {
      setProcessingAction(false);
    }
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
      <View className="px-5 py-2 border-b border-gray-200">
          <Text className="text-2xl font-rubik-bold text-black-300">
            Booking Requests
          </Text>
          <Text className="text-sm font-rubik text-black-200 mt-0">
            Manage bookings for your properties
          </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-0 border-b border-gray-200"
          contentContainerStyle={{ paddingVertical: 0 }}
        >
          <View className="flex-row items-center gap-2">
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 100 }}
        >
        {filteredBookings.length === 0 ? (
            <View className="flex-1 items-center justify-center py-8">
              <Image source={icons.calendar} className="w-20 h-20 mb-4" tintColor="#999" />
              <Text className="text-lg font-rubik-medium text-black-200 mb-2">
                No {filter !== "all" ? filter : ""} booking requests
              </Text>
              <Text className="text-sm font-rubik text-black-200 text-center px-6">
                Booking requests for your properties will appear here
              </Text>
            </View>
          ) : (
            <View className="p-2 gap-2">
            {filteredBookings.map((booking) => (
              <View
                key={booking.$id}
                className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm relative"
              >
                {/* Role badge: Owner (you) or Guest */}
                <View className="absolute right-6 top-4 z-10">
                  <View className={`px-3 py-1 rounded-full ${booking.agent?.$id === currentUser?.$id ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <Text className={`${booking.agent?.$id === currentUser?.$id ? 'text-primary-300' : 'text-black-200'} text-xs font-rubik-medium`}>
                      {booking.agent?.$id === currentUser?.$id ? 'Owner' : 'Guest'}
                    </Text>
                  </View>
                </View>
                {/* Property Info */}
                {booking.property && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/(root)/propreties/${booking.propertyId}`)
                    }
                    className="mb-3"
                  >
                    <Text className="text-lg font-rubik-bold text-black-300">
                      {booking.property.name}
                    </Text>
                    <Text className="text-sm font-rubik text-black-200 mt-1">
                      {booking.property.address}
                    </Text>
                    {booking.agent?.$id === currentUser?.$id ? (
                      <Text className="text-xs font-rubik text-primary-300 mt-1">Your property</Text>
                    ) : (
                      booking.agent?.name && (
                        <Text className="text-xs font-rubik text-black-200 mt-1">Owner: {booking.agent.name}</Text>
                      )
                    )}
                  </TouchableOpacity>
                )}

                {/* Guest Info */}
                {booking.guest && (
                  <View className="bg-primary-50 p-3 rounded-lg mb-3">
                    <Text className="text-xs font-rubik-medium text-black-200 mb-1">
                      Guest
                    </Text>
                    <View className="flex-row items-center">
                      {booking.guest.avatar && (
                        <Image
                          source={{ uri: booking.guest.avatar }}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                      )}
                      <View className="flex-1">
                        <Text className="text-sm font-rubik-semibold text-black-300">
                          {booking.guest.name}
                        </Text>
                        <Text className="text-xs font-rubik text-black-200">
                          {booking.guest.email}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Dates */}
                <View className="flex-row justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-xs font-rubik text-black-200 mb-1">
                      Check-in
                    </Text>
                    <Text className="text-sm font-rubik-semibold text-black-300">
                      {new Date(booking.checkInDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-rubik text-black-200 mb-1">
                      Check-out
                    </Text>
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
                <View className="flex-row justify-between mb-3">
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
                  <View>
                    <Text className="text-xs font-rubik text-black-200">Your Earnings</Text>
                    <Text className="text-sm font-rubik-bold text-green-600">
                      ${booking.subtotal.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Status Badges */}
                <View className="flex-row gap-2 mb-3">
                  <View
                    className={`px-3 py-1 rounded-full ${getStatusColor(booking.status)}`}
                  >
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

                {/* Special Requests */}
                {booking.specialRequests && (
                  <View className="bg-blue-50 p-3 rounded-lg mb-3">
                    <Text className="text-xs font-rubik-medium text-blue-800 mb-1">
                      Special Requests:
                    </Text>
                    <Text className="text-sm font-rubik text-blue-700">
                      {booking.specialRequests}
                    </Text>
                  </View>
                )}

                {/* Rejection Reason (if rejected) */}
                {booking.status === "rejected" && booking.rejectionReason && (
                  <View className="bg-red-50 p-3 rounded-lg mb-3">
                    <Text className="text-xs font-rubik-medium text-red-800 mb-1">
                      Rejection Reason:
                    </Text>
                    <Text className="text-sm font-rubik text-red-700">
                      {booking.rejectionReason}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                {booking.status === "pending" && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleAcceptBooking(booking)}
                      disabled={processingAction}
                      className="flex-1 bg-green-500 py-3 rounded-full"
                    >
                      {processingAction ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-white text-center font-rubik-bold">
                          Accept
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRejectBooking(booking)}
                      disabled={processingAction}
                      className="flex-1 bg-red-500 py-3 rounded-full"
                    >
                      <Text className="text-white text-center font-rubik-bold">
                        Reject
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Booked time info */}
                <View className="mt-2 pt-2 border-t border-gray-200">
                  <Text className="text-xs font-rubik text-black-200">
                    Requested on{" "}
                    {new Date(booking.$createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5">
            <Text className="text-xl font-rubik-bold text-black-300 mb-4">
              Reject Booking Request
            </Text>

            {selectedBooking && (
              <View className="mb-4">
                <Text className="text-sm font-rubik text-black-200 mb-2">
                  Guest: {selectedBooking.guest?.name}
                </Text>
                <Text className="text-sm font-rubik text-black-200">
                  Dates: {new Date(selectedBooking.checkInDate).toLocaleDateString()} -{" "}
                  {new Date(selectedBooking.checkOutDate).toLocaleDateString()}
                </Text>
              </View>
            )}

            <Text className="text-sm font-rubik-medium text-black-300 mb-2">
              Reason for Rejection *
            </Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Please provide a reason (required)"
              multiline
              numberOfLines={4}
              className="bg-gray-100 rounded-xl p-4 text-black-300 font-rubik mb-4"
              style={{ textAlignVertical: "top" }}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-full"
              >
                <Text className="text-black-300 text-center font-rubik-bold">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRejection}
                disabled={processingAction}
                className="flex-1 bg-red-500 py-3 rounded-full"
              >
                {processingAction ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-rubik-bold">
                    Reject Booking
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
