import LocationPicker from '@/components/LocationPicker';
import { facilities as facilityOptions } from '@/constants/data';
import { config, createProperty, getPropertyById, updateProperty, uploadGalleryImages } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const CreateProperty = () => {
  const { user } = useGlobalContext();

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [area, setArea] = useState('');
  const [type, setType] = useState('Apartment');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [imagesUris, setImagesUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const editingId = params.id as string | undefined;

  useEffect(() => {
    const load = async () => {
      if (editingId) {
        const p = await getPropertyById({ id: editingId });
        if (p) {
          setName(p.name || '');
          setAddress(p.address || '');
          setPrice((p.price || '') + '');
          setBedrooms((p.bedrooms || 1) + '');
          setBathrooms((p.bathrooms || 1) + '');
          setArea((p.area || '') + '');
          setType(p.type || 'Apartment');
          setDescription(p.description || '');
          setSelectedFacilities(p.facilities || []);
          
          // Load all existing images from the images array
          const existingImages = (p.images || []).filter(Boolean);
          if (existingImages.length > 0) {
            setImagesUris(existingImages);
          }
          
          // Legacy: support old 'image' field if it exists
          if (!existingImages.length && p.image) {
            setImagesUris([p.image]);
          }
          
          // gallery may be either array of objects or related docs (legacy support)
          if (p.gallery && Array.isArray(p.gallery)) {
            const uris = p.gallery.map((g: any) => g.image || g.fileUrl || '');
            const filteredUris = uris.filter(Boolean);
            if (filteredUris.length > 0 && existingImages.length === 0) {
              setImagesUris(filteredUris);
            }
          }
            // geolocation may be object {lat,lng} or string
            if (p.geolocation) {
              const geo = p.geolocation;
              if (typeof geo === 'string') {
                try {
                  const parsed = JSON.parse(geo);
                  setLatitude(String(parsed.lat || ''));
                  setLongitude(String(parsed.lng || ''));
                } catch (e) {
                  const parts = geo.split(',').map((s: string) => s.trim());
                  setLatitude(parts[0] || '');
                  setLongitude(parts[1] || '');
                }
              } else if (typeof geo === 'object') {
                setLatitude(String(geo.lat || ''));
                setLongitude(String(geo.lng || ''));
              }
            }
        }
      }
    };
    load();
  }, [editingId]);

  const requestImagePermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissions required', 'Please grant photo library permissions to add images.');
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    const ok = await requestImagePermissions();
    if (!ok) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
      } as any);

      const cancelled = (result as any).canceled === true || (result as any).cancelled === true;
      if (!cancelled) {
        // Newer SDK returns `assets` array
        const assets = (result as any).assets || (result as any).selected || [];
        if (Array.isArray(assets) && assets.length > 0) {
          const uris = assets.map((s: any) => s.uri).filter(Boolean);
          setImagesUris((prev) => [...prev, ...uris]);
        } else if ((result as any).uri) {
          setImagesUris((prev) => [...prev, (result as any).uri]);
        }
      }
    } catch (err) {
      console.error('Image picker error', err);
    }
  };

  // NOTE: this UI uses a simple Image URI list. For a production app use expo-image-picker or similar.

  const toggleFacility = (t: string) => {
    setSelectedFacilities((prev) => (prev.includes(t) ? prev.filter(p => p !== t) : [...prev, t]));
  };

  const onSubmit = async () => {
    if (!name || !address || !price) {
      Alert.alert('Missing fields', 'Please provide name, address and price');
      return;
    }
    // Required numeric fields and coordinates
    const areaNum = Number.isFinite(Number(area)) ? Math.max(1, Math.floor(Number(area))) : 1;
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const hasGeolocation = Number.isFinite(latNum) && Number.isFinite(lngNum);
    
    // Only require location for new properties, not when editing
    if (!editingId && !hasGeolocation) {
      Alert.alert('Location required', 'Please tap the map to set the property location');
      return;
    }

    setSubmitting(true);
    try {
      // When editing, only upload NEW local images (file:// URIs)
      // When creating, upload all images
      const localImages = editingId 
        ? imagesUris.filter(uri => uri.startsWith('file://'))
        : imagesUris;

      const uploadResult = localImages.length > 0
        ? await uploadGalleryImages(localImages, config.profileImagesBucketId!)
        : { success: true, uploaded: [] } as any;

      if (!uploadResult.success) {
        Alert.alert('Upload failed', 'Could not upload images');
        return;
      }

      // Get all image URLs (both newly uploaded and existing ones)
      const newImageUrls = (uploadResult.uploaded || []).map((u: any) => u.fileUrl).filter(Boolean);
      const existingImageUrls = editingId 
        ? imagesUris.filter(uri => !uri.startsWith('file://'))
        : [];
      
      const allImageUrls = [...existingImageUrls, ...newImageUrls];

      const data: any = {
        name,
        address,
        price: Number(price),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        area: areaNum,
        type,
        description,
        facilities: selectedFacilities,
        images: allImageUrls.length > 0 ? allImageUrls : ['https://via.placeholder.com/400'], // All images in array
        geolocation: hasGeolocation ? JSON.stringify({ lat: latNum, lng: lngNum }) : undefined,
      };

      // Note: gallery attribute has been removed from properties collection
      // Images are uploaded to storage but not linked via relationships anymore

      let res: any;
      if (editingId) {
        res = await updateProperty(editingId, data);
      } else {
        res = await createProperty(data);
      }

      if (res.success) {
        Alert.alert('Success', editingId ? 'Property updated successfully!' : 'Property created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.back();
              // Small delay to ensure the back navigation completes before refresh
              setTimeout(() => {
                router.push('/(root)/(tabs)/my-listings');
              }, 100);
            }
          }
        ]);
      } else {
        Alert.alert('Error', 'Could not save property');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="bg-white" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-5 pb-8">
        <Text className="text-2xl font-rubik-bold text-black-300 mb-6">{editingId ? 'Edit Property' : 'Create New Property'}</Text>

        {/* Basic Information */}
        <View className="mb-6">
          <Text className="text-sm font-rubik-bold text-black-300 mb-3">Basic Information</Text>
          <TextInput 
            placeholder="Property Name" 
            value={name} 
            onChangeText={setName} 
            placeholderTextColor="#999"
            className="border border-primary-100 bg-white px-4 py-3.5 rounded-lg mb-3 font-rubik" 
          />
          <TextInput 
            placeholder="Address" 
            value={address} 
            onChangeText={setAddress} 
            placeholderTextColor="#999"
            className="border border-primary-100 bg-white px-4 py-3.5 rounded-lg mb-3 font-rubik" 
          />
          <TextInput 
            placeholder="Price ($)" 
            value={price} 
            onChangeText={setPrice} 
            keyboardType="numeric" 
            placeholderTextColor="#999"
            className="border border-primary-100 bg-white px-4 py-3.5 rounded-lg mb-3 font-rubik" 
          />
          <TextInput 
            placeholder="Type (Apartment, House, Villa...)" 
            value={type} 
            onChangeText={setType} 
            placeholderTextColor="#999"
            className="border border-primary-100 bg-white px-4 py-3.5 rounded-lg font-rubik" 
          />
        </View>

        {/* Property Details */}
        <View className="mb-6">
          <Text className="text-sm font-rubik-bold text-black-300 mb-3">Property Details</Text>
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-black-200 mb-2 font-rubik">Bedrooms</Text>
              <TextInput 
                placeholder="2" 
                value={bedrooms} 
                onChangeText={setBedrooms} 
                keyboardType="numeric" 
                placeholderTextColor="#999"
                className="border border-primary-100 bg-white px-4 py-3.5 rounded-lg font-rubik" 
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-black-200 mb-2 font-rubik">Bathrooms</Text>
              <TextInput 
                placeholder="2" 
                value={bathrooms} 
                onChangeText={setBathrooms} 
                keyboardType="numeric" 
                placeholderTextColor="#999"
                className="border border-primary-100 bg-white px-4 py-3.5 rounded-lg font-rubik" 
              />
            </View>
          </View>
          <Text className="text-xs text-black-200 mb-2 font-rubik">Area (sqft)</Text>
          <TextInput 
            placeholder="1200" 
            value={area} 
            onChangeText={setArea} 
            keyboardType="numeric" 
            placeholderTextColor="#999"
            className="border border-primary-100 bg-white px-4 py-3.5 rounded-lg font-rubik" 
          />
        </View>

        {/* Location Picker */}
        <View className="mb-6">
          <Text className="text-sm font-rubik-bold text-black-300 mb-3">Location</Text>
          <LocationPicker
            initial={{
              lat: latitude ? Number(latitude) : undefined,
              lng: longitude ? Number(longitude) : undefined,
            }}
            onChange={(c) => {
              setLatitude(String(c.lat));
              setLongitude(String(c.lng));
            }}
          />
          <Text className="text-xs text-black-200 mt-2 font-rubik">
            Tap the map to set the property location.
          </Text>
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-rubik-bold text-black-300 mb-3">Description</Text>
          <TextInput 
            placeholder="Describe your property..." 
            value={description} 
            onChangeText={setDescription} 
            multiline 
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor="#999"
            className="border border-primary-100 bg-white px-4 py-3.5 rounded-lg h-32 font-rubik" 
          />
        </View>

        {/* Facilities */}
        <View className="mb-6">
          <Text className="text-sm font-rubik-bold text-black-300 mb-3">Facilities</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {facilityOptions.map(f => {
              const isSelected = selectedFacilities.includes(f.title);
              return (
                <TouchableOpacity 
                  key={f.title} 
                  onPress={() => toggleFacility(f.title)} 
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    marginRight: 12,
                    borderRadius: 9999,
                    backgroundColor: isSelected ? '#0061FF' : '#F5F5F5',
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: '#E5E5E5',
                  }}
                >
                  <Image source={f.icon} className="w-4 h-4 mr-2" tintColor={isSelected ? 'white' : '#666'} />
                  <Text className={`text-sm font-rubik ${isSelected ? 'text-white' : 'text-black-300'}`}>{f.title}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Images */}
        <View className="mb-6">
          <Text className="text-sm font-rubik-bold text-black-300 mb-3">Property Images</Text>
          {imagesUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {imagesUris.map((u, i) => (
                <View key={i} className="mr-3 relative">
                  <Image source={{ uri: u }} className="w-24 h-24 rounded-lg" />
                  <TouchableOpacity 
                    onPress={() => setImagesUris(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                    accessibilityLabel="Remove image"
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity 
            onPress={pickImages} 
            className="flex-row items-center justify-center border-2 border-dashed border-primary-200 bg-primary-50 px-4 py-4 rounded-lg"
          >
            <Ionicons name="add" size={22} color="#0061FF" style={{ marginRight: 8 }} />
            <Text className="text-primary-300 font-rubik-medium">Add Images ({imagesUris.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          onPress={onSubmit} 
          disabled={submitting}
          className={`px-6 py-4 rounded-lg ${submitting ? 'bg-primary-200' : 'bg-primary-300'} shadow-md`}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-rubik-bold text-base">
              {editingId ? 'Update Property' : 'Create Property'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default CreateProperty;
