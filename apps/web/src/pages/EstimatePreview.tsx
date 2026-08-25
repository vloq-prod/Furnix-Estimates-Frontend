import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button, ErrorState, Spinner, useToast } from '@/components/ui';
import { downloadEstimatePdf, useEstimate } from '@/hooks/useEstimates';
import { useSettings } from '@/hooks/useSettings';
import { cx, inr, shortDate } from '@/lib/format';

/**
 * Client-facing preview. Mirrors the PDF exactly: adjusted taxable amounts only,
 * no subtotal or deduction line, and two settlements that are never summed.
 */
export default function EstimatePreview() {
  const { id = '' } = useParams();
  const { notify } = useToast();
  const { data: estimate, isLoading, isError, error, refetch } = useEstimate(id);
  const { data: settings } = useSettings();

  if (isLoading) return <Spinner label="Loading preview" />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />;
  if (!estimate) return null;

  const isCloud = estimate.hostingModel === 'VLOQ_CLOUD';
  const hasRecurring = Number(estimate.taxableRecurring) > 0;
  const includedCount = estimate.modules.filter((line) => line.isSelected).length;
  const hasPage2 = Boolean(estimate.notes || estimate.clauses.length > 0);
  const sortedModules = [...estimate.modules].sort((a, b) => {
    if (a.isSelected && !b.isSelected) return -1;
    if (!a.isSelected && b.isSelected) return 1;
    return a.sequence - b.sequence;
  });

  const download = () =>
    downloadEstimatePdf(estimate.id, estimate.estimateNumber).catch(() =>
      notify('The PDF could not be generated', 'error'),
    );

  return (
    <>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/estimates/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={15} />
          Back to estimate
        </Link>
        <div className="flex gap-2">
          <Button icon={<Printer size={15} />} onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="primary" icon={<Download size={15} />} onClick={download}>
            Download PDF
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[210mm] space-y-8 pb-12">
        <div className="space-y-2">
          {hasPage2 && (
            <p className="no-print text-center text-[11px] font-bold uppercase tracking-wider text-ink-mute">
              Page 1
            </p>
          )}
          <div className="mx-auto w-full min-h-[297mm] p-[12mm] flex flex-col justify-between bg-surface border border-line shadow-md relative">
            <div className="space-y-6">
              {/* Masthead */}
              <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/furnix-mark.png"
                      alt="Furnix"
                      width={24}
                      height={24}
                      className="size-6 rounded-md"
                    />
                    <span className="font-display text-[24px] font-extrabold tracking-tight text-ink">
                      {settings?.brandName ?? 'Furnix'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">
                    {settings?.legalName}
                    {settings?.addressLine1 && (
                      <>
                        <br />
                        {settings.addressLine1}
                        {settings.addressLine2 && `, ${settings.addressLine2}`}
                        <br />
                        {[settings.city, settings.state, settings.postalCode].filter(Boolean).join(' ')}
                      </>
                    )}
                    {settings?.gstin && (
                      <>
                        <br />
                        GSTIN {settings.gstin}
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <h1 className="font-display text-[17px] font-bold uppercase tracking-[0.1em] text-ink">
                    Estimate
                  </h1>
                  <p className="figure mt-1 text-[15px] font-bold text-gold-deep">
                    {estimate.estimateNumber}
                  </p>
                  <p className="mt-2 text-[11.5px] text-ink-soft">
                    Issued <b className="text-ink">{shortDate(estimate.estimateDate)}</b>
                    <br />
                    Valid until <b className="text-ink">{shortDate(estimate.validUntil)}</b>
                  </p>
                </div>
              </header>

              {/* Parties */}
              <section className="mt-5 grid gap-0 border border-line sm:grid-cols-[1fr_auto]">
                <div className="p-4">
                  <p className="eyebrow mb-1.5">Prepared for</p>
                  <p className="text-[15px] font-bold text-ink">{estimate.clientCompanyName}</p>
                  <p className="text-[12.5px] text-ink-soft">{estimate.contactPerson}</p>
                  <p className="whitespace-pre-line text-[12.5px] text-ink-soft">{estimate.billingAddress}</p>
                  <p className="text-[12.5px] text-ink-soft">
                    {estimate.email} · {estimate.mobile}
                  </p>
                  {estimate.gstin && <p className="text-[12.5px] text-ink-soft">GSTIN {estimate.gstin}</p>}
                </div>
                <dl className="min-w-56 border-line bg-canvas p-4 sm:border-l">
                  <p className="eyebrow mb-1.5">Engagement</p>
                  <Fact label="Deployment" value={isCloud ? 'VLOQ Cloud' : 'Client-owned server'} />
                  <Fact label="Modules" value={String(includedCount)} />
                  <Fact label="Users" value={String(estimate.userCount)} />
                </dl>
              </section>

              {/* Lines */}
              <section className="mt-6">
                <h2 className="eyebrow mb-2 text-ink">Modules &amp; pricing</h2>
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-ink">
                      <th className="w-8 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-mute" />
                      <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                        Module
                      </th>
                      <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                        Status
                      </th>
                      <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                        Setup (one-time)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedModules.map((line, index) => (
                      <tr
                        key={line.id}
                        className={cx('border-b border-line', !line.isSelected && 'text-ink-mute')}
                      >
                        <td className="figure py-3 align-top text-[11px] text-ink-mute">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3">
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
                          {line.moduleDescription && (
                            <p className="mt-0.5 max-w-md text-[11.5px] leading-relaxed text-ink-soft">
                              {line.moduleDescription}
                            </p>
                          )}
                        </td>
                        <td className="py-3 align-top">
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
                            'figure py-3 text-right align-top text-[13px]',
                            line.isSelected ? 'font-semibold text-ink' : 'text-ink-mute',
                          )}
                        >
                          {inr(line.lineOneTimeAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Platform users — its own line item, priced on head count alone. */}
                <table className="mt-5 w-full border-collapse">
                  <thead>
                    <tr className="border-b border-ink">
                      <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                        Platform users
                      </th>
                      <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                        Users
                      </th>
                      <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                        Rate / user / mo
                      </th>
                      <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-ink-mute">
                        Monthly
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line">
                      <td className="py-3">
                        <p className="text-[13px] font-semibold text-ink">{estimate.userLineLabel}</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-soft">
                          Platform access charged per user per month. Independent of module selection.
                        </p>
                      </td>
                      <td className="figure py-3 text-right text-[13px] font-semibold text-ink">
                        {estimate.userCount}
                      </td>
                      <td className="figure py-3 text-right text-[13px] text-ink-soft">
                        {isCloud ? inr(estimate.appliedMonthlyPerUser) : <span className="text-ink-mute">—</span>}
                      </td>
                      <td className="figure py-3 text-right text-[13px] font-semibold text-ink">
                        {isCloud ? inr(estimate.userLineMonthlyAmount) : <span className="text-ink-mute">—</span>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Settlements */}
              <section className="mt-2 flex flex-col gap-4 lg:flex-row">
                <div className="flex-1 border border-line bg-canvas/30">
                  <p className="eyebrow border-b border-line px-3.5 py-1.5 text-ink">How this is billed</p>
                  <div className="p-3.5 space-y-4">
                    <p className="text-[12px] leading-relaxed text-ink-soft">
                      {isCloud
                        ? `The setup amount is payable once, on acceptance. The monthly amount is billed every month for ${estimate.userCount} user${estimate.userCount === 1 ? '' : 's'} and is not included in the one-time figure. These are two separate settlements.`
                        : 'You provide and manage the server. The amount alongside is payable once, on acceptance. There is no monthly per-user charge on this deployment.'}
                    </p>
                    {settings?.bankName && (
                      <div className="pt-3.5 border-t border-line">
                        <p className="eyebrow mb-2 text-ink">Bank details</p>
                        <div className="grid grid-cols-2 gap-y-1.5 text-[12px]">
                          <div className="text-ink-soft">Bank name</div>
                          <div className="font-semibold text-ink text-right">{settings.bankName}</div>

                          <div className="text-ink-soft">Account number</div>
                          <div className="font-semibold text-ink text-right">{settings.bankAccountNumber}</div>

                          <div className="text-ink-soft">IFSC code</div>
                          <div className="font-semibold text-ink text-right font-mono">{settings.bankIfsc}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full lg:w-80">
                  <SettlementBlock
                    title="One-time charges"
                    subtotal={estimate.oneTimeSubtotal}
                    adjustment={estimate.oneTimeAdjustment}
                    taxable={estimate.taxableOneTime}
                    gst={estimate.gstOneTime}
                    gstPercent={estimate.gstPercent}
                    netPayable={estimate.netPayableOneTime}
                    totalLabel="Net payable"
                  />
                  {hasRecurring && (
                    <div className="mt-3">
                      <SettlementBlock
                        title="Monthly recurring charges"
                        subtotal={estimate.recurringSubtotal}
                        adjustment={estimate.recurringAdjustment}
                        taxable={estimate.taxableRecurring}
                        gst={estimate.gstRecurring}
                        gstPercent={estimate.gstPercent}
                        netPayable={estimate.monthlyRecurringPayable}
                        totalLabel="Monthly payable"
                        suffix="/mo"
                        accent
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>

            {!hasPage2 && (
              <div className="mt-auto pt-4">
                <footer className="flex flex-wrap justify-between gap-8 mt-8">
                  <div className="relative w-56 border-t border-ink pt-2">
                    <img
                      src="/vloq-signature.png"
                      alt="Signature"
                      className="absolute bottom-6 left-2 h-16 object-contain pointer-events-none mix-blend-multiply"
                    />
                    <p className="text-[12px] font-bold text-ink">{settings?.legalName}</p>
                    <p className="text-[11px] text-ink-soft">Authorised signatory</p>
                  </div>
                  <div className="w-56 border-t border-ink pt-2">
                    <p className="text-[12px] font-bold text-ink">{estimate.clientCompanyName}</p>
                    <p className="text-[11px] text-ink-soft">Accepted — name, date &amp; seal</p>
                  </div>
                </footer>

                <p className="mt-6 border-t border-line pt-2 text-[10.5px] text-ink-mute">
                  {estimate.estimateNumber} · This is an estimate, not a tax invoice.
                </p>
              </div>
            )}
          </div>
        </div>

        {hasPage2 && (
          <div className="space-y-2">
            <p className="no-print text-center text-[11px] font-bold uppercase tracking-wider text-ink-mute">
              Page 2
            </p>
            <div className="mx-auto w-full min-h-[297mm] p-[12mm] flex flex-col justify-between bg-surface border border-line shadow-md relative">
              <div className="space-y-6">
                {estimate.notes && (
                  <section>
                    <p className="eyebrow mb-1">Notes</p>
                    <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-ink-soft">
                      {estimate.notes}
                    </p>
                  </section>
                )}

                {estimate.clauses.length > 0 && (
                  <section className={cx(estimate.notes ? 'mt-6' : '')}>
                    <h2 className="eyebrow mb-2 text-ink">Terms &amp; conditions</h2>
                    <ol className="divide-y divide-line border-t border-line">
                      {estimate.clauses.map((clause, index) => (
                        <li key={clause.id} className="flex gap-3 py-2.5">
                          <span className="figure w-5 shrink-0 text-[11px] font-bold text-gold-deep">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-[12.5px] font-bold text-ink">{clause.title}</h3>
                            <div
                              className="mt-0.5 text-[12px] leading-relaxed text-ink-soft [&_li]:ml-4 [&_p]:mb-1"
                              dangerouslySetInnerHTML={{ __html: clause.contentHtml }}
                            />
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>

              <div className="mt-auto pt-4">
                <footer className="flex flex-wrap justify-between gap-8 mt-8">
                  <div className="relative w-56 border-t border-ink pt-2">
                    <img
                      src="/vloq-signature.png"
                      alt="Signature"
                      className="absolute bottom-6 left-2 h-16 object-contain pointer-events-none mix-blend-multiply"
                    />
                    <p className="text-[12px] font-bold text-ink">{settings?.legalName}</p>
                    <p className="text-[11px] text-ink-soft">Authorised signatory</p>
                  </div>
                  <div className="w-56 border-t border-ink pt-2">
                    <p className="text-[12px] font-bold text-ink">{estimate.clientCompanyName}</p>
                    <p className="text-[11px] text-ink-soft">Accepted — name, date &amp; seal</p>
                  </div>
                </footer>

                <p className="mt-6 border-t border-line pt-2 text-[10.5px] text-ink-mute">
                  {estimate.estimateNumber} · This is an estimate, not a tax invoice.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-1 last:border-0">
      <dt className="text-[12px] text-ink-mute">{label}</dt>
      <dd className="figure text-[12px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SettlementBlock({
  title,
  subtotal,
  adjustment,
  taxable,
  gst,
  gstPercent,
  netPayable,
  totalLabel,
  suffix,
  accent,
}: {
  title: string;
  subtotal?: string;
  adjustment?: string;
  taxable: string;
  gst: string;
  gstPercent: string;
  netPayable: string;
  totalLabel: string;
  suffix?: string;
  accent?: boolean;
}) {
  const hasDiscount = subtotal !== undefined && adjustment !== undefined && Number(adjustment) !== 0;
  return (
    <div className={accent ? 'border border-gold/30 bg-gold-soft/30' : 'border border-line'}>
      <p className="eyebrow border-b border-line px-3.5 py-1">{title}</p>
      <div className="px-3.5 py-1.5 space-y-[1px]">
        {subtotal !== undefined && (
          <Row label="Total amount" value={inr(subtotal)} />
        )}
        {hasDiscount && (
          <Row label="Discount" value={`−${inr(adjustment!)}`} muted />
        )}
        <Row label="Taxable amount" value={inr(taxable)} />
        <Row label={`GST (${Number(gstPercent)}%)`} value={inr(gst)} />
      </div>
      <div
        className={`flex items-baseline justify-between gap-3 border-t px-3.5 py-2 ${
          accent ? 'border-gold' : 'border-ink'
        }`}
      >
        <div>
          <span className={`eyebrow ${accent ? 'text-gold-deep' : 'text-ink'}`}>{totalLabel}</span>
          <span className={`ml-1 text-[10px] normal-case font-normal ${accent ? 'text-gold-deep/70' : 'text-ink-soft'}`}>(GST Included)</span>
        </div>
        <span
          className={`figure text-[15px] font-bold tracking-tight ${
            accent ? 'text-gold-deep' : 'text-ink'
          }`}
        >
          {inr(netPayable)}
          {suffix && <span className="ml-0.5 text-[10px] font-semibold">{suffix}</span>}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-[1px]">
      <span className={`text-[11.5px] ${muted ? 'text-ink-mute italic' : 'text-ink-soft'}`}>{label}</span>
      <span className={`figure text-[11.5px] font-semibold ${muted ? 'text-ink-mute' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
