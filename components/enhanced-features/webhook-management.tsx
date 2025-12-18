'use client';

/**
 * Webhook Management Component
 * Configure and manage outbound webhooks
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Webhook,
  Plus,
  Trash2,
  Edit,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useWebhookDeliveries,
  Webhook as WebhookType,
  WebhookDelivery,
} from '@/lib/hooks/use-enhanced-features';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

const webhookEvents = [
  { value: 'obligation.created', label: 'Obligation Created' },
  { value: 'obligation.completed', label: 'Obligation Completed' },
  { value: 'obligation.overdue', label: 'Obligation Overdue' },
  { value: 'deadline.approaching', label: 'Deadline Approaching' },
  { value: 'deadline.missed', label: 'Deadline Missed' },
  { value: 'evidence.uploaded', label: 'Evidence Uploaded' },
  { value: 'evidence.linked', label: 'Evidence Linked' },
  { value: 'pack.generated', label: 'Pack Generated' },
  { value: 'risk_score.changed', label: 'Risk Score Changed' },
];

export function WebhookManagement() {
  const { data: webhooks, isLoading } = useWebhooks();
  const createMutation = useCreateWebhook();
  const deleteMutation = useDeleteWebhook();
  const testMutation = useTestWebhook();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { dialogState, confirmAction, closeDialog, ConfirmDialogComponent } = useConfirmDialog();

  const handleCreate = async (data: Partial<WebhookType>) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const handleDelete = async (id: string) => {
    confirmAction(
      'Delete webhook?',
      'Are you sure you want to delete this webhook? This action cannot be undone.',
      async () => {
        try {
          await deleteMutation.mutateAsync(id);
        } catch (error) {
          console.error('Failed to delete webhook:', error);
        }
      },
      'danger'
    );
  };

  const handleTest = async (id: string) => {
    try {
      await testMutation.mutateAsync(id);
      toast.success('Test webhook sent successfully!');
    } catch (error) {
      console.error('Failed to test webhook:', error);
      toast.error('Failed to send test webhook');
    }
  };

  if (isLoading) {
    return <WebhookManagementSkeleton />;
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Webhooks</h3>
            <p className="text-sm text-gray-500 mt-1">
              Send real-time notifications to external systems
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {!webhooks || webhooks.length === 0 ? (
          <div className="p-8 text-center">
            <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No webhooks configured</p>
            <Button variant="outline" className="mt-3" onClick={() => setShowCreateModal(true)}>
              Create your first webhook
            </Button>
          </div>
        ) : (
          webhooks.map((webhook) => (
            <WebhookItem
              key={webhook.id}
              webhook={webhook}
              isExpanded={expandedId === webhook.id}
              onToggle={() => setExpandedId(expandedId === webhook.id ? null : webhook.id)}
              onTest={() => handleTest(webhook.id)}
              onDelete={() => handleDelete(webhook.id)}
              isTesting={testMutation.isPending}
            />
          ))
        )}
      </div>

      <CreateWebhookModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isCreating={createMutation.isPending}
      />
      {ConfirmDialogComponent}
    </div>
  );
}

interface WebhookItemProps {
  webhook: WebhookType;
  isExpanded: boolean;
  onToggle: () => void;
  onTest: () => void;
  onDelete: () => void;
  isTesting: boolean;
}

function WebhookItem({ webhook, isExpanded, onToggle, onTest, onDelete, isTesting }: WebhookItemProps) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${webhook.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Webhook className={`w-5 h-5 ${webhook.is_active ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{webhook.name}</span>
                <Badge variant={webhook.is_active ? 'success' : 'default'}>
                  {webhook.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 truncate max-w-md">{webhook.url}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onTest} disabled={isTesting}>
              <Play className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {webhook.events.slice(0, 3).map((event) => (
            <Badge key={event} variant="info" className="text-xs">
              {event}
            </Badge>
          ))}
          {webhook.events.length > 3 && (
            <Badge variant="default" className="text-xs">
              +{webhook.events.length - 3} more
            </Badge>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4">
          <WebhookDeliveryHistory webhookId={webhook.id} />
        </div>
      )}
    </div>
  );
}

function WebhookDeliveryHistory({ webhookId }: { webhookId: string }) {
  const { data: deliveries, isLoading } = useWebhookDeliveries(webhookId);

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
        No deliveries yet
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-100 text-sm font-medium text-gray-700">
        Recent Deliveries
      </div>
      <div className="divide-y divide-gray-100">
        {deliveries.slice(0, 5).map((delivery) => (
          <DeliveryItem key={delivery.id} delivery={delivery} />
        ))}
      </div>
    </div>
  );
}

function DeliveryItem({ delivery }: { delivery: WebhookDelivery }) {
  const isSuccess = delivery.response_status && delivery.response_status >= 200 && delivery.response_status < 300;
  const isFailed = delivery.failed_at !== null;

  return (
    <div className="px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : isFailed ? (
          <XCircle className="w-4 h-4 text-red-600" />
        ) : (
          <Clock className="w-4 h-4 text-yellow-600" />
        )}
        <div>
          <span className="text-sm font-medium text-gray-900">{delivery.event_type}</span>
          {delivery.response_status && (
            <span className="text-xs text-gray-500 ml-2">
              Status: {delivery.response_status}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-400">
        {format(new Date(delivery.created_at), 'MMM d, HH:mm')}
      </span>
    </div>
  );
}

interface CreateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Partial<WebhookType>) => void;
  isCreating: boolean;
}

function CreateWebhookModal({ isOpen, onClose, onCreate, isCreating }: CreateWebhookModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  const toggleEvent = (event: string) => {
    setFormData({
      ...formData,
      events: formData.events.includes(event)
        ? formData.events.filter((e) => e !== event)
        : [...formData.events, event],
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Webhook">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Webhook"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <Input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com/webhook"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
          <div className="grid grid-cols-2 gap-2">
            {webhookEvents.map((event) => (
              <label
                key={event.value}
                className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                  formData.events.includes(event.value)
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.events.includes(event.value)}
                  onChange={() => toggleEvent(event.value)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{event.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isCreating}
            disabled={!formData.name || !formData.url || formData.events.length === 0}
          >
            Create Webhook
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function WebhookManagementSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WebhookManagement;
