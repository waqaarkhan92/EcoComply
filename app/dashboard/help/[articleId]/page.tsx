'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const articles: Record<string, { title: string; content: string }> = {
  '1': {
    title: 'Welcome to Oblicore',
    content: 'Welcome to Oblicore! This guide will help you get started with managing your environmental compliance.',
  },
  '2': {
    title: 'Creating Your First Site',
    content: 'To create your first site, navigate to the Sites page and click "Create Site". Fill in the required information including site name, address, and regulator.',
  },
  // Add more articles as needed
};

export default function HelpArticlePage({ params }: { params: { articleId: string } }) {
  const article = articles[params.articleId] || {
    title: 'Article Not Found',
    content: 'The requested article could not be found.',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/help">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{article.title}</h1>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="prose max-w-none">
          <p className="text-gray-900">{article.content}</p>
        </div>
      </div>
    </div>
  );
}

