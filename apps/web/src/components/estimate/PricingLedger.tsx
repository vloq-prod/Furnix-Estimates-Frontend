import { Info } from 'lucide-react';
import type { PricingResult } from '@furnix/shared';
import { Permission } from '@furnix/shared';
import { useAuth } from '@/hooks/useAuth';
import { cx, formatPaise } from '@/lib/format';
import { AdvancedPricingControl, type AdjustmentState } from './AdvancedPricingControl';

/**
 * The pricing ledger — the one thing this module is remembered by.
 *
 * Two settlements, stacked, never summed. The brief is explicit that a one-time
 * payable and a monthly payable must not be merged into a single total, so the
 * layout makes that structural: separate bordered blocks with their own headers
 * and their own bottom rules, and no combined figure anywhere in the component.
 * The monthly block carries the gold accent and a /mo suffix so the two can
 * never be misread for one another at a glance.
 */
export function PricingLedger({
  pricing,
  gstPercent,
  adjustment,
  onAdjustmentChange,
  onGstChange,
  disabled,
  sticky = true,
}: {
  pricing: PricingResult;
  gstPercent: number;
  adjustment?: AdjustmentState;
  onAdjustmentChange?: (next: AdjustmentState) => void;
  onGstChange?: (applyGst: boolean) => void;
  disabled?: boolean;
  sticky?: boolean;
}) {
  const { can } = useAuth();
  const showInternal = can(Permission.ADJUSTMENT_VIEW);
  const hasRecurring = pricing.recurringSubtotal > 0;
  const isCloud = pricing.hostingModel === 'VLOQ_CLOUD';
  const isGstApplied = Number(gstPercent) > 0;
  const effectiveGstRate = isGstApplied ? Number(gstPercent) : (pricing.gstPercent || 18);

  return (
    // No overflow-hidden here: it clipped the advanced pricing panel. The panel
    // now portals out anyway, and the inner bands round their own corners.
    <aside className={cx('card', sticky && 'lg:sticky lg:top-6')}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <p className="eyebrow">Estimate summary</p>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            {pricing.lines.length} module{pricing.lines.length === 1 ? '' : 's'} ·{' '}
            {isCloud ? 'Cloud' : 'Self-hosted'}
          </p>
        </div>
        {adjustment && onAdjustmentChange && (
          <AdvancedPricingControl
            value={adjustment}
            onChange={onAdjustmentChange}
            oneTimeAdjustment={pricing.oneTimeAdjustment}
            recurringAdjustment={pricing.recurringAdjustment}
            disabled={disabled}
          />
        )}
      </header>

      {/* ── One-time settlement ─────────────────────────────────────── */}
      <section className="px-5 py-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <p className="eyebrow">One-time charges</p>
          <span className="text-[11px] text-ink-mute">
            {/* {pricing.selectedLines.length} of {pricing.lines.length} modules */}
          </span>
        </div>

        {showInternal && pricing.oneTimeAdjustment > 0 && (
          <>
            <LedgerRow label="Module charges" value={pricing.oneTimeSubtotal} muted />
            <LedgerRow
              label="Price adjustment"
              value={-pricing.oneTimeAdjustment}
              muted
              internal
            />
          </>
        )}

        {pricing.selectedLines.length > 0 ? (
          pricing.selectedLines.map((line) => (
            <LedgerRow
              key={line.moduleId}
              label={line.moduleName}
              value={line.appliedOneTimeFee}
            />
          ))
        ) : (
          <div className="py-1 text-[13px] text-ink-mute">No modules selected</div>
        )}

        {isGstApplied && pricing.taxableOneTime > 0 && (
          <div className="mt-1 pt-1 border-t border-line/40">
            <LedgerRow label="Taxable amount" value={pricing.taxableOneTime} muted />
            <LedgerRow label={`GST (${effectiveGstRate}%)`} value={pricing.gstOneTime} muted />
          </div>
        )}

        <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-ink pt-2.5">
          <div>
            <span className="eyebrow text-ink">Net payable</span>
            <span className="ml-1.5 text-[11px] text-ink-soft normal-case font-normal">
              {isGstApplied ? '(GST Included)' : '(GST Excluded)'}
            </span>
          </div>
          <span className="figure text-[19px] font-bold tracking-tight text-ink">
            {formatPaise(isGstApplied ? pricing.netPayableOneTime : pricing.taxableOneTime)}
          </span>
        </div>
      </section>

      {/* ── Monthly settlement ──────────────────────────────────────── */}
      {hasRecurring ? (
        <>
          <div className="rule-gold" />
          <section className="bg-gold-soft/25 px-5 py-4">
            <p className="eyebrow mb-2.5">Monthly recurring charges</p>

            {/* Priced on head count alone — module selection does not touch it. */}
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className="text-ink-soft">
                {pricing.userLine.label}
                <span className="ml-1 text-ink-mute">
                  ({pricing.userLine.userCount} × {formatPaise(pricing.userLine.appliedMonthlyPerUser)})
                </span>
                {pricing.userLine.isOverridden && (
                  <span className="ml-1.5 rounded bg-gold-soft px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-gold-deep">
                    Rate overridden
                  </span>
                )}
              </span>
              <span className="figure font-medium">
                {formatPaise(pricing.userLine.lineMonthlyAmount)}
              </span>
            </div>

            {showInternal && pricing.recurringAdjustment > 0 && (
              <>
                <LedgerRow label="User charges" value={pricing.recurringSubtotal} muted />
                <LedgerRow
                  label="Price adjustment"
                  value={-pricing.recurringAdjustment}
                  muted
                  internal
                />
              </>
            )}

            <LedgerRow label="Taxable amount" value={pricing.taxableRecurring} />
            {isGstApplied && (
              <LedgerRow label={`GST (${effectiveGstRate}%)`} value={pricing.gstRecurring} />
            )}

            <div className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-gold pt-2.5">
              <div>
                <span className="eyebrow text-gold-deep">Monthly payable</span>
                <span className="ml-1.5 text-[11px] text-gold-deep/70 normal-case font-normal">
                  {isGstApplied ? '(GST Included)' : '(GST Excluded)'}
                </span>
              </div>
              <span className="figure text-[19px] font-bold tracking-tight text-gold-deep">
                {formatPaise(isGstApplied ? pricing.monthlyRecurringPayable : pricing.taxableRecurring)}
                <span className="ml-0.5 text-[11px] font-semibold text-gold-deep/70">/mo</span>
              </span>
            </div>

            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
              Billed every month for {pricing.userCount} user{pricing.userCount === 1 ? '' : 's'}. Separate from the
              one-time amount above.
            </p>
          </section>
        </>
      ) : (
        <section className="border-t border-line bg-canvas px-5 py-3.5">
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
            <Info size={13} className="mt-0.5 shrink-0 text-ink-mute" />
            {isCloud
              ? 'Add a module and a user count to see the monthly amount.'
              : 'No monthly charge on a client-owned server. The user count is recorded for sizing only.'}
          </p>
        </section>
      )}

      <footer className="border-t border-line px-5 py-3">
        {showInternal && hasRecurring && (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11.5px] text-ink-mute">First-year value (internal)</span>
            <span className="figure text-[13px] font-semibold text-ink-soft">
              {formatPaise(pricing.firstYearIndicativeValue)}
            </span>
          </div>
        )}

        <div className={cx(showInternal && hasRecurring && 'mt-2.5 pt-2.5 border-t border-line/60')}>
          <label
            className={cx(
              'flex items-center justify-between gap-3 select-none',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            )}
          >
            <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
              <input
                type="checkbox"
                checked={isGstApplied}
                disabled={disabled}
                onChange={(event) => onGstChange?.(event.target.checked)}
                className="size-4 rounded accent-[var(--color-gold)] cursor-pointer disabled:cursor-not-allowed"
              />
              <span>Apply GST ({effectiveGstRate}%)</span>
            </span>
            <span className="text-[11px] text-ink-mute">
              {isGstApplied ? 'GST Included' : 'GST Excluded'}
            </span>
          </label>
        </div>
      </footer>
    </aside>
  );
}

function LedgerRow({
  label,
  value,
  muted,
  internal,
}: {
  label: string;
  value: number;
  muted?: boolean;
  internal?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span
        className={cx(
          'text-[13px]',
          muted ? 'text-ink-mute' : 'text-ink-soft',
          internal && 'italic',
        )}
      >
        {label}
      </span>
      <span
        className={cx(
          'figure text-[13px]',
          muted ? 'text-ink-mute' : 'font-semibold text-ink',
          value < 0 && 'text-ink-mute',
        )}
      >
        {value < 0 ? `−${formatPaise(Math.abs(value))}` : formatPaise(value)}
      </span>
    </div>
  );
}
