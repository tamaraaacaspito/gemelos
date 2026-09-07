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
    <div className="w-full my-auto py-2 sm:py-4 space-y-4 sm:space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center space-y-2 sm:space-y-3"
      >
        <motion.span
          className="inline-block text-5xl sm:text-6xl mb-1 filter drop-shadow-sm"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {EVENT_CONFIG.emoji}
        </motion.span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent tracking-tight">
          {EVENT_CONFIG.name.toUpperCase()}
        </h1>

        <p className="text-base sm:text-lg md:text-xl font-medium text-gray-500 max-w-xs sm:max-w-md mx-auto">
          {EVENT_CONFIG.tagline}
        </p>
      </motion.div>

      {/* Main Dynamic Card */}
      <Card className="text-center space-y-5 sm:space-y-6 !p-6 sm:!p-8 shadow-xl shadow-violet-500/10 border border-violet-100/60 backdrop-blur-md">
        {settings && (
          <div className="space-y-3 sm:space-y-4">
            <StatusBadge
              registrationOpen={settings.registration_open}
              drawCompleted={settings.draw_completed}
            />

            {formattedDate && (
              <div>
                <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-violet-50/80 border border-violet-100/80 text-xs sm:text-sm text-gray-700 font-medium">
                  <span>📅</span>
                  <span className="capitalize">{formattedDate}</span>
                </div>
              </div>
            )}

            {participantCount !== null && participantCount > 0 && (
              <p className="text-xs sm:text-sm text-gray-400 font-medium">
                👥 {participantCount} participante{participantCount !== 1 ? 's' : ''} registrado{participantCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="pt-2">
          {settings?.registration_open && !settings.draw_completed && (
            <Link to="/participar" className="block">
              <Button variant="primary" size="lg" className="w-full text-base sm:text-lg font-bold py-3.5 sm:py-4 shadow-xl shadow-violet-500/25">
                ✋ QUIERO PARTICIPAR
              </Button>
            </Link>
          )}

          {settings?.draw_completed && (
            <Link to="/descubrir" className="block">
              <Button variant="primary" size="lg" className="w-full text-base sm:text-lg font-bold py-3.5 sm:py-4 shadow-xl shadow-violet-500/25">
                🔍 DESCUBRIR MI GEMELO
              </Button>
            </Link>
          )}

          {!settings?.registration_open && !settings?.draw_completed && (
            <div className="py-2">
              <p className="text-gray-500 font-medium text-sm sm:text-base">
                🔒 El registro está cerrado. El sorteo será pronto.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
