import { ArrowDown, ArrowUp, FileText, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, EmptyState, Input, Textarea } from '@/components/ui';
import { useDefaultTerms } from '@/hooks/useTerms';

export interface ClauseDraft {
  sourceTemplateId?: string | null;
  title: string;
  contentHtml: string;
  version?: string | null;
  sequence: number;
  isCustom: boolean;
}

/**
 * Clauses are copied onto the estimate, not referenced. Editing one here changes
 * this estimate only; the Terms Master keeps its own text and version.
 */
export function TermsBuilder({
  clauses,
  onChange,
  disabled,
}: {
  clauses: ClauseDraft[];
  onChange: (clauses: ClauseDraft[]) => void;
  disabled?: boolean;
}) {
  const { data: defaults, isLoading } = useDefaultTerms();

  const resequence = (next: ClauseDraft[]) =>
    onChange(next.map((clause, index) => ({ ...clause, sequence: index })));

  const loadDefaults = () => {
    const existingTitles = new Set(clauses.map((clause) => clause.title));
    const incoming = (defaults ?? [])
      .filter((template) => !existingTitles.has(template.title))
      .map((template, index) => ({
        sourceTemplateId: template.id,
        title: template.title,
        contentHtml: template.contentHtml,
        version: template.version,
        sequence: clauses.length + index,
        isCustom: false,
      }));
    resequence([...clauses, ...incoming]);
  };

  const addCustom = () =>
    resequence([
      ...clauses,
      { title: '', contentHtml: '', sequence: clauses.length, isCustom: true, sourceTemplateId: null },
    ]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= clauses.length) return;
    const next = [...clauses];
    [next[index], next[target]] = [next[target]!, next[index]!];
    resequence(next);
  };

  const patch = (index: number, changes: Partial<ClauseDraft>) =>
    onChange(clauses.map((clause, i) => (i === index ? { ...clause, ...changes } : clause)));

  const remove = (index: number) => resequence(clauses.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          icon={<FileText size={14} />}
          onClick={loadDefaults}
          loading={isLoading}
          disabled={disabled}
        >
          Load default terms
        </Button>
        <Button size="sm" icon={<Plus size={14} />} onClick={addCustom} disabled={disabled}>
          Add a clause
        </Button>
      </div>

      {clauses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-canvas">
          <EmptyState
            icon={<FileText size={18} />}
            title="No terms on this estimate yet"
            description="Load the standard clause set, then edit or reorder anything that needs to change for this client."
          />
        </div>
      ) : (
        <ol className="space-y-2.5">
          {clauses.map((clause, index) => (
            <li key={index} className="rounded-xl border border-line bg-surface p-3.5">
              <div className="flex items-start gap-3">
                <span className="figure mt-2 w-6 shrink-0 text-[12px] font-semibold text-gold-deep">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={clause.title}
                    placeholder="Clause title"
                    disabled={disabled}
                    aria-label={`Clause ${index + 1} title`}
                    onChange={(event) => patch(index, { title: event.target.value })}
                  />
                  <Textarea
                    value={clause.contentHtml}
                    placeholder="Clause text. Basic HTML is allowed."
                    disabled={disabled}
                    aria-label={`Clause ${index + 1} text`}
                    className="min-h-20 text-[13px]"
                    onChange={(event) => patch(index, { contentHtml: event.target.value })}
                  />
                  {clause.version && (
                    <p className="text-[11px] text-ink-mute">
                      From the Terms Master · {clause.version}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <IconButton
                    label="Move up"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={13} />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={disabled || index === clauses.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={13} />
                  </IconButton>
                  <IconButton label="Remove clause" disabled={disabled} onClick={() => remove(index)}>
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-line bg-surface p-1.5 text-ink-mute transition-colors hover:text-ink disabled:opacity-35"
    >
      {children}
    </button>
  );
}
