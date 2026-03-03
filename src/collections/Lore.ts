import type { CollectionConfig } from 'payload'

export const Lore: CollectionConfig = {
  slug: 'lore',
  labels: {
    singular: 'Lore',
    plural: 'Lore',
  },
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      label: 'Content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'department',
      label: 'Department',
      type: 'text',
      required: true,
      defaultValue: 'Ministry of Truth',
    },
    {
      name: 'visible',
      label: 'Visible to Players',
      type: 'checkbox',
      defaultValue: true,
      required: true,
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'tag',
          label: 'Tag',
          type: 'text',
          required: true,
        },
      ]
    },
  ],
}
