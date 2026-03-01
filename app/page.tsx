import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/components/ui/ThemeToggle'

const GITHUB_URL = 'https://github.com/Jamflynt/openquill'
const kofiUrl = process.env.NEXT_PUBLIC_KOFI_URL

export default async function HomePage() {
  let waitlistCount = 0
  try {
    const supabase = await createClient()
    const { data } = await supabase.rpc('get_waitlist_count')
    waitlistCount = Number(data ?? 0)
  } catch {
    // fail silently — landing page still works without count
  }

  return (
    <main className="min-h-screen flex flex-col relative" style={{ background: 'var(--quill-cream)' }}>
      <div className="absolute top-3 right-3 z-10">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">

        {/* ── Wordmark ───────────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <h1
            className="quill-wordmark text-6xl"
            style={{ color: 'var(--quill-green)' }}
          >
            OPENQUILL
          </h1>
        </div>

        {/* ── Hero headline ──────────────────────────────────────────────── */}
        <p
          className="text-2xl font-semibold text-center mb-3 max-w-md"
          style={{ color: 'var(--quill-ink)' }}
        >
          Paste your bank statement. No Plaid. No passwords.
        </p>
        <p
          className="text-sm text-center mb-12 max-w-sm"
          style={{ color: 'var(--quill-muted)' }}
        >
          Claude reads your statement, categorizes every transaction, and gives you a clear picture of where your money went.
        </p>

        {/* ── App Preview ────────────────────────────────────────────────────
            A live HTML render of what the dashboard looks like.
            Uses real design tokens — always consistent with the actual app.
            Data is representative of a real user's month, not aspirational.
        ──────────────────────────────────────────────────────────────────── */}
        <div
          aria-hidden="true"
          className="w-full max-w-sm mb-12 overflow-hidden border"
          style={{ borderColor: 'var(--quill-rule)', borderRadius: '4px' }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-1.5 px-3 py-2.5 border-b"
            style={{ background: 'var(--quill-card)', borderColor: 'var(--quill-rule)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--quill-rule)' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--quill-rule)' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--quill-rule)' }} />
            <span
              className="text-xs ml-2 font-mono"
              style={{ color: 'var(--quill-muted)' }}
            >
              openquill.vercel.app/dashboard
            </span>
          </div>

          {/* Faux nav bar */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-b"
            style={{ background: 'var(--quill-card)', borderColor: 'var(--quill-rule)' }}
          >
            <span
              className="quill-wordmark text-sm"
              style={{ color: 'var(--quill-green)', fontSize: '0.85rem' }}
            >
              OPENQUILL
            </span>
            <div className="flex gap-1">
              {['Dashboard', 'Import', 'Debts'].map((item, i) => (
                <span
                  key={item}
                  className="text-xs px-2 py-1"
                  style={{
                    color: i === 0 ? 'var(--quill-cream)' : 'var(--quill-muted)',
                    background: i === 0 ? 'var(--quill-green)' : 'transparent',
                    borderRadius: '2px',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Dashboard content preview */}
          <div className="px-4 py-5" style={{ background: 'var(--quill-cream)' }}>

            {/* Net position — the typographic hero */}
            <div
              className="py-4 mb-5"
              style={{
                borderTop: '1px solid var(--quill-rule)',
                borderBottom: '1px solid var(--quill-rule)',
              }}
            >
              <p
                className="text-xs tracking-widest uppercase mb-2"
                style={{ color: 'var(--quill-muted)' }}
              >
                Net · February 2026
              </p>
              <p
                style={{
                  fontSize: '2.25rem',
                  fontFamily: 'var(--font-playfair)',
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--quill-green)',
                  marginBottom: '6px',
                }}
              >
                +$247.00
              </p>
              <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                You are ahead this month.
              </p>
            </div>

            {/* Spending breakdown — ledger table */}
            <div>
              <div
                className="flex justify-between pb-2 mb-1"
                style={{ borderBottom: '1px solid var(--quill-rule)' }}
              >
                <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--quill-muted)' }}>
                  Category
                </span>
                <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--quill-muted)' }}>
                  Amount
                </span>
              </div>

              {[
                { cat: 'Housing',          amt: '$1,400', pct: 54, color: 'var(--quill-green)' },
                { cat: 'Food & Groceries', amt: '$380',   pct: 15, color: '#4A6E5A' },
                { cat: 'Dining Out',       amt: '$247',   pct: 10, color: 'var(--quill-amber)' },
                { cat: 'Transportation',   amt: '$190',   pct: 7,  color: '#6B4F30' },
              ].map((row, i) => (
                <div
                  key={i}
                  className="py-2.5"
                  style={{ borderBottom: '1px solid var(--quill-rule)' }}
                >
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-xs" style={{ color: 'var(--quill-ink)' }}>
                      {row.cat}
                    </span>
                    <span
                      className="num text-xs"
                      style={{ color: 'var(--quill-ink)', fontFamily: 'var(--font-plex-mono)' }}
                    >
                      {row.amt}
                    </span>
                  </div>
                  <div
                    className="w-full overflow-hidden"
                    style={{ height: '2px', background: 'var(--quill-rule)' }}
                  >
                    <div
                      className="h-full"
                      style={{ width: `${row.pct}%`, background: row.color }}
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-between pt-2.5">
                <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                  Total spending
                </span>
                <span
                  className="num text-xs font-semibold"
                  style={{ color: 'var(--quill-red)', fontFamily: 'var(--font-plex-mono)' }}
                >
                  $2,341
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature list ───────────────────────────────────────────────── */}
        <div
          className="w-full max-w-sm mb-10 border text-sm overflow-hidden"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          {[
            { text: 'No bank credentials — ever. Your bank login stays with you.', strong: true },
            { text: 'Works with USAA, Ally, Apple Card, Chase, and any bank that offers statement exports.' },
            { text: 'Claude parses and categorizes every transaction automatically.' },
            { text: 'Ask "can I afford this?" and get an honest, direct answer.' },
            { text: 'Free & open source. Your data lives in your own database.', href: GITHUB_URL },
          ].map((feature, i) => (
            <div
              key={i}
              className="px-5 py-4 flex items-start gap-3"
              style={{ borderTop: i > 0 ? '1px solid var(--quill-rule)' : undefined }}
            >
              <span style={{ color: 'var(--quill-green)' }} className="mt-0.5 font-mono text-xs shrink-0">
                →
              </span>
              {feature.href ? (
                <a
                  href={feature.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--quill-ink)', fontWeight: feature.strong ? 600 : undefined, textDecoration: 'underline' }}
                >
                  {feature.text}
                </a>
              ) : (
                <span
                  style={{ color: 'var(--quill-ink)', fontWeight: feature.strong ? 600 : undefined }}
                >
                  {feature.text}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Why OpenQuill? ────────────────────────────────────────────────── */}
        <div
          className="w-full max-w-sm mb-10 p-5 border text-sm space-y-2"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <p
            className="text-xs font-medium tracking-wide uppercase mb-3"
            style={{ color: 'var(--quill-muted)' }}
          >
            Why OpenQuill?
          </p>
          <p style={{ color: 'var(--quill-ink)' }}>
            Most finance apps ask for your bank login. Your credentials pass through Plaid or a similar aggregator. That aggregator gets breached. Or they sell your data. Or they shut down and take your history.
          </p>
          <p style={{ color: 'var(--quill-muted)' }}>
            OpenQuill doesn&apos;t connect to your bank. You copy your statement, paste it, and OpenQuill reads it. No credentials. No third party with your login. No subscription to lose access to your own data.
          </p>
        </div>

        {/* ── Trust signals ──────────────────────────────────────────────── */}
        <div
          className="w-full max-w-sm mb-10 border overflow-hidden"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <p
            className="text-xs font-medium tracking-wide uppercase px-5 pt-4 pb-3"
            style={{ color: 'var(--quill-muted)' }}
          >
            What we actually do
          </p>
          {[
            { text: 'Open source — full code on GitHub, read it yourself', href: GITHUB_URL },
            { text: 'Row-level database security — your data locked at the database, not just the app' },
            { text: 'No analytics, no behavioral tracking — your financial data is never sold or shared' },
            { text: 'Parsing uses Anthropic\'s Claude API — statement text sent ephemerally, never stored or used for training' },
            { text: 'Delete your account anytime — all data purged, no recovery' },
          ].map((item, i) => (
            <div
              key={i}
              className="px-5 py-3 flex items-start gap-3 text-sm"
              style={{ borderTop: '1px solid var(--quill-rule)', color: 'var(--quill-muted)' }}
            >
              <span
                className="font-mono text-xs mt-0.5 shrink-0"
                style={{ color: 'var(--quill-green)' }}
              >
                ✓
              </span>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {item.text}
                </a>
              ) : (
                <span>{item.text}</span>
              )}
            </div>
          ))}
          <div
            className="px-5 py-3 text-xs"
            style={{ borderTop: '1px solid var(--quill-rule)', color: 'var(--quill-muted)' }}
          >
            <Link
              href="/privacy"
              className="underline"
              style={{ color: 'var(--quill-green)' }}
            >
              Read the privacy policy →
            </Link>
            {' '}Plain English. No legalese.
          </div>
        </div>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90 active:opacity-80"
          style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)', borderRadius: '2px' }}
        >
          Get started →
        </Link>
        <p className="text-xs mt-3" style={{ color: 'var(--quill-muted)' }}>
          No account yet? That&apos;s fine — entering your email creates one.
        </p>
        <p className="text-xs mt-4" style={{ color: 'var(--quill-muted)' }}>
          {waitlistCount >= 50 ? `${waitlistCount} people on the Pro waitlist — ` : 'Pro tier coming soon — '}
          <Link href="/waitlist" className="underline" style={{ color: 'var(--quill-green)' }}>
            join the waitlist →
          </Link>
        </p>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="border-t px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
        style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
      >
        <div className="flex items-center gap-4">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--quill-muted)' }}
          >
            Free &amp; open source
          </a>
          <Link href="/privacy" className="hover:underline" style={{ color: 'var(--quill-muted)' }}>
            Privacy
          </Link>
          <Link href="/terms" className="hover:underline" style={{ color: 'var(--quill-muted)' }}>
            Terms
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--quill-muted)' }}
          >
            Built by one person
          </a>
        </div>
        {kofiUrl && (
          <a
            href={kofiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--quill-green)' }}
          >
            Support development →
          </a>
        )}
      </footer>
    </main>
  )
}
