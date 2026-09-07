import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import {
  getParticipantsAdmin,
  toggleRegistration,
  performDraw,
  resetDraw,
  updateEventDate,
} from '../services/supabase';
import type { Participant } from '../types';
import { EVENT_CONFIG } from '../config/event';

export function AdminPage() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();

  if (authLoading) return <Loading text="Verificando sesión..." />;

  if (!user) return <LoginForm onSignIn={signIn} />;

  return <AdminDashboard onSignOut={signOut} />;
}

// ---------------------------------------------------------------------------
// Login Form
// ---------------------------------------------------------------------------

function LoginForm({ onSignIn }: { onSignIn: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Ingresa email y contraseña');
      return;
    }

    try {
      setLoading(true);
      await onSignIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-12">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <span className="text-5xl block mb-4">🔐</span>
            <h2 className="text-2xl font-bold text-gray-800">
              Panel del Organizador
            </h2>
            <p className="text-gray-500 mt-1">Acceso restringido</p>
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="admin@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            error={error}
            autoComplete="current-password"
          />

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            ENTRAR
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Dashboard
// ---------------------------------------------------------------------------

function AdminDashboard({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { settings, loading: settingsLoading, refetch: refetchSettings } = useAppSettings();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState('');

  const fetchParticipants = useCallback(async () => {
    try {
      setLoadingParticipants(true);
      const data = await getParticipantsAdmin();
      setParticipants(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar participantes');
    } finally {
      setLoadingParticipants(false);
    }
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  useEffect(() => {
    if (settings?.event_date) {
      setDateValue(settings.event_date);
    }
  }, [settings?.event_date]);

  // --- Actions ---

  const handleToggleRegistration = async () => {
    if (!settings) return;
    try {
      setActionLoading(true);
      await toggleRegistration(!settings.registration_open);
      await refetchSettings();
      toast.success(
        settings.registration_open ? 'Registro cerrado' : 'Registro abierto'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDraw = async () => {
    try {
      setActionLoading(true);
      setShowDrawModal(false);
      const result = await performDraw();
      await refetchSettings();
      await fetchParticipants();
      toast.success(`¡Sorteo realizado! ${result.pairs} parejas creadas 🎉`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al realizar sorteo');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setActionLoading(true);
      setShowResetModal(false);
      await resetDraw();
      await refetchSettings();
      await fetchParticipants();
      toast.success('Sorteo reiniciado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reiniciar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDateSave = async () => {
    try {
      setActionLoading(true);
      await updateEventDate(dateValue);
      await refetchSettings();
      setEditingDate(false);
      toast.success('Fecha actualizada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar fecha');
    } finally {
      setActionLoading(false);
    }
  };

  if (settingsLoading) return <Loading />;

  // Compute pairs for display
  const pairs: [Participant, Participant][] = [];
  if (settings?.draw_completed) {
    const seen = new Set<string>();
    for (const p of participants) {
      if (p.partner_id && !seen.has(p.id)) {
        const partner = participants.find((x) => x.id === p.partner_id);
        if (partner) {
          seen.add(p.id);
          seen.add(partner.id);
          pairs.push([p, partner]);
        }
      }
    }
  }

  return (
    <div className="pt-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{EVENT_CONFIG.emoji}</span>
          <h1 className="text-2xl font-bold text-gray-800">Panel de Organizador</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={onSignOut}>
          Salir
        </Button>
      </div>

      {/* Stats */}
      {settings && (
        <div className="grid grid-cols-2 gap-4">
          <Card animate={false} className="text-center !p-4">
            <p className="text-3xl font-black text-violet-600">{participants.length}</p>
            <p className="text-sm text-gray-500 mt-1">Participantes</p>
          </Card>
          <Card animate={false} className="text-center !p-4">
            <StatusBadge
              registrationOpen={settings.registration_open}
              drawCompleted={settings.draw_completed}
            />
          </Card>
        </div>
      )}

      {/* Event Date */}
      {settings && (
        <Card animate={false}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">📅 Fecha del evento</p>
              {editingDate ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                  />
                  <Button size="sm" variant="primary" onClick={handleDateSave} loading={actionLoading}>
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDate(false)}>
                    ✕
                  </Button>
                </div>
              ) : (
                <p className="text-lg font-semibold text-gray-800 mt-1">
                  {settings.event_date || 'Sin fecha'}
                </p>
              )}
            </div>
            {!editingDate && (
              <Button size="sm" variant="ghost" onClick={() => setEditingDate(true)}>
                ✏️
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Actions */}
      {settings && (
        <Card animate={false}>
          <div className="space-y-3">
            {/* Toggle Registration */}
            {!settings.draw_completed && (
              <Button
                variant={settings.registration_open ? 'danger' : 'secondary'}
                size="md"
                className="w-full"
                onClick={handleToggleRegistration}
                loading={actionLoading}
              >
                {settings.registration_open ? '🔒 CERRAR REGISTRO' : '🟢 ABRIR REGISTRO'}
              </Button>
            )}

            {/* Draw */}
            {!settings.registration_open && !settings.draw_completed && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => setShowDrawModal(true)}
                loading={actionLoading}
                disabled={participants.length < 2}
              >
                🎲 REALIZAR SORTEO
              </Button>
            )}

            {participants.length < 2 && !settings.draw_completed && !settings.registration_open && (
              <p className="text-sm text-amber-600 text-center font-medium">
                Se necesitan al menos 2 participantes para realizar el sorteo.
              </p>
            )}

            {participants.length % 2 !== 0 && participants.length >= 2 && !settings.draw_completed && !settings.registration_open && (
              <p className="text-sm text-amber-600 text-center font-medium">
                ⚠️ Hay un número impar de participantes ({participants.length}). Se necesita un número par.
              </p>
            )}

            {/* Reset */}
            {settings.draw_completed && (
              <Button
                variant="danger"
                size="md"
                className="w-full"
                onClick={() => setShowResetModal(true)}
                loading={actionLoading}
              >
                🔄 REINICIAR SORTEO
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Pairs (after draw) */}
      {settings?.draw_completed && pairs.length > 0 && (
        <Card animate={false}>
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            🎉 Parejas ({pairs.length})
          </h3>
          <div className="space-y-2">
            {pairs.map(([a, b], i) => (
              <motion.div
                key={`${a.id}-${b.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between bg-violet-50 rounded-xl px-4 py-3"
              >
                <span className="font-semibold text-violet-700">{a.name}</span>
                <span className="text-gray-400">↔</span>
                <span className="font-semibold text-cyan-600">{b.name}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Participant List */}
      <Card animate={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            Participantes registrados
          </h3>
          <Button size="sm" variant="ghost" onClick={fetchParticipants} loading={loadingParticipants}>
            🔄
          </Button>
        </div>

        {loadingParticipants ? (
          <Loading text="Cargando participantes..." />
        ) : participants.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            Aún no hay participantes registrados.
          </p>
        ) : (
          <div className="space-y-2">
            {participants.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
              >
                <span className="font-medium text-gray-700">{p.name}</span>
                <span className="text-xs text-gray-400 font-mono">{p.secret_code}</span>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Draw Confirmation Modal */}
      <Modal
        isOpen={showDrawModal}
        onClose={() => setShowDrawModal(false)}
        title="🎲 Confirmar sorteo"
      >
        <p className="text-gray-600 mb-6">
          ¿Estás seguro? Una vez realizado el sorteo, las parejas serán asignadas aleatoriamente.
          <br /><br />
          <strong>{participants.length} participantes</strong> → <strong>{Math.floor(participants.length / 2)} parejas</strong>
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setShowDrawModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleDraw} loading={actionLoading}>
            Sí, realizar sorteo
          </Button>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="⚠️ Reiniciar sorteo"
      >
        <p className="text-gray-600 mb-6">
          Esto eliminará todas las parejas asignadas. Los participantes no podrán consultar su gemelo hasta que se realice un nuevo sorteo.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setShowResetModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleReset} loading={actionLoading}>
            Sí, reiniciar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
