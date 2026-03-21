/**
 * seedMissions — idempotent mission seed script.
 *
 * Creates all mission definitions if they don't already exist.
 * Safe to run multiple times — skips missions that are already seeded (by slug).
 */
import type { Payload } from 'payload'
import { missionDefinitions } from './missionDefinitions'

export async function seedMissions(payload: Payload): Promise<void> {
  payload.logger.info(`[seedMissions] Checking ${missionDefinitions.length} mission definitions...`)

  let seeded = 0

  for (const def of missionDefinitions) {
    const found = await payload.find({
      collection: 'missions',
      where: { slug: { equals: def.slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (found.totalDocs > 0) continue

    await payload.create({
      collection: 'missions',
      data: {
        slug: def.slug,
        name: def.name,
        description: def.description,
        category: def.category,
        primarySkill: def.primarySkill,
        tier: def.tier,
        isActive: def.isActive,
        hideAfterCompletion: def.hideAfterCompletion ?? false,
        costs: def.costs,
        requirements: def.requirements,
        visibilityRequirements: def.visibilityRequirements,
        rewards: def.rewards,
        npcSlug: def.npcSlug,
        npcName: def.npcName,
        availabilityMessage: def.availabilityMessage,
        completionMessage: def.completionMessage,
      },
      overrideAccess: true,
    })

    seeded++
  }

  if (seeded > 0) {
    payload.logger.info(`[seedMissions] Seeded ${seeded} new missions.`)
  } else {
    payload.logger.info(`[seedMissions] All missions already seeded — skipping.`)
  }
}
