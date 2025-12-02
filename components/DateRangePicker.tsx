import { calculateBookingPrice } from '@/lib/appwrite';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

interface DateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectDates: (checkIn: string, checkOut: string, priceDetails: PriceDetails) => void;
  pricePerNight: number;
  unavailableDates?: string[]; // Array of dates in 'YYYY-MM-DD' format
  minDate?: string;
}

interface PriceDetails {
  numberOfNights: number;
  subtotal: number;
  serviceFee: number;
  totalPrice: number;
}

export default function DateRangePicker({
  visible,
  onClose,
  onSelectDates,
  pricePerNight,
  unavailableDates = [],
  minDate,
}: DateRangePickerProps) {
  const [checkInDate, setCheckInDate] = useState<string>('');
  const [checkOutDate, setCheckOutDate] = useState<string>('');

  // Get today's date or minDate as minimum selectable date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minimumDate = minDate || today.toISOString().split('T')[0];

  // Create marked dates object for calendar
  const getMarkedDates = () => {
    const marked: any = {};

    // Mark unavailable dates
    unavailableDates.forEach((date) => {
      marked[date] = {
        disabled: true,
        disableTouchEvent: true,
        color: '#e0e0e0',
        textColor: '#999',
      };
    });

    // Mark selected range
    if (checkInDate && !checkOutDate) {
      marked[checkInDate] = {
        startingDay: true,
        color: '#2563eb',
        textColor: 'white',
      };
    } else if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const current = new Date(start);

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        
        if (dateStr === checkInDate) {
          marked[dateStr] = {
            startingDay: true,
            color: '#2563eb',
            textColor: 'white',
          };
        } else if (dateStr === checkOutDate) {
          marked[dateStr] = {
            endingDay: true,
            color: '#2563eb',
            textColor: 'white',
          };
        } else {
          marked[dateStr] = {
            color: '#93c5fd',
            textColor: 'white',
          };
        }

        current.setDate(current.getDate() + 1);
      }
    }

    return marked;
  };

  const handleDayPress = (day: DateData) => {
    const selectedDate = day.dateString;

    // Check if date is unavailable
    if (unavailableDates.includes(selectedDate)) {
      return;
    }

    // If no check-in selected, or resetting selection
    if (!checkInDate || (checkInDate && checkOutDate)) {
      setCheckInDate(selectedDate);
      setCheckOutDate('');
    } 
    // If check-in selected, select check-out
    else if (checkInDate && !checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(selectedDate);

      // Ensure check-out is after check-in
      if (checkOut <= checkIn) {
        // Reset and start over
        setCheckInDate(selectedDate);
        setCheckOutDate('');
      } else {
        // Check if any unavailable dates are in the range
        let hasUnavailableDates = false;
        const current = new Date(checkIn);
        current.setDate(current.getDate() + 1); // Start from day after check-in

        while (current < checkOut) {
          const dateStr = current.toISOString().split('T')[0];
          if (unavailableDates.includes(dateStr)) {
            hasUnavailableDates = true;
            break;
          }
          current.setDate(current.getDate() + 1);
        }

        if (hasUnavailableDates) {
          // Reset selection
          setCheckInDate(selectedDate);
          setCheckOutDate('');
        } else {
          setCheckOutDate(selectedDate);
        }
      }
    }
  };

  const handleConfirm = () => {
    if (checkInDate && checkOutDate) {
      const priceDetails = calculateBookingPrice(pricePerNight, checkInDate, checkOutDate);
      onSelectDates(checkInDate, checkOutDate, priceDetails);
      onClose();
    }
  };

  const handleClear = () => {
    setCheckInDate('');
    setCheckOutDate('');
  };

  const priceDetails = checkInDate && checkOutDate 
    ? calculateBookingPrice(pricePerNight, checkInDate, checkOutDate)
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Select Dates</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Calendar
              markedDates={getMarkedDates()}
              markingType="period"
              onDayPress={handleDayPress}
              minDate={minimumDate}
              theme={{
                todayTextColor: '#2563eb',
                arrowColor: '#2563eb',
                monthTextColor: '#1e40af',
                textMonthFontWeight: 'bold',
              }}
              style={styles.calendar}
            />

            <View style={styles.dateDisplay}>
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>Check-in</Text>
                <Text style={styles.dateValue}>
                  {checkInDate || 'Select date'}
                </Text>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>Check-out</Text>
                <Text style={styles.dateValue}>
                  {checkOutDate || 'Select date'}
                </Text>
              </View>
            </View>

            {priceDetails && (
              <View style={styles.priceBreakdown}>
                <Text style={styles.breakdownTitle}>Price Breakdown</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    ${pricePerNight} × {priceDetails.numberOfNights} nights
                  </Text>
                  <Text style={styles.priceValue}>${priceDetails.subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Service fee (10%)</Text>
                  <Text style={styles.priceValue}>${priceDetails.serviceFee.toFixed(2)}</Text>
                </View>
                <View style={[styles.priceRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${priceDetails.totalPrice.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.clearButton]}
                onPress={handleClear}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  (!checkInDate || !checkOutDate) && styles.disabledButton,
                ]}
                onPress={handleConfirm}
                disabled={!checkInDate || !checkOutDate}
              >
                <Text style={styles.confirmButtonText}>Confirm Dates</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  calendar: {
    paddingHorizontal: 10,
  },
  dateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  dateBox: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  priceBreakdown: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 10,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f3f4f6',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
});
