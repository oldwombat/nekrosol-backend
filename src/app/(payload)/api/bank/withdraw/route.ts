import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { BankDeposit, Player } from '@/payload-types'

/**
 * POST /api/bank/withdraw
 *
 * Claims the player's matured deposit.
 *   - Deposit must exist and be 'active'
 *   - maturesAt must be in the past (Ministry enforces term — no early withdrawal)
 *   - Credits + interest returned to player
 *   - Deposit status set to 'collected'
 */
export const POST = async () => {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()
    const { user } = await payload.auth({ headers })

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.collection !== 'players') return Response.json({ error: 'Forbidden' }, { status: 403 })

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

    if (depositResult.totalDocs === 0) {
      return Response.json({ error: 'No active deposit to collect.' }, { status: 400 })
    }

    const deposit = depositResult.docs[0] as BankDeposit
    const now = Date.now()
    const maturesAt = new Date(deposit.maturesAt as string).getTime()

    if (now < maturesAt) {
      const msRemaining = maturesAt - now
      const minutesRemaining = Math.ceil(msRemaining / 60_000)
      return Response.json({
        error: `Deposit not yet matured. ${minutesRemaining} minute(s) remaining. The Ministry does not allow early withdrawal.`,
        maturesAt: deposit.maturesAt,
      }, { status: 400 })
    }

    const amount = deposit.amount as number
    const interestRate = deposit.interestRate as number
    const returnAmount = Math.floor(amount * (1 + interestRate))
    const earned = returnAmount - amount

    const player = await payload.findByID({
      collection: 'players',
      id: user.id,
      depth: 0,
      overrideAccess: true,
    }) as Player

    const currentCredits = (player.credits as number) ?? 0
    const newCredits = currentCredits + returnAmount

    // Mark deposit collected and return credits atomically (separate writes — SQLite no transactions by default)
    await payload.update({
      collection: 'bank-deposits',
      id: deposit.id,
      data: { status: 'collected' },
      overrideAccess: true,
    })

    await payload.update({
      collection: 'players',
      id: user.id,
      data: { credits: newCredits },
      overrideAccess: true,
    })

    return Response.json({
      ok: true,
      deposited: amount,
      earned,
      returned: returnAmount,
      credits: newCredits,
    })
  } catch (err) {
    console.error('[POST /api/bank/withdraw]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
