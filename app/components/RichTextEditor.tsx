import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TextInput } from 'react-native';

interface SelectionState {
  formats: Record<string, boolean>;
  block: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  insertTextRef?: React.MutableRefObject<((text: string) => void) | null>;
  onSelectionChange?: (state: SelectionState) => void;
  applyFormatRef?: React.MutableRefObject<((format: string) => void) | null>;
}

function stripHtmlForMobile(html: string): string {
  if (!html.includes('<')) return html;
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(div|p|h1|h2|h3)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const INLINE_COMMANDS = ['bold', 'italic', 'underline', 'strikeThrough'];

const EDITOR_CSS = `
  .rich-editor h1 { font-size: 26px; font-weight: 800; color: #ffffff; line-height: 1.3; margin: 4px 0; }
  .rich-editor h2 { font-size: 20px; font-weight: 700; color: #e0e0f0; line-height: 1.3; margin: 3px 0; }
  .rich-editor p, .rich-editor div { margin: 0; }
  .rich-editor a { color: #818cf8; text-decoration: underline; cursor: pointer; }
`;

function injectEditorStyles() {
  if (document.getElementById('rich-editor-css')) return;
  const style = document.createElement('style');
  style.id = 'rich-editor-css';
  style.textContent = EDITOR_CSS;
  document.head.appendChild(style);
}

const URL_PATTERN = /https?:\/\/[^\s<>"]+/g;

function linkifyTextNodes(editorEl: HTMLElement) {
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // Skip text nodes already inside an <a> tag
      let parent: Node | null = node.parentNode;
      while (parent && parent !== editorEl) {
        if ((parent as Element).nodeName === 'A') return NodeFilter.FILTER_REJECT;
        parent = parent.parentNode;
      }
      return URL_PATTERN.test(node.textContent ?? '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as unknown as Text);

  nodes.forEach((textNode) => {
    URL_PATTERN.lastIndex = 0;
    const text = textNode.textContent ?? '';
    const frag = document.createDocumentFragment();
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = URL_PATTERN.exec(text)) !== null) {
      if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
      const a = document.createElement('a');
      a.href = match[0];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = match[0];
      frag.appendChild(a);
      last = match.index + match[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    (textNode.parentNode as unknown as Element)?.replaceChild(frag, textNode as unknown as Node);
  });
}

function getActiveBlockTag(editorEl: any): string | null {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return null;
  let node: Node | null = sel.anchorNode;
  while (node && node !== editorEl) {
    const name = (node as Element).nodeName;
    if (name === 'H1' || name === 'H2') return name;
    node = node.parentNode;
  }
  return null;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  insertTextRef,
  onSelectionChange,
  applyFormatRef,
}: Props) {
  const editorRef = useRef<any>(null);
  const [isEmpty, setIsEmpty] = useState(!value);
  const initialized = useRef(false);
  const mobileSelectionRef = useRef({ start: 0, end: 0 });
  const mobileValueRef = useRef(value.includes('<') ? stripHtmlForMobile(value) : value);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Keep mobileValueRef in sync with incoming value changes (e.g. voice transcription)
      const plain = value.includes('<') ? stripHtmlForMobile(value) : value;
      mobileValueRef.current = plain;

      if (applyFormatRef) {
        applyFormatRef.current = (format: string) => {
          const cur = mobileValueRef.current;
          const { start, end } = mobileSelectionRef.current;
          const selected = cur.slice(start, end);
          let next = cur;
          if (format === 'bold') {
            next = cur.slice(0, start) + '**' + selected + '**' + cur.slice(end);
          } else if (format === 'italic') {
            next = cur.slice(0, start) + '_' + selected + '_' + cur.slice(end);
          } else if (format === 'underline') {
            next = cur.slice(0, start) + '__' + selected + '__' + cur.slice(end);
          } else if (format === 'strikeThrough') {
            next = cur.slice(0, start) + '~~' + selected + '~~' + cur.slice(end);
          } else if (format === 'h1') {
            const lineStart = cur.lastIndexOf('\n', start - 1) + 1;
            next = cur.slice(lineStart, lineStart + 2) === '# '
              ? cur.slice(0, lineStart) + cur.slice(lineStart + 2)
              : cur.slice(0, lineStart) + '# ' + cur.slice(lineStart);
          } else if (format === 'h2') {
            const lineStart = cur.lastIndexOf('\n', start - 1) + 1;
            next = cur.slice(lineStart, lineStart + 3) === '## '
              ? cur.slice(0, lineStart) + cur.slice(lineStart + 3)
              : cur.slice(0, lineStart) + '## ' + cur.slice(lineStart);
          }
          mobileValueRef.current = next;
          onChange(next);
        };
      }
      return;
    }

    injectEditorStyles();

    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = value || '';
      setIsEmpty(!value);
      initialized.current = true;
    }

    if (insertTextRef) {
      insertTextRef.current = (text: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        // Escape HTML entities then convert \n → <br> so line breaks render correctly
        // in the contentEditable div (plain \n characters are invisible in HTML).
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        try {
          document.execCommand('insertHTML', false, '<br>' + escaped);
        } catch {
          editorRef.current.innerHTML = editorRef.current.innerHTML + '<br>' + escaped;
        }
        onChange(editorRef.current.innerHTML);
        setIsEmpty(false);
      };
    }
  }, [value]);

  // Native fallback — plain TextInput with HTML stripped
  if (Platform.OS !== 'web') {
    const displayValue = value.includes('<') ? stripHtmlForMobile(value) : value;
    return (
      <TextInput
        style={styles.nativeInput}
        placeholder={placeholder}
        placeholderTextColor="#444"
        value={displayValue}
        onChangeText={(text) => {
          mobileValueRef.current = text;
          onChange(text);
        }}
        onSelectionChange={(e) => {
          mobileSelectionRef.current = e.nativeEvent.selection;
        }}
        multiline
        textAlignVertical="top"
      />
    );
  }

  const notifySelectionChange = () => {
    if (!onSelectionChange) return;
    const formats: Record<string, boolean> = {};
    INLINE_COMMANDS.forEach((cmd) => {
      try { formats[cmd] = document.queryCommandState(cmd); } catch { /* ignore */ }
    });
    onSelectionChange({ formats, block: getActiveBlockTag(editorRef.current) });
  };

  const syncContent = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = (editorRef.current.innerText ?? '').trim();
    setIsEmpty(!text || text === '\n');
    onChange(html);
    notifySelectionChange();
  };

  return (
    <View style={styles.editorArea}>
      {isEmpty && (
        <View style={styles.placeholderWrapper} pointerEvents="none">
          <Text style={styles.placeholder}>{placeholder}</Text>
        </View>
      )}
      {React.createElement('div', {
        ref: editorRef,
        contentEditable: true,
        suppressContentEditableWarning: true,
        className: 'rich-editor',
        onInput: syncContent,
        onKeyUp: (e: any) => {
          notifySelectionChange();
          if ((e.key === ' ' || e.key === 'Enter') && editorRef.current) {
            linkifyTextNodes(editorRef.current);
            // If cursor ended up inside an <a> (e.g. space was swallowed into the link),
            // push it out so subsequent typing doesn't inherit link underline/color.
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              let node: Node | null = sel.getRangeAt(0).startContainer;
              while (node && node !== editorRef.current) {
                if ((node as Element).nodeName === 'A') {
                  const range = document.createRange();
                  range.setStartAfter(node);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  break;
                }
                node = node.parentNode;
              }
            }
          }
        },
        onMouseUp: notifySelectionChange,
        onClick: (e: any) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'A') {
            e.preventDefault();
            const href = (target as HTMLAnchorElement).href;
            if (href) window.open(href, '_blank', 'noopener,noreferrer');
          }
        },
        style: {
          color: '#ccc',
          fontSize: '16px',
          lineHeight: '26px',
          minHeight: '240px',
          outline: 'none',
          fontFamily: 'inherit',
          wordBreak: 'break-word',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  editorArea: {
    position: 'relative',
    minHeight: 240,
  },
  placeholderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  placeholder: {
    color: '#444',
    fontSize: 16,
    lineHeight: 26,
  },
  nativeInput: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 26,
    minHeight: 240,
    outlineWidth: 0,
  } as any,
});
