# Testing Guide - Enhanced Form System

Comprehensive testing examples for the enhanced form system.

## Table of Contents

1. [Unit Testing FormField](#unit-testing-formfield)
2. [Testing Async Validation](#testing-async-validation)
3. [Testing Unsaved Changes Hook](#testing-unsaved-changes-hook)
4. [Testing Autosave Hook](#testing-autosave-hook)
5. [Integration Testing](#integration-testing)
6. [E2E Testing with Playwright](#e2e-testing-with-playwright)

---

## Unit Testing FormField

### Basic FormField Test

```tsx
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { FormField } from './FormField';

function TestForm() {
  const { register, formState: { errors } } = useForm();
  return (
    <FormField
      name="email"
      label="Email Address"
      type="email"
      register={register}
      error={errors.email}
      required
    />
  );
}

describe('FormField', () => {
  it('renders label and input', () => {
    render(<TestForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required asterisk', () => {
    render(<TestForm />);
    const label = screen.getByText(/email address/i);
    expect(label).toHaveClass('after:content-["*"]');
  });

  it('displays help text', () => {
    const { rerender } = render(<TestForm />);
    rerender(
      <FormField
        name="email"
        label="Email"
        helpText="We'll never share your email"
        register={useForm().register}
      />
    );
    expect(screen.getByText(/never share/i)).toBeInTheDocument();
  });
});
```

### Testing Error Display

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from './FormField';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

function TestForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(() => {})}>
      <FormField
        name="email"
        label="Email"
        type="email"
        register={register}
        error={errors.email}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('FormField Error Display', () => {
  it('shows error message on validation failure', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'invalid-email');
    await user.click(screen.getByText('Submit'));

    expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument();
  });

  it('animates error message', async () => {
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'invalid');
    await user.click(screen.getByText('Submit'));

    const error = await screen.findByText(/invalid email/i);
    expect(error.parentElement).toHaveStyle({ opacity: 1 });
  });
});
```

---

## Testing Async Validation

### Mock Async Validator

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { FormField, AsyncValidator } from './FormField';

const mockCheckEmail = jest.fn();

const emailValidator: AsyncValidator = {
  validate: async (email: string) => {
    const exists = await mockCheckEmail(email);
    return !exists || 'Email already taken';
  },
  debounceMs: 100,
};

function TestForm() {
  const { register, setError, clearErrors, formState: { errors } } = useForm();

  return (
    <FormField
      name="email"
      label="Email"
      type="email"
      register={register}
      error={errors.email}
      asyncValidator={emailValidator}
      setError={setError}
      clearErrors={clearErrors}
      showSuccessState
    />
  );
}

describe('Async Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state during validation', async () => {
    mockCheckEmail.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test@example.com');

    // Check for loading spinner
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument(); // or check for spinner SVG
    });
  });

  it('shows success state when email is available', async () => {
    mockCheckEmail.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test@example.com');

    await waitFor(() => {
      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
    });
  });

  it('shows error when email is taken', async () => {
    mockCheckEmail.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'taken@example.com');

    await waitFor(() => {
      expect(screen.getByText(/email already taken/i)).toBeInTheDocument();
    });
  });

  it('debounces validation calls', async () => {
    mockCheckEmail.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<TestForm />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'test@example.com');

    // Should only call once after debounce
    await waitFor(() => {
      expect(mockCheckEmail).toHaveBeenCalledTimes(1);
    });
  });
});
```

---

## Testing Unsaved Changes Hook

```tsx
import { renderHook, act } from '@testing-library/react';
import { useFormWithUnsavedChanges } from '@/lib/hooks/useFormWithUnsavedChanges';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/test',
}));

describe('useFormWithUnsavedChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
  });

  it('warns on beforeunload when dirty', () => {
    const { result } = renderHook(() =>
      useFormWithUnsavedChanges({ isDirty: true })
    );

    const event = new Event('beforeunload') as any;
    window.dispatchEvent(event);

    expect(event.returnValue).toBeTruthy();
  });

  it('does not warn when not dirty', () => {
    const { result } = renderHook(() =>
      useFormWithUnsavedChanges({ isDirty: false })
    );

    const event = new Event('beforeunload') as any;
    window.dispatchEvent(event);

    expect(event.returnValue).toBeUndefined();
  });

  it('calls onConfirmNavigation when user confirms', () => {
    const onConfirm = jest.fn();
    window.confirm = jest.fn(() => true);

    const { result } = renderHook(() =>
      useFormWithUnsavedChanges({
        isDirty: true,
        onConfirmNavigation: onConfirm,
      })
    );

    act(() => {
      result.current.navigateWithoutWarning('/somewhere');
    });

    expect(onConfirm).not.toHaveBeenCalled(); // navigateWithoutWarning bypasses
  });

  it('allows navigation without warning', () => {
    const { result } = renderHook(() =>
      useFormWithUnsavedChanges({ isDirty: true })
    );

    // Should not show confirm dialog
    act(() => {
      result.current.navigateWithoutWarning('/success');
    });

    expect(window.confirm).not.toHaveBeenCalled();
  });
});
```

---

## Testing Autosave Hook

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useFormAutosave } from '@/lib/hooks/use-form-autosave';

describe('useFormAutosave', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('saves to localStorage on change', async () => {
    const { result: formResult } = renderHook(() => useForm());
    const { result: autosaveResult } = renderHook(() =>
      useFormAutosave({
        watch: formResult.current.watch,
        storageKey: 'test-form',
        debounceMs: 100,
      })
    );

    act(() => {
      formResult.current.setValue('name', 'John Doe');
    });

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(autosaveResult.current.saveStatus).toBe('saved');
    });

    const saved = localStorage.getItem('test-form');
    expect(saved).toContain('John Doe');
  });

  it('saves at specified intervals', async () => {
    const { result: formResult } = renderHook(() => useForm());
    const { result: autosaveResult } = renderHook(() =>
      useFormAutosave({
        watch: formResult.current.watch,
        storageKey: 'test-form',
        interval: 30000,
      })
    );

    act(() => {
      formResult.current.setValue('name', 'John Doe');
    });

    // Advance 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(autosaveResult.current.saveStatus).toBe('saved');
    });
  });

  it('restores data on mount', async () => {
    localStorage.setItem('test-form', JSON.stringify({ name: 'Jane Doe' }));

    const { result: formResult } = renderHook(() => useForm());
    const onRestore = jest.fn();

    renderHook(() =>
      useFormAutosave({
        watch: formResult.current.watch,
        storageKey: 'test-form',
        restoreOnMount: true,
        onRestore,
      })
    );

    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledWith({ name: 'Jane Doe' });
    });
  });

  it('calls custom save function', async () => {
    const customSave = jest.fn().mockResolvedValue(undefined);
    const { result: formResult } = renderHook(() => useForm());

    const { result: autosaveResult } = renderHook(() =>
      useFormAutosave({
        watch: formResult.current.watch,
        save: customSave,
        debounceMs: 100,
      })
    );

    act(() => {
      formResult.current.setValue('name', 'John Doe');
    });

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(customSave).toHaveBeenCalled();
      expect(autosaveResult.current.saveStatus).toBe('saved');
    });
  });

  it('handles save errors', async () => {
    const customSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    const onError = jest.fn();

    const { result: formResult } = renderHook(() => useForm());
    const { result: autosaveResult } = renderHook(() =>
      useFormAutosave({
        watch: formResult.current.watch,
        save: customSave,
        debounceMs: 100,
        onSaveError: onError,
      })
    );

    act(() => {
      formResult.current.setValue('name', 'John Doe');
    });

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(autosaveResult.current.saveStatus).toBe('error');
      expect(onError).toHaveBeenCalled();
    });
  });
});
```

---

## Integration Testing

### Full Form Test

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, emailSchema } from '@/components/forms';

const schema = z.object({
  name: z.string().min(2),
  email: emailSchema(true),
  message: z.string().min(10),
});

function ContactForm({ onSubmit }: { onSubmit: jest.Mock }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        name="name"
        label="Name"
        required
        register={register}
        error={errors.name}
      />
      <FormField
        name="email"
        label="Email"
        type="email"
        required
        register={register}
        error={errors.email}
      />
      <FormField
        name="message"
        label="Message"
        type="textarea"
        required
        register={register}
        error={errors.message}
      />
      <button type="submit">Send</button>
    </form>
  );
}

describe('ContactForm Integration', () => {
  it('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message');
    await user.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          message: 'This is a test message',
        }),
        expect.anything()
      );
    });
  });

  it('shows validation errors for invalid data', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<ContactForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'A'); // Too short
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/message/i), 'Short'); // Too short
    await user.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

---

## E2E Testing with Playwright

### Basic Form Flow

```typescript
import { test, expect } from '@playwright/test';

test.describe('Contact Form E2E', () => {
  test('submits form successfully', async ({ page }) => {
    await page.goto('/contact');

    // Fill form
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('textarea[name="message"]', 'This is a test message');

    // Submit
    await page.click('button[type="submit"]');

    // Check success message
    await expect(page.locator('text=Message sent successfully')).toBeVisible();
  });

  test('shows validation errors', async ({ page }) => {
    await page.goto('/contact');

    // Submit without filling
    await page.click('button[type="submit"]');

    // Check for error messages
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
  });
});
```

### Async Validation E2E

```typescript
test.describe('Registration Form E2E', () => {
  test('validates email availability', async ({ page }) => {
    await page.goto('/register');

    // Type email
    await page.fill('input[name="email"]', 'test@example.com');

    // Wait for async validation
    await expect(page.locator('svg.animate-spin')).toBeVisible(); // Loading
    await expect(page.locator('svg.text-green-500')).toBeVisible(); // Success

    // Try taken email
    await page.fill('input[name="email"]', 'taken@example.com');
    await expect(page.locator('text=Email already taken')).toBeVisible();
  });
});
```

### Unsaved Changes E2E

```typescript
test.describe('Unsaved Changes Warning', () => {
  test('warns before leaving with unsaved changes', async ({ page }) => {
    await page.goto('/profile/edit');

    // Make changes
    await page.fill('input[name="name"]', 'John Doe');

    // Setup dialog handler
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('unsaved changes');
      await dialog.dismiss();
    });

    // Try to navigate away
    await page.click('a[href="/dashboard"]');

    // Should still be on edit page
    expect(page.url()).toContain('/profile/edit');
  });
});
```

### Autosave E2E

```typescript
test.describe('Autosave', () => {
  test('saves draft automatically', async ({ page }) => {
    await page.goto('/new-post');

    // Type content
    await page.fill('input[name="title"]', 'My Post Title');
    await page.fill('textarea[name="content"]', 'Post content here');

    // Wait for autosave
    await expect(page.locator('text=Saving...')).toBeVisible();
    await expect(page.locator('text=Draft saved')).toBeVisible();

    // Refresh page
    await page.reload();

    // Content should be restored
    await expect(page.locator('input[name="title"]')).toHaveValue('My Post Title');
    await expect(page.locator('textarea[name="content"]')).toHaveValue('Post content here');
  });
});
```

---

## Test Coverage Goals

- **Unit Tests:** 90%+ coverage for individual components
- **Integration Tests:** All major form flows
- **E2E Tests:** Critical user journeys

## Running Tests

```bash
# Unit and integration tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

## Best Practices

1. **Mock external dependencies** (API calls, localStorage, etc.)
2. **Use fake timers** for debounce/interval testing
3. **Test user interactions** not implementation details
4. **Test accessibility** (labels, ARIA attributes)
5. **Test error states** as thoroughly as success states
6. **Use data-testid** sparingly, prefer semantic queries
7. **Test keyboard navigation** for accessibility
8. **Mock Next.js router** for navigation tests

---

For more testing examples, check the existing test files in `/tests/` directory.
