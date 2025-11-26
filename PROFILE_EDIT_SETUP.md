# Edit Profile Feature - Setup Guide

## Overview
This feature allows Google-authenticated users to edit their profile information including name, phone number, bio, and profile picture. Email and password cannot be changed as they are managed by Google OAuth.

## Features Implemented

### ✅ Editable Fields
- **Name** - Updates via `account.updateName()`
- **Phone Number** - Stored in user preferences
- **Bio** - Stored in user preferences
- **Profile Picture** - Uploaded to Appwrite Storage

### 🔒 Non-Editable Fields
- **Email** - Locked (managed by Google)
- **Password** - Not shown (managed by Google)

## Appwrite Configuration Required

### 1. Create Storage Bucket for Profile Images

1. Log in to your [Appwrite Console](https://cloud.appwrite.io/)
2. Navigate to your project
3. Go to **Storage** → **Create Bucket**
4. Configure the bucket:
   - **Name**: `profile-images`
   - **Bucket ID**: `profile-images` (or custom ID)
   - **Permissions**:
     - **Read**: `any` (or specific user roles)
     - **Create**: `users` (authenticated users)
     - **Update**: `users` (authenticated users)
     - **Delete**: `users` (authenticated users)
   - **Maximum File Size**: `10MB` (recommended)
   - **Allowed File Extensions**: `jpg, jpeg, png, gif, webp`
   - **Compression**: `gzip` (optional)
   - **Encryption**: Enable if needed
   - **Antivirus**: Enable if available

### 2. Add Environment Variable

Add the following to your `.env` file (or Expo environment):

```env
EXPO_PUBLIC_APPWRITE_PROFILE_IMAGES_BUCKET_ID=profile-images
```

If you used a different bucket ID, replace `profile-images` with your bucket ID.

### 3. Storage Permissions Setup

Ensure your bucket has the following permissions configured:

```javascript
// Read permission - allows viewing profile images
Permission.read(Role.any())

// Create permission - allows users to upload their profile pictures
Permission.create(Role.users())

// Update permission - allows users to replace their profile pictures
Permission.update(Role.users())

// Delete permission - allows users to delete their old profile pictures
Permission.delete(Role.users())
```

## File Structure

```
app/
├── (root)/
│   └── (tabs)/
│       ├── profile.tsx          # Updated with Edit button navigation
│       └── edit-profile.tsx     # New: Edit profile screen
lib/
├── appwrite.ts                   # Updated with profile functions
└── global-provider.tsx           # Updated User interface
```

## New Functions Added to `lib/appwrite.ts`

### 1. `updateUserName(name: string)`
Updates the user's display name using Appwrite's account API.

### 2. `updateUserPreferences(prefs: object)`
Stores custom fields (phone, bio, photoURL) in user preferences.

### 3. `uploadProfileImage(imageUri: string)`
Uploads a profile picture to Appwrite Storage and returns the file URL.

### 4. `deleteProfileImage(fileId: string)`
Deletes a profile image from Appwrite Storage.

### 5. Updated `getCurrentUser()`
Now retrieves custom fields from user preferences and includes them in the user object.

## User Interface

### Profile Screen (`profile.tsx`)
- Displays user information
- Edit button navigates to Edit Profile screen

### Edit Profile Screen (`edit-profile.tsx`)
- **Profile Picture Section**
  - Current profile picture displayed
  - Tap to change (options: Take Photo, Choose from Library)
  - Upload progress indicator

- **Form Fields**
  - Name (required, editable)
  - Email (read-only with lock icon)
  - Phone Number (optional, validated)
  - Bio (optional, multiline)

- **Action Buttons**
  - Save Changes (with loading state)
  - Cancel

## Validation

### Name
- Cannot be empty
- Trimmed for whitespace

### Phone Number
- Optional field
- Format validation: `^[\d\s\-\+\(\)]+$`
- Accepts digits, spaces, dashes, plus signs, and parentheses

### Email
- Read-only (no validation needed)

### Bio
- Optional field
- Multiline text input
- No specific validation

## Data Flow

1. **Load Profile**
   ```
   getCurrentUser() → Fetch account + preferences → Display in form
   ```

2. **Update Profile**
   ```
   User edits → Validate → Upload image (if changed) → Update name → 
   Update preferences → Refetch user data → Navigate back
   ```

3. **Image Upload**
   ```
   Select image → Upload to Storage → Get file URL → 
   Save URL in preferences → Display new image
   ```

## Error Handling

- **Validation Errors**: Alerts shown before submission
- **Upload Errors**: Error alert with retry option
- **Server Errors**: Generic error message displayed
- **Network Errors**: Handled by try-catch blocks

## Testing Checklist

### Basic Functionality
- [ ] Navigate to Edit Profile from Profile screen
- [ ] View current profile information
- [ ] Email field is disabled/read-only
- [ ] Update name successfully
- [ ] Update phone number successfully
- [ ] Update bio successfully

### Image Upload
- [ ] Pick image from gallery
- [ ] Take photo with camera
- [ ] Image upload shows loading state
- [ ] New image displays after upload
- [ ] Image URL saved in preferences

### Validation
- [ ] Empty name shows error
- [ ] Invalid phone format shows error
- [ ] Valid phone formats accepted

### Data Persistence
- [ ] Changes saved to Appwrite
- [ ] Profile screen updates after save
- [ ] Data persists after app restart
- [ ] User preferences correctly stored

### Error Scenarios
- [ ] Network error handled gracefully
- [ ] Upload failure shows error
- [ ] Invalid data rejected

### UI/UX
- [ ] Loading states displayed
- [ ] Success/error alerts shown
- [ ] Cancel button works
- [ ] Back navigation works

## Dependencies

### Installed Packages
```json
{
  "expo-image-picker": "latest",
  "react-native-appwrite": "^0.18.0"
}
```

### Required Permissions (Handled by expo-image-picker)
- Camera access
- Photo library access

## Usage Example

```typescript
// Navigate to Edit Profile
import { router } from 'expo-router';

router.push('/(root)/(tabs)/edit-profile');
```

## Common Issues & Solutions

### Issue 1: Image Upload Fails
**Solution**: Verify Storage bucket exists and has correct permissions

### Issue 2: Profile Picture Not Displaying
**Solution**: Check file URL format and bucket permissions for read access

### Issue 3: Preferences Not Saving
**Solution**: Ensure user is authenticated and has active session

### Issue 4: Email Field Shows as Editable
**Solution**: Verify the `editable={false}` or disabled state is set

## Security Considerations

1. **Storage Access**: Only authenticated users can upload
2. **File Size Limits**: Prevent large file uploads
3. **File Type Restrictions**: Only allow image formats
4. **User Preferences**: Private to each user
5. **Email Protection**: Email cannot be changed (Google manages it)

## Future Enhancements

- [ ] Crop/rotate image before upload
- [ ] Image compression before upload
- [ ] Multiple profile picture support
- [ ] Profile picture gallery
- [ ] Social media links
- [ ] Email verification status display
- [ ] Account deletion option
- [ ] Export profile data

## Support

For issues or questions:
1. Check Appwrite Storage configuration
2. Verify bucket ID in environment variables
3. Check console logs for detailed error messages
4. Ensure user has active session
