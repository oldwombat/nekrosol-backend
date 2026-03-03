import type { CollectionConfig } from 'payload'

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

export const Inventory: CollectionConfig = {
  slug: 'inventory',
  admin: {
    useAsTitle: 'itemKey',
    defaultColumns: ['itemKey', 'quantity', 'player'],
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
