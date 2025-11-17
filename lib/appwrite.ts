// Use the React Native SDK to enable cookie fallbacks and mobile OAuth helpers
import { PropertyDocument } from "@/components/Cards";
import { gallery } from "@/constants/data";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { Platform } from "react-native";
import { Account, Avatars, Client, Databases, OAuthProvider, Query } from "react-native-appwrite";

export const config = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  propertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
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
            const userAvatar = avatar.getInitials(result.name);

            return {
                ...result,
                avatar: userAvatar.toString(),
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