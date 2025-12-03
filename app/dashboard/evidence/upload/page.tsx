'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Obligation {
  id: string;
  obligation_title: string;
  site_id: string;
}

export default function EvidenceUploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedObligations, setSelectedObligations] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Fetch obligations for multi-select
  const { data: obligationsData, isLoading: obligationsLoading } = useQuery<{
    data: Obligation[];
  }>({
    queryKey: ['obligations'],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get('/obligations?limit=100');
      return response.data;
    },
  });

  const obligations = obligationsData?.data || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Use apiClient.upload for file uploads
      return apiClient.upload('/evidence', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      router.push('/dashboard/evidence');
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.csv', '.xlsx', '.zip'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension) && !allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only PDF, images, documents, CSV, Excel, and ZIP files are allowed.');
      return;
    }

    // Validate file size (20MB max)
    const maxSizeBytes = 20 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File too large. Maximum size is 20MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const toggleObligation = (obligationId: string) => {
    setSelectedObligations((prev) =>
      prev.includes(obligationId)
        ? prev.filter((id) => id !== obligationId)
        : [...prev, obligationId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    if (selectedObligations.length === 0) {
      alert('Please select at least one obligation to link this evidence to');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('obligation_ids', JSON.stringify(selectedObligations));
    
    if (description) {
      formData.append('metadata', JSON.stringify({ description }));
    }

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Upload Evidence</h1>
          <p className="text-text-secondary mt-2">
            Upload evidence files and link them to obligations
          </p>
        </div>
        <Link href="/dashboard/evidence">
          <Button variant="outline" size="md">
            Cancel
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Select File</h2>
          
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-input-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
              <p className="text-text-primary font-medium mb-2">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-sm text-text-secondary mb-4">
                Supported formats: PDF, Images, Documents, CSV, Excel, ZIP (max 20MB)
              </p>
              <label htmlFor="file-input">
                <Button variant="primary" size="md" type="button" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
              <input
                id="file-input"
                type="file"
                className="hidden"
                onChange={handleFileInputChange}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.csv,.xlsx,.zip"
              />
            </div>
          ) : (
            <div className="border border-input-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium text-text-primary">{selectedFile.name}</p>
                    <p className="text-sm text-text-secondary">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Obligation Selection */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Link to Obligations <span className="text-danger">*</span>
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            Select one or more obligations to link this evidence to
          </p>

          {obligationsLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading obligations...</div>
          ) : obligations.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <p className="mb-4">No obligations found. Please create obligations first.</p>
              <Link href="/dashboard/obligations">
                <Button variant="primary" size="md">
                  Go to Obligations
                </Button>
              </Link>
            </div>
          ) : (
            <div className="border border-input-border rounded-lg max-h-96 overflow-y-auto">
              {obligations.map((obligation) => (
                <label
                  key={obligation.id}
                  className="flex items-center gap-3 p-4 border-b border-input-border/50 last:border-b-0 hover:bg-background-tertiary cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedObligations.includes(obligation.id)}
                    onChange={() => toggleObligation(obligation.id)}
                    className="w-4 h-4 text-primary border-input-border rounded focus:ring-primary"
                  />
                  <span className="flex-1 text-text-primary">{obligation.obligation_title}</span>
                </label>
              ))}
            </div>
          )}

          {selectedObligations.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary font-medium">
                {selectedObligations.length} obligation{selectedObligations.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Description (Optional)</h2>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description or notes about this evidence..."
            className="w-full min-h-[100px] rounded-lg border border-input-border px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Upload Progress */}
        {uploadMutation.isPending && (
          <div className="bg-white rounded-lg shadow-base p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-primary">Uploading...</span>
                <span className="text-text-secondary">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-background-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadMutation.isError && (
          <div className="bg-danger/10 border border-danger rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-danger">Upload Failed</p>
              <p className="text-sm text-text-secondary mt-1">
                {(uploadMutation.error as any)?.response?.data?.error?.message || 'An error occurred during upload'}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {uploadMutation.isSuccess && (
          <div className="bg-success/10 border border-success rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-success">Upload Successful</p>
              <p className="text-sm text-text-secondary mt-1">
                Evidence uploaded and linked to {selectedObligations.length} obligation{selectedObligations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/dashboard/evidence">
            <Button variant="outline" size="md" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={!selectedFile || selectedObligations.length === 0 || uploadMutation.isPending}
            loading={uploadMutation.isPending}
          >
            Upload Evidence
          </Button>
        </div>
      </form>
    </div>
  );
}

