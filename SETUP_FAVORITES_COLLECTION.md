# Setup Favorites Collection in Appwrite

## Current Issue
The favorites feature is fully coded but won't work until you create the collection in Appwrite Console.

## Steps to Fix:

### 1. Go to Appwrite Console
- Open: https://fra.cloud.appwrite.io/console
- Navigate to your project: **JSM_ReState**
- Go to **Databases** → Select database ID: `69173df30017df60e6e3`

### 2. Create New Collection
- Click **"Create Collection"**
- Name: `favorites`
- Click **Create**

### 3. Add Attributes
Click **"Add Attribute"** and create these two attributes:

**Attribute 1:**
- Type: `String`
- Key: `userId`
- Size: `255`
- Required: ✅ Yes
- Array: ❌ No

**Attribute 2:**
- Type: `String`
- Key: `propertyId`
- Size: `255`
- Required: ✅ Yes
- Array: ❌ No

### 4. Create Unique Index
- Go to **Indexes** tab
- Click **"Create Index"**
- Key: `unique_user_property`
- Type: `Unique`
- Attributes: Select both `userId` AND `propertyId`
- Click **Create**

This prevents users from favoriting the same property twice.

### 5. Set Permissions
- Go to **Settings** tab
- Scroll to **Permissions**
- Click **"Add Role"**

Add these permissions:

**Role: Any** (for authenticated users)
- ✅ Read
- ✅ Create
- ✅ Delete

This allows users to:
- Read their own favorites
- Add properties to favorites
- Remove properties from favorites

### 6. Copy Collection ID
- After creating the collection, you'll see the **Collection ID** at the top of the page
- It will be something like `674abc123def456789` (a long alphanumeric string)
- **IMPORTANT**: Copy this exact ID!

### 7. Update .env File
Open `.env` and replace this line:
```
EXPO_PUBLIC_APPWRITE_FAVORITES_COLLECTION_ID=favorites
```

With your **actual collection ID** (the one you just copied):
```
EXPO_PUBLIC_APPWRITE_FAVORITES_COLLECTION_ID=674abc123def456789
```

**⚠️ CRITICAL**: Do NOT use "favorites" - you must use the real collection ID from Appwrite Console!

### 8. Restart Development Server
```bash
npx expo start --clear
```

## Test the Feature
1. Open your app
2. Go to any property
3. Tap the heart icon (should be in a white circle at the top right)
4. Heart should turn red
5. Go to the **Favorites** tab (heart icon in bottom navigation)
6. Your favorited property should appear there!
7. Tap the heart again to remove it

## Troubleshooting

### Error: "Invalid query: Query value is invalid for attribute 'userId'"
**Problem**: You're using `"favorites"` as the collection ID instead of the real ID.

**Solution**: 
1. Go to Appwrite Console → Databases → Your Database
2. Click on the `favorites` collection
3. At the top, copy the **Collection ID** (looks like `674abc123def456789`)
4. Open `.env` file
5. Replace `EXPO_PUBLIC_APPWRITE_FAVORITES_COLLECTION_ID=favorites` with the real ID
6. Restart: `npx expo start --clear`

### Attributes Type Check
Make sure in Appwrite Console, your attributes are:
- `userId` - **Type: String** (NOT Integer, NOT Email)
- `propertyId` - **Type: String** (NOT Integer)

**Heart button doesn't work:**
- Check console logs for errors
- Make sure you're logged in
- Verify collection ID in .env matches Appwrite Console
- Restart the dev server

**"Collection not found" error:**
- Double-check the collection ID in .env
- Make sure you created it in the correct database

**Can't see favorites:**
- Check permissions are set correctly
- Make sure you're logged in
- Try pull-to-refresh in the Favorites screen
