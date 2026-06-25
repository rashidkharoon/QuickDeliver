import { Layers, Database, Shield, Zap } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  hasAppsScriptUrl: boolean;
}

export default function Header({ currentTab, setCurrentTab, hasAppsScriptUrl }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-md border-b border-stone-900 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Title */}
        <div 
          onClick={() => setCurrentTab('new-order')} 
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
            <Zap className="text-stone-950 fill-stone-950 stroke-[2.5]" size={20} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-stone-950 rounded-full flex items-center justify-center p-[1px]">
              <div className="w-full h-full bg-orange-400 rounded-full animate-ping" />
            </div>
          </div>
          
          <div>
            <span className="font-sans font-bold tracking-tight text-lg text-stone-100 flex items-center gap-1.5">
              QuickDeliver
              <span className="text-xs bg-orange-500/10 text-orange-500 font-semibold px-1.5 py-0.5 rounded border border-orange-500/20">PWA</span>
            </span>
            <p className="font-sans text-xs text-stone-400 tracking-wide font-medium">Campus Courier Services</p>
          </div>
        </div>

        {/* Navigation for Desktop */}
        <nav className="hidden md:flex items-center gap-1 bg-stone-900/50 p-1 rounded-xl border border-stone-900">
          <button
            onClick={() => setCurrentTab('new-order')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentTab === 'new-order' || currentTab === 'success'
                ? 'bg-orange-500 text-stone-950 font-semibold shadow-md shadow-orange-500/10'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            New Order
          </button>
          <button
            onClick={() => setCurrentTab('my-orders')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentTab === 'my-orders'
                ? 'bg-orange-500 text-stone-950 font-semibold shadow-md shadow-orange-500/10'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            My Orders
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentTab === 'admin'
                ? 'bg-orange-500 text-stone-950 font-semibold shadow-md shadow-orange-500/10'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            Admin Panel
          </button>
        </nav>

        {/* Database Sync Status Indicator */}
        <div className="flex items-center gap-2">
          {hasAppsScriptUrl ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs px-2.5 py-1.5 rounded-full font-semibold shadow-inner shadow-emerald-500/5">
              <Database size={13} className="animate-pulse" />
              <span className="hidden sm:inline">Google Sheets Connected</span>
              <span className="sm:hidden">Sheets Sync</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs px-2.5 py-1.5 rounded-full font-semibold shadow-inner shadow-amber-500/5">
              <Shield size={13} />
              <span className="hidden sm:inline">Local Sandbox Mode</span>
              <span className="sm:hidden">Sandbox</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
