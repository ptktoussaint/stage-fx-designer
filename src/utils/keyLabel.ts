/**
 * Turns a KeyboardEvent.code into a short display label. Codes are
 * layout-independent and cover extended keys (numpad, F13+, media keys)
 * that `key` alone doesn't reliably distinguish.
 */
export function formatKeyCode(code: string): string {
  if (code.startsWith('Numpad')) {
    const rest = code.slice(6);
    const NUMPAD_LABELS: Record<string, string> = {
      Add: '+',
      Subtract: '-',
      Multiply: '*',
      Divide: '/',
      Decimal: '.',
      Enter: 'Enter',
    };
    return `Numpad ${NUMPAD_LABELS[rest] ?? rest}`;
  }
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Media')) return code.slice(5).replace(/([a-z])([A-Z])/g, '$1 $2');
  if (code.startsWith('Arrow')) return `${code.slice(5)} Arrow`;
  if (code.startsWith('Control')) return `Ctrl (${code.slice(-4)})`;

  const SPECIAL: Record<string, string> = {
    Space: 'Space',
    Escape: 'Esc',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    CapsLock: 'Caps Lock',
    PageUp: 'Page Up',
    PageDown: 'Page Down',
  };
  return SPECIAL[code] ?? code;
}
