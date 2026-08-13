import { Blocks, Plus } from 'lucide-react';
import { useState } from 'react';
import { Permission } from '@furnix/shared';
import { PageHeader } from '@/components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  NumberInput,
  SkeletonRows,
  Textarea,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCreateModule, useDeleteModule, useModules, useUpdateModule } from '@/hooks/useModules';
import { ApiError } from '@/lib/api';
import { inr } from '@/lib/format';
import type { ModuleMaster as ModuleMasterType } from '@/types';

const BLANK = {
  code: '',
  name: '',
  description: '',
  cloudSetupFee: 0,
  selfHostedSetupFee: 0,
  isActive: true,
  sequence: 0,
};

export default function ModuleMaster() {
  const { can } = useAuth();
  const { notify } = useToast();
  const { data, isLoading, isError, error, refetch } = useModules({ pageSize: 100 });
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();

  const [editing, setEditing] = useState<ModuleMasterType | null>(null);
  const [draft, setDraft] = useState<typeof BLANK>(BLANK);
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mayManage = can(Permission.MODULE_MANAGE);

  const startCreate = () => {
    setEditing(null);
    setDraft({ ...BLANK, sequence: (data?.items.length ?? 0) + 1 });
    setFieldErrors({});
    setOpen(true);
  };

  const startEdit = (module: ModuleMasterType) => {
    setEditing(module);
    setDraft({
      code: module.code,
      name: module.name,
      description: module.description ?? '',
      cloudSetupFee: Number(module.cloudSetupFee),
      selfHostedSetupFee: Number(module.selfHostedSetupFee),
      isActive: module.isActive,
      sequence: module.sequence,
    });
    setFieldErrors({});
    setOpen(true);
  };

  const save = () => {
    setFieldErrors({});
    const handlers = {
      onSuccess: (response: { message: string }) => {
        notify(response.message);
        setOpen(false);
      },
      onError: (cause: unknown) => {
        if (cause instanceof ApiError && cause.isValidation) {
          setFieldErrors(cause.fieldErrors());
          return;
        }
        notify(cause instanceof Error ? cause.message : 'The module could not be saved', 'error');
      },
    };

    if (editing) {
      const { code: _code, ...body } = draft;
      updateModule.mutate({ id: editing.id, ...body }, handlers);
    } else {
      createModule.mutate(draft, handlers);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Masters"
        title="Module Master"
        description="The chargeable modules a client can buy. Add a new one here and it appears in the estimate builder immediately — nothing is hardcoded."
        actions={
          mayManage && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={startCreate}>
              Add module
            </Button>
          )
        }
      />

      <Card padded={false}>
        {isLoading ? (
          <div className="p-4">
            <SkeletonRows rows={5} />
          </div>
        ) : isError ? (
          <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={<Blocks size={18} />}
            title="No modules yet"
            description="Add the first chargeable module. Set a cloud fee, a self-hosted fee and a monthly per-user rate."
            action={
              mayManage && (
                <Button variant="primary" icon={<Plus size={15} />} onClick={startCreate}>
                  Add module
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {data?.items.map((module) => (
              <li key={module.id} className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
                <span className="figure mt-1 w-6 text-[12px] text-ink-mute">
                  {String(module.sequence).padStart(2, '0')}
                </span>

                <div className="min-w-48 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink">{module.name}</p>
                    <Badge tone={module.isActive ? 'ok' : 'neutral'}>
                      {module.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="figure mt-0.5 text-[11px] text-ink-mute">{module.code}</p>
                  {module.description && (
                    <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-ink-soft">
                      {module.description}
                    </p>
                  )}
                </div>

                {/* Modules are a one-time charge. Per-user pricing is configured
                    once in Pricing Settings and billed as its own line item. */}
                <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1">
                  <PriceCell label="Cloud setup" value={inr(module.cloudSetupFee)} />
                  <PriceCell label="Self-hosted setup" value={inr(module.selfHostedSetupFee)} />
                </dl>

                {mayManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => startEdit(module)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        deleteModule.mutate(module.id, {
                          onSuccess: (response) => notify(response.message),
                          onError: (cause) => notify((cause as Error).message, 'error'),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add a module'}
        description="Changing a price here affects new estimates only. Existing estimates keep the price they were saved with."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createModule.isPending || updateModule.isPending}
              onClick={save}
            >
              {editing ? 'Save changes' : 'Add module'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={fieldErrors.name} className="sm:col-span-2">
            {(props) => (
              <Input
                {...props}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            )}
          </Field>

          <Field
            label="Code"
            required
            error={fieldErrors.code}
            hint="Uppercase, underscores. Cannot change later."
            className="sm:col-span-2"
          >
            {(props) => (
              <Input
                {...props}
                value={draft.code}
                disabled={Boolean(editing)}
                placeholder="QUALITY_CONTROL"
                onChange={(event) =>
                  setDraft({ ...draft, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })
                }
              />
            )}
          </Field>

          <Field label="Description" error={fieldErrors.description} className="sm:col-span-2">
            {(props) => (
              <Textarea
                {...props}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            )}
          </Field>

          <Field label="Cloud setup fee" required error={fieldErrors.cloudSetupFee}>
            {(props) => (
              <NumberInput
                {...props}
                value={draft.cloudSetupFee}
                onChange={(event) => setDraft({ ...draft, cloudSetupFee: Number(event.target.value) })}
              />
            )}
          </Field>

          <Field
            label="Self-hosted setup fee"
            required
            error={fieldErrors.selfHostedSetupFee}
            hint="Normally higher than the cloud fee"
          >
            {(props) => (
              <NumberInput
                {...props}
                value={draft.selfHostedSetupFee}
                onChange={(event) =>
                  setDraft({ ...draft, selfHostedSetupFee: Number(event.target.value) })
                }
              />
            )}
          </Field>

          <Field label="Display order" error={fieldErrors.sequence}>
            {(props) => (
              <NumberInput
                {...props}
                value={draft.sequence}
                onChange={(event) => setDraft({ ...draft, sequence: Number(event.target.value) })}
              />
            )}
          </Field>

          <label className="flex items-center gap-2 text-[13px] text-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.isActive}
              className="size-4 accent-[var(--color-gold)]"
              onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            />
            Available to select on new estimates
          </label>
        </div>
      </Modal>
    </>
  );
}

function PriceCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wide text-ink-mute">{label}</dt>
      <dd className="figure text-[13px] font-semibold text-ink">{value}</dd>
    </div>
  );
}
