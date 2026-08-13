import { useMemo, useState } from 'react';
import { Eye, Save, Send } from 'lucide-react';
import { calculateEstimate, type HostingModel, type PricingResult } from '@furnix/shared';
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  SkeletonRows,
  Textarea,
} from '@/components/ui';
import { useSelectableModules } from '@/hooks/useModules';
import { useSettings } from '@/hooks/useSettings';
import { addDays, toDateInput } from '@/lib/format';
import type { EstimatePayload } from '@/types';
import { EMPTY_ADJUSTMENT, type AdjustmentState } from './AdvancedPricingControl';
import { ModuleSelector, type ModuleSelection } from './ModuleSelector';
import { PricingLedger } from './PricingLedger';
import type { ClauseDraft } from './TermsBuilder';

export interface EstimateFormState {
  estimateDate: string;
  validUntil: string;
  clientCompanyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  billingAddress: string;
  gstin: string;
  hostingModel: HostingModel;
  userCount: number;
  /** Per-estimate override of the configured platform user rate. */
  userRateOverride?: number | null;
  gstPercent: number;
  modules: ModuleSelection[];
  clauses: ClauseDraft[];
  notes: string;
  adjustment: AdjustmentState;
}

export function emptyFormState(validityDays = 30): EstimateFormState {
  const today = new Date();
  return {
    estimateDate: toDateInput(today),
    validUntil: toDateInput(addDays(today, validityDays)),
    clientCompanyName: '',
    contactPerson: '',
    email: '',
    mobile: '',
    billingAddress: '',
    gstin: '',
    hostingModel: 'VLOQ_CLOUD',
    userCount: 10,
    gstPercent: 18,
    modules: [],
    clauses: [],
    notes: '',
    adjustment: EMPTY_ADJUSTMENT,
  };
}

export function toPayload(state: EstimateFormState): EstimatePayload {
  return {
    estimateDate: state.estimateDate,
    validUntil: state.validUntil,
    clientCompanyName: state.clientCompanyName.trim(),
    contactPerson: state.contactPerson.trim(),
    email: state.email.trim(),
    mobile: state.mobile.trim(),
    billingAddress: state.billingAddress.trim(),
    gstin: state.gstin.trim() || null,
    hostingModel: state.hostingModel,
    userCount: state.userCount,
    gstPercent: state.gstPercent,
    userRateOverride: state.userRateOverride ?? null,
    modules: state.modules.map((selection, index) => ({
      moduleId: selection.moduleId,
      overrideOneTimeFee: null,
      sequence: index,
      userCount: 0,
    })),
    clauses: state.clauses.map((clause, index) => ({ ...clause, sequence: index })),
    notes: state.notes.trim() || null,
    ...(state.adjustment.type !== 'NONE' ? { adjustment: state.adjustment } : {}),
  };
}

export function EstimateForm({
  state,
  onChange,
  onSaveDraft,
  onPreview,
  onSaveAndSend,
  saving,
  fieldErrors = {},
  readOnly,
  heading,
}: {
  state: EstimateFormState;
  onChange: (next: EstimateFormState) => void;
  onSaveDraft: () => void;
  onPreview?: () => void;
  onSaveAndSend?: () => void;
  saving?: boolean;
  fieldErrors?: Record<string, string>;
  readOnly?: boolean;
  heading: string;
}) {
  const { data: modules, isLoading: modulesLoading } = useSelectableModules();
  const { data: settings } = useSettings();
  const [showNotes, setShowNotes] = useState(Boolean(state.notes));

  const patch = <K extends keyof EstimateFormState>(key: K, value: EstimateFormState[K]) =>
    onChange({ ...state, [key]: value });

  /**
   * Live pricing runs the same engine the API runs, so the ledger on screen and
   * the row written to PostgreSQL are computed by identical code rather than two
   * implementations that drift apart.
   */
  const pricing: PricingResult = useMemo(
    () =>
      calculateEstimate({
        hostingModel: state.hostingModel,
        userCount: state.userCount,
        gstPercent: state.gstPercent,
        // The whole catalogue goes in, flagged by selection. Unselected modules
        // price to zero but still appear on the preview and the PDF.
        modules: (modules ?? []).map((module, index) => {
          const selection = state.modules.find((entry) => entry.moduleId === module.id);
          return {
            moduleId: module.id,
            moduleCode: module.code,
            moduleName: module.name,
            moduleDescription: module.description,
            sequence: index,
            cloudSetupFee: module.cloudSetupFee,
            selfHostedSetupFee: module.selfHostedSetupFee,
            isSelected: Boolean(selection),
            overrideOneTimeFee: null,
            userCount: 0,
          };
        }),
        userPricing: {
          monthlyPricePerUser: settings?.monthlyPricePerUser ?? 0,
          overrideMonthlyPerUser: state.userRateOverride ?? null,
          label: settings?.userLineLabel ?? null,
        },
        adjustment: state.adjustment.type === 'NONE' ? null : state.adjustment,
      }),
    [modules, settings, state],
  );

  const canSubmit = state.modules.length > 0 && state.clientCompanyName.trim().length > 1;

  return (
    <div className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-5">
        <Card>
          <CardHeader
            eyebrow="Step 1"
            title="Modules"
            description="Pick what the client is buying. Prices can be adjusted for this estimate without touching the Module Master."
          />
          {modulesLoading ? (
            <SkeletonRows rows={4} />
          ) : (
            <>
              <ModuleSelector
                modules={modules ?? []}
                selections={state.modules}
                hostingModel={state.hostingModel}
                disabled={readOnly}
                onChange={(selections) => patch('modules', selections)}
              />

              {/* Platform Users Settings Card */}
              <div className="mt-8 rounded-[16px] border border-line bg-[#F8FAFC] p-6">
                <div className="flex items-start gap-3">
                  <span className="text-lg">👥</span>
                  <div>
                    <h4 className="text-[15px] font-semibold text-ink">Platform Users</h4>
                    <p className="mt-1 text-[13px] text-ink-soft">
                      Number of users who will be using the platform.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line/60 pt-6">
                  <span className="text-[14px] font-medium text-ink">Number of Users</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={readOnly || state.userCount <= 1}
                      onClick={() => patch('userCount', Math.max(1, state.userCount - 1))}
                      className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-ink hover:bg-canvas disabled:opacity-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      disabled={readOnly}
                      value={state.userCount}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        patch('userCount', val);
                      }}
                      className="w-16 rounded-lg border border-line bg-surface py-1.5 text-center text-[14px] font-semibold text-ink focus:border-gold focus:outline-none no-spinner"
                    />
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => patch('userCount', state.userCount + 1)}
                      className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-ink hover:bg-canvas"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {fieldErrors.modules && (
            <p className="mt-2 text-[12px] text-danger" role="alert">
              {fieldErrors.modules}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader
            eyebrow="Step 2"
            title="Client details"
            description="These appear at the top of the estimate document."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client / company name" required error={fieldErrors.clientCompanyName} className="sm:col-span-2">
              {(props) => (
                <Input
                  {...props}
                  value={state.clientCompanyName}
                  disabled={readOnly}
                  placeholder="Ridhi Modular Interiors Pvt Ltd"
                  onChange={(event) => patch('clientCompanyName', event.target.value)}
                />
              )}
            </Field>

            <Field label="Contact person" error={fieldErrors.contactPerson}>
              {(props) => (
                <Input
                  {...props}
                  value={state.contactPerson}
                  disabled={readOnly}
                  onChange={(event) => patch('contactPerson', event.target.value)}
                />
              )}
            </Field>

            <Field label="Mobile" required error={fieldErrors.mobile} hint="10 digits">
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  value={state.mobile}
                  disabled={readOnly}
                  onChange={(event) => patch('mobile', event.target.value)}
                />
              )}
            </Field>

            <Field label="Email" required error={fieldErrors.email}>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  value={state.email}
                  disabled={readOnly}
                  onChange={(event) => patch('email', event.target.value)}
                />
              )}
            </Field>

            <Field label="GSTIN" error={fieldErrors.gstin} hint="Optional, 15 characters">
              {(props) => (
                <Input
                  {...props}
                  value={state.gstin}
                  disabled={readOnly}
                  placeholder="27AABCV1234A1Z5"
                  onChange={(event) => patch('gstin', event.target.value.toUpperCase())}
                />
              )}
            </Field>

            <Field label="Billing address" error={fieldErrors.billingAddress} className="sm:col-span-2">
              {(props) => (
                <Textarea
                  {...props}
                  value={state.billingAddress}
                  disabled={readOnly}
                  onChange={(event) => patch('billingAddress', event.target.value)}
                />
              )}
            </Field>

            <Field label="Estimate date" required error={fieldErrors.estimateDate}>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={state.estimateDate}
                  disabled={readOnly}
                  onChange={(event) => patch('estimateDate', event.target.value)}
                />
              )}
            </Field>

            <Field
              label="Valid until"
              required
              error={fieldErrors.validUntil}
              hint={`Default is ${settings?.defaultValidityDays ?? 30} days`}
            >
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={state.validUntil}
                  disabled={readOnly}
                  min={state.estimateDate}
                  onChange={(event) => patch('validUntil', event.target.value)}
                />
              )}
            </Field>

          </div>
        </Card>


        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-[15px] font-bold text-ink">Additional notes</h2>
              <p className="mt-0.5 text-[13px] text-ink-soft">
                Anything the client should read alongside the pricing.
              </p>
            </div>
            {!showNotes && !readOnly && (
              <Button size="sm" onClick={() => setShowNotes(true)}>
                Add notes
              </Button>
            )}
          </div>
          {(showNotes || state.notes) && (
            <Textarea
              className="mt-4"
              value={state.notes}
              disabled={readOnly}
              placeholder="Implementation starts within 5 working days of a signed acceptance…"
              onChange={(event) => patch('notes', event.target.value)}
            />
          )}
        </Card>
      </div>

      <div className="space-y-5 lg:sticky lg:top-8 lg:self-start">
        <PricingLedger
          pricing={pricing}
          gstPercent={state.gstPercent}
          adjustment={state.adjustment}
          disabled={readOnly}
          sticky={false}
          onAdjustmentChange={(adjustment) => patch('adjustment', adjustment)}
        />

        {!readOnly && (
          <div className="card space-y-3 p-5">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              icon={<Save size={15} />}
              loading={saving}
              disabled={!canSubmit}
              onClick={onSaveDraft}
            >
              Save draft
            </Button>
            {onPreview && (
              <Button
                size="md"
                className="w-full"
                icon={<Eye size={15} />}
                disabled={!canSubmit || saving}
                onClick={onPreview}
              >
                Save and preview
              </Button>
            )}
            {onSaveAndSend && (
              <Button
                variant="gold"
                size="md"
                className="w-full"
                icon={<Send size={15} />}
                disabled={!canSubmit || saving}
                onClick={onSaveAndSend}
              >
                Save and mark sent
              </Button>
            )}
            {!canSubmit && (
              <p className="pt-1.5 text-center text-[12px] text-ink-mute">
                Add a client name and at least one module to save.
              </p>
            )}
          </div>
        )}

        <p className="px-1 text-[11.5px] leading-relaxed text-ink-mute">
          {heading === 'edit'
            ? 'Saving creates a new revision. The previous version stays in the history.'
            : 'Prices are captured on save, so this estimate keeps its figures even if the Module Master changes later.'}
        </p>
      </div>
    </div>
  );
}
