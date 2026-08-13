import { Check } from 'lucide-react';
import type { HostingModel } from '@furnix/shared';
import { cx, inr } from '@/lib/format';
import type { SelectableModule } from '@/types';

export interface ModuleSelection {
  moduleId: string;
  userCount?: number;
}

/**
 * Module picker.
 * Displays modules list with select/deselect checkboxes, descriptions, and configured prices.
 */
export function ModuleSelector({
  modules,
  selections,
  hostingModel,
  onChange,
  disabled,
}: {
  modules: SelectableModule[];
  selections: ModuleSelection[];
  hostingModel: HostingModel;
  onChange: (selections: ModuleSelection[]) => void;
  disabled?: boolean;
}) {
  const isCloud = hostingModel === 'VLOQ_CLOUD';
  const selectedIds = new Set(selections.map((selection) => selection.moduleId));

  const toggle = (moduleId: string) => {
    if (disabled) return;
    onChange(
      selectedIds.has(moduleId)
        ? selections.filter((selection) => selection.moduleId !== moduleId)
        : [...selections, { moduleId, userCount: 0 }],
    );
  };

  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface">
      {modules.map((module) => {
        const selection = selections.find((entry) => entry.moduleId === module.id);
        const selected = Boolean(selection);
        const masterOneTime = isCloud ? module.cloudSetupFee : module.selfHostedSetupFee;

        return (
          <div key={module.id} className={cx('p-4 transition-colors', selected && 'bg-gold-soft/25')}>
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                aria-label={`Include ${module.name}`}
                disabled={disabled}
                onClick={() => toggle(module.id)}
                className={cx(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                  selected ? 'border-gold bg-gold text-white' : 'border-line bg-surface hover:border-ink-mute',
                )}
              >
                {selected && <Check size={13} strokeWidth={3} />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-[14px] font-semibold text-ink">{module.name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="figure text-[14px] font-semibold text-ink">
                      {inr(masterOneTime)}
                    </span>
                    <span className="text-[11px] text-ink-mute">one-time</span>
                  </div>
                </div>

                {module.description && (
                  <p className="mt-0.5 max-w-prose text-[12px] leading-relaxed text-ink-soft">
                    {module.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
