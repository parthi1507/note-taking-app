const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function ask(prompt: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit reached. Please wait a moment and try again.');
    }
    if (response.status === 401) {
      throw new Error('API key not authorized. Check your Groq API key.');
    }
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function generateSummary(content: string): Promise<string> {
  if (!content.trim()) throw new Error('No content to summarize');
  return ask(
    `Summarize the following note in 2-3 concise sentences. Return only the summary, no extra text:\n\n${content}`
  );
}

export async function generateTitle(content: string): Promise<string> {
  if (!content.trim()) throw new Error('No content to generate title');
  return ask(
    `Generate a short, clear title (max 6 words) for this note. Return only the title, no quotes or extra text:\n\n${content}`
  );
}

export async function generateTags(content: string): Promise<string[]> {
  if (!content.trim()) throw new Error('No content to generate tags');
  const result = await ask(
    `Generate 3-5 relevant tags for this note. Return only lowercase tags separated by commas, no hashtags or extra text:\n\n${content}`
  );
  return result
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter((t) => t.length > 0)
    .slice(0, 5);
}
