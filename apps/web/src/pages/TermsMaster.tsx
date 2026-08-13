import { Plus, ScrollText } from 'lucide-react';
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
import { useCreateTerms, useDeleteTerms, useTermsList, useUpdateTerms } from '@/hooks/useTerms';
import { ApiError } from '@/lib/api';
import type { TermsTemplate } from '@/types';

const BLANK = {
  title: '',
  contentHtml: '',
  version: 'v1.0',
  isActive: true,
  isDefault: true,
  sequence: 0,
};

export default function TermsMaster() {
  const { can } = useAuth();
  const { notify } = useToast();
  const { data, isLoading, isError, error, refetch } = useTermsList({ page: 1 });
  const createTerms = useCreateTerms();
  const updateTerms = useUpdateTerms();
  const deleteTerms = useDeleteTerms();

  const [editing, setEditing] = useState<TermsTemplate | null>(null);
  const [draft, setDraft] = useState(BLANK);
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const mayManage = can(Permission.TERMS_MANAGE);

  const startCreate = () => {
    setEditing(null);
    setDraft({ ...BLANK, sequence: (data?.items.length ?? 0) + 1 });
    setFieldErrors({});
    setOpen(true);
  };

  const startEdit = (clause: TermsTemplate) => {
    setEditing(clause);
    setDraft({
      title: clause.title,
      contentHtml: clause.contentHtml,
      version: clause.version,
      isActive: clause.isActive,
      isDefault: clause.isDefault,
      sequence: clause.sequence,
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
        notify(cause instanceof Error ? cause.message : 'The clause could not be saved', 'error');
      },
    };

    if (editing) updateTerms.mutate({ id: editing.id, ...draft }, handlers);
    else createTerms.mutate(draft, handlers);
  };

  return (
    <>
      <PageHeader
        eyebrow="Masters"
        title="Terms & Conditions Master"
        description="Standard clauses. Anything marked default loads into a new estimate with one click, and can then be edited for that estimate alone."
        actions={
          mayManage && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={startCreate}>
              Add clause
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
            icon={<ScrollText size={18} />}
            title="No clauses yet"
            description="Add the standard terms your estimates carry — payment schedule, taxes, scope, validity."
            action={
              mayManage && (
                <Button variant="primary" icon={<Plus size={15} />} onClick={startCreate}>
                  Add clause
                </Button>
              )
            }
          />
        ) : (
          <ol className="divide-y divide-line">
            {data?.items.map((clause) => (
              <li key={clause.id} className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
                <span className="figure mt-1 w-6 text-[12px] text-gold-deep">
                  {String(clause.sequence).padStart(2, '0')}
                </span>

                <div className="min-w-48 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink">{clause.title}</p>
                    <Badge tone="neutral">{clause.version}</Badge>
                    {clause.isDefault && <Badge tone="gold">Loads by default</Badge>}
                    {!clause.isActive && <Badge tone="warn">Inactive</Badge>}
                  </div>
                  <div
                    className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-ink-soft [&_p]:mb-1"
                    dangerouslySetInnerHTML={{ __html: clause.contentHtml }}
                  />
                </div>

                {mayManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => startEdit(clause)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        deleteTerms.mutate(clause.id, {
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
          </ol>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.title}` : 'Add a clause'}
        width="max-w-2xl"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createTerms.isPending || updateTerms.isPending}
              onClick={save}
            >
              {editing ? 'Save changes' : 'Add clause'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" required error={fieldErrors.title} className="sm:col-span-2">
            {(props) => (
              <Input
                {...props}
                value={draft.title}
                placeholder="Payment Schedule"
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            )}
          </Field>

          <Field label="Version" required error={fieldErrors.version}>
            {(props) => (
              <Input
                {...props}
                value={draft.version}
                onChange={(event) => setDraft({ ...draft, version: event.target.value })}
              />
            )}
          </Field>

          <Field
            label="Clause text"
            required
            error={fieldErrors.contentHtml}
            hint="Basic HTML is allowed: paragraphs, lists, bold, links."
            className="sm:col-span-3"
          >
            {(props) => (
              <Textarea
                {...props}
                className="min-h-40 font-mono text-[12.5px]"
                value={draft.contentHtml}
                placeholder="<p>50% of the setup amount is payable on acceptance…</p>"
                onChange={(event) => setDraft({ ...draft, contentHtml: event.target.value })}
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

          <div className="space-y-2 sm:col-span-2 sm:pt-6">
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={draft.isDefault}
                className="size-4 accent-[var(--color-gold)]"
                onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })}
              />
              Load this clause when an estimate loads default terms
            </label>
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={draft.isActive}
                className="size-4 accent-[var(--color-gold)]"
                onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
              />
              Available to add to estimates
            </label>
          </div>
        </div>
      </Modal>
    </>
  );
}
