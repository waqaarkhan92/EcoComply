/**
 * Login Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';

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

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('Oblicore')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show validation error for empty email', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    // HTML5 validation should prevent submission
    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    expect(emailInput.validity.valueMissing).toBe(true);
  });

  it('should show validation error for empty password', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'test@example.com');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    // HTML5 validation should prevent submission
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(passwordInput.validity.valueMissing).toBe(true);
  });

  it('should have link to signup page', () => {
    render(<LoginPage />);
    
    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });
});

