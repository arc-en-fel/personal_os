# Personal OS

Phase 1 foundation for a private Expo React Native application.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add the public Supabase URL and anon key.
3. Run `npm start` and open the project in Expo Go, an emulator, or a simulator.
4. In Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).

The mobile client only uses the Supabase anon key. Keep service-role keys and all AI credentials in trusted backend code, never in the app.

For note embeddings, deploy `index-note` and set `OPENAI_API_KEY` as a Supabase secret. The vector search function is included in the SQL schema.

## Included in Phase 1

- Expo Router tabs for Home, Timeline, and Areas
- Supabase email/password authentication
- Secure persisted auth sessions via Expo SecureStore
- RLS-protected profiles, areas, and universal activities tables
- Quick activity capture and chronological timeline
- Fitness workout logging, learning session logging, and project tracking
- Natural-language activity capture with review-before-save

If you already ran an earlier version of the schema, rerun `supabase/schema.sql` to add the Projects table and its RLS policy.
