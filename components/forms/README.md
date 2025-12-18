# Enhanced Form Handling System

A comprehensive form handling system with advanced validation, autosave, and unsaved changes detection.

## Table of Contents

1. [FormField Component](#formfield-component)
2. [Form Validation Utilities](#form-validation-utilities)
3. [useFormWithUnsavedChanges Hook](#useformwithunsavedchanges-hook)
4. [useFormAutosave Hook](#useformautosave-hook)
5. [Complete Examples](#complete-examples)

---

## FormField Component

An enhanced, reusable form field component with built-in validation, animations, and async validation support.

### Features

- Real-time validation with debounce
- Animated error messages with Framer Motion
- Support for async validation (e.g., checking if email exists)
- Success state indication
- Loading state for async validation
- Full integration with react-hook-form

### Basic Usage

```tsx
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/forms/FormField';

function MyForm() {
  const { register, formState: { errors } } = useForm();

  return (
    <FormField
      name="email"
      label="Email Address"
      type="email"
      placeholder="you@example.com"
      required
      register={register}
      error={errors.email}
      helpText="We'll never share your email"
    />
  );
}
```

### Async Validation Example

```tsx
import { FormField, AsyncValidator } from '@/components/forms/FormField';
import { createEmailUniquenessValidator } from '@/lib/utils/form-validation';

function SignupForm() {
  const { register, setError, clearErrors, formState: { errors } } = useForm();

  const checkEmailExists = async (email: string) => {
    const response = await fetch(`/api/check-email?email=${email}`);
    return response.json();
  };

  const emailValidator = createEmailUniquenessValidator(checkEmailExists);

  return (
    <FormField
      name="email"
      label="Email Address"
      type="email"
      required
      register={register}
      error={errors.email}
      asyncValidator={emailValidator}
      setError={setError}
      clearErrors={clearErrors}
      showSuccessState
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name (required) |
| `label` | `string` | - | Field label (required) |
| `type` | `string` | `'text'` | Input type (text, email, password, number, date, url, tel, textarea, select) |
| `placeholder` | `string` | - | Placeholder text |
| `helpText` | `string` | - | Help text shown below the input |
| `error` | `FieldError` | - | Error object from react-hook-form |
| `required` | `boolean` | `false` | Whether field is required (adds asterisk) |
| `disabled` | `boolean` | `false` | Whether field is disabled |
| `register` | `UseFormRegister` | - | react-hook-form register function |
| `children` | `ReactNode` | - | Children (for select options) |
| `className` | `string` | `''` | Additional CSS classes |
| `asyncValidator` | `AsyncValidator` | - | Async validation function |
| `setError` | `UseFormSetError` | - | react-hook-form setError function |
| `clearErrors` | `UseFormClearErrors` | - | react-hook-form clearErrors function |
| `showSuccessState` | `boolean` | `false` | Show success checkmark when valid |
| `validateOnChange` | `boolean` | `true` | Validate as user types |
| `debounceMs` | `number` | `500` | Debounce delay for validation |

---

## Form Validation Utilities

A comprehensive set of validation helpers located in `/lib/utils/form-validation.ts`.

### Synchronous Validators

```tsx
import {
  validateEmail,
  validatePhone,
  validateUrl,
  validateStrongPassword,
  validateMinLength,
  validateMaxLength,
  composeValidators,
} from '@/lib/utils/form-validation';

// Single validator
const isValidEmail = validateEmail('test@example.com'); // true or error message

// Compose multiple validators
const validateUsername = composeValidators(
  (value) => validateMinLength(value, 3, 'Username'),
  (value) => validateMaxLength(value, 20, 'Username'),
  validateAlphanumeric
);
```

### Async Validators

```tsx
import {
  createEmailUniquenessValidator,
  createUsernameUniquenessValidator,
  createUniquenessValidator,
} from '@/lib/utils/form-validation';

// Email uniqueness
const emailValidator = createEmailUniquenessValidator(async (email) => {
  const response = await fetch(`/api/check-email?email=${email}`);
  const data = await response.json();
  return data.exists;
});

// Custom uniqueness validator
const domainValidator = createUniquenessValidator(
  async (domain) => {
    const response = await fetch(`/api/check-domain?domain=${domain}`);
    const data = await response.json();
    return data.exists;
  },
  'domain',
  validateUrl // Optional: additional sync validation
);
```

### Zod Schema Builders

```tsx
import {
  emailSchema,
  passwordSchema,
  phoneSchema,
  stringSchema,
  numberSchema,
} from '@/lib/utils/form-validation';
import { z } from 'zod';

const userSchema = z.object({
  email: emailSchema(true), // Required email
  password: passwordSchema(8, true), // Min 8 chars, strong
  phone: phoneSchema(false), // Optional phone
  name: stringSchema('Name', 2, 50), // Min 2, max 50
  age: numberSchema('Age', 18, 120), // Min 18, max 120
});
```

### Available Validators

- `validateEmail(email)` - Email format
- `validatePhone(phone)` - Phone number format
- `validateUrl(url)` - URL format
- `validateStrongPassword(password)` - Strong password requirements
- `validateAlphanumeric(value)` - Only letters and numbers
- `validateMinLength(value, min, field)` - Minimum length
- `validateMaxLength(value, max, field)` - Maximum length
- `validateFutureDate(dateString)` - Date must be in future
- `validatePastDate(dateString)` - Date must be in past
- `validateRange(value, min, max, field)` - Number in range
- `validateFileSize(file, maxSizeMB)` - File size limit
- `validateFileType(file, allowedTypes)` - File type validation

---

## useFormWithUnsavedChanges Hook

Prevents users from accidentally leaving a page with unsaved form changes.

### Features

- Tracks form dirty state
- Browser beforeunload warning (refresh/close)
- Next.js router navigation interception
- Browser back/forward button handling
- Custom confirmation messages
- Callbacks for confirmed/cancelled navigation

### Usage

```tsx
import { useForm } from 'react-hook-form';
import { useFormWithUnsavedChanges } from '@/lib/hooks/useFormWithUnsavedChanges';

function MyForm() {
  const { formState } = useForm();

  const { isDirty, navigateWithoutWarning } = useFormWithUnsavedChanges({
    isDirty: formState.isDirty,
    message: 'You have unsaved changes. Are you sure you want to leave?',
    onConfirmNavigation: () => {
      console.log('User confirmed navigation');
    },
    onCancelNavigation: () => {
      console.log('User cancelled navigation');
    },
  });

  // Navigate without warning after successful save
  const handleSave = async (data) => {
    await saveData(data);
    navigateWithoutWarning('/success');
  };

  return (
    <div>
      {isDirty && (
        <div className="warning">You have unsaved changes</div>
      )}
      {/* form fields */}
    </div>
  );
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `isDirty` | `boolean` | `false` | Whether form has unsaved changes |
| `message` | `string` | `'You have unsaved changes...'` | Confirmation message |
| `enabled` | `boolean` | `true` | Enable/disable warnings |
| `onConfirmNavigation` | `function` | - | Callback when navigation confirmed |
| `onCancelNavigation` | `function` | - | Callback when navigation cancelled |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `isDirty` | `boolean` | Current dirty state |
| `setDirty` | `function` | Manually mark as dirty |
| `resetDirty` | `function` | Manually clear dirty state |
| `navigateWithoutWarning` | `function` | Navigate without showing warning |

---

## useFormAutosave Hook

Automatically saves form data at intervals or after user stops typing.

### Features

- Configurable autosave interval
- Debounced saving (saves after user stops typing)
- Save to localStorage, sessionStorage, or custom API
- Visual save status indicator
- Manual save trigger
- Automatic restore on mount
- Save success/error callbacks

### Usage

```tsx
import { useForm } from 'react-hook-form';
import { useFormAutosave } from '@/lib/hooks/use-form-autosave';

function LongForm() {
  const { watch, setValue } = useForm();

  const { saveStatus, lastSavedAt, triggerSave, clearSaved } = useFormAutosave({
    watch,
    save: async (data) => {
      await fetch('/api/save-draft', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    interval: 30000, // Save every 30 seconds
    debounceMs: 2000, // Or 2 seconds after typing stops
    restoreOnMount: true,
    onRestore: (data) => {
      // Populate form with restored data
      Object.keys(data).forEach((key) => {
        setValue(key, data[key]);
      });
    },
  });

  return (
    <div>
      <div className="save-indicator">
        {saveStatus === 'saving' && 'Saving...'}
        {saveStatus === 'saved' && `Saved at ${lastSavedAt?.toLocaleTimeString()}`}
        {saveStatus === 'error' && 'Save failed'}
      </div>
      {/* form fields */}
    </div>
  );
}
```

### localStorage/sessionStorage Example

```tsx
const { saveStatus } = useFormAutosave({
  watch,
  storageType: 'localStorage',
  storageKey: 'my-form-draft',
  interval: 30000,
  restoreOnMount: true,
  onRestore: (data) => {
    // Form will be restored automatically
    Object.keys(data).forEach((key) => {
      setValue(key, data[key]);
    });
  },
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `watch` | `UseFormWatch` | - | react-hook-form watch function (required) |
| `save` | `function` | - | Custom async save function |
| `restore` | `function` | - | Custom restore function |
| `storageType` | `'localStorage' \| 'sessionStorage'` | `'localStorage'` | Storage type |
| `storageKey` | `string` | `'form-autosave'` | Storage key |
| `interval` | `number` | `30000` | Autosave interval (ms), 0 to disable |
| `debounceMs` | `number` | `2000` | Debounce delay (ms) |
| `enabled` | `boolean` | `true` | Enable/disable autosave |
| `restoreOnMount` | `boolean` | `true` | Restore data on mount |
| `onSaveSuccess` | `function` | - | Save success callback |
| `onSaveError` | `function` | - | Save error callback |
| `onRestore` | `function` | - | Restore callback |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `saveStatus` | `'idle' \| 'saving' \| 'saved' \| 'error'` | Current save status |
| `lastSavedAt` | `Date \| null` | Last save timestamp |
| `triggerSave` | `function` | Manually trigger save |
| `clearSaved` | `function` | Clear saved data |
| `restoreSaved` | `function` | Manually restore data |
| `hasSavedData` | `boolean` | Whether saved data exists |

---

## Complete Examples

### Example 1: Simple Contact Form

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/components/forms/FormField';
import { emailSchema } from '@/lib/utils/form-validation';

const contactSchema = z.object({
  name: z.string().min(2),
  email: emailSchema(true),
  message: z.string().min(10),
});

function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema),
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <FormField name="name" label="Name" required register={register} error={errors.name} />
      <FormField name="email" label="Email" type="email" required register={register} error={errors.email} />
      <FormField name="message" label="Message" type="textarea" required register={register} error={errors.message} />
      <button type="submit">Send</button>
    </form>
  );
}
```

### Example 2: Registration with Async Validation

```tsx
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/forms/FormField';
import { createEmailUniquenessValidator } from '@/lib/utils/form-validation';

function RegistrationForm() {
  const { register, setError, clearErrors, formState: { errors } } = useForm();

  const checkEmail = async (email) => {
    const res = await fetch(`/api/check-email?email=${email}`);
    return res.json();
  };

  return (
    <form>
      <FormField
        name="email"
        label="Email"
        type="email"
        required
        register={register}
        error={errors.email}
        asyncValidator={createEmailUniquenessValidator(checkEmail)}
        setError={setError}
        clearErrors={clearErrors}
        showSuccessState
      />
    </form>
  );
}
```

### Example 3: Form with Autosave and Unsaved Changes Warning

```tsx
import { useForm } from 'react-hook-form';
import { useFormAutosave } from '@/lib/hooks/use-form-autosave';
import { useFormWithUnsavedChanges } from '@/lib/hooks/useFormWithUnsavedChanges';

function LongForm() {
  const { register, watch, setValue, formState: { isDirty } } = useForm();

  // Autosave
  const { saveStatus, lastSavedAt } = useFormAutosave({
    watch,
    storageKey: 'long-form',
    interval: 30000,
    restoreOnMount: true,
    onRestore: (data) => {
      Object.keys(data).forEach((key) => setValue(key, data[key]));
    },
  });

  // Unsaved changes warning
  useFormWithUnsavedChanges({ isDirty });

  return (
    <div>
      <div className="status">
        {saveStatus === 'saved' && `Saved at ${lastSavedAt?.toLocaleTimeString()}`}
      </div>
      {/* form fields */}
    </div>
  );
}
```

---

## Best Practices

1. **Async Validation**: Use for operations that require server checks (uniqueness, availability)
2. **Debouncing**: Default 500ms is good for most cases; increase for expensive operations
3. **Autosave**: Use interval of 30-60 seconds for long forms
4. **Unsaved Changes**: Always enable for forms with significant data entry
5. **Error Messages**: Use clear, actionable error messages
6. **Success State**: Enable `showSuccessState` for critical fields like email/username
7. **Accessibility**: FormField component includes proper labels and ARIA attributes

## TypeScript Support

All components and hooks are fully typed with TypeScript for excellent IDE support and type safety.

```tsx
import type { AsyncValidator } from '@/components/forms/FormField';
import type { UseFormAutosaveOptions } from '@/lib/hooks/use-form-autosave';
```

## Performance Considerations

- Async validators are automatically debounced
- Autosave uses debouncing to prevent excessive saves
- Animations are optimized with Framer Motion
- Form state changes don't cause unnecessary re-renders

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Next.js 13+ with App Router
- Requires JavaScript enabled
- localStorage/sessionStorage for autosave

---

For more examples, see `FormExamples.tsx` in the same directory.
