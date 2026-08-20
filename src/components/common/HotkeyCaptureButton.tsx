import { useEffect, useState } from 'react';
import { formatKeyCode } from '../../utils/keyLabel';
import './HotkeyCaptureButton.css';

interface HotkeyCaptureButtonProps {
  label: string;
  onCapture: (code: string, keyLabel: string) => void;
  disabled?: boolean;
}

/**
 * "Press any key…" capture flow. Listens for the raw KeyboardEvent.code
 * (not `key`) so it works for numpad, F13+, and media keys the same as any
 * standard key — nothing about the capture path is limited to a fixed set.
 */
export function HotkeyCaptureButton({ label, onCapture, disabled }: HotkeyCaptureButtonProps) {
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListening(false);
        return;
      }
      onCapture(e.code, formatKeyCode(e.code));
      setListening(false);
    };

    // capture phase so this wins over any other global keydown listener
    // (built-in shortcuts, other hotkey bindings) while actively listening
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [listening, onCapture]);

  return (
    <button
      type="button"
      className={`hotkey-capture-button${listening ? ' hotkey-capture-button--listening' : ''}`}
      disabled={disabled}
      onClick={() => setListening(true)}
    >
      {listening ? 'Press any key… (Esc to cancel)' : label}
    </button>
  );
}
