# Review System - Appwrite Setup Guide

## Quick Setup Steps

### 1. Create Reviews Collection

Go to Appwrite Console → Your Database → Create Collection

**Collection Name:** `reviews`

### 2. Add Attributes

Click "Add Attribute" and create these fields:

#### Attribute 1: propertyId
- **Type:** String
- **Size:** 255
- **Required:** ✅ Yes
- **Array:** ❌ No

#### Attribute 2: userId
- **Type:** String
- **Size:** 255
- **Required:** ✅ Yes
- **Array:** ❌ No

#### Attribute 3: bookingId
- **Type:** String
- **Size:** 255
- **Required:** ❌ No
- **Array:** ❌ No

#### Attribute 4: rating
- **Type:** Integer
- **Min:** 1
- **Max:** 5
- **Required:** ✅ Yes
- **Array:** ❌ No

#### Attribute 5: comment
- **Type:** String
- **Size:** 1000
- **Required:** ✅ Yes
- **Array:** ❌ No

#### Attribute 6: likes
- **Type:** String
- **Size:** 255
- **Required:** ✅ Yes
- **Default:** [] (empty array)
- **Array:** ✅ Yes

#### Attribute 7: isEdited
- **Type:** Boolean
- **Required:** ✅ Yes
- **Default:** false
- **Array:** ❌ No

#### Attribute 8: editedAt
- **Type:** DateTime
- **Required:** ❌ No
- **Array:** ❌ No

### 3. Create Indexes

Go to **Indexes** tab:

#### Index 1: propertyId_index
- **Type:** Key
- **Attributes:** propertyId
- **Order:** ASC

#### Index 2: userId_index
- **Type:** Key
- **Attributes:** userId
- **Order:** ASC

#### Index 3: unique_user_property (IMPORTANT!)
- **Type:** Unique
- **Attributes:** userId, propertyId
- **Purpose:** Prevents users from reviewing same property multiple times

### 4. Set Permissions

Go to **Settings** tab → Permissions:

#### Permission Rules:
1. **Create:**
   - Role: `Any` (authenticated users)
   - Allows logged-in users to create reviews

2. **Read:**
   - Role: `Any` (everyone, including guests)
   - Allows anyone to view reviews

3. **Update:**
   - Role: `Users` with owner condition
   - Only review owner can edit their review
   - In Appwrite, this is automatic when using owner-based permissions

4. **Delete:**
   - Role: `Users` with owner condition
   - Only review owner can delete their review

### 5. Verify Collection ID

After creating the collection:
1. Copy the Collection ID from the top of the page
2. It should match your .env file:
   ```
   EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID=69174263002e76146d1d
   ```

### 6. Test the Setup

Run these test queries in Appwrite Console to verify:

**Test Create:**
```json
{
  "propertyId": "test-property-123",
  "userId": "test-user-123",
  "rating": 5,
  "comment": "Test review",
  "likes": [],
  "isEdited": false
}
```

**Test Read:**
Query all documents with:
```
Query.equal("propertyId", "test-property-123")
```

## Troubleshooting

### "Attribute already exists" error:
- Delete the attribute and recreate it
- Make sure spelling is exact

### Can't create reviews in app:
- Check permissions are set to `Any` for Create
- Verify user is authenticated
- Check collection ID in .env matches Appwrite

### Reviews not showing:
- Check Read permission is set to `Any`
- Verify propertyId matches exactly
- Check console logs for errors

### Users can create multiple reviews:
- You need the unique compound index on userId + propertyId
- Delete existing duplicate reviews
- Create the unique index

### Likes not working:
- Verify `likes` attribute is type String Array
- Default value should be empty array: []
- Check Update permissions allow users to modify

## Complete Collection Schema Summary

```
Collection: reviews
├── Attributes
│   ├── propertyId (String, Required)
│   ├── userId (String, Required)
│   ├── bookingId (String, Optional)
│   ├── rating (Integer 1-5, Required)
│   ├── comment (String, Required)
│   ├── likes (String[], Required, Default: [])
│   ├── isEdited (Boolean, Required, Default: false)
│   └── editedAt (DateTime, Optional)
├── Indexes
│   ├── propertyId_index (Key)
│   ├── userId_index (Key)
│   └── unique_user_property (Unique: userId + propertyId)
└── Permissions
    ├── Create: Any (authenticated)
    ├── Read: Any (public)
    ├── Update: Owner
    └── Delete: Owner
```

## Next Steps

1. ✅ Create collection with all attributes
2. ✅ Add indexes (especially unique constraint)
3. ✅ Set permissions correctly
4. ✅ Verify collection ID in .env
5. 🚀 Test creating, editing, and deleting reviews in your app!

---

**Need Help?**
Check the main documentation: `REVIEW_SYSTEM_DOCUMENTATION.md`
