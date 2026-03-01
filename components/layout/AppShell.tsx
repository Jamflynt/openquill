'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Upload, CreditCard, Target, Settings2, List, Sun, Moon, Monitor } from 'lucide-react'

type NavLink = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }> | null
  mobile: boolean
}

const NAV_LINKS: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { href: '/accounts', label: 'Accounts', icon: null, mobile: false },
  { href: '/statements/import', label: 'Import', icon: Upload, mobile: true },
  { href: '/transactions', label: 'Transactions', icon: List, mobile: true },
  { href: '/debts', label: 'Debts', icon: CreditCard, mobile: true },
  { href: '/goals', label: 'Goals', icon: Target, mobile: true },
  { href: '/settings', label: 'Settings', icon: Settings2, mobile: true },
]

interface AppShellProps {
  children: React.ReactNode
  user?: { email: string; name: string | null } | null
}

export default function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function cycleTheme() {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const ThemeIcon = !mounted ? null : theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const themeLabel = !mounted ? '' : theme === 'dark' ? 'Dark mode — click for system' : theme === 'light' ? 'Light mode — click for dark' : 'System theme — click for light'

  const kofiUrl = process.env.NEXT_PUBLIC_KOFI_URL

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--quill-cream)' }}>
      {/* Skip to content — visible on keyboard focus only */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium"
        style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
      >
        Skip to content
      </a>

      {/* Top nav */}
      <header
        className="border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40"
        style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
      >
        <span
          className="quill-wordmark text-lg"
          style={{ color: 'var(--quill-green)' }}
        >
          OPENQUILL
        </span>

        <div className="flex items-center gap-3">
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className="px-3 py-1.5 text-xs font-medium rounded-sm transition-colors quill-nav-link"
                  style={{
                    background: active ? 'var(--quill-green)' : 'transparent',
                    color: active ? 'var(--quill-cream)' : 'var(--quill-muted)',
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Theme toggle */}
          {mounted && ThemeIcon && (
            <button
              onClick={cycleTheme}
              aria-label={themeLabel}
              title={themeLabel}
              className="p-1.5 rounded-sm transition-colors hover:opacity-70"
              style={{ color: 'var(--quill-muted)' }}
            >
              <ThemeIcon size={15} aria-hidden={true} />
            </button>
          )}

          {/* Sign out — visible on all screen sizes */}
          {user && (
            <button
              onClick={signOut}
              className="text-xs px-2 py-1 rounded-sm transition-colors hover:opacity-70"
              style={{ color: 'var(--quill-muted)' }}
            >
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1 pb-20 md:pb-6">{children}</main>

      {/* Ko-fi footer link — always visible when NEXT_PUBLIC_KOFI_URL is set */}
      {kofiUrl && (
        <div
          className="text-center py-3 text-xs border-t"
          style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
        >
          <a
            href={kofiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: 'var(--quill-green)' }}
          >
            I build this solo — support development on Ko-fi
          </a>
        </div>
      )}

      {/* Mobile bottom nav — 5 items (Accounts accessible via dashboard), 11px labels */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-40"
        style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
      >
        {NAV_LINKS.filter((link) => link.mobile).map((link) => {
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px]"
              style={{ color: active ? 'var(--quill-green)' : 'var(--quill-muted)' }}
            >
              {link.icon && <link.icon size={18} aria-hidden={true} />}
              <span className="text-[11px] tracking-wider">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
