import React, { useState, useMemo } from 'react';
import { Star, MessageSquareQuote, CheckCircle2, AlertTriangle, Lightbulb, ThumbsUp, Filter, Plus, Clock } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { supabase } from '../supabase';

const CATEGORIES = {
  BUG: { label: 'Báo Lỗi', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: AlertTriangle },
  FEATURE: { label: 'Góp Ý Tính Năng', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: Lightbulb },
  EXPERIENCE: { label: 'Trải Nghiệm (UX)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: ThumbsUp },
  GENERAL: { label: 'Ý Kiến Khác', color: 'bg-slate-700/50 text-slate-300 border-slate-600', icon: MessageSquareQuote },
};

const STATUSES = {
  NEW: { label: 'Mới Nhận', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  IN_PROGRESS: { label: 'Đang Xử Lý', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  RESOLVED: { label: 'Đã Hoàn Thành', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
};

export default function FeedbackTab({ feedbacks = [], loading, onRefresh }) {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    user_email: 'tester@hidder.app',
    rating: 5,
    category: 'FEATURE',
    title: '',
    content: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Aggregate Metrics
  const totalCount = feedbacks.length;
  const avgRating = useMemo(() => {
    if (!totalCount) return '5.0';
    const sum = feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0);
    return (sum / totalCount).toFixed(1);
  }, [feedbacks, totalCount]);

  const resolvedCount = useMemo(() => {
    return feedbacks.filter((f) => f.status === 'RESOLVED').length;
  }, [feedbacks]);

  const resolutionRate = useMemo(() => {
    if (!totalCount) return 100;
    return Math.round((resolvedCount / totalCount) * 100);
  }, [resolvedCount, totalCount]);

  // Star Distribution
  const starDist = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbacks.forEach((f) => {
      const r = Math.min(5, Math.max(1, Math.round(Number(f.rating) || 5)));
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [feedbacks]);

  // Filtered List
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      const matchCat = categoryFilter === 'ALL' || f.category === categoryFilter;
      const matchSt = statusFilter === 'ALL' || f.status === statusFilter;
      return matchCat && matchSt;
    });
  }, [feedbacks, categoryFilter, statusFilter]);

  // Update Status
  const handleUpdateStatus = async (feedbackId, nextStatus) => {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', feedbackId);

      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Lỗi cập nhật: ${err.message}`);
    }
  };

  // Submit Test Feedback
  const handleCreateTestFeedback = async (e) => {
    e.preventDefault();
    if (!newFeedback.content.trim()) return alert('Vui lòng nhập nội dung góp ý.');
    setSubmitting(true);
    try {
      const { error } = await supabase.from('feedbacks').insert({
        user_email: newFeedback.user_email,
        rating: Number(newFeedback.rating),
        category: newFeedback.category,
        title: newFeedback.title.trim() || 'Góp ý từ người dùng thử nghiệm',
        content: newFeedback.content.trim(),
        status: 'NEW',
        app_version: '1.0.0',
      });

      if (error) throw error;
      setShowCreateModal(false);
      setNewFeedback({
        user_email: 'tester@hidder.app',
        rating: 5,
        category: 'FEATURE',
        title: '',
        content: '',
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Lỗi gửi: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Phản Hồi & Đánh Giá Người Dùng
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              CSAT {avgRating} ★
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Thu thập đánh giá trải nghiệm thực tế từ testers phục vụ báo cáo MVP môn EXE2
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          Thêm Phản Hồi Thử Nghiệm
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Điểm Đánh Giá CSAT</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 flex items-baseline gap-1">
            {avgRating} <span className="text-xs text-slate-400 font-normal">/ 5.0 ★</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Dựa trên {totalCount} lượt đánh giá</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Số Phản Hồi</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <MessageSquareQuote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Góp ý từ người dùng app</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tỷ Lệ Đã Xử Lý</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{resolutionRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">{resolvedCount} / {totalCount} phản hồi đã đóng</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Chờ Xử Lý (Mới)</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-2">
            {feedbacks.filter((f) => f.status === 'NEW').length}
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-1">Cần phản hồi hoặc ghi nhận</div>
        </div>
      </div>

      {/* Star Distribution Visualizer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Phân Bổ Đánh Giá Sao (Rating Breakdown)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = starDist[star] || 0;
            const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
            return (
              <div key={star} className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    {star} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </span>
                  <span className="text-slate-400">{count} lượt ({pct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-400 ml-1 mr-2" />
          {[
            { id: 'ALL', label: 'Tất cả danh mục' },
            { id: 'BUG', label: 'Báo lỗi' },
            { id: 'FEATURE', label: 'Tính năng' },
            { id: 'EXPERIENCE', label: 'Trải nghiệm' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/80">
          {['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                statusFilter === st ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Tất cả' : STATUSES[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 bg-slate-900/80 rounded-2xl border border-slate-800">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
            <div>Đang tải phản hồi từ Supabase...</div>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 bg-slate-900/80 rounded-2xl border border-slate-800">
            <MessageSquareQuote className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
            Chưa có phản hồi nào phù hợp bộ lọc.
          </div>
        ) : (
          filteredFeedbacks.map((f) => {
            const cat = CATEGORIES[f.category] || CATEGORIES.GENERAL;
            const st = STATUSES[f.status] || STATUSES.NEW;
            const CatIcon = cat.icon;

            return (
              <div
                key={f.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-sm">{f.user_email || 'Tester ẩn danh'}</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cat.color}`}>
                      <CatIcon className="w-3 h-3" />
                      {cat.label}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-slate-400 ml-2">{formatDate(f.created_at)}</span>
                  </div>
                </div>

                {/* Title & Content */}
                <div>
                  {f.title && <h4 className="font-semibold text-white text-sm mb-1">{f.title}</h4>}
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{f.content}</p>
                </div>

                {/* Action Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">
                    App Version: <strong className="text-slate-300">{f.app_version || '1.0.0'}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Đổi trạng thái:</span>
                    {f.status !== 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleUpdateStatus(f.id, 'IN_PROGRESS')}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition font-medium"
                      >
                        Đang Xử Lý
                      </button>
                    )}
                    {f.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleUpdateStatus(f.id, 'RESOLVED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition font-medium"
                      >
                        Đánh Dấu Hoàn Thành
                      </button>
                    )}
                    {f.status !== 'NEW' && (
                      <button
                        onClick={() => handleUpdateStatus(f.id, 'NEW')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        Mở Lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Tạo Phản Hồi Thử Nghiệm */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Thêm Phản Hồi Mới (Demo / Test)</h3>
            <p className="text-xs text-slate-400 mb-4">
              Dữ liệu sẽ được lưu trực tiếp vào bảng <code className="text-indigo-400">public.feedbacks</code> trên Supabase
            </p>

            <form onSubmit={handleCreateTestFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Tester</label>
                <input
                  type="email"
                  value={newFeedback.user_email}
                  onChange={(e) => setNewFeedback({ ...newFeedback, user_email: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Đánh Giá (Sao)</label>
                  <select
                    value={newFeedback.rating}
                    onChange={(e) => setNewFeedback({ ...newFeedback, rating: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                    <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                    <option value="3">⭐⭐⭐ (3 sao)</option>
                    <option value="2">⭐⭐ (2 sao)</option>
                    <option value="1">⭐ (1 sao)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Thể Loại</label>
                  <select
                    value={newFeedback.category}
                    onChange={(e) => setNewFeedback({ ...newFeedback, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="FEATURE">Góp ý tính năng</option>
                    <option value="BUG">Báo lỗi</option>
                    <option value="EXPERIENCE">Trải nghiệm UX</option>
                    <option value="GENERAL">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tiêu Đề</label>
                <input
                  type="text"
                  placeholder="Ví dụ: App ngụy trang máy tính rất mượt..."
                  value={newFeedback.title}
                  onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nội Dung Chi Tiết</label>
                <textarea
                  rows="4"
                  placeholder="Nhập ý kiến đánh giá hoặc mô tả chi tiết..."
                  value={newFeedback.content}
                  onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Gửi Phản Hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

