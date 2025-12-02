# Property Review System Documentation

## Overview
Complete property review system for the Real Estate App with ratings, comments, likes, and full CRUD operations.

---

## Backend Architecture (Appwrite)

### Database Collections

#### Reviews Collection
Create in Appwrite Console with these attributes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| propertyId | String | Yes | ID of the property being reviewed |
| userId | String | Yes | ID of the user who wrote the review |
| bookingId | String | No | Optional booking reference |
| rating | Integer | Yes | Star rating (1-5) |
| comment | String | Yes | Review text content |
| likes | String Array | Yes | Array of user IDs who liked this review |
| isEdited | Boolean | Yes | Whether review has been edited |
| editedAt | DateTime | No | When the review was last edited |

**Indexes:**
- Create index on `propertyId` for fast property review lookups
- Create index on `userId` for finding user's reviews
- Create unique compound index on `propertyId + userId` to prevent duplicate reviews

**Permissions:**
- **Create**: Any authenticated user
- **Read**: Any (public can view reviews)
- **Update**: Document owner only
- **Delete**: Document owner only

---

## Backend Functions (lib/appwrite.ts)

### 1. createReview()
**Purpose:** Create a new review for a property

**Parameters:**
```typescript
{
  propertyId: string;    // Property being reviewed
  bookingId?: string;    // Optional booking reference
  rating: number;        // 1-5 stars
  comment: string;       // Review text
}
```

**How it works:**
1. Gets authenticated user
2. Validates rating is between 1-5
3. Creates review document with user info
4. Initializes empty likes array
5. Returns created review with populated user data

**Usage:**
```typescript
const review = await createReview({
  propertyId: "property123",
  rating: 5,
  comment: "Amazing property! Highly recommend."
});
```

---

### 2. updateReview()
**Purpose:** Edit an existing review (owner only)

**Parameters:**
```typescript
reviewId: string;
updateData: {
  rating?: number;
  comment?: string;
}
```

**How it works:**
1. Verifies user is the review owner
2. Validates new rating if provided
3. Updates review with new data
4. Sets `isEdited` flag to true
5. Records `editedAt` timestamp

**Usage:**
```typescript
await updateReview("review123", {
  rating: 4,
  comment: "Updated my thoughts..."
});
```

---

### 3. deleteReview()
**Purpose:** Delete a review (owner only)

**Parameters:**
```typescript
reviewId: string
```

**How it works:**
1. Verifies user owns the review
2. Deletes review document from database
3. Throws error if unauthorized

**Usage:**
```typescript
await deleteReview("review123");
```

---

### 4. getPropertyReviews()
**Purpose:** Get all reviews for a specific property

**Parameters:**
```typescript
propertyId: string
```

**How it works:**
1. Queries reviews by propertyId
2. Orders by newest first
3. Limits to 100 reviews
4. Populates user data for each review
5. Returns array of reviews with user info

**Usage:**
```typescript
const reviews = await getPropertyReviews("property123");
```

---

### 5. toggleReviewLike()
**Purpose:** Like or unlike a review

**Parameters:**
```typescript
reviewId: string
```

**How it works:**
1. Gets current review document
2. Checks if user ID is in likes array
3. If liked: removes user ID
4. If not liked: adds user ID
5. Updates review with new likes array

**Usage:**
```typescript
const updated = await toggleReviewLike("review123");
```

---

### 6. getUserReviewForProperty()
**Purpose:** Check if user has already reviewed a property

**Parameters:**
```typescript
propertyId: string
```

**Returns:**
- Review document if exists
- null if user hasn't reviewed

**Usage:**
```typescript
const existingReview = await getUserReviewForProperty("property123");
if (existingReview) {
  // User has already reviewed
}
```

---

### 7. getPropertyRating()
**Purpose:** Calculate average rating and review count

**Parameters:**
```typescript
propertyId: string
```

**Returns:**
```typescript
{
  average: number;  // Average rating (rounded to 1 decimal)
  count: number;    // Total number of reviews
}
```

**How it works:**
1. Fetches all reviews for property
2. Calculates sum of all ratings
3. Divides by review count
4. Rounds to 1 decimal place

**Usage:**
```typescript
const rating = await getPropertyRating("property123");
console.log(`${rating.average} stars (${rating.count} reviews)`);
```

---

## Frontend Components

### 1. ReviewCard Component
**File:** `components/ReviewCard.tsx`

**Purpose:** Display a single review with interactive features

**Features:**
- User avatar and name
- Star rating display (1-5 stars)
- Review comment text
- "Edited" indicator if review was modified
- Like/unlike button with count
- Edit/Delete buttons (for review owner only)
- Timestamp (e.g., "2 days ago")

**Props:**
```typescript
{
  review: ReviewDocument;           // Review data
  onEdit?: (review) => void;        // Called when edit clicked
  onDelete?: (reviewId) => void;    // Called when deleted
  onLikeUpdate?: () => void;        // Called when like changed
}
```

**Key Features:**
- **Optimistic Updates**: UI updates immediately before server response
- **Owner Detection**: Shows edit/delete only to review owner
- **Like Animation**: Visual feedback when liking/unliking
- **Time Formatting**: Smart date display (Today, Yesterday, X days ago)

---

### 2. ReviewModal Component
**File:** `components/ReviewModal.tsx`

**Purpose:** Modal for creating or editing reviews

**Features:**
- Interactive star rating selector (tap stars to select 1-5)
- Multi-line text input for comment
- Character counter (max 500 characters)
- Validation for rating and comment
- Loading state during submission
- Different title for create vs edit mode

**Props:**
```typescript
{
  visible: boolean;                 // Show/hide modal
  onClose: () => void;              // Called when closed
  propertyId: string;               // Property being reviewed
  bookingId?: string;               // Optional booking reference
  existingReview?: ReviewDocument;  // For editing (null for new)
  onSuccess?: () => void;           // Called after successful submit
}
```

**Validation:**
- Rating must be selected (1-5 stars)
- Comment must be at least 10 characters
- Comment max 500 characters

---

### 3. PropertyReviewsList Component
**File:** `components/PropertyReviewsList.tsx`

**Purpose:** Complete reviews section for property page

**Features:**
- Average rating display with star count
- Total review count
- "Write Review" or "Edit Review" button
- List of all reviews using ReviewCard
- Pull-to-refresh functionality
- Empty state when no reviews
- Optional max reviews limit
- Auto-refresh when user reviews

**Props:**
```typescript
{
  propertyId: string;                      // Property ID
  bookingId?: string;                      // Optional booking
  showWriteButton?: boolean;               // Show write button (default: true)
  maxReviews?: number;                     // Limit displayed reviews
  onReviewCountChange?: (count) => void;   // Callback with review count
}
```

**Smart Features:**
- Detects if user has already reviewed
- Changes button to "Edit Review" if user reviewed
- Automatically opens edit modal when editing own review
- Updates rating/count after any review action

---

## Integration Example

### Property Details Page
**File:** `app/(root)/propreties/[id].tsx`

```typescript
import PropertyReviewsList from "@/components/PropertyReviewsList";

// In your property details component:
<PropertyReviewsList
  propertyId={id!}
  showWriteButton={true}
  maxReviews={3}  // Show only first 3 reviews
/>
```

---

## User Flows

### 1. Writing a Review
1. User clicks "Write Review" button
2. Modal opens with star selector and text input
3. User selects rating (1-5 stars)
4. User types comment (min 10, max 500 characters)
5. Clicks "Post Review"
6. Review is created in database
7. Modal closes and reviews list refreshes
8. New review appears at top of list

### 2. Editing a Review
1. User sees "Edit Review" button (since they already reviewed)
2. Clicks edit button OR edit icon on their review card
3. Modal opens pre-filled with existing rating and comment
4. User modifies rating and/or comment
5. Clicks "Update Review"
6. Review is updated with `isEdited` flag set to true
7. Modal closes and review updates in list
8. Review shows "Edited" indicator

### 3. Deleting a Review
1. User clicks delete icon on their review card
2. Confirmation alert appears
3. User confirms deletion
4. Review is removed from database
5. Review disappears from list
6. Rating average and count update

### 4. Liking a Review
1. User clicks heart icon on any review
2. UI updates immediately (optimistic update)
3. Heart turns red and like count increments
4. Request sent to server
5. If fails, UI reverts to previous state
6. User can unlike by clicking again

---

## Permissions & Security

### Authentication Required For:
- Creating reviews (must be logged in)
- Editing reviews (must own the review)
- Deleting reviews (must own the review)
- Liking reviews (must be logged in)

### Public Actions:
- Viewing all reviews (anyone can read)
- Viewing average ratings (public)

### Database Permissions:
```
Reviews Collection:
- Create: role:all (authenticated users)
- Read: role:all (public access)
- Update: owner only (user:{{userId}})
- Delete: owner only (user:{{userId}})
```

---

## Data Flow

### Review Creation Flow:
```
User fills form
    ↓
ReviewModal validates input
    ↓
Calls createReview() function
    ↓
Appwrite creates document
    ↓
Review returned with user data
    ↓
PropertyReviewsList refreshes
    ↓
New review appears in list
```

### Review Like Flow:
```
User clicks heart icon
    ↓
ReviewCard optimistically updates UI
    ↓
Calls toggleReviewLike() function
    ↓
Appwrite updates likes array
    ↓
Success: UI stays updated
Failure: UI reverts to previous state
```

---

## Advanced Features

### 1. Optimistic Updates
Reviews and likes update UI immediately before server response for better UX.

### 2. Auto-Detection
System detects if user already reviewed and changes button accordingly.

### 3. Smart Timestamps
Reviews show relative time (Today, Yesterday, 3 days ago, 2 months ago, etc.)

### 4. Empty States
Friendly message when property has no reviews yet.

### 5. Pull-to-Refresh
Users can swipe down to refresh reviews list.

### 6. Character Counter
Real-time character count while typing (helpful for 500 char limit).

### 7. Rating Labels
Stars show labels: Poor, Fair, Good, Very Good, Excellent.

---

## Testing Checklist

- [ ] Create a new review with valid data
- [ ] Try to create review without rating (should fail)
- [ ] Try to create review with short comment (should fail)
- [ ] Edit your own review
- [ ] Try to edit someone else's review (should fail)
- [ ] Delete your own review
- [ ] Try to delete someone else's review (should fail)
- [ ] Like a review
- [ ] Unlike a review you liked
- [ ] View reviews when not logged in
- [ ] Try to write review when not logged in (should prompt login)
- [ ] Check that edited reviews show "Edited" label
- [ ] Verify average rating calculation is correct
- [ ] Test pull-to-refresh functionality
- [ ] Verify empty state appears when no reviews

---

## Customization Options

### Styling
All components use NativeWind/Tailwind classes. Modify colors:
- Primary color: `bg-primary-300` (currently blue)
- Star color: `#FFD700` (gold)
- Like color: `#EF4444` (red)
- Text colors: `text-black-300`, `text-gray-500`

### Limits
- Max reviews displayed: Change `maxReviews` prop
- Max comment length: Modify `maxLength={500}` in ReviewModal
- Reviews per query: Change `Query.limit(100)` in getPropertyReviews

### Behavior
- Require booking to review: Add validation in createReview()
- Allow multiple reviews: Remove unique index on userId+propertyId
- Disable likes: Remove like button from ReviewCard

---

## Troubleshooting

### Reviews not appearing:
1. Check Appwrite collection ID in .env
2. Verify permissions are set correctly
3. Check console for errors

### Can't create review:
1. Ensure user is authenticated
2. Check if user already reviewed (unique constraint)
3. Verify rating is 1-5 and comment length > 10

### Likes not working:
1. Check user authentication
2. Verify likes attribute is String Array type
3. Check Appwrite permissions allow updates

---

## Summary

This review system provides:
✅ Full CRUD operations (Create, Read, Update, Delete)
✅ Star ratings (1-5)
✅ Like/unlike functionality
✅ User ownership validation
✅ Optimistic UI updates
✅ Pull-to-refresh
✅ Empty states
✅ Edit indicators
✅ Average rating calculation
✅ Responsive design
✅ Type-safe TypeScript implementation

The system is production-ready and fully integrated into your property details page!
