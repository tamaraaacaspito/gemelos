-- Delete a participant (admin only)
CREATE OR REPLACE FUNCTION delete_participant(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'No autorizado: se requieren privilegios de administrador';
  END IF;

  DELETE FROM participants WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participante no encontrado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION delete_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_participant(uuid) TO authenticated;
