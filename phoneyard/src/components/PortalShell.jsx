import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Store,
  ShieldCheck,
  Search,
  Heart,
  Scale,
  MessageSquare,
  HelpCircle,
  Settings,
  Boxes,
  BarChart3,
  Ticket,
  Tags,
  Wallet,
  Database,
  Users,
  FileCheck,
  Megaphone,
  Activity,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSetting, SETTING_KEYS } from '../lib/settings';

const owner = [
  ['/owner', 'Dashboard', LayoutDashboard],
  ['/owner/listings', 'Listings', Boxes],
  ['/owner/analytics', 'Analytics', BarChart3],
  ['/owner/promotions', 'Promotions', Megaphone],
  ['/owner/settings', 'Settings', Settings],
];

const admin = [
  ['/admin', 'Overview', LayoutDashboard],
  ['/admin/users', 'Users & Roles', Users],
  ['/admin/shops', 'Shops', Store],
  ['/admin/moderation', 'Moderation', FileCheck],
  ['/admin/analytics', 'Analytics', BarChart3],
  ['/admin/settings', 'Platform Settings', Settings],
  ['/admin/audit', 'Audit Logs', Activity],
  ['/admin/taxonomy', 'Taxonomy', Tags],
  ['/admin/promotions', 'Promotions', Megaphone],
  ['/admin/tickets', 'Support', Ticket],
  ['/admin/finance', 'Finance', Wallet],
  ['/admin/maintenance', 'Maintenance', Database],
];

function AnnouncementBanner() {
  const [banner] = useSetting(SETTING_KEYS.banner, { enabled: false });
  if (!banner?.enabled || !banner?.message) return null;
  const tone =
    banner.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-teal/20 bg-teal/10 text-teal';
  return (
    <div className={`border-b px-4 py-2 text-center text-sm font-semibold ${tone}`}>
      {banner.message}
    </div>
  );
}

function MaintenanceScreen({ message }) {
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4 text-center">
      <div>
        <div className="font-display text-3xl font-bold">
          Phone<span className="text-gold-dark">yard</span>
        </div>
        <h1 className="mt-4 text-xl font-semibold">We'll be back shortly</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          {message || "We're doing some quick maintenance. Please check back soon."}
        </p>
      </div>
    </div>
  );
}

function BadgePortal({ portal }) {
  return (
    <span className="rounded-full bg-teal/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-teal">
      {portal}
    </span>
  );
}

export function Shell({ portal = 'public', children }) {
  const { user, profile, signOut } = useAuth();
  const loc = useLocation();
  const nav = portal === 'owner' ? owner : portal === 'admin' ? admin : [];

  // Always call the hook (rules of hooks); only act on it for the public
  // portal. Vendor/admin logins stay open even while this is enabled, so
  // whoever flipped it on can flip it back off.
  const [maintenance, maintenanceLoaded] = useSetting(SETTING_KEYS.maintenance, { enabled: false });

  if (portal === 'public') {
    if (maintenanceLoaded && maintenance?.enabled) {
      return <MaintenanceScreen message={maintenance.message} />;
    }

    return (
      <>
        <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3">
            <Link to="/" className="font-display text-2xl font-bold">
              Phone<span className="text-gold-dark">yard</span>
            </Link>
            <div className="hidden flex-1 md:block">
              <div className="mx-auto flex max-w-xl items-center gap-2 rounded-xl border border-line bg-white px-3 py-2">
                <Search size={17} className="text-muted" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Search phones, shops, brands..."
                />
              </div>
            </div>
            <nav className="ml-auto flex items-center gap-1 text-sm">
              <Link className="rounded-lg px-3 py-2 hover:bg-white" to="/wishlist">
                <Heart size={17} />
              </Link>
              <Link className="rounded-lg px-3 py-2 hover:bg-white" to="/compare">
                <Scale size={17} />
              </Link>
              <Link className="rounded-lg px-3 py-2 hover:bg-white" to="/feedback">
                <MessageSquare size={17} />
              </Link>
              <Link className="rounded-lg px-3 py-2 hover:bg-white" to="/faq">
                <HelpCircle size={17} />
              </Link>
            </nav>
          </div>
          <AnnouncementBanner />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={portal === 'owner' ? '/owner' : '/admin'} className="font-display text-2xl font-bold">
              Phone<span className="text-gold-dark">yard</span>
            </Link>
            <BadgePortal portal={portal} />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{profile?.full_name || user?.email}</span>
            <button onClick={signOut} className="rounded-lg p-2 hover:bg-cream">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[250px_1fr]">
        <aside className="border-b border-line bg-white p-3 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r">
          <nav className="flex gap-1 overflow-auto lg:block">
            {nav.map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                className={`flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  loc.pathname === to ? 'bg-teal text-white' : 'text-muted hover:bg-cream'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}