'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  function cycleTheme() {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const label =
    theme === 'dark'
      ? 'Dark mode — click for system'
      : theme === 'light'
      ? 'Light mode — click for dark'
      : 'System theme — click for light'

  return (
    <button
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className="p-1.5 rounded-sm transition-colors hover:opacity-70"
      style={{ color: 'var(--quill-muted)' }}
    >
      <Icon size={15} aria-hidden={true} />
    </button>
  )
}
