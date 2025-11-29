/**
 * Signup Page Tests
 */

import { render, screen } from '@testing-library/react';
import SignupPage from '@/app/(auth)/signup/page';

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock the auth store
jest.mock('@/lib/store/auth-store', () => ({
  useAuthStore: jest.fn((selector) => {
    const mockStore = {
      login: jest.fn(),
    };
    return selector(mockStore);
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Signup Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render signup form', () => {
    render(<SignupPage />);
    
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText('Get started with Oblicore')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should show password requirements', () => {
    render(<SignupPage />);
    
    expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('should have link to login page', () => {
    render(<SignupPage />);
    
    const loginLink = screen.getByRole('link', { name: /sign in/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});

