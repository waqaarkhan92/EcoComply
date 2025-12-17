'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { AlertTriangle, X } from 'lucide-react';

interface ManualOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'obligation' | 'evidence' | 'deadline' | 'compliance_status' | 'schedule';
  entityId: string;
  currentValue: any;
  onOverride: (override: OverrideData) => void;
}

interface OverrideData {
  reason: string;
  newValue: any;
  previousValue: any;
}

export default function ManualOverrideModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  currentValue,
  onOverride,
}: ManualOverrideModalProps) {
  const [overrideReason, setOverrideReason] = useState('');
  const [newValue, setNewValue] = useState(currentValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minReasonLength = 10;
  const maxReasonLength = 500;
  const canSubmit = overrideReason.length >= minReasonLength && overrideReason.length <= maxReasonLength;

  const handleSubmit = () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    onOverride({
      reason: overrideReason,
      newValue: newValue,
      previousValue: currentValue,
    });
    
    // Reset form
    setOverrideReason('');
    setNewValue(currentValue);
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    setOverrideReason('');
    setNewValue(currentValue);
    onClose();
  };

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'obligation':
        return 'Obligation';
      case 'evidence':
        return 'Evidence';
      case 'deadline':
        return 'Deadline';
      case 'compliance_status':
        return 'Compliance Status';
      case 'schedule':
        return 'Schedule';
      default:
        return 'Entity';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Manual Override</h2>
            <p className="text-sm text-gray-600 mt-1">{getEntityTypeLabel()} Override</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Override Context */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Current System-Determined Value</div>
          <div className="text-sm text-gray-900">
            {typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue)}
          </div>
        </div>

        {/* Override Form (Context-Dependent) */}
        <div className="mb-6">
          {entityType === 'obligation' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Obligation Text
                </label>
                <Textarea
                  value={newValue.title || ''}
                  onChange={(e) => setNewValue({ ...newValue, title: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Input
                  value={newValue.category || ''}
                  onChange={(e) => setNewValue({ ...newValue, category: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency
                </label>
                <Input
                  value={newValue.frequency || ''}
                  onChange={(e) => setNewValue({ ...newValue, frequency: e.target.value })}
                />
              </div>
            </div>
          )}

          {entityType === 'deadline' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Deadline Date
              </label>
              <Input
                type="date"
                value={newValue ? new Date(newValue).toISOString().split('T')[0] : ''}
                onChange={(e) => setNewValue(new Date(e.target.value).toISOString())}
              />
            </div>
          )}

          {entityType === 'compliance_status' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Compliance Status
              </label>
              <select
                value={newValue || ''}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="COMPLETE">Complete</option>
                <option value="NOT_APPLICABLE">Not Applicable</option>
                <option value="IN_PROGRESS">In Progress</option>
              </select>
            </div>
          )}
        </div>

        {/* Override Reason (Required) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Override <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="e.g., Document interpretation requires manual adjustment"
            rows={4}
            minLength={minReasonLength}
            maxLength={maxReasonLength}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={`${overrideReason.length < minReasonLength ? 'text-red-500' : 'text-gray-500'}`}>
              {overrideReason.length} / {maxReasonLength} characters
              {overrideReason.length < minReasonLength && ` (minimum ${minReasonLength} required)`}
            </span>
          </div>
        </div>

        {/* Audit Trail Notice */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-900 mb-1">
                Audit Trail Notice
              </div>
              <div className="text-sm text-amber-800">
                This override will be logged in the audit trail with your name and timestamp.
              </div>
              <div className="text-xs text-amber-700 mt-2">
                Preview: Audit entry: {getEntityTypeLabel()} Override by [Your Name] at {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Applying Override...' : 'Confirm Override'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

