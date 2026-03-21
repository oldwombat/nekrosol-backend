import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { BankDeposit, Player } from '@/payload-types'

/** Term options: { label, durationMs, interestRate } */
export const BANK_TERMS = [
  { id: '1h',  label: '1 hour',   durationMs: 1 * 60 * 60 * 1000,      interestRate: 0.05  },
  { id: '6h',  label: '6 hours',  durationMs: 6 * 60 * 60 * 1000,      interestRate: 0.12  },
  { id: '24h', label: '24 hours', durationMs: 24 * 60 * 60 * 1000,     interestRate: 0.25  },
  { id: '72h', label: '72 hours', durationMs: 72 * 60 * 60 * 1000,     interestRate: 0.50  },
] as const

/**
 * GET /api/bank
 *
 * Returns:
 *   - activeDeposit: the player's current active deposit (if any), with maturity status
 *   - terms: available deposit terms with rates
 *   - credits: player's current credit balance
 */
export const GET = async () => {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()
    const { user } = await payload.auth({ headers })

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.collection !== 'players') return Response.json({ error: 'Forbidden' }, { status: 403 })

    const player = await payload.findByID({
      collection: 'players',
      id: user.id,
      depth: 0,
      overrideAccess: true,
    }) as Player

    // Find active deposit
    const depositResult = await payload.find({
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

    const activeDeposit = depositResult.docs[0] as BankDeposit | undefined
    const now = Date.now()

    return Response.json({
      ok: true,
      credits: player.credits ?? 0,
      terms: BANK_TERMS,
      activeDeposit: activeDeposit
        ? {
            id: activeDeposit.id,
            amount: activeDeposit.amount,
            interestRate: activeDeposit.interestRate,
            depositedAt: activeDeposit.depositedAt,
            maturesAt: activeDeposit.maturesAt,
            matured: new Date(activeDeposit.maturesAt as string).getTime() <= now,
            return: Math.floor((activeDeposit.amount as number) * (1 + (activeDeposit.interestRate as number))),
          }
        : null,
    })
  } catch (err) {
    console.error('[GET /api/bank]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
