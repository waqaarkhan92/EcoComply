'use client';

interface ResponseDeadlineCountdownProps {
  deadline: string;
  questionType: string;
}

export default function ResponseDeadlineCountdown({ deadline, questionType }: ResponseDeadlineCountdownProps) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;
  const isApproaching = daysRemaining >= 0 && daysRemaining <= 7;

  const getStatusColor = () => {
    if (isOverdue) return 'bg-red-500';
    if (isApproaching) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (isOverdue) return 'Overdue';
    if (isApproaching) return 'Approaching';
    return 'On Time';
  };

  const getDefaultDeadline = (type: string) => {
    switch (type) {
      case 'URGENT':
        return 7;
      case 'INFORMAL':
        return 60;
      default:
        return 28;
    }
  };

  const defaultDays = getDefaultDeadline(questionType);
  const progress = isOverdue ? 100 : Math.max(0, ((defaultDays - daysRemaining) / defaultDays) * 100);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Response Deadline</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Deadline</span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor()} text-white`}>
              {getStatusText()}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {deadlineDate.toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {isOverdue 
              ? `${Math.abs(daysRemaining)} days overdue`
              : `${daysRemaining} days remaining`
            }
          </div>
        </div>

        <div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full ${getStatusColor()}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            Default deadline: {defaultDays} days ({questionType})
          </div>
        </div>
      </div>
    </div>
  );
}

