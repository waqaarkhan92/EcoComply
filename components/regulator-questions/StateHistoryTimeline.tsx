'use client';

interface StateTransition {
  id: string;
  from_state: string;
  to_state: string;
  transitioned_at: string;
  transitioned_by: string;
  transition_reason?: string;
}

interface StateHistoryTimelineProps {
  transitions: StateTransition[];
}

export default function StateHistoryTimeline({ transitions }: StateHistoryTimelineProps) {
  if (transitions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">State History</h3>
        <div className="text-center py-8 text-gray-500">No state transitions yet</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">State History</h3>
      <div className="space-y-4">
        {transitions.map((transition, index) => (
          <div key={transition.id} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              {index < transitions.length - 1 && (
                <div className="w-0.5 h-12 bg-gray-200 mt-1"></div>
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {transition.from_state} → {transition.to_state}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(transition.transitioned_at).toLocaleString()}
                  </div>
                  {transition.transition_reason && (
                    <div className="text-sm text-gray-500 mt-1">
                      Reason: {transition.transition_reason}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  By: {transition.transitioned_by}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

