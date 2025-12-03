'use client';

/**
 * Chain of Custody Visualization Component
 * Displays waste stream journey from generation to final disposal
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Package, Truck, MapPin, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ChainNode {
  id: string;
  type: 'GENERATION' | 'CARRIER' | 'DESTINATION';
  name: string;
  date: string;
  status: 'VERIFIED' | 'PENDING' | 'BROKEN';
  details: string;
  licence_number?: string;
  quantity?: string;
}

interface ChainOfCustody {
  waste_stream_id: string;
  ewc_code: string;
  waste_description: string;
  consignment_note_number: string;
  chain: ChainNode[];
  is_complete: boolean;
  has_breaks: boolean;
  validation_status: string;
}

interface ChainOfCustodyVisualizationProps {
  wasteStreamId: string;
  consignmentNoteId?: string;
}

export function ChainOfCustodyVisualization({
  wasteStreamId,
  consignmentNoteId
}: ChainOfCustodyVisualizationProps) {
  const { data, isLoading } = useQuery<{ data: ChainOfCustody }>({
    queryKey: ['chain-of-custody', wasteStreamId, consignmentNoteId],
    queryFn: async () => {
      const endpoint = consignmentNoteId
        ? '/module-4/consignment-notes/' + consignmentNoteId + '/chain'
        : '/module-4/waste-streams/' + wasteStreamId + '/chain';
      return apiClient.get(endpoint);
    },
  });

  const chain = data?.data;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-500">Loading chain of custody...</div>
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-500">No chain of custody data</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Chain of Custody</h2>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="font-medium">EWC Code:</span> {chain.ewc_code}
          </div>
          <div>
            <span className="font-medium">Note:</span> {chain.consignment_note_number}
          </div>
          <div>
            <ChainStatusBadge
              isComplete={chain.is_complete}
              hasBreaks={chain.has_breaks}
              validationStatus={chain.validation_status}
            />
          </div>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {chain.waste_description}
        </div>
      </div>

      {chain.has_breaks && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <div className="font-medium text-red-900">Chain Break Detected</div>
              <div className="text-sm text-red-700 mt-1">
                The chain of custody has missing or invalid links. This requires immediate attention.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {chain.chain.map((node, index) => (
          <div key={node.id}>
            <ChainNode node={node} isLast={index === chain.chain.length - 1} />
            {index < chain.chain.length - 1 && <ChainConnector isValid={node.status === 'VERIFIED'} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChainNode({ node, isLast }: { node: ChainNode; isLast: boolean }) {
  const getIcon = () => {
    switch (node.type) {
      case 'GENERATION':
        return <Package className="h-6 w-6" />;
      case 'CARRIER':
        return <Truck className="h-6 w-6" />;
      case 'DESTINATION':
        return <MapPin className="h-6 w-6" />;
    }
  };

  const getStatusIcon = () => {
    switch (node.status) {
      case 'VERIFIED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'PENDING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'BROKEN':
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getColorClasses = () => {
    switch (node.status) {
      case 'VERIFIED':
        return 'bg-green-50 border-green-200';
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200';
      case 'BROKEN':
        return 'bg-red-50 border-red-200';
    }
  };

  const getTextColorClass = () => {
    switch (node.status) {
      case 'VERIFIED':
        return 'text-green-700';
      case 'PENDING':
        return 'text-yellow-700';
      case 'BROKEN':
        return 'text-red-700';
    }
  };

  return (
    <div className={'border rounded-lg p-4 ' + getColorClasses()}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={'mt-1 ' + getTextColorClass()}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">{node.name}</span>
              {getStatusIcon()}
            </div>
            <div className="text-sm text-gray-600 mb-2">{node.details}</div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{new Date(node.date).toLocaleString()}</span>
              {node.licence_number && (
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">
                  Licence: {node.licence_number}
                </span>
              )}
              {node.quantity && (
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">
                  {node.quantity}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChainConnector({ isValid }: { isValid: boolean }) {
  return (
    <div className="flex justify-center py-2">
      <div className={'w-0.5 h-8 ' + (isValid ? 'bg-green-300' : 'bg-red-300')} />
    </div>
  );
}

function ChainStatusBadge({
  isComplete,
  hasBreaks,
  validationStatus
}: {
  isComplete: boolean;
  hasBreaks: boolean;
  validationStatus: string;
}) {
  if (hasBreaks) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 border border-red-200">
        Chain Broken
      </span>
    );
  }

  if (!isComplete) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 border border-yellow-200">
        In Progress
      </span>
    );
  }

  if (validationStatus === 'VALIDATED') {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 border border-green-200">
        Complete & Verified
      </span>
    );
  }

  return (
    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 border border-gray-200">
      {validationStatus}
    </span>
  );
}
