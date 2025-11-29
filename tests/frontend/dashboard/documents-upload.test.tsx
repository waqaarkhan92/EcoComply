/**
 * Document Upload Page Tests
 */

import { render, screen } from '@testing-library/react';
import DocumentUploadPage from '@/app/dashboard/documents/upload/page';

// Mock React Query
const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => mockUseQuery(options),
  useMutation: (options: any) => mockUseMutation(options),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    upload: jest.fn(),
  },
}));

describe('Document Upload Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
    mockUseMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      isError: false,
    });
  });

  it('should render upload form', () => {
    render(<DocumentUploadPage />);
    
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText(/upload an environmental permit/i)).toBeInTheDocument();
  });

  it('should have file upload area', () => {
    render(<DocumentUploadPage />);
    
    expect(screen.getByText(/drag and drop your pdf file here/i)).toBeInTheDocument();
    expect(screen.getByText(/browse files/i)).toBeInTheDocument();
  });

  it('should have site selection', () => {
    render(<DocumentUploadPage />);
    
    expect(screen.getByLabelText(/site/i)).toBeInTheDocument();
  });

  it('should have document type selection', () => {
    render(<DocumentUploadPage />);
    
    expect(screen.getByLabelText(/document type/i)).toBeInTheDocument();
  });

  it('should have upload and cancel buttons', () => {
    render(<DocumentUploadPage />);
    
    expect(screen.getByRole('button', { name: /upload document/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

