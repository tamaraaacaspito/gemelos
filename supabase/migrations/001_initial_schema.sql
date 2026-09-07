-- =====================================================================
-- GEMELOS - Database Schema & RPC Functions
-- =====================================================================
-- Run this SQL in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This creates all tables, security policies, and server-side functions.
-- =====================================================================

-- -------------------------------------------------------------------
-- 1. TABLES
-- -------------------------------------------------------------------

-- Table: admin_users (whitelist of authorized administrators)
CREATE TABLE IF NOT EXISTS admin_users (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert the admin email
INSERT INTO admin_users (email)
VALUES ('admin@gemelos.app')
ON CONFLICT (email) DO NOTHING;

-- Table: app_settings (singleton row)
CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1,
  registration_open boolean NOT NULL DEFAULT true,
  draw_completed boolean NOT NULL DEFAULT false,
  event_date text NOT NULL DEFAULT '2026-09-12',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

-- Insert the default settings row if it doesn't exist
INSERT INTO app_settings (id, registration_open, draw_completed, event_date)
VALUES (1, true, false, '2026-09-12')
ON CONFLICT (id) DO NOTHING;

-- Table: participants
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
-- 2. SECURITY HELPER FUNCTION
-- -------------------------------------------------------------------

-- Checks if the authenticated user's email is in the admin_users whitelist
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
  );
END;
$$;

-- -------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------------

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- admin_users: only real admins can read/manage
DROP POLICY IF EXISTS "Admin access to admin_users" ON admin_users;
CREATE POLICY "Admin access to admin_users"
  ON admin_users FOR ALL
  USING (is_admin());

-- app_settings: anyone can read, only real admin can update
DROP POLICY IF EXISTS "Public read settings" ON app_settings;
CREATE POLICY "Public read settings"
  ON app_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin update settings" ON app_settings;
CREATE POLICY "Admin update settings"
  ON app_settings FOR UPDATE
  USING (is_admin());

-- participants: only real admins can access the table directly.
-- Public operations (register, list names for dropdown, reveal) go through RPC functions below.
DROP POLICY IF EXISTS "Admin full access to participants" ON participants;
CREATE POLICY "Admin full access to participants"
  ON participants FOR ALL
  USING (is_admin());

-- -------------------------------------------------------------------
-- 4. HELPER FUNCTIONS
-- -------------------------------------------------------------------

-- Generate a unique secret code (GEM-XXXXX with 5 digits for high entropy)
CREATE OR REPLACE FUNCTION generate_secret_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  code_exists boolean;
BEGIN
  LOOP
    -- 5-digit random number (10,000 to 99,999)
    code := 'GEM-' || (10000 + floor(random() * 90000)::int)::text;
    SELECT EXISTS(SELECT 1 FROM participants WHERE secret_code = code)
      INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- -------------------------------------------------------------------
-- 5. PUBLIC RPC FUNCTIONS (callable by anon users)
-- -------------------------------------------------------------------

-- Get list of registered participant names for dropdown selection (public)
-- Only returns id and name, NEVER secret_code or partner_id
DROP FUNCTION IF EXISTS get_public_participants();
CREATE OR REPLACE FUNCTION get_public_participants()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', id,
        'name', name
      ) ORDER BY name ASC
    ) FROM participants),
    '[]'::json
  );
END;
$$;

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
    RAISE EXCEPTION 'Ya existe un participante con ese nombre.';
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

-- Reveal partner by participant name (case-insensitive)
-- Returns JSON: { participant_name, partner_name }
DROP FUNCTION IF EXISTS reveal_partner(text);
CREATE OR REPLACE FUNCTION reveal_partner(p_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant participants;
  v_partner participants;
  v_settings app_settings;
  v_clean_name text;
BEGIN
  v_clean_name := trim(p_name);

  -- Check app state
  SELECT * INTO v_settings FROM app_settings WHERE id = 1;

  IF NOT v_settings.draw_completed THEN
    RAISE EXCEPTION 'El sorteo aún no se ha realizado';
  END IF;

  -- Find participant by name (case-insensitive) or by secret_code as fallback
  SELECT * INTO v_participant
  FROM participants
  WHERE lower(trim(name)) = lower(v_clean_name)
     OR upper(trim(secret_code)) = upper(v_clean_name)
  LIMIT 1;

  IF v_participant.id IS NULL THEN
    RAISE EXCEPTION 'Participante no encontrado. Selecciona tu nombre de la lista.';
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
-- 6. ADMIN RPC FUNCTIONS (strictly verified via is_admin())
-- -------------------------------------------------------------------

-- Get all participants with full details (admin only)
CREATE OR REPLACE FUNCTION get_participants_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado: se requieren privilegios de administrador';
  END IF;

  RETURN COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', id,
        'name', name,
        'secret_code', secret_code,
        'partner_id', partner_id,
        'created_at', created_at
      ) ORDER BY created_at ASC
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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado: se requieren privilegios de administrador';
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
  v_shuffled uuid[];
  i int;
  v_settings app_settings;
BEGIN
  -- Verify real admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado: se requieren privilegios de administrador';
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
  UPDATE participants SET partner_id = NULL WHERE id IS NOT NULL;

  -- Create reciprocal pairs: (1,2), (3,4), (5,6), ...
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
  -- Verify real admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado: se requieren privilegios de administrador';
  END IF;

  -- Acquire advisory lock to avoid race conditions with perform_draw
  PERFORM pg_advisory_xact_lock(73638105);

  UPDATE participants SET partner_id = NULL WHERE id IS NOT NULL;
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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado: se requieren privilegios de administrador';
  END IF;

  UPDATE app_settings
  SET event_date = trim(p_date), updated_at = now()
  WHERE id = 1;
END;
$$;

-- -------------------------------------------------------------------
-- 7. GRANT EXECUTE
-- -------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_public_participants() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_participant(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reveal_partner(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_participant_count() TO anon, authenticated;

GRANT EXECUTE ON FUNCTION get_participants_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_registration(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION perform_draw() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_draw() TO authenticated;
GRANT EXECUTE ON FUNCTION update_event_date(text) TO authenticated;
