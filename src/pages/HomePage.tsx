import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Loading } from '../components/ui/Loading';
import { StatusBadge } from '../components/StatusBadge';
import { useAppSettings } from '../hooks/useAppSettings';
import { EVENT_CONFIG } from '../config/event';
import { useEffect, useState } from 'react';
import { getParticipantCount } from '../services/supabase';

export function HomePage() {
  const { settings, loading, error } = useAppSettings();
  const [participantCount, setParticipantCount] = useState<number | null>(null);

  useEffect(() => {
    getParticipantCount()
      .then(setParticipantCount)
      .catch(() => {});
  }, []);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="pt-20 text-center">
        <Card>
          <p className="text-red-500 font-medium">❌ {error}</p>
          <p className="text-gray-500 mt-2 text-sm">
            Verifica tu conexión e intenta de nuevo.
          </p>
        </Card>
      </div>
    );
  }

  const eventDate = settings?.event_date
    ? new Date(settings.event_date + 'T12:00:00')
    : null;
  const formattedDate =
    eventDate && !isNaN(eventDate.getTime())
      ? eventDate.toLocaleDateString('es', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : null;

  return (
    <div className="pt-6 sm:pt-10 md:pt-16 space-y-6 sm:space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center space-y-3 sm:space-y-4"
      >
        <span className="inline-block text-4xl sm:text-5xl mb-1">
          {EVENT_CONFIG.emoji}
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
          {EVENT_CONFIG.name.toUpperCase()}
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-600 max-w-sm sm:max-w-md mx-auto px-2">
          {EVENT_CONFIG.tagline}
        </p>
      </motion.div>

      


      {/* Status & Date */}
      {settings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <StatusBadge
            registrationOpen={settings.registration_open}
            drawCompleted={settings.draw_completed}
          />

          {formattedDate && (
            <p className="text-gray-500 font-medium">
              {EVENT_CONFIG.eventDateLabel} &mdash;{' '}
              <span className="text-gray-800 capitalize">{formattedDate}</span>
            </p>
          )}

          {participantCount !== null && participantCount > 0 && (
            <p className="text-sm text-gray-400">
              {participantCount} participante{participantCount !== 1 ? 's' : ''} registrado{participantCount !== 1 ? 's' : ''}
            </p>
          )}
        </motion.div>
      )}

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3"
      >
        {settings?.registration_open && !settings.draw_completed && (
          <Link to="/participar">
            <Button variant="primary" size="lg" className="w-full">
              ✋ QUIERO PARTICIPAR
            </Button>
          </Link>
        )}

        {settings?.draw_completed && (
          <Link to="/descubrir">
            <Button variant="primary" size="lg" className="w-full">
              🔍 DESCUBRIR MI GEMELO
            </Button>
          </Link>
        )}

        {!settings?.registration_open && !settings?.draw_completed && (
          <div className="text-center py-2">
            <p className="text-gray-500 font-medium">
              🔒 El registro está cerrado. El sorteo será pronto.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
