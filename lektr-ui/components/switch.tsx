"use client";

import React from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onCheckedChange, disabled, id }: SwitchProps) {
  const trackStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '44px',
    height: '24px',
    padding: '2px',
    borderRadius: '9999px',
    backgroundColor: checked ? 'var(--primary)' : 'var(--muted)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 150ms ease-in-out',
    boxSizing: 'border-box',
    minHeight: 'unset',
    minWidth: 'unset',
  };

  const thumbStyle: React.CSSProperties = {
    display: 'block',
    width: '20px',
    height: '20px',
    borderRadius: '9999px',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    transition: 'transform 150ms ease-in-out',
    transform: checked ? 'translateX(20px)' : 'translateX(0)',
    pointerEvents: 'none',
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      id={id}
      onClick={() => onCheckedChange(!checked)}
      style={trackStyle}
    >
      <span className="sr-only">Toggle</span>
      <span aria-hidden="true" style={thumbStyle} />
    </button>
  );
}
