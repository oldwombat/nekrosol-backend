import type { CollectionConfig } from 'payload'

const adminOnly = ({ req }: { req: { user?: { collection?: string } | null } }): boolean =>
  req.user?.collection === 'users'

/**
 * BankDeposits — Ember Bank term deposit records.
 *
 * One active deposit per player at a time. Credits are deducted at deposit time
 * and returned with interest at maturity. The Ministry does not allow early
 * withdrawal. Maturity is checked lazily: compare now >= maturesAt on read,
 * no background timers needed.
 *
 * status:
 *   'active'    — deposit is locked, not yet matured or collected
 *   'collected' — player has claimed their return
 */
export const BankDeposits: CollectionConfig = {
  slug: 'bank-deposits',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['player', 'amount', 'interestRate', 'depositedAt', 'maturesAt', 'status'],
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'player',
      type: 'relationship',
      relationTo: 'players',
      required: true,
      index: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 1,
      admin: { description: 'Credits deposited (already deducted from player at deposit time)' },
    },
    {
      name: 'interestRate',
      type: 'number',
      required: true,
      admin: { description: 'Decimal rate at time of deposit. e.g. 0.25 = 25%' },
    },
    {
      name: 'depositedAt',
      type: 'date',
      required: true,
      admin: { description: 'When the deposit was made' },
    },
    {
      name: 'maturesAt',
      type: 'date',
      required: true,
      admin: { description: 'When the deposit can be collected (depositedAt + term)' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Collected', value: 'collected' },
      ],
    },
  ],
  timestamps: true,
}
