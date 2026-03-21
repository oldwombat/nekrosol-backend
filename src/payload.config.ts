import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Lore } from './collections/Lore'
import { Players } from './collections/Players'
import { Inventory } from './collections/Inventory'
import { Items } from './collections/Items'
import { GameEvents } from './collections/GameEvents'
import { Quests } from './collections/Quests'
import { PlayerQuestProgress } from './collections/PlayerQuestProgress'
import { Missions } from './collections/Missions'
import { Messages } from './collections/Messages'
import { PlayerMissionHistory } from './collections/PlayerMissionHistory'
import { BankDeposits } from './collections/BankDeposits'
import { PlayerNPCInteractions } from './collections/PlayerNPCInteractions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Lore,
    Media,
    Players,
    Inventory,
    Items,
    GameEvents,
    Quests,
    PlayerQuestProgress,
    Missions,
    Messages,
    PlayerMissionHistory,
    BankDeposits,
    PlayerNPCInteractions,
  ],
  // CORS: explicitly list allowed origins. Never use '*' — that allows any
  // site to make credentialed requests and steal player session cookies.
  // Add production URLs via CORS_ORIGINS env var (comma-separated).
  cors: [
    'http://localhost:8081',
    'http://localhost:3000',
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
  ],
  editor: lexicalEditor(),
  // SECURITY: PAYLOAD_SECRET must be set in .env — never fall back to empty string.
  secret: process.env.PAYLOAD_SECRET ?? (() => { throw new Error('PAYLOAD_SECRET env var is required') })(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL ?? (() => { throw new Error('DATABASE_URL env var is required') })(),
    },
  }),
  sharp,
  plugins: [],
})
