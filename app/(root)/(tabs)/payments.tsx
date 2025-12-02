import icons from "@/constants/icons";
import { BookingDocument, PaymentDocument, PayoutDocument, getAgentPayments, getAgentPayouts, getUserPayments } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const statusBadge = (status: string) => {
  switch (status) {
    case "succeeded":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
      return "bg-red-100 text-red-700";
    case "refunded":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const formatCurrency = (value: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const formatStayRange = (booking?: BookingDocument) => {
  if (!booking?.checkInDate || !booking?.checkOutDate) return null;
  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const sameYear = checkIn.getFullYear() === checkOut.getFullYear();
  const inStr = checkIn.toLocaleDateString(undefined, options);
  const outStr = checkOut.toLocaleDateString(undefined, options);
  const year = checkOut.getFullYear();
  return sameYear ? `${inStr} - ${outStr}, ${year}` : `${inStr} ${checkIn.getFullYear()} - ${outStr} ${year}`;
};

const shortId = (id: string) => (id ? `#${id.slice(-6).toUpperCase()}` : "");

const parseGatewayMeta = (payment: PaymentDocument): Record<string, any> => {
  if (!payment.gatewayResponse) return {};
  try {
    return JSON.parse(payment.gatewayResponse);
  } catch {
    return {};
  }
};

const formatMethodLabel = (payment: PaymentDocument) => {
  const method = payment.paymentMethod;
  if (method === "card") {
    const meta = parseGatewayMeta(payment);
    return meta.last4 ? `Card •••• ${meta.last4}` : "Card";
  }
  if (method === "cash") return "Pay on arrival";
  if (method === "bank_transfer") return "Bank transfer";
  return method.replace(/_/g, " ");
};

const isConfirmedBooking = (payment: PaymentDocument) => {
  const bookingStatus = payment.booking?.status;
  return bookingStatus === "confirmed" || bookingStatus === "completed";
};

export default function PaymentsScreen() {
  const { user } = useGlobalContext();
  const [view, setView] = useState<"history" | "earnings">("history");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<PaymentDocument[]>([]);
  const [agentPayments, setAgentPaymentsState] = useState<PaymentDocument[]>([]);
  const [payouts, setPayouts] = useState<PayoutDocument[]>([]);

  const loadPayments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [userPaymentsRes, agentPaymentsRes, agentPayoutsRes] = await Promise.all([
        getUserPayments(user.$id),
        getAgentPayments(user.$id),
        getAgentPayouts(user.$id),
      ]);
      setHistory(userPaymentsRes);
      setAgentPaymentsState(agentPaymentsRes);
      setPayouts(agentPayoutsRes);
    } catch (error) {
      console.error("Payments load error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPayments();
    } else {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = () => {
    if (!user) return;
    setRefreshing(true);
    loadPayments();
  };

  const confirmedAgentPayments = useMemo(() => {
    return agentPayments.filter((payment) => payment.status === "succeeded" && isConfirmedBooking(payment));
  }, [agentPayments]);

  const totalEarned = useMemo(() => {
    return confirmedAgentPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [confirmedAgentPayments]);

  const pendingPayouts = useMemo(() => {
    return payouts.filter((p) => p.status !== "completed").reduce((sum, p) => sum + p.amount, 0);
  }, [payouts]);

  const nextPayoutDate = useMemo(() => {
    const pending = payouts
      .filter((p) => p.status === "pending" || p.status === "processing")
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    return pending[0]?.scheduledDate;
  }, [payouts]);

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Image source={icons.wallet} className="w-24 h-24 mb-6" tintColor="#B0B8C1" />
        <Text className="text-2xl font-rubik-bold text-black-300 mb-2">Login required</Text>
        <Text className="text-center text-black-200 font-rubik mb-6">
          Sign in to review your payments and earnings.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/sign-in")}
          className="bg-primary-300 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-rubik-bold">Sign in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0061FF" />
      </SafeAreaView>
    );
  }

  const renderHistory = () => (
    <View className="px-5 pb-10">
      {history.length === 0 ? (
        <View className="items-center mt-20">
          <Image source={icons.wallet} className="w-16 h-16 mb-4" tintColor="#C5CED8" />
          <Text className="text-base font-rubik-medium text-black-200 text-center">
            You have no payments yet.
          </Text>
        </View>
      ) : (
        history.map((payment) => {
          const propertyName = payment.booking?.property?.name;
          const propertyAddress = payment.booking?.property?.address;
          const stayRange = formatStayRange(payment.booking);
          const methodLabel = formatMethodLabel(payment);
          return (
          <View key={payment.$id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-rubik-bold text-black-300">
                {formatCurrency(payment.amount, payment.currency)}
              </Text>
              <View className={`px-3 py-1 rounded-full ${statusBadge(payment.status)}`}>
                <Text className="text-xs font-rubik-medium capitalize">{payment.status}</Text>
              </View>
            </View>
            <Text className="text-sm font-rubik-medium text-black-300 mb-1">{methodLabel}</Text>
            <Text className="text-xs font-rubik text-black-200">
              {new Date(payment.$createdAt).toLocaleDateString()} · Transaction {payment.transactionId}
            </Text>
            <View className="mt-3 pt-3 border-t border-gray-100 gap-1">
              <Text className="text-xs font-rubik text-black-200">Booking</Text>
              <Text className="text-sm font-rubik-bold text-black-300" numberOfLines={1}>
                {propertyName || `Booking ${shortId(payment.bookingId)}`}
              </Text>
              {stayRange && (
                <Text className="text-xs font-rubik text-black-200">{stayRange}</Text>
              )}
              {propertyAddress && (
                <Text className="text-xs font-rubik text-black-200" numberOfLines={1}>
                  {propertyAddress}
                </Text>
              )}
            </View>
          </View>
        );
        })
      )}
    </View>
  );

  const renderEarnings = () => (
    <View className="px-5 pb-16">
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-primary-50 border border-primary-100 rounded-2xl p-4">
          <Text className="text-xs font-rubik-medium text-primary-300">Total earned</Text>
          <Text className="text-2xl font-rubik-bold text-black-300 mt-1">
            {formatCurrency(totalEarned)}
          </Text>
        </View>
        <View className="flex-1 bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
          <Text className="text-xs font-rubik-medium text-yellow-700">Pending payouts</Text>
          <Text className="text-2xl font-rubik-bold text-black-300 mt-1">
            {formatCurrency(pendingPayouts)}
          </Text>
        </View>
      </View>

      <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
        <Text className="text-base font-rubik-bold text-black-300">Upcoming payout</Text>
        <Text className="text-sm font-rubik text-black-200 mt-1">
          {nextPayoutDate
            ? new Date(nextPayoutDate).toLocaleDateString()
            : "No payout scheduled"}
        </Text>
        <Text className="text-xs font-rubik text-black-200 mt-2">
          Track when funds will arrive in your account.
        </Text>
      </View>

      <Text className="text-base font-rubik-bold text-black-300 mb-3">Recent payouts</Text>
      {payouts.length === 0 ? (
        <Text className="text-sm font-rubik text-black-200 mb-6">
          No payouts have been generated yet.
        </Text>
      ) : (
        payouts.slice(0, 4).map((payout) => (
          <View key={payout.$id} className="border border-gray-100 rounded-2xl p-4 mb-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-lg font-rubik-bold text-black-300">
                {formatCurrency(payout.amount, payout.currency)}
              </Text>
              <Text className={`text-xs font-rubik-medium ${
                payout.status === "completed" ? "text-green-700" : "text-yellow-700"
              }`}>
                {payout.status}
              </Text>
            </View>
            <Text className="text-xs font-rubik text-black-200">
              Scheduled {new Date(payout.scheduledDate).toLocaleDateString()}
            </Text>
            {payout.completedDate && (
              <Text className="text-xs font-rubik text-black-200">
                Completed {new Date(payout.completedDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        ))
      )}

      <Text className="text-base font-rubik-bold text-black-300 mt-6 mb-3">Latest guest payments</Text>
      {agentPayments.length === 0 ? (
        <Text className="text-sm font-rubik text-black-200">
          No one has paid for your listings yet.
        </Text>
      ) : (
        agentPayments.slice(0, 6).map((payment) => {
          const stayRange = formatStayRange(payment.booking);
          return (
          <View key={payment.$id} className="flex-row items-center justify-between border-b border-gray-100 py-3">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-rubik-bold text-black-300">
                {payment.booking?.guest?.name || payment.userId}
              </Text>
              <Text className="text-xs font-rubik text-black-200" numberOfLines={1}>
                {payment.booking?.property?.name || `Booking ${shortId(payment.bookingId)}`}
              </Text>
              {stayRange && (
                <Text className="text-xs font-rubik text-black-200">{stayRange}</Text>
              )}
            </View>
            <View className="items-end">
              <Text className="text-sm font-rubik-bold text-black-300">
                {formatCurrency(payment.amount, payment.currency)}
              </Text>
              <Text className="text-xs font-rubik text-black-200">
                {new Date(payment.$createdAt).toLocaleDateString()}
              </Text>
              <Text className="text-[11px] font-rubik-medium text-black-200 capitalize">
                {payment.status}
              </Text>
            </View>
          </View>
        );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-rubik-bold text-black-300">Payments</Text>
        <Text className="text-sm font-rubik text-black-200 mt-1">
          Manage your bookings and earnings in one place
        </Text>
      </View>

      <View className="flex-row gap-2 px-5 mb-3 mt-2">
        {["history", "earnings"].map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => setView(mode as any)}
            className={`flex-1 py-3 rounded-full border ${
              view === mode ? "bg-primary-300 border-primary-300" : "border-gray-200"
            }`}
          >
            <Text
              className={`text-center font-rubik-medium ${
                view === mode ? "text-white" : "text-black-300"
              }`}
            >
              {mode === "history" ? "Payment history" : "Agent earnings"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {view === "history" ? renderHistory() : renderEarnings()}
      </ScrollView>
    </SafeAreaView>
  );
}
