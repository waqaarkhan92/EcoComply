'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { useToast } from '@/lib/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NoPacksState } from '@/components/ui/empty-state';
import { ProgressIndicator, useProgressSteps } from '@/components/ui/progress-indicator';
import { Package, Download, Share2, FileText, Calendar, Filter, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Pack {
  id: string;
  pack_type: string;
  company_id: string;
  site_id: string | null;
  document_id: string | null;
  status: string;
  recipient_type?: string;
  recipient_name?: string;
  purpose?: string;
  date_range_start?: string;
  date_range_end?: string;
  file_url?: string;
  storage_path?: string;
  generated_by: string;
  created_at: string;
  updated_at: string;
}

interface Site {
  id: string;
  name: string;
  company_id: string;
}

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  site_id: string;
}

const PACK_TYPES = [
  { value: 'REGULATOR_INSPECTION', label: 'Regulator Pack', icon: '🏛️', description: 'Inspector-ready compliance pack', available: ['core', 'growth', 'consultant'] },
  { value: 'AUDIT_PACK', label: 'Audit Pack', icon: '📁', description: 'Full evidence compilation', available: ['core', 'growth', 'consultant'] },
  { value: 'TENDER_CLIENT_ASSURANCE', label: 'Tender Pack', icon: '📋', description: 'Client assurance & tender pack', available: ['growth', 'consultant'] },
  { value: 'BOARD_MULTI_SITE_RISK', label: 'Board Pack', icon: '📊', description: 'Multi-site risk summary', available: ['growth', 'consultant'] },
  { value: 'INSURER_BROKER', label: 'Insurer Pack', icon: '🛡️', description: 'Insurance & broker pack', available: ['growth', 'consultant'] },
];

export default function PacksPage() {
  const { company, user, roles } = useAuthStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPackType, setSelectedPackType] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [generatingPackId, setGeneratingPackId] = useState<string | null>(null);

  // Progress steps for pack generation
  const progressSteps = useProgressSteps([
    { id: 'validating', label: 'Validating request', description: 'Checking requirements' },
    { id: 'gathering', label: 'Gathering obligations', description: 'Collecting compliance data' },
    { id: 'evidence', label: 'Collecting evidence', description: 'Compiling documents' },
    { id: 'generating', label: 'Generating document', description: 'Creating pack file' },
    { id: 'finalizing', label: 'Finalizing pack', description: 'Completing generation' },
  ]);

  // Fetch packs
  const { data: packsData, isLoading: packsLoading } = useQuery<{
    data: Pack[];
    pagination: any;
  }>({
    queryKey: ['packs'],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<Pack[]>('/packs');
      // apiClient.get returns {data: [...], pagination: {...}}, so return the whole response
      return response;
    },
    refetchInterval: (query) => {
      // Poll every 5 seconds if there are packs with status PENDING or GENERATING
      const packs = query.state.data?.data || [];
      const hasGenerating = packs.some((p: Pack) =>
        p.status === 'PENDING' || p.status === 'GENERATING'
      );
      return hasGenerating ? 5000 : false;
    },
    retry: 2, // Only retry twice on failure to avoid rate limiting
  });

  // Fetch sites
  const { data: sitesData } = useQuery<{
    data: Site[];
  }>({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<Site[]>('/sites');
      return response;
    },
  });

  const sites: any[] = sitesData?.data || [];

  // Fetch documents for selected site
  const { data: documentsData } = useQuery<{
    data: Document[];
  }>({
    queryKey: ['documents', selectedSite],
    queryFn: async (): Promise<any> => {
      if (!selectedSite) return { data: [] };
      const response = await apiClient.get<Document[]>(`/documents?filter[site_id]=${selectedSite}`);
      return response;
    },
    enabled: !!selectedSite && selectedPackType !== 'BOARD_MULTI_SITE_RISK',
  });

  const documents: any[] = documentsData?.data || [];

  // Pack generation mutation
  const generateMutation = useMutation({
    mutationFn: async (packData: any) => {
      // Start progress
      progressSteps.startStep('validating');

      const response = await apiClient.post('/packs/generate', packData);

      // Complete validation, start gathering
      progressSteps.completeStep('validating');
      progressSteps.startStep('gathering');

      return response.data;
    },
    onSuccess: (data) => {
      // Store the pack ID to track its progress
      setGeneratingPackId(data.id);

      // Complete gathering, start evidence collection
      progressSteps.completeStep('gathering');
      progressSteps.startStep('evidence');

      queryClient.invalidateQueries({ queryKey: ['packs'] });

      // Don't close modal yet - we'll keep it open to show progress
      // Show success toast
      toast({
        title: 'Pack Generation Started',
        description: 'Your pack is being generated. It will appear in the list shortly.',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      // Mark current active step as failed
      const activeStep = progressSteps.steps.find(s => s.status === 'active');
      if (activeStep) {
        progressSteps.failStep(activeStep.id);
      }

      toast({
        title: 'Pack Generation Failed',
        description: error?.message || 'An error occurred while generating the pack.',
        variant: 'destructive',
      });
    },
  });

  const packs: any[] = packsData?.data || [];

  // Monitor pack generation progress
  useEffect(() => {
    if (!generatingPackId) return;

    const generatingPack = packs.find(p => p.id === generatingPackId);
    if (!generatingPack) return;

    const status = generatingPack.status;

    if (status === 'GENERATING') {
      // Update progress based on simulated stages
      progressSteps.completeStep('evidence');
      progressSteps.startStep('generating');
    } else if (status === 'COMPLETED') {
      // Complete all steps
      progressSteps.completeStep('generating');
      progressSteps.startStep('finalizing');

      // Small delay before completing finalization and closing modal
      setTimeout(() => {
        progressSteps.completeStep('finalizing');

        // Close modal after a short delay to show completion
        setTimeout(() => {
          setShowGenerateModal(false);
          setGeneratingPackId(null);

          // Reset form
          setSelectedPackType(null);
          setSelectedSite('');
          setSelectedDocument('');
          setDateRangeStart('');
          setDateRangeEnd('');
          setRecipientName('');
          setPurpose('');
          progressSteps.resetSteps();
        }, 1000);
      }, 500);
    } else if (status === 'FAILED') {
      // Mark as failed
      const activeStep = progressSteps.steps.find(s => s.status === 'active');
      if (activeStep) {
        progressSteps.failStep(activeStep.id);
      }
    }
  }, [packs, generatingPackId, progressSteps]);

  // Filter pack types based on subscription tier
  const availablePackTypes = PACK_TYPES.filter(pt => {
    if (!company) return false;
    return pt.available.includes(company.subscription_tier);
  });

  // Check if Board Pack is available (requires Owner/Admin)
  const canGenerateBoardPack = availablePackTypes.some(pt => pt.value === 'BOARD_MULTI_SITE_RISK') &&
    (roles.includes('OWNER') || roles.includes('ADMIN'));

  const handleGenerate = () => {
    if (!selectedPackType) {
      alert('Please select a pack type');
      return;
    }

    if (!company?.id) {
      alert('Company not found');
      return;
    }

    // Validate Board Pack requirements
    if (selectedPackType === 'BOARD_MULTI_SITE_RISK') {
      if (!canGenerateBoardPack) {
        alert('Board Pack requires Owner or Admin role');
        return;
      }
      // Board Pack doesn't need site_id
    } else {
      if (!selectedSite) {
        alert('Please select a site');
        return;
      }
    }

    const packData: any = {
      pack_type: selectedPackType,
      company_id: company.id,
      recipient_name: recipientName || null,
      purpose: purpose || null,
    };

    if (selectedPackType === 'BOARD_MULTI_SITE_RISK') {
      // Board Pack: company_id only, no site_id
      packData.site_id = null;
    } else {
      packData.site_id = selectedSite;
      if (selectedDocument) {
        packData.document_id = selectedDocument;
      }
    }

    if (dateRangeStart) {
      packData.date_range_start = dateRangeStart;
    }
    if (dateRangeEnd) {
      packData.date_range_end = dateRangeEnd;
    }

    generateMutation.mutate(packData);
  };

  const getPackTypeLabel = (packType: string) => {
    return PACK_TYPES.find(pt => pt.value === packType)?.label || packType;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-1 text-xs font-medium rounded bg-success/10 text-success">Completed</span>;
      case 'GENERATING':
      case 'PENDING':
        return <span className="px-2 py-1 text-xs font-medium rounded bg-warning/10 text-warning">Generating</span>;
      case 'FAILED':
        return <span className="px-2 py-1 text-xs font-medium rounded bg-danger/10 text-danger">Failed</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded bg-background-tertiary text-text-secondary">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Packs</h1>
          <p className="text-text-secondary mt-2">
            Generate compliance packs for inspections, tenders, and reporting
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Package className="h-4 w-4" />}
          iconPosition="left"
          onClick={() => setShowGenerateModal(true)}
        >
          Generate Pack
        </Button>
      </div>

      {/* Packs List */}
      {packsLoading ? (
        <div className="text-center py-12 text-text-secondary">Loading packs...</div>
      ) : packs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-base overflow-hidden">
          <NoPacksState onCreate={() => setShowGenerateModal(true)} />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-base overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-input-border bg-background-tertiary">
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Pack Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date Range</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Generated</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((pack) => (
                <tr key={pack.id} className="border-b border-input-border/50 hover:bg-background-tertiary transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-medium text-text-primary">{getPackTypeLabel(pack.pack_type)}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-text-secondary">
                    {pack.date_range_start && pack.date_range_end
                      ? `${new Date(pack.date_range_start).toLocaleDateString()} - ${new Date(pack.date_range_end).toLocaleDateString()}`
                      : 'All time'}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(pack.status)}
                  </td>
                  <td className="py-3 px-4 text-sm text-text-secondary">
                    {new Date(pack.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {pack.status === 'COMPLETED' && (
                        <Link href={pack.site_id ? `/dashboard/sites/${pack.site_id}/packs/${pack.id}` : `/dashboard/packs/${pack.id}`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      {pack.status === 'COMPLETED' && (
                        <a href={`/api/v1/packs/${pack.id}/download`} download>
                          <Button variant="ghost" size="sm" title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                      {pack.status === 'COMPLETED' && (
                        <Button variant="ghost" size="sm" title="Share">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      {pack.status === 'PENDING' || pack.status === 'GENERATING' ? (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Clock className="h-4 w-4 animate-spin" />
                          <span className="text-xs">Generating...</span>
                        </div>
                      ) : null}
                      {pack.status === 'FAILED' && (
                        <div className="flex items-center gap-2 text-danger">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-xs">Failed</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Pack Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-input-border">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-text-primary">Generate Pack</h2>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Progress Indicator - shown during generation */}
              {(generateMutation.isPending || generatingPackId) && (
                <div className="bg-background-tertiary/50 rounded-lg p-6 border border-input-border">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    Generating Pack
                  </h3>
                  <ProgressIndicator steps={progressSteps.steps} />
                </div>
              )}

              {/* Pack Type Selection */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Pack Type <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availablePackTypes.map((packType) => {
                    const isBoardPack = packType.value === 'BOARD_MULTI_SITE_RISK';
                    const isDisabled = isBoardPack && !canGenerateBoardPack;
                    
                    return (
                      <button
                        key={packType.value}
                        onClick={() => {
                          if (!isDisabled) {
                            setSelectedPackType(packType.value);
                            if (isBoardPack) {
                              setSelectedSite(''); // Clear site for Board Pack
                            }
                          }
                        }}
                        disabled={isDisabled}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedPackType === packType.value
                            ? 'border-primary bg-primary/5'
                            : 'border-input-border hover:border-primary/50'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{packType.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-text-primary">{packType.label}</div>
                            <div className="text-sm text-text-secondary mt-1">{packType.description}</div>
                            {isDisabled && (
                              <div className="text-xs text-danger mt-1">Requires Owner/Admin role</div>
                            )}
                          </div>
                          {selectedPackType === packType.value && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Site Selection (not for Board Pack) */}
              {selectedPackType && selectedPackType !== 'BOARD_MULTI_SITE_RISK' && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Site <span className="text-danger">*</span>
                  </label>
                  <select
                    value={selectedSite}
                    onChange={(e) => {
                      setSelectedSite(e.target.value);
                      setSelectedDocument(''); // Clear document when site changes
                    }}
                    className="w-full rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Document Selection (optional, not for Board Pack) */}
              {selectedPackType && selectedPackType !== 'BOARD_MULTI_SITE_RISK' && selectedSite && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Document (Optional)
                  </label>
                  <select
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="w-full rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">All documents</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.file_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Start Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    End Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                  />
                </div>
              </div>

              {/* Recipient Name */}
              {(selectedPackType === 'REGULATOR_INSPECTION' || selectedPackType === 'BOARD_MULTI_SITE_RISK') && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Recipient Name (Optional)
                  </label>
                  <Input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g., Environment Agency Inspector"
                  />
                </div>
              )}

              {/* Purpose (for Tender/Insurer packs) */}
              {(selectedPackType === 'TENDER_CLIENT_ASSURANCE' || selectedPackType === 'INSURER_BROKER') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Client/Broker Name (Optional)
                    </label>
                    <Input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g., Client Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Purpose (Optional)
                    </label>
                    <textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g., Tender submission, Insurance renewal"
                      className="w-full min-h-[100px] rounded-lg border border-input-border px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {/* Error Message */}
              {generateMutation.isError && (
                <div className="bg-danger/10 border border-danger rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-danger">Generation Failed</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {(generateMutation.error as any)?.response?.data?.error?.message || 'An error occurred'}
                    </p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {generateMutation.isSuccess && (
                <div className="bg-success/10 border border-success rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-success">Pack Generation Started</p>
                    <p className="text-sm text-text-secondary mt-1">
                      Your pack is being generated. You'll be notified when it's ready.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-input-border flex items-center justify-end gap-4">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setShowGenerateModal(false);
                  if (generatingPackId) {
                    // Reset state if closing during generation
                    setGeneratingPackId(null);
                    progressSteps.resetSteps();
                  }
                }}
                disabled={generateMutation.isPending}
              >
                {generatingPackId ? 'Close' : 'Cancel'}
              </Button>
              {!generatingPackId && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !selectedPackType}
                  loading={generateMutation.isPending}
                >
                  Generate Pack
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
