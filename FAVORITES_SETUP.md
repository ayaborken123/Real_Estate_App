# Favorites Feature - Setup Guide

## Appwrite Collection Setup

### Create Favorites Collection

1. Go to [Appwrite Console](https://cloud.appwrite.io/console/project-69146dd000167aa04353/databases/database-69173df30017df60e6e3)
2. Click **Create Collection**
3. Configure:
   - **Name**: `Favorites`
   - **Collection ID**: `favorites` (or copy the auto-generated ID)

### Collection Attributes

Add the following attributes:

| Attribute | Type | Size | Required | Array | Default |
|-----------|------|------|----------|-------|---------|
| `userId` | String | 255 | Yes | No | - |
| `propertyId` | String | 255 | Yes | No | - |

### Indexes

Create indexes for better query performance:

1. **Index 1**: User Favorites
   - Type: `key`
   - Attribute: `userId`
   - Order: ASC

2. **Index 2**: Property in Favorites
   - Type: `key`
   - Attribute: `propertyId`
   - Order: ASC

3. **Index 3**: Unique User-Property (Prevent duplicates)
   - Type: `unique`
   - Attributes: `userId`, `propertyId`
   - Order: ASC, ASC

### Permissions

Set the following permissions:

**Read Access**:
- Role: `user:[USER_ID]` (User can only read their own favorites)
- Or use: `Users` (All authenticated users can read)

**Create Access**:
- Role: `Users` (Authenticated users can create favorites)

**Update Access**:
- Role: `user:[USER_ID]` (Users can only update their own favorites)
- Or: No update needed (use create/delete instead)

**Delete Access**:
- Role: `user:[USER_ID]` (Users can only delete their own favorites)
- Or use: `Users` (Authenticated users can delete)

## Environment Variable

Add to your `.env` file:

```env
EXPO_PUBLIC_APPWRITE_FAVORITES_COLLECTION_ID=favorites
```

Replace `favorites` with your actual collection ID if different.

## Features Implemented

### 1. Favorites Management Functions
- `addFavorite(propertyId)` - Add property to favorites
- `removeFavorite(propertyId)` - Remove property from favorites
- `getFavorites()` - Get all user's favorite properties
- `isFavorite(propertyId)` - Check if property is favorited
- `getFavoriteIds()` - Get array of favorited property IDs

### 2. Favorites Context Provider
- Global state management for favorites
- Automatic sync with Appwrite
- Real-time UI updates
- Loading states

### 3. UI Components
- `FavoriteButton` - Reusable heart icon toggle
- Integrated in property cards
- Integrated in property detail page
- Visual feedback (filled/unfilled heart)

### 4. Favorites Screen
- Displays all saved properties
- Remove from favorites functionality
- Empty state when no favorites
- Pull to refresh

### 5. Navigation
- Favorites tab in bottom navigation
- Heart icon in tab bar
- Active state indicator

## Usage

### Wrap App with Provider

In `app/_layout.tsx`:

```tsx
import { FavoritesProvider } from '@/lib/favorites-provider';

<FavoritesProvider>
  <YourApp />
</FavoritesProvider>
```

### Use in Components

```tsx
import { useFavorites } from '@/lib/favorites-provider';

const MyComponent = () => {
  const { favorites, addFavorite, removeFavorite, isFavorite, loading } = useFavorites();
  
  const handleToggleFavorite = async (propertyId: string) => {
    if (isFavorite(propertyId)) {
      await removeFavorite(propertyId);
    } else {
      await addFavorite(propertyId);
    }
  };
  
  return (
    // Your component JSX
  );
};
```

## Testing Checklist

- [ ] User can tap favorite icon on property card
- [ ] Heart icon fills when property is added to favorites
- [ ] Heart icon unfills when property is removed from favorites
- [ ] Favorites persist after app restart
- [ ] Only user's own favorites are displayed
- [ ] Favorites screen shows all saved properties
- [ ] Remove from favorites works on favorites screen
- [ ] No duplicate favorites can be created
- [ ] Toast notifications show when adding/removing favorites
- [ ] Offline support (optional)
- [ ] Favorite indicator shows in all property lists

## Troubleshooting

### Error: "Collection not found"
**Solution**: Create the favorites collection in Appwrite Console

### Error: "Permission denied"
**Solution**: Check collection permissions allow Users to create/read/delete

### Favorites not persisting
**Solution**: Verify user is authenticated and userId is being saved correctly

### Duplicate favorites
**Solution**: Create unique index on userId + propertyId in Appwrite
