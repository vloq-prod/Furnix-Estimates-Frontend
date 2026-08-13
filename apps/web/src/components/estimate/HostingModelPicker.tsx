import { Building2, Cloud } from 'lucide-react';
import type { HostingModel } from '@furnix/shared';
import { cx } from '@/lib/format';

const OPTIONS: {
  value: HostingModel;
  label: string;
  detail: string;
  icon: typeof Cloud;
}[] = [
  {
    value: 'VLOQ_CLOUD',
    label: 'VLOQ Cloud Hosting',
    detail: 'Setup fee per module, plus a monthly amount for the licensed users.',
    icon: Cloud,
  },
  {
    value: 'CLIENT_OWNED',
    label: 'Client-Owned Server',
    detail: 'Higher one-time fee per module. No monthly per-user charge.',
    icon: Building2,
  },
];

/**
 * Switching here rewrites every line price and clears or restores the monthly
 * block, so the consequence is stated on the card rather than discovered after
 * the fact.
 */
export function HostingModelPicker({
  value,
  onChange,
  disabled,
}: {
  value: HostingModel;
  onChange: (value: HostingModel) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Hosting model</legend>
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'flex gap-3 rounded-xl border p-4 text-left transition-colors duration-150',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'border-gold bg-gold-soft/50 shadow-[inset_0_0_0_1px_var(--color-gold)]'
                : 'border-line bg-surface hover:border-ink-mute',
            )}
          >
            <Icon size={18} className={cx('mt-0.5 shrink-0', selected ? 'text-gold-deep' : 'text-ink-mute')} />
            <span>
              <span className="block text-[14px] font-semibold text-ink">{option.label}</span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">
                {option.detail}
              </span>
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
