import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@/core/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ExerciseImageRow {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
}

interface FoodRow {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface FoodSearchResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  referenceGrams: number;
  isLiquid: boolean;
  preparation: string;
}

type Tab = 'exercises' | 'foods';

async function uploadToS3(file: File, context: 'workout' | 'food'): Promise<string> {
  const { uploadUrl, fileUrl } = await request<{ uploadUrl: string; fileUrl: string }>('/api/uploads/presigned-url', {
    method: 'POST',
    body: { mimeType: file.type, context },
  });
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  return fileUrl;
}

function ExerciseImagesTab() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['admin', 'exercise-images'],
    queryFn: (): Promise<ExerciseImageRow[]> => request('/api/admin/exercise-images'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => request(`/api/admin/exercise-images/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'exercise-images'] });
      void queryClient.invalidateQueries({ queryKey: ['exercise-images'] });
      toast.success('Image removed');
    },
  });

  const handleUploadNew = async (file: File) => {
    const name = newName.trim();
    if (!name) {
      toast.error('Enter an exercise name first');
      return;
    }
    setUploading('new');
    try {
      const fileUrl = await uploadToS3(file, 'workout');
      await request('/api/admin/exercise-images', {
        method: 'POST',
        body: { name, imageUrl: fileUrl },
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'exercise-images'] });
      void queryClient.invalidateQueries({ queryKey: ['exercise-images'] });
      setNewName('');
      toast.success(`Image added for "${name}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleReplace = async (id: string, name: string, file: File) => {
    setUploading(id);
    try {
      const fileUrl = await uploadToS3(file, 'workout');
      await request('/api/admin/exercise-images', {
        method: 'POST',
        body: { name, imageUrl: fileUrl },
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'exercise-images'] });
      void queryClient.invalidateQueries({ queryKey: ['exercise-images'] });
      toast.success(`Image updated for "${name}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Exercise Image</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                placeholder="Exercise name (e.g. Bench Press)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadNew(file);
                e.target.value = '';
              }}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={!newName.trim() || uploading === 'new'}
            >
              <Upload className="w-4 h-4 mr-1" />
              {uploading === 'new' ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exercise images yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {images.map((img) => (
            <div key={img.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <ImagePlaceholder type="exercise" size="md" imageUrl={img.imageUrl} />
              <span className="flex-1 font-medium">{img.name}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                id={`replace-${img.id}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleReplace(img.id, img.name, file);
                  e.target.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`replace-${img.id}`)?.click()}
                disabled={uploading === img.id}
              >
                <Upload className="w-3 h-3 mr-1" />
                {uploading === img.id ? 'Uploading...' : 'Replace'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteMutation.mutate(img.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FoodImagesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: foods = [], isLoading } = useQuery({
    queryKey: ['admin', 'foods-with-images', search],
    queryFn: async (): Promise<FoodRow[]> => {
      const results = await request<FoodSearchResult[]>(
        `/api/foods/search?q=${encodeURIComponent(search)}&limit=25`
      );
      // The food search endpoint does not return id or imageUrl,
      // so we use name as the identifier for display purposes.
      // Admin food image PATCH/DELETE requires a backend admin food search endpoint.
      return results.map((r) => ({
        id: r.name, // Use name as key until admin endpoint is available
        name: r.name,
        imageUrl: null,
      }));
    },
    enabled: search.length >= 2,
  });

  const handleUpload = async (foodId: string, file: File) => {
    setUploading(foodId);
    try {
      const fileUrl = await uploadToS3(file, 'food');
      await request(`/api/admin/foods/${foodId}/image`, {
        method: 'PATCH',
        body: { imageUrl: fileUrl },
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'foods-with-images'] });
      toast.success('Food image updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (foodId: string) => {
    try {
      await request(`/api/admin/foods/${foodId}/image`, { method: 'DELETE' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'foods-with-images'] });
      toast.success('Food image removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove image');
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search foods by name (min 2 characters)..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Searching...</p>
      ) : search.length < 2 ? (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search foods.</p>
      ) : foods.length === 0 ? (
        <p className="text-sm text-muted-foreground">No foods found.</p>
      ) : (
        <div className="space-y-2">
          {foods.map((food) => (
            <div key={food.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <ImagePlaceholder type="food" size="md" imageUrl={food.imageUrl ?? undefined} />
              <span className="flex-1 font-medium truncate">{food.name}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                id={`food-upload-${food.id}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(food.id, file);
                  e.target.value = '';
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`food-upload-${food.id}`)?.click()}
                disabled={uploading === food.id}
              >
                <Upload className="w-3 h-3 mr-1" />
                {uploading === food.id ? 'Uploading...' : food.imageUrl ? 'Replace' : 'Upload'}
              </Button>
              {food.imageUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleRemove(food.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminImagesPage() {
  const [tab, setTab] = useState<Tab>('exercises');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Image Management</h2>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'exercises'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('exercises')}
        >
          Exercise Images
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'foods'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('foods')}
        >
          Food Images
        </button>
      </div>

      {tab === 'exercises' ? <ExerciseImagesTab /> : <FoodImagesTab />}
    </div>
  );
}
