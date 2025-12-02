import {
    NotificationCategory,
    NotificationPreferencesDocument,
    NotificationPriority,
    NotificationType,
    client,
    config,
    createNotification,
    getNotificationPreferences,
    getUnreadNotificationCount,
    shouldSendNotification,
    updateNotificationPreferences
} from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface NotificationsContextType {
  unreadCount: number;
  preferences: NotificationPreferencesDocument | null;
  refreshUnreadCount: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferencesDocument>) => Promise<void>;
  sendNotification: (data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    category: NotificationCategory;
    priority?: NotificationPriority;
    actionUrl?: string;
    imageUrl?: string;
    data?: Record<string, any>;
  }) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useGlobalContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferencesDocument | null>(null);

  // Fetch unread count with retry logic
  const refreshUnreadCount = async (retryCount = 0) => {
    if (!user?.$id) {
      setUnreadCount(0);
      return;
    }
    
    try {
      const count = await getUnreadNotificationCount(user.$id);
      setUnreadCount(count);
    } catch (error: any) {
      console.error('Error fetching unread count:', error?.message || error);
      
      // Retry with exponential backoff for network errors
      if (retryCount < 2 && (error?.message?.includes('Network') || error?.message?.includes('fetch'))) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying unread count fetch in ${delay}ms...`);
        setTimeout(() => refreshUnreadCount(retryCount + 1), delay);
      } else {
        // Set to 0 on persistent failure to avoid UI errors
        setUnreadCount(0);
      }
    }
  };

  // Fetch preferences
  const refreshPreferences = async () => {
    if (!user?.$id) return;
    
    try {
      const prefs = await getNotificationPreferences(user.$id);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  // Update preferences
  const updatePrefs = async (updates: Partial<NotificationPreferencesDocument>) => {
    if (!preferences) return;
    
    try {
      const updated = await updateNotificationPreferences(preferences.$id, updates);
      setPreferences(updated);
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  // Send notification (with preference check)
  const sendNotification = async (data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    category: NotificationCategory;
    priority?: NotificationPriority;
    actionUrl?: string;
    imageUrl?: string;
    data?: Record<string, any>;
  }) => {
    try {
      // Check if user has enabled notifications for this category
      const shouldSend = await shouldSendNotification(data.userId, data.category);
      
      if (!shouldSend) {
        console.log(`Notification blocked by user preferences: ${data.category}`);
        return;
      }

      await createNotification(data);
      
      // Refresh unread count if the notification is for the current user
      if (user?.$id === data.userId) {
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  };

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user?.$id) return;

    // Initial fetch with delay to ensure user is fully loaded
    setTimeout(() => {
      refreshUnreadCount();
      refreshPreferences();
    }, 500);

    // Subscribe to notification changes with error handling
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = client.subscribe(
        `databases.${config.databaseId}.collections.${config.notificationsCollectionId}.documents`,
        (response: any) => {
          try {
            // Refresh count when new notification arrives for current user
            if (
              response.events?.some((e: string) => e.includes('create')) &&
              response.payload?.userId === user.$id
            ) {
              console.log('🔔 New notification received, refreshing count');
              refreshUnreadCount();
            }
            
            // Refresh count when notification is marked as read
            if (
              response.events?.some((e: string) => e.includes('update')) &&
              response.payload?.userId === user.$id
            ) {
              console.log('✅ Notification updated, refreshing count');
              refreshUnreadCount();
            }
            
            // Refresh count when notification is deleted
            if (response.events?.some((e: string) => e.includes('delete'))) {
              console.log('🗑️ Notification deleted, refreshing count');
              refreshUnreadCount();
            }
          } catch (err) {
            console.warn('Error processing realtime notification event:', err);
          }
        }
      );
    } catch (error) {
      console.warn('Failed to subscribe to realtime notifications:', error);
      // Continue without realtime, will use polling instead
    }

    return () => {
      try {
        if (unsubscribe) unsubscribe();
      } catch (err) {
        console.warn('Error unsubscribing from notifications:', err);
      }
    };
  }, [user?.$id]);

  // Auto-refresh unread count every 60 seconds (reduced frequency for better performance)
  useEffect(() => {
    if (!user?.$id) return;

    const interval = setInterval(() => {
      console.log('🔄 Polling unread notification count...');
      refreshUnreadCount();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [user?.$id]);

  const value: NotificationsContextType = {
    unreadCount,
    preferences,
    refreshUnreadCount,
    refreshPreferences,
    updatePreferences: updatePrefs,
    sendNotification,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return context;
}
