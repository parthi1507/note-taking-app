import { Platform } from 'react-native';

// ─── Web: load pdf.js from CDN (avoids import.meta bundler issues) ───────────

const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

function loadPdfjsFromCDN(): Promise<any> {
  if ((window as any).pdfjsLib) return Promise.resolve((window as any).pdfjsLib);

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${PDFJS_CDN}/pdf.min.js`;
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
      resolve(lib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF library.'));
    document.head.appendChild(script);
  });
}

async function extractWebPDF(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await loadPdfjsFromCDN();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const maxPages = Math.min(pdf.numPages, 25);
  let text = '';

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = (content.items as any[]).map((item) => item.str).join(' ');
    text += pageText + '\n\n';
  }

  return text.trim();
}

// ─── Mobile helpers ───────────────────────────────────────────────────────────

/** Decode base64 string to Uint8Array without relying on atob (not always available in Hermes). */
function base64ToBytes(base64: string): Uint8Array {
  const TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < TABLE.length; i++) lookup[TABLE.charCodeAt(i)] = i;

  // Strip whitespace / padding
  const cleaned = base64.replace(/[\s=]/g, '');
  const len = cleaned.length;
  const outLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(outLen);

  let j = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[cleaned.charCodeAt(i)] ?? 0;
    const b = lookup[cleaned.charCodeAt(i + 1)] ?? 0;
    const c = lookup[cleaned.charCodeAt(i + 2)] ?? 0;
    const d = lookup[cleaned.charCodeAt(i + 3)] ?? 0;
    bytes[j++] = (a << 2) | (b >> 4);
    if (i + 2 < len) bytes[j++] = ((b & 0xf) << 4) | (c >> 2);
    if (i + 3 < len) bytes[j++] = ((c & 0x3) << 6) | d;
  }

  return bytes.slice(0, j);
}

/**
 * Convert raw bytes to a latin-1 string without relying on TextDecoder('latin1'),
 * which is not available in all React Native / Hermes builds.
 * Process in chunks to avoid stack overflow on large files.
 */
function bytesToString(bytes: Uint8Array): string {
  const CHUNK = 8192;
  let result = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    result += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as any));
  }
  return result;
}

// ─── Mobile: basic text stream extraction from PDF binary ────────────────────

function extractMobilePDF(bytes: Uint8Array): string {
  const raw = bytesToString(bytes);

  const chunks: string[] = [];

  // Extract strings inside parentheses from BT…ET text blocks
  const blocks = raw.match(/BT[\s\S]*?ET/g) ?? [];
  for (const block of blocks) {
    const strings = block.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) ?? [];
    for (const s of strings) {
      const inner = s
        .slice(1, -1)
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\\\/g, '\\')
        .replace(/\\([()])/g, '$1')
        .replace(/[^\x20-\x7E]/g, '') // strip non-ASCII noise
        .trim();
      if (inner.length > 1) chunks.push(inner);
    }
  }

  // Also try to grab text from TJ arrays: [(text) -200 (more)] TJ
  const tjMatches = raw.match(/\[([^\]]*)\]\s*TJ/g) ?? [];
  for (const tj of tjMatches) {
    const strings = tj.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) ?? [];
    for (const s of strings) {
      const inner = s
        .slice(1, -1)
        .replace(/[^\x20-\x7E]/g, '')
        .trim();
      if (inner.length > 1) chunks.push(inner);
    }
  }

  const result = chunks.join(' ').replace(/\s{2,}/g, ' ').trim();
  return result || 'Could not extract readable text from this PDF. It may use compressed or image-based content.';
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  if (Platform.OS === 'web') {
    return extractWebPDF(buffer);
  }
  return extractMobilePDF(new Uint8Array(buffer));
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/** Pick a PDF using expo-document-picker and return its ArrayBuffer + filename */
export async function pickAndReadPDF(): Promise<{ buffer: ArrayBuffer; name: string } | null> {
  const DocumentPicker = require('expo-document-picker');
  const FileSystem = require('expo-file-system');

  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];

  if (Platform.OS === 'web') {
    const file: File = (asset as any).file;
    if (!file) return null;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('PDF is too large (max 20 MB). Please use a smaller file.');
    }
    const buffer = await file.arrayBuffer();
    return { buffer, name: file.name };
  }

  // Native: read from URI using expo-file-system
  const uri: string = asset.uri;
  const name: string = asset.name || asset.uri?.split('/').pop() || 'document.pdf';

  // Check file size before reading (expo-file-system getInfoAsync)
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && info.size && info.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('PDF is too large (max 20 MB). Please use a smaller file.');
    }
  } catch (e: any) {
    // If size check fails, still proceed — just log
    if (e.message?.includes('too large')) throw e;
  }

  const base64: string = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 → Uint8Array without atob (safer across Hermes versions)
  const bytes = base64ToBytes(base64);

  return { buffer: bytes.buffer, name };
}
