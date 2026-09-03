# Note Indexing Edge Function

Deploy with `supabase functions deploy index-note`.

It uses the server-side `OPENAI_API_KEY` to create `text-embedding-3-small` embeddings and writes them only after verifying the authenticated user owns the note.
