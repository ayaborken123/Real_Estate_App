# Appwrite Storage Bucket Setup

## Quick Setup Instructions

### Step 1: Create Storage Bucket in Appwrite Console

1. Go to [Appwrite Console](https://cloud.appwrite.io/)
2. Select your project: **JSM_ReState**
3. Navigate to **Storage** in the left sidebar
4. Click **Create Bucket**
5. Fill in the following details:
   - **Name**: `Profile Images`
   - **Bucket ID**: `profile-images` (or copy the auto-generated ID)
   - **Maximum File Size**: `10 MB`
   - **Allowed File Extensions**: `jpg, jpeg, png, gif, webp`
   - **Compression**: `gzip` (optional)
   - **Encryption**: Disabled (optional)
   - **Antivirus**: Disabled (optional for testing)

### Step 2: Configure Permissions

In the bucket settings, add these permissions:

**Read Access** (View images):
- Click **Add Role**
- Select: `Any`
- Permission: `Read`

**Create Access** (Upload images):
- Click **Add Role**
- Select: `Users`
- Permission: `Create`

**Update Access** (Modify images):
- Click **Add Role**
- Select: `Users`
- Permission: `Update`

**Delete Access** (Remove images):
- Click **Add Role**
- Select: `Users`
- Permission: `Delete`

### Step 3: Add Bucket ID to .env File

Add this line to your `.env` file:

```env
EXPO_PUBLIC_APPWRITE_PROFILE_IMAGES_BUCKET_ID=profile-images
```

If you used a different Bucket ID, replace `profile-images` with your actual bucket ID.

### Step 4: Restart Your Development Server

```powershell
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

## Testing the Upload

1. Navigate to **Profile** screen
2. Tap **Edit Profile**
3. Tap the profile picture to change it
4. Select an image from gallery or take a photo
5. Fill in any other details
6. Tap **Save Changes**

The image should upload successfully!

## Troubleshooting

### Error: "File upload returned undefined"
**Solution**: Make sure the Storage bucket exists and has the correct permissions.

### Error: "blob.arrayBuffer is not a function"
**Solution**: This has been fixed by removing the blob conversion and using direct file upload.

### Error: "User (role: guests) missing scope"
**Solution**: Make sure you're logged in. The user must be authenticated to upload images.

### Image doesn't display after upload
**Solution**: Check that the bucket has `Read` permission for `Any` role.

## Current Configuration

Your Appwrite setup:
- **Endpoint**: https://fra.cloud.appwrite.io/v1
- **Project ID**: 69146dd000167aa04353
- **Database ID**: 69173df30017df60e6e3

You need to add:
- **Profile Images Bucket ID**: profile-images
