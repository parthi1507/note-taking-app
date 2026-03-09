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

export async function extractBusinessCard(imageBase64: string, mimeType = 'image/jpeg'): Promise<string> {
  if (!API_KEY) throw new Error('Groq API key is not configured. Add EXPO_PUBLIC_GROQ_API_KEY to your .env file.');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: 'Extract all contact information from this business card. Return ONLY a valid JSON object with these exact fields (set null if not found): name, title, company, email, phone, mobile, website, address, linkedin, twitter. No markdown, no extra text.',
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment.');
    if (response.status === 401) throw new Error('API key not authorized.');
    throw new Error(`Card scan failed: ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const info = JSON.parse(jsonMatch?.[0] ?? raw);

    const lines: string[] = ['📇 Business Card\n'];
    if (info.name)     lines.push(`👤 Name: ${info.name}`);
    if (info.title)    lines.push(`💼 Title: ${info.title}`);
    if (info.company)  lines.push(`🏢 Company: ${info.company}`);
    if (info.email)    lines.push(`📧 Email: ${info.email}`);
    if (info.phone)    lines.push(`📞 Phone: ${info.phone}`);
    if (info.mobile)   lines.push(`📱 Mobile: ${info.mobile}`);
    if (info.website)  lines.push(`🌐 Website: ${info.website}`);
    if (info.address)  lines.push(`📍 Address: ${info.address}`);
    if (info.linkedin) lines.push(`🔗 LinkedIn: ${info.linkedin}`);
    if (info.twitter)  lines.push(`🐦 Twitter: ${info.twitter}`);

    return lines.join('\n');
  } catch {
    return `📇 Business Card\n\n${raw}`;
  }
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
