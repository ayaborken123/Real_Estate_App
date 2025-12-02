import icons from "@/constants/icons";
import { createReview, ReviewDocument, updateReview } from "@/lib/appwrite";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * ReviewModal Component
 * Modal for creating or editing a review
 * 
 * Features:
 * - Star rating selector (1-5 stars)
 * - Text input for review comment
 * - Create new review or edit existing
 * - Validation for rating and comment
 * - Loading state during submission
 */

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  bookingId?: string;
  existingReview?: ReviewDocument | null;
  onSuccess?: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  propertyId,
  bookingId,
  existingReview,
  onSuccess,
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!existingReview;

  // Update form when existingReview changes
  React.useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment);
    } else {
      setRating(0);
      setComment("");
    }
  }, [existingReview]);

  // Reset form when modal closes
  const handleClose = () => {
    if (!isSubmitting) {
      if (!existingReview) {
        setRating(0);
        setComment("");
      }
      onClose();
    }
  };

  // Handle submit (create or update)
  const handleSubmit = async () => {
    // Validation
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a rating");
      return;
    }

    if (!comment.trim()) {
      Alert.alert("Comment Required", "Please write a review comment");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && existingReview) {
        // Update existing review
        await updateReview(existingReview.$id, {
          rating,
          comment: comment.trim(),
        });
        Alert.alert("Success", "Review updated successfully");
      } else {
        // Create new review
        await createReview({
          propertyId,
          bookingId,
          rating,
          comment: comment.trim(),
        });
        Alert.alert("Success", "Review posted successfully");
      }

      onSuccess?.();
      handleClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render star rating selector
  const renderStarSelector = () => {
    return (
      <View className="flex-row items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            disabled={isSubmitting}
            className="p-2"
          >
            <Image
              source={icons.star}
              className="w-10 h-10"
              style={{
                tintColor: star <= rating ? "#FFD700" : "#D1D5DB",
              }}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-2xl font-rubik-bold text-black-300">
              {isEditing ? "Edit Review" : "Write a Review"}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              className="p-2"
            >
              <Text className="text-gray-500 text-3xl font-rubik">×</Text>
            </TouchableOpacity>
          </View>

          {/* Star Rating */}
          <View className="mb-4">
            <Text className="text-base font-rubik-medium text-black-300 mb-3 text-center">
              Rate your experience
            </Text>
            {renderStarSelector()}
            {rating > 0 && (
              <Text className="text-sm font-rubik text-gray-500 text-center">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </Text>
            )}
          </View>

          {/* Comment Input */}
          <View className="mb-6">
            <Text className="text-base font-rubik-medium text-black-300 mb-2">
              Share your thoughts
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Tell us about your experience with this property..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="border border-gray-300 rounded-xl p-4 text-black-300 font-rubik"
              editable={!isSubmitting}
              maxLength={500}
            />
            <Text className="text-xs text-gray-500 mt-1 text-right">
              {comment.length}/500
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`py-4 rounded-full ${
              isSubmitting ? "bg-gray-300" : "bg-primary-300"
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-center text-lg font-rubik-bold">
                {isEditing ? "Update Review" : "Post Review"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ReviewModal;
