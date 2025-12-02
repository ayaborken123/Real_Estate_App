import { NotificationBadge } from '@/components/NotificationBadge';
import icons from '@/constants/icons';
import { logout } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { useNotificationsContext } from '@/lib/notifications-provider';
import seed from '@/lib/seed';
import { router } from 'expo-router';
import {
    Alert,
    Image,
    ImageSourcePropType,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { settings } from '../../../constants/data';

interface SettingsItemProps {
    icon: ImageSourcePropType;
    title: string;
    onPress?: () => void;
    textStyle?: string;
    showArrow?: boolean;
}

const SettingsItem = ({
    icon,
    title,
    onPress,
    textStyle,
    showArrow = true,
}: SettingsItemProps) => (
    <TouchableOpacity
        onPress={onPress}
        className="flex flex-row items-center justify-between py-3"
    >
        <View className="flex flex-row items-center gap-3">
            <Image source={icon} className="size-6" />
            <Text className={`text-lg font-rubik-medium text-black-300 ${textStyle}`}>
                {title}
            </Text>
        </View>
        {showArrow && <Image source={icons.rightArrow} className="size-5" />}
    </TouchableOpacity>
);

const Profile = () => {
    const { user, refetch } = useGlobalContext();
    const { unreadCount } = useNotificationsContext();

    if (!user) {
        return (
            <SafeAreaView className="h-full bg-white">
                <View className="flex-1 items-center justify-center px-10">
                    <Image source={icons.person} className="w-20 h-20 mb-6" tintColor="#CCCCCC" />
                    <Text className="text-2xl font-rubik-bold text-black-300 text-center mb-3">
                        Login Required
                    </Text>
                    <Text className="text-base font-rubik text-black-200 text-center mb-8">
                        You need to sign in to view and manage your profile
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/sign-in')}
                        className="bg-primary-300 py-4 px-8 rounded-full w-full"
                    >
                        <Text className="text-white text-lg font-rubik-bold text-center">
                            Sign In
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleLogout = async () => {
        const result = await logout();
        if (result) {
            Alert.alert('Success', 'You have been logged out.');
            refetch();
        } else {
            Alert.alert('Error', 'Logout failed. Please try again.');
        }
    };
    return (
        <SafeAreaView className="h-full bg-white">
            <ScrollView
            showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 128, paddingHorizontal: 28 }}
            >
                <View className="flex flex-row items-center justify-between mt-5">
                    <Text className="text-xl font-rubik-bold">Profile</Text>
                    <TouchableOpacity 
                        onPress={() => router.push('/(root)/(tabs)/notifications' as any)}
                        className="relative"
                    >
                        <Image source={icons.bell} className="size-5"/>
                        <NotificationBadge count={unreadCount} size="small" />
                    </TouchableOpacity>
                </View>
                    <View className="flex-row justify-center flex mt-5" >
                        <View className="flex flex-col items-center relative mt-5" >
                            <Image source={user?.avatar ? { uri: user.avatar } : icons.person} className="size-44 rounded-full"/>
                            <TouchableOpacity 
                                className="absolute bottom-11 right-2"
                                onPress={() => router.push('/(root)/(tabs)/edit-profile')}
                            >
                                <Image source={icons.edit } className="size-9"/>
                            </TouchableOpacity>
                            <Text className="text-2xl font-rubik-bold mt-2">{user?.name}</Text>
                        </View>
                    </View>

                    <View className="flex flex-col mt-10">
                        <SettingsItem 
                            icon={icons.person} 
                            title="Edit Profile" 
                            onPress={() => router.push('/(root)/(tabs)/edit-profile')}
                        />
                        <SettingsItem 
                            icon={icons.home} 
                            title="My Listings" 
                            onPress={() => router.push({ pathname: '/(root)/(tabs)/my-listings' } as any)}
                        />
                        <SettingsItem 
                            icon={icons.calendar} 
                            title="My Bookings" 
                            onPress={() => router.push({ pathname: '/(root)/(tabs)/bookings' } as any)}
                        />
                        <SettingsItem 
                            icon={icons.calendar} 
                            title="Booking Requests" 
                            onPress={() => router.push({ pathname: '/(root)/(tabs)/booking-requests' } as any)}
                        />
                        <SettingsItem 
                            icon={icons.bell} 
                            title="Notifications" 
                            onPress={() => router.push({ pathname: '/(root)/(tabs)/notifications' } as any)}
                        />
                        <SettingsItem
                            icon={icons.people}
                            title="Seed Data (dev)"
                            onPress={async () => {
                                try {
                                    await seed();
                                    Alert.alert('Seed', 'Seeding started. Check logs for progress.');
                                } catch (e) {
                                    Alert.alert('Seed Error', String(e));
                                }
                            }}
                        />
                        <SettingsItem 
                            icon={icons.wallet} 
                            title="Payments" 
                            onPress={() => router.push({ pathname: '/(root)/(tabs)/payments' } as any)}
                        />
                    </View>
                                        <View className="flex flex-col mt-5 border-t pt-5 border-primary-200">
                                            {settings.slice(2).map((item, index) => (
                                                <SettingsItem key={index} {...item} />
                                            ))}
                                        </View>
                                        <View className="flex flex-col mt-5 border-t pt-5 border-primary-200">
                        <SettingsItem
                            icon={icons.logout}
                            title="Logout"
                            textStyle="text-danger"
                            showArrow={false}
                            onPress={handleLogout}
                        />
                    </View>

            </ScrollView>
        </SafeAreaView>
    )
}
export default Profile
