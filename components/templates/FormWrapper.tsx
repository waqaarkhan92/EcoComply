'use client';

/**
 * Reusable Form Wrapper Template
 * Handles form state, validation, submission
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/FormField';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { z } from 'zod';

interface FormWrapperProps<T extends z.ZodType> {
  title: string;
  description?: string;
  schema: T;
  fields: Array<{
    name: string;
    label: string;
    type?: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'select';
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  apiEndpoint: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  backLink?: string;
  onSuccess?: (data: any) => void;
  defaultValues?: Partial<z.infer<T>>;
  submitLabel?: string;
}

export function FormWrapper<T extends z.ZodType>({
  title,
  description,
  schema,
  fields,
  apiEndpoint,
  method = 'POST',
  backLink,
  onSuccess,
  defaultValues,
  submitLabel = 'Submit',
}: FormWrapperProps<T>) {
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<T>) => {
      if (method === 'POST') {
        return apiClient.post(apiEndpoint, data);
      } else if (method === 'PUT') {
        return apiClient.put(apiEndpoint, data);
      } else {
        return apiClient.patch(apiEndpoint, data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      reset();
      onSuccess?.(data);
    },
  });

  const onSubmit = (data: z.infer<T>) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
          {description && (
            <p className="text-text-secondary mt-2">{description}</p>
          )}
        </div>
        {backLink && (
          <Link href={backLink}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          {fields.map((field) => (
            <FormField
              key={field.name}
              name={field.name}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              helpText={field.helpText}
              required={field.required}
              register={register}
              error={errors[field.name] as any}
            >
              {field.type === 'select' && field.options && (
                <>
                  <option value="">Select...</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </>
              )}
            </FormField>
          ))}

          {/* Error Message */}
          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                Failed to submit form. Please try again.
              </p>
            </div>
          )}

          {/* Success Message */}
          {mutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Successfully submitted!
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting...' : submitLabel}
            </Button>
            {backLink && (
              <Link href={backLink}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
