import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import UsersTab from './components/UsersTab';
import PaidUsersTab from './components/PaidUsersTab';
import FeedbackTab from './components/FeedbackTab';
import SyncMonitorTab from './components/SyncMonitorTab';
import { supabase } from './supabase';
import { Bell, RefreshCw, AlertTriangle } from 'lucide-react';
import { isPaidSubscription } from './utils/helpers';

export default function App() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [hasRlsWarning, setHasRlsWarning] = useState(false);

  // Core Data States
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [files, setFiles] = useState([]);

  // Fetch all data from Supabase
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      // 1. Fetch Users (profiles)
      const { data: profilesData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profErr) {
        console.warn('Lỗi tải profiles (RLS có thể đang chặn):', profErr.message);
      }

      // 2. Fetch Subscriptions
      const { data: subsData, error: subsErr } = await supabase
        .from('subscriptions')
        .select('*')
        .order('updated_at', { ascending: false });
      if (subsErr) {
        console.warn('Lỗi tải subscriptions:', subsErr.message);
      }

      // 3. Fetch Payment Requests
      const { data: payData, error: payErr } = await supabase
        .from('payment_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (payErr) {
        console.warn('Lỗi tải payment_requests:', payErr.message);
      }

      // 4. Fetch Feedbacks
      const { data: fbData, error: fbErr } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      if (fbErr) {
        console.warn('Lỗi tải feedbacks:', fbErr.message);
      }

      // 5. Fetch Files metadata (with full sync status and paths)
      const { data: filesData, error: filesErr } = await supabase
        .from('files')
        .select('*')
        .order('updated_at', { ascending: false });
      if (filesErr) {
        console.warn('Lỗi tải files:', filesErr.message);
      }

      const rawProfiles = profilesData || [];
      const rawSubs = subsData || [];
      const rawPay = payData || [];
      const rawFiles = filesData || [];

      // Check if RLS is blocking queries
      if (rawProfiles.length === 0 && rawSubs.length === 0 && (profErr || subsErr)) {
        setHasRlsWarning(true);
      } else {
        setHasRlsWarning(false);
      }

      // Synthesize and merge users from profiles, subscriptions, and payments
      const userMap = new Map();
      rawProfiles.forEach((p) => {
        if (p.id) {
          userMap.set(p.id, {
            ...p,
            email: p.email || 'Người dùng ẩn danh',
            storage_used: Number(p.storage_used) || 0,
            storage_limit: Number(p.storage_limit) || 268435456,
          });
        }
      });

      // Merge from subscriptions if not already in profiles
      rawSubs.forEach((s) => {
        if (s.user_id && !userMap.has(s.user_id)) {
          userMap.set(s.user_id, {
            id: s.user_id,
            email: `User_${s.user_id.slice(0, 8)}`,
            created_at: s.created_at || new Date().toISOString(),
            storage_used: 0,
            storage_limit: 268435456,
          });
        }
      });

      // Merge from payment_requests if not already in profiles
      rawPay.forEach((p) => {
        if (p.user_id && !userMap.has(p.user_id)) {
          userMap.set(p.user_id, {
            id: p.user_id,
            email: `User_${p.user_id.slice(0, 8)}`,
            created_at: p.created_at || new Date().toISOString(),
            storage_used: 0,
            storage_limit: 268435456,
          });
        }
      });

      // Merge from files if user is not in profiles yet
      rawFiles.forEach((f) => {
        if (f.user_id && !userMap.has(f.user_id)) {
          userMap.set(f.user_id, {
            id: f.user_id,
            email: `User_${f.user_id.slice(0, 8)}`,
            created_at: f.created_at || new Date().toISOString(),
            storage_used: 0,
            storage_limit: 268435456,
          });
        }
      });

      setUsers(Array.from(userMap.values()));
      setSubscriptions(rawSubs);
      setPaymentRequests(rawPay);
      setFeedbacks(fbData || []);
      setFiles(rawFiles);
    } catch (err) {
      console.error('Lỗi kết nối Supabase:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        () => {
          showToast('Có phản hồi mới từ người dùng!');
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_requests' },
        () => {
          showToast('Có giao dịch thanh toán mới phát sinh!');
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files' },
        () => {
          showToast('Tiến trình đồng bộ file vừa được cập nhật!');
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Accurate Paid Users calculation
  const paidUserIds = useMemo(() => {
    const ids = new Set();
    // 1. Check subscriptions with paid tiers
    subscriptions.forEach((sub) => {
      if (isPaidSubscription(sub)) {
        ids.add(sub.user_id);
      }
    });
    // 2. Check approved/paid payment requests
    paymentRequests.forEach((req) => {
      const s = String(req.status || '').toUpperCase();
      if (s === 'PAID' || s === 'APPROVED' || s === 'SUCCESS') {
        ids.add(req.user_id);
      }
    });
    return ids;
  }, [subscriptions, paymentRequests]);

  // Sync issues count
  const syncIssuesCount = useMemo(() => {
    return files.filter((f) => String(f.sync_status).toUpperCase() === 'ERROR').length;
  }, [files]);

  // Stats object passed to Sidebar
  const stats = {
    total_users: users.length,
    paid_users: paidUserIds.size,
    total_feedbacks: feedbacks.length,
    total_files: files.length,
    sync_issues: syncIssuesCount,
  };

  return (
    <div className="flex h-screen bg-[#0b0f19] text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl shadow-indigo-600/40 border border-indigo-400/30 animate-bounce">
          <Bell className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={() => fetchData(false)}
        isRefreshing={isRefreshing}
        stats={stats}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-[#0f172a]/60 backdrop-blur-md px-8 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Trang Quản Trị Hệ Thống
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {activeTab === 'users' && 'Quản lý Người Dùng'}
              {activeTab === 'paid-users' && 'Người Dùng Trả Phí & Doanh Thu'}
              {activeTab === 'sync-monitor' && 'Giám Sát Tiến Trình Đồng Bộ Cloud'}
              {activeTab === 'feedback' && 'Phản Hồi & Đánh Giá CSAT'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchData(false)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              Làm mới
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow">
                A
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight">Admin Founder</div>
                <div className="text-[10px] text-slate-400">EXE202 Project</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* RLS Notice Banner */}
            {hasRlsWarning && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Lưu ý phân quyền Supabase (RLS):</div>
                  <div>
                    Chưa đọc được dữ liệu Profiles hoặc Subscriptions do chính sách bảo mật RLS Supabase.
                    Vui lòng chạy file script <code>setup_admin_database.sql</code> trong <b>Supabase SQL Editor</b> để cấp quyền SELECT cho Admin Web.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <UsersTab
                users={users}
                subscriptions={subscriptions}
                files={files}
                paidUserIds={paidUserIds}
                loading={loading}
              />
            )}

            {activeTab === 'paid-users' && (
              <PaidUsersTab
                subscriptions={subscriptions}
                paymentRequests={paymentRequests}
                users={users}
                paidUserIds={paidUserIds}
                loading={loading}
                onRefresh={() => fetchData(true)}
              />
            )}

            {activeTab === 'sync-monitor' && (
              <SyncMonitorTab
                files={files}
                users={users}
                loading={loading}
                onRefresh={() => fetchData(true)}
              />
            )}

            {activeTab === 'feedback' && (
              <FeedbackTab
                feedbacks={feedbacks}
                loading={loading}
                onRefresh={() => fetchData(true)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
