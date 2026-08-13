import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { EstimateStatus } from '@furnix/shared';
import { cx } from '@/lib/format';

interface StatusOption {
  value: EstimateStatus | 'ALL';
  label: string;
  dotClass: string;
  badgeClass: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'ALL', label: 'All statuses', dotClass: 'bg-ink-mute', badgeClass: 'bg-line-soft text-ink-soft border-line' },
  { value: 'DRAFT', label: 'Draft', dotClass: 'bg-ink-mute', badgeClass: 'bg-line-soft text-ink border-line' },
  { value: 'SENT', label: 'Sent', dotClass: 'bg-info', badgeClass: 'bg-info-soft text-info border-info/20' },
  { value: 'ACCEPTED', label: 'Accepted', dotClass: 'bg-ok', badgeClass: 'bg-ok-soft text-ok border-ok/20' },
  { value: 'REJECTED', label: 'Rejected', dotClass: 'bg-danger', badgeClass: 'bg-danger-soft text-danger border-danger/20' },
  { value: 'EXPIRED', label: 'Expired', dotClass: 'bg-warn', badgeClass: 'bg-warn-soft text-warn border-warn/20' },
];

export function CustomStatusSelect({
  value,
  onChange,
  className,
}: {
  value: EstimateStatus | 'ALL';
  onChange: (next: EstimateStatus | 'ALL') => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = STATUS_OPTIONS.find((opt) => opt.value === value) ?? STATUS_OPTIONS[0]!;

  const filteredOptions = STATUS_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSearch('');
    setActiveIndex(-1);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [closeDropdown]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeDropdown();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1 >= filteredOptions.length ? 0 : prev + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          const opt = filteredOptions[activeIndex];
          if (opt) {
            onChange(opt.value);
            closeDropdown();
          }
        } else if (filteredOptions.length > 0) {
          const firstOpt = filteredOptions[0];
          if (firstOpt) {
            onChange(firstOpt.value);
            closeDropdown();
          }
        }
        break;
      case 'Tab':
        closeDropdown();
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={cx('relative select-none', className)}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'w-full h-10 px-3 flex items-center justify-between rounded-lg border border-line bg-surface text-sm cursor-pointer transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
          open ? 'border-gold shadow-sm' : 'hover:border-ink-mute'
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Selected Status in Badge Style */}
          <span
            className={cx(
              'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
              selectedOption.badgeClass
            )}
          >
            <span className={cx('size-1.5 rounded-full shrink-0', selectedOption.dotClass)} />
            {selectedOption.label}
          </span>
        </div>
        <ChevronDown
          size={15}
          className={cx(
            'text-ink-mute transition-transform duration-200 shrink-0 ml-1',
            open && 'rotate-180 text-ink'
          )}
        />
      </button>

      {/* Options Panel Dropdown */}
      <div
        ref={listRef}
        className={cx(
          'absolute top-[calc(100%+6px)] left-0 z-50 w-full min-w-[180px] overflow-hidden rounded-xl border border-line bg-surface shadow-lift transition-all duration-150 origin-top transform',
          open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-line px-2.5 py-2">
          <Search size={13} className="text-ink-mute shrink-0 mr-1.5" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search status..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(-1);
            }}
            className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-mute focus:outline-none"
          />
        </div>

        {/* Options List */}
        <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5" role="listbox">
          {filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  closeDropdown();
                }}
                role="option"
                aria-selected={isSelected}
                className={cx(
                  'w-full px-2.5 py-2 text-left rounded-lg text-[13px] flex items-center gap-2 cursor-pointer transition-colors duration-100',
                  isSelected && 'bg-gold-soft/30 text-gold-deep font-medium',
                  !isSelected && isActive && 'bg-canvas text-ink',
                  !isSelected && !isActive && 'text-ink-soft hover:bg-canvas hover:text-ink'
                )}
              >
                <span className={cx('size-2 rounded-full shrink-0', option.dotClass)} />
                <span className="flex-1">{option.label}</span>
                {isSelected && (
                  <span className="text-[10px] uppercase font-bold tracking-wide text-gold-deep bg-gold-soft px-1.5 py-0.5 rounded">
                    Active
                  </span>
                )}
              </button>
            );
          })}
          
          {filteredOptions.length === 0 && (
            <p className="p-3 text-center text-[12px] text-ink-mute">
              No status matched
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
