import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const tools = [
  { type: 'function', function: { name: 'activity_summary', description: 'Read the user activity record for recent days.', parameters: { type: 'object', properties: { days: { type: 'number', minimum: 1, maximum: 90 } }, required: ['days'], additionalProperties: false } } },
  { type: 'function', function: { name: 'finance_summary', description: 'Read income, spending, net, and category totals for recent days.', parameters: { type: 'object', properties: { days: { type: 'number', minimum: 1, maximum: 90 } }, required: ['days'], additionalProperties: false } } },
  { type: 'function', function: { name: 'search_notes', description: 'Search the user knowledge base for relevant notes.', parameters: { type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 500 } }, required: ['query'], additionalProperties: false } } },
  { type: 'function', function: { name: 'goal_status', description: 'Get all active goals and their progress.', parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } } },
  { type: 'function', function: { name: 'project_status', description: 'Get all active projects and their completion progress.', parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } } },
  { type: 'function', function: { name: 'compare_periods', description: 'Compare activity or spending between two time periods to identify trends.', parameters: { type: 'object', properties: { type: { type: 'string', enum: ['activities', 'spending'] }, period_days: { type: 'number', minimum: 7, maximum: 90 } }, required: ['type', 'period_days'], additionalProperties: false } } },
  { type: 'function', function: { name: 'create_activity', description: 'Create one personal activity record. User must confirm before creation.', parameters: { type: 'object', properties: { type: { type: 'string', enum: ['workout', 'learning', 'nutrition', 'project', 'finance', 'general'] }, title: { type: 'string', minLength: 1, maxLength: 200 }, description: { type: ['string', 'null'], maxLength: 1000 } }, required: ['type', 'title', 'description'], additionalProperties: false } } },
];
type ToolCall = { type: 'function_call'; call_id: string; name: string; arguments: string };

async function logQuery(supabase: ReturnType<typeof createClient>, userId: string, query: string, toolsUsed: string[], responseTimeMs: number, success: boolean, errorMessage?: string) {
  try {
    await supabase.from('assistant_queries').insert({
      user_id: userId,
      query,
      tools_used: toolsUsed,
      response_time_ms: responseTimeMs,
      success,
      error_message: errorMessage || null
    });
  } catch (e) {
    console.error('Failed to log query:', e);
  }
}

async function logPattern(supabase: ReturnType<typeof createClient>, userId: string, pattern: string, patternType: 'topic' | 'tool' | 'time' | 'trend') {
  try {
    const { data: existing } = await supabase
      .from('query_patterns')
      .select('id, frequency')
      .eq('user_id', userId)
      .eq('pattern', pattern)
      .eq('pattern_type', patternType)
      .single();
    
    if (existing) {
      await supabase
        .from('query_patterns')
        .update({ frequency: existing.frequency + 1, last_seen: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('query_patterns')
        .insert({
          user_id: userId,
          pattern,
          pattern_type: patternType,
          frequency: 1,
          last_seen: new Date().toISOString(),
          metadata: {}
        });
    }
  } catch (e) {
    console.error('Failed to log pattern:', e);
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const startTime = Date.now();
    console.log('1. Request received');
    
    const token = request.headers.get('Authorization')?.replace('Bearer ', ''); 
    console.log('2. Token present:', !!token);
    
    const url = Deno.env.get('SUPABASE_URL'); 
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY'); 
    const groqKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('3. Env check - URL:', !!url, 'AnonKey:', !!anonKey, 'GroqKey:', !!groqKey);
    
    if (!token || !url || !anonKey) {
      console.log('ERROR: Auth missing');
      return json({ error: 'Authentication is required.' }, 401); 
    }
    if (!groqKey) {
      console.log('ERROR: Groq key missing');
      return json({ error: 'The AI service is not configured.' }, 503);
    }
    
    console.log('4. Creating Supabase client...');
    const supabase = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } }); 
    
    console.log('5. Verifying user...');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('ERROR: User not found');
      return json({ error: 'Authentication is required.' }, 401);
    }
    console.log('6. User verified');
    
    console.log('7. Reading body...');
    const body = await request.json() as { message?: string; conversation_context?: Array<{ role: string; content: string }> }; 
    const message = body.message?.trim(); 
    
    if (!message || message.length > 2000) {
      console.log('ERROR: Invalid message');
      return json({ error: 'Message must be between 1 and 2000 characters.' }, 400);
    }
    
    console.log('8. Message:', message.substring(0, 50));
    
    // Build input for conversation with tools
    const input: unknown[] = body.conversation_context ?? [];
    input.push({ role: 'user', content: message });
    
    console.log('9. Starting tool calling loop...');
    for (let turn = 0; turn < 4; turn += 1) {
      console.log(`10. Turn ${turn + 1}: Calling Groq with tool calling...`);
      const turnStart = Date.now();
      
      const response = await askGroq(groqKey, input);
      console.log(`11. Groq responded in ${Date.now() - turnStart}ms with status ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq error:', errorText);
        return json({ error: 'The AI service could not respond right now.' }, 502);
      }
      
      const result = await response.json() as { 
        choices?: Array<{ 
          message?: { 
            content?: string;
            tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
          } 
        }> 
      };
      const choice = result.choices?.[0];
      const message = choice?.message;
      const textContent = message?.content || '';
      const toolCalls = message?.tool_calls || [];
      
      console.log(`12. Received ${toolCalls.length} tool calls`);
      
      // If no tools, return answer
      if (!toolCalls.length) {
        const answer = textContent || 'I could not generate a response.';
        const updatedContext = [...input];
        if (textContent) {
          updatedContext.push({ role: 'assistant', content: textContent });
        }
        const elapsedMs = Date.now() - startTime;
        console.log(`13. Returning answer after ${elapsedMs}ms`);
        
        // Log the query
        await logQuery(supabase, user.id, message, [], elapsedMs, true);
        
        return json({ answer, conversation_context: updatedContext }); 
      }
      
      // Add assistant message to context
      if (textContent) {
        input.push({ role: 'assistant', content: textContent });
      }
      
      // Execute tools
      console.log(`13. Executing ${toolCalls.length} tools...`);
      let hasPendingConfirmation = false;
      let proposedAction: unknown = null;
      const toolsUsedThisTurn: string[] = [];
      
      for (const tc of toolCalls) {
        console.log(`14. Tool: ${tc.function.name}`);
        toolsUsedThisTurn.push(tc.function.name);
        
        // Check if this is a write operation that needs confirmation
        if (tc.function.name === 'create_activity' && !body.confirm_write) {
          // Parse the arguments to show what will be created
          try {
            const args = JSON.parse(tc.function.arguments) as { type?: string; title?: string; description?: string };
            proposedAction = {
              tool: 'create_activity',
              action: { type: args.type ?? 'general', title: args.title ?? '', description: args.description || null }
            };
            hasPendingConfirmation = true;
            console.log('15. Pending confirmation for create_activity:', proposedAction);
            
            // Stop processing and ask for confirmation
            const answer = textContent || 'I can create this activity, but I need your confirmation first.';
            const updatedContext = [...input];
            if (textContent) {
              updatedContext.push({ role: 'assistant', content: textContent });
            }
            const elapsedMs = Date.now() - startTime;
            console.log(`16. Returning pending confirmation after ${elapsedMs}ms`);
            
            // Log the query with tools used so far
            await logQuery(supabase, user.id, message, toolsUsedThisTurn, elapsedMs, true);
            
            return json({ 
              answer,
              conversation_context: updatedContext,
              pending_confirmation: true,
              proposed_action: proposedAction
            });
          } catch (e) {
            console.error('Failed to parse create_activity args:', e);
          }
        }
        
        // Execute the tool
        const output = await runTool(supabase, user.id, groqKey, tc.function.name, tc.function.arguments, body.confirm_write === true);
        
        // Check if tool returned a confirmation requirement
        if ((output as { requires_confirmation?: boolean }).requires_confirmation) {
          console.log('15. Tool requires confirmation');
          const answer = textContent || 'I can create this activity, but I need your confirmation first.';
          const updatedContext = [...input];
          if (textContent) {
            updatedContext.push({ role: 'assistant', content: textContent });
          }
          const elapsedMs = Date.now() - startTime;
          
          // Log the query
          await logQuery(supabase, user.id, message, toolsUsedThisTurn, elapsedMs, true);
          
          return json({
            answer,
            conversation_context: updatedContext,
            pending_confirmation: true,
            proposed_action: (output as { proposed_action: unknown }).proposed_action
          });
        }
        
        input.push({ 
          role: 'tool', 
          tool_call_id: tc.id, 
          tool_name: tc.function.name,
          content: JSON.stringify(output) 
        });
      }
    }
    
    console.log('Tool loop limit reached');
    const elapsedMs = Date.now() - startTime;
    await logQuery(supabase, user.id, message, [], elapsedMs, false, 'Tool loop limit reached');
    return json({ answer: 'I could not generate a complete answer.' }, 502);
    
  } catch (error) { 
    console.error('Error:', error);
    return json({ error: 'Unexpected error.' }, 500); 
  }
});

async function askGroq(key: string, input: unknown[]) { 
  console.log('askGroq: Starting with', input.length, 'messages');
  
  try {
    const model = 'openai/gpt-oss-120b';
    console.log('Using Groq model:', model);
    
    // Convert tool definitions to Groq format (OpenAI-compatible)
    const groqTools = [
      {
        type: 'function',
        function: {
          name: 'activity_summary',
          description: 'Get user activities from past N days',
          parameters: { 
            type: 'object',
            properties: { days: { type: 'number', description: 'Number of days (1-90)', minimum: 1, maximum: 90 } }, 
            required: ['days'] 
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'finance_summary',
          description: 'Get spending and income data for past N days',
          parameters: { 
            type: 'object',
            properties: { days: { type: 'number', description: 'Number of days (1-90)', minimum: 1, maximum: 90 } }, 
            required: ['days'] 
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'goal_status',
          description: 'Get active goals and progress',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'project_status',
          description: 'Get active projects and status',
          parameters: { type: 'object', properties: {}, required: [] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'compare_periods',
          description: 'Compare activity or spending between periods',
          parameters: { 
            type: 'object',
            properties: { 
              type: { type: 'string', enum: ['activities', 'spending'], description: 'Type of comparison' }, 
              period_days: { type: 'number', description: 'Days per period (7-90)', minimum: 7, maximum: 90 } 
            }, 
            required: ['type', 'period_days'] 
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_activity',
          description: 'Create a new activity record',
          parameters: { 
            type: 'object',
            properties: { 
              type: { type: 'string', enum: ['workout', 'learning', 'nutrition', 'project', 'finance', 'general'] }, 
              title: { type: 'string', description: 'Activity title (1-200 chars)' }, 
              description: { type: 'string', description: 'Activity description' } 
            }, 
            required: ['type', 'title', 'description'] 
          }
        }
      }
    ];
    
    // Build message history for Groq
    const messages: unknown[] = [
      {
        role: 'system',
        content: `You are Personal OS, an intelligent assistant analyzing personal life data.

RESPONSE STRATEGY:
- Use multiple tools to answer complex questions
- Base answers on retrieved data only
- Show specific numbers and trends
- Be concise and insightful`
      }
    ];

    // Add conversation history
    for (const msg of input) {
      const m = msg as Record<string, unknown>;
      if (m.role === 'tool') {
        messages.push({
          role: 'tool',
          tool_call_id: m.tool_call_id as string,
          name: (m.tool_name || m.name) as string, // Add name field for tool messages
          content: m.content as string
        });
      } else if (m.role === 'assistant') {
        messages.push({
          role: 'assistant',
          content: m.content as string
        });
      } else {
        messages.push({
          role: 'user',
          content: m.content as string
        });
      }
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ 
        model: model,
        messages: messages,
        tools: groqTools,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 1024,
        top_p: 1
      }) 
    });
    
    console.log(`askGroq: Response received with status ${response.status}`);
    return response;
  } catch (error) {
    console.error('askGroq error:', error instanceof Error ? error.message : error);
    throw error;
  }
}
async function runTool(supabase: ReturnType<typeof createClient>, userId: string, openAiKey: string, name: string, raw: string, confirmed: boolean) { 
  let args: { days?: number; query?: string; type?: string; title?: string; description?: string | null; period_days?: number }; 
  try { args = JSON.parse(raw) as typeof args; } 
  catch { return { error: 'Invalid tool arguments.' }; } 
  
  if (name === 'activity_summary') return activitySummary(supabase, userId, clampDays(args.days)); 
  if (name === 'finance_summary') return financeSummary(supabase, userId, clampDays(args.days)); 
  if (name === 'search_notes') return searchNotes(supabase, userId, openAiKey, args.query?.trim().slice(0, 500) ?? ''); 
  if (name === 'goal_status') return goalStatus(supabase, userId);
  if (name === 'project_status') return projectStatus(supabase, userId);
  if (name === 'compare_periods') return comparePeriods(supabase, userId, args.type ?? 'activities', clampDays(args.period_days ?? 7));
  if (name === 'create_activity') { 
    const proposed = { type: args.type ?? 'general', title: args.title?.trim() ?? '', description: args.description?.trim() || null }; 
    if (!proposed.title || !['workout', 'learning', 'nutrition', 'project', 'finance', 'general'].includes(proposed.type)) return { error: 'Invalid activity.' }; 
    if (!confirmed) return { requires_confirmation: true, proposed_action: proposed }; 
    const { error } = await supabase.from('activities').insert({ user_id: userId, ...proposed, metadata: {}, started_at: new Date().toISOString() }); 
    return error ? { error: 'Could not create activity.' } : { created: true, activity: proposed }; 
  } 
  return { error: 'Unknown tool.' }; 
}
function clampDays(value?: number) { return Math.min(Math.max(Math.floor(value ?? 7), 1), 90); }
async function activitySummary(supabase: ReturnType<typeof createClient>, userId: string, days: number) { const start = new Date(); start.setDate(start.getDate() - days); const { data, error } = await supabase.from('activities').select('type,title,description,metadata,started_at').eq('user_id', userId).gte('started_at', start.toISOString()).order('started_at', { ascending: false }).limit(100); if (error) return { error: 'Activity data is unavailable.' }; const byType: Record<string, number> = {}; for (const row of data ?? []) byType[row.type] = (byType[row.type] ?? 0) + 1; return { days, count: data?.length ?? 0, by_type: byType, recent: (data ?? []).slice(0, 20) }; }
async function financeSummary(supabase: ReturnType<typeof createClient>, userId: string, days: number) { const start = new Date(); start.setDate(start.getDate() - days); const { data, error } = await supabase.from('transactions').select('amount,transaction_type,merchant,transaction_date,category:transaction_categories(name)').eq('user_id', userId).gte('transaction_date', start.toISOString().slice(0, 10)).limit(500); if (error) return { error: 'Finance data is unavailable.' }; let income = 0; let spending = 0; const byCategory: Record<string, number> = {}; for (const row of data ?? []) { const amount = Number(row.amount) || 0; if (row.transaction_type === 'income') income += amount; else { spending += amount; const category = (row.category as { name?: string }[] | null)?.[0]?.name ?? 'Other'; byCategory[category] = (byCategory[category] ?? 0) + amount; } } return { days, transaction_count: data?.length ?? 0, income, spending, net: income - spending, spending_by_category: byCategory }; }
async function searchNotes(supabase: ReturnType<typeof createClient>, userId: string, key: string, query: string) { 
  if (!query) return { error: 'A search query is required.' }; 
  
  // For now, do full-text search without embeddings
  const { data, error } = await supabase
    .from('notes')
    .select('id,title,content')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .limit(10);
    
  if (error) return { error: 'Knowledge search is unavailable.' }; 
  
  return { 
    results: (data as Array<{ id: string; title: string; content: string }> | null)?.map(n => ({
      id: n.id,
      title: n.title,
      snippet: n.content.substring(0, 150) + '...'
    })) ?? [] 
  }; 
}
async function goalStatus(supabase: ReturnType<typeof createClient>, userId: string) { 
  const { data, error } = await supabase.from('goals').select('id,title,target_value,current_value,status,target_date').eq('user_id', userId).order('created_at', { ascending: false }).limit(20); 
  if (error) return { error: 'Could not retrieve goals.' }; 
  const goals = (data as Array<{ id: string; title: string; target_value: number | null; current_value: number | null; status: string; target_date: string | null }> | null) ?? []; 
  return { 
    total: goals.length, 
    active: goals.filter(g => g.status === 'active').length, 
    completed: goals.filter(g => g.status === 'completed').length, 
    goals: goals.map(g => ({ 
      title: g.title, 
      status: g.status, 
      progress: g.target_value ? `${g.current_value}/${g.target_value}` : 'in progress', 
      target_date: g.target_date 
    })) 
  }; 
}
async function projectStatus(supabase: ReturnType<typeof createClient>, userId: string) { 
  const { data, error } = await supabase.from('projects').select('id,name,status,progress,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20); 
  if (error) return { error: 'Could not retrieve projects.' }; 
  const projects = (data as Array<{ id: string; name: string; status: string; progress: number; updated_at: string }> | null) ?? []; 
  return { 
    total: projects.length, 
    active: projects.filter(p => p.status === 'active').length, 
    completed: projects.filter(p => p.status === 'completed').length, 
    projects: projects.map(p => ({ 
      name: p.name, 
      status: p.status, 
      progress: p.progress 
    })) 
  }; 
}
async function comparePeriods(supabase: ReturnType<typeof createClient>, userId: string, compareType: string, periodDays: number) { 
  const now = new Date(); 
  const current_start = new Date(now); 
  current_start.setDate(current_start.getDate() - periodDays); 
  const current_end = new Date(now); 
  const previous_start = new Date(current_start); 
  previous_start.setDate(previous_start.getDate() - periodDays); 
  const previous_end = new Date(current_start);
  
  if (compareType === 'spending') { 
    const [{ data: currentTx }, { data: prevTx }] = await Promise.all([
      supabase.from('transactions').select('amount,transaction_type').eq('user_id', userId).eq('transaction_type', 'expense').gte('transaction_date', current_start.toISOString().slice(0, 10)).lt('transaction_date', current_end.toISOString().slice(0, 10)), 
      supabase.from('transactions').select('amount,transaction_type').eq('user_id', userId).eq('transaction_type', 'expense').gte('transaction_date', previous_start.toISOString().slice(0, 10)).lt('transaction_date', previous_end.toISOString().slice(0, 10))
    ]); 
    const currentSpend = (currentTx ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0); 
    const prevSpend = (prevTx ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0); 
    const change = ((currentSpend - prevSpend) / (prevSpend || 1)) * 100; 
    return { 
      period_days: periodDays, 
      current_period: { days: periodDays, spending: currentSpend }, 
      previous_period: { days: periodDays, spending: prevSpend }, 
      change_percent: Math.round(change * 10) / 10, 
      trend: currentSpend < prevSpend ? 'decreasing' : 'increasing' 
    }; 
  } else { 
    const [{ data: currentAct }, { data: prevAct }] = await Promise.all([
      supabase.from('activities').select('type').eq('user_id', userId).gte('started_at', current_start.toISOString()).lt('started_at', current_end.toISOString()), 
      supabase.from('activities').select('type').eq('user_id', userId).gte('started_at', previous_start.toISOString()).lt('started_at', previous_end.toISOString())
    ]); 
    const currentCount = currentAct?.length ?? 0; 
    const prevCount = prevAct?.length ?? 0; 
    const change = ((currentCount - prevCount) / (prevCount || 1)) * 100; 
    return { 
      period_days: periodDays, 
      current_period: { days: periodDays, activity_count: currentCount }, 
      previous_period: { days: periodDays, activity_count: prevCount }, 
      change_percent: Math.round(change * 10) / 10, 
      trend: currentCount > prevCount ? 'increasing' : 'decreasing' 
    }; 
  } 
}
function json(body: Record<string, unknown>, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
