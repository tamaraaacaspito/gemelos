import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';
import { StatusBadge } from '../components/StatusBadge';
import { useAppSettings } from '../hooks/useAppSettings';
import { registerParticipant } from '../services/supabase';
import type { RegisterResult } from '../types';

export function RegisterPage() {
  const { settings, loading: settingsLoading } = useAppSettings();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);

  if (settingsLoading) return <Loading />;

  // Registration closed or draw completed
  if (settings && (!settings.registration_open || settings.draw_completed)) {
    return (
      <div className="w-full my-auto py-2 sm:py-4 space-y-4">
        <Card>
          <div className="text-center space-y-4">
            <StatusBadge
              registrationOpen={settings.registration_open}
              drawCompleted={settings.draw_completed}
            />
            <p className="text-gray-600 mt-4">
              {settings.draw_completed
                ? 'El sorteo ya fue realizado. Si ya estás registrado, puedes descubrir tu gemelo.'
                : 'El registro está cerrado por el momento. Contacta al organizador si necesitas registrarte.'}
            </p>
            {settings.draw_completed && (
              <Link to="/descubrir">
                <Button variant="primary" className="mt-2">
                  🔍 Descubrir mi gemelo
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Success screen
  if (result) {
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(result.secret_code);
        toast.success('¡Código copiado!');
      } catch {
        // Fallback for browsers that don't support clipboard API
        toast.error('No se pudo copiar. Anota tu código manualmente.');
      }
    };

    return (
      <div className="w-full my-auto py-2 sm:py-4 space-y-4">
        <Card>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center space-y-6"
          >
            <span className="text-6xl block">🎉</span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
              ¡Ya estás dentro!
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              ¡Te has registrado con éxito como <strong className="text-violet-700">{result.name}</strong>! Cuando se realice el sorteo, podrás descubrir tu gemelo seleccionando tu nombre en la lista.
            </p>

            {/* Secret Code Display (optional receipt) */}
            <div className="bg-gradient-to-r from-violet-100 to-cyan-100 rounded-2xl p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-gray-500 mb-1 font-medium">Tu código de registro (respaldo)</p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-black text-violet-700 tracking-wider">
                {result.secret_code}
              </p>
            </div>

            <div className="space-y-3">
              <Link to="/descubrir" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  🔍 IR A DESCUBRIR MI GEMELO
                </Button>
              </Link>
              <Button onClick={handleCopy} variant="ghost" size="sm" className="w-full text-gray-500">
                📋 Copiar código de respaldo
              </Button>
            </div>
          </motion.div>
        </Card>
      </div>
    );
  }

  // Registration form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es obligatorio');
      return;
    }
    if (trimmed.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (trimmed.length > 50) {
      setError('El nombre es demasiado largo');
      return;
    }

    try {
      setLoading(true);
      const data = await registerParticipant(trimmed);
      setResult(data);
      toast.success(`¡Bienvenido/a, ${data.name}!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrarse';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full my-auto py-2 sm:py-4 space-y-4">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <span className="text-5xl block mb-4">✋</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Registrarse
            </h2>
            <p className="text-gray-500 mt-2">
              Únete a la dinámica de gemelos
            </p>
          </div>

          <Input
            label="¿Cuál es tu nombre?"
            placeholder="Ej: Tamara"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            error={error}
            maxLength={50}
            autoFocus
            autoComplete="name"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            PARTICIPAR
          </Button>
        </form>
      </Card>
    </div>
  );
}
