import React from 'react';
import { Users, CreditCard, MessageSquareQuote, Shield, Activity, RefreshCw } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onRefresh, isRefreshing, stats }) {
  const navItems = [
    {
      id: 'users',
      label: 'Người dùng',
      subtitle: 'Quản lý tài khoản & lưu trữ',
      icon: Users,
      badge: stats?.total_users ?? 0,
    },
    {
      id: 'paid-users',
      label: 'User trả phí',
      subtitle: 'Gói cước & doanh thu VietQR',
      icon: CreditCard,
      badge: stats?.paid_users ?? 0,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'feedback',
      label: 'Phản hồi & Đánh giá',
      subtitle: 'Ý kiến người dùng & CSAT',
      icon: MessageSquareQuote,
      badge: stats?.total_feedbacks ?? 0,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
  ];

  return (
    <aside className="w-72 bg-[#0f172a] border-r border-slate-800 flex flex-col flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-2">
              HIDDER ADMIN
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                EXE2
              </span>
            </h1>
            <p className="text-xs text-slate-400">Stealth Privacy Vault</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="p-4 flex-1 space-y-1.5">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Phân Hệ Quản Trị
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 text-left ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div className="min-w-0 truncate">
                  <div className="text-sm truncate">{item.label}</div>
                  <div className={`text-[11px] truncate ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {item.subtitle}
                  </div>
                </div>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ml-2 ${
                    isActive
                      ? 'bg-white/20 text-white border-white/20'
                      : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Live Sync Status & Refresh */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-slate-300">Live Supabase Sync</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Làm mới dữ liệu tức thì"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        <div className="px-3 py-2 text-xs text-slate-400 bg-slate-900/30 rounded-lg border border-slate-800/60 flex items-center justify-between">
          <span>Project: <strong className="text-slate-300 font-medium">EXE202</strong></span>
          <span>Version: <strong className="text-slate-300 font-medium">1.0.0</strong></span>
        </div>
      </div>
    </aside>
  );
}

