import { vi } from 'vitest'

export interface MockResult {
  data?: unknown
  error?: unknown
  count?: number
}

/** Creates a Supabase-like fluent query builder that resolves to `result` when awaited. */
export function makeBuilder(result: MockResult = { data: null, error: null }) {
  const builder: Record<string, unknown> = {
    then(
      onFulfilled: (value: MockResult) => unknown,
      onRejected: (reason: unknown) => unknown
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }

  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is', 'in', 'not', 'or', 'filter',
    'order', 'limit', 'range', 'head',
  ]
  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  return builder
}

export interface MockSupabaseUser {
  id: string
  email: string
}

/** Creates a mock Supabase client. `from` returns a configurable builder. */
export function createMockSupabase(
  user: MockSupabaseUser | null,
  defaultResult: MockResult = { data: null, error: null }
) {
  const mockFrom = vi.fn().mockReturnValue(makeBuilder(defaultResult))

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: mockFrom,
  }

  return { client, mockFrom }
}
