import icons from "@/constants/icons";
import { deleteReview, ReviewDocument, toggleReviewLike } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import React, { useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";

/**
 * ReviewCard Component
 * Displays a single review with user info, rating, comment, and like functionality
 * 
 * Features:
 * - Shows user avatar, name, and rating
 * - Displays review comment with edit indicator if edited
 * - Like/unlike functionality with count
 * - Edit/Delete buttons for review owner
 * - Timestamp showing when review was created
 */

interface ReviewCardProps {
  review: ReviewDocument;
  onEdit?: (review: ReviewDocument) => void;
  onDelete?: (reviewId: string) => void;
  onLikeUpdate?: () => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ 
  review, 
  onEdit, 
  onDelete,
  onLikeUpdate 
}) => {
  const { user } = useGlobalContext();
  const [isLiking, setIsLiking] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(review.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(
    user ? review.likes?.includes(user.$id) : false
  );

  const isOwner = user?.$id === review.userId;

  // Handle like/unlike
  const handleLike = async () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to like reviews");
      return;
    }

    setIsLiking(true);
    
    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLocalLikesCount(prev => newIsLiked ? prev + 1 : prev - 1);

    try {
      await toggleReviewLike(review.$id);
      onLikeUpdate?.();
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(!newIsLiked);
      setLocalLikesCount(prev => newIsLiked ? prev - 1 : prev + 1);
      Alert.alert("Error", "Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  // Handle delete
  const handleDelete = () => {
    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete this review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReview(review.$id);
              onDelete?.(review.$id);
              Alert.alert("Success", "Review deleted successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to delete review");
            }
          },
        },
      ]
    );
  };

  // Render star rating
  const renderStars = () => {
    return (
      <View className="flex-row items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Image
            key={star}
            source={icons.star}
            className="w-4 h-4"
            style={{
              tintColor: star <= review.rating ? "#FFD700" : "#D1D5DB",
            }}
          />
        ))}
      </View>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <View className="bg-white p-4 rounded-xl border border-gray-200 mb-3">
      {/* User Info & Rating */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1">
          <Image
            source={{ 
              uri: review.user?.avatar || "https://via.placeholder.com/40" 
            }}
            className="w-10 h-10 rounded-full mr-3"
          />
          <View className="flex-1">
            <Text className="text-base font-rubik-bold text-black-300">
              {review.user?.name || "Unknown User"}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              {renderStars()}
              <Text className="text-xs text-gray-500 ml-1">
                {formatDate(review.$createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Owner Actions */}
        {isOwner && (
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => onEdit?.(review)}
              className="p-2"
            >
              <Image source={icons.edit} className="w-5 h-5" tintColor="#0061FF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="p-2"
            >
              <Text className="text-red-500 text-xl font-rubik-bold">×</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Comment */}
      <Text className="text-sm text-black-200 font-rubik mb-3">
        {review.comment}
      </Text>

      {/* Edited Indicator */}
      {review.isEdited && (
        <Text className="text-xs text-gray-400 italic mb-2">
          Edited {review.editedAt ? formatDate(review.editedAt) : ""}
        </Text>
      )}

      {/* Like Button */}
      <View className="flex-row items-center pt-3 border-t border-gray-100">
        <TouchableOpacity
          onPress={handleLike}
          disabled={isLiking}
          className="flex-row items-center gap-1"
        >
          <Image
            source={icons.heart}
            className="w-5 h-5"
            style={{
              tintColor: isLiked ? "#EF4444" : "#9CA3AF",
            }}
          />
          <Text className={`text-sm font-rubik-medium ${
            isLiked ? "text-red-500" : "text-gray-500"
          }`}>
            {localLikesCount} {localLikesCount === 1 ? "Like" : "Likes"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ReviewCard;
