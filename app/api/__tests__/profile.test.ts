// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabase, makeBuilder } from '../../../../tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { PATCH, DELETE } from '../profile/route'

const TEST_USER = { id: 'user-123', email: 'test@test.com' }
const TEST_PROFILE = {
  id: TEST_USER.id,
  email: TEST_USER.email,
  name: 'Test User',
  income_biweekly: null,
  income_monthly: null,
  subscription_tier: 'free',
}

function makePatchRequest(body: object) {
  return new NextRequest('http://localhost/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest() {
  return new NextRequest('http://localhost/api/profile', {
    method: 'DELETE',
  })
}

describe('PATCH /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated user', async () => {
    const { client } = createMockSupabase(null)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await PATCH(makePatchRequest({ name: 'New Name' }))
    expect(res.status).toBe(401)
  })

  it('updates profile name', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: { ...TEST_PROFILE, name: 'New Name' }, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(makePatchRequest({ name: 'New Name' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe('New Name')
  })

  it('accepts income_monthly as number', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: { ...TEST_PROFILE, income_monthly: 3500 }, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(makePatchRequest({ income_monthly: 3500 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.income_monthly).toBe(3500)
  })

  it('accepts income_biweekly as number', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: { ...TEST_PROFILE, income_biweekly: 2000 }, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(makePatchRequest({ income_biweekly: 2000 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.income_biweekly).toBe(2000)
  })

  it('rejects negative income', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await PATCH(makePatchRequest({ income_monthly: -100 }))
    expect(res.status).toBe(400)
  })

  it('rejects negative income_biweekly', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await PATCH(makePatchRequest({ income_biweekly: -50 }))
    expect(res.status).toBe(400)
  })

  it('rejects name exceeding 100 characters', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await PATCH(makePatchRequest({ name: 'a'.repeat(101) }))
    expect(res.status).toBe(400)
  })

  it('accepts null to clear income_monthly', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: { ...TEST_PROFILE, income_monthly: null }, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(makePatchRequest({ income_monthly: null }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.income_monthly).toBeNull()
  })

  it('returns 400 for invalid JSON body', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)

    const req = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 when database update fails', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'db error' } }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(makePatchRequest({ name: 'New Name' }))
    expect(res.status).toBe(500)
  })

  it('returns the full profile shape on success', async () => {
    const updatedProfile = { ...TEST_PROFILE, name: 'Updated' }
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: updatedProfile, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(makePatchRequest({ name: 'Updated' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      id: TEST_USER.id,
      email: TEST_USER.email,
      name: 'Updated',
      subscription_tier: 'free',
    })
  })
})

describe('DELETE /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated user', async () => {
    const { client } = createMockSupabase(null)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await DELETE(makeDeleteRequest())
    expect(res.status).toBe(401)
  })

  it('deletes the user profile and returns { deleted: true }', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await DELETE(makeDeleteRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
  })

  it('calls signOut after successful deletion', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    await DELETE(makeDeleteRequest())
    expect(client.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('returns 500 and does not sign out when database delete fails', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'delete failed' } }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await DELETE(makeDeleteRequest())
    expect(res.status).toBe(500)
    expect(client.auth.signOut).not.toHaveBeenCalled()
  })

  it('does not leak error details in the 500 response', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'internal db error details' } }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await DELETE(makeDeleteRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeTypeOf('string')
    expect(body.error).not.toContain('internal db error details')
  })
})
