import type { CollectionConfig } from 'payload'

const authenticated = ({ req }: { req: { user?: unknown } }): boolean => Boolean(req.user)

export const Items: CollectionConfig = {
  slug: 'items',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['key', 'name', 'maxStack', 'category'],
  },
  access: {
    read: () => true,  // Items are public (client needs to display them)
    create: authenticated,  // admin only via admin panel
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Machine-readable key (e.g. "spd-1", "med-1", "rad-x"). Must be unique.' },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Display name shown in the game UI (e.g. "SPD-1 Stimpak")' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Lore/flavour text shown in item tooltip or detail modal' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Medicine', value: 'medicine' },
        { label: 'Consumable', value: 'consumable' },
        { label: 'Material', value: 'material' },
        { label: 'Weapon', value: 'weapon' },
        { label: 'Armour', value: 'armour' },
        { label: 'Misc', value: 'misc' },
      ],
      defaultValue: 'misc',
    },
    {
      name: 'maxStack',
      type: 'number',
      required: true,
      defaultValue: 10,
      min: 1,
      max: 999,
      admin: { description: 'Maximum quantity a player can hold at once' },
    },
    {
      name: 'effects',
      type: 'json',
      admin: {
        description: 'JSON object describing stat effects when used. E.g. { "energy": 3 } or { "radiation": -10 }. Keys match player stat names.',
      },
    },
    {
      name: 'value',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { description: 'Base credit value for buying/selling at market' },
    },
  ],
}
