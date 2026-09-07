import { Badge } from './ui/Badge';

interface StatusBadgeProps {
  registrationOpen: boolean;
  drawCompleted: boolean;
}

export function StatusBadge({ registrationOpen, drawCompleted }: StatusBadgeProps) {
  if (drawCompleted) {
    return <Badge variant="success">🎉 ¡Sorteo realizado!</Badge>;
  }

  if (!registrationOpen) {
    return <Badge variant="warning">🔒 Registro cerrado</Badge>;
  }

  return <Badge variant="info">🟢 Registro abierto</Badge>;
}
