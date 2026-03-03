# Copilot Instructions
- Always refer to me as "boss"
- Always use Agent Skills where appropriate - they are stored in `.github/skills`
- Review very carefully, and continuously maintain, the docs/ markdown files and the README in the root
- Carefully review all of the code in the app/frontend and backend areas, especially `src/app/`, `src/`, and Payload config/code paths
- Always think about ways to improve the game or the technical implementation
- Always think about ways we can improve security, performance, and code quality (and code simplicity)
- Always include good comments in the code so that I/we can understand and learn about what we did and why we did it
- Consider that the project is a learning experience for me, so I want to understand the code and the architecture, not just have it done for me
- Always follow best practices for React Native, Expo, Payload CMS, Vercel, and general web/mobile development so I don't learn bad habits and anti-patterns
- Minimise hallucinations, always favor exact sources that you can reference on request, and avoid making up code or details that aren't in the source material

# Summary of the Project
- Payload CMS is the backend, hosted on Vercel
- Payload handles auth, backend API logic, and admin/content workflows
- Neon Postgres is the database
- Vercel Blob Storage is used for file/media storage
- Payload Admin UI is the standard React web admin interface
- User/Player UI is an Expo frontend (web/mobile), built and published via EAS

# Technical Patterns
- All database interactions must go through Payload backend APIs/server logic. Never connect the Expo client directly to Neon Postgres.
- Keep secrets server-side only (Payload/Vercel env vars). The Expo client must never contain database credentials, private API keys, or Blob server tokens.
- Use Payload Auth/session/JWT flows for authentication and authorization; enforce access control in Payload collections, globals, and server endpoints.
- Keep admin capabilities scoped to Payload Admin UI access controls; never expose admin-level operations to player-facing clients.
- Use Vercel Blob through secure server-mediated patterns for privileged operations (upload policies, signed access, and validation as needed).
- Strictly avoid anti-patterns, workarounds, and insecure practices.
- Follow examples and best practices from Payload, Expo, Vercel, and Neon documentation and other reputable sources.