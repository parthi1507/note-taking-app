const API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function ask(prompt: string): Promise<string> {
  if (!API_KEY) throw new Error('Groq API key is not configured. Add EXPO_PUBLIC_GROQ_API_KEY to your .env file.');

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

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!API_KEY) throw new Error('Groq API key is not configured. Add EXPO_PUBLIC_GROQ_API_KEY to your .env file.');

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'en');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment.');
    if (response.status === 401) throw new Error('API key not authorized.');
    throw new Error(`Transcription error: ${response.status}`);
  }

  const data = await response.json();
  return data.text?.trim() ?? '';
}

// Native (iOS/Android) version — uses { uri, name, type } instead of Blob
export async function transcribeAudioNative(uri: string): Promise<string> {
  if (!API_KEY) throw new Error('Groq API key is not configured. Add EXPO_PUBLIC_GROQ_API_KEY to your .env file.');

  const formData = new FormData();
  formData.append('file', { uri, name: 'recording.m4a', type: 'audio/m4a' } as any);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'en');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment.');
    if (response.status === 401) throw new Error('API key not authorized.');
    throw new Error(`Transcription error: ${response.status}`);
  }

  const data = await response.json();
  return data.text?.trim() ?? '';
}
