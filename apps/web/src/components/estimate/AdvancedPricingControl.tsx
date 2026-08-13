import { Lock, MoreVertical, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Permission, type AdjustmentScope, type AdjustmentType } from '@furnix/shared';
import { Button, NumberInput, Select, Textarea } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { cx, inr } from '@/lib/format';

export interface AdjustmentState {
  type: AdjustmentType;
  value: number;
  scope: AdjustmentScope;
  note?: string | null;
}

export const EMPTY_ADJUSTMENT: AdjustmentState = {
  type: 'NONE',
  value: 0,
  scope: 'ONE_TIME',
  note: null,
};

const SCOPE_LABELS: Record<AdjustmentScope, string> = {
  ONE_TIME: 'One-time charges',
  RECURRING: 'Monthly recurring charges',
  BOTH: 'Both, split proportionally',
};

/**
 * Internal price adjustment.
 *
 * Deliberately tucked behind an overflow menu rather than sitting in the form
 * flow: it is an internal commercial lever, not part of building the estimate.
 * The control renders nothing at all for roles without the permission — not a
 * disabled button, which would advertise that the lever exists.
 *
 * The adjusted taxable amount is what appears on the client document. There is
 * no deduction line anywhere in the client-facing output, and the word the
 * business avoids is not used in this UI.
 */
export function AdvancedPricingControl({
  value,
  onChange,
  oneTimeAdjustment,
  recurringAdjustment,
  disabled,
}: {
  value: AdjustmentState;
  onChange: (next: AdjustmentState) => void;
  oneTimeAdjustment: number;
  recurringAdjustment: number;
  disabled?: boolean;
}) {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const PANEL_WIDTH = 336;
  const GUTTER = 12;

  /**
   * Anchor the panel to the trigger in viewport coordinates.
   *
   * The panel renders through a portal rather than inside the ledger card. The
   * card clips its children so the rounded corners stay clean, which was
   * silently cutting the panel in half. A portal escapes that clip, and fixed
   * positioning lets the panel flip to stay on screen in the narrow sidebar
   * instead of running off the left edge.
   */
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - GUTTER * 2);

    // Prefer right-aligned to the trigger, then clamp inside the viewport.
    let left = rect.right - width;
    left = Math.min(Math.max(left, GUTTER), window.innerWidth - width - GUTTER);

    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + 8;
    const fitsBelow = below + panelHeight + GUTTER <= window.innerHeight;
    const top = fitsBelow ? below : Math.max(GUTTER, rect.top - panelHeight - 8);

    setPosition({ top, left });
  }, [oneTimeAdjustment, recurringAdjustment]);

  const setPanelRef = useCallback((node: HTMLDivElement | null) => {
    panelRef.current = node;
    if (node) {
      reposition();
      requestAnimationFrame(() => {
        reposition();
      });
    }
  }, [reposition]);

  // Keep the panel aligned when open, or when contents/value changes.
  useEffect(() => {
    if (open) {
      reposition();
    }
  }, [open, value, reposition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // Sticky ledger + scrollable page: keep the panel glued to its trigger.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  if (!can(Permission.ADJUSTMENT_VIEW)) return null;

  const mayEdit = can(Permission.ADJUSTMENT_MANAGE) && !disabled;
  const active = value.type !== 'NONE' && value.value > 0;
  const totalApplied = oneTimeAdjustment + recurringAdjustment;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Advanced pricing"
        className={cx(
          'flex size-8 items-center justify-center rounded-lg border transition-colors',
          active
            ? 'border-gold bg-gold-soft text-gold-deep'
            : 'border-line bg-surface text-ink-mute hover:text-ink',
        )}
      >
        <MoreVertical size={15} />
      </button>

      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-0.5 -top-0.5 size-2 rounded-full bg-gold ring-2 ring-surface"
        />
      )}

      {open &&
        createPortal(
          <div
            ref={setPanelRef}
            role="dialog"
            aria-label="Advanced pricing"
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              width: `min(${PANEL_WIDTH}px, calc(100vw - ${GUTTER * 2}px))`,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="fixed z-50 max-h-[min(32rem,calc(100vh-1.5rem))] overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-lift"
          >
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-gold-deep" />
            <h3 className="font-display text-[13px] font-bold text-ink">Advanced pricing</h3>
            <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-line-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-mute">
              <Lock size={9} />
              Internal
            </span>
          </div>

          <p className="mb-3 text-[11.5px] leading-relaxed text-ink-soft">
            Reduces the taxable amount before GST. The estimate shows the adjusted taxable figure
            directly — this never appears as a line on the client document.
          </p>

          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-ink">
              Basis
              <Select
                className="mt-1 h-9"
                disabled={!mayEdit}
                value={value.type}
                onChange={(event) =>
                  onChange({ ...value, type: event.target.value as AdjustmentType })
                }
              >
                <option value="NONE">Not applied</option>
                <option value="PERCENT">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </Select>
            </label>

            {value.type !== 'NONE' && (
              <>
                <label className="block text-[12px] font-medium text-ink">
                  {value.type === 'PERCENT' ? 'Percentage' : 'Amount in ₹'}
                  <NumberInput
                    className="mt-1 h-9"
                    disabled={!mayEdit}
                    value={value.value || ''}
                    max={value.type === 'PERCENT' ? 100 : undefined}
                    onChange={(event) => onChange({ ...value, value: Number(event.target.value) })}
                  />
                </label>

                <label className="block text-[12px] font-medium text-ink">
                  Applies to
                  <Select
                    className="mt-1 h-9"
                    disabled={!mayEdit}
                    value={value.scope}
                    onChange={(event) =>
                      onChange({ ...value, scope: event.target.value as AdjustmentScope })
                    }
                  >
                    {(Object.keys(SCOPE_LABELS) as AdjustmentScope[]).map((scope) => (
                      <option key={scope} value={scope}>
                        {SCOPE_LABELS[scope]}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="block text-[12px] font-medium text-ink">
                  Reason (internal audit trail)
                  <Textarea
                    className="mt-1 min-h-16 text-[12px]"
                    disabled={!mayEdit}
                    placeholder="Competitive close, volume commitment, existing customer…"
                    value={value.note ?? ''}
                    onChange={(event) => onChange({ ...value, note: event.target.value })}
                  />
                </label>

                {totalApplied > 0 && (
                  <dl className="rounded-lg border border-line bg-canvas p-2.5 text-[12px]">
                    {oneTimeAdjustment > 0 && (
                      <div className="flex justify-between py-0.5">
                        <dt className="text-ink-soft">Applied to one-time</dt>
                        <dd className="figure font-semibold">−{inr(oneTimeAdjustment / 100)}</dd>
                      </div>
                    )}
                    {recurringAdjustment > 0 && (
                      <div className="flex justify-between py-0.5">
                        <dt className="text-ink-soft">Applied to monthly</dt>
                        <dd className="figure font-semibold">−{inr(recurringAdjustment / 100)}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex justify-between gap-2">
            {mayEdit && active ? (
              <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_ADJUSTMENT)}>
                Remove
              </Button>
            ) : (
              <span />
            )}
            <Button size="sm" variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>

          {!mayEdit && (
            <p className="mt-2 text-[11px] text-ink-mute">
              You can see this figure but not change it.
            </p>
          )}
          </div>,
          document.body,
        )}
    </div>
  );
}
