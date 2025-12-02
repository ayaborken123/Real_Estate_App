import icons from "@/constants/icons";
import { useNotificationsContext } from "@/lib/notifications-provider";
import { useUnreadMessages } from "@/lib/useUnreadMessages";
import { Tabs } from "expo-router";
import { Image, Text, View } from "react-native";


const TabIcon = ({ focused, icon, title, badge }: { 
  focused: boolean; 
  icon: any; 
  title: string; 
  badge?: number;
}) => (
    <View className="flex-1 mt-2 flex flex-col items-center">
        <View className="relative">
            <Image
                source={icon}
                resizeMode="contain"
                className="size-7"
                style={{ tintColor: focused ? "#0061FF" : "#748C94" }}
            />
            {badge != null && badge > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                    <Text className="text-white text-xs font-bold">
                        {badge > 99 ? '99+' : badge.toString()}
                    </Text>
                </View>
            )}
        </View>
        <Text className={`${focused ? "text-primary-300 font-rubik-medium" : "text-black-200 font-rubik"} text-xs w-full text-center mt-1`}>
            {title}
        </Text>
    </View>
);

const TabsLayout = () => {
    const { unreadCount } = useUnreadMessages();
    const { unreadCount: notificationCount } = useNotificationsContext();
    
    return (
                    <Tabs
                initialRouteName="index"
                screenOptions={{
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: "white",
                        borderTopColor: "#0061FF1A",
                        borderTopWidth: 1,
                        minHeight: 70,
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Home",
                        tabBarIcon: ({ focused }) => (
                            <TabIcon icon={icons.home} focused={focused} title="Home" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="explore"
                    options={{
                        title: "Explore",
                        tabBarIcon: ({ focused }) => (
                            <TabIcon icon={icons.search} focused={focused} title="Explore" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="favorites"
                    options={{
                        title: "Favorites",
                        tabBarIcon: ({ focused }) => (
                            <TabIcon icon={icons.heart} focused={focused} title="Favorites" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="messages"
                    options={{
                        title: "Messages",
                        tabBarIcon: ({ focused }) => (
                            <TabIcon 
                                icon={icons.chat} 
                                focused={focused} 
                                title="Messages" 
                                badge={unreadCount}
                            />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: "Profile",
                        tabBarIcon: ({ focused }) => (
                            <TabIcon icon={icons.person} focused={focused} title="Profile" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="create-property"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="my-listings"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="edit-profile"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="bookings"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="booking-requests"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="notifications"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="notification-preferences"
                    options={{
                        href: null,
                    }}
                />
                <Tabs.Screen
                    name="payments"
                    options={{
                        href: null,
                    }}
                />
            </Tabs>
    );
}
export default TabsLayout;