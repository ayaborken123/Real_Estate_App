import icons from "@/constants/icons";
import { getPropertyRating, getPropertyReviews, getUserReviewForProperty, ReviewDocument } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ReviewCard from "./ReviewCard";
import ReviewModal from "./ReviewModal";

/**
 * PropertyReviewsList Component
 * Displays all reviews for a property with ability to add/edit reviews
 * 
 * Features:
 * - Shows average rating and total review count
 * - Lists all reviews in chronological order
 * - Pull-to-refresh functionality
 * - "Write Review" button for users who haven't reviewed
 * - Edit button for user's own review
 * - Empty state when no reviews exist
 */

interface PropertyReviewsListProps {
  propertyId: string;
  bookingId?: string;
  showWriteButton?: boolean; // Show "Write Review" button
  maxReviews?: number; // Limit number of reviews shown (undefined = show all)
  onReviewCountChange?: (count: number, average?: number) => void;
}

const PropertyReviewsList: React.FC<PropertyReviewsListProps> = ({
  propertyId,
  bookingId,
  showWriteButton = true,
  maxReviews,
  onReviewCountChange,
}) => {
  const { user } = useGlobalContext();
  const [reviews, setReviews] = useState<ReviewDocument[]>([]);
  const [userReview, setUserReview] = useState<ReviewDocument | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewDocument | null>(null);

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      const [reviewsData, ratingData, userReviewData] = await Promise.all([
        getPropertyReviews(propertyId),
        getPropertyRating(propertyId),
        user ? getUserReviewForProperty(propertyId) : Promise.resolve(null),
      ]);

      setReviews(reviewsData);
      setAverageRating(ratingData.average);
      setReviewCount(ratingData.count);
      setUserReview(userReviewData);
      onReviewCountChange?.(ratingData.count, ratingData.average);
    } catch (error: any) {
      // Silently handle missing collection - reviews feature not set up yet
      if (error?.message?.includes('Collection with the requested ID could not be found')) {
        console.log("Reviews collection not set up yet. Please create it in Appwrite Console.");
      } else {
        console.error("Error fetching reviews:", error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [propertyId, user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleReviewSuccess = () => {
    fetchReviews();
    setModalVisible(false);
    setEditingReview(null);
  };

  const handleEditReview = (review: ReviewDocument) => {
    setEditingReview(review);
    setModalVisible(true);
  };

  const handleDeleteReview = (reviewId: string) => {
    setReviews(prev => prev.filter(r => r.$id !== reviewId));
    fetchReviews(); // Refresh to update counts
  };

  const handleWriteReview = () => {
    setEditingReview(null);
    setModalVisible(true);
  };

  const displayedReviews = maxReviews ? reviews.slice(0, maxReviews) : reviews;

  if (loading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator size="large" color="#0061FF" />
      </View>
    );
  }

  return (
    <View className="mt-7">
      {/* Header with Rating Summary */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <Image source={icons.star} className="w-6 h-6" />
          <Text className="text-black-300 text-xl font-rubik-bold ml-2">
            {averageRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
          </Text>
        </View>

        {/* Write/Edit Review Button */}
        {showWriteButton && user && (
          <TouchableOpacity
            onPress={userReview ? () => handleEditReview(userReview) : handleWriteReview}
            className="bg-primary-300 px-4 py-2 rounded-full"
          >
            <Text className="text-white text-sm font-rubik-bold">
              {userReview ? "Edit Review" : "Write Review"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <View className="py-8 items-center">
          <Image source={icons.star} className="w-16 h-16 mb-4" tintColor="#D1D5DB" />
          <Text className="text-gray-400 text-base font-rubik-medium mb-2">
            No reviews yet
          </Text>
          <Text className="text-gray-400 text-sm font-rubik text-center px-8">
            Be the first to share your experience with this property
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedReviews}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              onEdit={handleEditReview}
              onDelete={handleDeleteReview}
              onLikeUpdate={fetchReviews}
            />
          )}
          scrollEnabled={false} // Disable scroll if embedded in ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#0061FF"]}
              tintColor="#0061FF"
            />
          }
          ListFooterComponent={
            maxReviews && reviews.length > maxReviews ? (
              <TouchableOpacity className="py-3 items-center">
                <Text className="text-primary-300 text-base font-rubik-bold">
                  View All {reviews.length} Reviews
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Review Modal */}
      <ReviewModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingReview(null);
        }}
        propertyId={propertyId}
        bookingId={bookingId}
        existingReview={editingReview}
        onSuccess={handleReviewSuccess}
      />
    </View>
  );
};

export default PropertyReviewsList;
