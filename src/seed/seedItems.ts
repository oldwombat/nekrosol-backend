/**
 * seedItems — idempotent item catalog seed.
 *
 * Creates core consumable items used by missions and the Blackglass Market shop.
 * Safe to run multiple times — skips items that already exist (by key).
 */
import type { Payload } from 'payload'

interface ItemDef {
  key: string
  name: string
  description: string
  category: 'medicine' | 'consumable' | 'material' | 'weapon' | 'armour' | 'misc'
  maxStack: number
  effects: Record<string, number>
  value: number // credit buy price at Blackglass Market
}

const itemDefinitions: ItemDef[] = [
  {
    key: 'SPD-1',
    name: 'SPD-1 Stimpak',
    description:
      'Synthetic adrenaline compound. Fully restores energy. Standard-issue for courier runners and mercenaries.',
    category: 'medicine',
    maxStack: 5,
    effects: { energy: 1000 },
    value: 30,
  },
  {
    key: 'MED-1',
    name: 'MED-1 Medpack',
    description:
      'Biofoam field dressing with synthetic clotting agent. Fully restores health. No questions asked by the vendors who stock them.',
    category: 'medicine',
    maxStack: 5,
    effects: { health: 1000 },
    value: 25,
  },
  {
    key: 'RAD-X',
    name: 'RAD-X Treatment',
    description:
      'Chelation compound that strips radiation from your bloodstream. Reduces radiation by 10 points per dose.',
    category: 'medicine',
    maxStack: 10,
    effects: { radiation: -10 },
    value: 15,
  },
  {
    key: 'scrap-metal',
    name: 'Scrap Metal',
    description:
      'Twisted salvage from collapsed structures and junked machinery. Useful for repairs, bribes, or improvised weapons.',
    category: 'material',
    maxStack: 50,
    effects: {},
    value: 3,
  },
  {
    key: 'wire-coil',
    name: 'Wire Coil',
    description:
      'Salvaged copper-alloy wire. Holds a charge well enough. Technicians and hackers always need more.',
    category: 'material',
    maxStack: 50,
    effects: {},
    value: 5,
  },
  {
    key: 'fuses',
    name: 'Fuses',
    description:
      'Industrial ceramic fuses scavenged from reactor control panels. Fragile and hard to find intact.',
    category: 'material',
    maxStack: 30,
    effects: {},
    value: 8,
  },
  {
    key: 'reactor-core',
    name: 'Reactor Core Fragment',
    description:
      'A shielded fragment of fissile material from a decommissioned reactor. Rare, dangerous to handle, and worth a fortune to the right buyer.',
    category: 'material',
    maxStack: 5,
    effects: {},
    value: 150,
  },
]

export async function seedItems(payload: Payload): Promise<void> {
  payload.logger.info(`[seedItems] Checking ${itemDefinitions.length} item definitions...`)

  let seeded = 0

  for (const def of itemDefinitions) {
    const found = await payload.find({
      collection: 'items',
      where: { key: { equals: def.key } },
      limit: 1,
      overrideAccess: true,
    })

    if (found.totalDocs > 0) continue

    await payload.create({
      collection: 'items',
      data: def,
      overrideAccess: true,
    })
    seeded++
  }

  payload.logger.info(`[seedItems] Done — ${seeded} new items created.`)
}
