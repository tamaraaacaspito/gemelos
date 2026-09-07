import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Loading } from '../components/ui/Loading';
import { useAppSettings } from '../hooks/useAppSettings';
import { revealPartner, getPublicParticipants } from '../services/supabase';
import { getWhatsAppMessage } from '../config/event';
import type { RevealResult, PublicParticipant } from '../types';

type Phase = 'input' | 'countdown' | 'reveal';

export function RevealPage() {
  const { settings, loading: settingsLoading } = useAppSettings();
  const [participants, setParticipants] = useState<PublicParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('input');
  const [countdownNum, setCountdownNum] = useState(3);
  const [result, setResult] = useState<RevealResult | null>(null);

  // Fetch registered participant names for dropdown
  useEffect(() => {
    if (settings?.draw_completed) {
      setLoadingParticipants(true);
      getPublicParticipants()
        .then((data) => setParticipants(data))
        .catch((err) => {
          console.error(err);
          toast.error('No se pudo cargar la lista de participantes');
        })
        .finally(() => setLoadingParticipants(false));
    }
  }, [settings?.draw_completed]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdownNum <= 0) {
      setPhase('reveal');
      return;
    }

    const timer = setTimeout(() => {
      setCountdownNum((n) => n - 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [phase, countdownNum]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      const trimmed = selectedName.trim();
      if (!trimmed) {
        setError('Por favor selecciona tu nombre de la lista');
        return;
      }

      try {
        setLoading(true);
        const data = await revealPartner(trimmed);
        setResult(data);
        setCountdownNum(3);
        setPhase('countdown');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al buscar tu pareja';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [selectedName]
  );

  if (settingsLoading) return <Loading />;

  // Draw hasn't happened yet
  if (settings && !settings.draw_completed) {
    return (
      <div className="w-full my-auto py-4">
        <Card>
          <div className="text-center space-y-4">
            <span className="text-5xl block">⏳</span>
            <h2 className="text-2xl font-bold text-gray-800">
              El sorteo aún no se ha realizado
            </h2>
            <p className="text-gray-500">
              Espera a que la organizadora cierre el registro y realice el sorteo.
              ¡Pronto sabrás quién es tu gemelo!
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full my-auto py-2 sm:py-4 space-y-4">
      <AnimatePresence mode="wait">
        {/* Phase 1: Name Selection */}
        {phase === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="text-center">
                  <span className="text-4xl sm:text-5xl block mb-3">✨</span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
                    ¿QUIÉN ES TU GEMELO?
                  </h2>
                  <p className="text-gray-500 mt-2 text-sm sm:text-base leading-relaxed">
                    Selecciona tu nombre en la lista para descubrir con quién tendrás que coordinar tu outfit.
                  </p>
                </div>

                {loadingParticipants ? (
                  <Loading text="Cargando participantes..." />
                ) : (
                  <div className="space-y-2">
                    <label
                      htmlFor="participant-select"
                      className="block text-sm font-semibold text-gray-700"
                    >
                      ¿Quién eres tú?
                    </label>

                    <div className="relative">
                      <select
                        id="participant-select"
                        value={selectedName}
                        onChange={(e) => {
                          setSelectedName(e.target.value);
                          setError('');
                        }}
                        className={`
                          w-full px-4 py-3.5 rounded-xl border-2 appearance-none
                          bg-white text-gray-900 font-medium text-base
                          shadow-sm cursor-pointer
                          transition-all duration-200
                          focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                          ${error ? 'border-red-400 bg-red-50' : 'border-violet-200 hover:border-violet-400'}
                        `}
                      >
                        <option value="">-- Elige tu nombre --</option>
                        {participants.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      {/* Dropdown chevron icon */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-violet-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-red-500 font-medium mt-1">{error}</p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  disabled={!selectedName || loadingParticipants}
                  className="w-full"
                >
                  🔍 DESCUBRIR MI GEMELO
                </Button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Phase 2: Countdown */}
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <motion.p
              className="text-2xl text-gray-500 font-semibold mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              🤫 TU GEMELO ESTÁ...
            </motion.p>

            <AnimatePresence mode="wait">
              {countdownNum > 0 ? (
                <motion.span
                  key={countdownNum}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="text-8xl md:text-9xl font-black bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent"
                >
                  {countdownNum}
                </motion.span>
              ) : (
                <motion.span
                  key="star"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="text-8xl"
                >
                  ✨
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Phase 3: Reveal */}
        {phase === 'reveal' && result && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Card>
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-4xl sm:text-5xl block mb-2">🎉</span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                    ¡TU GEMELO ES!
                  </h2>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                  className="bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl p-6 sm:p-8 shadow-md"
                >
                  <p className="text-2xl sm:text-4xl md:text-5xl font-black text-white break-words tracking-tight leading-tight">
                    {result.partner_name}
                  </p>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-gray-600 text-base sm:text-lg"
                >
                  Ahora tienen una misión: ¡coordinen sus outfits y vengan combinados! ✨
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          getWhatsAppMessage(result.participant_name)
                        );
                        toast.success('¡Mensaje copiado al portapapeles! 🎉');
                      } catch {
                        toast.error('No se pudo copiar automáticamente.');
                      }
                    }}
                    variant="secondary"
                    size="lg"
                    className="w-full shadow-lg shadow-cyan-500/25"
                  >
                    📋 COPIAR MENSAJE PARA MI GEMELO
                  </Button>

                  <Button
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={() => {
                      setPhase('input');
                      setSelectedName('');
                      setResult(null);
                    }}
                  >
                    🔄 Consultar otro nombre
                  </Button>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
