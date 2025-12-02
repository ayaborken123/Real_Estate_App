import icons from "@/constants/icons";
import {
    BookingDocument,
    getAgentBookings,
    getCurrentUser,
    updateBookingStatus,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import * as Clipboard from "expo-clipboard";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
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

  const handleViewGuestProfile = (guestId?: string) => {
    if (!guestId) {
      Alert.alert("Unavailable", "Guest profile is not accessible right now.");
      return;
    }

    router.push({
      pathname: "/agent-profile/[id]",
      params: { id: guestId },
    });
  };

  const handleEmailPress = (email: string) => {
    if (!email || email === "Not provided") {
      Alert.alert("Unavailable", "Guest email not available.");
      return;
    }

    Alert.alert(
      "Contact guest",
      email,
      [
        {
          text: "Copy email",
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(email);
              Alert.alert("Copied", "Email copied to clipboard.");
            } catch (error) {
              Alert.alert("Error", "Unable to copy email.");
            }
          },
        },
        {
          text: "Send email",
          onPress: async () => {
            const mailUrl = `mailto:${email}`;
            try {
              const canOpen = await Linking.canOpenURL(mailUrl);
              if (canOpen) {
                Linking.openURL(mailUrl);
              } else {
                Alert.alert("Unavailable", "No email app found on this device.");
              }
            } catch (error) {
              Alert.alert("Error", "Unable to launch the email app.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const handlePhonePress = async (phone: string) => {
    if (!phone || phone === "Not provided") {
      Alert.alert("Unavailable", "Guest phone number not available.");
      return;
    }

    const sanitizedPhone = phone.replace(/[^0-9+]/g, "");
    if (!sanitizedPhone) {
      Alert.alert("Invalid", "Phone number format is invalid.");
      return;
    }

    const scheme = Platform.OS === "ios" ? "telprompt" : "tel";
    const phoneUrl = `${scheme}:${sanitizedPhone}`;

    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert("Unsupported", "Phone calls are not supported on this device.");
      }
    } catch (error) {
      Alert.alert("Error", "Unable to start the phone call.");
    }
  };

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
    if (booking.paymentStatus === "paid") {
      Alert.alert("Already paid", "This booking was auto-confirmed because the guest paid online.");
      return;
    }
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
      <View className="px-5 pt-3 pb-2">
          <Text className="text-2xl font-rubik-bold text-black-300">
            Booking Requests
          </Text>
          <Text className="text-sm font-rubik text-black-200 mt-1">
            Manage bookings for your properties
          </Text>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row items-center gap-2 px-4 mb-2 mt-5 ">
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

      <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
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
            <View className="px-4 gap-3">
            {filteredBookings.map((booking) => {
              const propertyTitle =
                booking.property?.name ??
                (booking.propertyId ? `Listing ${booking.propertyId.slice(-6)}` : "Property");
              const guestEmail = booking.guest?.email || "Not provided";
              const guestPhone =
                booking.guest?.phone ||
                (booking.guest as any)?.phoneNumber ||
                "Not provided";

              return (
                <View
                key={booking.$id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
              >
                {/* Property Summary Row */}
                {(booking.property || booking.propertyId) && (
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-row items-center gap-3 flex-1">
                      <TouchableOpacity
                        onPress={() =>
                          router.push(`/(root)/propreties/${booking.propertyId}`)
                        }
                        className="w-11 h-11 rounded-2xl bg-primary-50 items-center justify-center"
                      >
                        <Text className="text-xl">🏡</Text>
                      </TouchableOpacity>
                      <View className="flex-1">
                        <Text className="text-[11px] font-rubik-medium text-primary-300 uppercase tracking-wide">
                          Your property
                        </Text>
                        <Text className="text-lg font-rubik-bold text-black-300" numberOfLines={1}>
                          {propertyTitle}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end gap-2">
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
                  </View>
                )}

                <View>
                {/* Guest Info Card */}
                {booking.guest && (
                  <View className="bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-4">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleViewGuestProfile(booking.guest?.$id || booking.guestId)}
                      className="flex-row items-center gap-3 mb-3"
                    >
                      {booking.guest.avatar ? (
                        <Image
                          source={{ uri: booking.guest.avatar }}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center">
                          <Text className="text-primary-300 font-rubik-bold text-lg">
                            {booking.guest.name?.[0] || "?"}
                          </Text>
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-xs font-rubik-medium text-black-200">Guest contact</Text>
                        <Text className="text-base font-rubik-bold text-black-300" numberOfLines={1}>
                          {booking.guest.name}
                        </Text>
                        <Text className="text-[11px] font-rubik text-primary-300">Tap to view profile</Text>
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleEmailPress(guestEmail)}
                        className="flex-1"
                      >
                        <View className="flex-row items-center bg-white rounded-xl px-3 py-2 border border-gray-100">
                          <Text className="text-primary-300 font-rubik-bold mr-2">@</Text>
                          <View className="flex-1">
                            <Text className="text-[11px] font-rubik text-black-200">Email</Text>
                            <Text className="text-sm font-rubik-medium text-black-300" numberOfLines={1}>
                              {guestEmail}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handlePhonePress(guestPhone)}
                        className="flex-1"
                      >
                        <View className="flex-row items-center bg-white rounded-xl px-3 py-2 border border-gray-100">
                          <Text className="text-primary-300 font-rubik-bold mr-2">☎</Text>
                          <View className="flex-1">
                            <Text className="text-[11px] font-rubik text-black-200">Phone</Text>
                            <Text className="text-sm font-rubik-medium text-black-300" numberOfLines={1}>
                              {guestPhone}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Dates */}
                <View className="flex-row gap-3 mb-3">
                  <View className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-3">
                    <Text className="text-[11px] font-rubik text-black-200 mb-1">Check-in</Text>
                    <Text className="text-sm font-rubik-semibold text-black-300">
                      {new Date(booking.checkInDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <View className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-3">
                    <Text className="text-[11px] font-rubik text-black-200 mb-1">Check-out</Text>
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
                <View className="flex-row flex-wrap gap-4 mb-3">
                  <View className="flex-1 min-w-[110px]">
                    <Text className="text-xs font-rubik text-black-200">Guests</Text>
                    <Text className="text-sm font-rubik-semibold text-black-300">
                      {booking.numberOfGuests}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[110px]">
                    <Text className="text-xs font-rubik text-black-200">Nights</Text>
                    <Text className="text-sm font-rubik-semibold text-black-300">
                      {booking.numberOfNights}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[110px]">
                    <Text className="text-xs font-rubik text-black-200">Total</Text>
                    <Text className="text-sm font-rubik-bold text-primary-300">
                      ${booking.totalPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-1 min-w-[110px]">
                    <Text className="text-xs font-rubik text-black-200">Your Earnings</Text>
                    <Text className="text-sm font-rubik-bold text-green-600">
                      ${booking.subtotal.toFixed(2)}
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
                {booking.status === "pending" && booking.paymentStatus !== "paid" && (
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
                <View className="mt-3 pt-3 border-t border-gray-200">
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
              </View>
              );
            })}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            >
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
