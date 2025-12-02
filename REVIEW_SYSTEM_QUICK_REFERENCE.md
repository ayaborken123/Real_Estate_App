# Review System - Quick Reference

## 🎯 What You Have Now

A complete property review system where users can:
- ⭐ Rate properties 1-5 stars
- ✍️ Write detailed reviews
- ✏️ Edit their own reviews
- 🗑️ Delete their own reviews  
- ❤️ Like other users' reviews
- 👀 View all property reviews

---

## 📁 Files Added

### Backend
- `lib/appwrite.ts` - 7 new functions + 2 TypeScript types

### Components
- `components/ReviewCard.tsx` - Individual review display
- `components/ReviewModal.tsx` - Create/edit review modal
- `components/PropertyReviewsList.tsx` - Complete reviews section

### Documentation
- `REVIEW_SYSTEM_DOCUMENTATION.md` - Full technical docs
- `REVIEW_SYSTEM_SETUP.md` - Appwrite setup guide
- `REVIEW_SYSTEM_COMPLETE.md` - Implementation summary

---

## ⚡ Quick Start

### 1. Setup Appwrite (5 minutes)
```
1. Go to Appwrite Console
2. Create "reviews" collection
3. Add 8 attributes (see REVIEW_SYSTEM_SETUP.md)
4. Create indexes
5. Set permissions
```

### 2. Use in Your App
```typescript
import PropertyReviewsList from "@/components/PropertyReviewsList";

<PropertyReviewsList
  propertyId={id}
  showWriteButton={true}
  maxReviews={3}
/>
```

---

## 🔑 Key Functions

```typescript
// Create review
await createReview({
  propertyId: "123",
  rating: 5,
  comment: "Great place!"
});

// Update review
await updateReview("reviewId", {
  rating: 4,
  comment: "Updated..."
});

// Delete review
await deleteReview("reviewId");

// Get all reviews
const reviews = await getPropertyReviews("propertyId");

// Like/unlike review
await toggleReviewLike("reviewId");

// Check if user reviewed
const myReview = await getUserReviewForProperty("propertyId");

// Get rating stats
const { average, count } = await getPropertyRating("propertyId");
```

---

## 🎨 Components Usage

### ReviewCard
```typescript
<ReviewCard
  review={reviewData}
  onEdit={(review) => editHandler(review)}
  onDelete={(id) => deleteHandler(id)}
  onLikeUpdate={() => refresh()}
/>
```

### ReviewModal
```typescript
<ReviewModal
  visible={show}
  onClose={() => setShow(false)}
  propertyId="123"
  existingReview={null} // or review object to edit
  onSuccess={() => refresh()}
/>
```

### PropertyReviewsList
```typescript
<PropertyReviewsList
  propertyId="123"
  bookingId="456"        // optional
  showWriteButton={true}
  maxReviews={5}         // optional limit
  onReviewCountChange={(n) => setCount(n)}
/>
```

---

## 🔒 Security

| Action | Who Can Do It |
|--------|---------------|
| View reviews | Everyone (even guests) |
| Write review | Logged-in users |
| Edit review | Review owner only |
| Delete review | Review owner only |
| Like review | Logged-in users |

---

## ✅ Validation Rules

- **Rating:** Required, must be 1-5
- **Comment:** Required, 10-500 characters
- **Unique:** One review per user per property

---

## 🎨 Features

✨ **Optimistic Updates** - Instant UI feedback
🔄 **Pull-to-Refresh** - Swipe down to refresh
📝 **Edit Indicators** - Shows if review was edited
⏱️ **Smart Timestamps** - "2 days ago" format
❤️ **Like Counter** - Shows number of likes
👤 **Owner Detection** - Edit/delete only your reviews
📊 **Average Rating** - Auto-calculated
🚫 **Empty States** - Friendly "no reviews" message

---

## 📚 Full Documentation

- **Technical Docs:** `REVIEW_SYSTEM_DOCUMENTATION.md`
- **Setup Guide:** `REVIEW_SYSTEM_SETUP.md`
- **Summary:** `REVIEW_SYSTEM_COMPLETE.md`

---

## 🐛 Troubleshooting

**Reviews not showing?**
- Check Appwrite collection ID in .env
- Verify permissions are set correctly

**Can't create review?**
- Ensure user is logged in
- Check if user already reviewed property

**Likes not working?**
- Verify `likes` attribute is String Array type
- Check user is authenticated

---

## 🎯 Next Steps

1. ✅ Backend functions - DONE
2. ✅ UI components - DONE  
3. ✅ Integration - DONE
4. ⏳ Setup Appwrite collection - TODO
5. ⏳ Test the system - TODO

**See REVIEW_SYSTEM_SETUP.md for Appwrite setup!**
