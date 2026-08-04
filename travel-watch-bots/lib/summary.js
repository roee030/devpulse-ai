const SYSTEM_PROMPT =
  'אתה כותב הודעת התראה אחת, קצרה וטלגרפית, בעברית, בסגנון "איש מערות": ' +
  'בלי מילות קישור, בלי נימוס, רק עובדות חיוניות (יעד/מלון, מחיר, תאריכים, קישור אם יש). ' +
  'שורה אחת בלבד, קצרה ככל האפשר.';

// search + filtering never touch the LLM — this is only an optional rewrite of the
// already-computed caveman text, guarded by USE_LLM_SUMMARY.
export async function maybeSummarize(fallbackText) {
  if (process.env.USE_LLM_SUMMARY !== 'true') return fallbackText;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('USE_LLM_SUMMARY=true but ANTHROPIC_API_KEY is missing — using caveman fallback');
    return fallbackText;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: fallbackText }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API ${res.status}: ${await res.text().catch(() => '')}`);
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text?.trim();
    return text || fallbackText;
  } catch (err) {
    console.error('LLM summary failed, using caveman fallback:', err.message);
    return fallbackText;
  }
}
