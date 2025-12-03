'use client';

import { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Send, MessageSquare } from 'lucide-react';

type RegulatorQuestionState = 
  | 'OPEN' 
  | 'RESPONSE_SUBMITTED' 
  | 'RESPONSE_ACKNOWLEDGED' 
  | 'FOLLOW_UP_REQUIRED' 
  | 'CLOSED' 
  | 'RESPONSE_OVERDUE';

interface StateMachineDiagramProps {
  currentState: RegulatorQuestionState;
  availableTransitions: RegulatorQuestionState[];
  onTransition?: (newState: RegulatorQuestionState) => void;
  readOnly?: boolean;
}

const stateConfig: Record<RegulatorQuestionState, { 
  label: string; 
  color: string; 
  icon: any;
  description: string;
}> = {
  OPEN: {
    label: 'Open',
    color: 'bg-blue-500',
    icon: MessageSquare,
    description: 'Question raised, awaiting response',
  },
  RESPONSE_SUBMITTED: {
    label: 'Response Submitted',
    color: 'bg-amber-500',
    icon: Send,
    description: 'Response submitted, awaiting acknowledgment',
  },
  RESPONSE_ACKNOWLEDGED: {
    label: 'Acknowledged',
    color: 'bg-green-500',
    icon: CheckCircle,
    description: 'Regulator acknowledged response',
  },
  FOLLOW_UP_REQUIRED: {
    label: 'Follow-Up Required',
    color: 'bg-orange-500',
    icon: AlertCircle,
    description: 'Regulator requires additional information',
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-gray-500',
    icon: XCircle,
    description: 'Question resolved, no further action needed',
  },
  RESPONSE_OVERDUE: {
    label: 'Overdue',
    color: 'bg-red-500',
    icon: Clock,
    description: 'Response deadline passed, escalation triggered',
  },
};

const validTransitions: Record<RegulatorQuestionState, RegulatorQuestionState[]> = {
  OPEN: ['RESPONSE_SUBMITTED', 'RESPONSE_OVERDUE'],
  RESPONSE_SUBMITTED: ['RESPONSE_ACKNOWLEDGED', 'FOLLOW_UP_REQUIRED'],
  RESPONSE_ACKNOWLEDGED: ['FOLLOW_UP_REQUIRED', 'CLOSED'],
  FOLLOW_UP_REQUIRED: ['CLOSED'],
  CLOSED: [],
  RESPONSE_OVERDUE: ['RESPONSE_SUBMITTED'],
};

export default function StateMachineDiagram({
  currentState,
  availableTransitions,
  onTransition,
  readOnly = false,
}: StateMachineDiagramProps) {
  const [hoveredState, setHoveredState] = useState<RegulatorQuestionState | null>(null);

  const currentConfig = stateConfig[currentState];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">State Machine</h3>
      
      {/* Current State Display */}
      <div className="mb-6 p-4 border-2 border-primary rounded-lg bg-primary/5">
        <div className="flex items-center gap-3">
          <div className={`${currentConfig.color} text-white rounded-full p-3`}>
            <CurrentIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg">{currentConfig.label}</div>
            <div className="text-sm text-gray-600">{currentConfig.description}</div>
          </div>
        </div>
      </div>

      {/* State Diagram */}
      <div className="relative" style={{ minHeight: '400px' }}>
        {/* State Nodes */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(stateConfig).map(([state, config]) => {
            const Icon = config.icon;
            const isCurrent = state === currentState;
            const isAvailable = availableTransitions.includes(state as RegulatorQuestionState);
            const canTransition = validTransitions[currentState]?.includes(state as RegulatorQuestionState);

            return (
              <div
                key={state}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : isAvailable && canTransition && !readOnly
                    ? 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-primary/5 cursor-pointer'
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
                onMouseEnter={() => setHoveredState(state as RegulatorQuestionState)}
                onMouseLeave={() => setHoveredState(null)}
                onClick={() => {
                  if (!readOnly && isAvailable && canTransition && onTransition) {
                    onTransition(state as RegulatorQuestionState);
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${config.color} text-white rounded-full p-2`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="font-medium text-sm">{config.label}</div>
                </div>
                {hoveredState === state && (
                  <div className="text-xs text-gray-600 mt-1">{config.description}</div>
                )}
                {isCurrent && (
                  <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Transition Arrows (simplified visual representation) */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Click on an available state to transition
        </div>
      </div>

      {/* Available Transitions */}
      {availableTransitions.length > 0 && !readOnly && (
        <div className="mt-6 pt-6 border-t">
          <div className="text-sm font-medium mb-2">Available Transitions:</div>
          <div className="flex flex-wrap gap-2">
            {availableTransitions.map((state) => {
              const config = stateConfig[state];
              return (
                <button
                  key={state}
                  onClick={() => onTransition?.(state)}
                  className="px-3 py-1 text-sm rounded border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  → {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

