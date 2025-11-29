/**
 * Obligations List Page Tests
 */

import { render, screen } from '@testing-library/react';
import ObligationsPage from '@/app/dashboard/obligations/page';

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
  usePathname: () => '/dashboard/obligations',
}));

describe('Obligations List Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render obligations list page', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], pagination: { limit: 20, has_more: false } },
      isLoading: false,
      error: null,
    });

    render(<ObligationsPage />);
    
    expect(screen.getByText('Obligations')).toBeInTheDocument();
    expect(screen.getByText(/track and manage your compliance obligations/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ObligationsPage />);
    
    expect(screen.getByText(/loading obligations/i)).toBeInTheDocument();
  });

  it('should show empty state when no obligations', () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], pagination: { limit: 20, has_more: false } },
      isLoading: false,
      error: null,
    });

    render(<ObligationsPage />);
    
    expect(screen.getByText(/no obligations found/i)).toBeInTheDocument();
  });

  it('should render obligations table when data exists', () => {
    const mockObligations = [
      {
        id: '1',
        obligation_title: 'Test Obligation',
        original_text: 'Test obligation text',
        category: 'MONITORING',
        status: 'ACTIVE',
        deadline_date: '2025-12-31',
        evidence_count: 2,
        document_id: 'doc-1',
      },
    ];

    mockUseQuery.mockReturnValue({
      data: { data: mockObligations, pagination: { limit: 20, has_more: false } },
      isLoading: false,
      error: null,
    });

    render(<ObligationsPage />);
    
    expect(screen.getByText('Test Obligation')).toBeInTheDocument();
    expect(screen.getByText('Obligation')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    render(<ObligationsPage />);
    
    expect(screen.getByText(/error loading obligations/i)).toBeInTheDocument();
  });
});

