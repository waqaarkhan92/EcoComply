'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Square, Circle, Diamond, ArrowRight } from 'lucide-react';

interface TriggerNode {
  id: string;
  type: 'start' | 'condition' | 'action' | 'end';
  label: string;
  config?: any;
  position?: { x: number; y: number };
}

interface VisualTriggerBuilderProps {
  triggerDefinition: any;
  onUpdate: (newDefinition: any) => void;
  readOnly?: boolean;
}

export default function VisualTriggerBuilder({
  triggerDefinition,
  onUpdate,
  readOnly = false,
}: VisualTriggerBuilderProps) {
  const [nodes, setNodes] = useState<TriggerNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'form'>('form');

  // For now, provide a form-based editor with visual preview
  // Full drag-and-drop canvas can be added later with React Flow or similar

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'form' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('form')}
          >
            Form Editor
          </Button>
          <Button
            variant={viewMode === 'visual' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('visual')}
          >
            Visual Builder
          </Button>
        </div>
      </div>

      {viewMode === 'form' ? (
        <FormBasedEditor
          triggerDefinition={triggerDefinition}
          onUpdate={onUpdate}
        />
      ) : (
        <VisualCanvas
          triggerDefinition={triggerDefinition}
          onUpdate={onUpdate}
          readOnly={readOnly}
        />
      )}

      {/* Schedule Preview */}
      <SchedulePreviewTimeline schedule={triggerDefinition} />
    </div>
  );
}

// Form-Based Editor (Enhanced existing form)
function FormBasedEditor({ triggerDefinition, onUpdate }: { triggerDefinition: any; onUpdate: (def: any) => void }) {
  const [ruleType, setRuleType] = useState(triggerDefinition?.rule_type || 'DYNAMIC_OFFSET');
  const [ruleConfig, setRuleConfig] = useState(JSON.stringify(triggerDefinition?.rule_config || {}, null, 2));
  const [triggerExpression, setTriggerExpression] = useState(triggerDefinition?.trigger_expression || '');

  const handleUpdate = () => {
    try {
      const config = JSON.parse(ruleConfig);
      onUpdate({
        rule_type: ruleType,
        rule_config: config,
        trigger_expression: triggerExpression || undefined,
      });
    } catch (e) {
      alert('Invalid JSON in rule config');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <Label>Rule Type</Label>
        <select
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="DYNAMIC_OFFSET">Dynamic Offset</option>
          <option value="EVENT_BASED">Event Based</option>
          <option value="CONDITIONAL">Conditional</option>
          <option value="FIXED">Fixed</option>
        </select>
      </div>

      <div>
        <Label>Rule Configuration (JSON)</Label>
        <textarea
          value={ruleConfig}
          onChange={(e) => setRuleConfig(e.target.value)}
          rows={8}
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
      </div>

      {ruleType === 'CONDITIONAL' && (
        <div>
          <Label>Trigger Expression</Label>
          <Input
            value={triggerExpression}
            onChange={(e) => setTriggerExpression(e.target.value)}
            placeholder="e.g., obligation.status == 'COMPLETE'"
            className="mt-1"
          />
        </div>
      )}

      <Button onClick={handleUpdate}>Update Trigger</Button>
    </div>
  );
}

// Visual Canvas (Simplified - can be enhanced with React Flow)
function VisualCanvas({ triggerDefinition, onUpdate, readOnly }: { triggerDefinition: any; onUpdate: (def: any) => void; readOnly?: boolean }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center py-12 text-gray-500">
        <p className="mb-4">Visual Builder (Coming Soon)</p>
        <p className="text-sm">
          Full drag-and-drop visual builder will be available in a future update.
          For now, please use the Form Editor.
        </p>
      </div>
      
      {/* Simple visual representation */}
      <div className="flex items-center justify-center gap-4 py-8">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white">
            <Play className="h-8 w-8" />
          </div>
          <div className="mt-2 text-sm font-medium">START</div>
        </div>
        <ArrowRight className="h-8 w-8 text-gray-400" />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-500 flex items-center justify-center text-white rounded">
            <Diamond className="h-8 w-8" />
          </div>
          <div className="mt-2 text-sm font-medium">CONDITION</div>
        </div>
        <ArrowRight className="h-8 w-8 text-gray-400" />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-purple-500 flex items-center justify-center text-white rounded">
            <Square className="h-8 w-8" />
          </div>
          <div className="mt-2 text-sm font-medium">ACTION</div>
        </div>
        <ArrowRight className="h-8 w-8 text-gray-400" />
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white">
            <Square className="h-8 w-8" />
          </div>
          <div className="mt-2 text-sm font-medium">END</div>
        </div>
      </div>
    </div>
  );
}

// Schedule Preview Timeline
function SchedulePreviewTimeline({ schedule }: { schedule: any }) {
  const [previewDeadlines, setPreviewDeadlines] = useState<any[]>([]);

  // Calculate preview deadlines based on schedule config
  // This is a simplified version - full implementation would calculate based on rule_config

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Schedule Preview</h3>
      {previewDeadlines.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Configure trigger to see schedule preview</p>
        </div>
      ) : (
        <div className="space-y-2">
          {previewDeadlines.map((deadline, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{new Date(deadline.date).toLocaleDateString()}</div>
                <div className="text-sm text-gray-600">{deadline.description}</div>
              </div>
              <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Upcoming</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

