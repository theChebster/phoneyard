import React from 'react';

const TONES = {
  neutral: { bg: '#EFEAE0', fg: '#5C5747' },
  good: { bg: '#DBEEE1', fg: '#1F6B4A' },
  warn: { bg: '#F7E4C7', fg: '#8A5A0F' },
  danger: { bg: '#F6DCDC', fg: '#8C2F2F' },
  accent: { bg: '#FBEBC8', fg: '#8A5A0F' },
};

export default function Badge({ children, tone = 'neutral', style }) {
  const c = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.02em',
        padding: '4px 10px',
        borderRadius: 999,
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
