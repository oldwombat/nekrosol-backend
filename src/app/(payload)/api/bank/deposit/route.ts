import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Player } from '@/payload-types'
import { BANK_TERMS } from '../route'

/**
 * POST /api/bank/deposit
 *
 * Body: { termId: string, amount: number }
 *
 * Creates a term deposit:
 *   - Player must have no active deposit
 *   - Credits deducted immediately
 *   - maturesAt = now + term duration
 *
 * The Ministry does not allow early withdrawal.
 */
export const POST = async (request: Request) => {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()
    const { user } = await payload.auth({ headers })

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.collection !== 'players') return Response.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => null)
    const termId = body?.termId as string | undefined
    const amount = body?.amount as number | undefined

    if (!termId || !amount || amount < 1) {
      return Response.json({ error: 'termId and amount (≥1) are required' }, { status: 400 })
    }

    const term = BANK_TERMS.find((t) => t.id === termId)
    if (!term) {
      return Response.json({ error: 'Invalid term. Choose: 1h, 6h, 24h, 72h' }, { status: 400 })
    }

    const player = await payload.findByID({
      collection: 'players',
      id: user.id,
      depth: 0,
      overrideAccess: true,
    }) as Player

    const currentCredits = (player.credits as number) ?? 0

    if (currentCredits < amount) {
      return Response.json({
        error: `Insufficient credits. You have ${currentCredits}, need ${amount}.`,
      }, { status: 400 })
    }

    // Ensure no active deposit already exists
    const existing = await payload.find({
      collection: 'bank-deposits',
      where: {
        and: [
          { player: { equals: user.id } },
          { status: { equals: 'active' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      return Response.json({
        error: 'You already have an active deposit. Collect it before making a new one.',
      }, { status: 400 })
    }

    const now = new Date()
    const maturesAt = new Date(now.getTime() + term.durationMs)

    // Deduct credits
    await payload.update({
      collection: 'players',
      id: user.id,
      data: { credits: currentCredits - amount },
      overrideAccess: true,
    })

    // Create deposit record
    const deposit = await payload.create({
      collection: 'bank-deposits',
      data: {
        player: user.id,
        amount,
        interestRate: term.interestRate,
        depositedAt: now.toISOString(),
        maturesAt: maturesAt.toISOString(),
        status: 'active',
      },
      overrideAccess: true,
    })

    return Response.json({
      ok: true,
      deposit: {
        id: deposit.id,
        amount,
        interestRate: term.interestRate,
        depositedAt: now.toISOString(),
        maturesAt: maturesAt.toISOString(),
        return: Math.floor(amount * (1 + term.interestRate)),
      },
      credits: currentCredits - amount,
    })
  } catch (err) {
    console.error('[POST /api/bank/deposit]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
