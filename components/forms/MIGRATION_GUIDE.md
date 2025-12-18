# Migration Guide - Enhanced Form System

This guide helps you migrate existing forms to use the new enhanced form system.

## Overview

The enhanced form system is **backward compatible**. Your existing forms will continue to work without changes. This guide shows how to progressively adopt new features.

## Migration Levels

### Level 1: Basic Upgrade (No Breaking Changes)
Simply replace basic input elements with `FormField` components.

**Before:**
```tsx
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    {...register('email')}
  />
  {errors.email && <span>{errors.email.message}</span>}
</div>
```

**After:**
```tsx
<FormField
  name="email"
  label="Email"
  type="email"
  register={register}
  error={errors.email}
/>
```

**Benefits:**
- Consistent styling
- Better accessibility
- Animated errors
- Less boilerplate

---

### Level 2: Add Validation (Optional)
Enhance with better validation using Zod schemas.

**Before:**
```tsx
const { register, handleSubmit } = useForm();
```

**After:**
```tsx
import { emailSchema, passwordSchema } from '@/components/forms';

const schema = z.object({
  email: emailSchema(true),
  password: passwordSchema(8, true),
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

**Benefits:**
- Type-safe validation
- Reusable schemas
- Better error messages
- Consistent validation rules

---

### Level 3: Add Async Validation (Optional)
Add async validation for fields that need server-side checks.

**Before:**
```tsx
<FormField
  name="email"
  label="Email"
  type="email"
  register={register}
  error={errors.email}
/>
```

**After:**
```tsx
import { createEmailUniquenessValidator } from '@/components/forms';

const checkEmail = async (email) => {
  const res = await fetch(`/api/check-email?email=${email}`);
  return (await res.json()).exists;
};

const emailValidator = createEmailUniquenessValidator(checkEmail);

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
```

**Benefits:**
- Real-time uniqueness checks
- Better UX with instant feedback
- Automatic debouncing
- Loading states

---

### Level 4: Add Unsaved Changes Warning (Optional)
Protect users from losing data.

**Before:**
```tsx
const { register, handleSubmit, formState: { errors } } = useForm();
```

**After:**
```tsx
import { useFormWithUnsavedChanges } from '@/components/forms';

const { register, handleSubmit, formState: { errors, isDirty } } = useForm();

useFormWithUnsavedChanges({
  isDirty,
  message: 'You have unsaved changes. Are you sure you want to leave?',
});
```

**Benefits:**
- Prevents accidental data loss
- Browser and router navigation protection
- Custom confirmation messages

---

### Level 5: Add Autosave (Optional)
Automatically save form drafts.

**Before:**
```tsx
const { register, handleSubmit } = useForm();
```

**After:**
```tsx
import { useFormAutosave, FormSaveStatus } from '@/components/forms';

const { register, handleSubmit, watch, setValue } = useForm();

const { saveStatus, lastSavedAt, clearSaved } = useFormAutosave({
  watch,
  storageKey: 'my-form-draft',
  interval: 30000,
  restoreOnMount: true,
  onRestore: (data) => {
    Object.keys(data).forEach((key) => setValue(key, data[key]));
  },
});

// In your JSX
<FormSaveStatus status={saveStatus} lastSavedAt={lastSavedAt} variant="banner" />
```

**Benefits:**
- Automatic draft saving
- Recovery from crashes
- Better UX for long forms
- Configurable save intervals

---

## Common Migration Patterns

### Pattern 1: Simple Contact Form

**Before:**
```tsx
export function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register('name', { required: 'Name is required' })} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>
      <div>
        <label>Email</label>
        <input type="email" {...register('email', { required: 'Email is required' })} />
        {errors.email && <span>{errors.email.message}</span>}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
```

**After:**
```tsx
import { FormField, emailSchema } from '@/components/forms';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema(true),
});

export function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

### Pattern 2: Login Form

**Before:**
```tsx
export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Email</label>
        <input type="email" {...register('email')} />
      </div>
      <div>
        <label>Password</label>
        <input type="password" {...register('password')} />
      </div>
      <button type="submit">Login</button>
    </form>
  );
}
```

**After:**
```tsx
import { FormField, emailSchema } from '@/components/forms';

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        name="email"
        label="Email"
        type="email"
        required
        register={register}
        error={errors.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        required
        register={register}
        error={errors.password}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

---

### Pattern 3: Registration Form with Email Check

**Before:**
```tsx
export function RegistrationForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [emailTaken, setEmailTaken] = useState(false);

  const checkEmail = async (e) => {
    const email = e.target.value;
    const res = await fetch(`/api/check-email?email=${email}`);
    const data = await res.json();
    setEmailTaken(data.exists);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Email</label>
        <input
          type="email"
          {...register('email')}
          onBlur={checkEmail}
        />
        {emailTaken && <span>Email already taken</span>}
      </div>
      <button type="submit">Register</button>
    </form>
  );
}
```

**After:**
```tsx
import { FormField, createEmailUniquenessValidator } from '@/components/forms';

export function RegistrationForm() {
  const { register, setError, clearErrors, handleSubmit, formState: { errors } } = useForm();

  const checkEmail = async (email) => {
    const res = await fetch(`/api/check-email?email=${email}`);
    return (await res.json()).exists;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
      <button type="submit">Register</button>
    </form>
  );
}
```

---

### Pattern 4: Profile Form with Unsaved Changes

**Before:**
```tsx
export function ProfileForm() {
  const { register, handleSubmit, formState: { isDirty } } = useForm();

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ... rest of component
}
```

**After:**
```tsx
import { FormField, useFormWithUnsavedChanges } from '@/components/forms';

export function ProfileForm() {
  const { register, handleSubmit, formState: { isDirty, errors } } = useForm();

  useFormWithUnsavedChanges({ isDirty });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField name="name" label="Name" required register={register} error={errors.name} />
      <FormField name="bio" label="Bio" type="textarea" register={register} error={errors.bio} />
      <button type="submit">Save</button>
    </form>
  );
}
```

---

### Pattern 5: Long Form with Draft Saving

**Before:**
```tsx
export function LongForm() {
  const { register, handleSubmit, watch } = useForm();

  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem('draft', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    const draft = localStorage.getItem('draft');
    if (draft) {
      reset(JSON.parse(draft));
    }
  }, []);

  // ... rest of component
}
```

**After:**
```tsx
import { FormField, useFormAutosave, FormSaveStatus } from '@/components/forms';

export function LongForm() {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  const { saveStatus, lastSavedAt, clearSaved } = useFormAutosave({
    watch,
    storageKey: 'long-form-draft',
    interval: 30000,
    restoreOnMount: true,
    onRestore: (data) => {
      Object.keys(data).forEach((key) => setValue(key, data[key]));
    },
  });

  const onSubmit = (data) => {
    // ... submit logic
    clearSaved(); // Clear draft after submission
  };

  return (
    <div>
      <FormSaveStatus status={saveStatus} lastSavedAt={lastSavedAt} variant="banner" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField name="title" label="Title" required register={register} error={errors.title} />
        <FormField name="content" label="Content" type="textarea" register={register} error={errors.content} />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
```

---

## Step-by-Step Migration Checklist

### Step 1: Update Imports
```tsx
// Add these imports
import { FormField } from '@/components/forms/FormField';
import { emailSchema, passwordSchema } from '@/lib/utils/form-validation';
```

### Step 2: Replace Input Elements
Replace each manual input/label/error combo with `FormField`:
```tsx
<FormField
  name="fieldName"
  label="Field Label"
  type="text" // or email, password, etc.
  register={register}
  error={errors.fieldName}
  required // if applicable
/>
```

### Step 3: Add Validation Schema (Optional)
```tsx
const schema = z.object({
  email: emailSchema(true),
  password: passwordSchema(8, true),
});

// Update useForm
const { ... } = useForm({
  resolver: zodResolver(schema),
});
```

### Step 4: Add Enhanced Features (Optional)

**Async Validation:**
```tsx
const emailValidator = createEmailUniquenessValidator(checkEmailFn);
// Add to FormField: asyncValidator={emailValidator}
```

**Unsaved Changes:**
```tsx
useFormWithUnsavedChanges({ isDirty: formState.isDirty });
```

**Autosave:**
```tsx
const { saveStatus } = useFormAutosave({ watch, storageKey: 'my-form' });
<FormSaveStatus status={saveStatus} />
```

### Step 5: Test
1. Test form submission
2. Test validation (both sync and async)
3. Test unsaved changes warning (refresh, navigate away)
4. Test autosave (check localStorage/sessionStorage)

---

## Breaking Changes

There are **no breaking changes**. The enhanced system is fully backward compatible.

---

## Performance Considerations

### Before Migration
- Manual debouncing for async operations
- Manual localStorage management
- Custom event listeners for navigation

### After Migration
- Automatic debouncing (configurable)
- Built-in autosave with configurable intervals
- Centralized navigation handling
- Optimized re-renders with React hooks

---

## Troubleshooting

### Issue: Async validation not working
**Solution:** Make sure to pass `setError` and `clearErrors` props:
```tsx
<FormField
  asyncValidator={validator}
  setError={setError}
  clearErrors={clearErrors}
/>
```

### Issue: Autosave not restoring data
**Solution:** Implement the `onRestore` callback:
```tsx
useFormAutosave({
  watch,
  restoreOnMount: true,
  onRestore: (data) => {
    Object.keys(data).forEach((key) => {
      setValue(key, data[key]);
    });
  },
});
```

### Issue: Unsaved changes warning showing after save
**Solution:** Reset the form after successful save:
```tsx
const onSubmit = (data) => {
  // ... save logic
  reset(data); // This clears the dirty state
};
```

---

## Getting Help

1. Check [QUICK_START.md](./QUICK_START.md) for quick examples
2. Review [README.md](./README.md) for detailed documentation
3. Look at [FormExamples.tsx](./FormExamples.tsx) for real examples
4. Check existing forms in the codebase for patterns

---

## Timeline Recommendation

- **Week 1:** Migrate simple forms (contact, login) - Level 1
- **Week 2:** Add validation schemas - Level 2
- **Week 3:** Add async validation where needed - Level 3
- **Week 4:** Add unsaved changes and autosave - Levels 4-5

This gradual approach minimizes risk and allows your team to learn the system progressively.
