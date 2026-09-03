import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', ''); const supabaseUrl = Deno.env.get('SUPABASE_URL'); const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY'); const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!token || !supabaseUrl || !supabaseAnonKey) return json({ error: 'Authentication is required.' }, 401);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } }); const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: 'Authentication is required.' }, 401);
    if (!openAiKey) return json({ error: 'The statement parser is not configured.' }, 503);
    const body = await request.json() as { base64?: string; filename?: string; password?: string };
    if (!body.base64) return json({ error: 'A PDF file is required.' }, 400);
    const parserUrl = Deno.env.get('STATEMENT_PARSER_URL');
    if (parserUrl) {
      const parserResponse = await fetch(`${parserUrl.replace(/\/$/, '')}/parse`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-parser-token': Deno.env.get('STATEMENT_PARSER_TOKEN') ?? '' }, body: JSON.stringify({ filename: body.filename ?? 'statement.pdf', base64: body.base64, password: body.password ?? null }) });
      const parserBody = await parserResponse.json() as { transactions?: unknown[]; detail?: string };
      if (!parserResponse.ok) return json({ error: parserBody.detail ?? 'The statement parser could not read this file.' }, 422);
      return new Response(JSON.stringify({ transactions: parserBody.transactions ?? [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (body.password) return json({ error: 'Protected statements require STATEMENT_PARSER_URL to be configured.' }, 503);
    const response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-5', store: false, instructions: 'Extract transactions from this bank statement. Return only valid JSON with a transactions array. Each item must have amount as a positive number, transaction_type as income or expense, merchant as a string or null, and transaction_date as YYYY-MM-DD. Treat debits, withdrawals, and spending as expenses; treat credits and deposits as income. Never invent values. Omit rows with no reliable amount or date.', input: [{ role: 'user', content: [{ type: 'input_file', filename: body.filename ?? 'statement.pdf', file_data: `data:application/pdf;base64,${body.base64}` }, { type: 'input_text', text: 'Extract the transaction rows from this statement for review.' }] }] }) });
    if (!response.ok) return json({ error: 'The PDF could not be parsed.' }, 502);
    const result = await response.json() as { output_text?: string }; const parsed = JSON.parse(result.output_text ?? '{"transactions":[]}') as { transactions?: unknown[] }; const transactions = Array.isArray(parsed.transactions) ? parsed.transactions.slice(0, 500) : [];
    return new Response(JSON.stringify({ transactions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) { console.error(error); return json({ error: 'Could not reach the statement parser. Verify STATEMENT_PARSER_URL is a public HTTPS URL.' }, 502); }
});
function json(body: Record<string, string>, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
