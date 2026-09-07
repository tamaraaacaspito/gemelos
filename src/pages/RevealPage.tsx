import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';
import { useAppSettings } from '../hooks/useAppSettings';
import { revealPartner } from '../services/supabase';
import { getWhatsAppMessage } from '../config/event';
import { getWhatsAppShareUrl } from '../utils/whatsapp';
import type { RevealResult } from '../types';

type Phase = 'input' | 'countdown' | 'reveal';

export function RevealPage() {
  const { settings, loading: settingsLoading } = useAppSettings();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('input');
  const [countdownNum, setCountdownNum] = useState(3);
  const [result, setResult] = useState<RevealResult | null>(null);

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

      const trimmed = code.trim();
      if (!trimmed) {
        setError('Ingresa tu código secreto');
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
    [code]
  );

  if (settingsLoading) return <Loading />;

  // Draw hasn't happened yet
  if (settings && !settings.draw_completed) {
    return (
      <div className="pt-12">
        <Card>
          <div className="text-center space-y-4">
            <span className="text-5xl block">⏳</span>
            <h2 className="text-2xl font-bold text-gray-800">
              El sorteo aún no se ha realizado
            </h2>
            <p className="text-gray-500">
              Espera a que el organizador cierre el registro y realice el sorteo.
              ¡Pronto sabrás quién es tu gemelo!
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-12 space-y-6">
      <AnimatePresence mode="wait">
        {/* Phase 1: Code Input */}
        {phase === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center">
                  <span className="text-5xl block mb-4">👯‍♀️</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                    ¿QUIÉN ES TU GEMELO?
                  </h2>
                  <p className="text-gray-500 mt-2">
                    Introduce tu código secreto para descubrir con quién tendrás que coordinar tu outfit.
                  </p>
                </div>

                <Input
                  label="Tu código secreto"
                  placeholder="GEM-XXXX"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  error={error}
                  maxLength={10}
                  autoFocus
                  autoComplete="off"
                  className="text-center text-xl font-mono tracking-widest"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full"
                >
                  🔍 DESCUBRIR
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
                  <span className="text-5xl block mb-2">🎉</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                    ¡TU GEMELO ES!
                  </h2>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                  className="bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl p-8"
                >
                  <p className="text-4xl md:text-5xl font-black text-white">
                    {result.partner_name}
                  </p>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-gray-600 text-lg"
                >
                  Ahora tienen una misión: ¡coordinen sus outfits y vengan combinados! 👯‍♀️
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="space-y-3"
                >
                  <a
                    href={getWhatsAppShareUrl(getWhatsAppMessage(result.participant_name))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="secondary" size="lg" className="w-full">
                      💬 COMPARTIR POR WHATSAPP
                    </Button>
                  </a>

                  <Button
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={() => {
                      setPhase('input');
                      setCode('');
                      setResult(null);
                    }}
                  >
                    🔄 Consultar otro código
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
