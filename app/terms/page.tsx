import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — OpenQuill',
  description: 'Terms of service for using OpenQuill.',
}

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: 'var(--quill-muted)' }}>
            Last updated March 2026. Plain language, like everything else here.
          </p>
        </div>

        <div className="space-y-8 text-sm" style={{ color: 'var(--quill-ink)', lineHeight: '1.7' }}>

          {/* What OpenQuill is */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              What OpenQuill is
            </h2>
            <p className="mb-3">
              OpenQuill is a free, open-source personal finance tool. You paste your bank statement text, and OpenQuill uses AI to parse and categorize your transactions so you can see where your money goes.
            </p>
            <p>
              <strong>OpenQuill is not a financial advisor.</strong> It does not provide financial advice, investment recommendations, or tax guidance. The numbers it shows you are based on what you paste — nothing more, nothing less.
            </p>
          </section>

          {/* Using the service */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              Using the service
            </h2>
            <p className="mb-3">
              By creating an account and using OpenQuill, you agree to these terms. If you don&apos;t agree, don&apos;t use the service — no hard feelings.
            </p>
            <p>
              You&apos;re responsible for the accuracy of the data you paste into OpenQuill. We parse what you give us. If the statement text is incomplete or incorrect, the results will be too.
            </p>
          </section>

          {/* Your data */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              Your data
            </h2>
            <p className="mb-3">
              Your financial data belongs to you. OpenQuill stores your parsed transactions, accounts, debts, and goals so the app can show you your history. We do not sell, rent, or share your data with advertisers or data brokers.
            </p>
            <p>
              For full details on how we handle your data, read our{' '}
              <Link
                href="/privacy"
                style={{ color: 'var(--quill-green)', textDecoration: 'underline' }}
              >
                Privacy Policy
              </Link>.
            </p>
          </section>

          {/* AI parsing */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              AI-powered parsing
            </h2>
            <p className="mb-3">
              OpenQuill sends your statement text to Anthropic&apos;s Claude API for parsing. This means your statement text temporarily passes through Anthropic&apos;s servers. After parsing, the raw text is discarded — it is not stored in our database.
            </p>
            <p>
              AI parsing is not perfect. Categories may be wrong. Amounts may be misread from poorly formatted statements. Always review parsed transactions before committing them to your account.
            </p>
          </section>

          {/* Limitation of liability */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              Limitation of liability
            </h2>
            <p className="mb-3">
              OpenQuill is provided <strong>&quot;as is&quot;</strong> without warranty of any kind. We do our best to keep the service running and your data safe, but we make no guarantees about uptime, accuracy, or fitness for any particular purpose.
            </p>
            <p className="mb-3">
              To the maximum extent permitted by law, OpenQuill and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenue, whether incurred directly or indirectly, or any loss of data, use, or goodwill.
            </p>
            <p>
              <strong>Do not make financial decisions based solely on what OpenQuill shows you.</strong> Verify important numbers against your actual bank statements and consult a qualified financial professional for advice.
            </p>
          </section>

          {/* Account termination */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              Account deletion
            </h2>
            <p>
              You can delete your account at any time from the settings page. Deletion permanently removes all your data — transactions, accounts, debts, goals, and your email address. This cannot be undone. We do not keep your data &quot;just in case.&quot;
            </p>
          </section>

          {/* Open source */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              Open source
            </h2>
            <p>
              OpenQuill&apos;s source code is available under the{' '}
              <a
                href="https://github.com/Jamflynt/openquill"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--quill-green)', textDecoration: 'underline' }}
              >
                MIT License
              </a>. You can inspect the code, self-host it, or contribute to it. The MIT License governs use of the source code; these Terms of Service govern use of the hosted service at openquill.vercel.app.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              Changes to these terms
            </h2>
            <p>
              We may update these terms as the project evolves. Significant changes will be noted in the app or on the project&apos;s GitHub repository. Continued use of OpenQuill after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-base font-semibold mb-3 pb-2" style={{ borderBottom: '1px solid var(--quill-rule)' }}>
              Questions
            </h2>
            <p>
              OpenQuill is an open-source personal project. If you have questions about these terms,{' '}
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
            <Link href="/privacy" className="text-xs" style={{ color: 'var(--quill-muted)' }}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
