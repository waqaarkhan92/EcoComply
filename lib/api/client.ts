/**
 * API Client
 * Handles all API requests with authentication and error handling
 */

import { useAuthStore } from '@/lib/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const { accessToken } = useAuthStore.getState();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const responseText = await response.text();

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      const error: any = new Error(`Invalid JSON response from ${endpoint}`);
      error.response = { data: responseText, status: response.status };
      error.status = response.status;
      throw error;
    }

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || `API request failed with status ${response.status}`;
      const error: any = new Error(errorMessage);
      error.response = { data, status: response.status };
      error.status = response.status;
      error.code = data?.error?.code;
      throw error;
    }

    return data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const { accessToken } = useAuthStore.getState();
    
    const headers: HeadersInit = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Upload failed');
    }

    return data;
  }
}

export const apiClient = new ApiClient();

/**
 * Helper function for React Query that returns data in the expected format
 * This handles the type coercion between ApiResponse and React Query expectations
 */
export async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await apiClient.get(endpoint);
  return response as unknown as T;
}

