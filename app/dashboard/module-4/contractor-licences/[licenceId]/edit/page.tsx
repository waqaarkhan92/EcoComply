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

interface ContractorLicence {
  id: string;
  contractor_name: string;
  licence_number: string;
  licence_type: string;
  waste_types_allowed: string[];
  issued_date: string | null;
  expiry_date: string;
  is_valid: boolean;
  verification_notes: string | null;
}

export default function EditContractorLicencePage({
  params,
}: {
  params: Promise<{ licenceId: string }>;
}) {
  const { licenceId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasteTypeInput, setWasteTypeInput] = useState('');

  const { data: licence, isLoading } = useQuery<ContractorLicence>({
    queryKey: ['contractor-licence', licenceId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<ContractorLicence>(`/module-4/contractor-licences/${licenceId}`);
      return response.data;
    },
  });

  const [formData, setFormData] = useState({
    contractor_name: '',
    licence_number: '',
    licence_type: '',
    waste_types_allowed: [] as string[],
    issued_date: '',
    expiry_date: '',
    is_valid: true,
    verification_notes: '',
  });

  useEffect(() => {
    if (licence) {
      setFormData({
        contractor_name: licence.contractor_name || '',
        licence_number: licence.licence_number || '',
        licence_type: licence.licence_type || '',
        waste_types_allowed: licence.waste_types_allowed || [],
        issued_date: licence.issued_date || '',
        expiry_date: licence.expiry_date || '',
        is_valid: licence.is_valid,
        verification_notes: licence.verification_notes || '',
      });
    }
  }, [licence]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-4/contractor-licences/${licenceId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-licence', licenceId] });
      queryClient.invalidateQueries({ queryKey: ['module-4-contractor-licences'] });
      router.push(`/dashboard/module-4/contractor-licences/${licenceId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update contractor licence:', error);
      alert('Failed to update contractor licence. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleAddWasteType = () => {
    if (wasteTypeInput.trim() && !formData.waste_types_allowed.includes(wasteTypeInput.trim())) {
      setFormData({
        ...formData,
        waste_types_allowed: [...formData.waste_types_allowed, wasteTypeInput.trim()],
      });
      setWasteTypeInput('');
    }
  };

  const handleRemoveWasteType = (wasteType: string) => {
    setFormData({
      ...formData,
      waste_types_allowed: formData.waste_types_allowed.filter((wt) => wt !== wasteType),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submitData = {
      ...formData,
      issued_date: formData.issued_date || null,
      verification_notes: formData.verification_notes || null,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading contractor licence...</div>;
  }

  if (!licence) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Contractor licence not found</p>
        <Link href="/dashboard/module-4/contractor-licences">
          <Button variant="outline" className="mt-4">
            Back to Contractor Licences
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-4/contractor-licences/${licenceId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Contractor Licence
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Contractor Licence</h1>
        <p className="text-text-secondary mt-2">
          Update contractor licence details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="contractor_name">Contractor Name *</Label>
            <Input
              id="contractor_name"
              required
              value={formData.contractor_name}
              onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
              placeholder="e.g., ABC Waste Services Ltd"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="licence_number">Licence Number *</Label>
            <Input
              id="licence_number"
              required
              value={formData.licence_number}
              onChange={(e) => setFormData({ ...formData, licence_number: e.target.value })}
              placeholder="e.g., EA/WML/123456"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="licence_type">Licence Type *</Label>
            <Input
              id="licence_type"
              required
              value={formData.licence_type}
              onChange={(e) => setFormData({ ...formData, licence_type: e.target.value })}
              placeholder="e.g., Waste Management Licence"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="expiry_date">Expiry Date *</Label>
            <Input
              id="expiry_date"
              type="date"
              required
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="issued_date">Issued Date</Label>
            <Input
              id="issued_date"
              type="date"
              value={formData.issued_date}
              onChange={(e) => setFormData({ ...formData, issued_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="waste_types_allowed">Waste Types Allowed</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="waste_types_allowed"
                value={wasteTypeInput}
                onChange={(e) => setWasteTypeInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWasteType();
                  }
                }}
                placeholder="Enter waste type and press Enter"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddWasteType}
              >
                Add
              </Button>
            </div>
            {formData.waste_types_allowed.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.waste_types_allowed.map((wasteType) => (
                  <span
                    key={wasteType}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {wasteType}
                    <button
                      type="button"
                      onClick={() => handleRemoveWasteType(wasteType)}
                      className="ml-2 text-blue-700 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="verification_notes">Verification Notes</Label>
            <textarea
              id="verification_notes"
              value={formData.verification_notes}
              onChange={(e) => setFormData({ ...formData, verification_notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Additional notes about licence verification..."
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_valid"
                checked={formData.is_valid}
                onChange={(e) => setFormData({ ...formData, is_valid: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="is_valid" className="cursor-pointer">
                Valid (licence is currently active and valid)
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-4/contractor-licences/${licenceId}`}>
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

