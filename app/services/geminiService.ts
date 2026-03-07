const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function ask(prompt: string): Promise<string> {
  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 256 },
    }),
  });

  if (!response.ok) {
    throw new Error('Gemini API request failed');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
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
