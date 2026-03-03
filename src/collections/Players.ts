import type { CollectionConfig } from 'payload'

type AccessRequest = {
  user?: {
    id?: string | number
    collection?: string
  }
}

export const Players: CollectionConfig = {
  slug: 'players',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // Allow public signup from the app.
    create: () => true,
    // Players can read/update their own profile; admin users can read/update all.
    read: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true;
      if (req.user?.collection === 'players') {
        return {
          id: {
            equals: req.user.id,
          },
        };
      }
      return false;
    },
    update: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true;
      if (req.user?.collection === 'players') {
        return {
          id: {
            equals: req.user.id,
          },
        };
      }
      return false;
    },
    delete: ({ req }: { req: AccessRequest }) => req.user?.collection === 'users',
  },
  fields: [
    // Email added by default
    {
      name: 'displayName',
      label: 'Display Name',
      type: 'text',
      required: false,
    },
    {
      name: 'credits',
      label: 'Credits',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'creditsMax',
      label: 'Credits Max',
      type: 'number',
      required: true,
      defaultValue: 1000000,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'energy',
      label: 'Energy',
      type: 'number',
      required: true,
      defaultValue: 10,
      min: 0,
    },
    {
      name: 'energyMax',
      label: 'Energy Max',
      type: 'number',
      required: true,
      defaultValue: 10,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'health',
      label: 'Health',
      type: 'number',
      required: true,
      defaultValue: 100,
      min: 0,
    },
    {
      name: 'healthMax',
      label: 'Health Max',
      type: 'number',
      required: true,
      defaultValue: 100,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'radiation',
      label: 'Radiation',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'radiationMax',
      label: 'Radiation Max',
      type: 'number',
      required: true,
      defaultValue: 100,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'thug',
      label: 'Thug',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'thief',
      label: 'Thief',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'grifter',
      label: 'Grifter',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'pilot',
      label: 'Pilot',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'medic',
      label: 'Medic',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'hacker',
      label: 'Hacker',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'technician',
      label: 'Technician',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'chemist',
      label: 'Chemist',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'physicist',
      label: 'Physicist',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'scavenger',
      label: 'Scavenger',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'mechanic',
      label: 'Mechanic',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'smuggler',
      label: 'Smuggler',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'role',
      label: 'Role',
      type: 'text',
      defaultValue: 'player',
      required: true,
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
  ],
}
