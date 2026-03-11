import { useQuery } from '@tanstack/react-query';
import { request } from '@/core/api/client';

interface FoodImage {
  name: string;
  imageUrl: string;
}

export function useFoodImages() {
  const { data } = useQuery({
    queryKey: ['food-images'],
    queryFn: (): Promise<FoodImage[]> => request('/api/food/images'),
    staleTime: 10 * 60 * 1000,
  });

  const getImageUrl = (foodName: string): string | undefined => {
    if (!data) return undefined;
    const normalized = foodName.toLowerCase().trim();
    return data.find(f => f.name.toLowerCase().trim() === normalized)?.imageUrl;
  };

  return { getImageUrl };
}
