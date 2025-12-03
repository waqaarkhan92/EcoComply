'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Download, Share2, Trash2, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

interface AuditPack {
  id: string;
  pack_type: string;
  status: string;
  date_range_start: string;
  date_range_end: string;
  recipient_name: string;
  file_url: string | null;
  file_size: number | null;
  page_count: number | null;
  generated_by: string;
  created_at: string;
  obligation_count: number;
  evidence_count: number;
}

interface AuditPacksResponse {
  data: AuditPack[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function AuditPacksPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Redirect to packs page with filter (legacy route behavior)
  useEffect(() => {
    router.replace(`/dashboard/sites/${siteId}/packs?pack_type=AUDIT_PACK`);
  }, [siteId, router]);

  // Fallback content while redirecting
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-gray-500">Redirecting to packs...</p>
      </div>
    </div>
  );
}

