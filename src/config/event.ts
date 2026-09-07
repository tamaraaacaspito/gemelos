/**
 * Centralized event configuration.
 * Modify these values to customize the event details.
 * The event_date can also be updated from the admin panel at runtime.
 */
export const EVENT_CONFIG = {
  /** Name of the event/app */
  name: 'Gemelos',

  /** Main emoji */
  emoji: '👯‍♀️',

  /** Tagline shown below the title */
  tagline: 'Dos outfits. Una misión.',

  /** Description shown on the landing page */
  description:
    'Regístrate, descubre quién será tu gemelo y coordinen un outfit para venir combinados.',

  /** Default event date (ISO format). Can be overridden from admin panel. */
  defaultEventDate: '2026-09-12',

  /** Label for the event date section */
  eventDateLabel: '📅 Próxima reunión',
} as const;

/**
 * Generate the WhatsApp coordination message.
 */
export function getWhatsAppMessage(senderName: string): string {
  return [
    `¡Hola! Soy ${senderName}, tu gemelo/a de la dinámica`,
    '',
    'Nos toca hacer match este sábado.',
    '',
    '¿Coordinamos el outfit?',
  ].join('\n');
}
