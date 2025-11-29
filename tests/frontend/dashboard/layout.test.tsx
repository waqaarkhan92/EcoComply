/**
 * Dashboard Layout Tests
 */

import { render, screen } from '@testing-library/react';
import DashboardLayout from '@/app/dashboard/layout';

// Mock the auth store
const mockIsAuthenticated = jest.fn();
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn((selector: any) => {
    const mockStore = {
      isAuthenticated: mockIsAuthenticated(),
    };
    return selector(mockStore);
  }),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock components
jest.mock('@/components/dashboard/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

jest.mock('@/components/dashboard/header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

describe('Dashboard Layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to login if not authenticated', () => {
    mockIsAuthenticated.mockReturnValue(false);
    
    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );
    
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should render layout when authenticated', () => {
    mockIsAuthenticated.mockReturnValue(true);
    
    render(
      <DashboardLayout>
        <div data-testid="content">Test Content</div>
      </DashboardLayout>
    );
    
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

