/**
 * Documents List Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import DocumentsPage from '@/app/dashboard/documents/page';

// Mock React Query
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

// Mock API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/dashboard/documents',
}));

describe('Documents List Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render documents list page', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], pagination: { limit: 20, has_more: false } },
      isLoading: false,
      error: null,
    });

    render(<DocumentsPage />);
    
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText(/manage your environmental compliance documents/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<DocumentsPage />);
    
    expect(screen.getByText(/loading documents/i)).toBeInTheDocument();
  });

  it('should show empty state when no documents', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], pagination: { limit: 20, has_more: false } },
      isLoading: false,
      error: null,
    });

    render(<DocumentsPage />);
    
    expect(screen.getByText(/no documents found/i)).toBeInTheDocument();
  });

  it('should render documents table when data exists', () => {
    const mockDocuments = [
      {
        id: '1',
        title: 'Test Document',
        document_type: 'ENVIRONMENTAL_PERMIT',
        status: 'ACTIVE',
        extraction_status: 'COMPLETED',
        created_at: '2025-01-01T00:00:00Z',
        obligation_count: 5,
      },
    ];

    mockUseQuery.mockReturnValue({
      data: { data: mockDocuments, pagination: { limit: 20, has_more: false } },
      isLoading: false,
      error: null,
    });

    render(<DocumentsPage />);
    
    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText('Document Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    // Status appears multiple times (header and badge), so use getAllByText
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
  });

  it('should show error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    render(<DocumentsPage />);
    
    expect(screen.getByText(/error loading documents/i)).toBeInTheDocument();
  });

  it('should have upload button', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], pagination: { limit: 20, has_more: false } },
      isLoading: false,
      error: null,
    });

    render(<DocumentsPage />);
    
    const uploadLink = screen.getByRole('link', { name: /upload document/i });
    expect(uploadLink).toHaveAttribute('href', '/dashboard/documents/upload');
  });
});

