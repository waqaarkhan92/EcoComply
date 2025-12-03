/**
 * Contextual Help API Endpoint
 * Returns help article content
 * Reference: docs/specs/63_Frontend_Onboarding_Flow.md Section 16
 */

import { NextRequest, NextResponse } from 'next/server';

// Help articles database (in production, this would be in a database)
const HELP_ARTICLES: Record<string, { id: string; title: string; content: string; relatedArticles?: string[] }> = {
  'upload-document': {
    id: 'upload-document',
    title: 'Uploading Documents',
    content: 'Upload PDF documents to extract compliance obligations. The system will automatically extract obligations using AI. You can review and edit extracted obligations after upload.',
    relatedArticles: ['extraction-review', 'evidence-capture'],
  },
  'extraction-review': {
    id: 'extraction-review',
    title: 'Reviewing Extractions',
    content: 'Review extracted obligations for accuracy. Edit any fields that need correction, mark irrelevant obligations as N/A, and confirm when ready.',
    relatedArticles: ['upload-document', 'evidence-capture'],
  },
  'evidence-capture': {
    id: 'evidence-capture',
    title: 'Capturing Evidence',
    content: 'Link evidence to obligations to demonstrate compliance. Upload files, photos, or link to existing documents. Evidence helps prove you\'ve met your compliance requirements.',
    relatedArticles: ['upload-document', 'obligation-completion'],
  },
  'obligation-completion': {
    id: 'obligation-completion',
    title: 'Completing Obligations',
    content: 'Mark obligations as complete when you\'ve fulfilled the requirement. Provide evidence and notes to document your compliance.',
    relatedArticles: ['evidence-capture'],
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { articleId: string } }
) {
  try {
    const articleId = params.articleId;

    const article = HELP_ARTICLES[articleId];
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error('Error fetching help article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch help article', details: (error as Error).message },
      { status: 500 }
    );
  }
}

