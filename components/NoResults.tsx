import images from '@/constants/images';
import React from 'react';
import { Image, Text, View } from 'react-native';

interface NoResultsProps {
  title?: string;
  subtitle?: string;
}

const NoResults = ({ title = "No Results", subtitle = "We couldn't find any matches for your search. Please try adjusting your filters or search criteria." }: NoResultsProps) => {
  return (
    <View className='flex items-center my-5'>
        <Image source={images.noResult} className="w-11/12 h-80" resizeMode="contain" />
        <Text className='text-2xl font-rubik-bold text-black-300 mt-5'>{title}</Text>
        <Text className='text-base font-rubik text-black-100 mt-2'>{subtitle}</Text>
    </View>
  )
}

export default NoResults;