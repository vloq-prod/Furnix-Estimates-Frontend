import {
  Blocks,
  FileText,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Permission } from '@furnix/shared';
import { useAuth } from '@/hooks/useAuth';
import { cx } from '@/lib/format';

const NAV = [
  { to: '/estimates', label: 'Estimates', icon: FileText, permission: Permission.ESTIMATE_VIEW },
  { to: '/modules', label: 'Module Master', icon: Blocks, permission: Permission.MODULE_VIEW },
  { to: '/terms', label: 'Terms Master', icon: ScrollText, permission: Permission.TERMS_VIEW },
  { to: '/settings', label: 'Pricing settings', icon: Settings, permission: Permission.SETTINGS_VIEW },
] as const;

export function AppShell() {
  const { user, can, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV.filter((item) => can(item.permission));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Mobile bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <BrandMark />
        <button
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="rounded-lg border border-line p-2 text-ink-soft"
        >
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </header>

      <nav
        className={cx(
          'no-print border-line bg-surface',
          'lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:px-4 lg:py-6',
          mobileOpen ? 'block border-b px-4 py-4' : 'hidden lg:block',
        )}
      >
        <div className="hidden lg:mb-8 lg:block lg:px-2">
          <BrandMark />
        </div>

        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                    isActive
                      ? 'bg-ink text-white'
                      : 'text-ink-soft hover:bg-line-soft hover:text-ink',
                  )
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {user && (
          <div className="mt-6 border-t border-line pt-4 lg:absolute lg:bottom-6 lg:left-4 lg:right-4 lg:mt-0">
            <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11.5px] text-ink-mute">
              {user.role.replace(/_/g, ' ').toLowerCase()}
            </p>
            <button
              onClick={signOut}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft hover:text-ink"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        )}
      </nav>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/furnix-mark.png"
        alt="Furnix"
        width={28}
        height={28}
        className="size-7 rounded-lg"
      />
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
        Estimates
      </span>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">{description}</p>
        )}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
