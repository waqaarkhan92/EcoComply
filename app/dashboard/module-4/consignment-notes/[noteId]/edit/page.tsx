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

interface ConsignmentNote {
  id: string;
  waste_stream_id: string;
  consignment_note_number: string;
  consignment_date: string;
  carrier_id: string | null;
  carrier_name: string;
  carrier_licence_number: string | null;
  destination_site: string;
  waste_description: string;
  ewc_code: string;
  quantity_m3: number;
  quantity_kg: number | null;
}

interface WasteStream {
  id: string;
  ewc_code: string;
  waste_description: string;
}

export default function EditConsignmentNotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: consignmentNote, isLoading } = useQuery({
    queryKey: ['consignment-note', noteId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get(`/module-4/consignment-notes/${noteId}`);
      return response.data;
    },
  });

  const { data: wasteStreamsData } = useQuery({
    queryKey: ['waste-streams-list'],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<{ data: WasteStream[] }>('/module-4/waste-streams?limit=100');
      return response.data;
    },
  });

  const [formData, setFormData] = useState({
    consignment_date: '',
    carrier_name: '',
    carrier_licence_number: '',
    destination_site: '',
    waste_description: '',
    ewc_code: '',
    quantity_m3: '',
    quantity_kg: '',
  });

  useEffect(() => {
    if (consignmentNote) {
      setFormData({
        consignment_date: consignmentNote.consignment_date || new Date().toISOString().split('T')[0],
        carrier_name: consignmentNote.carrier_name || '',
        carrier_licence_number: consignmentNote.carrier_licence_number || '',
        destination_site: consignmentNote.destination_site || '',
        waste_description: consignmentNote.waste_description || '',
        ewc_code: consignmentNote.ewc_code || '',
        quantity_m3: consignmentNote.quantity_m3?.toString() || '',
        quantity_kg: consignmentNote.quantity_kg?.toString() || '',
      });
    }
  }, [consignmentNote]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-4/consignment-notes/${noteId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consignment-note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['module-4-consignment-notes'] });
      router.push(`/dashboard/module-4/consignment-notes/${noteId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update consignment note:', error);
      alert('Failed to update consignment note. Please try again.');
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
      quantity_m3: parseFloat(formData.quantity_m3),
      quantity_kg: formData.quantity_kg ? parseFloat(formData.quantity_kg) : null,
      carrier_licence_number: formData.carrier_licence_number || null,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading consignment note...</div>;
  }

  if (!consignmentNote) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Consignment note not found</p>
        <Link href="/dashboard/module-4/consignment-notes">
          <Button variant="outline" className="mt-4">
            Back to Consignment Notes
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-4/consignment-notes/${noteId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Consignment Note
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Consignment Note</h1>
        <p className="text-text-secondary mt-2">
          Update consignment note: {consignmentNote.consignment_note_number}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="consignment_date">Consignment Date *</Label>
            <Input
              id="consignment_date"
              type="date"
              required
              value={formData.consignment_date}
              onChange={(e) => setFormData({ ...formData, consignment_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="carrier_name">Carrier Name *</Label>
            <Input
              id="carrier_name"
              required
              value={formData.carrier_name}
              onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
              placeholder="e.g., ABC Waste Services Ltd"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="carrier_licence_number">Carrier Licence Number</Label>
            <Input
              id="carrier_licence_number"
              value={formData.carrier_licence_number}
              onChange={(e) => setFormData({ ...formData, carrier_licence_number: e.target.value })}
              placeholder="e.g., EA/WML/123456"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="destination_site">Destination Site *</Label>
            <Input
              id="destination_site"
              required
              value={formData.destination_site}
              onChange={(e) => setFormData({ ...formData, destination_site: e.target.value })}
              placeholder="e.g., Waste Treatment Facility, Address"
              className="mt-1"
            />
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

          <div className="md:col-span-2">
            <Label htmlFor="waste_description">Waste Description *</Label>
            <textarea
              id="waste_description"
              required
              value={formData.waste_description}
              onChange={(e) => setFormData({ ...formData, waste_description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Describe the waste being consigned..."
            />
          </div>

          <div>
            <Label htmlFor="quantity_m3">Quantity (m³) *</Label>
            <Input
              id="quantity_m3"
              type="number"
              step="0.01"
              required
              value={formData.quantity_m3}
              onChange={(e) => setFormData({ ...formData, quantity_m3: e.target.value })}
              placeholder="e.g., 10.50"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="quantity_kg">Quantity (kg)</Label>
            <Input
              id="quantity_kg"
              type="number"
              step="0.01"
              value={formData.quantity_kg}
              onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
              placeholder="e.g., 5000.00"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-4/consignment-notes/${noteId}`}>
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

