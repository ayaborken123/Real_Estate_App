import icons from "@/constants/icons";
import {
    updateUserName,
    updateUserPreferences,
    uploadProfileImage,
} from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EditProfile = () => {
  const { user, refetch } = useGlobalContext();

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

   // SAFE BACK FUNCTION
  const safeGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  // Validation function
  const validateFields = () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name cannot be empty");
      return false;
    }

    if (phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid phone number format"
      );
      return false;
    }

    return true;
  };

  // Pick image from gallery or camera
  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to change your profile picture"
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant camera access to take a photo"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  // Show image picker options
  const showImageOptions = () => {
    Alert.alert("Change Profile Picture", "Choose an option", [
      {
        text: "Take Photo",
        onPress: takePhoto,
      },
      {
        text: "Choose from Library",
        onPress: pickImage,
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (!validateFields()) return;

    setLoading(true);

    try {
      let photoURL = user?.photoURL || "";

      // Upload new photo if selected
      if (photoUri) {
        setUploadingImage(true);
        const uploadResult = await uploadProfileImage(photoUri);
        setUploadingImage(false);

        if (!uploadResult.success) {
          throw new Error("Failed to upload profile image");
        }

        photoURL = uploadResult.fileUrl!;
      }

      // Update name if changed
      if (name !== user?.name) {
        const nameResult = await updateUserName(name);
        if (!nameResult.success) {
          throw new Error("Failed to update name");
        }
      }

      // Update preferences (phone, bio, photoURL)
      const prefsToUpdate: any = {};
      
      if (phone !== user?.phone) {
        prefsToUpdate.phone = phone;
      }
      
      if (bio !== user?.bio) {
        prefsToUpdate.bio = bio;
      }
      
      if (photoURL !== user?.photoURL) {
        prefsToUpdate.photoURL = photoURL;
      }

      // Only update if there are changes
      if (Object.keys(prefsToUpdate).length > 0) {
        const prefsResult = await updateUserPreferences(prefsToUpdate);
        if (!prefsResult.success) {
          throw new Error("Failed to update profile information");
        }
      }

      // Refresh user data
      await refetch();

      Alert.alert("Success", "Profile updated successfully", [
        {
          text: "OK",
          onPress: safeGoBack

        },
      ]);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Update Failed",
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const currentAvatar = photoUri || user?.avatar || "";

  return (
    <SafeAreaView className="h-full bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 28 }}
      >
        {/* Header */}
        <View className="flex flex-row items-center justify-between mt-5">
          <TouchableOpacity onPress={safeGoBack}>
            <Image source={icons.backArrow} className="size-6" />
          </TouchableOpacity>
          <Text className="text-xl font-rubik-bold">Edit Profile</Text>
          <View className="size-6" />
        </View>

        {/* Profile Picture */}
        <View className="flex-row justify-center flex mt-8">
          <View className="flex flex-col items-center relative">
            <Image
              source={
                currentAvatar
                  ? { uri: currentAvatar }
                  : icons.person
              }
              className="size-32 rounded-full"
            />
            <TouchableOpacity
              className="absolute bottom-0 right-0 bg-primary-300 rounded-full p-2"
              onPress={showImageOptions}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Image source={icons.edit} className="size-5" tintColor="#fff" />
              )}
            </TouchableOpacity>
            <Text className="text-sm text-black-200 mt-3 font-rubik">
              Tap to change photo
            </Text>
          </View>
        </View>

        {/* Form Fields */}
        <View className="mt-8">
          {/* Name Field */}
          <View className="mb-6">
            <Text className="text-black-300 text-base font-rubik-medium mb-2">
              Name <Text className="text-danger">*</Text>
            </Text>
            <TextInput
              className="border border-primary-200 rounded-lg px-4 py-3 text-black-300 font-rubik"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Email Field (Read-only) */}
          <View className="mb-6">
            <Text className="text-black-300 text-base font-rubik-medium mb-2">
              Email
            </Text>
            <View className="border border-primary-100 bg-black-100/5 rounded-lg px-4 py-3 flex-row items-center">
              <Text className="text-black-200 font-rubik flex-1">
                {user?.email}
              </Text>
              <Image source={icons.shield} className="size-4" tintColor="#666" />
            </View>
            <Text className="text-xs text-black-200 mt-1 font-rubik">
              Email cannot be changed (managed by Google)
            </Text>
          </View>

          {/* Phone Field */}
          <View className="mb-6">
            <Text className="text-black-300 text-base font-rubik-medium mb-2">
              Phone Number
            </Text>
            <TextInput
              className="border border-primary-200 rounded-lg px-4 py-3 text-black-300 font-rubik"
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          {/* Bio Field */}
          <View className="mb-6">
            <Text className="text-black-300 text-base font-rubik-medium mb-2">
              Bio
            </Text>
            <TextInput
              className="border border-primary-200 rounded-lg px-4 py-3 text-black-300 font-rubik"
              placeholder="Tell us about yourself"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
              style={{ minHeight: 100 }}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className={`bg-primary-300 rounded-lg py-4 mt-4 ${
            loading ? "opacity-50" : ""
          }`}
          onPress={handleSaveChanges}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-center text-lg font-rubik-bold">
              Save Changes
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          className="border border-primary-200 rounded-lg py-4 mt-3"
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text className="text-primary-300 text-center text-lg font-rubik-bold">
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfile;
