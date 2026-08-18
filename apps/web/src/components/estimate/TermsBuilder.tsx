import { Check } from 'lucide-react';
import { useActiveTerms } from '@/hooks/useTerms';
import { cx } from '@/lib/format';

export interface ClauseDraft {
  sourceTemplateId?: string | null;
  title: string;
  contentHtml: string;
  version?: string | null;
  sequence: number;
  isCustom: boolean;
}

export function TermsBuilder({
  clauses,
  onChange,
  disabled,
}: {
  clauses: ClauseDraft[];
  onChange: (clauses: ClauseDraft[]) => void;
  disabled?: boolean;
}) {
  const { data: activeTemplates, isLoading } = useActiveTerms();

  const handleToggle = (template: any) => {
    if (disabled) return;
    const isSelected = clauses.some(
      (c) => c.sourceTemplateId === template.id || c.title === template.title,
    );
    if (isSelected) {
      const next = clauses.filter(
        (c) => c.sourceTemplateId !== template.id && c.title !== template.title,
      );
      onChange(next.map((c, i) => ({ ...c, sequence: i })));
    } else {
      const next = [
        ...clauses,
        {
          sourceTemplateId: template.id,
          title: template.title,
          contentHtml: template.contentHtml,
          version: template.version,
          sequence: clauses.length,
          isCustom: false,
        },
      ];
      onChange(next.map((c, i) => ({ ...c, sequence: i })));
    }
  };

  if (isLoading) {
    return <div className="text-sm text-ink-mute">Loading available terms...</div>;
  }

  const sortedTemplates = [...(activeTemplates ?? [])].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-surface">
      {sortedTemplates.map((template) => {
        const selected = clauses.some(
          (c) => c.sourceTemplateId === template.id || c.title === template.title,
        );
        return (
          <div key={template.id} className={cx('p-4 transition-colors', selected && 'bg-gold-soft/25')}>
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                aria-label={`Include ${template.title}`}
                disabled={disabled}
                onClick={() => handleToggle(template)}
                className={cx(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                  selected ? 'border-gold bg-gold text-white' : 'border-line bg-surface hover:border-ink-mute',
                )}
              >
                {selected && <Check size={13} strokeWidth={3} />}
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-ink">{template.title}</p>
                <p className="mt-0.5 max-w-prose text-[12px] leading-relaxed text-ink-soft">
                  {template.contentHtml.replace(/<[^>]*>/g, '')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
