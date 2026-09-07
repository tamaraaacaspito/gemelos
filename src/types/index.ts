export interface Participant {
  id: string;
  name: string;
  secret_code: string;
  partner_id: string | null;
  created_at: string;
}

export interface AppSettings {
  id: number;
  registration_open: boolean;
  draw_completed: boolean;
  event_date: string;
  updated_at: string;
}

export interface RegisterResult {
  id: string;
  name: string;
  secret_code: string;
}

export interface RevealResult {
  participant_name: string;
  partner_name: string;
}

export interface PublicParticipant {
  id: string;
  name: string;
}
