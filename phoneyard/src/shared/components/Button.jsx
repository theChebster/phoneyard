import React from 'react';

const VARIANTS = {
  primary: { background: 'var(--ink)', color: '#fff' },
  accent: { background: 'var(--gold)', color: '#3A2405' },
  ghost: { background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line-strong)' },
  subtle: { background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)' },
  whatsapp: { background: 'var(--whatsapp)', color: '#fff' },
  call: { background: 'var(--call)', color: '#fff' },
  danger: { background: 'var(--danger)', color: '#fff' },
  teal: { background: 'var(--teal)', color: '#fff' },
};

export default function Button({
  children,
  onClick,
  variant = 'primary',
  style = {},
  type = 'button',
  disabled,
}) {
  const base = {
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 700,
    padding: '11px 20px',
    borderRadius: 10,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    transition: 'transform .08s ease, box-shadow .15s ease',
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{ ...base, ...VARIANTS[variant], ...style }}
    >
      {children}
    </button>
  );
}
