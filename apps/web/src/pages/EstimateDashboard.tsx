import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EstimateStatus } from '@furnix/shared';
import { Permission } from '@furnix/shared';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useEstimateSummary } from '@/hooks/useEstimates';
import { EstimateList } from '@/components/estimate/EstimateList';
import { cx, inr } from '@/lib/format';

export default function EstimateDashboard() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { data: summary } = useEstimateSummary();

  const countFor = (status: EstimateStatus) =>
    summary?.byStatus.find((row) => row.status === status)?.count ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Estimates"
        description="Every estimate issued from Furnix, with its current status and what it is worth."
        actions={
          can(Permission.ESTIMATE_CREATE) && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/estimates/new')}>
              New estimate
            </Button>
          )
        }
      />

      {/* Pipeline strip — two values, never added together. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="One-time pipeline" value={inr(summary?.pipelineOneTime)} hint="Sent and accepted" />
        <StatTile
          label="Monthly recurring"
          value={inr(summary?.pipelineMonthly)}
          hint="Per month, sent and accepted"
          accent
        />
        <StatTile label="Awaiting response" value={String(countFor('SENT'))} hint="Sent, not yet answered" plain />
        <StatTile
          label="Expiring this week"
          value={String(summary?.expiringWithin7Days ?? 0)}
          hint="Validity ends within 7 days"
          plain
          warn={(summary?.expiringWithin7Days ?? 0) > 0}
        />
      </div>

      <EstimateList initialPageSize={10} showViewAllLink={true} hidePagination={true} />
    </>
  );
}

function StatTile({
  label,
  value,
  hint,
  accent,
  plain,
  warn,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  plain?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={cx('card p-4', accent && 'border-gold/30 bg-gold-soft/30')}>
      <p className="eyebrow">{label}</p>
      <p
        className={cx(
          'mt-1.5 font-bold tracking-tight',
          plain ? 'font-display text-[22px]' : 'figure text-[19px]',
          accent ? 'text-gold-deep' : warn ? 'text-warn' : 'text-ink',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11.5px] text-ink-mute">{hint}</p>
    </div>
  );
}
