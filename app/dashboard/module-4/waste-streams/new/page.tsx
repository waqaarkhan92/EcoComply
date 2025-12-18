'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface Site {
  id: string;
  name: string;
}

export default function NewWasteStreamPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    site_id: '',
    ewc_code: '',
    waste_description: '',
    waste_category: '',
    hazard_code: '',
    permit_reference: '',
    volume_limit_m3: '',
    storage_duration_limit_days: '',
    is_active: true,
  });

  const { data: sitesData, isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Site[] }>('/sites');
      return response;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-4/waste-streams', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-4-waste-streams'] });
      router.push(`/dashboard/module-4/waste-streams/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create waste stream:', error);
      alert('Failed to create waste stream. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const sites = sitesData?.data?.data || [];

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

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-4/waste-streams"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Waste Streams
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Waste Stream</h1>
        <p className="text-text-secondary mt-2">
          Create a new hazardous waste stream
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="site_id">Site *</Label>
            <select
              id="site_id"
              required
              value={formData.site_id}
              onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              disabled={sitesLoading}
            >
              <option value="">Select a site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

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
          <Link href="/dashboard/module-4/waste-streams">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Waste Stream'}
          </Button>
        </div>
      </form>
    </div>
  );
}

