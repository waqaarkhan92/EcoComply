'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewRegulatorQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [questionType, setQuestionType] = useState('OBLIGATION_CLARIFICATION');
  const [questionText, setQuestionText] = useState('');
  const [responseDeadline, setResponseDeadline] = useState('');

  const createQuestion = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/regulator-questions', data);
    },
    onSuccess: (response: any) => {
      const questionId = response.data?.id;
      if (questionId) {
        router.push(`/dashboard/sites/${siteId}/regulator-questions/${questionId}`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createQuestion.mutate({
      site_id: siteId,
      question_type: questionType,
      question_text: questionText,
      response_deadline: responseDeadline,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/sites/${siteId}/regulator-questions`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Regulator Question</h1>
          <p className="text-gray-600 mt-1">Create a new regulator question</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="question_type">Question Type</Label>
          <select
            id="question_type"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="OBLIGATION_CLARIFICATION">Obligation Clarification</option>
            <option value="EVIDENCE_REQUEST">Evidence Request</option>
            <option value="COMPLIANCE_QUERY">Compliance Query</option>
            <option value="URGENT">Urgent</option>
            <option value="INFORMAL">Informal</option>
          </select>
        </div>

        <div>
          <Label htmlFor="question_text">Question Text</Label>
          <textarea
            id="question_text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={6}
            required
          />
        </div>

        <div>
          <Label htmlFor="response_deadline">Response Deadline</Label>
          <Input
            id="response_deadline"
            type="date"
            value={responseDeadline}
            onChange={(e) => setResponseDeadline(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/sites/${siteId}/regulator-questions`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createQuestion.isPending}>
            {createQuestion.isPending ? 'Creating...' : 'Create Question'}
          </Button>
        </div>
      </form>
    </div>
  );
}

