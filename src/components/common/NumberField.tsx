import { useState } from 'react';
import './NumberField.css';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}

/**
 * onChange fires on every keystroke (live-updates the store); onCommit
 * fires on blur — callers that need a single undo entry (rather than one
 * per keystroke) should apply the mutation in onCommit instead of onChange.
 *
 * The input's text is tracked in local `draft` state rather than bound
 * directly to `value`. A controlled <input> whose onChange doesn't call
 * setState (the onCommit-only pattern, used by most callers here) gets its
 * DOM value forced back to the old `value` prop by React on every keystroke
 * — typing anything into e.g. a device's X/Y/Z or a platform's dimensions
 * got silently wiped before it could ever reach blur. Keeping a local draft
 * that always updates on input, and only re-syncing from `value` when it
 * changes externally (undo/redo, a drag, another field — the render-time
 * comparison below, React's documented "adjusting state when a prop
 * changes" pattern), fixes that for every caller without changing the
 * onChange/onCommit contract.
 */
export function NumberField({
  label,
  value,
  onChange,
  onCommit,
  step = 0.1,
  min,
  max,
  suffix,
}: NumberFieldProps) {
  const normalized = Number.isFinite(value) ? value : 0;
  const [draft, setDraft] = useState(() => String(normalized));
  const [lastSeenValue, setLastSeenValue] = useState(normalized);

  if (normalized !== lastSeenValue) {
    setLastSeenValue(normalized);
    setDraft(String(normalized));
  }

  return (
    <label className="number-field">
      <span className="number-field__label">{label}</span>
      <span className="number-field__input-wrap">
        <input
          type="number"
          value={draft}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            setDraft(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) onChange(parsed);
          }}
          onBlur={(e) => {
            const parsed = parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) onCommit?.(parsed);
          }}
        />
        {suffix && <span className="number-field__suffix">{suffix}</span>}
      </span>
    </label>
  );
}
