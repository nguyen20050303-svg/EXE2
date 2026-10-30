import React, { useState, useMemo } from 'react';
import { DollarSign, CreditCard, TrendingUp, Clock, CheckCircle2, XCircle, Search, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatDate, isPaidSubscription, formatPlanName } from '../utils/helpers';
import { supabase } from '../supabase';

export default function PaidUsersTab({
  subscriptions = [],
  paymentRequests = [],
  users = [],
  paidUserIds = new Set(),
  loading,
  onRefresh,
}) {
  const [subTab, setSubTab] = useState('SUBSCRIPTIONS'); // SUBSCRIPTIONS | PAYMENTS
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingId, setProcessingId] = useState(null);

  // Map user id to email
  const userEmailMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      map.set(u.id, u.email || 'Ẩn danh');
    });
    return map;
  }, [users]);

  // Aggregate Revenue & Stats
  const totalRevenue = useMemo(() => {
    return paymentRequests
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [paymentRequests]);

  const activePaidSubs = useMemo(() => {
    return subscriptions.filter(isPaidSubscription);
  }, [subscriptions]);

  const pendingPayments = useMemo(() => {
    return paymentRequests.filter((p) => p.status === 'PENDING');
  }, [paymentRequests]);

  const conversionRate = useMemo(() => {
    if (!users.length) return 0;
    return Math.round((paidUserIds.size / users.length) * 100);
  }, [users, paidUserIds]);

  // Handle Manual Approval for testing/demo
  const handleApprovePayment = async (request) => {
    if (!confirm(`Xác nhận duyệt thanh toán ${formatCurrency(request.amount)} cho khách hàng?`)) return;
    setProcessingId(request.id);
    try {
      // 1. Update payment_request to PAID
      const { error: pErr } = await supabase
        .from('payment_requests')
        .update({
          status: 'PAID',
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (pErr) throw pErr;

      // 2. Update subscription to ACTIVE
      const currentEnd = new Date();
      currentEnd.setDate(currentEnd.getDate() + 30); // Extend 30 days

      await supabase.from('subscriptions').upsert({
        user_id: request.user_id,
        plan: request.plan_id ? request.plan_id.toUpperCase() : 'BASIC_500MB',
        status: 'ACTIVE',
        provider: 'VIETQR',
        current_period_start: new Date().toISOString(),
        current_period_end: currentEnd.toISOString(),
        updated_at: new Date().toISOString(),
      });

      alert('Đã duyệt đơn và kích hoạt gói cước thành công!');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Lỗi duyệt đơn: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered payment requests
  const filteredPayments = useMemo(() => {
    return paymentRequests.filter((p) => {
      const email = (userEmailMap.get(p.user_id) || '').toLowerCase();
      const memo = (p.transfer_memo || '').toLowerCase();
      const plan = (p.plan_id || '').toLowerCase();
      const matchSearch = email.includes(searchTerm.toLowerCase()) || memo.includes(searchTerm.toLowerCase()) || plan.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [paymentRequests, userEmailMap, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Người Dùng Trả Phí & Doanh Thu
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {formatCurrency(totalRevenue)}
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Theo dõi các gói cước, giao dịch quét mã VietQR và chỉ số chuyển đổi MVP
        </p>
      </div>

      {/* KPI Business Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Doanh Thu</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{formatCurrency(totalRevenue)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Đơn thanh toán hoàn tất (PAID)</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Thuê Bao Đang Active</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">{activePaidSubs.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Khách hàng đang trả phí</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tỷ Lệ Chuyển Đổi</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-2">{conversionRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Free-to-Paid Conversion</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Đơn Chờ Duyệt (Pending)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{pendingPayments.length}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">Chờ xác nhận VietQR</div>
        </div>
      </div>

      {/* Sub-tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab('SUBSCRIPTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            subTab === 'SUBSCRIPTIONS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          💎 Danh Sách Thuê Bao ({activePaidSubs.length})
        </button>
        <button
          onClick={() => setSubTab('PAYMENTS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            subTab === 'PAYMENTS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          🧾 Lịch Sử Đơn Thanh Toán ({paymentRequests.length})
          {pendingPayments.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* View 1: Active Subscriptions */}
      {subTab === 'SUBSCRIPTIONS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Khách Hàng (Email)</th>
                  <th className="py-3.5 px-4">Gói Đăng Ký</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4">Cổng Thanh Toán</th>
                  <th className="py-3.5 px-4">Ngày Kích Hoạt</th>
                  <th className="py-3.5 px-4">Hạn Sử Dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activePaidSubs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      Chưa có thuê bao trả phí nào. Dữ liệu sẽ xuất hiện khi user thanh toán gói cước.
                    </td>
                  </tr>
                ) : (
                  activePaidSubs.map((sub) => {
                    const email = userEmailMap.get(sub.user_id) || 'Khách hàng ẩn danh';
                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-white">{email}</div>
                          <div className="font-mono text-[11px] text-slate-400">{sub.user_id}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ★ {formatPlanName(sub.plan)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                            ● {sub.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                          {sub.provider || 'VIETQR'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          {formatDate(sub.current_period_start || sub.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium text-amber-300">
                          {formatDate(sub.current_period_end)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Payment Requests & Manual Approval */}
      {subTab === 'PAYMENTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo email, mã nội dung chuyển khoản..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/80">
              {['ALL', 'PENDING', 'PAID', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                    statusFilter === st ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Khách Hàng</th>
                    <th className="py-3.5 px-4">Gói Đăng Ký</th>
                    <th className="py-3.5 px-4">Số Tiền (VND)</th>
                    <th className="py-3.5 px-4">Nội Dung CK (Memo)</th>
                    <th className="py-3.5 px-4">Trạng Thái</th>
                    <th className="py-3.5 px-4">Thời Gian</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        Không có đơn thanh toán nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const email = userEmailMap.get(p.user_id) || 'Khách hàng';
                      const isPending = p.status === 'PENDING';
                      const isPaid = p.status === 'PAID';

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-white">{email}</div>
                            <div className="font-mono text-[10px] text-slate-400">{p.id.substring(0, 8)}...</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-semibold text-indigo-400">
                              {formatPlanName(p.plan_id)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-amber-300">
                            {p.transfer_memo}
                          </td>
                          <td className="py-3.5 px-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> PENDING
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                <XCircle className="w-3.5 h-3.5" /> REJECTED
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {formatDate(p.created_at)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isPending && (
                              <button
                                onClick={() => handleApprovePayment(p)}
                                disabled={processingId === p.id}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow shadow-emerald-600/30 disabled:opacity-50"
                              >
                                {processingId === p.id ? 'Đang duyệt...' : 'Duyệt Đơn'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
