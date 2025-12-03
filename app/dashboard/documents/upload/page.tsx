'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText } from 'lucide-react';

interface Site {
  id: string;
  name: string;
}

export default function DocumentUploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    site_id: '',
    document_type: 'PERMIT',
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch sites
  const { data: sitesData } = useQuery<{ data: Site[] }>({
    queryKey: ['sites'],
    queryFn: async () => apiClient.get<Site[]>('/sites'),
  });

  const sites = sitesData?.data || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formDataToSubmit: FormData) => {
      return apiClient.upload('/documents', formDataToSubmit);
    },
    onSuccess: (response: any) => {
      console.log('Upload response:', JSON.stringify(response, null, 2));
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      // The API returns { data: {...}, meta: {...} }
      // apiClient.upload returns the full response object
      let documentId = null;
      
      // The API returns { data: {...document...}, meta: {...} }
      // apiClient.upload returns the parsed JSON response directly
      // So response should be { data: { id: ..., ... }, meta: {...} }
      documentId = response?.data?.id;
      
      console.log('Extracted document ID:', documentId);
      console.log('Response structure:', {
        hasData: !!response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : [],
        topLevelKeys: Object.keys(response || {}),
      });
      
      if (!documentId) {
        console.error('Upload response missing document ID. Full response:', JSON.stringify(response, null, 2));
        alert('Upload succeeded but document ID is missing. Please refresh the documents list.');
        router.push('/dashboard/documents');
        return;
      }
      
      console.log('Navigating to document:', `/dashboard/documents/${documentId}`);
      router.push(`/dashboard/documents/${documentId}`);
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only PDF files are allowed');
      return;
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    if (!formData.site_id) {
      alert('Please select a site');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('site_id', formData.site_id);
    uploadFormData.append('document_type', formData.document_type);

    uploadMutation.mutate(uploadFormData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Upload Document</h1>
        <p className="text-text-secondary mt-2">
          Upload an environmental permit or compliance document
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <FileText className="mx-auto h-12 w-12 text-primary" />
              <div>
                <p className="text-text-primary font-medium">{selectedFile.name}</p>
                <p className="text-sm text-text-secondary mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="mx-auto h-12 w-12 text-text-tertiary" />
              <div>
                <p className="text-text-primary font-medium">
                  Drag and drop your PDF file here
                </p>
                <p className="text-sm text-text-secondary mt-2">or</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-text-tertiary">
                PDF files only, maximum 50MB
              </p>
            </div>
          )}
        </div>

        {/* Site Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Site <span className="text-danger">*</span>
          </label>
          <select
            value={formData.site_id}
            onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {/* Document Type Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Document Type <span className="text-danger">*</span>
          </label>
          <select
            value={formData.document_type}
            onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="PERMIT">Environmental Permit</option>
            <option value="CONSENT">Trade Effluent Consent</option>
            <option value="MCPD_REGISTRATION">MCPD Registration</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedFile || !formData.site_id || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>

        {uploadMutation.isError && (
          <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-md text-sm">
            {uploadMutation.error?.message || 'Upload failed. Please try again.'}
          </div>
        )}
      </form>
    </div>
  );
}

