import { useQuery } from '@tanstack/react-query';
import { request } from '@/core/api/client';

interface ExerciseImage {
  name: string;
  imageUrl: string;
}

export function useExerciseImages() {
  const { data } = useQuery({
    queryKey: ['exercise-images'],
    queryFn: (): Promise<ExerciseImage[]> => request('/api/exercise-images'),
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  const getImageUrl = (exerciseName: string): string | undefined => {
    if (!data) return undefined;
    const normalized = exerciseName.toLowerCase().trim();
    return data.find(img => img.name.toLowerCase().trim() === normalized)?.imageUrl;
  };

  return { exerciseImages: data ?? [], getImageUrl };
}
