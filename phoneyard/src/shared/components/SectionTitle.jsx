import React from 'react';

export default function SectionTitle({ eyebrow, title }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {eyebrow && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--gold-dark)',
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>{title}</div>
    </div>
  );
}
