# Natural Language Log Parser

Deploy with `supabase functions deploy parse-log`.

## Environment Setup

Set the server-side secret with:
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`):
```bash
supabase secrets set OPENAI_MODEL=gpt-4o
```

## How It Works

The function uses OpenAI to extract structured activities from natural language.

**Example input:**
```
Today I studied Machine Learning for 90 minutes and went to the gym. 
Did bench press 70kg for 3x8. Spent ₹350 on dinner.
```

**Returns:**
```json
{
  "activities": [
    {
      "type": "learning",
      "title": "Machine Learning",
      "description": "Studied for 90 minutes",
      "metadata": { "duration_minutes": 90 }
    },
    {
      "type": "workout",
      "title": "Gym",
      "description": "Bench press 70kg 3x8",
      "metadata": { "exercises": [...] }
    },
    {
      "type": "finance",
      "title": "Dinner",
      "description": null,
      "metadata": { "amount": 350 }
    }
  ]
}
```

## Important Notes

1. The function returns a **preview only** — no data is written to the database
2. The mobile app **must show** the extracted records to the user
3. The user **must confirm** before anything is saved
4. Never invent missing numbers — the parser uses empty metadata when details are absent

