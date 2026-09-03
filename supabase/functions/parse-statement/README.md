# Statement Parser Edge Function

Deploy with `supabase functions deploy parse-statement`.

The function receives a selected PDF only after the user chooses it, sends it to the server-side OpenAI Responses API, and returns a preview. It never writes transactions directly.
