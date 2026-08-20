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
  return (
    <label className="number-field">
      <span className="number-field__label">{label}</span>
      <span className="number-field__input-wrap">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onBlur={(e) => onCommit?.(parseFloat(e.target.value))}
        />
        {suffix && <span className="number-field__suffix">{suffix}</span>}
      </span>
    </label>
  );
}
