import React from 'react';

export default function StallNo({ n }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: 'var(--ink-soft)',
        background: 'var(--cream)',
        border: '1px solid var(--line-strong)',
        borderRadius: 5,
        padding: '3px 7px',
      }}
    >
      NO. {String(n).padStart(3, '0')}
    </span>
  );
}
