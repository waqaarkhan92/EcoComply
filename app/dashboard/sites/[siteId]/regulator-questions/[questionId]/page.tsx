'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface RegulatorQuestion {
  id: string;
  question_type: string;
  question_text: string;
  response_deadline: string;
  status: string;
  response_text: string | null;
  response_submitted_date: string | null;
  created_at: string;
}

export default function RegulatorQuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const questionId = params.questionId as string;

  const [responseText, setResponseText] = useState('');

  const { data: questionData, isLoading } = useQuery<{ data: RegulatorQuestion }>({
    queryKey: ['regulator-question', questionId],
    queryFn: async () => {
      return apiClient.get<{ data: RegulatorQuestion }>(`/regulator-questions/${questionId}`);
    },
  });

  const submitResponse = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/regulator-questions/${questionId}`, data);
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading question...</div>
      </div>
    );
  }

  if (!questionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Question not found</div>
      </div>
    );
  }

  const question = questionData.data;
  const canRespond = question.status === 'OPEN' || question.status === 'RESPONSE_OVERDUE';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/regulator-questions`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Regulator Question</h1>
            <p className="text-gray-600 mt-1">{question.question_type}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-500">Question</label>
          <div className="mt-1 text-sm text-gray-900">{question.question_text}</div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Response Deadline</label>
            <div className="mt-1 text-sm text-gray-900">
              {new Date(question.response_deadline).toLocaleDateString()}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                question.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                question.status === 'RESPONSE_OVERDUE' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {question.status}
              </span>
            </div>
          </div>
        </div>

        {question.response_text && (
          <div>
            <label className="text-sm font-medium text-gray-500">Response</label>
            <div className="mt-1 text-sm text-gray-900">{question.response_text}</div>
            {question.response_submitted_date && (
              <div className="mt-2 text-xs text-gray-500">
                Submitted: {new Date(question.response_submitted_date).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {canRespond && (
          <div className="pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Response</label>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm"
              rows={6}
              placeholder="Enter your response to the regulator question..."
            />
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => submitResponse.mutate({ response_text: responseText, status: 'RESPONSE_SUBMITTED' })}
                disabled={submitResponse.isPending || !responseText.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                {submitResponse.isPending ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

