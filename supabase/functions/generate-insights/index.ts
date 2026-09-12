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
    
    const body = await request.json() as { period_days?: number };
    const periodDays = Math.min(Math.max(Math.floor(body.period_days ?? 30), 7), 90);
    
    console.log(`Generating insights for user ${user.id} for past ${periodDays} days`);
    
    // Check if cache is still valid
    const { data: cached } = await supabase
      .from('analytics_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('metric_type', 'all_insights')
      .eq('period_days', periodDays)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (cached) {
      console.log('Returning cached insights');
      return json({ insights: cached.metric_data, cached: true });
    }
    
    // Generate fresh insights
    const insights = await generateInsights(supabase, user.id, periodDays);
    
    // Cache the insights for 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    await supabase.from('analytics_cache').upsert(
      {
        user_id: user.id,
        metric_type: 'all_insights',
        period_days: periodDays,
        metric_data: insights,
        expires_at: expiresAt.toISOString()
      },
      { onConflict: 'user_id,metric_type,period_days' }
    );
    
    return json({ insights, cached: false });
    
  } catch (error) {
    console.error('Error:', error);
    return json({ error: 'Failed to generate insights' }, 500);
  }
});

async function generateInsights(supabase: ReturnType<typeof createClient>, userId: string, periodDays: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);
  
  // Get query statistics
  const { data: queries } = await supabase
    .from('assistant_queries')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });
  
  const queryList = (queries as Array<{
    query: string;
    tools_used: string[];
    response_time_ms: number;
    success: boolean;
    created_at: string;
  }> | null) ?? [];
  
  // Get patterns
  const { data: patterns } = await supabase
    .from('query_patterns')
    .select('*')
    .eq('user_id', userId)
    .order('frequency', { ascending: false })
    .limit(20);
  
  const patternList = (patterns as Array<{
    pattern: string;
    pattern_type: string;
    frequency: number;
  }> | null) ?? [];
  
  // Calculate metrics
  const totalQueries = queryList.length;
  const successfulQueries = queryList.filter(q => q.success).length;
  const successRate = totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 0;
  
  const avgResponseTime = queryList.length > 0
    ? Math.round(queryList.reduce((sum, q) => sum + (q.response_time_ms || 0), 0) / queryList.length)
    : 0;
  
  // Count tool usage
  const toolUsage: Record<string, number> = {};
  for (const query of queryList) {
    for (const tool of query.tools_used || []) {
      toolUsage[tool] = (toolUsage[tool] ?? 0) + 1;
    }
  }
  
  // Extract top topics from queries
  const topicCounts: Record<string, number> = {};
  const keywords = ['activity', 'finance', 'spending', 'goal', 'project', 'fitness', 'workout', 'learning', 'nutrition', 'note', 'search'];
  
  for (const query of queryList) {
    const queryLower = query.query.toLowerCase();
    for (const keyword of keywords) {
      if (queryLower.includes(keyword)) {
        topicCounts[keyword] = (topicCounts[keyword] ?? 0) + 1;
      }
    }
  }
  
  // Get top topics
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
  
  // Identify trends and patterns
  const insights: Record<string, unknown> = {
    period_days: periodDays,
    generated_at: new Date().toISOString(),
    summary: {
      total_queries: totalQueries,
      successful_queries: successfulQueries,
      success_rate: `${successRate}%`,
      avg_response_time_ms: avgResponseTime
    },
    top_topics: topTopics,
    tool_usage: Object.entries(toolUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tool, count]) => ({ tool, count })),
    patterns: patternList.slice(0, 10).map(p => ({
      pattern: p.pattern,
      type: p.pattern_type,
      frequency: p.frequency
    })),
    recommendations: generateRecommendations(totalQueries, successRate, topTopics, toolUsage)
  };
  
  return insights;
}

function generateRecommendations(totalQueries: number, successRate: number, topTopics: Array<{ topic: string; count: number }>, toolUsage: Record<string, number>): string[] {
  const recommendations: string[] = [];
  
  if (totalQueries === 0) {
    recommendations.push('Start by asking the assistant questions about your activities, goals, or finances.');
    return recommendations;
  }
  
  if (successRate < 80) {
    recommendations.push(`Your assistant success rate is ${successRate}%. Some queries may be unclear - try being more specific.`);
  }
  
  if (topTopics.length > 0) {
    const topTopic = topTopics[0];
    if (topTopic.count > totalQueries * 0.4) {
      recommendations.push(`You ask about ${topTopic.topic} frequently (${topTopic.count} queries). Consider setting up ${topTopic.topic} reminders or goals.`);
    }
  }
  
  const mostUsedTool = Object.entries(toolUsage)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (mostUsedTool && mostUsedTool[1] > totalQueries * 0.5) {
    recommendations.push(`You primarily use the ${mostUsedTool[0]} tool. Explore other tools for deeper insights.`);
  }
  
  if (totalQueries < 10) {
    recommendations.push('Keep asking questions to build patterns and get personalized recommendations.');
  }
  
  return recommendations.slice(0, 3);
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
