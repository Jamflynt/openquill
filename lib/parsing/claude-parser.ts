import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ParsedTransaction, TransactionCategory } from '@/types/database'

const client = new Anthropic()

const PARSE_MODEL = process.env.CLAUDE_PARSE_MODEL ?? 'claude-haiku-4-5-20251001'

// Zod schema for validating Claude's response
const ParsedTransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number(),
  suggestedCategory: z.string() as z.ZodType<TransactionCategory>,
  isIncome: z.boolean(),
  isTransfer: z.boolean(),
})

const ParsedTransactionsSchema = z.array(ParsedTransactionSchema)

const SYSTEM_PROMPT = `You are a bank statement parser. Extract all transactions and the ending balance from the statement text provided.

Return ONLY valid JSON — no markdown, no explanation, no code fences.

Return an object with this exact shape:
{
  "endingBalance": number | null,
  "transactions": [
    {
      "date": "MM/DD",
      "description": "string",
      "amount": number,
      "suggestedCategory": "string",
      "isIncome": boolean,
      "isTransfer": boolean
    }
  ]
}

For endingBalance: extract the final/ending/closing balance from the statement. Use null if not clearly stated.

Amount sign convention: negative for debits/charges/withdrawals, positive for credits/deposits/income.

Use only these categories:
Housing, Utilities, Food & Groceries, Dining Out, Transportation,
Subscriptions, Shopping, Health, Entertainment, Debt Payments,
Savings / Transfers, Income, Other

Category guidance:
- Rent/mortgage → Housing
- Electric, gas, water, internet → Utilities
- Grocery stores → Food & Groceries
- Restaurants, fast food, coffee shops → Dining Out
- Gas stations, auto, public transit, Uber/Lyft → Transportation
- Netflix, Spotify, Apple, subscriptions → Subscriptions
- Amazon, retail, clothing → Shopping
- Medical, pharmacy, dental → Health
- Movies, games, entertainment → Entertainment
- Loan payments, credit card payments → Debt Payments
- Bank transfers, savings deposits → Savings / Transfers
- Payroll, direct deposit, 1099 income → Income

Skip these entirely (do not include in output):
- Beginning/ending balance lines
- Interest summary lines and fee summaries
- Page headers, footers, promotional text
- Any line that is not a transaction
- Reward point values

For isIncome: true only for payroll deposits, 1099 income, tax refunds
For isTransfer: true for bank-to-bank transfers, credit card payments from checking`

/**
 * Detect the financial institution from statement text header
 */
export function detectInstitution(text: string): string {
  const sample = text.slice(0, 500).toUpperCase()

  if (sample.includes('USAA')) {
    if (sample.includes('CREDIT CARD') || sample.includes('MASTERCARD') || sample.includes('AMEX')) {
      return 'USAA Credit Card'
    }
    return 'USAA Checking'
  }
  if (sample.includes('ALLY BANK') || sample.includes('ALLY HIGH YIELD')) return 'Ally HYS'
  if (sample.includes('APPLE CARD') || sample.includes('GOLDMAN SACHS')) return 'Apple Card'
  if (sample.includes('CHASE')) return 'Chase'
  if (sample.includes('BANK OF AMERICA')) return 'Bank of America'
  if (sample.includes('WELLS FARGO')) return 'Wells Fargo'
  if (sample.includes('AFFIRM')) return 'Affirm'
  if (sample.includes('KLARNA')) return 'Klarna'

  return 'Unknown Institution'
}

/**
 * Parse raw statement text through Claude API
 * Returns structured transactions ready for user review
 */
export async function parseStatementWithClaude(
  rawText: string
): Promise<{ transactions: ParsedTransaction[]; institution: string; endingBalance: number | null; error?: string }> {
  const institution = detectInstitution(rawText)

  // Truncate if extremely long (protect against abuse and token costs)
  const textToSend = rawText.slice(0, 12000)

  try {
    const message = await client.messages.create({
      model: PARSE_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Parse this ${institution} bank statement:\n\n${textToSend}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API')
    }

    // Clean response — strip any accidental markdown
    const cleaned = content.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error('Claude returned invalid JSON. Please try again.')
    }

    // Accept either the new envelope shape { endingBalance, transactions }
    // or the legacy flat array shape for backwards compatibility
    let transactionsRaw: unknown = parsed
    let endingBalance: number | null = null

    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const envelope = parsed as Record<string, unknown>
      transactionsRaw = envelope.transactions ?? []
      endingBalance = typeof envelope.endingBalance === 'number' ? envelope.endingBalance : null
    }

    const validated = ParsedTransactionsSchema.safeParse(transactionsRaw)
    if (!validated.success) {
      throw new Error('Parsed transactions failed validation. Please try again.')
    }

    return {
      transactions: validated.data,
      institution,
      endingBalance,
    }
  } catch (err) {
    let message = err instanceof Error ? err.message : 'Unknown parsing error'

    // Detect Anthropic billing / quota errors and surface a clean message
    if (
      message.includes('credit balance') ||
      message.includes('insufficient_quota') ||
      message.includes('billing') ||
      (err instanceof Error && 'status' in err && (err as { status: number }).status === 400 &&
        message.toLowerCase().includes('credit'))
    ) {
      message = 'The AI parsing service is temporarily unavailable due to a billing issue. Please contact the site administrator.'
    } else if (
      'status' in (err as object) &&
      (err as { status: number }).status === 529
    ) {
      message = 'The AI service is currently overloaded. Please try again in a moment.'
    } else if (
      'status' in (err as object) &&
      (err as { status: number }).status === 401
    ) {
      message = 'AI service authentication failed. Please contact the site administrator.'
    }

    return {
      transactions: [],
      institution,
      endingBalance: null,
      error: message,
    }
  }
}
