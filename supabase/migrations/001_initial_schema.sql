-- =====================================================================
-- GEMELOS - Database Schema & RPC Functions
-- =====================================================================
-- Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This creates all tables, security policies, and server-side functions.
-- =====================================================================

-- -------------------------------------------------------------------
-- 1. TABLES
-- -------------------------------------------------------------------

-- App settings (singleton row)
CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1,
  registration_open boolean NOT NULL DEFAULT true,
  draw_completed boolean NOT NULL DEFAULT false,
  event_date text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

-- Insert the default settings row
INSERT INTO app_settings (id, registration_open, draw_completed, event_date)
VALUES (1, true, false, '2026-09-12')
ON CONFLICT (id) DO NOTHING;

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  secret_code text NOT NULL UNIQUE,
  partner_id uuid REFERENCES participants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_partner CHECK (partner_id IS NULL OR partner_id != id)
);

-- Case-insensitive unique name index
CREATE UNIQUE INDEX IF NOT EXISTS participants_name_lower_idx
  ON participants (lower(trim(name)));

-- -------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------------

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- app_settings: anyone can read, only authenticated users can update
CREATE POLICY "Public read settings"
  ON app_settings FOR SELECT
  USING (true);

CREATE POLICY "Admin update settings"
  ON app_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- participants: only authenticated users (admin) can access directly.
-- All public operations go through SECURITY DEFINER functions below.
CREATE POLICY "Admin full access to participants"
  ON participants FOR ALL
  USING (auth.role() = 'authenticated');

-- -------------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- -------------------------------------------------------------------

-- Generate a unique secret code like GEM-4821
CREATE OR REPLACE FUNCTION generate_secret_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 4-digit random number, zero-padded
    code := 'GEM-' || lpad(floor(random() * 10000)::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM participants WHERE secret_code = code)
      INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- -------------------------------------------------------------------
-- 4. PUBLIC RPC FUNCTIONS (callable by anon users)
-- -------------------------------------------------------------------

-- Register a new participant
-- Returns JSON: { id, name, secret_code }
CREATE OR REPLACE FUNCTION register_participant(p_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings app_settings;
  v_participant participants;
  v_code text;
  v_clean_name text;
BEGIN
  v_clean_name := trim(p_name);

  -- Validate name
  IF v_clean_name IS NULL OR v_clean_name = '' THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;

  IF length(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'El nombre debe tener al menos 2 caracteres';
  END IF;

  IF length(v_clean_name) > 50 THEN
    RAISE EXCEPTION 'El nombre es demasiado largo';
  END IF;

  -- Check app state
  SELECT * INTO v_settings FROM app_settings WHERE id = 1;

  IF NOT v_settings.registration_open THEN
    RAISE EXCEPTION 'El registro está cerrado';
  END IF;

  IF v_settings.draw_completed THEN
    RAISE EXCEPTION 'El sorteo ya fue realizado. No se aceptan nuevos registros';
  END IF;

  -- Check duplicate name (case-insensitive)
  IF EXISTS(SELECT 1 FROM participants WHERE lower(trim(name)) = lower(v_clean_name)) THEN
    RAISE EXCEPTION 'Ya existe un participante con ese nombre. Si eres tú, contacta al organizador.';
  END IF;

  -- Generate unique code and insert
  v_code := generate_secret_code();

  INSERT INTO participants (name, secret_code)
  VALUES (v_clean_name, v_code)
  RETURNING * INTO v_participant;

  RETURN json_build_object(
    'id', v_participant.id,
    'name', v_participant.name,
    'secret_code', v_participant.secret_code
  );
END;
$$;

-- Reveal partner for a given secret code
-- Returns JSON: { participant_name, partner_name }
CREATE OR REPLACE FUNCTION reveal_partner(p_secret_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant participants;
  v_partner participants;
  v_settings app_settings;
  v_clean_code text;
BEGIN
  v_clean_code := upper(trim(p_secret_code));

  -- Check app state
  SELECT * INTO v_settings FROM app_settings WHERE id = 1;

  IF NOT v_settings.draw_completed THEN
    RAISE EXCEPTION 'El sorteo aún no se ha realizado';
  END IF;

  -- Find participant
  SELECT * INTO v_participant FROM participants WHERE secret_code = v_clean_code;

  IF v_participant.id IS NULL THEN
    RAISE EXCEPTION 'Código secreto inválido. Verifica e intenta de nuevo.';
  END IF;

  IF v_participant.partner_id IS NULL THEN
    RAISE EXCEPTION 'Aún no tienes pareja asignada. Contacta al organizador.';
  END IF;

  -- Get partner
  SELECT * INTO v_partner FROM participants WHERE id = v_participant.partner_id;

  RETURN json_build_object(
    'participant_name', v_participant.name,
    'partner_name', v_partner.name
  );
END;
$$;

-- Get participant count (public)
CREATE OR REPLACE FUNCTION get_participant_count()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT count(*)::int FROM participants);
END;
$$;

-- -------------------------------------------------------------------
-- 5. ADMIN RPC FUNCTIONS (require authenticated session)
-- -------------------------------------------------------------------

-- Get all participants (admin only)
CREATE OR REPLACE FUNCTION get_participants_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', id,
        'name', name,
        'secret_code', secret_code,
        'partner_id', partner_id,
        'created_at', created_at
      ) ORDER BY created_at
    ) FROM participants),
    '[]'::json
  );
END;
$$;

-- Toggle registration open/closed (admin only)
CREATE OR REPLACE FUNCTION toggle_registration(p_open boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE app_settings
  SET registration_open = p_open, updated_at = now()
  WHERE id = 1;
END;
$$;

-- Perform the random pairing draw (admin only)
-- Uses advisory lock to prevent concurrent execution
CREATE OR REPLACE FUNCTION perform_draw()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_ids uuid[];
  v_shuffled uuid[];
  i int;
  v_settings app_settings;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Acquire advisory lock (prevents concurrent draws)
  PERFORM pg_advisory_xact_lock(73638105);

  -- Check state
  SELECT * INTO v_settings FROM app_settings WHERE id = 1;

  IF v_settings.registration_open THEN
    RAISE EXCEPTION 'El registro debe estar cerrado antes de realizar el sorteo';
  END IF;

  IF v_settings.draw_completed THEN
    RAISE EXCEPTION 'El sorteo ya fue realizado. Reinícialo primero si quieres repetirlo.';
  END IF;

  -- Count participants
  SELECT count(*)::int INTO v_count FROM participants;

  IF v_count < 2 THEN
    RAISE EXCEPTION 'Se necesitan al menos 2 participantes para el sorteo';
  END IF;

  IF v_count % 2 != 0 THEN
    RAISE EXCEPTION 'Se necesita un número par de participantes. Actualmente hay %', v_count;
  END IF;

  -- Shuffle participant IDs
  SELECT array_agg(id ORDER BY random())
  INTO v_shuffled
  FROM participants;

  -- Clear any existing pairings
  UPDATE participants SET partner_id = NULL;

  -- Create pairs: (1,2), (3,4), (5,6), ...
  FOR i IN 1..array_length(v_shuffled, 1) BY 2 LOOP
    UPDATE participants SET partner_id = v_shuffled[i+1] WHERE id = v_shuffled[i];
    UPDATE participants SET partner_id = v_shuffled[i] WHERE id = v_shuffled[i+1];
  END LOOP;

  -- Mark draw as completed
  UPDATE app_settings
  SET draw_completed = true, updated_at = now()
  WHERE id = 1;

  RETURN json_build_object('success', true, 'pairs', v_count / 2);
END;
$$;

-- Reset the draw (admin only)
CREATE OR REPLACE FUNCTION reset_draw()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE participants SET partner_id = NULL;
  UPDATE app_settings
  SET draw_completed = false, updated_at = now()
  WHERE id = 1;
END;
$$;

-- Update event date (admin only)
CREATE OR REPLACE FUNCTION update_event_date(p_date text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE app_settings
  SET event_date = trim(p_date), updated_at = now()
  WHERE id = 1;
END;
$$;

-- -------------------------------------------------------------------
-- 6. GRANT EXECUTE (ensure anon can call public functions)
-- -------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION register_participant(text) TO anon;
GRANT EXECUTE ON FUNCTION reveal_partner(text) TO anon;
GRANT EXECUTE ON FUNCTION get_participant_count() TO anon;

GRANT EXECUTE ON FUNCTION get_participants_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_registration(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION perform_draw() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_draw() TO authenticated;
GRANT EXECUTE ON FUNCTION update_event_date(text) TO authenticated;
