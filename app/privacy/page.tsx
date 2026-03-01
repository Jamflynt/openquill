import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — OpenQuill',
  description: 'How OpenQuill handles your financial data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--quill-cream)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="text-xs tracking-widest uppercase font-mono mb-6 block"
            style={{ color: 'var(--quill-muted)' }}
          >
            ← OPENQUILL
          </Link>
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--quill-ink)' }}>
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: 'var(--quill-muted)' }}>
            Last updated February 2026. Plain English — no lawyer fog.
          </p>
        </div>

        <div className="space-y-8 text-sm" style={{ color: 'var(--quill-ink)', lineHeight: '1.7' }}>

          {/* The short version */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid #D4C9B8' }}>
              The short version
            </h2>
            <ul className="space-y-2" style={{ color: 'var(--quill-ink)' }}>
              <li>Your bank statement text is sent to Claude (Anthropic) for parsing and is <strong>never stored</strong> by OpenQuill after parsing is complete.</li>
              <li>Your transaction data (amounts, dates, categories) is stored in your account so the app can show you your history.</li>
              <li>We do not sell your data. We do not share it with third parties for advertising.</li>
              <li>You can delete your account and all associated data at any time.</li>
            </ul>
          </section>

          {/* What you paste */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid #D4C9B8' }}>
              What happens when you paste a statement
            </h2>
            <p className="mb-3">
              When you paste bank statement text into OpenQuill, that text is transmitted over HTTPS to our server. Our server forwards the text to Anthropic&apos;s Claude API to extract transaction details (dates, amounts, descriptions). Once Claude responds, <strong>the raw statement text is discarded</strong> — it is not written to our database.
            </p>
            <p>
              What we store: the parsed transaction data (date, amount, merchant name, category, whether it&apos;s income). We do not store your account numbers, routing numbers, full statement text, or any other raw bank document content.
            </p>
          </section>

          {/* Anthropic */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid #D4C9B8' }}>
              Your data and Anthropic
            </h2>
            <p className="mb-3">
              OpenQuill uses Anthropic&apos;s Claude API to parse your statements. When you submit a statement, its text is sent to Anthropic&apos;s servers as part of an API request. Anthropic&apos;s data handling is governed by their own privacy policy.
            </p>
            <p>
              Anthropic does not use API calls for model training. Your statement text is processed ephemerally and is not retained by Anthropic for training purposes. For full details, see{' '}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--quill-green)', textDecoration: 'underline' }}
              >
                anthropic.com/privacy
              </a>.
            </p>
          </section>

          {/* Account data */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid #D4C9B8' }}>
              What we store in your account
            </h2>
            <ul className="space-y-2">
              <li><strong>Account info:</strong> your email address, optional display name, income figures you enter.</li>
              <li><strong>Financial accounts:</strong> the account names, types, and balances you add manually.</li>
              <li><strong>Transactions:</strong> date, amount, description, category, and whether each transaction is marked as income.</li>
              <li><strong>Debts and obligations:</strong> whatever you enter into the debt tracker and fixed obligations fields.</li>
              <li><strong>Savings goals:</strong> goal names, target amounts, and linked accounts.</li>
            </ul>
            <p className="mt-3">
              None of this is sold, rented, or shared with advertising networks.
            </p>
          </section>

          {/* Infrastructure */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid #D4C9B8' }}>
              Infrastructure and security
            </h2>
            <p className="mb-3">
              OpenQuill is hosted on Vercel (application) and Supabase (database). Both providers have SOC 2 compliance. Your data is encrypted in transit (TLS) and at rest. Database access requires authentication on every request — there is no anonymous access to your financial data.
            </p>
            <p className="mb-3">
              Row-level security is enforced at the database level: even if there were a bug in the application code, your data can only be read by you.
            </p>
            <p>
              OpenQuill uses Sentry for error monitoring. If the application crashes or throws an unhandled error, Sentry captures the error message, stack trace, and basic browser information (browser version, OS). <strong>Sentry does not receive your statement text, transaction data, or any financial information.</strong> Error reports are used only to diagnose and fix bugs. Sentry&apos;s privacy policy is at{' '}
              <a
                href="https://sentry.io/privacy/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--quill-green)', textDecoration: 'underline' }}
              >
                sentry.io/privacy
              </a>.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid #D4C9B8' }}>
              Cookies and sessions
            </h2>
            <p>
              OpenQuill uses a session cookie to keep you logged in after clicking a magic link. No tracking cookies, no analytics cookies, no ad pixels. We don&apos;t use Google Analytics or any third-party analytics service.
            </p>
          </section>

          {/* Deletion */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid #D4C9B8' }}>
              Deleting your data
            </h2>
            <p>
              You can delete your account from the settings page. This permanently removes all your data — transactions, accounts, debts, goals, and your email address — from our database. This action cannot be undone. Backups are rotated within 30 days, so your data will be fully purged within that window.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid #D4C9B8' }}>
              Questions
            </h2>
            <p>
              OpenQuill is an open-source personal project. If you have privacy questions or concerns,{' '}
              open a GitHub issue at{' '}
              <a
                href="https://github.com/Jamflynt/openquill/issues"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--quill-green)', textDecoration: 'underline' }}
              >
                github.com/Jamflynt/openquill/issues
              </a>.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6" style={{ borderTop: '1px solid var(--quill-rule)' }}>
          <div className="flex gap-4">
            <Link href="/" className="text-xs" style={{ color: 'var(--quill-muted)' }}>
              ← Back to OpenQuill
            </Link>
            <Link href="/terms" className="text-xs" style={{ color: 'var(--quill-muted)' }}>
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
