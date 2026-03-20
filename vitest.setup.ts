// Any setup scripts you might need go here

// Load .env files, then override DATABASE_URL with a dedicated test DB.
// This avoids index-already-exists errors when the dev server is also running.
import 'dotenv/config'
process.env.DATABASE_URL = 'file:./nekrosol-test.db'
