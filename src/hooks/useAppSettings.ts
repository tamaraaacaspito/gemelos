import { useState, useEffect, useCallback } from 'react';
import { getAppSettings } from '../services/supabase';
import type { AppSettings } from '../types';

interface UseAppSettingsReturn {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAppSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { settings, loading, error, refetch };
}
