import { createClient } from '@supabase/supabase-js';
import type { AppSettings, RegisterResult, RevealResult, Participant, PublicParticipant } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env y configura tus credenciales de Supabase.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------------------
// Error Helpers
// ---------------------------------------------------------------------------

function parseError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: string }).message;
    // Strip PostgreSQL error prefix if present
    if (msg.startsWith('ERROR: ')) return msg.slice(7);
    return msg;
  }
  return 'Ha ocurrido un error inesperado. Intenta de nuevo.';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get current app settings (registration status, draw status, event date). */
export async function getAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) throw new Error(parseError(error));
  return data as AppSettings;
}

/** Get the list of registered participant names for dropdown selection. */
export async function getPublicParticipants(): Promise<PublicParticipant[]> {
  const { data, error } = await supabase.rpc('get_public_participants');
  if (error) throw new Error(parseError(error));
  return (data as PublicParticipant[]) ?? [];
}

/** Get the number of registered participants. */
export async function getParticipantCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_participant_count');
  if (error) throw new Error(parseError(error));
  return data as number;
}

/** Register a new participant. Returns the generated secret code. */
export async function registerParticipant(name: string): Promise<RegisterResult> {
  const { data, error } = await supabase.rpc('register_participant', {
    p_name: name,
  });
  if (error) throw new Error(parseError(error));
  return data as RegisterResult;
}

/** Reveal the partner for a given participant name. */
export async function revealPartner(name: string): Promise<RevealResult> {
  const { data, error } = await supabase.rpc('reveal_partner', {
    p_name: name.trim(),
  });
  if (error) throw new Error(parseError(error));
  return data as RevealResult;
}

// ---------------------------------------------------------------------------
// Admin API (requires authenticated session)
// ---------------------------------------------------------------------------

/** Get all participants (admin only). */
export async function getParticipantsAdmin(): Promise<Participant[]> {
  const { data, error } = await supabase.rpc('get_participants_admin');
  if (error) throw new Error(parseError(error));
  return (data as Participant[]) ?? [];
}

/** Delete a participant (admin only). */
export async function deleteParticipant(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_participant', { p_id: id });
  if (error) throw new Error(parseError(error));
}

/** Open or close registration (admin only). */
export async function toggleRegistration(open: boolean): Promise<void> {
  const { error } = await supabase.rpc('toggle_registration', { p_open: open });
  if (error) throw new Error(parseError(error));
}

/** Execute the random pairing draw (admin only). */
export async function performDraw(): Promise<{ success: boolean; pairs: number }> {
  const { data, error } = await supabase.rpc('perform_draw');
  if (error) throw new Error(parseError(error));
  return data as { success: boolean; pairs: number };
}

/** Reset the draw, clearing all pairings (admin only). */
export async function resetDraw(): Promise<void> {
  const { error } = await supabase.rpc('reset_draw');
  if (error) throw new Error(parseError(error));
}

/** Update the event date (admin only). */
export async function updateEventDate(date: string): Promise<void> {
  const { error } = await supabase.rpc('update_event_date', { p_date: date });
  if (error) throw new Error(parseError(error));
}
