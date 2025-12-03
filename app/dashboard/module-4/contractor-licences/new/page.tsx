'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewContractorLicencePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasteTypeInput, setWasteTypeInput] = useState('');
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-4/contractor-licences', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-4-contractor-licences'] });
      router.push(`/dashboard/module-4/contractor-licences/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create contractor licence:', error);
      alert('Failed to create contractor licence. Please try again.');
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

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-4/contractor-licences"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Contractor Licences
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Contractor Licence</h1>
        <p className="text-text-secondary mt-2">
          Register a new contractor licence for waste handling
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
          <Link href="/dashboard/module-4/contractor-licences">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Contractor Licence'}
          </Button>
        </div>
      </form>
    </div>
  );
}

