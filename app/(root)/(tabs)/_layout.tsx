import icons from "@/constants/icons";
import { Tabs } from "expo-router";
import { Image, Text, View } from "react-native";


const TabIcon = ({ focused, icon, title }: { focused: boolean; icon: any; title: string }) => (
    <View className="flex-1 mt-3 flex flex-col items-center">
        <Image
            source={icon}
            resizeMode="contain"
            className="size-6"
            style={{ tintColor: focused ? "#0061FF" : "#748C94" }}
        />
        <Text className={`${focused ? "text-primary-300 font-rubik-medium" : "text-black-200 font-rubik"} text-xs w-full text-center mt-1`}>{title}</Text>
    </View>
);

const TabsLayout = () => {
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
                    name="profile"
                    options={{
                        title: "Profile",
                        tabBarIcon: ({ focused }) => (
                            <TabIcon icon={icons.person} focused={focused} title="Profile" />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="edit-profile"
                    options={{
                        href: null,
                    }}
                />
            </Tabs>
    );
}
export default TabsLayout;