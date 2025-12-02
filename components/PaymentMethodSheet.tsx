import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export type PaymentMethod = "card" | "bank_transfer" | "cash";

interface CardDetails {
  holderName: string;
  number: string;
  expiry: string;
  cvv: string;
}

interface PaymentMethodSheetProps {
  visible: boolean;
  amount: number;
  currency?: string;
  title?: string;
  subtitle?: string;
  defaultMethod?: PaymentMethod;
  allowedMethods?: PaymentMethod[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: { method: PaymentMethod; card?: CardDetails }) => void;
}

const PAYMENT_METHODS: Record<PaymentMethod, { label: string; description: string; icon: string }> = {
  card: {
    label: "Card",
    description: "Pay now with credit or debit card",
    icon: "💳",
  },
  bank_transfer: {
    label: "Bank transfer",
    description: "We will email instructions after booking",
    icon: "🏦",
  },
  cash: {
    label: "Pay on arrival",
    description: "Settle directly with your host at check-in",
    icon: "💵",
  },
};

export function PaymentMethodSheet({
  visible,
  amount,
  currency = "USD",
  title = "Choose payment method",
  subtitle,
  defaultMethod = "card",
  allowedMethods,
  busy,
  onClose,
  onConfirm,
}: PaymentMethodSheetProps) {
  const methods = useMemo(() => {
    if (allowedMethods && allowedMethods.length > 0) {
      return allowedMethods;
    }
    return ["card", "bank_transfer", "cash"];
  }, [allowedMethods]);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(defaultMethod);
  const [card, setCard] = useState<CardDetails>({ holderName: "", number: "", expiry: "", cvv: "" });

  const cardValid = useMemo(() => {
    if (selectedMethod !== "card") {
      return true;
    }
    const trimmedNumber = card.number.replace(/\s+/g, "");
    const expiryMatch = card.expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    return (
      card.holderName.trim().length > 2 &&
      /^\d{16}$/.test(trimmedNumber) &&
      expiryMatch !== null &&
      /^\d{3,4}$/.test(card.cvv.trim())
    );
  }, [card, selectedMethod]);

  const handleConfirm = () => {
    if (!cardValid || busy) {
      return;
    }
    onConfirm({
      method: selectedMethod,
      card: selectedMethod === "card" ? card : undefined,
    });
  };

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-end">
        <View className="flex-1 bg-black/50" />
        <View className="bg-white rounded-t-3xl pt-5 px-5 pb-6">
          <View className="mb-4">
            <Text className="text-xl font-rubik-bold text-black-300">{title}</Text>
            <Text className="text-sm font-rubik text-black-200 mt-1">
              {subtitle || `Total due ${formatCurrency(amount)}`}
            </Text>
          </View>

          <ScrollView className="max-h-[320px]" keyboardShouldPersistTaps="handled">
            {methods.map((method) => {
              const data = PAYMENT_METHODS[method];
              return (
                <TouchableOpacity
                  key={method}
                  activeOpacity={0.9}
                  onPress={() => setSelectedMethod(method)}
                  className={`mb-3 border rounded-2xl p-4 ${selectedMethod === method ? "border-primary-300 bg-primary-50" : "border-gray-200"}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <Text className="text-2xl" accessible={false}>{data.icon}</Text>
                      <View className="flex-1">
                        <Text className="text-base font-rubik-bold text-black-300">{data.label}</Text>
                        <Text className="text-xs font-rubik text-black-200" numberOfLines={2}>
                          {data.description}
                        </Text>
                      </View>
                    </View>
                    <View
                      className={`w-5 h-5 rounded-full border ${selectedMethod === method ? "bg-primary-300 border-primary-300" : "border-gray-300"}`}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}

            {selectedMethod === "card" && (
              <View className="mt-2 mb-4">
                <Text className="text-sm font-rubik-medium text-black-200 mb-2">Card details</Text>
                <TextInput
                  placeholder="Name on card"
                  value={card.holderName}
                  onChangeText={(value) => setCard((prev) => ({ ...prev, holderName: value }))}
                  className="bg-gray-100 rounded-xl px-4 py-3 mb-2 font-rubik"
                  autoCapitalize="words"
                />
                <TextInput
                  placeholder="Card number"
                  keyboardType="number-pad"
                  value={card.number}
                  onChangeText={(value) => setCard((prev) => ({ ...prev, number: value.replace(/[^0-9 ]/g, "") }))}
                  className="bg-gray-100 rounded-xl px-4 py-3 mb-2 font-rubik"
                  maxLength={19}
                />
                <View className="flex-row gap-3">
                  <TextInput
                    placeholder="MM/YY"
                    keyboardType="number-pad"
                    value={card.expiry}
                    onChangeText={(value) => setCard((prev) => ({ ...prev, expiry: value.replace(/[^0-9/]/g, "") }))}
                    className="bg-gray-100 rounded-xl px-4 py-3 flex-1 font-rubik"
                    maxLength={5}
                  />
                  <TextInput
                    placeholder="CVV"
                    keyboardType="number-pad"
                    value={card.cvv}
                    onChangeText={(value) => setCard((prev) => ({ ...prev, cvv: value.replace(/[^0-9]/g, "") }))}
                    className="bg-gray-100 rounded-xl px-4 py-3 w-28 font-rubik"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>
            )}
          </ScrollView>

          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity onPress={onClose} className="flex-1 bg-gray-100 py-4 rounded-full">
              <Text className="text-center font-rubik-bold text-black-300">Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!cardValid || busy}
              className={`flex-1 py-4 rounded-full ${cardValid && !busy ? "bg-primary-300" : "bg-primary-200"}`}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center font-rubik-bold text-white">Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default PaymentMethodSheet;
