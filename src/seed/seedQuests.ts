/**
 * seedQuests — idempotent quest seed script.
 *
 * Creates all 48 quest definitions if they don't already exist.
 * Safe to run multiple times — skips quests that are already seeded.
 *
 * Usage: import and call from Payload CLI or a Next.js startup hook.
 */
import type { Payload } from 'payload'
import { questDefinitions } from './questDefinitions'

export async function seedQuests(payload: Payload): Promise<void> {
  const existing = await payload.find({
    collection: 'quests',
    limit: 0,
    overrideAccess: true,
  })

  if (existing.totalDocs >= questDefinitions.length) {
    payload.logger.info(`[seedQuests] ${existing.totalDocs} quests already seeded — skipping.`)
    return
  }

  payload.logger.info(`[seedQuests] Seeding ${questDefinitions.length} quests...`)

  for (const def of questDefinitions) {
    // Check if this specific quest already exists
    const found = await payload.find({
      collection: 'quests',
      where: {
        and: [
          { skill: { equals: def.skill } },
          { prestigeLevel: { equals: def.prestigeLevel } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (found.totalDocs > 0) continue

    await payload.create({
      collection: 'quests',
      data: {
        skill: def.skill,
        prestigeLevel: def.prestigeLevel,
        title: def.title,
        description: def.description,
        requirementType: def.requirementType,
        requirementData: def.requirementData ?? null,
      },
      overrideAccess: true,
    })
  }

  payload.logger.info(`[seedQuests] Done.`)
}
