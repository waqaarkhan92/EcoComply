'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';

export default function ImportLabResultsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Note: This endpoint would need to be created for CSV import
      // For now, this is a placeholder
      return apiClient.upload('/module-2/lab-results/import', formData);
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Lab results imported successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['module-2-lab-results'] });
      queryClient.invalidateQueries({ queryKey: ['module-2-parameters'] });
      queryClient.invalidateQueries({ queryKey: ['module-2-exceedances'] });
      router.push(`/dashboard/sites/${siteId}/module-2/lab-results`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import lab results',
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a CSV or Excel file',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('site_id', siteId);

    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-2/lab-results`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Import Lab Results</h1>
          <p className="text-text-secondary mt-2">
            Upload a CSV or Excel file to import multiple lab results at once
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Lab Results File <span className="text-red-600">*</span>
            </label>
            <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-primary transition-colors">
              <div className="space-y-1 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-text-tertiary" />
                <div className="flex text-sm text-text-secondary">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="sr-only"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-text-tertiary">
                  CSV or Excel file
                </p>
                {file && (
                  <p className="text-sm font-medium text-text-primary mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link href={`/dashboard/sites/${siteId}/module-2/lab-results`}>
              <Button variant="secondary" type="button" disabled={isUploading}>
                Cancel
              </Button>
            </Link>
            <Button 
              variant="primary" 
              type="submit"
              disabled={!file || isUploading}
            >
              {isUploading ? (
                'Importing...'
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Results
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">CSV Format Requirements</h3>
        <p className="text-sm text-blue-800 mb-2">Your CSV file should include the following columns:</p>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li><strong>parameter_id</strong> - UUID of the parameter (required)</li>
          <li><strong>sample_date</strong> - Date in YYYY-MM-DD format (required)</li>
          <li><strong>recorded_value</strong> - Numeric value (required)</li>
          <li><strong>unit</strong> - Unit of measurement (required)</li>
          <li><strong>sample_id</strong> - Sample identifier (optional)</li>
          <li><strong>lab_reference</strong> - Lab reference number (optional)</li>
          <li><strong>notes</strong> - Additional notes (optional)</li>
        </ul>
        <p className="text-sm text-blue-800 mt-3">
          <strong>Example:</strong> parameter_id,sample_date,recorded_value,unit,sample_id
        </p>
      </div>
    </div>
  );
}

