import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import {
  EstimateForm,
  emptyFormState,
  toPayload,
  type EstimateFormState,
} from '@/components/estimate/EstimateForm';
import { useToast } from '@/components/ui';
import { useCreateEstimate, useUpdateEstimateStatus } from '@/hooks/useEstimates';
import { ApiError } from '@/lib/api';

export default function EstimateCreate() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const createEstimate = useCreateEstimate();
  const updateStatus = useUpdateEstimateStatus();

  const [state, setState] = useState<EstimateFormState>(() => emptyFormState());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const save = (after: 'stay' | 'preview' | 'send') => {
    setFieldErrors({});
    createEstimate.mutate(toPayload(state), {
      onSuccess: async (response) => {
        const estimate = response.data;
        notify(response.message);

        if (after === 'send') {
          await updateStatus.mutateAsync({ id: estimate.id, status: 'SENT' });
          notify(`${estimate.estimateNumber} marked sent`);
        }

        navigate(after === 'preview' ? `/estimates/${estimate.id}/preview` : `/estimates/${estimate.id}`);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.isValidation) {
          setFieldErrors(error.fieldErrors());
          notify('Some fields need attention', 'error');
          return;
        }
        notify(error instanceof Error ? error.message : 'The estimate could not be saved', 'error');
      },
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="New"
        title="Build an estimate"
        description="The estimate number is assigned on save. Nothing goes to the client until you mark it sent."
      />
      <EstimateForm
        heading="create"
        state={state}
        onChange={setState}
        fieldErrors={fieldErrors}
        saving={createEstimate.isPending || updateStatus.isPending}
        onSaveDraft={() => save('stay')}
        onPreview={() => save('preview')}
        onSaveAndSend={() => save('send')}
      />
    </>
  );
}
