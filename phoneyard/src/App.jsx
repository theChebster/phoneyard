import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Shell } from './components/PortalShell';
import { Button, Badge, Card, SectionTitle, Field } from './components/ui';
import {
  Store,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Plus,
  Upload,
  Eye,
  Heart,
  Scale,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  RefreshCw,
  Boxes,
  X,
  User,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { uploadImage } from './lib/image';
import { useSetting, SETTING_KEYS, saveSetting } from './lib/settings';

// Wishlist and compare are stored on-device (localStorage) since there is
// no buyer login/account system yet — only vendors and admins can sign
// in. This means these lists don't sync across devices/browsers; that
// needs real buyer accounts to fix properly.
const WISHLIST_KEY = 'py_wishlist_ids';
const COMPARE_KEY = 'py_compare_ids';
const MAX_COMPARE = 3;

function readIdList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function writeIdList(key, ids, eventName) {
  localStorage.setItem(key, JSON.stringify(ids));
  window.dispatchEvent(new Event(eventName));
}

function useIdListStorage(key, eventName) {
  const [ids, setIds] = React.useState(() => readIdList(key));
  React.useEffect(() => {
    const onChange = () => setIds(readIdList(key));
    window.addEventListener(eventName, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(eventName, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [key, eventName]);
  return [ids, setIds];
}

function useWishlist() {
  const [ids] = useIdListStorage(WISHLIST_KEY, 'py-wishlist-changed');
  const toggle = React.useCallback((id) => {
    const current = readIdList(WISHLIST_KEY);
    const has = current.includes(id);
    writeIdList(WISHLIST_KEY, has ? current.filter((x) => x !== id) : [...current, id], 'py-wishlist-changed');
    // Best-effort — silently no-ops until the adjust_listing_wishlist_saves
    // RPC exists in Supabase (anonymous visitors have no direct UPDATE
    // grant on listings, same reasoning as the views counter).
    supabase.rpc('adjust_listing_wishlist_saves', { p_listing_id: id, p_delta: has ? -1 : 1 }).then(({ error }) => {
      if (error) console.error('adjust_listing_wishlist_saves RPC unavailable:', error.message);
    });
  }, []);
  return { ids, has: (id) => ids.includes(id), toggle };
}

function useCompare() {
  const [ids] = useIdListStorage(COMPARE_KEY, 'py-compare-changed');
  const toggle = React.useCallback(
    (id) => {
      const current = readIdList(COMPARE_KEY);
      if (current.includes(id)) {
        writeIdList(COMPARE_KEY, current.filter((x) => x !== id), 'py-compare-changed');
      } else if (current.length < MAX_COMPARE) {
        writeIdList(COMPARE_KEY, [...current, id], 'py-compare-changed');
      } else {
        alert(`You can only compare up to ${MAX_COMPARE} phones at a time.`);
      }
    },
    []
  );
  const clear = React.useCallback(() => writeIdList(COMPARE_KEY, [], 'py-compare-changed'), []);
  return { ids, has: (id) => ids.includes(id), toggle, clear };
}

const sample = [
  {
    id: 'demo1',
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    storage: '256GB',
    price: 8200,
    condition: 'Excellent',
    shop: 'Demo Mobile Hub',
  },
  {
    id: 'demo2',
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    storage: '256GB',
    price: 9300,
    condition: 'Like New',
    shop: 'Accra Phones',
  },
];

function LoadingCard({ label = 'Loading…', className = 'p-10 text-center text-sm text-muted' }) {
  return (
    <Card className={className}>
      <Loader2 size={18} className="mx-auto mb-2 animate-spin text-teal" />
      {label}
    </Card>
  );
}

function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream">
      <div className="text-center">
        <div className="font-display text-2xl font-bold">
          Phone<span className="text-gold-dark">yard</span>
        </div>
        <Loader2 size={22} className="mx-auto mt-4 animate-spin text-teal" />
      </div>
    </div>
  );
}

function Guard({ role, children }) {
  const { user, profile, loading } = useAuth();
  // Same "owner" (routing) vs "vendor" (DB enum) split as in Auth —
  // compare against what's actually stored on the profile.
  const dbRole = role === 'owner' ? 'vendor' : role;

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <Navigate
        to={role === 'admin' ? '/admin/login' : role === 'owner' ? '/owner/login' : '/'}
        replace
      />
    );
  }

  if (role && profile?.role !== dbRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function MessageCircleIcon() {
  return <MessageCircle className="text-teal" />;
}

function PublicHome() {
  const navigate = useNavigate();
  return (
    <Shell portal="public">
      <div className="rounded-3xl bg-teal p-7 text-white sm:p-10">
        <Badge tone="warning">THE PHONE MALL</Badge>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold sm:text-6xl">
          A mall of phone shops, all in one place.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-teal-50">
          Browse verified sellers, compare phones and contact the shop directly. No middleman.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate('/shops')}>
            Browse shops <ArrowRight className="ml-1 inline" size={16} />
          </Button>
          <Button variant="ghost">Explore shops</Button>
        </div>
      </div>
    </Shell>
  );
}

function Auth({ role }) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [shop, setShop] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    // Routing uses "owner" for the vendor portal, but the DB enum only
    // knows "vendor" — translate here so signup writes a valid role.
    const dbRole = role === 'owner' ? 'vendor' : role;
    // Admin accounts can never self-signup — only login is allowed here.
    // (The DB trigger also refuses to grant 'admin' from client metadata,
    // so this is a UX guard, not the real security boundary.) New admins
    // are created by an existing admin promoting a user from
    // /admin/users, not through this form.
    const effectiveMode = role === 'admin' ? 'login' : mode;
    const r =
      effectiveMode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password, { full_name: name, role: dbRole, shop_name: shop });

    if (r.error) {
      setSubmitting(false);
      setError(r.error.message);
    } else if (mode === 'signup') {
      // If email confirmation is off, Supabase returns an active session
      // immediately, so we can drop straight into the portal. Otherwise
      // there's no session yet — keep the user here until they confirm.
      if (r.data?.session) {
        navigate(role === 'admin' ? '/admin' : '/owner');
      } else {
        setSubmitting(false);
        alert('Account created. Check your email if confirmation is enabled.');
      }
    } else {
      // Successful login — leave submitting=true; the button stays in its
      // loading state through the redirect instead of flashing back to
      // normal right before the page changes.
      navigate(role === 'admin' ? '/admin' : '/owner');
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4">
      <Card className="w-full max-w-md p-6">
        <div className="font-display text-3xl font-bold">
          Phone<span className="text-gold-dark">yard</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {role === 'owner' ? 'Vendor portal' : 'Executive admin portal'}
        </p>
        {role === 'admin' && (
          <p className="mt-1 text-xs text-muted">
            Admin accounts are created by an existing admin — there's no self-signup here.
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <>
              <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Field label="Shop name" value={shop} onChange={(e) => setShop(e.target.value)} required />
            </>
          )}
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} className="mr-2 inline animate-spin" />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </>
            ) : mode === 'login' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        {role === 'owner' && (
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="mt-4 w-full text-sm font-semibold text-teal"
          >
            {mode === 'login' ? 'Create a vendor account' : 'Already have an account? Sign in'}
          </button>
        )}
      </Card>
    </div>
  );
}

function BoxesIcon() {
  return <Boxes size={22} />;
}

function Metric({ icon: Icon, label, value }) {
  return (
    <Card className="p-5">
      <Icon className="text-teal" />
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </Card>
  );
}

const DEFAULT_BRANDS = [
  'Apple',
  'Samsung',
  'Tecno',
  'Infinix',
  'Itel',
  'Xiaomi',
  'OnePlus',
  'Huawei',
  'Nokia',
  'Google',
];

// Model lists keyed by a slugified brand name, so taxonomy rows can use
// kind = `model:${slug}` without needing a brand_id column on taxonomy.
const DEFAULT_MODELS = {
  apple: [
    'iPhone 11', 'iPhone 12', 'iPhone 12 Pro', 'iPhone 13', 'iPhone 13 Pro',
    'iPhone 14', 'iPhone 14 Pro', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone 16', 'iPhone 16 Pro', 'iPhone 16 Pro Max', 'iPhone 16e',
    'iPhone Air', 'iPhone 17', 'iPhone 17 Pro', 'iPhone 17 Pro Max',
  ],
  samsung: [
    'Galaxy A05', 'Galaxy A15', 'Galaxy A25', 'Galaxy A35', 'Galaxy A55',
    'Galaxy A14', 'Galaxy A54', 'Galaxy S21', 'Galaxy S22', 'Galaxy S23', 'Galaxy S23 Ultra',
    'Galaxy S24', 'Galaxy S24 Ultra', 'Galaxy S25', 'Galaxy S25+', 'Galaxy S25 Ultra', 'Galaxy S25 Edge',
    'Galaxy Z Flip5', 'Galaxy Z Flip6', 'Galaxy Z Flip7', 'Galaxy Z Fold5', 'Galaxy Z Fold6', 'Galaxy Z Fold7',
  ],
  tecno: [
    'Spark 10', 'Spark 20', 'Spark 30', 'Camon 19', 'Camon 20', 'Camon 30', 'Camon 40',
    'Pova 5', 'Pova 6', 'Phantom X2', 'Phantom V Fold',
  ],
  infinix: [
    'Hot 30', 'Hot 40', 'Hot 50', 'Note 30', 'Note 40', 'Note 50', 'Zero 30', 'Zero Ultra', 'Smart 8',
  ],
  itel: [
    'A56', 'A60s', 'A70', 'P40', 'P55', 'S23', 'S24',
    // Basic/feature phones bought specifically for WhatsApp on a small budget
    'it5026 (WhatsApp feature phone)', 'it2163 (WhatsApp feature phone)', 'Muze X1s',
  ],
  xiaomi: [
    'Redmi 12', 'Redmi 13', 'Redmi Note 12', 'Redmi Note 13', 'Redmi Note 14',
    'Poco X5', 'Poco X6', 'Poco X7', 'Mi 11', 'Xiaomi 14',
  ],
  oneplus: ['OnePlus 10', 'OnePlus 11', 'OnePlus 12', 'OnePlus 13', 'OnePlus Nord', 'OnePlus Nord CE'],
  huawei: ['P30', 'P40', 'P60', 'Mate 40', 'Mate 60', 'Nova 9', 'Nova 11'],
  nokia: [
    'G21', 'G22', 'G42', 'X30', 'C22', 'C32',
    // KaiOS feature phones — 4G/VoLTE, run WhatsApp without a full Android OS
    'Nokia 105 4G (WhatsApp feature phone)', 'Nokia 110 4G (WhatsApp feature phone)',
    'Nokia 6300 4G (WhatsApp feature phone)', 'Nokia 8000 4G (WhatsApp feature phone)',
    'Nokia 2660 Flip (WhatsApp feature phone)',
  ],
  google: ['Pixel 6', 'Pixel 7', 'Pixel 8', 'Pixel 8 Pro', 'Pixel 9', 'Pixel 9 Pro'],
};

const DEFAULT_STORAGE = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];
const DEFAULT_CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Used', 'For parts'];

function slugify(s) {
  return (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// A dropdown that opens a search box + option list. Unlike a text input
// with a datalist, the field's value only ever changes when an option is
// clicked — there is no way to submit arbitrary typed text.
function SearchSelect({ value, onChange, options, placeholder, disabled, emptyMessage }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const ref = React.useRef(null);

  React.useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5 text-left font-normal outline-none focus:border-gold-dark focus:ring-4 focus:ring-gold/20 disabled:opacity-50"
      >
        <span className={value ? 'text-ink' : 'text-muted'}>{value || placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>
      {open && !disabled && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-line bg-white p-1.5 shadow-lg">
          <div className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5">
            <Search size={14} className="text-muted" />
            <input
              autoFocus
              className="w-full text-sm outline-none"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mt-1.5 max-h-48 overflow-auto">
            {filtered.length ? (
              filtered.map((o) => (
                <button
                  type="button"
                  key={o}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-cream ${
                    o === value ? 'bg-cream font-semibold' : ''
                  }`}
                >
                  {o}
                </button>
              ))
            ) : (
              <p className="px-2.5 py-2 text-sm text-muted">{emptyMessage || 'No matches'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OwnerDashboard() {
  const { profile, user } = useAuth();
  const [count, setCount] = React.useState(1);
  const [items, setItems] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [files, setFiles] = React.useState({});
  const [brands, setBrands] = React.useState(DEFAULT_BRANDS);
  const [storageOptions, setStorageOptions] = React.useState(DEFAULT_STORAGE);
  const [conditionOptions, setConditionOptions] = React.useState(DEFAULT_CONDITIONS);
  const [modelsByBrand, setModelsByBrand] = React.useState({});

  React.useEffect(() => {
    supabase
      .from('taxonomy')
      .select('name')
      .eq('kind', 'brand')
      .eq('active', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        if (data?.length) setBrands(data.map((r) => r.name));
      });

    supabase
      .from('taxonomy')
      .select('name')
      .eq('kind', 'storage')
      .eq('active', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        if (data?.length) setStorageOptions(data.map((r) => r.name));
      });

    supabase
      .from('taxonomy')
      .select('name')
      .eq('kind', 'condition')
      .eq('active', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        if (data?.length) setConditionOptions(data.map((r) => r.name));
      });
  }, []);

  // Models are namespaced per brand as taxonomy rows with
  // kind = `model:${slug}` (e.g. "model:apple") so no brand_id column is
  // needed on taxonomy. Loaded lazily and cached the first time a brand
  // is picked, falling back to a built-in list for common brands.
  const ensureModelsLoaded = React.useCallback(
    (brand) => {
      const key = slugify(brand);
      if (!key || modelsByBrand[key]) return;
      supabase
        .from('taxonomy')
        .select('name')
        .eq('kind', `model:${key}`)
        .eq('active', true)
        .order('name', { ascending: true })
        .then(({ data, error }) => {
          if (error) console.error(error);
          setModelsByBrand((m) => ({
            ...m,
            [key]: data?.length ? data.map((r) => r.name) : DEFAULT_MODELS[key] || [],
          }));
        });
    },
    [modelsByBrand]
  );

  const [metrics, setMetrics] = React.useState({ active: '—', views: '—', saves: '—' });

  const loadMetrics = React.useCallback(() => {
    supabase
      .from('listings')
      .select('status,views,wishlist_saves')
      .eq('vendor_id', user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        const rows = data || [];
        setMetrics({
          active: rows.filter((r) => r.status === 'approved').length,
          views: rows.reduce((sum, r) => sum + (r.views || 0), 0),
          saves: rows.reduce((sum, r) => sum + (r.wishlist_saves || 0), 0),
        });
      });
  }, [user.id]);

  React.useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  function setItem(i, k, v) {
    setItems((a) => {
      const n = [...a];
      n[i] = { ...(n[i] || {}), [k]: v };
      return n;
    });
  }

  async function publish() {
    setBusy(true);
    try {
      for (let i = 0; i < count; i++) {
        const x = items[i];
        if (!x?.brand || !x?.model || !x?.price) continue;

        const urls = [];
        for (const f of files[i] || []) {
          urls.push(await uploadImage(f, 'listings', user.id));
        }

        const { error } = await supabase.from('listings').insert({
          vendor_id: user.id,
          brand: x.brand,
          model: x.model,
          storage: x.storage,
          price: Number(x.price),
          condition: x.condition || 'Used',
          images: urls,
          specs: x.notes?.trim() ? { notes: x.notes.trim() } : {},
          status: 'approved',
        });
        if (error) throw error;
      }
      alert('Listings published.');
      loadMetrics();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell portal="owner">
      <SectionTitle
        eyebrow="Vendor workspace"
        title={`Welcome, ${profile?.full_name || 'seller'}`}
        description="Manage your inventory, monitor demand and keep your stall profile current."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={BoxesIcon} label="Active listings" value={metrics.active} />
        <Metric icon={Eye} label="Listing views" value={metrics.views} />
        <Metric icon={Heart} label="Wishlist saves" value={metrics.saves} />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Batch listing creator</h2>
            <p className="text-sm text-muted">
              Choose a count, fill each item and upload multiple photos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold">Count</label>
            <select
              value={count}
              onChange={(e) => {
                const n = Math.max(1, Math.min(20, Number(e.target.value)));
                setCount(n);
                setItems([]);
              }}
              className="rounded-xl border border-line px-3 py-2"
            >
              {Array.from({ length: 20 }, (_, i) => (
                <option key={i}>{i + 1}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {Array.from({ length: count }, (_, i) => {
            const brandSlug = slugify(items[i]?.brand);
            const modelOptions = brandSlug ? modelsByBrand[brandSlug] || [] : [];
            return (
              <div key={i} className="rounded-2xl border border-line p-4">
                <div className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-gold-dark">
                  Listing {i + 1}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block text-sm font-semibold">
                    Brand
                    <SearchSelect
                      value={items[i]?.brand || ''}
                      onChange={(v) => {
                        setItem(i, 'brand', v);
                        setItem(i, 'model', '');
                        ensureModelsLoaded(v);
                      }}
                      options={brands}
                      placeholder="Select a brand"
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Model
                    <SearchSelect
                      value={items[i]?.model || ''}
                      onChange={(v) => setItem(i, 'model', v)}
                      options={modelOptions}
                      placeholder={items[i]?.brand ? 'Select a model' : 'Pick a brand first'}
                      disabled={!items[i]?.brand}
                      emptyMessage={
                        items[i]?.brand && modelOptions.length === 0
                          ? `No models set up for ${items[i].brand} yet`
                          : 'No matches'
                      }
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    Storage
                    <select
                      className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-gold-dark focus:ring-4 focus:ring-gold/20"
                      value={items[i]?.storage || ''}
                      onChange={(e) => setItem(i, 'storage', e.target.value)}
                    >
                      <option value="">Select storage</option>
                      {storageOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Price (GHS)"
                    type="number"
                    value={items[i]?.price || ''}
                    onChange={(e) => setItem(i, 'price', e.target.value)}
                  />
                  <label className="block text-sm font-semibold">
                    Condition
                    <select
                      className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-gold-dark focus:ring-4 focus:ring-gold/20"
                      value={items[i]?.condition || ''}
                      onChange={(e) => setItem(i, 'condition', e.target.value)}
                    >
                      <option value="">Select condition</option>
                      {conditionOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold">
                    Photos
                    <input
                      className="mt-1.5 block w-full rounded-xl border border-line bg-white p-2 text-sm"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setFiles((f) => ({ ...f, [i]: Array.from(e.target.files || []) }))}
                    />
                  </label>
                </div>
                <label className="mt-3 block text-sm font-semibold">
                  Additional details (optional)
                  <textarea
                    className="mt-1.5 min-h-16 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-gold-dark focus:ring-4 focus:ring-gold/20"
                    placeholder="e.g. cracked screen, battery changed, missing box, minor scratches on the back"
                    value={items[i]?.notes || ''}
                    onChange={(e) => setItem(i, 'notes', e.target.value)}
                  />
                </label>
              </div>
            );
          })}
        </div>

        <Button className="mt-5" disabled={busy} onClick={publish}>
          {busy ? (
            <Loader2 size={17} className="mr-2 inline animate-spin" />
          ) : (
            <Upload size={17} className="mr-2 inline" />
          )}
          {busy ? 'Uploading…' : 'Publish All Listings'}
        </Button>
      </Card>
    </Shell>
  );
}

function OwnerSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [shop, setShop] = React.useState({
    name: '',
    stall_number: '',
    location: '',
    phone: '',
    whatsapp: '',
    bio: '',
    logo_url: '',
  });
  const [logo, setLogo] = React.useState(null);
  const [avatar, setAvatar] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    supabase
      .from('shops')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => data && setShop(data));
  }, [user.id]);

  async function save() {
    setSaving(true);
    try {
      // avatar_url lives on profiles, not shops — keep the two writes separate
      // so we never send a column shops doesn't have.
      let next = { ...shop, owner_id: user.id };
      delete next.avatar_url;
      if (logo) next.logo_url = await uploadImage(logo, 'shops', user.id);

      const { error } = await supabase.from('shops').upsert(next, { onConflict: 'owner_id' });
      if (error) throw error;

      if (avatar) {
        const avatarUrl = await uploadImage(avatar, 'avatars', user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);
        if (profileError) throw profileError;
        refreshProfile();
      }

      alert('Shop settings saved.');
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell portal="owner">
      <SectionTitle
        eyebrow="Stall profile"
        title="Store settings"
        description="Keep your shop identity, location and operating details current for buyers."
      />
      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name" value={shop.name || ''} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
          <Field
            label="Stall number"
            value={shop.stall_number || ''}
            onChange={(e) => setShop({ ...shop, stall_number: e.target.value })}
          />
          <Field
            label="Location"
            value={shop.location || ''}
            onChange={(e) => setShop({ ...shop, location: e.target.value })}
          />
          <Field
            label="Phone"
            value={shop.phone || ''}
            onChange={(e) => setShop({ ...shop, phone: e.target.value })}
          />
          <Field
            label="WhatsApp"
            value={shop.whatsapp || ''}
            onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })}
          />
          <Field
            label="Opening time"
            type="time"
            value={shop.open_time || '09:00'}
            onChange={(e) => setShop({ ...shop, open_time: e.target.value })}
          />
          <Field
            label="Closing time"
            type="time"
            value={shop.close_time || '18:00'}
            onChange={(e) => setShop({ ...shop, close_time: e.target.value })}
          />
        </div>

        <label className="mt-4 block text-sm font-semibold">
          Bio
          <textarea
            className="mt-1.5 min-h-28 w-full rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:ring-4 focus:ring-gold/20"
            value={shop.bio || ''}
            onChange={(e) => setShop({ ...shop, bio: e.target.value })}
          />
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="rounded-2xl border border-dashed border-line p-4 text-sm font-semibold">
            Shop logo
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept="image/*"
              onChange={(e) => setLogo(e.target.files?.[0] || null)}
            />
          </label>
          <label className="rounded-2xl border border-dashed border-line p-4 text-sm font-semibold">
            Profile picture
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept="image/*"
              onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <Button className="mt-5" onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={16} className="mr-2 inline animate-spin" />
              Saving…
            </>
          ) : (
            'Save settings'
          )}
        </Button>
      </Card>
    </Shell>
  );
}

function OwnerSimple({ title, desc }) {
  return (
    <Shell portal="owner">
      <SectionTitle eyebrow="Vendor portal" title={title} description={desc} />
      <Card className="p-6">
        <p className="text-sm text-muted">
          This module is connected to the same Supabase/RLS foundation and is ready for live data.
        </p>
      </Card>
    </Shell>
  );
}

function OwnerPromotions() {
  const { user } = useAuth();
  const [myListings, setMyListings] = React.useState([]);
  const [requests, setRequests] = React.useState(null);
  const [listingId, setListingId] = React.useState('');
  const [kind, setKind] = React.useState('featured');
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const loadRequests = React.useCallback(() => {
    supabase
      .from('promotion_requests')
      .select('id,kind,status,notes,created_at')
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setRequests([]);
          return;
        }
        setRequests(data || []);
      });
  }, [user.id]);

  React.useEffect(() => {
    supabase
      .from('listings')
      .select('id,brand,model')
      .eq('vendor_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyListings(data || []));
    loadRequests();
  }, [loadRequests]);

  async function submit(e) {
    e.preventDefault();
    if (!listingId) return;
    setBusy(true);
    const { error } = await supabase.from('promotion_requests').insert({
      vendor_id: user.id,
      listing_id: listingId,
      kind,
      notes: notes.trim() || null,
      status: 'pending',
    });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setNotes('');
    loadRequests();
  }

  return (
    <Shell portal="owner">
      <SectionTitle
        eyebrow="Vendor portal"
        title="Promotion requests"
        description="Ask to get a listing featured or spotlighted on the homepage — an admin reviews each request."
      />
      <Card className="p-6">
        {myListings.length ? (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-semibold">
              Listing
              <select
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
              >
                <option value="">Select one of your listings</option>
                {myListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.brand} {l.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Promotion type
              <select
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="featured">Featured listing</option>
                <option value="homepage_spotlight">Homepage spotlight</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Notes (optional)
              <textarea
                className="mt-1.5 min-h-20 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-gold-dark focus:ring-4 focus:ring-gold/20"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy || !listingId}>
              {busy && <Loader2 size={16} className="mr-2 inline animate-spin" />}
              {busy ? 'Submitting…' : 'Submit request'}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            You need at least one active listing before you can request a promotion.
          </p>
        )}
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 font-semibold">Your requests</h2>
        {requests === null ? (
          <LoadingCard label="Loading…" className="p-6 text-sm text-muted" />
        ) : requests.length ? (
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold">
                    {r.kind === 'featured' ? 'Featured listing' : 'Homepage spotlight'}
                  </div>
                  {r.notes && <p className="text-sm text-muted">{r.notes}</p>}
                </div>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-muted">No requests yet.</Card>
        )}
      </div>
    </Shell>
  );
}

function ShopCard({ shop, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream text-muted">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} className="h-14 w-14 object-cover" />
          ) : (
            <Store size={24} />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{shop.name}</h3>
          {shop.stall_number && <p className="text-xs text-muted">Stall {shop.stall_number}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {shop.verified && (
          <Badge tone="success">
            <ShieldCheck size={12} className="mr-1 inline" />
            Verified
          </Badge>
        )}
        {shop.location && <span className="text-xs text-muted">{shop.location}</span>}
      </div>
    </button>
  );
}

// The "Browse shops" destination — a directory of stalls, deliberately not
// phone listings. Only verified=true shops come back for anonymous
// visitors under the shops_public RLS policy.
function ShopsDirectory() {
  const navigate = useNavigate();
  const [shops, setShops] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);
  const [q, setQ] = React.useState('');

  React.useEffect(() => {
    supabase
      .from('shops')
      .select('id,name,logo_url,stall_number,location,verified')
      .eq('verified', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setLoadError(error.message);
          setShops([]);
          return;
        }
        setShops(data || []);
      });
  }, []);

  const filtered = (shops || []).filter((s) =>
    JSON.stringify(s).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Shell portal="public">
      <SectionTitle
        eyebrow="The phone mall"
        title="Browse shops"
        description="Every verified stall in the mall. Pick one to see its inventory and contact details."
      />

      <div className="mb-6 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 sm:max-w-md">
        <Search size={17} className="text-muted" />
        <input
          className="w-full outline-none"
          placeholder="Search shops or locations..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {shops === null ? (
        <LoadingCard label="Loading shops…" />
      ) : loadError ? (
        <Card className="border-danger/30 bg-danger/5 p-6 text-sm text-danger">
          Couldn't load shops: {loadError}
        </Card>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((shop) => (
            <ShopCard key={shop.id} shop={shop} onClick={() => navigate(`/shop/${shop.id}`)} />
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center text-sm text-muted">
          {shops.length ? 'No shops match your search.' : 'No verified shops yet.'}
        </Card>
      )}
    </Shell>
  );
}

function PhoneCard({ x, onClick }) {
  const { has, toggle } = useWishlist();
  const saved = has(x.id);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
      className="cursor-pointer overflow-hidden rounded-2xl border border-line bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        {x.images?.[0] ? (
          <img
            src={x.images[0]}
            alt={`${x.brand} ${x.model}`}
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Store className="text-muted" size={38} />
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggle(x.id);
          }}
          className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow transition ${
            saved ? 'text-danger' : 'text-muted hover:text-danger'
          }`}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="p-4">
        <Badge tone="success">{x.condition}</Badge>
        <h3 className="mt-2 font-semibold">
          {x.brand} {x.model}
        </h3>
        <p className="text-sm text-muted">{x.storage}</p>
        <p className="mt-3 text-lg font-bold">GH₵ {Number(x.price).toLocaleString()}</p>
      </div>
    </div>
  );
}

// A shop's storefront: its profile plus its own live listings, looked up
// by vendor_id = shop.owner_id (that's how listings tie back to a shop).
function ShopStorefront() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = React.useState(null);
  const [shopError, setShopError] = React.useState(null);
  const [listings, setListings] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    supabase
      .from('shops')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setShopError(error.message);
          return;
        }
        setShop(data || false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  React.useEffect(() => {
    if (!shop?.owner_id) return;
    supabase
      .from('listings')
      .select('id,brand,model,storage,price,condition,images')
      .eq('vendor_id', shop.owner_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setListings([]);
          return;
        }
        setListings(data || []);
      });
  }, [shop?.owner_id]);

  if (shop === null && !shopError) {
    return (
      <Shell portal="public">
        <LoadingCard label="Loading shop…" />
      </Shell>
    );
  }

  if (shopError || !shop) {
    return (
      <Shell portal="public">
        <Card className="p-10 text-center text-sm text-muted">
          {shopError ? `Couldn't load this shop: ${shopError}` : "This shop doesn't exist or isn't available yet."}
        </Card>
      </Shell>
    );
  }

  return (
    <Shell portal="public">
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cream text-muted">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-16 w-16 object-cover" />
            ) : (
              <Store size={28} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{shop.name}</h1>
              {shop.verified && (
                <Badge tone="success">
                  <ShieldCheck size={12} className="mr-1 inline" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {shop.stall_number ? `Stall ${shop.stall_number} · ` : ''}
              {shop.location || 'Location not set'}
            </p>
          </div>
        </div>

        {shop.bio && <p className="mt-4 text-sm leading-6 text-muted">{shop.bio}</p>}

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {shop.phone && (
            <a href={`tel:${shop.phone}`} className="rounded-xl border border-line px-3 py-2 font-semibold hover:bg-cream">
              Call {shop.phone}
            </a>
          )}
          {shop.whatsapp && (
            <a
              href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-line px-3 py-2 font-semibold hover:bg-cream"
            >
              WhatsApp
            </a>
          )}
          {(shop.open_time || shop.close_time) && (
            <span className="rounded-xl bg-cream px-3 py-2 font-semibold text-muted">
              {shop.open_time || '—'} – {shop.close_time || '—'}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle
          eyebrow="Inventory"
          title="Available phones"
          description={`Everything ${shop.name} currently has listed.`}
        />
        {listings === null ? (
          <LoadingCard label="Loading listings…" />
        ) : listings.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((x) => (
              <PhoneCard key={x.id} x={x} onClick={() => navigate(`/listing/${x.id}`)} />
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center text-sm text-muted">
            This shop hasn't listed anything yet.
          </Card>
        )}
      </div>
    </Shell>
  );
}

// The "click a phone card" destination — full listing detail with an
// image gallery, the seller's condition notes (specs.notes), and a
// contact card for the shop it belongs to.
function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = React.useState(null);
  const [listingError, setListingError] = React.useState(null);
  const [shop, setShop] = React.useState(null);
  const [activeImage, setActiveImage] = React.useState(0);
  const wishlist = useWishlist();
  const compare = useCompare();

  React.useEffect(() => {
    let active = true;
    supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setListingError(error.message);
          return;
        }
        setListing(data || false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  React.useEffect(() => {
    if (!listing?.vendor_id) return;
    supabase
      .from('shops')
      .select('id,name,logo_url,location,phone,whatsapp,verified')
      .eq('owner_id', listing.vendor_id)
      .maybeSingle()
      .then(({ data }) => setShop(data || null));
  }, [listing?.vendor_id]);

  // Count a view once per browser session per listing. Best-effort —
  // silently no-ops until the increment_listing_views RPC exists.
  React.useEffect(() => {
    if (!listing?.id) return;
    const viewedKey = 'py_viewed_listings';
    let viewed = [];
    try {
      viewed = JSON.parse(sessionStorage.getItem(viewedKey) || '[]');
    } catch {
      viewed = [];
    }
    if (viewed.includes(listing.id)) return;
    supabase.rpc('increment_listing_views', { p_listing_id: listing.id }).then(({ error }) => {
      if (error) {
        console.error('increment_listing_views RPC unavailable:', error.message);
        return;
      }
      sessionStorage.setItem(viewedKey, JSON.stringify([...viewed, listing.id]));
    });
  }, [listing?.id]);

  if (listing === null && !listingError) {
    return (
      <Shell portal="public">
        <LoadingCard label="Loading phone…" />
      </Shell>
    );
  }

  if (listingError || !listing) {
    return (
      <Shell portal="public">
        <Card className="p-10 text-center text-sm text-muted">
          {listingError
            ? `Couldn't load this listing: ${listingError}`
            : "This listing doesn't exist or isn't available anymore."}
        </Card>
      </Shell>
    );
  }

  const images = listing.images?.length ? listing.images : [];
  const notes = listing.specs?.notes;

  return (
    <Shell portal="public">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-cream">
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={`${listing.brand} ${listing.model}`}
                className="absolute inset-0 h-full w-full object-contain p-6"
              />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <Store className="text-muted" size={64} />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-auto">
              {images.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                    i === activeImage ? 'border-teal' : 'border-line'
                  }`}
                >
                  <img src={img} alt="" className="absolute inset-0 h-full w-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Badge tone="success">{listing.condition}</Badge>
          <h1 className="mt-3 font-display text-3xl font-bold">
            {listing.brand} {listing.model}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {listing.storage}
            {listing.network ? ` · ${listing.network}` : ''}
          </p>
          <p className="mt-4 text-3xl font-bold">GH₵ {Number(listing.price).toLocaleString()}</p>
          {listing.negotiable && <p className="mt-1 text-sm text-muted">Price is negotiable</p>}
          <p className="mt-1 text-sm text-muted">
            {listing.stock_qty > 0 ? `${listing.stock_qty} in stock` : 'Out of stock'}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant={wishlist.has(listing.id) ? 'danger' : 'ghost'} onClick={() => wishlist.toggle(listing.id)}>
              <Heart size={15} className="mr-1 inline" fill={wishlist.has(listing.id) ? 'currentColor' : 'none'} />
              {wishlist.has(listing.id) ? 'Saved' : 'Save to wishlist'}
            </Button>
            <Button variant={compare.has(listing.id) ? 'secondary' : 'ghost'} onClick={() => compare.toggle(listing.id)}>
              <Scale size={15} className="mr-1 inline" />
              {compare.has(listing.id) ? 'Added to compare' : 'Add to compare'}
            </Button>
          </div>

          {notes && (
            <Card className="mt-5 p-4">
              <h3 className="text-sm font-semibold">Seller notes</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">{notes}</p>
            </Card>
          )}

          {shop && (
            <Card className="mt-5 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream text-muted">
                  {shop.logo_url ? (
                    <img src={shop.logo_url} alt={shop.name} className="h-12 w-12 object-cover" />
                  ) : (
                    <Store size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{shop.name}</span>
                    {shop.verified && <ShieldCheck size={14} className="text-teal" />}
                  </div>
                  <p className="truncate text-xs text-muted">{shop.location}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Button variant="ghost" onClick={() => navigate(`/shop/${shop.id}`)}>
                  Visit shop
                </Button>
                {shop.phone && (
                  <a
                    href={`tel:${shop.phone}`}
                    className="rounded-xl border border-line px-4 py-2.5 font-semibold hover:bg-cream"
                  >
                    Call {shop.phone}
                  </a>
                )}
                {shop.whatsapp && (
                  <a
                    href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-line px-4 py-2.5 font-semibold hover:bg-cream"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}

// Wishlist / Compare read the on-device id lists and fetch the matching
// live listings — see the useWishlist/useCompare hooks up top.
function WishlistPage() {
  const navigate = useNavigate();
  const { ids } = useWishlist();
  const [listings, setListings] = React.useState(null);

  React.useEffect(() => {
    if (!ids.length) {
      setListings([]);
      return;
    }
    supabase
      .from('listings')
      .select('id,brand,model,storage,price,condition,images')
      .in('id', ids)
      .eq('status', 'approved')
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setListings([]);
          return;
        }
        setListings(data || []);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  return (
    <Shell portal="public">
      <SectionTitle
        eyebrow="Saved for later"
        title="Your wishlist"
        description="Saved on this device by tapping the heart on a phone. Cross-device syncing needs buyer accounts, which don't exist yet."
      />
      {listings === null ? (
        <LoadingCard label="Loading your wishlist…" />
      ) : listings.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((x) => (
            <PhoneCard key={x.id} x={x} onClick={() => navigate(`/listing/${x.id}`)} />
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center text-sm text-muted">
          Nothing saved yet — tap the heart on any phone to add it here.
        </Card>
      )}
    </Shell>
  );
}

const COMPARE_ROWS = [
  { label: 'Price', get: (x) => `GH₵ ${Number(x.price).toLocaleString()}` },
  { label: 'Storage', get: (x) => x.storage || '—' },
  { label: 'Condition', get: (x) => x.condition || '—' },
  { label: 'Network', get: (x) => x.network || '—' },
  { label: 'Negotiable', get: (x) => (x.negotiable ? 'Yes' : 'No') },
  { label: 'Stock', get: (x) => (x.stock_qty > 0 ? `${x.stock_qty} available` : 'Out of stock') },
];

function ComparePage() {
  const { ids, clear } = useCompare();
  const [listings, setListings] = React.useState(null);

  React.useEffect(() => {
    if (!ids.length) {
      setListings([]);
      return;
    }
    supabase
      .from('listings')
      .select('id,brand,model,storage,price,condition,images,negotiable,stock_qty,network')
      .in('id', ids)
      .eq('status', 'approved')
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setListings([]);
          return;
        }
        setListings(data || []);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  return (
    <Shell portal="public">
      <SectionTitle
        eyebrow="Side by side"
        title="Compare phones"
        description={`Add up to ${MAX_COMPARE} phones from their detail page, then compare specs here.`}
      />
      {listings === null ? (
        <LoadingCard label="Loading…" />
      ) : listings.length ? (
        <>
          <div className="mb-4 flex justify-end">
            <Button variant="ghost" onClick={clear}>
              Clear compare list
            </Button>
          </div>
          <div className="overflow-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr>
                  <th className="w-32 border-b border-line p-3"></th>
                  {listings.map((x) => (
                    <th key={x.id} className="border-b border-line p-3 align-top">
                      <div className="relative aspect-square w-28 overflow-hidden rounded-xl bg-cream">
                        {x.images?.[0] && (
                          <img
                            src={x.images[0]}
                            alt=""
                            className="absolute inset-0 h-full w-full object-contain p-2"
                          />
                        )}
                      </div>
                      <div className="mt-2 font-semibold">
                        {x.brand} {x.model}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((r) => (
                  <tr key={r.label} className="border-t border-line">
                    <td className="p-3 font-semibold text-muted">{r.label}</td>
                    {listings.map((x) => (
                      <td key={x.id} className="p-3">
                        {r.get(x)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Card className="p-10 text-center text-sm text-muted">
          Nothing to compare yet — open a phone's page and tap "Add to compare".
        </Card>
      )}
    </Shell>
  );
}

const FAQ_ITEMS = [
  {
    q: 'How do I buy a phone from Phoneyard?',
    a: "Browse shops or listings, open the phone you like, and use the Call or WhatsApp button on that shop's card to reach the seller directly. Phoneyard connects you to the shop — payment, inspection and pickup are arranged directly with the vendor.",
  },
  {
    q: 'Is it safe to buy from a shop listed here?',
    a: 'Shops marked "Verified" have been reviewed by our admin team. Even so, inspect the phone in person before paying, and use the contact details shown on the shop\'s page rather than numbers found elsewhere.',
  },
  {
    q: 'How do I become a vendor and list my shop?',
    a: 'Create a vendor account, then fill in your shop profile under Settings (name, location, contact details, hours). Your shop appears in the public directory once an admin verifies it.',
  },
  {
    q: "Why isn't my shop showing up yet?",
    a: 'New shops start unverified. An admin needs to confirm your details before your shop and its listings appear publicly.',
  },
  {
    q: 'Can I negotiate the price?',
    a: "Some listings are marked negotiable on their detail page — reach out to the seller directly to discuss.",
  },
  {
    q: 'What if a listing looks suspicious or a seller scams me?',
    a: 'Use the contact form on the Feedback page to report it, including the shop name and phone model. Our team can suspend listings and shops that break the rules.',
  },
];

function FaqAccordionItem({ item, isOpen, onToggle }) {
  return (
    <div className="border-b border-line py-4 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left font-semibold"
      >
        {item.q}
        <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <p className="mt-2 text-sm leading-6 text-muted">{item.a}</p>}
    </div>
  );
}

function FaqPage() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = React.useState(0);
  return (
    <Shell portal="public">
      <SectionTitle
        eyebrow="Help center"
        title="Frequently asked questions"
        description="Buying, selling, verification and safety."
      />
      <Card className="p-6">
        {FAQ_ITEMS.map((item, i) => (
          <FaqAccordionItem
            key={item.q}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
          />
        ))}
      </Card>
      <Card className="mt-6 p-6">
        <h3 className="font-semibold">Still need help?</h3>
        <p className="mt-1 text-sm text-muted">Send us a message and our team will get back to you.</p>
        <Button className="mt-4" onClick={() => navigate('/feedback')}>
          Go to contact form
        </Button>
      </Card>
    </Shell>
  );
}

// Submits into support_tickets. Since that table has no name/email
// columns, the contact info is folded into the body text. This will
// error until support_tickets has an RLS policy allowing anonymous
// inserts — see the summary after this file.
function FeedbackPage() {
  const [form, setForm] = React.useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = React.useState('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  async function submit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.message.trim()) return;
    setStatus('sending');
    const { error } = await supabase.from('support_tickets').insert({
      subject: form.subject.trim() || 'General feedback',
      body: `From: ${form.name.trim() || 'Anonymous'} <${form.email.trim()}>\n\n${form.message.trim()}`,
      status: 'open',
      priority: 'normal',
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    setStatus('sent');
    setForm({ name: '', email: '', subject: '', message: '' });
  }

  return (
    <Shell portal="public">
      <SectionTitle
        eyebrow="We're listening"
        title="Feedback & support"
        description="Report a problem, leave feedback, or ask us anything — it goes straight to our support queue."
      />
      <Card className="p-6">
        {status === 'sent' ? (
          <p className="text-sm text-muted">Thanks — we've got your message and will follow up by email.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Name (optional)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Field
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <Field
              label="Subject"
              placeholder="e.g. Report a scam listing, general feedback..."
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <label className="block text-sm font-semibold">
              Message
              <textarea
                required
                className="mt-1.5 min-h-32 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-gold-dark focus:ring-4 focus:ring-gold/20"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </label>
            {status === 'error' && (
              <p className="text-sm text-danger">Couldn't send that: {errorMsg}</p>
            )}
            <Button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        )}
      </Card>
    </Shell>
  );
}

function PublicPage({ title, desc }) {
  return (
    <Shell portal="public">
      <SectionTitle eyebrow="Phoneyard" title={title} description={desc} />
      <Card className="p-6">
        <p className="text-sm text-muted">
          This buyer module is part of the marketplace foundation. Connect it to live listings,
          shops, reviews and saved items through Supabase.
        </p>
      </Card>
    </Shell>
  );
}

// Maps each admin tab to the Supabase table/columns it actually reads.
// Tabs not listed here (finance, maintenance) have no backing table in
// schema.sql yet — those render an explanation instead of a fake empty table.
const TABLE_CONFIG = {
  '/admin/users': {
    table: 'profiles',
    columns: '*',
    orderBy: 'created_at',
    view: 'cards',
  },
  '/admin/shops': {
    table: 'shops',
    columns: '*',
    orderBy: 'created_at',
    view: 'cards',
  },
  '/admin/moderation': {
    table: 'listings',
    columns: '*',
    orderBy: 'created_at',
    filter: (q) => q.eq('status', 'approved'),
    view: 'cards',
  },
  '/admin/audit': {
    table: 'audit_logs',
    columns: 'id,action,target_type,target_id,created_at',
    orderBy: 'created_at',
  },
  '/admin/promotions': {
    table: 'promotion_requests',
    columns: '*',
    orderBy: 'created_at',
    view: 'cards',
  },
  '/admin/tickets': {
    table: 'support_tickets',
    columns: 'id,subject,status,priority,created_at',
    orderBy: 'created_at',
  },
};

// Shared by the /admin overview and the /admin/analytics tab. Only
// counts we can actually derive from existing tables — there's no
// events/analytics table in the schema, so DAU/traffic stay honest "—".
function usePlatformCounts() {
  const [counts, setCounts] = React.useState({ listings: '—', shops: '—', users: '—' });

  React.useEffect(() => {
    let active = true;
    (async () => {
      const [{ count: listings }, { count: shops }, { count: users }] = await Promise.all([
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('shops').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);
      if (active) {
        setCounts({
          listings: listings ?? 0,
          shops: shops ?? 0,
          users: users ?? 0,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return counts;
}

function AdminAnalyticsPanel() {
  const counts = usePlatformCounts();
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Metric icon={BoxesIcon} label="Active listings" value={counts.listings} />
      <Metric icon={Store} label="Registered shops" value={counts.shops} />
      <Metric icon={Eye} label="Registered users" value={counts.users} />
      <Metric icon={TrendingUp} label="Traffic trend" value="—" />
    </div>
  );
}

function AdminSettingsPanel() {
  const { user } = useAuth();
  const [banner, bannerLoaded] = useSetting(SETTING_KEYS.banner, { enabled: false, message: '', tone: 'info' });
  const [maintenance, maintenanceLoaded] = useSetting(SETTING_KEYS.maintenance, { enabled: false, message: '' });
  const [bannerDraft, setBannerDraft] = React.useState(null);
  const [maintenanceDraft, setMaintenanceDraft] = React.useState(null);
  const [savingBanner, setSavingBanner] = React.useState(false);
  const [savingMaintenance, setSavingMaintenance] = React.useState(false);

  // Seed the editable draft once the real value arrives, so the form
  // doesn't briefly show defaults before snapping to the saved value.
  React.useEffect(() => {
    if (bannerLoaded) setBannerDraft(banner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerLoaded]);
  React.useEffect(() => {
    if (maintenanceLoaded) setMaintenanceDraft(maintenance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maintenanceLoaded]);

  async function persistBanner() {
    setSavingBanner(true);
    try {
      await saveSetting(SETTING_KEYS.banner, bannerDraft, user.id);
      logAudit(user.id, 'setting_updated', 'platform_settings', SETTING_KEYS.banner, bannerDraft);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingBanner(false);
    }
  }

  async function persistMaintenance() {
    setSavingMaintenance(true);
    try {
      await saveSetting(SETTING_KEYS.maintenance, maintenanceDraft, user.id);
      logAudit(user.id, 'setting_updated', 'platform_settings', SETTING_KEYS.maintenance, maintenanceDraft);
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingMaintenance(false);
    }
  }

  if (!bannerDraft || !maintenanceDraft) {
    return <LoadingCard label="Loading settings…" className="p-6 text-sm text-muted" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Site-wide banner</h2>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={!!bannerDraft.enabled}
              onChange={(e) => setBannerDraft({ ...bannerDraft, enabled: e.target.checked })}
            />
            Enabled
          </label>
        </div>
        <p className="mt-1 text-sm text-muted">
          Shown as a strip under the header on every public buyer page. Vendor and admin portals
          don't show it.
        </p>

        <label className="mt-4 block text-sm font-semibold">
          Message
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:ring-4 focus:ring-gold/20"
            placeholder="e.g. Independence Day sale — sellers get free featured listings this week."
            value={bannerDraft.message || ''}
            onChange={(e) => setBannerDraft({ ...bannerDraft, message: e.target.value })}
          />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Tone
          <select
            className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 font-normal outline-none"
            value={bannerDraft.tone || 'info'}
            onChange={(e) => setBannerDraft({ ...bannerDraft, tone: e.target.value })}
          >
            <option value="info">Info (teal)</option>
            <option value="warning">Warning (amber)</option>
          </select>
        </label>

        {bannerDraft.enabled && bannerDraft.message && (
          <div className="mt-4 rounded-xl border border-line p-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Preview</div>
            <div
              className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold ${
                bannerDraft.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-teal/20 bg-teal/10 text-teal'
              }`}
            >
              {bannerDraft.message}
            </div>
          </div>
        )}

        <Button className="mt-5" disabled={savingBanner} onClick={persistBanner}>
          {savingBanner && <Loader2 size={16} className="mr-2 inline animate-spin" />}
          {savingBanner ? 'Saving…' : 'Save banner'}
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Maintenance mode</h2>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={!!maintenanceDraft.enabled}
              onChange={(e) => setMaintenanceDraft({ ...maintenanceDraft, enabled: e.target.checked })}
            />
            Enabled
          </label>
        </div>
        <p className="mt-1 text-sm text-muted">
          {maintenanceDraft.enabled
            ? 'The public marketplace is currently showing the maintenance screen to buyers.'
            : 'Replaces every buyer-facing page with a "we\'ll be back" screen. Vendor and admin logins stay open so you can switch it back off.'}
        </p>

        <label className="mt-4 block text-sm font-semibold">
          Message shown to buyers
          <textarea
            className="mt-1.5 min-h-20 w-full rounded-xl border border-line px-3 py-2.5 font-normal outline-none focus:ring-4 focus:ring-gold/20"
            placeholder="We're doing some quick maintenance. Please check back soon."
            value={maintenanceDraft.message || ''}
            onChange={(e) => setMaintenanceDraft({ ...maintenanceDraft, message: e.target.value })}
          />
        </label>

        <Button
          className="mt-5"
          variant={maintenanceDraft.enabled ? 'danger' : 'primary'}
          disabled={savingMaintenance}
          onClick={persistMaintenance}
        >
          {savingMaintenance && <Loader2 size={16} className="mr-2 inline animate-spin" />}
          {savingMaintenance ? 'Saving…' : maintenanceDraft.enabled ? 'Save (maintenance ON)' : 'Save'}
        </Button>
      </Card>
    </div>
  );
}

function AdminTaxonomyPanel() {
  const { user } = useAuth();
  const [rows, setRows] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [newKind, setNewKind] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const [busyId, setBusyId] = React.useState(null);
  const [adding, setAdding] = React.useState(false);

  const load = React.useCallback(() => {
    supabase
      .from('taxonomy')
      .select('*')
      .order('kind', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        setRows(data || []);
        setLoaded(true);
      });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const kinds = Array.from(new Set(rows.map((r) => r.kind))).sort();
  const grouped = kinds.map((k) => ({ kind: k, items: rows.filter((r) => r.kind === k) }));

  async function addRow() {
    const kind = newKind.trim();
    const name = newName.trim();
    if (!kind || !name) return;
    setAdding(true);
    const { data, error } = await supabase.from('taxonomy').insert({ kind, name, active: true }).select().maybeSingle();
    setAdding(false);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, 'taxonomy_added', 'taxonomy', data?.id, { kind, name });
    setNewName('');
    load();
  }

  async function toggleActive(row) {
    setBusyId(row.id);
    const { error } = await supabase.from('taxonomy').update({ active: !row.active }).eq('id', row.id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, row.active ? 'taxonomy_deactivated' : 'taxonomy_activated', 'taxonomy', row.id, {
      kind: row.kind,
      name: row.name,
    });
    load();
  }

  async function removeRow(row) {
    if (!window.confirm(`Delete "${row.name}" from ${row.kind}?`)) return;
    setBusyId(row.id);
    const { error } = await supabase.from('taxonomy').delete().eq('id', row.id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, 'taxonomy_deleted', 'taxonomy', row.id, { kind: row.kind, name: row.name });
    load();
  }

  return (
    <div>
      <Card className="p-5">
        <h2 className="font-semibold">Add an option</h2>
        <p className="mt-1 text-sm text-muted">
          Use <code className="rounded bg-cream px-1">brand</code>,{' '}
          <code className="rounded bg-cream px-1">storage</code>, or{' '}
          <code className="rounded bg-cream px-1">condition</code> for the shared vendor dropdowns, or a{' '}
          <code className="rounded bg-cream px-1">model:apple</code>-style kind to add models under a specific
          brand (slug = the brand name, lowercased, spaces as dashes).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block text-sm font-semibold">
            Kind
            <input
              list="taxonomy-kinds"
              className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none focus:border-gold-dark focus:ring-4 focus:ring-gold/20"
              placeholder="brand / storage / condition / model:apple"
              value={newKind}
              onChange={(e) => setNewKind(e.target.value)}
            />
            <datalist id="taxonomy-kinds">
              {kinds.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </label>
          <Field
            label="Name"
            placeholder="e.g. Apple, 256GB, Excellent"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex items-end">
            <Button
              className="w-full sm:w-auto"
              disabled={adding || !newKind.trim() || !newName.trim()}
              onClick={addRow}
            >
              {adding ? (
                <Loader2 size={16} className="mr-1 inline animate-spin" />
              ) : (
                <Plus size={16} className="mr-1 inline" />
              )}
              {adding ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-6 space-y-4">
        {!loaded ? (
          <LoadingCard label="Loading taxonomy…" />
        ) : grouped.length ? (
          grouped.map((g) => (
            <Card key={g.kind} className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-gold-dark">{g.kind}</h3>
                <span className="text-xs text-muted">
                  {g.items.length} option{g.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {g.items.map((row) => (
                  <span
                    key={row.id}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                      row.active ? 'border-line bg-white' : 'border-line bg-cream text-muted line-through'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => toggleActive(row)}
                      title={row.active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {row.name}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => removeRow(row)}
                      className="text-muted hover:text-danger"
                      aria-label={`Delete ${row.name}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-10 text-center text-sm text-muted">
            No taxonomy rows yet — add the first one above.
          </Card>
        )}
      </div>
    </div>
  );
}

const adminTabs = {
  '/admin/users': [
    'User & Role Management',
    'Search users/vendors, control account status, adjust roles and trigger password resets.',
  ],
  '/admin/shops': [
    'Shop Verification',
    'Review new stalls and mark them verified so they appear in the public shop directory.',
  ],
  '/admin/moderation': [
    'Listing & Content Moderation',
    'Review reported listings and remove ones that break the rules. New listings publish immediately — this queue is for acting on buyer reports, not pre-approving inventory.',
  ],
  '/admin/analytics': [
    'System Analytics & Metrics',
    'Track listings, shops, users and traffic trends.',
  ],
  '/admin/settings': [
    'Platform Settings & Announcements',
    'Maintenance mode, global configuration and broadcast banners.',
  ],
  '/admin/audit': [
    'Activity & Audit Logs',
    'Immutable accountability trail for sensitive administrator actions.',
  ],
  '/admin/taxonomy': [
    'Category & Taxonomy Management',
    'Manage brands, categories, tags, storage, networks and conditions.',
  ],
  '/admin/promotions': [
    'Featured Listings & Promotions',
    'Approve vendor promotion requests and manage homepage placements.',
  ],
  '/admin/tickets': [
    'Dispute & Support Ticket Center',
    'Resolve complaints, disputes and scam reports.',
  ],
  '/admin/finance': [
    'Financial & Subscription Overview',
    'Vendor subscriptions, payment status and commission revenue.',
  ],
  '/admin/maintenance': [
    'Data Backup & Maintenance',
    'Database exports, cache clearing and security/rate-limit controls.',
  ],
};

// Every admin mutation (suspend, verify, role/status change, settings
// save, taxonomy edit...) calls this so audit_logs actually fills up.
// Failures are logged but never block the action itself.
async function logAudit(actorId, action, targetType, targetId, metadata = {}) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId != null ? String(targetId) : null,
      metadata,
    });
    if (error) console.error('Audit log failed:', error.message);
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}

function statusTone(v) {
  if (v === 'approved' || v === 'active') return 'success';
  if (v === 'rejected' || v === 'banned' || v === 'removed') return 'danger';
  return 'warning';
}

function formatFieldLabel(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (key.endsWith('_at')) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'price') return `GH₵ ${Number(value).toLocaleString()}`;
  return String(value);
}

// Full-record detail view shown when a card is clicked. Renders every
// column that came back from Supabase so nothing needs a second fetch.
function DetailModal({ title, record, onClose, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-white p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="mt-4 divide-y divide-line text-sm">
          {Object.entries(record).map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 py-2.5">
              <span className="shrink-0 font-semibold text-muted">{formatFieldLabel(k)}</span>
              {k === 'status' || k === 'role' ? (
                <Badge tone={statusTone(v)}>{v}</Badge>
              ) : (
                <span className="break-words text-right text-ink">{formatFieldValue(k, v)}</span>
              )}
            </div>
          ))}
        </div>
        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </div>
  );
}

function UserCard({ row, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-muted">
          {row.avatar_url ? (
            <img src={row.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <User size={20} />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{row.full_name || 'Unnamed'}</div>
          <div className="truncate text-xs text-muted">{row.email}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="teal">{row.role}</Badge>
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      </div>
    </button>
  );
}

function ListingCard({ row, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">
          {row.brand} {row.model}
        </h4>
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted">{row.condition || 'Condition not set'}</p>
      <p className="mt-3 text-lg font-bold">GH₵ {Number(row.price).toLocaleString()}</p>
    </button>
  );
}

function AdminShopCard({ row, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream text-muted">
          {row.logo_url ? (
            <img src={row.logo_url} alt="" className="h-11 w-11 object-cover" />
          ) : (
            <Store size={20} />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{row.name}</div>
          <div className="truncate text-xs text-muted">{row.location || 'No location set'}</div>
        </div>
      </div>
      <div className="mt-3">
        <Badge tone={row.verified ? 'success' : 'warning'}>
          {row.verified ? 'Verified' : 'Pending verification'}
        </Badge>
      </div>
    </button>
  );
}

function PromotionCard({ row, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">
          {row.kind === 'featured' ? 'Featured listing' : 'Homepage spotlight'}
        </h4>
        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
      </div>
      {row.notes && <p className="mt-2 line-clamp-2 text-xs text-muted">{row.notes}</p>}
    </button>
  );
}

function AdminPage({ path }) {
  const { user } = useAuth();
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState([]);
  const [busyId, setBusyId] = React.useState(null);
  const [selected, setSelected] = React.useState(null);

  const load = React.useCallback(() => {
    const cfg = TABLE_CONFIG[path];
    if (!cfg) {
      setRows([]);
      return;
    }
    let query = supabase.from(cfg.table).select(cfg.columns);
    if (cfg.filter) query = cfg.filter(query);
    if (cfg.orderBy) query = query.order(cfg.orderBy, { ascending: false });
    query.then(({ data, error }) => {
      if (error) {
        console.error(error);
        setRows([]);
        return;
      }
      setRows(data || []);
    });
  }, [path]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function suspend(id) {
    setBusyId(id);
    const { error } = await supabase.from('listings').update({ status: 'removed' }).eq('id', id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, 'listing_suspended', 'listing', id);
    load();
  }

  async function toggleVerified(id, verified) {
    setBusyId(id);
    const { error } = await supabase.from('shops').update({ verified }).eq('id', id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, verified ? 'shop_verified' : 'shop_unverified', 'shop', id);
    load();
  }

  async function updateUserRole(id, role) {
    setBusyId(id);
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, 'user_role_changed', 'profile', id, { role });
    load();
  }

  async function toggleUserStatus(id, status) {
    setBusyId(id);
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, status === 'banned' ? 'user_banned' : 'user_reactivated', 'profile', id);
    load();
  }

  async function sendPasswordReset(email, id) {
    setBusyId(id);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, 'password_reset_sent', 'profile', id, { email });
    alert(`Password reset email sent to ${email}.`);
  }

  async function setPromotionStatus(id, status) {
    setBusyId(id);
    const { error } = await supabase.from('promotion_requests').update({ status }).eq('id', id);
    setBusyId(null);
    if (error) {
      alert(error.message);
      return;
    }
    logAudit(user.id, `promotion_${status}`, 'promotion_request', id);
    load();
  }

  const [title, desc] = adminTabs[path];
  const cfg = TABLE_CONFIG[path];
  const showModerationActions = path === '/admin/moderation';
  const showShopActions = path === '/admin/shops';
  const showUserActions = path === '/admin/users';
  const showPromotionActions = path === '/admin/promotions';
  const isCardView = cfg?.view === 'cards';
  const noBackingTable = path === '/admin/finance' || path === '/admin/maintenance';
  const filteredRows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell portal="admin">
      <SectionTitle eyebrow="Executive control" title={title} description={desc} />

      {path === '/admin/analytics' ? (
        <AdminAnalyticsPanel />
      ) : path === '/admin/settings' ? (
        <AdminSettingsPanel />
      ) : path === '/admin/taxonomy' ? (
        <AdminTaxonomyPanel />
      ) : noBackingTable ? (
        <Card className="p-6">
          <p className="text-sm text-muted">
            {path === '/admin/finance'
              ? "There's no subscriptions or payments table in the schema yet, so this panel has nothing to read from Supabase until one's added."
              : 'Backups, cache clearing and rate-limit controls need a privileged server-side job with a service-role key — the browser client intentionally can\'t run these (see server/index.js).'}
          </p>
        </Card>
      ) : isCardView ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
              <Search size={17} />
              <input
                className="w-full outline-none"
                placeholder="Search..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button variant="ghost" onClick={load}>
              <RefreshCw size={16} className="mr-2 inline" />
              Refresh
            </Button>
          </div>

          {filteredRows.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRows.map((r) =>
                path === '/admin/users' ? (
                  <UserCard key={r.id} row={r} onClick={() => setSelected(r)} />
                ) : path === '/admin/shops' ? (
                  <AdminShopCard key={r.id} row={r} onClick={() => setSelected(r)} />
                ) : path === '/admin/promotions' ? (
                  <PromotionCard key={r.id} row={r} onClick={() => setSelected(r)} />
                ) : (
                  <ListingCard key={r.id} row={r} onClick={() => setSelected(r)} />
                )
              )}
            </div>
          ) : (
            <Card className="p-10 text-center text-sm text-muted">No live records yet.</Card>
          )}

          {selected && (
            <DetailModal
              title={
                path === '/admin/users'
                  ? selected.full_name || 'User details'
                  : path === '/admin/shops'
                    ? selected.name || 'Shop details'
                    : path === '/admin/promotions'
                      ? selected.kind === 'featured'
                        ? 'Featured listing request'
                        : 'Homepage spotlight request'
                      : `${selected.brand} ${selected.model}`
              }
              record={selected}
              onClose={() => setSelected(null)}
              footer={
                showModerationActions ? (
                  <Button
                    variant="danger"
                    disabled={busyId === selected.id || selected.status === 'removed'}
                    onClick={async () => {
                      await suspend(selected.id);
                      setSelected((s) => (s ? { ...s, status: 'removed' } : s));
                    }}
                  >
                    {busyId === selected.id ? (
                      <Loader2 size={15} className="mr-1 inline animate-spin" />
                    ) : (
                      <XCircle size={15} className="mr-1 inline" />
                    )}
                    {busyId === selected.id ? 'Suspending…' : 'Suspend listing'}
                  </Button>
                ) : showShopActions ? (
                  <Button
                    variant={selected.verified ? 'ghost' : 'primary'}
                    disabled={busyId === selected.id}
                    onClick={async () => {
                      const nextVerified = !selected.verified;
                      await toggleVerified(selected.id, nextVerified);
                      setSelected((s) => (s ? { ...s, verified: nextVerified } : s));
                    }}
                  >
                    {busyId === selected.id ? (
                      <Loader2 size={15} className="mr-1 inline animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} className="mr-1 inline" />
                    )}
                    {busyId === selected.id
                      ? 'Updating…'
                      : selected.verified
                        ? 'Unverify shop'
                        : 'Verify shop'}
                  </Button>
                ) : showUserActions ? (
                  selected.id === user.id ? (
                    <p className="text-sm text-muted">You can't change your own role or status here.</p>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold">
                        Role {busyId === selected.id && <Loader2 size={12} className="ml-1 inline animate-spin text-teal" />}
                        <select
                          className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 font-normal outline-none disabled:opacity-50"
                          value={selected.role || 'buyer'}
                          disabled={busyId === selected.id}
                          onChange={async (e) => {
                            const role = e.target.value;
                            await updateUserRole(selected.id, role);
                            setSelected((s) => (s ? { ...s, role } : s));
                          }}
                        >
                          <option value="buyer">Buyer</option>
                          <option value="vendor">Vendor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={selected.status === 'banned' ? 'primary' : 'danger'}
                          disabled={busyId === selected.id}
                          onClick={async () => {
                            const nextStatus = selected.status === 'banned' ? 'active' : 'banned';
                            await toggleUserStatus(selected.id, nextStatus);
                            setSelected((s) => (s ? { ...s, status: nextStatus } : s));
                          }}
                        >
                          {busyId === selected.id && <Loader2 size={14} className="mr-1 inline animate-spin" />}
                          {selected.status === 'banned' ? 'Reactivate account' : 'Ban account'}
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId === selected.id || !selected.email}
                          onClick={() => sendPasswordReset(selected.email, selected.id)}
                        >
                          {busyId === selected.id && <Loader2 size={14} className="mr-1 inline animate-spin" />}
                          Send password reset
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  showPromotionActions && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        disabled={busyId === selected.id || selected.status === 'approved'}
                        onClick={async () => {
                          await setPromotionStatus(selected.id, 'approved');
                          setSelected((s) => (s ? { ...s, status: 'approved' } : s));
                        }}
                      >
                        {busyId === selected.id ? (
                          <Loader2 size={15} className="mr-1 inline animate-spin" />
                        ) : (
                          <CheckCircle2 size={15} className="mr-1 inline" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busyId === selected.id || selected.status === 'rejected'}
                        onClick={async () => {
                          await setPromotionStatus(selected.id, 'rejected');
                          setSelected((s) => (s ? { ...s, status: 'rejected' } : s));
                        }}
                      >
                        {busyId === selected.id ? (
                          <Loader2 size={15} className="mr-1 inline animate-spin" />
                        ) : (
                          <XCircle size={15} className="mr-1 inline" />
                        )}
                        Reject
                      </Button>
                    </div>
                  )
                )
              }
            />
          )}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-line px-3 py-2">
              <Search size={17} />
              <input
                className="w-full outline-none"
                placeholder="Search..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button variant="ghost" onClick={load}>
              <RefreshCw size={16} className="mr-2 inline" />
              Refresh
            </Button>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-cream text-muted">
                <tr>
                  {(rows[0] ? Object.keys(rows[0]) : ['ID', 'Name', 'Status', 'Action']).map((k) => (
                    <th key={k} className="px-4 py-3 font-semibold">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    {Object.entries(r).map(([k, v]) => (
                      <td key={k} className="px-4 py-3">
                        {k === 'status' ? <Badge tone={statusTone(v)}>{v}</Badge> : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="px-4 py-10 text-center text-muted" colSpan={rows[0] ? Object.keys(rows[0]).length : 4}>
                      No live records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Shell>
  );
}

function AdminOverview() {
  const counts = usePlatformCounts();
  return (
    <Shell portal="admin">
      <SectionTitle
        eyebrow="Executive dashboard"
        title="Platform overview"
        description="One command center for marketplace health, moderation and operations."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={BoxesIcon} label="Active listings" value={counts.listings} />
        <Metric icon={Store} label="Registered shops" value={counts.shops} />
        <Metric icon={Eye} label="Registered users" value={counts.users} />
        <Metric icon={TrendingUp} label="Traffic" value="—" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold">Operations</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li>Act on reported listings and remove ones that break the rules.</li>
            <li>Review reports and support tickets.</li>
            <li>Audit sensitive administrative actions.</li>
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold">Security</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Admin routes require an authenticated profile with the admin role. Database
            permissions should be enforced again through Supabase RLS.
          </p>
        </Card>
      </div>
    </Shell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/shops" element={<ShopsDirectory />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/shop/:id" element={<ShopStorefront />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/faq" element={<FaqPage />} />

          <Route path="/owner/login" element={<Auth role="owner" />} />
          <Route
            path="/owner"
            element={
              <Guard role="owner">
                <OwnerDashboard />
              </Guard>
            }
          />
          <Route
            path="/owner/listings"
            element={
              <Guard role="owner">
                <OwnerDashboard />
              </Guard>
            }
          />
          <Route
            path="/owner/analytics"
            element={
              <Guard role="owner">
                <OwnerSimple
                  title="Store analytics"
                  desc="Views, saves, inquiries and inventory performance."
                />
              </Guard>
            }
          />
          <Route
            path="/owner/promotions"
            element={
              <Guard role="owner">
                <OwnerPromotions />
              </Guard>
            }
          />
          <Route
            path="/owner/settings"
            element={
              <Guard role="owner">
                <OwnerSettings />
              </Guard>
            }
          />

          <Route path="/admin/login" element={<Auth role="admin" />} />
          <Route
            path="/admin"
            element={
              <Guard role="admin">
                <AdminOverview />
              </Guard>
            }
          />
          {Object.keys(adminTabs).map((p) => (
            <Route
              key={p}
              path={p}
              element={
                <Guard role="admin">
                  <AdminPage path={p} />
                </Guard>
              }
            />
          ))}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
