import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import './IconButton.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  active?: boolean;
}

export function IconButton({ icon, label, active, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`icon-button${active ? ' icon-button--active' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
