import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!token || !url || !anonKey) {
      return json({ error: 'Authentication required' }, 401);
    }
    
    const supabase = createClient(url, anonKey, { 
      global: { headers: { Authorization: `Bearer ${token}` } } 
    });
    
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return json({ error: 'Authentication required' }, 401);
    }
    
    console.log(`Updating patterns for user ${user.id}`);
    
    // Get recent queries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: queries } = await supabase
      .from('assistant_queries')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });
    
    const queryList = (queries as Array<{
      query: string;
      tools_used: string[];
      created_at: string;
    }> | null) ?? [];
    
    console.log(`Found ${queryList.length} recent queries`);
    
    // Extract topics from queries
    const topicPatterns = extractTopics(queryList);
    
    // Extract tool patterns
    const toolPatterns = extractTools(queryList);
    
    // Extract time patterns
    const timePatterns = extractTimePatterns(queryList);
    
    // Update all patterns in database
    const allPatterns = [...topicPatterns, ...toolPatterns, ...timePatterns];
    
    let updatedCount = 0;
    for (const pattern of allPatterns) {
      try {
        // Check if pattern exists
        const { data: existing } = await supabase
          .from('query_patterns')
          .select('id, frequency')
          .eq('user_id', user.id)
          .eq('pattern', pattern.pattern)
          .eq('pattern_type', pattern.type)
          .single();
        
        if (existing) {
          // Update existing pattern
          await supabase
            .from('query_patterns')
            .update({
              frequency: existing.frequency + (pattern.count || 1),
              last_seen: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Insert new pattern
          await supabase
            .from('query_patterns')
            .insert({
              user_id: user.id,
              pattern: pattern.pattern,
              pattern_type: pattern.type,
              frequency: pattern.count || 1,
              last_seen: new Date().toISOString(),
              metadata: pattern.metadata || {}
            });
        }
        updatedCount++;
      } catch (e) {
        console.error(`Failed to update pattern ${pattern.pattern}:`, e);
      }
    }
    
    console.log(`Updated ${updatedCount} patterns`);
    
    return json({ 
      success: true, 
      patterns_updated: updatedCount,
      topics: topicPatterns.length,
      tools: toolPatterns.length,
      time_patterns: timePatterns.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    return json({ error: 'Failed to update patterns' }, 500);
  }
});

function extractTopics(queries: Array<{ query: string }>): Array<{ pattern: string; type: string; count: number; metadata?: Record<string, unknown> }> {
  const keywords: Record<string, string> = {
    'fitness': 'fitness|workout|exercise|running|gym|training|sport',
    'finance': 'finance|spending|money|expense|budget|transaction|income',
    'learning': 'learning|study|course|education|reading|knowledge',
    'productivity': 'project|task|deadline|productivity|goal|progress',
    'health': 'health|nutrition|diet|sleep|wellness|medical',
    'time': 'week|month|day|time|when|during|last|past|trend',
    'comparison': 'compare|vs|between|difference|trend|increase|decrease'
  };
  
  const topicCounts: Record<string, number> = {};
  
  for (const q of queries) {
    const queryLower = q.query.toLowerCase();
    
    for (const [topic, pattern] of Object.entries(keywords)) {
      const regex = new RegExp(`\\b(${pattern})\\b`, 'i');
      if (regex.test(queryLower)) {
        topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
      }
    }
  }
  
  return Object.entries(topicCounts)
    .map(([topic, count]) => ({
      pattern: topic,
      type: 'topic',
      count
    }))
    .filter(p => p.count > 0);
}

function extractTools(queries: Array<{ tools_used: string[] }>): Array<{ pattern: string; type: string; count: number }> {
  const toolCounts: Record<string, number> = {};
  
  for (const q of queries) {
    for (const tool of q.tools_used || []) {
      toolCounts[tool] = (toolCounts[tool] ?? 0) + 1;
    }
  }
  
  return Object.entries(toolCounts)
    .map(([tool, count]) => ({
      pattern: tool,
      type: 'tool',
      count
    }))
    .filter(p => p.count > 0);
}

function extractTimePatterns(queries: Array<{ created_at: string }>): Array<{ pattern: string; type: string; count: number; metadata?: Record<string, unknown> }> {
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, number> = {};
  
  for (const q of queries) {
    const date = new Date(q.created_at);
    const hour = date.getHours();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] ?? 0) + 1;
  }
  
  const patterns: Array<{ pattern: string; type: string; count: number; metadata?: Record<string, unknown> }> = [];
  
  // Add hourly patterns
  for (const [hour, count] of Object.entries(hourCounts)) {
    if (count >= 2) {
      const hourNum = Number(hour);
      const timeOfDay = getTimeOfDay(hourNum);
      patterns.push({
        pattern: `${timeOfDay}_${hourNum}h`,
        type: 'time',
        count,
        metadata: { hour: hourNum, period: timeOfDay }
      });
    }
  }
  
  // Add day patterns
  for (const [day, count] of Object.entries(dayCounts)) {
    if (count >= 1) {
      patterns.push({
        pattern: `${day}_activity`,
        type: 'time',
        count,
        metadata: { day }
      });
    }
  }
  
  return patterns;
}

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
