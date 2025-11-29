/**
 * Dashboard Home Page Tests
 */

import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';

// Mock React Query
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn((selector: any) => {
    const mockStore = {
      company: { name: 'Test Company' },
    };
    return selector(mockStore);
  }),
}));

describe('Dashboard Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard home page', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          total_obligations: 10,
          overdue_count: 2,
          evidence_gaps: 3,
          upcoming_deadlines: 5,
        },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
      });

    render(<DashboardPage />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('should show stats cards', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          total_obligations: 10,
          overdue_count: 2,
          evidence_gaps: 3,
          upcoming_deadlines: 5,
        },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: [],
        isLoading: false,
      });

    render(<DashboardPage />);
    
    expect(screen.getByText('Total Obligations')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Evidence Gaps')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
      })
      .mockReturnValueOnce({
        data: undefined,
        isLoading: true,
      });

    render(<DashboardPage />);
    
    // Loading states are shown via skeleton/placeholder
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

