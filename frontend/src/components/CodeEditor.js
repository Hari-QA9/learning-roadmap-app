import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { highlight } from '../lib/practice/highlight';

const INDENT = { python: '    ', default: '  ' };
const OPENERS = { '{': '}', '[': ']', '(': ')' };

/** Insert text at the cursor and keep the browser's undo history (Ctrl+Z) working. */
function insert(el, text, selStart = el.selectionStart, selEnd = el.selectionEnd) {
  el.setSelectionRange(selStart, selEnd);
  // execCommand keeps undo; fall back for browsers that dropped it.
  // eslint-disable-next-line no-restricted-globals
  if (!document.execCommand || !document.execCommand('insertText', false, text)) {
    el.setRangeText(text, selStart, selEnd, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * A light code editor: a real <textarea> (so typing, selection, copy/paste, undo, screen readers and
 * phone keyboards all work normally) with syntax colours drawn underneath.
 * Tab indents, Shift+Tab outdents, Enter keeps the indentation, Ctrl/⌘+Enter runs.
 * Press Esc, then Tab, to move focus out of the editor.
 */
export default function CodeEditor({ value, onChange, language, onRun, label = 'Code editor', minRows = 14, readOnly = false, height }) {
  const ta = useRef(null);
  const pre = useRef(null);
  const gutter = useRef(null);
  const escaped = useRef(false);
  const unit = INDENT[language] || INDENT.default;

  const html = useMemo(() => `${highlight(value, language)}\n`, [value, language]);
  const lines = useMemo(() => Math.max(minRows, (value.match(/\n/g) || []).length + 1), [value, minRows]);

  const sync = useCallback(() => {
    const t = ta.current;
    if (!t) return;
    if (pre.current) { pre.current.scrollTop = t.scrollTop; pre.current.scrollLeft = t.scrollLeft; }
    if (gutter.current) gutter.current.scrollTop = t.scrollTop;
  }, []);
  useLayoutEffect(sync, [html, sync]);

  const onKeyDown = (e) => {
    const el = e.currentTarget;
    if (readOnly) return;
    if (e.key === 'Escape') { escaped.current = true; return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    const { selectionStart: s, selectionEnd: end } = el;
    const v = el.value;
    if (e.key === 'Tab') {
      if (escaped.current) { escaped.current = false; return; } // let focus move on
      e.preventDefault();
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      if (s === end && !e.shiftKey) { insert(el, unit); return; }
      // Indent / outdent every selected line (or the current line).
      const nl = v.indexOf('\n', end);
      const lineEnd = s === end ? (nl < 0 ? v.length : nl) : end > s && v[end - 1] === '\n' ? end - 1 : end;
      const block = v.slice(lineStart, lineEnd);
      const changed = e.shiftKey
        ? block.replace(/^( {1,4}|\t)/gm, (m) => (m === '\t' ? '' : m.slice(0, Math.max(0, m.length - unit.length))))
        : block.replace(/^/gm, unit);
      insert(el, changed, lineStart, lineEnd);
      if (s === end) { const pos = Math.max(lineStart, s - (block.length - changed.length)); el.setSelectionRange(pos, pos); }
      else el.setSelectionRange(lineStart, lineStart + changed.length);
      return;
    }
    escaped.current = false;
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const current = v.slice(lineStart, s);
      const indent = (current.match(/^[ \t]*/) || [''])[0];
      const before = current.trimEnd().slice(-1);
      const after = v[end];
      const opens = language === 'python' ? before === ':' : Object.keys(OPENERS).includes(before) || /<[a-z][^/>]*>$/i.test(current.trimEnd());
      if (opens && language !== 'python' && after && OPENERS[before] === after) {
        // {|} → {\n  |\n}
        insert(el, `\n${indent}${unit}\n${indent}`);
        const pos = s + 1 + indent.length + unit.length;
        el.setSelectionRange(pos, pos);
        return;
      }
      insert(el, `\n${indent}${opens ? unit : ''}`);
      return;
    }
    if (e.key === 'Backspace' && s === end && s > 0) {
      // Delete one indent level at once when only spaces are before the cursor.
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const current = v.slice(lineStart, s);
      if (current.length >= unit.length && /^ +$/.test(current) && current.length % unit.length === 0) {
        e.preventDefault();
        insert(el, '', s - unit.length, s);
      }
    }
  };

  return (
    <div className={`code-editor lang-${language || 'text'}`} style={height ? { height } : undefined}>
      <div className="code-gutter" ref={gutter} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <div className="code-area">
        <pre className="code-hl" ref={pre} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
        <textarea
          ref={ta}
          className="code-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={sync}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          readOnly={readOnly}
          aria-label={label}
          aria-describedby="code-editor-help"
        />
      </div>
      <span id="code-editor-help" className="sr-only">Tab indents. Press Escape then Tab to leave the editor. Control Enter runs your code.</span>
    </div>
  );
}
