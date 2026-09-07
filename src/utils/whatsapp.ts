/**
 * Generate a WhatsApp share URL with the given message text.
 * Uses the wa.me deep link which works on both mobile and desktop.
 */
export function getWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
