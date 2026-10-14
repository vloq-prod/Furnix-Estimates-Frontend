import {
  Copy,
  Download,
  Eye,
  History,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ESTIMATE_STATUS_FLOW, Permission, isEditable, type EstimateStatus } from '@furnix/shared';
import { PageHeader } from '@/components/layout/AppShell';
import { HostingBadge, StatusBadge } from '@/components/estimate/StatusBadge';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Modal,
  Select,
  Spinner,
  Textarea,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import {
  downloadEstimatePdf,
  useDeleteEstimate,
  useDuplicateEstimate,
  useEstimate,
  useEstimateActivity,
  useEstimateRevisions,
  useUpdateEstimateStatus,
} from '@/hooks/useEstimates';
import { cx, dateTime, inr, relativeTime, shortDate } from '@/lib/format';

export default function EstimateDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { can } = useAuth();

  const { data: estimate, isLoading, isError, error, refetch } = useEstimate(id);
  const { data: activity } = useEstimateActivity(id);
  const { data: revisions } = useEstimateRevisions(id);

  const updateStatus = useUpdateEstimateStatus();
  const duplicate = useDuplicateEstimate();
  const remove = useDeleteEstimate();

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<EstimateStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <Spinner label="Loading estimate" />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;
  if (!estimate) return null;

  const allowedTransitions = ESTIMATE_STATUS_FLOW[estimate.status];
  const editable = isEditable(estimate.status) && can(Permission.ESTIMATE_UPDATE);

  const applyStatus = () => {
    if (!nextStatus) return;
    updateStatus.mutate(
      { id, status: nextStatus, note: statusNote.trim() || undefined },
      {
        onSuccess: (response) => {
          notify(response.message);
          setStatusModalOpen(false);
          setStatusNote('');
          setNextStatus('');
        },
        onError: (cause) => notify((cause as Error).message, 'error'),
      },
    );
  };

  return (
    <>
      <PageHeader
        eyebrow={`${estimate.hostingModel === 'VLOQ_CLOUD' ? 'Cloud' : 'Self-hosted'} · Revision ${estimate.version}`}
        title={estimate.estimateNumber}
        description={`${estimate.clientCompanyName} · issued ${shortDate(estimate.estimateDate)}, valid until ${shortDate(estimate.validUntil)}`}
        actions={
          <>
            <Button icon={<Eye size={15} />} onClick={() => navigate(`/estimates/${id}/preview`)}>
              Preview
            </Button>
            <Button
              icon={<Download size={15} />}
              onClick={() =>
                downloadEstimatePdf(id, estimate.estimateNumber).catch(() =>
                  notify('The PDF could not be generated', 'error'),
                )
              }
            >
              Download PDF
            </Button>
            {editable && (
              <Button
                variant="primary"
                icon={<Pencil size={15} />}
                onClick={() => navigate(`/estimates/${id}/edit`)}
              >
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          {/* Client */}
          <Card>
            <CardHeader title="Client" eyebrow="Prepared for" />
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <Detail label="Company" value={estimate.clientCompanyName} />
              <Detail label="Contact person" value={estimate.contactPerson} />
              <Detail label="Email" value={estimate.email ?? 'Not provided'} />
              <Detail label="Mobile" value={estimate.mobile} />
              <Detail label="GSTIN" value={estimate.gstin ?? 'Not provided'} mono />
              <Detail label="Users" value={String(estimate.userCount)} mono />
              <Detail label="Billing address" value={estimate.billingAddress} className="sm:col-span-2" />
            </dl>
          </Card>

          {/* Lines */}
          <Card padded={false}>
            <div className="p-5 sm:p-6 sm:pb-4">
              <CardHeader
                title="Modules"
                eyebrow={`${estimate.modules.length} selected`}
                description="Prices were captured when this estimate was saved and no longer follow the Module Master."
              />
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-y border-line bg-canvas">
                  <th className="px-5 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-mute">
                    Module
                  </th>
                  <th className="px-5 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-mute">
                    Status
                  </th>
                  <th className="px-5 py-2 text-right text-[10.5px] font-bold uppercase tracking-wider text-ink-mute">
                    Setup (one-time)
                  </th>
                </tr>
              </thead>
              <tbody>
                {estimate.modules.map((line) => (
                  <tr key={line.id} className="border-b border-line-soft last:border-0">
                    <td className="px-5 py-3">
                      <p
                        className={cx(
                          'text-[13px]',
                          line.isSelected ? 'font-semibold text-ink' : 'font-medium text-ink-mute',
                        )}
                      >
                        {line.moduleName}
                      </p>
                      {estimate.hostingModel === 'VLOQ_CLOUD' && line.isSelected && line.userCount ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-gold-deep">
                          {line.userCount} user{line.userCount === 1 ? '' : 's'}
                        </p>
                      ) : null}
                      {line.isOverridden && (
                        <p className="text-[11px] text-gold-deep">Price adjusted for this estimate</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cx(
                          'inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                          line.isSelected
                            ? 'bg-gold-soft text-gold-deep'
                            : 'bg-line-soft text-ink-mute',
                        )}
                      >
                        {line.isSelected ? 'Included' : 'Not included'}
                      </span>
                    </td>
                    <td
                      className={cx(
                        'figure px-5 py-3 text-right text-[13px]',
                        line.isSelected ? 'font-semibold text-ink' : 'text-ink-mute',
                      )}
                    >
                      {inr(line.lineOneTimeAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader
              title="Activity"
              eyebrow="Audit trail"
              description="Every change to this estimate, and who made it."
            />
            <ol className="space-y-0">
              {(activity ?? []).map((entry, index, all) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 size-2 rounded-full bg-gold" />
                    {index < all.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-[13px] text-ink">{entry.message}</p>
                    <p className="text-[11.5px] text-ink-mute">
                      {entry.actor?.name ?? 'System'} · {relativeTime(entry.createdAt)} ·{' '}
                      {dateTime(entry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
              {(activity ?? []).length === 0 && (
                <p className="text-[13px] text-ink-mute">No activity recorded yet.</p>
              )}
            </ol>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <StatusBadge status={estimate.status} />
              <HostingBadge hostingModel={estimate.hostingModel} />
            </div>

            <div className="border-t border-line pt-3">
              <p className="eyebrow">One-time payable</p>
              <p className="figure mt-1 text-[21px] font-bold tracking-tight text-ink">
                {inr(Number(estimate.gstPercent) > 0 ? estimate.netPayableOneTime : estimate.taxableOneTime)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                {Number(estimate.gstPercent) > 0 ? 'GST Included' : 'GST Excluded'}
              </p>
            </div>

            {Number(estimate.taxableRecurring) > 0 && (
              <div className="mt-3 border-t border-gold/40 pt-3">
                <p className="eyebrow text-gold-deep">Monthly payable</p>
                <p className="figure mt-1 text-[21px] font-bold tracking-tight text-gold-deep">
                  {inr(Number(estimate.gstPercent) > 0 ? estimate.monthlyRecurringPayable : estimate.taxableRecurring)}
                  <span className="ml-0.5 text-[11px]">/mo</span>
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-mute">
                  Billed separately · {Number(estimate.gstPercent) > 0 ? 'GST Included' : 'GST Excluded'}
                </p>
              </div>
            )}

            {estimate.canViewAdjustment && estimate.internalAdjustmentType !== 'NONE' && (
              <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
                <p className="eyebrow mb-1">Internal · not on the client document</p>
                <p className="text-[12.5px] text-ink">
                  {estimate.internalAdjustmentType === 'PERCENT'
                    ? `${estimate.internalAdjustmentValue}% adjustment`
                    : `${inr(estimate.internalAdjustmentValue)} adjustment`}{' '}
                  on{' '}
                  {estimate.internalAdjustmentScope === 'BOTH'
                    ? 'both charges'
                    : estimate.internalAdjustmentScope === 'ONE_TIME'
                      ? 'one-time charges'
                      : 'monthly charges'}
                </p>
                {estimate.internalAdjustmentNote && (
                  <p className="mt-1 text-[11.5px] italic text-ink-soft">
                    {estimate.internalAdjustmentNote}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card>
            <p className="eyebrow mb-2.5">Actions</p>
            <div className="space-y-2">
              {allowedTransitions.length > 0 && can(Permission.ESTIMATE_STATUS) && (
                <Button
                  variant="gold"
                  className="w-full"
                  icon={<Send size={15} />}
                  onClick={() => setStatusModalOpen(true)}
                >
                  Update status
                </Button>
              )}
              {can(Permission.ESTIMATE_CREATE) && (
                <Button
                  className="w-full"
                  icon={<Copy size={15} />}
                  loading={duplicate.isPending}
                  onClick={() =>
                    duplicate.mutate(id, {
                      onSuccess: (response) => {
                        notify(response.message);
                        navigate(`/estimates/${response.data.id}/edit`);
                      },
                      onError: (cause) => notify((cause as Error).message, 'error'),
                    })
                  }
                >
                  Duplicate
                </Button>
              )}
              {can(Permission.ESTIMATE_DELETE) && estimate.status !== 'ACCEPTED' && (
                <Button
                  variant="danger"
                  className="w-full"
                  icon={<Trash2 size={15} />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <p className="eyebrow mb-2.5 flex items-center gap-1.5">
              <History size={12} />
              Revision history
            </p>
            <ol className="space-y-2">
              {(revisions ?? []).map((revision) => (
                <li key={revision.id} className="flex items-baseline justify-between gap-3">
                  <span className="figure text-[12px] font-semibold text-ink">v{revision.version}</span>
                  <span className="flex-1 truncate text-[11.5px] text-ink-soft">
                    {revision.changeSummary}
                  </span>
                  <span className="text-[11px] text-ink-mute">{relativeTime(revision.createdAt)}</span>
                </li>
              ))}
              {(revisions ?? []).length === 0 && (
                <p className="text-[12px] text-ink-mute">No revisions yet.</p>
              )}
            </ol>
          </Card>

          <Link
            to="/estimates"
            className="block px-1 text-[12.5px] text-ink-soft hover:text-ink hover:underline"
          >
            ← All estimates
          </Link>
        </div>
      </div>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update status"
        description={`${estimate.estimateNumber} is currently ${estimate.status.toLowerCase()}.`}
        footer={
          <>
            <Button onClick={() => setStatusModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!nextStatus}
              loading={updateStatus.isPending}
              onClick={applyStatus}
            >
              Update status
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-[13px] font-medium text-ink">
            New status
            <Select
              className="mt-1"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as EstimateStatus)}
            >
              <option value="">Choose a status</option>
              {allowedTransitions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-[13px] font-medium text-ink">
            Note (optional)
            <Textarea
              className="mt-1"
              value={statusNote}
              placeholder="Client asked for a revised user count…"
              onChange={(event) => setStatusNote(event.target.value)}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${estimate.estimateNumber}?`}
        description="It moves out of the list but stays recoverable in the database."
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(id, {
                  onSuccess: (response) => {
                    notify(response.message);
                    navigate('/estimates');
                  },
                  onError: (cause) => notify((cause as Error).message, 'error'),
                })
              }
            >
              Delete estimate
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-soft">
          Anyone with a link to this estimate will no longer be able to open it.
        </p>
      </Modal>
    </>
  );
}

function Detail({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11.5px] uppercase tracking-wide text-ink-mute">{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-line text-[13px] text-ink ${mono ? 'figure' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
