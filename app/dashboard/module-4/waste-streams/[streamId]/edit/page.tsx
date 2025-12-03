'use client';

import { use } from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface WasteStream {
  id: string;
  site_id: string;
  ewc_code: string;
  waste_description: string;
  waste_category: string | null;
  hazard_code: string | null;
  permit_reference: string | null;
  volume_limit_m3: number | null;
  storage_duration_limit_days: number | null;
  is_active: boolean;
}

export default function EditWasteStreamPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: wasteStream, isLoading } = useQuery<WasteStream>({
    queryKey: ['waste-stream', streamId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<WasteStream>(`/module-4/waste-streams/${streamId}`);
      return response.data;
    },
  });

  const [formData, setFormData] = useState({
    ewc_code: '',
    waste_description: '',
    waste_category: '',
    hazard_code: '',
    permit_reference: '',
    volume_limit_m3: '',
    storage_duration_limit_days: '',
    is_active: true,
  });

  // Initialize form data when waste stream loads
  useEffect(() => {
    if (wasteStream) {
      setFormData({
        ewc_code: wasteStream.ewc_code || '',
        waste_description: wasteStream.waste_description || '',
        waste_category: wasteStream.waste_category || '',
        hazard_code: wasteStream.hazard_code || '',
        permit_reference: wasteStream.permit_reference || '',
        volume_limit_m3: wasteStream.volume_limit_m3?.toString() || '',
        storage_duration_limit_days: wasteStream.storage_duration_limit_days?.toString() || '',
        is_active: wasteStream.is_active,
      });
    }
  }, [wasteStream]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-4/waste-streams/${streamId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-stream', streamId] });
      queryClient.invalidateQueries({ queryKey: ['module-4-waste-streams'] });
      router.push(`/dashboard/module-4/waste-streams/${streamId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update waste stream:', error);
      alert('Failed to update waste stream. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submitData = {
      ...formData,
      volume_limit_m3: formData.volume_limit_m3 ? parseFloat(formData.volume_limit_m3) : null,
      storage_duration_limit_days: formData.storage_duration_limit_days ? parseInt(formData.storage_duration_limit_days) : null,
      waste_category: formData.waste_category || null,
      hazard_code: formData.hazard_code || null,
      permit_reference: formData.permit_reference || null,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading waste stream...</div>;
  }

  if (!wasteStream) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Waste stream not found</p>
        <Link href="/dashboard/module-4/waste-streams">
          <Button variant="outline" className="mt-4">
            Back to Waste Streams
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-4/waste-streams/${streamId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Waste Stream
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Waste Stream</h1>
        <p className="text-text-secondary mt-2">
          Update waste stream details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="ewc_code">EWC Code *</Label>
            <Input
              id="ewc_code"
              required
              value={formData.ewc_code}
              onChange={(e) => setFormData({ ...formData, ewc_code: e.target.value })}
              placeholder="e.g., 20 01 01"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="waste_category">Waste Category</Label>
            <Input
              id="waste_category"
              value={formData.waste_category}
              onChange={(e) => setFormData({ ...formData, waste_category: e.target.value })}
              placeholder="e.g., Hazardous"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="waste_description">Waste Description *</Label>
            <textarea
              id="waste_description"
              required
              value={formData.waste_description}
              onChange={(e) => setFormData({ ...formData, waste_description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Describe the waste stream..."
            />
          </div>

          <div>
            <Label htmlFor="hazard_code">Hazard Code</Label>
            <Input
              id="hazard_code"
              value={formData.hazard_code}
              onChange={(e) => setFormData({ ...formData, hazard_code: e.target.value })}
              placeholder="e.g., HP1"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="permit_reference">Permit Reference</Label>
            <Input
              id="permit_reference"
              value={formData.permit_reference}
              onChange={(e) => setFormData({ ...formData, permit_reference: e.target.value })}
              placeholder="e.g., EP123456"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="volume_limit_m3">Volume Limit (m³)</Label>
            <Input
              id="volume_limit_m3"
              type="number"
              step="0.01"
              value={formData.volume_limit_m3}
              onChange={(e) => setFormData({ ...formData, volume_limit_m3: e.target.value })}
              placeholder="e.g., 100.00"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="storage_duration_limit_days">Storage Duration Limit (days)</Label>
            <Input
              id="storage_duration_limit_days"
              type="number"
              value={formData.storage_duration_limit_days}
              onChange={(e) => setFormData({ ...formData, storage_duration_limit_days: e.target.value })}
              placeholder="e.g., 90"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (waste stream is currently in use)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-4/waste-streams/${streamId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

