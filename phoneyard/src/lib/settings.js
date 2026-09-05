import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Keys used in the platform_settings table (key text primary key, value jsonb).
export const SETTING_KEYS = {
  banner: 'announcement_banner',
  maintenance: 'maintenance_mode',
};

// Reads one settings row and keeps it live-ish (re-fetches on mount).
// Returns [value, loaded] — loaded lets callers avoid flashing a
// "disabled" state for a split second before the real value arrives.
export function useSetting(key, fallback) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error(error);
        }
        setValue(data?.value ?? fallback);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, loaded];
}

export async function saveSetting(key, value, userId) {
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key, value, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}