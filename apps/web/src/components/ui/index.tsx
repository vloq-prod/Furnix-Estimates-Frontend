import { AlertCircle, CheckCircle2, Info, Loader2, X, ChevronDown, Check } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useRef,
  Children,
  isValidElement,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from '@/lib/format';

/* ── Button ──────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90 border-ink',
  gold: 'bg-gold text-white hover:bg-gold-deep border-gold',
  secondary: 'bg-surface text-ink border-line hover:bg-canvas',
  ghost: 'bg-transparent text-ink-soft border-transparent hover:bg-line-soft hover:text-ink',
  danger: 'bg-danger-soft text-danger border-danger/20 hover:bg-danger hover:text-white',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-lg border font-medium',
        'transition-[background-color,color,box-shadow] duration-150',
        'disabled:cursor-not-allowed disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ── Card ────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={cx('card', padded && 'p-5 sm:p-6', className)}>{children}</div>;
}

export function CardHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="font-display text-[17px] font-bold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Form fields ─────────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = `${id}-help`;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      <p
        id={describedBy}
        className={cx('text-[12px] leading-snug', error ? 'text-danger' : 'text-ink-mute')}
        role={error ? 'alert' : undefined}
      >
        {error ?? hint ?? ''}
      </p>
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-mute ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-mute ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft/40';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(CONTROL_BASE, 'h-10 border-line', className)} />;
}

/** Right-aligned mono input for money and counts. */
export function NumberInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      inputMode="decimal"
      className={cx(CONTROL_BASE, 'figure h-10 border-line text-right', className)}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(CONTROL_BASE, 'min-h-24 border-line py-2.5', className)} />;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  placeholder?: string;
  onChange?: (event: { target: { value: string; name?: string } }) => void;
}

interface ParsedOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export function Select({
  className,
  children,
  value,
  onChange,
  disabled,
  placeholder,
  name,
  ...props
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Extract option objects from React children safely and cleanly
  const options = useMemo<ParsedOption[]>(() => {
    const list: ParsedOption[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === 'option') {
        list.push({
          value: String(child.props.value),
          label: child.props.children || String(child.props.value),
          disabled: child.props.disabled,
        });
      }
    });
    return list;
  }, [children]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === String(value));
  }, [options, value]);

  // Close helper
  const closeDropdown = useCallback(() => {
    setOpen(false);
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

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

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
      case 'ArrowDown': {
        event.preventDefault();
        let nextIndex = activeIndex;
        let count = 0;
        do {
          nextIndex = nextIndex + 1 >= options.length ? 0 : nextIndex + 1;
          count++;
        } while (options[nextIndex]?.disabled === true && count < options.length);
        const targetOpt = options[nextIndex];
        if (targetOpt && !targetOpt.disabled) {
          setActiveIndex(nextIndex);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        let prevIndex = activeIndex;
        let count = 0;
        do {
          prevIndex = prevIndex - 1 < 0 ? options.length - 1 : prevIndex - 1;
          count++;
        } while (options[prevIndex]?.disabled === true && count < options.length);
        const targetOpt = options[prevIndex];
        if (targetOpt && !targetOpt.disabled) {
          setActiveIndex(prevIndex);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const activeOption = options[activeIndex];
        if (activeOption && !activeOption.disabled) {
          onChange?.({ target: { value: activeOption.value, name } });
          closeDropdown();
        } else if (activeIndex === -1 && selectedOption) {
          closeDropdown();
        }
        break;
      }
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
      className={cx('relative w-full select-none', className)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'w-full h-10 px-3 flex items-center justify-between rounded-lg border bg-surface text-sm cursor-pointer transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
          disabled && 'cursor-not-allowed bg-canvas text-ink-mute opacity-70 border-line',
          !disabled && open && 'border-gold shadow-sm ring-1 ring-gold/20',
          !disabled && !open && 'border-line hover:border-ink-mute/50'
        )}
      >
        <span className={cx('truncate', !selectedOption && 'text-ink-mute')}>
          {selectedOption ? selectedOption.label : placeholder || 'Select option...'}
        </span>
        <ChevronDown
          size={15}
          className={cx(
            'text-ink-mute transition-transform duration-200 shrink-0 ml-2',
            open && 'rotate-180 text-ink'
          )}
        />
      </button>

      <div
        ref={listRef}
        className={cx(
          'absolute top-[calc(100%+6px)] left-0 z-[100] w-full min-w-[180px] overflow-hidden rounded-xl border border-line bg-surface shadow-lift transition-all duration-200 origin-top transform',
          open ? 'opacity-100 scale-100 pointer-events-auto translate-y-0' : 'opacity-0 scale-95 pointer-events-none -translate-y-1'
        )}
      >
        <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5" role="listbox">
          {options.map((option, index) => {
            const isSelected = option.value === String(value);
            const isActive = index === activeIndex;

            return (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange?.({ target: { value: option.value, name } });
                  closeDropdown();
                }}
                role="option"
                aria-selected={isSelected}
                className={cx(
                  'w-full px-2.5 py-2 text-left rounded-lg text-[13px] flex items-center justify-between cursor-pointer transition-colors duration-100',
                  option.disabled && 'opacity-40 cursor-not-allowed bg-transparent text-ink-mute',
                  !option.disabled && isSelected && 'bg-gold-soft text-gold-deep font-semibold',
                  !option.disabled && !isSelected && isActive && 'bg-canvas text-ink',
                  !option.disabled && !isSelected && !isActive && 'text-ink-soft hover:bg-canvas hover:text-ink'
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={14} className="text-gold-deep shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────── */

const BADGE_TONES = {
  neutral: 'bg-line-soft text-ink-soft border-line',
  gold: 'bg-gold-soft text-gold-deep border-gold/25',
  ok: 'bg-ok-soft text-ok border-ok/20',
  warn: 'bg-warn-soft text-warn border-warn/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-info border-info/20',
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5',
        'text-[11px] font-semibold uppercase tracking-wide',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── States ──────────────────────────────────────────────────────────── */

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-mute">
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 py-2" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-11 rounded-lg" />
      ))}
    </div>
  );
}

/** An empty screen is an invitation to act, so it always carries the action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-line bg-canvas text-ink-mute">
          {icon}
        </div>
      )}
      <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-danger/20 bg-danger-soft text-danger">
        <AlertCircle size={18} />
      </div>
      <h3 className="font-display text-[15px] font-bold text-ink">That didn't load</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-soft">{message}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative w-full rounded-t-2xl border border-line bg-surface shadow-lift sm:rounded-2xl',
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-[16px] font-bold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-ink-soft">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-mute hover:bg-line-soft hover:text-ink"
          >
            <X size={17} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>
        )}
      </div>
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────────────────────── */

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<{
  notify: (message: string, tone?: ToastTone) => void;
} | null>(null);

const TOAST_ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={16} className="text-ok" />,
  error: <AlertCircle size={16} className="text-danger" />,
  info: <Info size={16} className="text-info" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 shadow-lift"
          >
            {TOAST_ICONS[toast.tone]}
            <p className="text-[13px] leading-snug text-ink">{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
