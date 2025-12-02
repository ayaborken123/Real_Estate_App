// Use the React Native SDK to enable cookie fallbacks and mobile OAuth helpers
import { PropertyDocument } from "@/components/Cards";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { Platform } from "react-native";
import { Account, Avatars, Client, Databases, ID, Models, OAuthProvider, Permission, Query, Role, Storage } from "react-native-appwrite";

// Export Query pour l'utiliser dans d'autres fichiers
export { Query };

// Messaging Types
export interface ConversationDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  participantIds: string[];
  propertyId?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSender: string;
  isRead: boolean;
  type: 'property_inquiry' | 'general' | 'support';
  status: 'active' | 'archived' | 'blocked';
}

export interface MessageDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content?: string;
  messageType: 'text' | 'image' | 'property_card';
  imageUrl?: string;
  propertyData?: any;
  isRead: boolean;
  readAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  isEdited: boolean;
  replyToMessageId?: string;
}

export interface TypingStatusDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  conversationId: string;
  userId: string;
  isTyping: boolean;
  lastTypingAt?: string;
}

// Notifications Types
export type NotificationType = 
  | 'message'
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payment_refunded'
  | 'payout_completed'
  | 'review_received'
  | 'property_favorite'
  | 'system';

export type NotificationCategory = 'messages' | 'bookings' | 'payments' | 'reviews' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationDocument extends Models.Document {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: string; // JSON string containing additional data
  isRead: boolean;
  readAt?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl?: string;
  imageUrl?: string;
  expiresAt?: string;
}

export interface NotificationPreferencesDocument extends Models.Document {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  messagesEnabled: boolean;
  bookingsEnabled: boolean;
  paymentsEnabled: boolean;
  reviewsEnabled: boolean;
  marketingEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// Booking & Payments Types
export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partially_refunded';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface BookingDocument extends Models.Document {
  propertyId: string;
  guestId: string;
  agentId: string;
  checkInDate: string; // ISO 8601
  checkOutDate: string; // ISO 8601
  numberOfGuests: number;
  numberOfNights: number;
  pricePerNight: number;
  subtotal: number;
  serviceFee: number; // 10%
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  specialRequests?: string;
  rejectionReason?: string;
  cancelledBy?: 'guest' | 'agent';
  confirmedAt?: string;
  cancelledAt?: string;
  // Populated relationships
  property?: PropertyDocument;
  guest?: any;
  agent?: any;
}

export interface PaymentDocument extends Models.Document {
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string; // 'card', 'paypal', etc.
  paymentGateway: string; // 'stripe', 'paypal'
  transactionId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';
  receiptUrl?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  gatewayResponse?: string; // JSON string
  // Populated relationships
  booking?: BookingDocument;
}

export interface PayoutDocument extends Models.Document {
  agentId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  bookingIds: string[];
  payoutMethod?: string; // 'bank_transfer', 'paypal'
  scheduledDate: string;
  completedDate?: string;
  // Populated relationships
  agent?: any;
}

// Review System Types
export interface ReviewDocument extends Models.Document {
  propertyId: string;
  userId: string;
  bookingId?: string; // Optional: link to booking if review is from a guest who booked
  rating: number; // 1-5 stars
  comment: string;
  likes: string[]; // Array of user IDs who liked this review
  isEdited: boolean;
  editedAt?: string;
  // Populated relationships
  user?: {
    $id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  property?: PropertyDocument;
}

export interface ReviewLikeDocument extends Models.Document {
  reviewId: string;
  userId: string;
}

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
  // Messaging Configuration
  conversationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CONVERSATIONS_COLLECTION_ID || "conversations",
  messagesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID || "messages",
  typingStatusCollectionId: process.env.EXPO_PUBLIC_APPWRITE_TYPING_STATUS_COLLECTION_ID || "typing_status",
  chatImagesBucketId: process.env.EXPO_PUBLIC_APPWRITE_CHAT_IMAGES_BUCKET_ID || "profile-images", // Use profile-images as default
  // Booking & Payments Configuration
  bookingsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID || "bookings",
  paymentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID || "payments",
  payoutsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PAYOUTS_COLLECTION_ID || "payouts",
  // Notifications Configuration
  notificationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID || "notifications",
  notificationPreferencesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_NOTIFICATION_PREFERENCES_COLLECTION_ID || "notification_preferences",
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

const facilityFilterMap: Record<string, string> = {
  parking: 'Car Parking',
  'car parking': 'Car Parking',
  'sports center': 'Sports Center',
  'sports-center': 'Sports Center',
  gym: 'Gym',
  wifi: 'Wifi',
  'pet-friendly': 'Pet Center',
  'pet friendly': 'Pet Center',
  'pet center': 'Pet Center',
  laundry: 'Laundry',
  cutlery: 'Cutlery',
  'swimming pool': 'Swimming pool',
  'swimming_pool': 'Swimming pool',
};

const normaliseFacilityFilter = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const alias = facilityFilterMap[trimmed.toLowerCase()];
  return alias || trimmed;
};

const normaliseGeolocationPayload = (value: any): string | undefined => {
  if (!value) return undefined;

  const serialise = (lat: number, lng: number) =>
    JSON.stringify({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Try to parse in case it's already JSON and ensure it serialises consistently
    try {
      const parsed = JSON.parse(trimmed);
      const lat = parseFloat(parsed.lat ?? parsed.latitude);
      const lng = parseFloat(parsed.lng ?? parsed.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return serialise(lat, lng);
      }
    } catch (err) {
      if (trimmed.includes(',')) {
        const [latPart, lngPart] = trimmed.split(',');
        const lat = parseFloat(latPart);
        const lng = parseFloat(lngPart);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return serialise(lat, lng);
        }
      }
    }

    return trimmed;
  }

  if (Array.isArray(value) && value.length >= 2) {
    const lat = parseFloat(value[0]);
    const lng = parseFloat(value[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return serialise(lat, lng);
    }
    return undefined;
  }

  if (typeof value === 'object') {
    const lat = parseFloat(value.lat ?? value.latitude);
    const lng = parseFloat(value.lng ?? value.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return serialise(lat, lng);
    }
  }

  return undefined;
};

export async function login() {
  try {
    // If already logged in, return early instead of trying to create a new session
    try {
      const existing = await account.get();
      if (existing && existing.$id) {
        console.log('login: session already active for user', existing.$id);
        return true;
      }
    } catch (e) {
      // If get() fails, continue to create a session
    }

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
    // If Appwrite complains that a session exists, treat as non-fatal and return true
    try {
      const msg = (error as any)?.message || '';
      if (msg.toLowerCase().includes('prohibited') || msg.toLowerCase().includes('session is active')) {
        console.warn('login: session creation prohibited because a session is already active');
        return true;
      }
    } catch (e) {
      console.error('Error:', e);
    }

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
            
            // Convert avatar to proper URL string
            let userAvatar: string;
            if (prefs.photoURL) {
                userAvatar = prefs.photoURL;
            } else {
                // Generate initials avatar URL
                userAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(result.name)}&size=200`;
            }

            // Ensure agent entry exists in agents collection (but don't block on this)
            // Run in background without awaiting to avoid slowing down user fetching
            ensureAgentExists(result.$id, result.name, result.email, userAvatar, prefs.phone).catch(err => {
                console.log('Background agent sync failed (non-critical):', err);
            });

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
        // Silently handle guest/unauthenticated state - user will be redirected to sign-in
        const errorMsg = (error as any)?.message || '';
        if (!errorMsg.includes('missing scope') && !errorMsg.includes('guests')) {
            console.log(error);
        }
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
export async function getProperties({
  filter,
  query,
  limit,
  minPrice,
  maxPrice,
  minBeds,
  maxBeds,
  bathrooms,
  facilities,
  sort,
}: {
  filter: string;
  query: string;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  bathrooms?: number;
  facilities?: string[];
  sort?: 'newest' | 'price_high' | 'price_low' | 'rating';
}) {
  try {
    const buildQuery: any[] = [];

    // SORT
    if (sort) {
      switch (sort) {
        case 'price_high':
          buildQuery.push(Query.orderDesc('price'));
          break;
        case 'price_low':
          buildQuery.push(Query.orderAsc('price'));
          break;
        case 'rating':
          buildQuery.push(Query.orderDesc('rating'));
          break;
        case 'newest':
        default:
          buildQuery.push(Query.orderDesc('$createdAt'));
      }
    } else {
      buildQuery.push(Query.orderDesc('$createdAt'));
    }

    // CATEGORY FILTER
    if (filter && filter !== 'all' && filter !== 'All') {
      buildQuery.push(Query.equal('type', filter));
    }

    // SEARCH (OR conditions)
    if (query) {
      buildQuery.push(
        Query.or([
          Query.search('name', query),
          Query.search('address', query),
          Query.search('type', query),
        ])
      );
    }

    // PRICE RANGE
    if (typeof minPrice === 'number') buildQuery.push(Query.greaterThanEqual('price', minPrice));
    if (typeof maxPrice === 'number') buildQuery.push(Query.lessThanEqual('price', maxPrice));

    // BEDS / BATHS
    if (typeof minBeds === 'number') buildQuery.push(Query.greaterThanEqual('bedrooms', minBeds));
    if (typeof maxBeds === 'number') buildQuery.push(Query.lessThanEqual('bedrooms', maxBeds));
    if (typeof bathrooms === 'number') buildQuery.push(Query.equal('bathrooms', bathrooms));

    // FACILITIES stored as ARRAY in schema; use contains for matching
    if (facilities && facilities.length > 0) {
      const normalisedFacilities = facilities
        .map((f: string) => normaliseFacilityFilter(typeof f === 'string' ? f : ''))
        .filter((f): f is string => !!f);

      if (normalisedFacilities.length > 0) {
        buildQuery.push(Query.contains('facilities', normalisedFacilities as any));
      }
    }

    if (limit) {
      buildQuery.push(Query.limit(limit));
    }

    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      buildQuery
    );

    return result.documents as unknown as PropertyDocument[];
  } catch (error) {
    console.log(error);
    return [];
  }
}

// Property Management Helpers (create/update/delete)
export async function createProperty(data: any) {
  try {
    // Attach current user as agent if not provided
    try {
      const user = await getCurrentUser();
      if (user && !data.agent) {
        // For Appwrite relationship many-to-one, store agent id
        data.agent = user.$id;
        console.log('Creating property with agent ID:', user.$id);
      }
    } catch (e) {
      // ignore - create without agent
      console.error('Could not get user for agent field:', e);
    }

    // Ensure required fields for the properties collection are present
    // Some Appwrite collection schemas may require a `rating` attribute.
    if (typeof data.rating !== 'number') {
      data.rating = 0;
    }

    const geolocationValue = normaliseGeolocationPayload(data.geolocation);
    if (geolocationValue) {
      data.geolocation = geolocationValue;
    } else {
      delete data.geolocation;
    }

    // Facilities: if configured as relationship, skip it during creation
    // If you want facilities as a simple array, change the attribute type in Appwrite
    if ('facilities' in data) {
      delete data.facilities;
      console.log('createProperty - skipping facilities (relationship field)');
    }

    // Remove reviews and gallery if they exist (these attributes/collections may have been deleted)
    if ('reviews' in data) {
      delete data.reviews;
    }
    if ('gallery' in data) {
      delete data.gallery;
    }

    const doc = await databases.createDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      ID.unique(),
      data
    );
    return { success: true, doc };
  } catch (error) {
    console.error('Error creating property:', error);
    return { success: false, error };
  }
}

export async function updateProperty(id: string, data: any) {
  try {
    console.log('updateProperty - incoming data keys:', Object.keys(data));
    
    // Create a minimal payload with ONLY the fields we want to update
    const updatePayload: any = {};
    
    // Only update non-relationship fields that are explicitly provided
    const allowedFields = ['name', 'address', 'price', 'bedrooms', 'bathrooms', 'area', 'type', 'description', 'images', 'rating'];
    
    for (const key of allowedFields) {
      if (key in data && data[key] !== undefined) {
        updatePayload[key] = data[key];
      }
    }

    // Handle geolocation separately
    if ('geolocation' in data) {
      const geolocationValue = normaliseGeolocationPayload(data.geolocation);
      if (geolocationValue) {
        updatePayload.geolocation = geolocationValue;
      }
    }

    // Ensure numeric fields are numbers
    if ('price' in updatePayload) updatePayload.price = Number(updatePayload.price);
    if ('bedrooms' in updatePayload) updatePayload.bedrooms = Number(updatePayload.bedrooms);
    if ('bathrooms' in updatePayload) updatePayload.bathrooms = Number(updatePayload.bathrooms);
    if ('area' in updatePayload) updatePayload.area = Number(updatePayload.area);
    if ('rating' in updatePayload) updatePayload.rating = Number(updatePayload.rating);

    console.log('updateProperty - final payload:', JSON.stringify(updatePayload, null, 2));

    const doc = await databases.updateDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id,
      updatePayload
    );
    return { success: true, doc };
  } catch (error) {
    console.error('Error updating property:', error);
    return { success: false, error };
  }
}

export async function deleteProperty(id: string) {
  try {
    await databases.deleteDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id
    );
    return { success: true };
  } catch (error) {
    console.error('Error deleting property:', error);
    return { success: false, error };
  }
}

// Upload multiple gallery images to a bucket and (optionally) create gallery documents
export async function uploadGalleryImages(images: string[], bucketId: string) {
  try {
    const uploaded: any[] = [];
    for (const uri of images) {
      const filename = uri.split('/').pop() || `gallery-${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileObject = {
        name: filename,
        type: blob.type || 'image/jpeg',
        size: blob.size,
        uri,
        slice: blob.slice?.bind(blob),
        stream: blob.stream?.bind(blob),
        arrayBuffer: blob.arrayBuffer?.bind(blob),
      } as any;

      const uploadBucket = bucketId || config.profileImagesBucketId!;
      const uploadedFile = await storage.createFile(uploadBucket, ID.unique(), fileObject as any);
      const fileUrl = `${config.endpoint}/storage/buckets/${uploadBucket}/files/${uploadedFile.$id}/view?project=${config.projectId}`;

      // Also create a gallery document (if galleries collection configured)
      let galleryDoc: any = null;
      try {
        if (config.galleriesCollectionId) {
          galleryDoc = await databases.createDocument(
            config.databaseId!,
            config.galleriesCollectionId!,
            ID.unique(),
            { image: fileUrl }
          );
        }
      } catch (e) {
        console.warn('Could not create gallery document:', e);
      }

      uploaded.push({ fileId: uploadedFile.$id, fileUrl, galleryDoc });
    }
    return { success: true, uploaded };
  } catch (error) {
    console.error('Error uploading gallery images:', error);
    return { success: false, error };
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

export async function getMyProperties(params?: any) {
  try {
    // Support being called with either a userId string or a params object { userId }
    let uid: string | undefined;
    if (typeof params === 'string') {
      uid = params;
    } else if (params && typeof params === 'object') {
      uid = params.userId || params.userId?.toString();
    }

    if (!uid) {
      const user = await getCurrentUser();
      uid = user?.$id;
    }

    if (!uid) {
      console.log('getMyProperties: No user ID found');
      return [];
    }

    console.log('getMyProperties: Querying properties for agent ID:', uid);
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.equal('agent', uid as any), Query.orderDesc('$createdAt')]
    );

    console.log('getMyProperties: Found', result.documents.length, 'properties');
    return result.documents as unknown as PropertyDocument[];
  } catch (error) {
    console.error('Error fetching user properties:', error);
    return [];
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
    
    // Also create/update agent entry in agents collection
    await ensureAgentExists(
      currentUser.$id, 
      currentUser.name, 
      currentUser.email, 
      prefs.photoURL || currentPrefs.photoURL,
      prefs.phone || currentPrefs.phone
    );
    
    return { success: true };
  } catch (error) {
    console.error("Error updating preferences:", error);
    return { success: false, error };
  }
}

// Create or update agent entry in agents collection
export async function ensureAgentExists(userId: string, name: string, email: string, avatarValue?: string, phone?: string) {
  try {
    // Convert avatar to string URL if it's not already
    let avatarUrl: string;
    
    if (avatarValue && typeof avatarValue === 'string') {
      // Check if it's already a valid URL
      if (avatarValue.startsWith('http://') || avatarValue.startsWith('https://')) {
        avatarUrl = avatarValue;
      } else {
        // If it's not a URL, generate one
        avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200`;
      }
    } else {
      // Default avatar URL
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200`;
    }
    
    // Check if agent already exists
    const existingAgents = await databases.listDocuments(
      config.databaseId!,
      config.agentsCollectionId!,
      [Query.equal('$id', userId)]
    );

    const agentData: any = {
      name: name,
      email: email,
      avatar: avatarUrl
    };
    
    // Add phone if provided
    if (phone) {
      agentData.phone = phone;
    }

    if (existingAgents.documents.length > 0) {
      // Update existing agent
      await databases.updateDocument(
        config.databaseId!,
        config.agentsCollectionId!,
        userId,
        agentData
      );
      console.log('Agent updated successfully');
    } else {
      // Create new agent with the user's ID
      await databases.createDocument(
        config.databaseId!,
        config.agentsCollectionId!,
        userId, // Use user ID as agent ID for easy relationship
        agentData
      );
      console.log('Agent created successfully');
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error ensuring agent exists:", error);
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

// ================================
// MESSAGING FUNCTIONS
// ================================

// Create or get existing conversation between two users
export async function createOrGetConversation(otherUserId: string, propertyId?: string): Promise<{ success: boolean; conversation?: ConversationDocument; error?: any }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if conversation already exists between these two users
    const existingConversations = await databases.listDocuments(
      config.databaseId!,
      config.conversationsCollectionId!,
      [
        Query.contains("participantIds", [user.$id]),
        Query.contains("participantIds", [otherUserId]),
        Query.limit(1),
      ]
    );

    if (existingConversations.documents.length > 0) {
      return {
        success: true,
        conversation: existingConversations.documents[0] as unknown as ConversationDocument,
      };
    }

    // Create new conversation
    const conversationData = {
      participantIds: [user.$id, otherUserId],
      propertyId: propertyId || undefined,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      lastMessageSender: "",
      isRead: false,
      type: propertyId ? "property_inquiry" : "general",
      status: "active",
    };

    const conversation = await databases.createDocument(
      config.databaseId!,
      config.conversationsCollectionId!,
      ID.unique(),
      conversationData
    );

    return {
      success: true,
      conversation: conversation as unknown as ConversationDocument,
    };
  } catch (error) {
    console.error("Error creating/getting conversation:", error);
    return { success: false, error };
  }
}

// Mark conversation as read
export async function markConversationAsRead(conversationId: string): Promise<void> {
  try {
    await databases.updateDocument(
      config.databaseId!,
      config.conversationsCollectionId!,
      conversationId,
      {
        isRead: true
      }
    );
  } catch (error) {
    console.error("Error marking conversation as read:", error);
  }
}

// Search agents by name
export async function searchAgentsByName(query: string): Promise<any[]> {
  try {
    // Utiliser contains au lieu de search pour éviter l'erreur fulltext
    const response = await databases.listDocuments(
      config.databaseId!,
      config.agentsCollectionId!,
      [
        Query.contains('name', query),
        Query.limit(20)
      ]
    );
    
    // Filtrer côté client pour une recherche plus flexible
    const filteredResults = response.documents.filter(agent => 
      agent.name?.toLowerCase().includes(query.toLowerCase()) ||
      agent.email?.toLowerCase().includes(query.toLowerCase()) ||
      agent.agency?.toLowerCase().includes(query.toLowerCase())
    );
    
    return filteredResults;
  } catch (error) {
    console.error("Error searching agents:", error);
    // En cas d'erreur, essayer une recherche simple sans filtre
    try {
      const fallbackResponse = await databases.listDocuments(
        config.databaseId!,
        config.agentsCollectionId!,
        [Query.limit(50)]
      );
      
      // Filtrer côté client
      return fallbackResponse.documents.filter(agent => 
        agent.name?.toLowerCase().includes(query.toLowerCase())
      );
    } catch (fallbackError) {
      console.error("Fallback search failed:", fallbackError);
      return [];
    }
  }
}

// Create conversation from property post
export async function createConversationFromProperty(propertyId: string, agentId: string): Promise<{success: boolean, conversationId?: string, error?: any}> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if conversation already exists
    const existingConversations = await databases.listDocuments(
      config.databaseId!,
      config.conversationsCollectionId!,
      [
        Query.and([
          Query.contains("participantIds", [currentUser.$id]),
          Query.contains("participantIds", [agentId]),
          Query.equal("propertyId", propertyId)
        ])
      ]
    );

    if (existingConversations.documents.length > 0) {
      return { 
        success: true, 
        conversationId: existingConversations.documents[0].$id 
      };
    }

    // Create new conversation
    const conversation = await databases.createDocument(
      config.databaseId!,
      config.conversationsCollectionId!,
      ID.unique(),
      {
        participantIds: [currentUser.$id, agentId],
        propertyId: propertyId,
        lastMessage: "Nouvelle conversation",
        lastMessageAt: new Date().toISOString(),
        lastMessageSender: currentUser.$id,
        isRead: false,
        type: "property_inquiry",
        status: "active"
      }
    );

    return { 
      success: true, 
      conversationId: conversation.$id 
    };
  } catch (error) {
    console.error("Error creating conversation from property:", error);
    return { success: false, error };
  }
}

// Get all conversations for current user
export async function getUserConversations(userId?: string): Promise<ConversationDocument[]> {
  try {
    let user;
    if (userId) {
      // Si un userId est fourni, l'utiliser directement
      user = { $id: userId };
    } else {
      // Sinon récupérer l'utilisateur actuel
      user = await getCurrentUser();
      if (!user) {
        return [];
      }
    }

    const conversations = await databases.listDocuments(
      config.databaseId!,
      config.conversationsCollectionId!,
      [
        Query.contains("participantIds", [user.$id]),
        Query.orderDesc("lastMessageAt"),
        Query.limit(100),
      ]
    );

    // Remove duplicates and filter out conversations without messages
    const uniqueConversations = new Map<string, ConversationDocument>();
    
    (conversations.documents as unknown as ConversationDocument[]).forEach(conv => {
      // Only include conversations that have at least one message
      if (conv.lastMessage && conv.lastMessage.trim() !== '') {
        // Check if we already have this conversation (by checking participant combination)
        const otherParticipant = conv.participantIds.find(id => id !== user.$id);
        const conversationKey = [user.$id, otherParticipant].sort().join('_');
        
        // Only add if not already added, or if this is a newer version (more recent lastMessageAt)
        const existing = uniqueConversations.get(conversationKey);
        if (!existing || new Date(conv.lastMessageAt) > new Date(existing.lastMessageAt)) {
          uniqueConversations.set(conversationKey, conv);
        }
      }
    });

    // Convert map back to array and sort by lastMessageAt
    return Array.from(uniqueConversations.values()).sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  } catch (error) {
    console.error("Error getting user conversations:", error);
    return [];
  }
}

// Send a text message
export async function sendMessage(conversationId: string, receiverId: string, content: string): Promise<{ success: boolean; message?: MessageDocument; error?: any }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Create message
    const messageData = {
      conversationId,
      senderId: user.$id,
      receiverId,
      content,
      messageType: "text",
      isRead: false,
      isDelivered: false,
      isEdited: false,
    };

    const message = await databases.createDocument(
      config.databaseId!,
      config.messagesCollectionId!,
      ID.unique(),
      messageData
    );

    // Update conversation with last message info
    await databases.updateDocument(
      config.databaseId!,
      config.conversationsCollectionId!,
      conversationId,
      {
        lastMessage: content.substring(0, 100),
        lastMessageAt: new Date().toISOString(),
        lastMessageSender: user.$id,
        isRead: false,
      }
    );

    // Create an in-app notification for the receiver (respecting preferences)
    try {
      const allow = await shouldSendNotification(receiverId, 'messages');
      if (allow) {
        await createNotification({
          userId: receiverId,
          type: 'message',
          title: `New message from ${user.name || 'user'}`,
          message: content.substring(0, 95), // Max 100 chars in DB, leave room for ellipsis
          category: 'messages',
          priority: 'normal',
          actionUrl: `/chat/${conversationId}?otherUserId=${user.$id}`,
          data: { conversationId, senderId: user.$id },
        });
      }
    } catch (e) {
      console.warn('sendMessage: failed to create notification (non-fatal):', e);
    }

    return {
      success: true,
      message: message as unknown as MessageDocument,
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error };
  }
}

// Get messages for a conversation
export async function getConversationMessages(conversationId: string, limit: number = 50): Promise<MessageDocument[]> {
  try {
    const messages = await databases.listDocuments(
      config.databaseId!,
      config.messagesCollectionId!,
      [
        Query.equal("conversationId", conversationId),
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
      ]
    );

    return messages.documents.reverse() as unknown as MessageDocument[];
  } catch (error) {
    console.error("Error getting conversation messages:", error);
    return [];
  }
}

// Mark message as read
export async function markMessageAsRead(messageId: string): Promise<{ success: boolean; error?: any }> {
  try {
    await databases.updateDocument(
      config.databaseId!,
      config.messagesCollectionId!,
      messageId,
      {
        isRead: true,
        readAt: new Date().toISOString(),
      }
    );

    return { success: true };
  } catch (error) {
    console.error("Error marking message as read:", error);
    return { success: false, error };
  }
}

// Upload chat image
export async function uploadChatImage(imageUri: string): Promise<{ success: boolean; fileUrl?: string; fileId?: string; error?: any }> {
  try {
    console.log("Uploading chat image...");
    const filename = imageUri.split('/').pop() || `chat-${Date.now()}.jpg`;
    console.log("Filename:", filename);
    
    const response = await fetch(imageUri);
    const blob = await response.blob();
    console.log("Blob size:", blob.size, "type:", blob.type);
    
    const fileObject = {
      name: filename,
      type: blob.type || 'image/jpeg',
      size: blob.size,
      uri: imageUri,
      slice: blob.slice?.bind(blob),
      stream: blob.stream?.bind(blob),
      arrayBuffer: blob.arrayBuffer?.bind(blob),
    };

    // Use profile images bucket if chat images bucket doesn't exist
    const bucketId = config.chatImagesBucketId || config.profileImagesBucketId!;
    console.log("Using bucket:", bucketId);

    const uploadedFile = await storage.createFile(
      bucketId,
      ID.unique(),
      fileObject as any
    );

    console.log("File uploaded successfully:", uploadedFile.$id);
    const fileUrl = `${config.endpoint}/storage/buckets/${bucketId}/files/${uploadedFile.$id}/view?project=${config.projectId}`;

    return {
      success: true,
      fileUrl,
      fileId: uploadedFile.$id,
    };
  } catch (error) {
    console.error("Error uploading chat image:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return { success: false, error };
  }
}

// Send image message
export async function sendImageMessage(conversationId: string, receiverId: string, imageUri: string): Promise<{ success: boolean; message?: MessageDocument; error?: any }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Upload image first
    const uploadResult = await uploadChatImage(imageUri);
    if (!uploadResult.success) {
      throw new Error("Failed to upload image");
    }

    // Create image message
    const messageData = {
      conversationId,
      senderId: user.$id,
      receiverId,
      content: "📷 Image",
      messageType: "image",
      imageUrl: uploadResult.fileUrl,
      isRead: false,
      isDelivered: false,
      isEdited: false,
    };

    const message = await databases.createDocument(
      config.databaseId!,
      config.messagesCollectionId!,
      ID.unique(),
      messageData
    );

    // Update conversation
    await databases.updateDocument(
      config.databaseId!,
      config.conversationsCollectionId!,
      conversationId,
      {
        lastMessage: "📷 Image",
        lastMessageAt: new Date().toISOString(),
        lastMessageSender: user.$id,
        isRead: false,
      }
    );

    // Notify receiver for image message
    try {
      const allow = await shouldSendNotification(receiverId, 'messages');
      if (allow) {
        await createNotification({
          userId: receiverId,
          type: 'message',
          title: `New photo from ${user.name || 'user'}`,
          message: 'Sent you an image',
          category: 'messages',
          priority: 'normal',
          actionUrl: `/chat/${conversationId}?otherUserId=${user.$id}`,
          data: { conversationId, senderId: user.$id },
        });
      }
    } catch (e) {
      console.warn('sendImageMessage: failed to create notification (non-fatal):', e);
    }

    return {
      success: true,
      message: message as unknown as MessageDocument,
    };
  } catch (error) {
    console.error("Error sending image message:", error);
    return { success: false, error };
  }
}

// Delete conversation
export async function deleteConversation(conversationId: string): Promise<{ success: boolean; error?: any }> {
  try {
    // First delete all messages in the conversation
    const messages = await databases.listDocuments(
      config.databaseId!,
      config.messagesCollectionId!,
      [Query.equal("conversationId", conversationId)]
    );

    for (const message of messages.documents) {
      await databases.deleteDocument(
        config.databaseId!,
        config.messagesCollectionId!,
        message.$id
      );
    }

    // Then delete the conversation
    await databases.deleteDocument(
      config.databaseId!,
      config.conversationsCollectionId!,
      conversationId
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return { success: false, error };
  }
}

// Get all agents who have properties (excluding current user)
export async function getAllAgents(): Promise<any[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    // Get all properties first to find agents with properties
    const properties = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.limit(1000)] // Get many properties to find all agents
    );

    // Get unique agent IDs from properties
    const agentIdsSet = new Set(properties.documents.map((prop: any) => prop.agent).filter(Boolean));
    const agentIds = Array.from(agentIdsSet);
    
    if (agentIds.length === 0) {
      return [];
    }
    // Get agent details for those who have properties
    const agents = await databases.listDocuments(
      config.databaseId!,
      config.agentsCollectionId!,
      [Query.equal("$id", agentIds)]
    );

    // Filter out current user and return with property count
    return agents.documents
      .filter((agent: any) => agent.$id !== user.$id)
      .map((agent: any) => ({
        ...agent,
        propertyCount: properties.documents.filter((prop: any) => prop.agent === agent.$id).length
      }))
      .sort((a: any, b: any) => b.propertyCount - a.propertyCount); // Sort by property count
  } catch (error) {
    console.error("Error getting agents:", error);
    return [];
  }
}

// Get agent data by ID
export async function getAgentById(agentId: string): Promise<any | null> {
  try {
    const agent = await databases.getDocument(
      config.databaseId!,
      config.agentsCollectionId!,
      agentId
    );
    return agent;
  } catch (error) {
    console.error("Error getting agent by ID:", error);
    return null;
  }
}

// Get unread message count for current user
export async function getUnreadMessageCount(): Promise<number> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return 0;
    }

    const messages = await databases.listDocuments(
      config.databaseId!,
      config.messagesCollectionId!,
      [
        Query.equal("receiverId", user.$id),
        Query.equal("isRead", false),
        Query.limit(100), // Limit to avoid performance issues
      ]
    );

    return messages.documents.length;
  } catch (error) {
    console.error("Error getting unread message count:", error);
    return 0;
  }
}

// =============================================================================
// BOOKING & PAYMENTS FUNCTIONS
// =============================================================================

/**
 * Check if dates are available for a property
 * Returns true if the dates are available, false if there's a conflict
 */
export async function checkAvailability(
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  excludeBookingId?: string
): Promise<boolean> {
  try {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Query for overlapping bookings with confirmed or pending status
    const queries = [
      Query.equal("propertyId", propertyId),
      Query.or([
        Query.equal("status", "confirmed"),
        Query.equal("status", "pending"),
      ]),
    ];

    if (excludeBookingId) {
      queries.push(Query.notEqual("$id", excludeBookingId));
    }

    const bookings = await databases.listDocuments<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      queries
    );

    // Check for date overlaps
    for (const booking of bookings.documents) {
      const existingCheckIn = new Date(booking.checkInDate);
      const existingCheckOut = new Date(booking.checkOutDate);

      // Check if dates overlap
      const hasOverlap = checkIn < existingCheckOut && checkOut > existingCheckIn;
      
      if (hasOverlap) {
        return false; // Dates not available
      }
    }

    return true; // Dates are available
  } catch (error) {
    console.error("Error checking availability:", error);
    throw error;
  }
}

/**
 * Calculate booking price details
 */
export function calculateBookingPrice(
  pricePerNight: number,
  checkInDate: string,
  checkOutDate: string
): { numberOfNights: number; subtotal: number; serviceFee: number; totalPrice: number } {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  
  const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const subtotal = pricePerNight * numberOfNights;
  const serviceFee = subtotal * 0.1; // 10% service fee
  const totalPrice = subtotal + serviceFee;

  return {
    numberOfNights,
    subtotal,
    serviceFee,
    totalPrice,
  };
}

/**
 * Create a new booking request
 */
export async function createBooking(bookingData: {
  propertyId: string;
  guestId: string;
  agentId: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  pricePerNight: number;
  specialRequests?: string;
}): Promise<BookingDocument> {
  try {
    // Validate dates
    const checkIn = new Date(bookingData.checkInDate);
    const checkOut = new Date(bookingData.checkOutDate);
    const now = new Date();

    if (checkIn < now) {
      throw new Error("Check-in date must be in the future");
    }

    if (checkOut <= checkIn) {
      throw new Error("Check-out date must be after check-in date");
    }

    // Check availability
    const isAvailable = await checkAvailability(
      bookingData.propertyId,
      bookingData.checkInDate,
      bookingData.checkOutDate
    );

    if (!isAvailable) {
      throw new Error("Selected dates are not available");
    }

    // Calculate pricing
    const priceDetails = calculateBookingPrice(
      bookingData.pricePerNight,
      bookingData.checkInDate,
      bookingData.checkOutDate
    );

    // Create booking document
    const booking = await databases.createDocument<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      ID.unique(),
      {
        ...bookingData,
        ...priceDetails,
        status: "pending",
        paymentStatus: "unpaid",
      }
    );

    console.log("Booking created successfully:", booking.$id);

    // Notify agent about the new booking request
    try {
      const allow = await shouldSendNotification(bookingData.agentId, 'bookings');
      if (allow) {
        // Try to get current user name and property name for a better message
        const current = await getCurrentUser();
        let propertyName = '';
        try {
          const prop = await getPropertyById({ id: bookingData.propertyId });
          propertyName = (prop as any)?.name || '';
        } catch {}
        await createNotification({
          userId: bookingData.agentId,
          type: 'booking_request',
          title: 'New booking request',
          message: `${current?.name || 'A guest'} requested ${propertyName || 'your property'}`,
          category: 'bookings',
          priority: 'high',
          actionUrl: `/\(root\)/\(tabs\)/bookings`,
          data: { bookingId: booking.$id, propertyId: bookingData.propertyId },
        });
      }
    } catch (e) {
      console.warn('createBooking: failed to create notification (non-fatal):', e);
    }

    return booking;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
}

/**
 * Get bookings for a user (as guest)
 */
export async function getUserBookings(userId: string): Promise<BookingDocument[]> {
  try {
    const bookings = await databases.listDocuments<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      [
        Query.equal("guestId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ]
    );

    return bookings.documents;
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    throw error;
  }
}

/**
 * Get booking requests for an agent
 */
export async function getAgentBookings(agentId: string, status?: BookingStatus): Promise<BookingDocument[]> {
  try {
    const queries = [
      Query.equal("agentId", agentId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ];

    if (status) {
      queries.push(Query.equal("status", status));
    }

    const bookings = await databases.listDocuments<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      queries
    );

    return bookings.documents;
  } catch (error) {
    console.error("Error fetching agent bookings:", error);
    throw error;
  }
}

/**
 * Get a single booking by ID
 */
export async function getBooking(bookingId: string): Promise<BookingDocument> {
  try {
    const booking = await databases.getDocument<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      bookingId
    );

    return booking;
  } catch (error) {
    console.error("Error fetching booking:", error);
    throw error;
  }
}

/**
 * Update booking status (accept/reject by agent)
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  rejectionReason?: string
): Promise<BookingDocument> {
  try {
    const updateData: any = { status };

    if (status === "confirmed") {
      updateData.confirmedAt = new Date().toISOString();
    }

    if (status === "rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const booking = await databases.updateDocument<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      bookingId,
      updateData
    );

    console.log(`Booking ${bookingId} status updated to ${status}`);

    // Send notifications to the guest based on status
    try {
      let title = '';
      let message = '';
      let type: NotificationType = 'system';
      if (status === 'confirmed') {
        title = 'Booking confirmed 🎉';
        message = 'Your booking has been accepted by the host.';
        type = 'booking_confirmed';
      } else if (status === 'rejected') {
        title = 'Booking request declined';
        message = rejectionReason ? `Reason: ${rejectionReason}` : 'Your request was declined.';
        type = 'booking_rejected';
      }

      if (title) {
        // Extract userId string - CRITICAL: guestId may be a populated relation object
        let guestUserId: string;
        if (typeof booking.guestId === 'string') {
          guestUserId = booking.guestId;
        } else if (booking.guestId && typeof booking.guestId === 'object' && '$id' in booking.guestId) {
          guestUserId = (booking.guestId as any).$id;
        } else {
          console.warn('Unable to extract guestId from booking:', booking.guestId);
          return booking; // Skip notification
        }
        
        console.log('📧 Sending booking notification to guestId:', guestUserId);
        
        const allow = await shouldSendNotification(guestUserId, 'bookings');
        if (allow) {
          // Fetch property to enrich message (best-effort)
          let propertyName = '';
          try {
            const prop = await getPropertyById({ id: booking.propertyId });
            propertyName = (prop as any)?.name || '';
          } catch {}
          await createNotification({
            userId: guestUserId,
            type,
            title,
            message: propertyName ? `${message} — ${propertyName}` : message,
            category: 'bookings',
            priority: 'high',
            actionUrl: `/(root)/(tabs)/bookings`,
            data: { bookingId: booking.$id },
          });
        }
      }
    } catch (e) {
      console.warn('updateBookingStatus: failed to create notification (non-fatal):', e);
    }

    return booking;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  cancelledBy: 'guest' | 'agent',
  reason?: string
): Promise<BookingDocument> {
  try {
    const booking = await databases.updateDocument<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      bookingId,
      {
        status: "cancelled",
        cancelledBy,
        cancelledAt: new Date().toISOString(),
        rejectionReason: reason,
      }
    );

    console.log(`Booking ${bookingId} cancelled by ${cancelledBy}`);

    // Notify the other party
    try {
      const notifyUserId = cancelledBy === 'guest' ? booking.agentId : booking.guestId;
      
      // Extract userId string - CRITICAL: IDs may be populated relation objects
      let notifyUserIdString: string;
      if (typeof notifyUserId === 'string') {
        notifyUserIdString = notifyUserId;
      } else if (notifyUserId && typeof notifyUserId === 'object' && '$id' in notifyUserId) {
        notifyUserIdString = (notifyUserId as any).$id;
      } else {
        console.warn('Unable to extract userId from booking relation:', notifyUserId);
        return booking; // Skip notification
      }
      
      console.log('📧 Sending cancel notification to userId:', notifyUserIdString);
      
      const allow = await shouldSendNotification(notifyUserIdString, 'bookings');
      if (allow) {
        await createNotification({
          userId: notifyUserIdString,
          type: 'booking_cancelled',
          title: 'Booking cancelled',
          message: reason ? `Reason: ${reason}` : 'The booking was cancelled.',
          category: 'bookings',
          priority: 'high',
          actionUrl: `/(root)/(tabs)/bookings`,
          data: { bookingId: booking.$id, cancelledBy },
        });
      }
    } catch (e) {
      console.warn('cancelBooking: failed to create notification (non-fatal):', e);
    }

    return booking;
  } catch (error) {
    console.error("Error cancelling booking:", error);
    throw error;
  }
}

/**
 * Update payment status after successful payment
 */
export async function updateBookingPaymentStatus(
  bookingId: string,
  paymentStatus: PaymentStatus
): Promise<BookingDocument> {
  try {
    const booking = await databases.updateDocument<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      bookingId,
      { paymentStatus }
    );

    console.log(`Booking ${bookingId} payment status updated to ${paymentStatus}`);

    // Notify agent when payment is completed
    try {
      if (paymentStatus === 'paid') {
        // Extract userId string - CRITICAL: agentId may be populated relation object
        let agentUserId: string;
        if (typeof booking.agentId === 'string') {
          agentUserId = booking.agentId;
        } else if (booking.agentId && typeof booking.agentId === 'object' && '$id' in booking.agentId) {
          agentUserId = (booking.agentId as any).$id;
        } else {
          console.warn('Unable to extract agentId from booking:', booking.agentId);
          return booking; // Skip notification
        }
        
        console.log('📧 Sending payment notification to agentId:', agentUserId);
        
        const allow = await shouldSendNotification(agentUserId, 'payments');
        if (allow) {
          await createNotification({
            userId: agentUserId,
            type: 'payment_received',
            title: 'Payment received 💰',
            message: `A booking has been paid by the guest`,
            category: 'payments',
            priority: 'high',
            actionUrl: `/(root)/(tabs)/bookings`,
            data: { bookingId: booking.$id, amount: booking.totalPrice },
          });
        }
      }
    } catch (e) {
      console.warn('updateBookingPaymentStatus: failed to create notification (non-fatal):', e);
    }

    return booking;
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
}

/**
 * Get bookings for a specific property (for calendar view)
 */
export async function getPropertyBookings(propertyId: string): Promise<BookingDocument[]> {
  try {
    const bookings = await databases.listDocuments<BookingDocument>(
      config.databaseId!,
      config.bookingsCollectionId!,
      [
        Query.equal("propertyId", propertyId),
        Query.or([
          Query.equal("status", "confirmed"),
          Query.equal("status", "pending"),
        ]),
        Query.orderAsc("checkInDate"),
      ]
    );

    return bookings.documents;
  } catch (error) {
    console.error("Error fetching property bookings:", error);
    throw error;
  }
}

/**
 * Calculate refund amount based on cancellation policy
 */
export function calculateRefund(
  booking: BookingDocument,
  cancelledBy: 'guest' | 'agent'
): { refundAmount: number; refundPercentage: number; policy: string } {
  // If agent cancels, full refund
  if (cancelledBy === 'agent') {
    return {
      refundAmount: booking.totalPrice,
      refundPercentage: 100,
      policy: 'full_refund_agent_cancellation',
    };
  }

  // If payment not made yet, no refund needed
  if (booking.paymentStatus !== 'paid') {
    return {
      refundAmount: 0,
      refundPercentage: 0,
      policy: 'no_payment_made',
    };
  }

  // Calculate days until check-in
  const now = new Date();
  const checkIn = new Date(booking.checkInDate);
  const daysUntilCheckIn = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Cancellation policy
  if (daysUntilCheckIn >= 7) {
    // Full refund minus service fee
    return {
      refundAmount: booking.subtotal, // Refund without service fee
      refundPercentage: 100,
      policy: 'flexible_full_refund',
    };
  } else if (daysUntilCheckIn >= 3) {
    // 50% refund
    return {
      refundAmount: booking.totalPrice * 0.5,
      refundPercentage: 50,
      policy: 'moderate_half_refund',
    };
  } else {
    // No refund
    return {
      refundAmount: 0,
      refundPercentage: 0,
      policy: 'strict_no_refund',
    };
  }
}

/**
 * Create a payment record (mock integration)
 */
export async function createPaymentRecord(paymentData: {
  bookingId: string;
  userId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  paymentGateway?: string;
  transactionId?: string;
  gatewayResponse?: string;
}): Promise<PaymentDocument> {
  try {
    const payload = {
      bookingId: paymentData.bookingId,
      userId: paymentData.userId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      paymentMethod: paymentData.paymentMethod || 'card',
      paymentGateway: paymentData.paymentGateway || 'mock',
      transactionId: paymentData.transactionId || ID.unique(),
      status: 'succeeded',
      gatewayResponse: paymentData.gatewayResponse || null,
    } as any;

    const payment = await databases.createDocument<PaymentDocument>(
      config.databaseId!,
      config.paymentsCollectionId!,
      ID.unique(),
      payload
    );

    // Mark booking as paid
    try {
      await updateBookingPaymentStatus(paymentData.bookingId, 'paid');
    } catch (e) {
      console.warn('Failed to update booking payment status after payment:', e);
    }

    return payment;
  } catch (error) {
    console.error('Error creating payment record:', error);
    throw error;
  }
}

export async function getUserPayments(userId: string): Promise<PaymentDocument[]> {
  try {
    const res = await databases.listDocuments<PaymentDocument>(
      config.databaseId!,
      config.paymentsCollectionId!,
      [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
    );

    return res.documents;
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return [];
  }
}

// ==========================================
// REVIEW SYSTEM FUNCTIONS
// ==========================================

/**
 * Create a new review for a property
 * @param reviewData - Review details including propertyId, rating, comment
 * @returns Created review document
 * 
 * How it works:
 * 1. Gets current authenticated user
 * 2. Creates a review document with user info, rating (1-5), and comment
 * 3. Initializes empty likes array and sets isEdited to false
 * 4. Returns the created review with user data populated
 */
export async function createReview(reviewData: {
  propertyId: string;
  bookingId?: string;
  rating: number;
  comment: string;
}): Promise<ReviewDocument> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Validate rating
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const review = await databases.createDocument<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      ID.unique(),
      {
        propertyId: reviewData.propertyId,
        userId: user.$id,
        bookingId: reviewData.bookingId || undefined,
        rating: reviewData.rating,
        comment: reviewData.comment,
        likes: [], // Initialize empty likes array
        isEdited: false,
      }
    );

    // Return review with user data
    return {
      ...review,
      user: {
        $id: user.$id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
      }
    };
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
}

/**
 * Update an existing review
 * @param reviewId - ID of the review to update
 * @param updateData - New rating and/or comment
 * @returns Updated review document
 * 
 * How it works:
 * 1. Verifies user owns the review
 * 2. Updates rating and comment
 * 3. Sets isEdited flag to true and records editedAt timestamp
 */
export async function updateReview(
  reviewId: string,
  updateData: {
    rating?: number;
    comment?: string;
  }
): Promise<ReviewDocument> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    // Get existing review to verify ownership
    const existingReview = await databases.getDocument<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      reviewId
    );

    if (existingReview.userId !== user.$id) {
      throw new Error("You can only edit your own reviews");
    }

    // Validate rating if provided
    if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    const updatedReview = await databases.updateDocument<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      reviewId,
      {
        ...(updateData.rating && { rating: updateData.rating }),
        ...(updateData.comment && { comment: updateData.comment }),
        isEdited: true,
        editedAt: new Date().toISOString(),
      }
    );

    return updatedReview;
  } catch (error) {
    console.error("Error updating review:", error);
    throw error;
  }
}

/**
 * Delete a review
 * @param reviewId - ID of the review to delete
 * 
 * How it works:
 * 1. Verifies user owns the review
 * 2. Deletes the review document from database
 */
export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Verify ownership before deleting
    const review = await databases.getDocument<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      reviewId
    );

    if (review.userId !== user.$id) {
      throw new Error("You can only delete your own reviews");
    }

    await databases.deleteDocument(
      config.databaseId!,
      config.reviewsCollectionId!,
      reviewId
    );
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
}

/**
 * Get all reviews for a specific property
 * @param propertyId - ID of the property
 * @returns Array of reviews with user data populated
 * 
 * How it works:
 * 1. Queries reviews collection for matching propertyId
 * 2. Orders by creation date (newest first)
 * 3. For each review, fetches the user data
 * 4. Returns reviews with populated user info
 */
export async function getPropertyReviews(propertyId: string): Promise<ReviewDocument[]> {
  try {
    const reviews = await databases.listDocuments<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      [
        Query.equal("propertyId", propertyId),
        Query.orderDesc("$createdAt"),
        Query.limit(100), // Limit to 100 reviews
      ]
    );

    // Populate user data for each review
    const reviewsWithUsers = await Promise.all(
      reviews.documents.map(async (review) => {
        try {
          const user = await databases.getDocument(
            config.databaseId!,
            config.agentsCollectionId!, // Assuming users are in agents collection
            review.userId
          );

          return {
            ...review,
            user: {
              $id: user.$id,
              name: user.name,
              avatar: user.avatar,
              email: user.email,
            }
          };
        } catch (error) {
          // If user not found, return review without user data
          return review;
        }
      })
    );

    return reviewsWithUsers;
  } catch (error: any) {
    // Silently handle missing collection
    if (error?.message?.includes('Collection with the requested ID could not be found')) {
      return [];
    }
    console.error("Error fetching property reviews:", error);
    return [];
  }
}

/**
 * Toggle like/unlike on a review
 * @param reviewId - ID of the review
 * @returns Updated review with new likes array
 * 
 * How it works:
 * 1. Gets current review document
 * 2. Checks if user already liked it
 * 3. If liked: removes user ID from likes array
 * 4. If not liked: adds user ID to likes array
 * 5. Updates the review document with new likes array
 */
export async function toggleReviewLike(reviewId: string): Promise<ReviewDocument> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get current review
    const review = await databases.getDocument<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      reviewId
    );

    const likes = review.likes || [];
    const userIndex = likes.indexOf(user.$id);
    
    let updatedLikes: string[];
    
    if (userIndex > -1) {
      // User already liked - remove like
      updatedLikes = likes.filter(id => id !== user.$id);
    } else {
      // User hasn't liked - add like
      updatedLikes = [...likes, user.$id];
    }

    const updatedReview = await databases.updateDocument<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      reviewId,
      {
        likes: updatedLikes,
      }
    );

    return updatedReview;
  } catch (error) {
    console.error("Error toggling review like:", error);
    throw error;
  }
}

/**
 * Check if current user has already reviewed a property
 * @param propertyId - ID of the property
 * @returns Review document if exists, null otherwise
 */
export async function getUserReviewForProperty(propertyId: string): Promise<ReviewDocument | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const reviews = await databases.listDocuments<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      [
        Query.equal("propertyId", propertyId),
        Query.equal("userId", user.$id),
        Query.limit(1),
      ]
    );

    return reviews.documents.length > 0 ? reviews.documents[0] : null;
  } catch (error: any) {
    // Silently handle missing collection
    if (error?.message?.includes('Collection with the requested ID could not be found')) {
      return null;
    }
    console.error("Error checking user review:", error);
    return null;
  }
}

/**
 * Get average rating for a property
 * @param propertyId - ID of the property
 * @returns Object with average rating and review count
 */
export async function getPropertyRating(propertyId: string): Promise<{
  average: number;
  count: number;
}> {
  try {
    const reviews = await databases.listDocuments<ReviewDocument>(
      config.databaseId!,
      config.reviewsCollectionId!,
      [
        Query.equal("propertyId", propertyId),
      ]
    );

    if (reviews.documents.length === 0) {
      return { average: 0, count: 0 };
    }

    const totalRating = reviews.documents.reduce((sum, review) => sum + review.rating, 0);
    const average = totalRating / reviews.documents.length;

    return {
      average: Math.round(average * 10) / 10, // Round to 1 decimal
      count: reviews.documents.length,
    };
  } catch (error: any) {
    // Silently handle missing collection
    if (error?.message?.includes('Collection with the requested ID could not be found')) {
      return { average: 0, count: 0 };
    }
    console.error("Error calculating property rating:", error);
    return { average: 0, count: 0 };
  }
}

// ============================================
// NOTIFICATIONS FUNCTIONS
// ============================================

/**
 * Create a notification for a user
 */
export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  actionUrl?: string;
  imageUrl?: string;
  data?: Record<string, any>;
  expiresAt?: string;
}): Promise<NotificationDocument> {
  try {
    console.log('🔔 CREATING NOTIFICATION:', {
      userId: data.userId,
      type: data.type,
      title: data.title,
      category: data.category,
    });

    const notificationData: any = {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      category: data.category,
      priority: data.priority || 'normal',
      isRead: false,
    };

    if (data.actionUrl) notificationData.actionUrl = data.actionUrl;
    if (data.imageUrl) notificationData.imageUrl = data.imageUrl;
    if (data.data) notificationData.data = JSON.stringify(data.data);
    if (data.expiresAt) notificationData.expiresAt = data.expiresAt;

    const notification = await databases.createDocument<NotificationDocument>(
      config.databaseId!,
      config.notificationsCollectionId!,
      ID.unique(),
      notificationData,
      [
        // NOTE: On client-side, Appwrite only allows assigning roles that include the current user.
        // To ensure the receiver can read/update (mark as read) without server-side functions,
        // we grant permissions to all authenticated users and filter by userId in queries.
        Permission.read(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    console.log('✅ NOTIFICATION CREATED:', notification.$id);
    return notification;
  } catch (error) {
    console.error("❌ ERROR creating notification:", error);
    throw error;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    onlyUnread?: boolean;
    category?: NotificationCategory;
  }
): Promise<{ documents: NotificationDocument[]; total: number }> {
  try {
    const queries = [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
    ];

    if (options?.onlyUnread) {
      queries.push(Query.equal("isRead", false));
    }

    if (options?.category) {
      queries.push(Query.equal("category", options.category));
    }

    if (options?.limit) {
      queries.push(Query.limit(options.limit));
    }

    if (options?.offset) {
      queries.push(Query.offset(options.offset));
    }

    const response = await databases.listDocuments<NotificationDocument>(
      config.databaseId!,
      config.notificationsCollectionId!,
      queries
    );

    return {
      documents: response.documents,
      total: response.total,
    };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { documents: [], total: 0 };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    if (!userId) {
      console.warn('getUnreadNotificationCount: No userId provided');
      return 0;
    }

    const response = await databases.listDocuments(
      config.databaseId!,
      config.notificationsCollectionId!,
      [
        Query.equal("userId", userId),
        Query.equal("isRead", false),
        Query.limit(1), // We only need the count
      ]
    );

    console.log(`📬 Unread notifications for ${userId}: ${response.total}`);
    return response.total;
  } catch (error: any) {
    // Handle network errors gracefully
    if (error?.message?.includes('fetch') || error?.message?.includes('Network')) {
      console.warn('getUnreadNotificationCount: Network error, returning cached/zero');
      return 0;
    }
    console.error("Error fetching unread count:", error?.message || error);
    return 0;
  }
}

/**
 * DEBUG: Get ALL notifications in database (not filtered by user)
 */
export async function getAllNotificationsDebug(limit: number = 50): Promise<{ documents: NotificationDocument[]; total: number }> {
  try {
    const response = await databases.listDocuments<NotificationDocument>(
      config.databaseId!,
      config.notificationsCollectionId!,
      [
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
      ]
    );

    console.log(`🔍 DEBUG: Found ${response.total} total notifications in database`);
    return {
      documents: response.documents,
      total: response.total,
    };
  } catch (error) {
    console.error("Error fetching all notifications:", error);
    return { documents: [], total: 0 };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await databases.updateDocument(
      config.databaseId!,
      config.notificationsCollectionId!,
      notificationId,
      {
        isRead: true,
        readAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const unreadNotifications = await databases.listDocuments<NotificationDocument>(
      config.databaseId!,
      config.notificationsCollectionId!,
      [
        Query.equal("userId", userId),
        Query.equal("isRead", false),
        Query.limit(100), // Process in batches
      ]
    );

    const updatePromises = unreadNotifications.documents.map((notification) =>
      databases.updateDocument(
        config.databaseId!,
        config.notificationsCollectionId!,
        notification.$id,
        {
          isRead: true,
          readAt: new Date().toISOString(),
        }
      )
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      config.databaseId!,
      config.notificationsCollectionId!,
      notificationId
    );
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}

/**
 * Delete all read notifications for a user
 */
export async function deleteReadNotifications(userId: string): Promise<void> {
  try {
    const readNotifications = await databases.listDocuments<NotificationDocument>(
      config.databaseId!,
      config.notificationsCollectionId!,
      [
        Query.equal("userId", userId),
        Query.equal("isRead", true),
        Query.limit(100),
      ]
    );

    const deletePromises = readNotifications.documents.map((notification) =>
      databases.deleteDocument(
        config.databaseId!,
        config.notificationsCollectionId!,
        notification.$id
      )
    );

    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting read notifications:", error);
    throw error;
  }
}

/**
 * Get or create notification preferences for a user
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferencesDocument> {
  try {
    // Query by document ID instead of userId attribute since preferences use userId as document ID
    let response;
    try {
      // Try to get by document ID first
      const doc = await databases.getDocument<NotificationPreferencesDocument>(
        config.databaseId!,
        config.notificationPreferencesCollectionId!,
        userId
      );
      return doc;
    } catch {
      // If not found by ID, list all and filter (fallback)
      response = await databases.listDocuments<NotificationPreferencesDocument>(
        config.databaseId!,
        config.notificationPreferencesCollectionId!,
        [Query.limit(100)]
      );
    }

    // Filter manually if needed
    const userPrefs = response?.documents.find((doc: any) => 
      doc.userId === userId || doc.$id === userId
    );
    
    if (userPrefs) {
      return userPrefs;
    }

    // Create default preferences if none exist
    const defaultPreferences = await databases.createDocument<NotificationPreferencesDocument>(
      config.databaseId!,
      config.notificationPreferencesCollectionId!,
      userId, // Use userId as document ID
      {
        userId,
        pushEnabled: true,
        emailEnabled: true,
        messagesEnabled: true,
        bookingsEnabled: true,
        paymentsEnabled: true,
        reviewsEnabled: true,
        marketingEnabled: false,
        soundEnabled: true,
        vibrationEnabled: true,
      }
    );

    return defaultPreferences;
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    throw error;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferencesId: string,
  updates: Partial<NotificationPreferencesDocument>
): Promise<NotificationPreferencesDocument> {
  try {
    const updated = await databases.updateDocument<NotificationPreferencesDocument>(
      config.databaseId!,
      config.notificationPreferencesCollectionId!,
      preferencesId,
      updates
    );

    return updated;
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    throw error;
  }
}

/**
 * Check if user has enabled notifications for a specific category
 */
export async function shouldSendNotification(
  userId: string,
  category: NotificationCategory
): Promise<boolean> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Map category to preference field
    const categoryMap: Record<NotificationCategory, keyof NotificationPreferencesDocument> = {
      messages: 'messagesEnabled',
      bookings: 'bookingsEnabled',
      payments: 'paymentsEnabled',
      reviews: 'reviewsEnabled',
      system: 'pushEnabled', // System notifications follow push settings
    };

    const preferenceKey = categoryMap[category];
    return preferences[preferenceKey] as boolean;
  } catch (error) {
    console.error("Error checking notification preferences:", error);
    return true; // Default to sending if we can't check preferences
  }
}


