import React from 'react';
import Button from './Button.jsx';
import Badge from './Badge.jsx';

export default function ListingCard({
  listing: l,
  setView,
  wishlist,
  toggleWishlist,
  compareIds,
  toggleCompare,
}) {
  const saved = wishlist.includes(l.id);
  const inCompare = compareIds.includes(l.id);

  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        opacity: l.sold ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        onClick={() => setView({ name: 'listing', id: l.id })}
        style={{
          aspectRatio: '1 / 1',
          width: '100%',
          background: 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {l.images && l.images[0] ? (
          <img
            src={l.images[0]}
            alt={l.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: 'var(--ink-soft)', fontSize: 11.5 }}>No photo</span>
        )}
        {l.sold && (
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <Badge tone="danger">Sold</Badge>
          </div>
        )}
      </div>
      <div
        onClick={() => setView({ name: 'listing', id: l.id })}
        style={{ padding: '10px 10px 8px', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 32,
          }}
        >
          {l.name}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 14.5,
            margin: '4px 0 6px',
            color: 'var(--gold-dark)',
          }}
        >
          GHS {Number(l.price).toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
          <Badge style={{ fontSize: 10.5 }}>{l.condition}</Badge>
          {l.negotiable && (
            <Badge tone="accent" style={{ fontSize: 10.5 }}>
              Negotiable
            </Badge>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 10px 10px' }}>
        <Button
          variant="ghost"
          style={{ flex: 1, fontSize: 11, padding: '6px 4px' }}
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(l.id);
          }}
        >
          {saved ? 'Saved ✓' : 'Save'}
        </Button>
        <Button
          variant="ghost"
          style={{ flex: 1, fontSize: 11, padding: '6px 4px' }}
          onClick={(e) => {
            e.stopPropagation();
            toggleCompare(l.id);
          }}
        >
          {inCompare ? '✓ Compare' : 'Compare'}
        </Button>
      </div>
    </div>
  );
}
