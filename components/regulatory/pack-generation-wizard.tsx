'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Building2,
  FileText,
  Settings,
  Eye,
  Loader2,
} from 'lucide-react';
import type {
  PackType,
  PackConfiguration,
  RuleEvaluation,
  BoardPackDetailLevel,
  IncidentDisclosureLevel,
} from '@/lib/types/regulatory';

interface PackGenerationWizardProps {
  companyId: string;
  onClose: () => void;
  onSuccess?: (packId: string) => void;
}

interface Site {
  id: string;
  name: string;
  address?: string;
}

interface Document {
  id: string;
  file_name: string;
  document_type: string;
}

interface ApiSitesResponse {
  data: Site[];
}

interface ApiDocumentsResponse {
  data: Document[];
}

interface ReadinessEvaluationResult {
  canGenerate: boolean;
  blockingFailures: RuleEvaluation[];
  warnings: RuleEvaluation[];
  passedRules: RuleEvaluation[];
}

interface PackGenerationResponse {
  packId: string;
  status: string;
}

const PACK_TYPE_INFO: Record<PackType, { label: string; icon: string; description: string; requirements: string[] }> = {
  REGULATOR_PACK: {
    label: 'Regulator Pack',
    icon: '🏛️',
    description: 'Inspector-ready compliance pack for EA visits',
    requirements: [
      'All obligations must have current status',
      'Evidence within 12-month lookback',
      'CCS assessment if applicable',
    ],
  },
  INTERNAL_AUDIT_PACK: {
    label: 'Internal Audit Pack',
    icon: '📋',
    description: 'Full evidence compilation for EMS/ISO audits',
    requirements: [
      'Complete obligation coverage',
      'Evidence chain of custody',
      'Management review records',
    ],
  },
  BOARD_PACK: {
    label: 'Board Pack',
    icon: '📊',
    description: 'Multi-site risk summary for board reporting',
    requirements: [
      'Aggregated view by default',
      'Detail requires approval',
      'Owner/Admin access only',
    ],
  },
  TENDER_PACK: {
    label: 'Tender Pack',
    icon: '📁',
    description: 'External assurance pack for tenders',
    requirements: [
      'Active permit/licence copies',
      'Incident data opt-in required',
      'No detailed compliance scores',
    ],
  },
};

const WIZARD_STEPS = [
  { id: 'type', label: 'Pack Type', icon: Package },
  { id: 'scope', label: 'Scope', icon: Building2 },
  { id: 'config', label: 'Configuration', icon: Settings },
  { id: 'review', label: 'Review', icon: Eye },
];

export function PackGenerationWizard({ companyId, onClose, onSuccess }: PackGenerationWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPackType, setSelectedPackType] = useState<PackType | null>(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [configuration, setConfiguration] = useState<PackConfiguration>({});
  const [readinessResult, setReadinessResult] = useState<ReadinessEvaluationResult | null>(null);

  // Fetch sites
  const { data: sitesData } = useQuery<ApiSitesResponse>({
    queryKey: ['sites', companyId],
    queryFn: async () => {
      const response = await apiClient.get(`/sites?filter[company_id]=${companyId}`);
      return response as ApiSitesResponse;
    },
  });

  const sites: Site[] = sitesData?.data || [];

  // Fetch documents when sites are selected
  const { data: documentsData } = useQuery<ApiDocumentsResponse>({
    queryKey: ['documents', selectedSiteIds],
    queryFn: async () => {
      if (selectedSiteIds.length === 0) return { data: [] };
      const siteFilter = selectedSiteIds.map(id => `filter[site_id]=${id}`).join('&');
      const response = await apiClient.get(`/documents?${siteFilter}`);
      return response as ApiDocumentsResponse;
    },
    enabled: selectedSiteIds.length > 0 && selectedPackType !== 'BOARD_PACK',
  });

  const documents: Document[] = documentsData?.data || [];

  // Evaluate readiness mutation
  const evaluateReadinessMutation = useMutation<ReadinessEvaluationResult>({
    mutationFn: async () => {
      const response = await apiClient.post('/regulatory/packs/evaluate-readiness', {
        companyId,
        packType: selectedPackType,
        siteIds: selectedSiteIds,
        documentIds: selectedDocumentIds,
        configuration,
      });
      return response.data as ReadinessEvaluationResult;
    },
    onSuccess: (data: ReadinessEvaluationResult) => {
      setReadinessResult(data);
    },
  });

  // Generate pack mutation
  const generatePackMutation = useMutation<PackGenerationResponse>({
    mutationFn: async () => {
      const response = await apiClient.post('/regulatory/packs', {
        companyId,
        packType: selectedPackType,
        siteIds: selectedSiteIds,
        documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        configuration,
      });
      return response.data as PackGenerationResponse;
    },
    onSuccess: (data: PackGenerationResponse) => {
      queryClient.invalidateQueries({ queryKey: ['packs'] });
      queryClient.invalidateQueries({ queryKey: ['regulatory-packs'] });
      onSuccess?.(data.packId);
      onClose();
    },
  });

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedPackType !== null;
      case 1:
        return selectedSiteIds.length > 0 || selectedPackType === 'BOARD_PACK';
      case 2:
        return true;
      case 3:
        return readinessResult?.canGenerate;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      // Evaluate readiness before showing review
      evaluateReadinessMutation.mutate();
    }
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 3) {
        setReadinessResult(null);
      }
    }
  };

  const handleGenerate = () => {
    generatePackMutation.mutate();
  };

  const toggleSite = (siteId: string) => {
    setSelectedSiteIds(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
    // Clear documents when sites change
    setSelectedDocumentIds([]);
  };

  const toggleDocument = (docId: string) => {
    setSelectedDocumentIds(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const selectAllSites = () => {
    setSelectedSiteIds(sites.map(s => s.id));
  };

  const clearAllSites = () => {
    setSelectedSiteIds([]);
    setSelectedDocumentIds([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-input-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-text-primary">Generate Regulatory Pack</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-input-border">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 ${isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-text-tertiary'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-primary text-white' :
                      isCompleted ? 'bg-success text-white' :
                      'bg-background-tertiary'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-text-tertiary mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Pack Type */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <p className="text-text-secondary mb-6">
                Select the type of regulatory pack you want to generate.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(PACK_TYPE_INFO) as [PackType, typeof PACK_TYPE_INFO[PackType]][]).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedPackType(type)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedPackType === type
                        ? 'border-primary bg-primary/5'
                        : 'border-input-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{info.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-text-primary">{info.label}</div>
                        <div className="text-sm text-text-secondary mt-1">{info.description}</div>
                        <ul className="mt-3 space-y-1">
                          {info.requirements.map((req, idx) => (
                            <li key={idx} className="text-xs text-text-tertiary flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-success" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {selectedPackType === type && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Scope */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Site Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-text-primary">Select Sites</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllSites}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAllSites}>
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {sites.map(site => (
                    <button
                      key={site.id}
                      onClick={() => toggleSite(site.id)}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        selectedSiteIds.includes(site.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-input-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className={`h-4 w-4 ${selectedSiteIds.includes(site.id) ? 'text-primary' : 'text-text-tertiary'}`} />
                        <span className="font-medium text-text-primary">{site.name}</span>
                        {selectedSiteIds.includes(site.id) && (
                          <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </div>
                      {site.address && (
                        <p className="text-xs text-text-tertiary mt-1 ml-6">{site.address}</p>
                      )}
                    </button>
                  ))}
                </div>
                {selectedSiteIds.length > 0 && (
                  <p className="text-sm text-primary mt-2">
                    {selectedSiteIds.length} site{selectedSiteIds.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Document Selection (not for Board Pack) */}
              {selectedPackType !== 'BOARD_PACK' && selectedSiteIds.length > 0 && documents.length > 0 && (
                <div>
                  <h3 className="font-semibold text-text-primary mb-4">
                    Select Documents <span className="font-normal text-text-secondary">(Optional)</span>
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Leave empty to include all documents, or select specific ones.
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {documents.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => toggleDocument(doc.id)}
                        className={`w-full p-3 border rounded-lg text-left transition-all ${
                          selectedDocumentIds.includes(doc.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-input-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className={`h-4 w-4 ${selectedDocumentIds.includes(doc.id) ? 'text-primary' : 'text-text-tertiary'}`} />
                          <span className="font-medium text-text-primary">{doc.file_name}</span>
                          <span className="text-xs text-text-tertiary bg-background-tertiary px-2 py-0.5 rounded">
                            {doc.document_type}
                          </span>
                          {selectedDocumentIds.includes(doc.id) && (
                            <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Board Pack Configuration */}
              {selectedPackType === 'BOARD_PACK' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-text-primary">Board Pack Settings</h3>

                  <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Safeguard: Aggregation Default</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Board packs show aggregated counts only by default. Detailed breakdowns require explicit approval.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Detail Level
                    </label>
                    <select
                      value={configuration.detailLevel || 'AGGREGATED'}
                      onChange={(e) => setConfiguration(prev => ({
                        ...prev,
                        detailLevel: e.target.value as BoardPackDetailLevel
                      }))}
                      className="w-full rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="AGGREGATED">Aggregated (counts only)</option>
                      <option value="SUMMARY">Summary (requires approval)</option>
                      <option value="DETAILED">Detailed (requires approval)</option>
                    </select>
                  </div>

                  {configuration.detailLevel && configuration.detailLevel !== 'AGGREGATED' && (
                    <div className="bg-warning/10 rounded-lg p-4">
                      <p className="text-sm text-warning font-medium">Detail Access Requires Approval</p>
                      <p className="text-sm text-text-secondary mt-1">
                        Access to detailed compliance data beyond aggregated counts must be approved by an authorized person.
                      </p>
                      <div className="mt-3 space-y-3">
                        <Input
                          placeholder="Approved by (name)"
                          value={configuration.detailAccessApprovedBy || ''}
                          onChange={(e) => setConfiguration(prev => ({
                            ...prev,
                            detailAccessApprovedBy: e.target.value
                          }))}
                        />
                        <Input
                          type="date"
                          value={configuration.detailAccessApprovedDate || ''}
                          onChange={(e) => setConfiguration(prev => ({
                            ...prev,
                            detailAccessApprovedDate: e.target.value
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tender Pack Configuration */}
              {selectedPackType === 'TENDER_PACK' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-text-primary">Tender Pack Settings</h3>

                  <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Safeguard: Incident Data Opt-In</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Incident statistics are excluded by default from tender packs. Inclusion requires explicit opt-in with justification.
                      </p>
                    </div>
                  </div>

                  <div className="border border-input-border rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configuration.incidentOptIn?.enabled || false}
                        onChange={(e) => setConfiguration(prev => ({
                          ...prev,
                          incidentOptIn: {
                            ...prev.incidentOptIn,
                            enabled: e.target.checked,
                          }
                        }))}
                        className="w-5 h-5 rounded border-input-border text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-text-primary">Include Incident Statistics</p>
                        <p className="text-sm text-text-secondary">Opt-in to include incident data in this tender pack</p>
                      </div>
                    </label>

                    {configuration.incidentOptIn?.enabled && (
                      <div className="mt-4 pt-4 border-t border-input-border space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-2">
                            Disclosure Level
                          </label>
                          <select
                            value={configuration.incidentOptIn.disclosureLevel || 'AGGREGATE'}
                            onChange={(e) => setConfiguration(prev => ({
                              ...prev,
                              incidentOptIn: {
                                ...prev.incidentOptIn,
                                enabled: true,
                                disclosureLevel: e.target.value as IncidentDisclosureLevel
                              }
                            }))}
                            className="w-full rounded-lg border border-input-border px-4 py-2"
                          >
                            <option value="AGGREGATE">Aggregate counts only</option>
                            <option value="SEVERITY_BREAKDOWN">Severity breakdown</option>
                            <option value="FULL">Full incident details</option>
                          </select>
                        </div>
                        <Input
                          placeholder="Approved by (name)"
                          value={configuration.incidentOptIn.approvedBy || ''}
                          onChange={(e) => setConfiguration(prev => ({
                            ...prev,
                            incidentOptIn: {
                              ...prev.incidentOptIn,
                              enabled: true,
                              approvedBy: e.target.value
                            }
                          }))}
                        />
                        <textarea
                          placeholder="Justification for including incident data..."
                          value={configuration.incidentOptIn.justification || ''}
                          onChange={(e) => setConfiguration(prev => ({
                            ...prev,
                            incidentOptIn: {
                              ...prev.incidentOptIn,
                              enabled: true,
                              justification: e.target.value
                            }
                          }))}
                          className="w-full min-h-[80px] rounded-lg border border-input-border px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Regulator/Audit Pack - No special config */}
              {(selectedPackType === 'REGULATOR_PACK' || selectedPackType === 'INTERNAL_AUDIT_PACK') && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <p className="text-text-primary font-medium">No additional configuration required</p>
                  <p className="text-text-secondary text-sm mt-2">
                    Click Next to review the readiness check results.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {evaluateReadinessMutation.isPending ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-text-secondary">Evaluating pack readiness...</p>
                </div>
              ) : readinessResult ? (
                <>
                  {/* Summary */}
                  <div className={`p-4 rounded-lg ${
                    readinessResult.canGenerate
                      ? 'bg-success/10 border border-success'
                      : 'bg-danger/10 border border-danger'
                  }`}>
                    <div className="flex items-center gap-3">
                      {readinessResult.canGenerate ? (
                        <CheckCircle className="h-6 w-6 text-success" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-danger" />
                      )}
                      <div>
                        <p className={`font-semibold ${readinessResult.canGenerate ? 'text-success' : 'text-danger'}`}>
                          {readinessResult.canGenerate
                            ? 'Pack Ready to Generate'
                            : 'Pack Cannot Be Generated'}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {readinessResult.passedRules.length} rules passed,{' '}
                          {readinessResult.warnings.length} warnings,{' '}
                          {readinessResult.blockingFailures.length} blocking failures
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Blocking Failures */}
                  {readinessResult.blockingFailures.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-danger mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Blocking Failures ({readinessResult.blockingFailures.length})
                      </h3>
                      <div className="space-y-2">
                        {readinessResult.blockingFailures.map((rule, idx) => (
                          <div key={idx} className="bg-danger/5 border border-danger/20 rounded-lg p-3">
                            <p className="font-medium text-danger">{rule.ruleId}: {rule.description}</p>
                            {rule.details && (
                              <p className="text-sm text-text-secondary mt-1">{rule.details}</p>
                            )}
                            {rule.recommendation && (
                              <p className="text-sm text-text-primary mt-2 bg-white/50 rounded p-2">
                                <strong>Recommendation:</strong> {rule.recommendation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {readinessResult.warnings.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-warning mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Warnings ({readinessResult.warnings.length})
                      </h3>
                      <div className="space-y-2">
                        {readinessResult.warnings.map((rule, idx) => (
                          <div key={idx} className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                            <p className="font-medium text-warning">{rule.ruleId}: {rule.description}</p>
                            {rule.details && (
                              <p className="text-sm text-text-secondary mt-1">{rule.details}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Passed Rules */}
                  {readinessResult.passedRules.length > 0 && (
                    <details className="group">
                      <summary className="font-semibold text-success mb-3 flex items-center gap-2 cursor-pointer">
                        <CheckCircle className="h-5 w-5" />
                        Passed Rules ({readinessResult.passedRules.length})
                        <ChevronRight className="h-4 w-4 group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="space-y-2 mt-3">
                        {readinessResult.passedRules.map((rule, idx) => (
                          <div key={idx} className="bg-success/5 border border-success/20 rounded-lg p-3">
                            <p className="font-medium text-success">{rule.ruleId}: {rule.description}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-8 w-8 text-danger mx-auto mb-4" />
                  <p className="text-text-secondary">Failed to evaluate readiness. Please try again.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-input-border flex items-center justify-between">
          <Button
            variant="ghost"
            size="md"
            onClick={handleBack}
            disabled={currentStep === 0}
            icon={<ChevronLeft className="h-4 w-4" />}
            iconPosition="left"
          >
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            {currentStep < WIZARD_STEPS.length - 1 ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                disabled={!canProceed() || evaluateReadinessMutation.isPending}
                icon={<ChevronRight className="h-4 w-4" />}
                iconPosition="right"
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleGenerate}
                disabled={!canProceed() || generatePackMutation.isPending}
                loading={generatePackMutation.isPending}
                icon={<Package className="h-4 w-4" />}
                iconPosition="left"
              >
                Generate Pack
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
