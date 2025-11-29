'use client';

import { BookOpen, MessageCircle, Video, FileText } from 'lucide-react';
import Link from 'next/link';

const helpCategories = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics of using Oblicore',
    icon: BookOpen,
    articles: [
      { id: '1', title: 'Welcome to Oblicore' },
      { id: '2', title: 'Creating Your First Site' },
      { id: '3', title: 'Uploading Documents' },
    ],
  },
  {
    id: 'documents',
    name: 'Documents & Extraction',
    description: 'Working with documents and AI extraction',
    icon: FileText,
    articles: [
      { id: '4', title: 'Uploading Documents' },
      { id: '5', title: 'Understanding Extraction Results' },
      { id: '6', title: 'Reviewing Obligations' },
    ],
  },
  {
    id: 'obligations',
    name: 'Obligations & Deadlines',
    description: 'Managing obligations and compliance deadlines',
    icon: MessageCircle,
    articles: [
      { id: '7', title: 'Creating Schedules' },
      { id: '8', title: 'Managing Deadlines' },
      { id: '9', title: 'Evidence Linking' },
    ],
  },
  {
    id: 'packs',
    name: 'Packs & Reports',
    description: 'Generating compliance packs and reports',
    icon: Video,
    articles: [
      { id: '10', title: 'Generating Audit Packs' },
      { id: '11', title: 'Distributing Packs' },
      { id: '12', title: 'Creating Reports' },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help Center</h1>
        <p className="text-gray-600 mt-1">Find answers and learn how to use Oblicore</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start space-x-4 mb-4">
                <Icon className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {category.articles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/dashboard/help/${article.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

