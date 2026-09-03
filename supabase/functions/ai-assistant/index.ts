import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!token || !supabaseUrl || !supabaseAnonKey) return json({ error: 'Authentication is required.' }, 401);
    if (!openAiKey) return json({ error: 'The AI service is not configured.' }, 503);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: 'Authentication is required.' }, 401);
    const body = await request.json() as { message?: string };
    const message = body.message?.trim();
    if (!message) return json({ error: 'A message is required.' }, 400);

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const [{ data: activities }, { data: goals }, { data: projects }, { data: transactions }] = await Promise.all([
      supabase.from('activities').select('type,title,description,metadata,started_at').eq('user_id', user.id).gte('started_at', weekAgo.toISOString()).order('started_at', { ascending: false }).limit(50),
      supabase.from('goals').select('title,current_value,target_value,status').eq('user_id', user.id).eq('status', 'active').limit(20),
      supabase.from('projects').select('name,status,progress').eq('user_id', user.id).eq('status', 'active').limit(20),
      supabase.from('transactions').select('amount,transaction_type,merchant,transaction_date').eq('user_id', user.id).gte('transaction_date', weekAgo.toISOString().slice(0, 10)).limit(50),
    ]);

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'text-embedding-3-small', input: message }) });
    let relevantNotes: { title: string; content: string; similarity: number }[] = [];
    if (embeddingResponse.ok) {
      const embeddingResult = await embeddingResponse.json() as { data?: { embedding: number[] }[] };
      const queryEmbedding = embeddingResult.data?.[0]?.embedding;
      if (queryEmbedding) {
        const { data: notes } = await supabase.rpc('match_notes', { query_embedding: queryEmbedding, match_threshold: 0.72, match_count: 5, requesting_user_id: user.id });
        relevantNotes = notes ?? [];
      }
    }
    const context = JSON.stringify({ period: 'last 7 days', activities: activities ?? [], active_goals: goals ?? [], active_projects: projects ?? [], transactions: transactions ?? [], relevant_notes: relevantNotes });
    const openAiResponse = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-5', store: false, instructions: 'You are the Personal OS assistant. Answer only from the supplied personal data context. If the context does not contain the answer, say so clearly. Be concise and practical. Never claim you performed an action.', input: `Personal data context:\n${context}\n\nUser question:\n${message}` }) });
    if (!openAiResponse.ok) return json({ error: 'The AI service could not answer right now.' }, 502);
    const result = await openAiResponse.json() as { output_text?: string };
    return json({ answer: result.output_text ?? 'I could not produce an answer from the available data.' });
  } catch { return json({ error: 'Unexpected assistant error.' }, 500); }
});

function json(body: Record<string, string>, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
