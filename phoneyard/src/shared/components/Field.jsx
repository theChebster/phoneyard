import React from 'react';

export default function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: 'var(--ink-soft)',
          marginBottom: 6,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {children}
      {hint && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 5 }}>{hint}</div>}
    </label>
  );
}
