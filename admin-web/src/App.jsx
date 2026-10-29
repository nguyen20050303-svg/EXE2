import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import UsersTab from './components/UsersTab';
import PaidUsersTab from './components/PaidUsersTab';
import FeedbackTab from './components/FeedbackTab';
import { supabase } from './supabase';
import { Bell, RefreshCw, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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
      if (profErr) console.warn('Lỗi tải profiles:', profErr.message);
      else setUsers(profilesData || []);

      // 2. Fetch Subscriptions
      const { data: subsData, error: subsErr } = await supabase
        .from('subscriptions')
        .select('*')
        .order('updated_at', { ascending: false });
      if (subsErr) console.warn('Lỗi tải subscriptions:', subsErr.message);
      else setSubscriptions(subsData || []);

      // 3. Fetch Payment Requests
      const { data: payData, error: payErr } = await supabase
        .from('payment_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (payErr) console.warn('Lỗi tải payment_requests:', payErr.message);
      else setPaymentRequests(payData || []);

      // 4. Fetch Feedbacks
      const { data: fbData, error: fbErr } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      if (fbErr) console.warn('Lỗi tải feedbacks:', fbErr.message);
      else setFeedbacks(fbData || []);

      // 5. Fetch Files metadata
      const { data: filesData, error: filesErr } = await supabase
        .from('files')
        .select('id, user_id, size_bytes, created_at');
      if (filesErr) console.warn('Lỗi tải files:', filesErr.message);
      else setFiles(filesData || []);
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
        (payload) => {
          showToast('Có phản hồi mới từ người dùng!');
          fetchData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_requests' },
        (payload) => {
          showToast('Có giao dịch thanh toán mới phát sinh!');
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Stats object passed to Sidebar
  const stats = {
    total_users: users.length,
    paid_users: subscriptions.filter((s) => s.status === 'ACTIVE' || s.plan === 'BASIC' || s.plan === 'PRO').length,
    total_feedbacks: feedbacks.length,
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
          <div className="max-w-7xl mx-auto">
            {activeTab === 'users' && (
              <UsersTab
                users={users}
                subscriptions={subscriptions}
                files={files}
                loading={loading}
              />
            )}

            {activeTab === 'paid-users' && (
              <PaidUsersTab
                subscriptions={subscriptions}
                paymentRequests={paymentRequests}
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
