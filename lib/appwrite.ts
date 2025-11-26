// Use the React Native SDK to enable cookie fallbacks and mobile OAuth helpers
import { PropertyDocument } from "@/components/Cards";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { Platform } from "react-native";
import { Account, Avatars, Client, Databases, ID, OAuthProvider, Query, Storage } from "react-native-appwrite";
export const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  propertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  profileImagesBucketId: process.env.EXPO_PUBLIC_APPWRITE_PROFILE_IMAGES_BUCKET_ID || "profile-images",
  favoritesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_FAVORITES_COLLECTION_ID || "favorites",
};

// Determine correct platform identifier for Appwrite origin validation.
// Expo Go uses host.exp.Exponent (iOS) / host.exp.exponent (Android).
const isExpoGo = (Constants as any)?.appOwnership === 'expo';
// Expo Go identifies as 'host.exp.exponent' on both platforms for Appwrite's origin check
const iosBundleId = isExpoGo ? 'host.exp.exponent' : 'com.jsm.restate';
const androidPackage = isExpoGo ? 'host.exp.exponent' : 'com.jsm.restate';
const platformId = Platform.OS === 'ios' ? iosBundleId : androidPackage;

export const client = new Client()
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(platformId);

console.log("Appwrite platform set to:", platformId);


export const account = new Account(client);
export const avatar = new Avatars(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export async function login() {
  try {
    const redirectUri = Linking.createURL("oauth");

    const response = await account.createOAuth2Token({
      provider: OAuthProvider.Google,
      success: redirectUri,
      failure: redirectUri,
    });
    if (!response) throw new Error("Create OAuth2 token failed");

    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );
    if (browserResult.type !== "success")
      throw new Error("Create OAuth2 token failed");

    const url = new URL(browserResult.url);
    let secret = url.searchParams.get("secret")?.toString();
    let userId = url.searchParams.get("userId")?.toString();
    // Fallback: sometimes params are in hash fragment
    if (!secret || !userId) {
      const hash = url.hash?.startsWith('#') ? url.hash.substring(1) : url.hash;
      if (hash) {
        const params = new URLSearchParams(hash);
        secret = secret || params.get('secret') || undefined as any;
        userId = userId || params.get('userId') || undefined as any;
      }
    }
    if (!secret || !userId) throw new Error("Create OAuth2 token failed");

    const session = await account.createSession(userId, secret);
    if (!session) throw new Error("Failed to create session");
    
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function logout() {
    try {
        const result = await account.deleteSession("current");
        return result;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export async function getCurrentUser() {
    try {
        const result = await account.get();
        if (result.$id) {
            // Get user preferences for custom fields
            const prefs = result.prefs || {};
            const userAvatar = prefs.photoURL || avatar.getInitials(result.name).toString();

            return {
                ...result,
                avatar: userAvatar,
                phone: prefs.phone || "",
                bio: prefs.bio || "",
                photoURL: prefs.photoURL || "",
            };
        }

        return null;
    } catch (error) {
        console.log(error);
        return null;
    }
}
export async function getLatesProperties() {
    try {
        const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            [Query.orderDesc("$createdAt"), Query.limit(5)]
        );
        return result.documents as unknown as PropertyDocument[];;
    } catch (error) {
        console.log(error);
        return [];
    }
}
export async function getProperties({filter ,query, limit}: {filter: string; query: string; limit?: number}) {
  try {
    const buildQuery: any[] = [Query.orderDesc("$createdAt")];

    // CATEGORY FILTER
    if (filter && filter !== "all" && filter !== "All") {
      buildQuery.push(Query.equal("type", filter));
    }
    // SEARCH (OR conditions)
    if (query) {
      buildQuery.push(
        Query.or([
          Query.search("name", query),
          Query.search("address", query),
          Query.search("type", query),
        ])
      );
    }
    if (limit) {
      buildQuery.push(Query.limit(limit));
    }
    const result = await databases.listDocuments(
            config.databaseId!,
            config.propertiesCollectionId!,
            buildQuery,
        );
        return result.documents as unknown as PropertyDocument[];;

  }
  catch (error) {
      console.log(error);
      return [];
  }
}
export async function getPropertyById({ id }: { id: string }){
   try {
    const result = await databases.getDocument(
        config.databaseId!,
        config.propertiesCollectionId!,
        id
    );
    return result;
   } catch (error) {
    console.log(error);
    return null;
   }
}

// Profile Update Functions

export async function updateUserName(name: string) {
  try {
    await account.updateName(name);
    return { success: true };
  } catch (error) {
    console.error("Error updating name:", error);
    return { success: false, error };
  }
}

export async function updateUserPreferences(prefs: { phone?: string; bio?: string; photoURL?: string }) {
  try {
    const currentUser = await account.get();
    const currentPrefs = currentUser.prefs || {};
    
    // Merge with existing preferences
    const updatedPrefs = {
      ...currentPrefs,
      ...prefs,
    };
    
    await account.updatePrefs(updatedPrefs);
    return { success: true };
  } catch (error) {
    console.error("Error updating preferences:", error);
    return { success: false, error };
  }
}

export async function uploadProfileImage(imageUri: string) {
  try {
    console.log("Starting upload...");
    console.log("Bucket ID:", config.profileImagesBucketId);
    console.log("Image URI:", imageUri);
    
    const filename = imageUri.split('/').pop() || `profile-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // Fetch the file as a blob
    console.log("Fetching file from URI...");
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    console.log("Blob size:", blob.size);
    console.log("Blob type:", blob.type);
    
    // Create a custom object that mimics a File for React Native Appwrite
    const fileObject = {
      name: filename,
      type: type,
      size: blob.size,
      uri: imageUri,
      // Add blob data methods
      slice: blob.slice.bind(blob),
      stream: blob.stream?.bind(blob),
      text: blob.text?.bind(blob),
      arrayBuffer: blob.arrayBuffer?.bind(blob),
    };
    
    console.log("File object created:", fileObject.name, fileObject.size, fileObject.type);
    console.log("Uploading to Appwrite...");

    const uploadedFile = await storage.createFile(
      config.profileImagesBucketId!,
      ID.unique(),
      fileObject as any
    );

    console.log("Upload result:", uploadedFile);

    if (!uploadedFile || !uploadedFile.$id) {
      throw new Error("File upload returned undefined or missing $id");
    }

    const fileUrl = `${config.endpoint}/storage/buckets/${config.profileImagesBucketId}/files/${uploadedFile.$id}/view?project=${config.projectId}`;
    
    console.log("Upload successful! File URL:", fileUrl);

    return { success: true, fileUrl, fileId: uploadedFile.$id };
  } catch (error: any) {
    console.error("Error uploading profile image:", error);
    console.error("Error message:", error?.message);
    console.error("Full error:", JSON.stringify(error, null, 2));
    return { success: false, error };
  }
}


export async function deleteProfileImage(fileId: string) {
  try {
    await storage.deleteFile(config.profileImagesBucketId!, fileId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting profile image:", error);
    return { success: false, error };
  }
}

// Favorites Functions

export async function addFavorite(propertyId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const favorite = await databases.createDocument(
      config.databaseId!,
      config.favoritesCollectionId!,
      ID.unique(),
      {
        userId: user.$id,
        propertyId: propertyId,
        favoriteDate: new Date().toISOString(),
        notes: "",
        isShared: false,
        sharedWith: [],
      }
    );

    return { success: true, favorite };
  } catch (error: any) {
    // If error is duplicate (409), it's already favorited
    if (error?.code === 409) {
      return { success: true, message: "Already in favorites" };
    }
    console.error("Error adding favorite:", error);
    return { success: false, error };
  }
}

export async function removeFavorite(propertyId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Find the favorite document
    const favorites = await databases.listDocuments(
      config.databaseId!,
      config.favoritesCollectionId!,
      [
        Query.equal("userId", user.$id),
        Query.equal("propertyId", propertyId),
      ]
    );

    if (favorites.documents.length === 0) {
      return { success: true, message: "Not in favorites" };
    }

    // Delete the favorite
    await databases.deleteDocument(
      config.databaseId!,
      config.favoritesCollectionId!,
      favorites.documents[0].$id
    );

    return { success: true };
  } catch (error) {
    console.error("Error removing favorite:", error);
    return { success: false, error };
  }
}

export async function getFavorites() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const favorites = await databases.listDocuments(
      config.databaseId!,
      config.favoritesCollectionId!,
      [Query.equal("userId", user.$id), Query.orderDesc("$createdAt")]
    );

    // Get full property details for each favorite
    const propertyIds = favorites.documents.map((fav: any) => fav.propertyId);
    
    if (propertyIds.length === 0) {
      return [];
    }

    // Fetch all favorite properties
    const properties = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.equal("$id", propertyIds)]
    );

    return properties.documents as unknown as PropertyDocument[];
  } catch (error) {
    console.error("Error getting favorites:", error);
    return [];
  }
}

export async function getFavoriteIds() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const favorites = await databases.listDocuments(
      config.databaseId!,
      config.favoritesCollectionId!,
      [Query.equal("userId", user.$id)]
    );

    return favorites.documents.map((fav: any) => fav.propertyId);
  } catch (error) {
    console.error("Error getting favorite IDs:", error);
    return [];
  }
}

export async function isFavorite(propertyId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return false;
    }

    const favorites = await databases.listDocuments(
      config.databaseId!,
      config.favoritesCollectionId!,
      [
        Query.equal("userId", user.$id),
        Query.equal("propertyId", propertyId),
        Query.limit(1),
      ]
    );

    return favorites.documents.length > 0;
  } catch (error) {
    console.error("Error checking favorite:", error);
    return false;
  }
}