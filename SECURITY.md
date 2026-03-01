# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenQuill, **please do not open a public GitHub issue.** Security issues require responsible disclosure so they can be fixed before being publicized.

Instead, report the vulnerability by emailing:

**security@openquill.xyz**

Include as much detail as you can:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

## Response Timeline

- **Acknowledgment:** Within 48 hours of your report
- **Assessment:** Within 1 week
- **Fix:** As soon as practical, depending on severity

## Scope

The following are in scope for security reports:
- Authentication and session handling
- Row-level security bypass
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- API route authorization issues
- Data exposure between users
- Sensitive data in error messages or logs

The following are **out of scope:**
- Denial of service (rate limiting is basic by design)
- Social engineering
- Issues in third-party services (Supabase, Vercel, Anthropic) — report those directly to the provider

## Architecture Notes

For context when reviewing:
- OpenQuill does **not** store bank credentials — there are no OAuth tokens, no Plaid integration, no stored passwords
- Authentication is magic-link only (Supabase Auth)
- Row-level security (RLS) is enforced at the PostgreSQL level on every table
- Statement text is processed ephemerally and not persisted after parsing
- Sentry error reports strip request bodies and cookies via `beforeSend`

## Credit

We're happy to credit security researchers who report valid vulnerabilities. Let us know in your report if you'd like to be credited and how you'd like to be named.
