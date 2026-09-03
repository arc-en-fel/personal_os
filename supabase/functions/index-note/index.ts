import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const url = Deno.env.get('SUPABASE_URL'); const anonKey = Deno.env.get('SUPABASE_ANON_KEY'); const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!token || !url || !anonKey) return json({ error: 'Authentication is required.' }, 401);
    if (!openAiKey) return json({ error: 'The embedding service is not configured.' }, 503);
    const supabase = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: 'Authentication is required.' }, 401);
    const { note_id: noteId } = await request.json() as { note_id?: string };
    if (!noteId) return json({ error: 'A note id is required.' }, 400);
    const { data: note, error: noteError } = await supabase.from('notes').select('id,title,content').eq('id', noteId).eq('user_id', user.id).single();
    if (noteError || !note) return json({ error: 'Note not found.' }, 404);
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'text-embedding-3-small', input: `${note.title}\n\n${note.content}` }) });
    if (!embeddingResponse.ok) return json({ error: 'Could not create note embedding.' }, 502);
    const embeddingResult = await embeddingResponse.json() as { data?: { embedding: number[] }[] };
    const embedding = embeddingResult.data?.[0]?.embedding;
    if (!embedding) return json({ error: 'Embedding response was empty.' }, 502);
    const { error: updateError } = await supabase.from('notes').update({ embedding, updated_at: new Date().toISOString() }).eq('id', note.id).eq('user_id', user.id);
    if (updateError) return json({ error: 'Could not save note embedding.' }, 500);
    return json({ indexed: 'true' });
  } catch { return json({ error: 'Unexpected indexing error.' }, 500); }
});

function json(body: Record<string, string>, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
