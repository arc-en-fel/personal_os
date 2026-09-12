import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', ''); const supabaseUrl = Deno.env.get('SUPABASE_URL'); const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!token || !supabaseUrl || !supabaseAnonKey) return json({ error: 'Authentication is required.' }, 401);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } }); const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: 'Authentication is required.' }, 401);
    if (!openAiKey) return json({ error: 'The AI service is not configured.' }, 503);
    const body = await request.json() as { text?: string };
    const text = body.text?.trim();
    if (!text) return json({ error: 'Text is required.' }, 400);
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a personal activity parser. Extract loggable activities from user text. Return ONLY a JSON object with an activities array. Each item must have: type (workout|learning|nutrition|project|finance|general), title (string), description (string|null), metadata (object). Never invent missing numbers.' }, { role: 'user', content: text }], temperature: 0.2 }) });
    if (!response.ok) return json({ error: 'The AI service could not parse this note.' }, 502);
    const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = result.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as { activities?: unknown[] };
    const activities = Array.isArray(parsed.activities) ? parsed.activities.slice(0, 10) : [];
    return new Response(JSON.stringify({ activities }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch { return json({ error: 'Could not parse the activity text.' }, 500); }
});

function json(body: Record<string, string>, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
