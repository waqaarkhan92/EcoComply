'use client';

/**
 * useFormAutosave Hook
 *
 * Automatically saves form data at regular intervals or when changes are detected.
 * Features:
 * - Configurable autosave interval
 * - Debounced saving to prevent excessive saves
 * - Save to localStorage, sessionStorage, or custom save function
 * - Visual indicator of save status
 * - Manual save trigger
 * - Restore saved data on mount
 *
 * @example
 * ```tsx
 * const { watch, setValue } = useForm();
 * const { saveStatus, triggerSave, clearSaved } = useFormAutosave({
 *   watch,
 *   save: async (data) => {
 *     await saveToApi(data);
 *   },
 *   interval: 30000, // Save every 30 seconds
 * });
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { UseFormWatch, FieldValues } from 'react-hook-form';
import { useDebounce } from './use-debounce';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type StorageType = 'localStorage' | 'sessionStorage' | 'custom';

export interface UseFormAutosaveOptions<TFormData extends FieldValues = FieldValues> {
  /**
   * react-hook-form's watch function to monitor form changes
   */
  watch: UseFormWatch<TFormData>;

  /**
   * Custom save function (async)
   * If not provided, will use localStorage/sessionStorage
   */
  save?: (data: TFormData) => Promise<void> | void;

  /**
   * Custom restore function
   * If not provided, will use localStorage/sessionStorage
   */
  restore?: () => Promise<TFormData | null> | TFormData | null;

  /**
   * Storage type for automatic save/restore
   * @default 'localStorage'
   */
  storageType?: StorageType;

  /**
   * Storage key for localStorage/sessionStorage
   * @default 'form-autosave'
   */
  storageKey?: string;

  /**
   * Autosave interval in milliseconds
   * Set to 0 to disable interval-based autosave
   * @default 30000 (30 seconds)
   */
  interval?: number;

  /**
   * Debounce delay in milliseconds before saving after changes
   * @default 2000 (2 seconds)
   */
  debounceMs?: number;

  /**
   * Whether autosave is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when save succeeds
   */
  onSaveSuccess?: (data: TFormData) => void;

  /**
   * Callback when save fails
   */
  onSaveError?: (error: Error) => void;

  /**
   * Whether to restore saved data on mount
   * @default true
   */
  restoreOnMount?: boolean;

  /**
   * Callback when data is restored
   */
  onRestore?: (data: TFormData) => void;
}

export interface UseFormAutosaveReturn<TFormData = any> {
  /**
   * Current save status
   */
  saveStatus: SaveStatus;

  /**
   * Last saved timestamp
   */
  lastSavedAt: Date | null;

  /**
   * Manually trigger a save
   */
  triggerSave: () => Promise<void>;

  /**
   * Clear saved data from storage
   */
  clearSaved: () => void;

  /**
   * Manually restore saved data
   */
  restoreSaved: () => Promise<TFormData | null>;

  /**
   * Whether there's saved data available
   */
  hasSavedData: boolean;
}

export function useFormAutosave<TFormData extends FieldValues = FieldValues>({
  watch,
  save: customSave,
  restore: customRestore,
  storageType = 'localStorage',
  storageKey = 'form-autosave',
  interval = 30000,
  debounceMs = 2000,
  enabled = true,
  onSaveSuccess,
  onSaveError,
  restoreOnMount = true,
  onRestore,
}: UseFormAutosaveOptions<TFormData>): UseFormAutosaveReturn<TFormData> {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);

  const formData = watch();
  const debouncedFormData = useDebounce(formData, debounceMs);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Get storage instance
  const getStorage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return storageType === 'localStorage' ? localStorage : sessionStorage;
  }, [storageType]);

  // Save function
  const performSave = useCallback(async (data: TFormData) => {
    if (!enabled) return;

    setSaveStatus('saving');

    try {
      if (customSave) {
        // Use custom save function
        await customSave(data);
      } else {
        // Use storage
        const storage = getStorage();
        if (storage) {
          storage.setItem(storageKey, JSON.stringify(data));
        }
      }

      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setHasSavedData(true);
      onSaveSuccess?.(data);

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      setSaveStatus('error');
      onSaveError?.(error as Error);

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  }, [enabled, customSave, getStorage, storageKey, onSaveSuccess, onSaveError]);

  // Restore function
  const restoreSaved = useCallback(async (): Promise<TFormData | null> => {
    try {
      if (customRestore) {
        return await customRestore();
      } else {
        const storage = getStorage();
        if (storage) {
          const saved = storage.getItem(storageKey);
          if (saved) {
            setHasSavedData(true);
            return JSON.parse(saved) as TFormData;
          }
        }
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
    }

    return null;
  }, [customRestore, getStorage, storageKey]);

  // Clear saved data
  const clearSaved = useCallback(() => {
    const storage = getStorage();
    if (storage) {
      storage.removeItem(storageKey);
    }
    setHasSavedData(false);
    setLastSavedAt(null);
  }, [getStorage, storageKey]);

  // Trigger manual save
  const triggerSave = useCallback(async () => {
    const currentData = watch();
    await performSave(currentData);
  }, [watch, performSave]);

  // Restore on mount
  useEffect(() => {
    if (!restoreOnMount) return;

    const restore = async () => {
      const restored = await restoreSaved();
      if (restored) {
        onRestore?.(restored);
      }
    };

    restore();
  }, [restoreOnMount, restoreSaved, onRestore]);

  // Auto-save on debounced changes
  useEffect(() => {
    // Skip initial render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled || !debouncedFormData) return;

    performSave(debouncedFormData);
  }, [debouncedFormData, performSave, enabled]);

  // Interval-based autosave
  useEffect(() => {
    if (!enabled || interval === 0) return;

    intervalRef.current = setInterval(() => {
      const currentData = watch();
      performSave(currentData);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, watch, performSave]);

  // Check for existing saved data on mount
  useEffect(() => {
    const checkSavedData = async () => {
      const storage = getStorage();
      if (storage) {
        const saved = storage.getItem(storageKey);
        setHasSavedData(!!saved);
      }
    };

    checkSavedData();
  }, [getStorage, storageKey]);

  return {
    saveStatus,
    lastSavedAt,
    triggerSave,
    clearSaved,
    restoreSaved,
    hasSavedData,
  };
}

export default useFormAutosave;
