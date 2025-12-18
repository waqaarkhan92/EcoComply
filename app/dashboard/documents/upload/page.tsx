'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Check } from 'lucide-react';
import {
  RegulatorFormFields,
  RegulatorSelector,
  WaterCompanyFormFields,
  WaterCompanySelector,
  type Regulator,
  type RegulatorFormData,
  type WaterCompany,
  type WaterCompanyFormData,
} from '@/components/ingestion';

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
    primary_site_id: '',
    additional_site_ids: [] as string[],
    obligations_shared: false,
    document_type: 'PERMIT',
  });
  const [dragActive, setDragActive] = useState(false);

  // Jurisdiction-specific state
  const [selectedRegulator, setSelectedRegulator] = useState<Regulator | null>(null);
  const [regulatorData, setRegulatorData] = useState<Partial<RegulatorFormData>>({});
  const [selectedWaterCompany, setSelectedWaterCompany] = useState<WaterCompany | null>(null);
  const [waterCompanyData, setWaterCompanyData] = useState<Partial<WaterCompanyFormData>>({});

  // Fetch sites
  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => apiClient.get<Site[]>('/sites'),
  });

  const sites: any[] = sitesData?.data || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formDataToSubmit: FormData) => {
      return apiClient.upload('/documents', formDataToSubmit);
    },
    onSuccess: async (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      const documentId = response?.data?.id;

      if (!documentId) {
        toast.warning('Upload succeeded but document ID is missing. Please refresh the documents list.');
        router.push('/dashboard/documents');
        return;
      }

      // If additional sites selected, assign them via POST /documents/:id/sites
      if (formData.additional_site_ids.length > 0) {
        try {
          for (const siteId of formData.additional_site_ids) {
            await apiClient.post(`/documents/${documentId}/sites`, {
              site_id: siteId,
              is_primary: false,
              obligations_shared: formData.obligations_shared,
            });
          }
        } catch (error) {
          console.error('Error assigning additional sites:', error);
          // Continue anyway - document uploaded successfully
        }
      }

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
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF files are allowed');
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSiteToggle = (siteId: string) => {
    setFormData(prev => ({
      ...prev,
      additional_site_ids: prev.additional_site_ids.includes(siteId)
        ? prev.additional_site_ids.filter(id => id !== siteId)
        : [...prev.additional_site_ids, siteId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    if (!formData.primary_site_id) {
      toast.error('Please select a primary site');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('site_id', formData.primary_site_id);
    uploadFormData.append('document_type', formData.document_type);

    // Add jurisdiction metadata for AI extraction
    if (formData.document_type === 'PERMIT' && selectedRegulator) {
      uploadFormData.append('regulator', selectedRegulator);
      if (regulatorData) {
        uploadFormData.append('regulator_metadata', JSON.stringify(regulatorData));
      }
    }

    if (formData.document_type === 'CONSENT' && selectedWaterCompany) {
      uploadFormData.append('water_company', selectedWaterCompany);
      if (waterCompanyData) {
        uploadFormData.append('water_company_metadata', JSON.stringify(waterCompanyData));
      }
    }

    uploadMutation.mutate(uploadFormData);
  };

  const availableAdditionalSites = sites.filter(s => s.id !== formData.primary_site_id);
  const showMultiSiteOptions = formData.primary_site_id && availableAdditionalSites.length > 0;

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

        {/* Primary Site Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Primary Site <span className="text-danger">*</span>
          </label>
          <select
            value={formData.primary_site_id}
            onChange={(e) => setFormData({ ...formData, primary_site_id: e.target.value, additional_site_ids: [] })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select primary site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-1">
            The primary site will be used for document assignment
          </p>
        </div>

        {/* Multi-Site Options */}
        {showMultiSiteOptions && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-medium text-text-primary mb-3">
              Multi-Site Permit (Optional)
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Select additional sites covered by this permit
            </p>

            {/* Additional Sites */}
            <div className="space-y-2 mb-4">
              {availableAdditionalSites.map((site) => (
                <label
                  key={site.id}
                  className="flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.additional_site_ids.includes(site.id)}
                    onChange={() => handleSiteToggle(site.id)}
                    className="mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-text-primary">{site.name}</span>
                  {formData.additional_site_ids.includes(site.id) && (
                    <Check className="ml-auto h-4 w-4 text-success" />
                  )}
                </label>
              ))}
            </div>

            {/* Obligations Shared Toggle */}
            {formData.additional_site_ids.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-text-primary mb-2">
                  Obligation Management
                </p>
                <div className="space-y-2">
                  <label className="flex items-start p-3 rounded border border-gray-200 bg-white cursor-pointer hover:border-primary">
                    <input
                      type="radio"
                      name="obligations_shared"
                      checked={!formData.obligations_shared}
                      onChange={() => setFormData({ ...formData, obligations_shared: false })}
                      className="mt-0.5 mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Replicated per Site
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        Create separate obligation records for each site. Evidence must be linked to the same site.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start p-3 rounded border border-gray-200 bg-white cursor-pointer hover:border-primary">
                    <input
                      type="radio"
                      name="obligations_shared"
                      checked={formData.obligations_shared}
                      onChange={() => setFormData({ ...formData, obligations_shared: true })}
                      className="mt-0.5 mr-3 h-4 w-4 text-primary focus:ring-primary border-gray-300"
                    />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        Shared Across Sites
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        Single obligation record for all sites. Evidence can be linked from any assigned site.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {formData.additional_site_ids.length > 0 && (
              <p className="text-xs text-text-secondary mt-4">
                {formData.additional_site_ids.length} additional site{formData.additional_site_ids.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* Document Type Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Document Type <span className="text-danger">*</span>
          </label>
          <select
            value={formData.document_type}
            onChange={(e) => {
              setFormData({ ...formData, document_type: e.target.value });
              // Reset jurisdiction selections when document type changes
              setSelectedRegulator(null);
              setRegulatorData({});
              setSelectedWaterCompany(null);
              setWaterCompanyData({});
            }}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="PERMIT">Environmental Permit</option>
            <option value="CONSENT">Trade Effluent Consent</option>
            <option value="MCPD_REGISTRATION">MCPD Registration</option>
          </select>
        </div>

        {/* Jurisdiction-Specific Fields */}
        {(formData.document_type === 'PERMIT' || formData.document_type === 'MCPD_REGISTRATION') && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
            <h3 className="text-sm font-medium text-text-primary">
              Regulator Information
            </h3>
            <p className="text-xs text-text-secondary">
              Select the regulator to enable jurisdiction-specific extraction
            </p>

            <RegulatorSelector
              value={selectedRegulator}
              onChange={(value) => setSelectedRegulator(value as Regulator | null)}
            />

            {selectedRegulator && (
              <RegulatorFormFields
                regulator={selectedRegulator as Regulator}
                values={regulatorData}
                onChange={(newValues) => setRegulatorData(newValues)}
              />
            )}
          </div>
        )}

        {formData.document_type === 'CONSENT' && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
            <h3 className="text-sm font-medium text-text-primary">
              Water Company Information
            </h3>
            <p className="text-xs text-text-secondary">
              Select the water company to enable jurisdiction-specific extraction (including Mogden formula for Thames Water)
            </p>

            <WaterCompanySelector
              value={selectedWaterCompany}
              onChange={(value) => setSelectedWaterCompany(value as WaterCompany | null)}
            />

            {selectedWaterCompany && (
              <WaterCompanyFormFields
                waterCompany={selectedWaterCompany as WaterCompany}
                values={waterCompanyData}
                onChange={(newValues) => setWaterCompanyData(newValues)}
              />
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedFile || !formData.primary_site_id || uploadMutation.isPending}
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
