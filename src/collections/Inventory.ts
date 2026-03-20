import type { CollectionConfig, Payload } from 'payload'
import { ValidationError } from 'payload'

type AccessRequest = {
  user?: {
    id?: string | number
    collection?: string
  }
}

type CreateAccessRequest = AccessRequest & {
  data?: {
    player?: string | number
  }
}

async function checkDuplicateInventory(args: {
  data?: Record<string, unknown>
  operation: string
  req: { payload: Payload }
}): Promise<Record<string, unknown> | undefined> {
  const { data, operation, req } = args
  if (operation !== 'create') return data

  const playerID = data?.player
  const itemKey = data?.itemKey

  if (!playerID || !itemKey) return data

  const existing = await req.payload.find({
    collection: 'inventory',
    where: {
      and: [
        { player: { equals: playerID } },
        { itemKey: { equals: itemKey } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) {
    throw new ValidationError({
      errors: [
        {
          message: `Player already has an inventory entry for item "${String(itemKey)}". Update the existing entry instead.`,
          path: 'itemKey',
        },
      ],
    })
  }

  return data
}

export const Inventory: CollectionConfig = {
  slug: 'inventory',
  admin: {
    useAsTitle: 'itemKey',
    defaultColumns: ['itemKey', 'quantity', 'player'],
  },
  hooks: {
    beforeValidate: [checkDuplicateInventory],
  },
  access: {
    create: ({ req, data }: { req: AccessRequest; data?: CreateAccessRequest['data'] }) => {
      if (req.user?.collection === 'users') return true
      if (req.user?.collection === 'players') {
        return String(data?.player) === String(req.user.id)
      }
      return false
    },
    read: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true
      if (req.user?.collection === 'players') {
        return {
          player: {
            equals: req.user.id,
          },
        }
      }
      return false
    },
    update: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true
      if (req.user?.collection === 'players') {
        return {
          player: {
            equals: req.user.id,
          },
        }
      }
      return false
    },
    delete: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true
      if (req.user?.collection === 'players') {
        return {
          player: {
            equals: req.user.id,
          },
        }
      }
      return false
    },
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
      name: 'itemKey',
      label: 'Item Key',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
  ],
}
