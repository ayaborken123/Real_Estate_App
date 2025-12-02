import { getPropertyRating } from '@/lib/appwrite';
import { useEffect, useState } from 'react';

/**
 * Hook to fetch and cache property ratings
 * Automatically fetches the real-time average rating from reviews
 * 
 * @param propertyId - ID of the property
 * @returns Object with average rating and review count
 */
export function usePropertyRating(propertyId: string) {
  const [rating, setRating] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const fetchRating = async () => {
      try {
        const result = await getPropertyRating(propertyId);
        if (mounted) {
          setRating(result.average);
          setCount(result.count);
        }
      } catch (error) {
        console.error('Error fetching property rating:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchRating();

    return () => {
      mounted = false;
    };
  }, [propertyId]);

  return { rating, count, loading };
}
