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
export async function transcribeAudioNative(uri: string, ext = 'm4a'): Promise<string> {
  if (!API_KEY) throw new Error('Groq API key is not configured. Add EXPO_PUBLIC_GROQ_API_KEY to your .env file.');

  const formData = new FormData();
  formData.append('file', { uri, name: `recording.${ext}`, type: `audio/${ext}` } as any);
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

// ── Audio file upload & chunked transcription (web) ──────────────────────────

const MAX_DIRECT_BYTES = 24 * 1024 * 1024; // 24 MB — safely under Groq's 25 MB cap
const CHUNK_SECS = 10 * 60;                 // 10-minute chunks
const TARGET_SAMPLE_RATE = 16_000;          // 16 kHz mono is ideal for Whisper

/** Pack a mono AudioBuffer into a WAV Blob. */
function audioBufferToWav(buf: AudioBuffer): Blob {
  const sr = buf.sampleRate;
  const len = buf.length;
  const ab = new ArrayBuffer(44 + len * 2);
  const dv = new DataView(ab);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true);
  w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, 'data'); dv.setUint32(40, len * 2, true);
  const numCh = buf.numberOfChannels;
  const channels = Array.from({ length: numCh }, (_, i) => buf.getChannelData(i));
  let off = 44;
  for (let i = 0; i < len; i++) {
    let s = 0;
    for (const ch of channels) s += ch[i];
    dv.setInt16(off, Math.max(-1, Math.min(1, s / numCh)) * 0x7fff, true);
    off += 2;
  }
  return new Blob([ab], { type: 'audio/wav' });
}

/**
 * Web: transcribe an uploaded audio File.
 * Files ≤ 24 MB → sent directly to Groq.
 * Files > 24 MB → decoded with Web Audio API, split into 10-min mono-16kHz
 *                 WAV chunks (~19 MB each) and stitched back together.
 */
export async function transcribeAudioFile(
  file: File,
  onProgress: (msg: string) => void,
): Promise<string> {
  if (!API_KEY) throw new Error('Groq API key is not configured. Add EXPO_PUBLIC_GROQ_API_KEY to your .env file.');

  if (file.size <= MAX_DIRECT_BYTES) {
    onProgress('Transcribing audio…');
    return transcribeAudio(file as unknown as Blob);
  }

  onProgress('Loading audio file…');
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  let srcBuf: AudioBuffer;
  try {
    srcBuf = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    ctx.close();
  }

  const totalSecs = srcBuf.duration;
  const totalChunks = Math.ceil(totalSecs / CHUNK_SECS);
  const results: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const startSec = i * CHUNK_SECS;
    const endSec = Math.min((i + 1) * CHUNK_SECS, totalSecs);
    const dur = endSec - startSec;
    onProgress(
      `Transcribing part ${i + 1} of ${totalChunks} (${Math.round(startSec / 60)}–${Math.round(endSec / 60)} min)…`,
    );
    const offline = new OfflineAudioContext(1, Math.ceil(dur * TARGET_SAMPLE_RATE), TARGET_SAMPLE_RATE);
    const src = offline.createBufferSource();
    src.buffer = srcBuf;
    src.connect(offline.destination);
    src.start(0, startSec, dur);
    const rendered = await offline.startRendering();
    const wav = audioBufferToWav(rendered);
    const text = await transcribeAudio(wav);
    if (text) results.push(text);
  }
  return results.join(' ');
}

// ── Native large-file chunking (iOS / Android) ────────────────────────────────
// expo-file-system lets us read arbitrary byte ranges from a file.
// We write each 20 MB slice as a temp file and transcribe it independently.
// MP3 / AAC streams tolerate byte-boundary cuts gracefully in Whisper.

const NATIVE_CHUNK_BYTES = 20 * 1024 * 1024; // 20 MB per chunk

/**
 * Native: transcribe any audio file regardless of size.
 * Files ≤ 20 MB are sent directly; larger files are sliced into 20 MB chunks,
 * each written to the device cache, transcribed, then deleted.
 */
export async function transcribeAudioFileNative(
  uri: string,
  fileSize: number,
  onProgress: (msg: string) => void,
): Promise<string> {
  if (!API_KEY) throw new Error('Groq API key is not configured. Add EXPO_PUBLIC_GROQ_API_KEY to your .env file.');

  // Derive extension so Groq knows the codec (mp3, m4a, wav, etc.)
  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'm4a';

  if (fileSize <= NATIVE_CHUNK_BYTES) {
    onProgress('Transcribing audio…');
    return transcribeAudioNative(uri, ext);
  }

  const FileSystem = require('expo-file-system');
  const totalChunks = Math.ceil(fileSize / NATIVE_CHUNK_BYTES);
  const results: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const position = i * NATIVE_CHUNK_BYTES;
    const length = Math.min(NATIVE_CHUNK_BYTES, fileSize - position);
    onProgress(`Transcribing part ${i + 1} of ${totalChunks}…`);

    // Read this byte range as base64
    const chunkB64: string = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position,
      length,
    });

    // Write to a temp file so we can POST it via FormData
    const tmpUri = `${FileSystem.cacheDirectory}note_audio_${Date.now()}_${i}.${ext}`;
    await FileSystem.writeAsStringAsync(tmpUri, chunkB64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    try {
      const text = await transcribeAudioNative(tmpUri, ext);
      if (text) results.push(text);
    } finally {
      FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});
    }
  }

  return results.join(' ');
}
