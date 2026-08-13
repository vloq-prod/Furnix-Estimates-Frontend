import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isEditable } from '@furnix/shared';
import { PageHeader } from '@/components/layout/AppShell';
import {
  EstimateForm,
  emptyFormState,
  toPayload,
  type EstimateFormState,
} from '@/components/estimate/EstimateForm';
import { EMPTY_ADJUSTMENT } from '@/components/estimate/AdvancedPricingControl';
import { Card, ErrorState, Spinner, useToast } from '@/components/ui';
import { useEstimate, useUpdateEstimate } from '@/hooks/useEstimates';
import { ApiError } from '@/lib/api';
import { toDateInput } from '@/lib/format';
import type { Estimate } from '@/types';

function toFormState(estimate: Estimate): EstimateFormState {
  return {
    ...emptyFormState(),
    estimateDate: toDateInput(estimate.estimateDate),
    validUntil: toDateInput(estimate.validUntil),
    clientCompanyName: estimate.clientCompanyName,
    contactPerson: estimate.contactPerson,
    email: estimate.email,
    mobile: estimate.mobile,
    billingAddress: estimate.billingAddress,
    gstin: estimate.gstin ?? '',
    hostingModel: estimate.hostingModel,
    userCount: estimate.userCount,
    gstPercent: Number(estimate.gstPercent),
    userRateOverride: estimate.userRateOverride != null ? Number(estimate.userRateOverride) : null,
    modules: estimate.modules
      .filter((line) => line.isSelected)
      .map((line) => ({
        moduleId: line.moduleId!,
        userCount: line.userCount ?? 10,
      })),
    clauses: estimate.clauses.map((clause) => ({
      sourceTemplateId: clause.sourceTemplateId,
      title: clause.title,
      contentHtml: clause.contentHtml,
      version: clause.version,
      sequence: clause.sequence,
      isCustom: clause.isCustom,
    })),
    notes: estimate.notes ?? '',
    adjustment: estimate.canViewAdjustment
      ? {
          type: estimate.internalAdjustmentType ?? 'NONE',
          value: Number(estimate.internalAdjustmentValue ?? 0),
          scope: estimate.internalAdjustmentScope ?? 'ONE_TIME',
          note: estimate.internalAdjustmentNote ?? null,
        }
      : EMPTY_ADJUSTMENT,
  };
}

export default function EstimateEdit() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const { data: estimate, isLoading, isError, error, refetch } = useEstimate(id);
  const updateEstimate = useUpdateEstimate(id);

  const [state, setState] = useState<EstimateFormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (estimate) setState(toFormState(estimate));
  }, [estimate]);

  if (isLoading || !state) return <Spinner label="Loading estimate" />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;
  if (!estimate) return null;

  if (!isEditable(estimate.status)) {
    return (
      <Card>
        <ErrorState
          message={`${estimate.estimateNumber} is marked ${estimate.status.toLowerCase()} and is locked. Duplicate it to make changes.`}
          onRetry={() => navigate(`/estimates/${id}`)}
        />
      </Card>
    );
  }

  const save = (after: 'stay' | 'preview') => {
    setFieldErrors({});
    updateEstimate.mutate(toPayload(state), {
      onSuccess: (response) => {
        notify(response.message);
        navigate(after === 'preview' ? `/estimates/${id}/preview` : `/estimates/${id}`);
      },
      onError: (cause) => {
        if (cause instanceof ApiError && cause.isValidation) {
          setFieldErrors(cause.fieldErrors());
          notify('Some fields need attention', 'error');
          return;
        }
        notify(cause instanceof Error ? cause.message : 'The estimate could not be saved', 'error');
      },
    });
  };

  return (
    <>
      <PageHeader
        eyebrow={`Revision ${estimate.version}`}
        title={`Edit ${estimate.estimateNumber}`}
        description="Saving records a new revision. Earlier versions stay in the history."
      />
      <EstimateForm
        heading="edit"
        state={state}
        onChange={setState}
        fieldErrors={fieldErrors}
        saving={updateEstimate.isPending}
        onSaveDraft={() => save('stay')}
        onPreview={() => save('preview')}
      />
    </>
  );
}
