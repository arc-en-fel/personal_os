# AI Assistant Edge Function

Deploy with `supabase functions deploy ai-assistant`.

Set the server-side secret with `supabase secrets set OPENAI_API_KEY=...`.
Optionally set `OPENAI_MODEL`; it defaults to `gpt-5`.

The mobile app never receives the OpenAI key. The function verifies the Supabase user, retrieves only bounded recent records, and sends that context to the Responses API.
