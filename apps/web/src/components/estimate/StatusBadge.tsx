import type { EstimateStatus } from '@furnix/shared';
import { Badge, type BadgeTone } from '@/components/ui';

const STATUS_TONES: Record<EstimateStatus, BadgeTone> = {
  DRAFT: 'neutral',
  SENT: 'info',
  ACCEPTED: 'ok',
  REJECTED: 'danger',
  EXPIRED: 'warn',
};

const STATUS_LABELS: Record<EstimateStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

export function StatusBadge({ status }: { status: EstimateStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function HostingBadge({ hostingModel }: { hostingModel: string }) {
  return (
    <Badge tone={hostingModel === 'VLOQ_CLOUD' ? 'gold' : 'neutral'}>
      {hostingModel === 'VLOQ_CLOUD' ? 'Cloud' : 'Self-hosted'}
    </Badge>
  );
}
