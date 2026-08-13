import { useEffect, useState } from 'react';
import { Permission } from '@furnix/shared';
import { PageHeader } from '@/components/layout/AppShell';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Input,
  NumberInput,
  Select,
  Spinner,
  Textarea,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { ApiError } from '@/lib/api';
import type { CompanySettings } from '@/types';

export default function PricingSettings() {
  const { can } = useAuth();
  const { notify } = useToast();
  const { data, isLoading, isError, error, refetch } = useSettings();
  const updateSettings = useUpdateSettings();

  const [draft, setDraft] = useState<Partial<CompanySettings>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  if (isLoading) return <Spinner label="Loading settings" />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;

  const mayManage = can(Permission.SETTINGS_MANAGE);
  const patch = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = () => {
    setFieldErrors({});
    const { id: _id, defaultTermsTemplateId: _terms, ...body } = draft;
    updateSettings.mutate(body, {
      onSuccess: (response) => notify(response.message),
      onError: (cause) => {
        if (cause instanceof ApiError && cause.isValidation) {
          setFieldErrors(cause.fieldErrors());
          notify('Some fields need attention', 'error');
          return;
        }
        notify((cause as Error).message, 'error');
      },
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Pricing settings"
        description="Issuer details that print on every estimate, and the defaults a new estimate starts from."
        actions={
          mayManage && (
            <Button variant="primary" loading={updateSettings.isPending} onClick={save}>
              Save changes
            </Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Issuer" eyebrow="Prints on the estimate" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name" error={fieldErrors.legalName} className="sm:col-span-2">
              {(props) => (
                <Input
                  {...props}
                  value={draft.legalName ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => patch('legalName', event.target.value)}
                />
              )}
            </Field>
            <Field label="Brand name" error={fieldErrors.brandName}>
              {(props) => (
                <Input
                  {...props}
                  value={draft.brandName ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => patch('brandName', event.target.value)}
                />
              )}
            </Field>
            <Field label="GSTIN" error={fieldErrors.gstin}>
              {(props) => (
                <Input
                  {...props}
                  value={draft.gstin ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => patch('gstin', event.target.value.toUpperCase())}
                />
              )}
            </Field>
            <Field label="Address" error={fieldErrors.addressLine1} className="sm:col-span-2">
              {(props) => (
                <Textarea
                  {...props}
                  className="min-h-16"
                  value={draft.addressLine1 ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => patch('addressLine1', event.target.value)}
                />
              )}
            </Field>
            <Field label="City" error={fieldErrors.city}>
              {(props) => (
                <Input
                  {...props}
                  value={draft.city ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => patch('city', event.target.value)}
                />
              )}
            </Field>
            <Field label="State" error={fieldErrors.state}>
              {(props) => (
                <Input
                  {...props}
                  value={draft.state ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => patch('state', event.target.value)}
                />
              )}
            </Field>
            <Field label="Email" error={fieldErrors.email}>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  value={draft.email ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => patch('email', event.target.value)}
                />
              )}
            </Field>
            <Field label="Phone" error={fieldErrors.phone}>
              {(props) => (
                <Input
                  {...props}
                  value={draft.phone ?? ''}
                  disabled={!mayManage}
                  onChange={(event) => patch('phone', event.target.value)}
                />
              )}
            </Field>
          </div>
        </Card>

        <div className="space-y-5">
          {/* Platform user pricing: one rate, applied per user per month, with no
              dependency on how many modules a client takes. */}
          <Card>
            <CardHeader title="Platform user pricing" eyebrow="Charged per user, per month" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Monthly price per user"
                error={fieldErrors.monthlyPricePerUser}
                hint="Independent of module selection. Overridable on an individual estimate."
              >
                {(props) => (
                  <NumberInput
                    {...props}
                    value={Number(draft.monthlyPricePerUser ?? 0)}
                    disabled={!mayManage}
                    onChange={(event) => patch('monthlyPricePerUser', event.target.value)}
                  />
                )}
              </Field>

              <Field label="Line item label" error={fieldErrors.userLineLabel}>
                {(props) => (
                  <Input
                    {...props}
                    value={draft.userLineLabel ?? 'Platform users'}
                    disabled={!mayManage}
                    onChange={(event) => patch('userLineLabel', event.target.value)}
                  />
                )}
              </Field>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
              Changing this rate does not alter estimates that have already been saved — each
              estimate keeps the rate it was priced with.
            </p>
          </Card>

          <Card>
            <CardHeader title="Estimate defaults" eyebrow="New estimates start here" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default GST %" error={fieldErrors.defaultGstPercent}>
                {(props) => (
                  <Select
                    {...props}
                    value={Number(draft.defaultGstPercent ?? 18)}
                    disabled={!mayManage}
                    onChange={(event) => patch('defaultGstPercent', event.target.value)}
                  >
                    {[0, 5, 12, 18, 28].map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                label="Validity (days)"
                error={fieldErrors.defaultValidityDays}
                hint="Sets the valid-until date"
              >
                {(props) => (
                  <NumberInput
                    {...props}
                    value={draft.defaultValidityDays ?? 30}
                    disabled={!mayManage}
                    onChange={(event) => patch('defaultValidityDays', Number(event.target.value))}
                  />
                )}
              </Field>

              <Field
                label="Estimate number prefix"
                error={fieldErrors.estimateNumberPrefix}
                hint="Produces FX/EST/2627/0001"
                className="sm:col-span-2"
              >
                {(props) => (
                  <Input
                    {...props}
                    className="figure"
                    value={draft.estimateNumberPrefix ?? ''}
                    disabled={!mayManage}
                    onChange={(event) =>
                      patch('estimateNumberPrefix', event.target.value.toUpperCase())
                    }
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Bank details" eyebrow="For the acceptance pack" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank name" error={fieldErrors.bankName} className="sm:col-span-2">
                {(props) => (
                  <Input
                    {...props}
                    value={draft.bankName ?? ''}
                    disabled={!mayManage}
                    onChange={(event) => patch('bankName', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Account number" error={fieldErrors.bankAccountNumber}>
                {(props) => (
                  <Input
                    {...props}
                    className="figure"
                    value={draft.bankAccountNumber ?? ''}
                    disabled={!mayManage}
                    onChange={(event) => patch('bankAccountNumber', event.target.value)}
                  />
                )}
              </Field>
              <Field label="IFSC" error={fieldErrors.bankIfsc}>
                {(props) => (
                  <Input
                    {...props}
                    className="figure"
                    value={draft.bankIfsc ?? ''}
                    disabled={!mayManage}
                    onChange={(event) => patch('bankIfsc', event.target.value.toUpperCase())}
                  />
                )}
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
