import React from 'react';

export function Button({ children, className = '', variant = 'primary', ...p }) {
  const v = {
    primary: 'bg-teal text-white hover:bg-[#12464a]',
    secondary: 'bg-gold text-ink hover:brightness-95',
    ghost: 'border border-line bg-white hover:bg-cream',
    danger: 'bg-danger text-white hover:opacity-90',
  }[variant];
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${v} ${className}`}
      {...p}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'default' }) {
  const c = {
    default: 'bg-cream text-muted',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    teal: 'bg-teal/10 text-teal',
  }[tone];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${c}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-line bg-white shadow-sm ${className}`}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[11px] font-bold uppercase tracking-[.14em] text-gold-dark">
        {eyebrow}
      </div>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
      )}
    </div>
  );
}

export function Field({ label, ...p }) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-ink">
      <span>{label}</span>
      <input
        className="w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-gold-dark focus:ring-4 focus:ring-gold/20"
        {...p}
      />
    </label>
  );
}
