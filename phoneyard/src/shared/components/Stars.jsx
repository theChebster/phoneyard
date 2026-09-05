import React from 'react';

export default function Stars({ value, size = 15 }) {
  const full = Math.round(value || 0);
  return (
    <span style={{ color: 'var(--gold-dark)', fontSize: size, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (n <= full ? '★' : '☆')).join('')}
    </span>
  );
}
