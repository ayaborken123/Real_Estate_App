import PaymentMethodSheet, { PaymentMethod } from "@/components/PaymentMethodSheet";
import icons from "@/constants/icons";
import {
    BookingDocument,
    cancelBooking,
    createPaymentRecord,
    getCurrentUser,
    getUserBookings,
} from "@/lib/appwrite";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
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
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [bookingToPay, setBookingToPay] = useState<BookingDocument | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleViewAgentProfile = (agentId?: string) => {
    if (!agentId) {
      Alert.alert("Unavailable", "Host profile is not accessible right now.");
      return;
    }

    router.push({
      pathname: "/agent-profile/[id]",
      params: { id: agentId },
    });
  };

  const handleEmailPress = (email?: string) => {
    if (!email) {
      Alert.alert("Unavailable", "Host email not available.");
      return;
    }

    Alert.alert(
      "Contact host",
      email,
      [
        {
          text: "Copy email",
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(email);
              Alert.alert("Copied", "Email copied to clipboard.");
            } catch {
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
            } catch {
              Alert.alert("Error", "Unable to launch the email app.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const handlePhonePress = async (phone?: string) => {
    if (!phone) {
      Alert.alert("Unavailable", "Host phone number not available.");
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
    } catch {
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
    if (booking.paymentStatus === "paid") {
      Alert.alert("Contact host", "This booking is already paid and confirmed. Please reach out to the host to request any changes.");
      return;
    }
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

  const extractAgentId = (booking: BookingDocument) => {
    if (!booking) return undefined;
    if (typeof booking.agentId === "string") return booking.agentId;
    if (booking.agentId && typeof booking.agentId === "object" && "$id" in booking.agentId) {
      return (booking.agentId as any).$id;
    }
    if (booking.agent && typeof booking.agent === "object" && booking.agent.$id) {
      return booking.agent.$id;
    }
    return undefined;
  };

  const openPaymentSheet = (booking: BookingDocument) => {
    setBookingToPay(booking);
    setPaymentSheetVisible(true);
  };

  const handlePaymentConfirm = async ({ method, card }: { method: PaymentMethod; card?: { number: string } }) => {
    if (!bookingToPay || !currentUser) return;
    const agentId = extractAgentId(bookingToPay);
    if (!agentId) {
      Alert.alert("Error", "Unable to find host for this booking.");
      return;
    }

    try {
      setProcessingPayment(true);
      const status = method === "card" ? "succeeded" : "pending";
      const lastFour = card?.number ? card.number.replace(/\s+/g, "").slice(-4) : undefined;

      await createPaymentRecord({
        bookingId: bookingToPay.$id,
        userId: currentUser.$id,
        agentId,
        amount: bookingToPay.totalPrice,
        paymentMethod: method,
        paymentGateway: method === "card" ? "mock-card" : method,
        transactionId: `PAY-${Date.now()}`,
        status,
        gatewayResponse: lastFour ? JSON.stringify({ last4: lastFour }) : undefined,
      });

      const message =
        method === "card"
          ? "Payment completed successfully"
          : "We saved your payment preference. The host will share the remaining instructions.";
      Alert.alert("Success", message);
      setPaymentSheetVisible(false);
      setBookingToPay(null);
      loadBookings();
    } catch (error: any) {
      console.error("Payment error", error);
      Alert.alert("Error", error?.message || "Payment failed");
    } finally {
      setProcessingPayment(false);
    }
  };

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
        <Text className="text-2xl font-rubik-bold text-black-300">My Bookings</Text>
        <Text className="text-sm font-rubik text-black-200 mt-1">Your rental reservations</Text>
      </View>

      <View className="flex-row items-center gap-2 px-4 mb-2 mt-5">
        {["all", "pending", "confirmed", "cancelled"].map((status) => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilter(status as any)}
            className={`px-5 py-2 rounded-full ${
              filter === status ? "bg-primary-300" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-rubik-medium capitalize ${
                filter === status ? "text-white" : "text-black-300"
              }`}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
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
          <View className="px-4 gap-3">
            {filteredBookings.map((booking) => {
              const propertyTitle =
                booking.property?.name ??
                (booking.propertyId ? `Listing ${booking.propertyId.slice(-6)}` : "Property");
              const hostId = booking.agent?.$id || booking.agentId;
              const hostName = booking.agent?.name || "Your host";
              const hostEmail = booking.agent?.email;
              const hostPhone = booking.agent?.phone;
              const hostEmailDisplay = hostEmail || "Not provided";
              const hostPhoneDisplay = hostPhone || "Not provided";

              return (
                <View
                  key={booking.$id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                >
                  {(booking.property || booking.propertyId) && (
                    <View className="flex-row items-start justify-between mb-4">
                      <View className="flex-row items-center gap-3 flex-1">
                        <TouchableOpacity
                          onPress={() => router.push(`/(root)/propreties/${booking.propertyId}`)}
                          className="w-11 h-11 rounded-2xl bg-primary-50 items-center justify-center"
                        >
                          <Text className="text-xl">🏠</Text>
                        </TouchableOpacity>
                        <View className="flex-1">
                          <Text className="text-[11px] font-rubik-medium text-primary-300 uppercase tracking-wide">
                            Your stay
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

                  {booking.agent && (
                    <View className="bg-gray-50 border border-gray-100 rounded-2xl p-3 mb-4">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleViewAgentProfile(hostId)}
                        className="flex-row items-center gap-3 mb-3"
                      >
                        {booking.agent.avatar ? (
                          <Image source={{ uri: booking.agent.avatar }} className="w-12 h-12 rounded-full" />
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center">
                            <Text className="text-primary-300 font-rubik-bold text-lg">
                              {hostName?.[0] || "?"}
                            </Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-xs font-rubik-medium text-black-200">Host contact</Text>
                          <Text className="text-base font-rubik-bold text-black-300" numberOfLines={1}>
                            {hostName}
                          </Text>
                          <Text className="text-[11px] font-rubik text-primary-300">Tap to view profile</Text>
                        </View>
                      </TouchableOpacity>
                      <View className="flex-row gap-3">
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => handleEmailPress(hostEmail)}
                          className="flex-1"
                        >
                          <View className="flex-row items-center bg-white rounded-xl px-3 py-2 border border-gray-100">
                            <Text className="text-primary-300 font-rubik-bold mr-2">@</Text>
                            <View className="flex-1">
                              <Text className="text-[11px] font-rubik text-black-200">Email</Text>
                              <Text className="text-sm font-rubik-medium text-black-300" numberOfLines={1}>
                                {hostEmailDisplay}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => handlePhonePress(hostPhone)}
                          className="flex-1"
                        >
                          <View className="flex-row items-center bg-white rounded-xl px-3 py-2 border border-gray-100">
                            <Text className="text-primary-300 font-rubik-bold mr-2">☎</Text>
                            <View className="flex-1">
                              <Text className="text-[11px] font-rubik text-black-200">Phone</Text>
                              <Text className="text-sm font-rubik-medium text-black-300" numberOfLines={1}>
                                {hostPhoneDisplay}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View>
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
                        <Text className="text-xs font-rubik text-black-200">Status</Text>
                        <Text className="text-sm font-rubik-semibold text-black-300 capitalize">
                          {booking.status}
                        </Text>
                      </View>
                    </View>

                    {booking.status === "rejected" && booking.rejectionReason && (
                      <View className="bg-red-50 p-2 rounded-lg mb-3">
                        <Text className="text-xs font-rubik-medium text-red-800 mb-1">
                          Rejection Reason:
                        </Text>
                        <Text className="text-sm font-rubik text-red-700">
                          {booking.rejectionReason}
                        </Text>
                      </View>
                    )}

                    <View className="flex-row gap-2">
                      {booking.status === "confirmed" && booking.paymentStatus === "unpaid" && (
                        <TouchableOpacity
                          onPress={() => openPaymentSheet(booking)}
                          className="flex-1 bg-primary-300 py-1.5 rounded-full"
                        >
                          <Text className="text-white text-center font-rubik-bold text-sm">
                            Pay Now
                          </Text>
                        </TouchableOpacity>
                      )}

                      {(booking.status === "pending" || booking.status === "confirmed") &&
                        booking.paymentStatus !== "paid" && (
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

                    {booking.specialRequests && (
                      <View className="mt-3 pt-3 border-t border-gray-200">
                        <Text className="text-xs font-rubik-medium text-black-200 mb-1">
                          Special Requests:
                        </Text>
                        <Text className="text-sm font-rubik text-black-300">
                          {booking.specialRequests}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <PaymentMethodSheet
        visible={paymentSheetVisible}
        amount={bookingToPay?.totalPrice || 0}
        subtitle={bookingToPay ? `${new Date(bookingToPay.checkInDate).toLocaleDateString()} → ${new Date(bookingToPay.checkOutDate).toLocaleDateString()}` : undefined}
        busy={processingPayment}
        onClose={() => {
          if (processingPayment) return;
          setPaymentSheetVisible(false);
          setBookingToPay(null);
        }}
        onConfirm={handlePaymentConfirm}
      />
    </SafeAreaView>
  );
}
