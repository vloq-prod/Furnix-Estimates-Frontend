import { FileText, Filter, Plus, Search, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { EstimateStatus } from '@furnix/shared';
import { Permission } from '@furnix/shared';
import { HostingBadge, StatusBadge } from '@/components/estimate/StatusBadge';
import { CustomStatusSelect } from '@/components/estimate/CustomStatusSelect';
import { CustomHostingSelect } from '@/components/estimate/CustomHostingSelect';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  SkeletonRows,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useEstimates, type EstimateListQuery } from '@/hooks/useEstimates';
import { cx, daysUntil, inr, shortDate } from '@/lib/format';

interface EstimateListProps {
  initialPageSize?: number;
  showViewAllLink?: boolean;
  hidePagination?: boolean;
}

export function EstimateList({
  initialPageSize = 10,
  showViewAllLink = false,
  hidePagination = false,
}: EstimateListProps) {
  const navigate = useNavigate();
  const { can } = useAuth();
  
  const [query, setQuery] = useState<EstimateListQuery>({
    page: 1,
    pageSize: initialPageSize,
    status: 'ALL',
  });
  const [searchDraft, setSearchDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useEstimates(query);

  const patch = (changes: Partial<EstimateListQuery>) =>
    setQuery((current) => ({ ...current, page: 1, ...changes }));

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      patch({ search: searchDraft });
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchDraft]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compute suggestions from data?.items
  const getSuggestions = () => {
    const term = searchDraft.trim().toLowerCase();
    if (!term) return [];

    const matches = new Set<string>();

    data?.items.forEach((item) => {
      const fields = [
        item.clientCompanyName,
        item.contactPerson,
        item.estimateNumber,
        item.email,
      ];

      fields.forEach((field) => {
        if (field && field.toLowerCase().includes(term)) {
          matches.add(field);
        }
      });
    });

    const matchesArray = Array.from(matches);

    // Case-insensitive de-duplication
    const seen = new Set<string>();
    const uniqueMatches: string[] = [];
    for (const match of matchesArray) {
      const lower = match.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueMatches.push(match);
      }
    }

    // Rank prefix matches first
    return uniqueMatches
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aStarts = aLower.startsWith(term);
        const bStarts = bLower.startsWith(term);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aLower.localeCompare(bLower);
      })
      .slice(0, 8);
  };

  const suggestions = getSuggestions();

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchDraft(suggestion);
    patch({ search: suggestion });
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (focusedIndex >= 0 && suggestions[focusedIndex]) {
        handleSuggestionSelect(suggestions[focusedIndex]);
      } else {
        patch({ search: searchDraft });
        setIsOpen(false);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Helper for generating page number array with ellipsis
  const getPageNumbers = (currentPage: number, totalPages: number) => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        <div className="relative min-w-56 flex-1" ref={dropdownRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <Input
            className="pl-9"
            placeholder="Search by number, client, contact or email"
            value={searchDraft}
            onChange={(event) => {
              setSearchDraft(event.target.value);
              setIsOpen(true);
              setFocusedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            aria-label="Search estimates"
          />
          {isOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface py-2 shadow-lift">
              <ul>
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion}
                    className={cx(
                      'cursor-pointer px-4 py-2 text-[13px] text-ink transition-colors duration-100 hover:bg-canvas',
                      index === focusedIndex && 'bg-canvas font-medium text-gold-deep',
                    )}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <CustomStatusSelect
          className="w-44"
          value={query.status ?? 'ALL'}
          onChange={(nextStatus) => patch({ status: nextStatus })}
        />

        <CustomHostingSelect
          className="w-48"
          value={query.hostingModel ?? 'ALL'}
          onChange={(nextHosting) => patch({ hostingModel: nextHosting === 'ALL' ? undefined : nextHosting })}
        />

        <Button size="md" icon={<Filter size={14} />} onClick={() => patch({ search: searchDraft })}>
          Apply
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4">
          <SkeletonRows rows={6} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={<FileText size={18} />}
          title={query.search ? 'Nothing matched that search' : 'No estimates yet'}
          description={
            query.search
              ? 'Try a different number, client name or email address.'
              : 'Build your first estimate — pick the modules, set the user count, and the pricing works itself out.'
          }
          action={
            can(Permission.ESTIMATE_CREATE) && (
              <Button variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/estimates/new')}>
                New estimate
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden w-full md:table">
            <thead>
              <tr className="border-b border-line">
                {['Estimate', 'Client', 'Deployment', 'One-time', 'Monthly', 'Valid until', 'Status'].map(
                  (label, index) => (
                    <th
                      key={label}
                      className={cx(
                        'px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-mute',
                        index >= 3 && index <= 4 ? 'text-right' : 'text-left',
                      )}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody key={data?.meta.page} className={cx('fade-in-rows', isFetching && 'opacity-65 transition-opacity duration-200')}>
              {data?.items.map((estimate) => (
                <tr key={estimate.id} className="border-b border-line-soft last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3">
                    <Link
                      to={`/estimates/${estimate.id}`}
                      className="figure text-[13px] font-semibold text-ink hover:text-gold-deep"
                    >
                      {estimate.estimateNumber}
                    </Link>
                    <p className="mt-0.5 text-[11.5px] text-ink-mute">
                      {shortDate(estimate.estimateDate)}
                      {estimate.version > 1 && ` · rev ${estimate.version}`}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium text-ink">{estimate.clientCompanyName}</p>
                    <p className="text-[11.5px] text-ink-mute">{estimate.contactPerson}</p>
                  </td>
                  <td className="px-4 py-3">
                    <HostingBadge hostingModel={estimate.hostingModel} />
                    <p className="mt-1 text-[11.5px] text-ink-mute">{estimate.userCount} users</p>
                  </td>
                  <td className="figure px-4 py-3 text-right text-[13px] font-semibold text-ink">
                    {inr(estimate.netPayableOneTime)}
                  </td>
                  <td className="figure px-4 py-3 text-right text-[13px] text-gold-deep">
                    {Number(estimate.monthlyRecurringPayable) > 0
                      ? `${inr(estimate.monthlyRecurringPayable)}/mo`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ValidUntilCell date={estimate.validUntil} status={estimate.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={estimate.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <ul key={data?.meta.page} className={cx('divide-y divide-line-soft md:hidden fade-in-cards', isFetching && 'opacity-65 transition-opacity duration-200')}>
            {data?.items.map((estimate) => (
              <li key={estimate.id}>
                <Link to={`/estimates/${estimate.id}`} className="block p-4 hover:bg-canvas">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="figure text-[13px] font-semibold text-ink">{estimate.estimateNumber}</p>
                      <p className="mt-0.5 truncate text-[13px] text-ink">{estimate.clientCompanyName}</p>
                    </div>
                    <StatusBadge status={estimate.status} />
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between gap-3">
                    <span className="figure text-[15px] font-bold text-ink">
                      {inr(estimate.netPayableOneTime)}
                    </span>
                    {Number(estimate.monthlyRecurringPayable) > 0 && (
                      <span className="figure text-[13px] text-gold-deep">
                        + {inr(estimate.monthlyRecurringPayable)}/mo
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-ink-mute">
                    Valid until {shortDate(estimate.validUntil)} · {estimate.userCount} users
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {/* View All link below the table */}
          {showViewAllLink && data && data.meta.total > 10 && (
            <div className="flex justify-center border-t border-line px-4 py-3.5">
              <Link
                to="/estimates/all"
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-gold-deep hover:text-gold-deep/90 transition-colors"
              >
                View All Estimates
                <ChevronRight size={15} className="mt-0.5" />
              </Link>
            </div>
          )}

          {/* Number-based pagination */}
          {!hidePagination && data && data.meta.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="text-[12.5px] text-ink-soft">
                Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} estimates
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  disabled={!data.meta.hasPrevious}
                  onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) - 1 }))}
                >
                  Previous
                </Button>
                
                {getPageNumbers(data.meta.page, data.meta.totalPages).map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 text-ink-mute text-[13px] font-medium">
                        ...
                      </span>
                    );
                  }
                  const pageNum = Number(page);
                  const isCurrent = pageNum === data.meta.page;
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={isCurrent ? 'primary' : 'secondary'}
                      onClick={() => setQuery((current) => ({ ...current, page: pageNum }))}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  size="sm"
                  disabled={!data.meta.hasNext}
                  onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function ValidUntilCell({ date, status }: { date: string; status: EstimateStatus }) {
  const remaining = daysUntil(date);
  const atRisk = status === 'SENT' && remaining <= 7 && remaining >= 0;

  return (
    <div>
      <p className="text-[12.5px] text-ink">{shortDate(date)}</p>
      {atRisk && <p className="text-[11.5px] font-medium text-warn">{remaining}d left</p>}
      {status === 'SENT' && remaining < 0 && <p className="text-[11.5px] text-danger">Overdue</p>}
    </div>
  );
}
