import React, { useState, useMemo, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Video,
  Mic,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Trash2,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { formatBytes, formatDate } from '../utils/helpers';
import { supabase } from '../supabase';

export default function SyncMonitorTab({
  files = [],
  users = [],
  loading = false,
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | CLOUD | UPLOADING | ERROR | LOCAL
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL | PHOTO | VIDEO | DOCUMENT | VOICE
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanFeedback, setCleanFeedback] = useState(null);
  const [locallyDeletedIds, setLocallyDeletedIds] = useState(new Set());

  // Map user id to email
  const userEmailMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      map.set(u.id, u.email || 'Ẩn danh');
    });
    return map;
  }, [users]);

  // Detect stale files that have been stuck in UPLOADING for > 5 minutes
  const staleUploadingFiles = useMemo(() => {
    const now = Date.now();
    return files
      .filter((f) => !locallyDeletedIds.has(f.id))
      .filter((f) => {
      const st = String(f.sync_status || '').toUpperCase();
      if (st !== 'UPLOADING') return false;
      const fileTime = new Date(f.updated_at || f.created_at || 0).getTime();
      return now - fileTime > 5 * 60 * 1000; // > 5 phút
    });
  }, [files, locallyDeletedIds]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let cloudCount = 0;
    let uploadingCount = 0;
    let errorCount = 0;
    let localCount = 0;
    let totalBytes = 0;

    files.forEach((f) => {
      const st = String(f.sync_status || '').toUpperCase();
      const sz = Number(f.size_bytes) || 0;
      totalBytes += sz;

      if (st === 'CLOUD') cloudCount++;
      else if (st === 'UPLOADING') uploadingCount++;
      else if (st === 'ERROR') errorCount++;
      else if (st === 'LOCAL') localCount++;
    });

    const successRate = files.length > 0 ? Math.round((cloudCount / files.length) * 100) : 100;

    return {
      total: files.length,
      cloudCount,
      uploadingCount,
      errorCount,
      localCount,
      totalBytes,
      successRate,
    };
  }, [files]);

  // Clean stale stuck uploading files: convert them to ERROR or DELETE orphaned records
  const handleCleanStaleFiles = async (actionType = 'DELETE') => {
    if (staleUploadingFiles.length === 0) {
      alert('Không có file nào bị kẹt UPLOADING quá 5 phút.');
      return;
    }

    const confirmMsg =
      actionType === 'DELETE'
        ? `Bạn có chắc muốn XÓA VĨNH VIỄN ${staleUploadingFiles.length} bản ghi bị treo dở dang này khỏi danh sách?`
        : `Xác nhận chuyển ${staleUploadingFiles.length} tệp bị treo sang trạng thái ERROR để giải phóng hàng đợi?`;

    if (!confirm(confirmMsg)) return;

    setIsCleaning(true);
    try {
      const staleIds = staleUploadingFiles.map((f) => f.id);

      // Method 1: Try RPC clean_stale_uploading_files first (bypasses RLS)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('clean_stale_uploading_files', {
        p_action: actionType,
      });

      if (!rpcErr && rpcData?.success) {
        if (actionType === 'DELETE') {
          setLocallyDeletedIds((prev) => new Set([...prev, ...staleIds]));
        }
        setCleanFeedback(
          actionType === 'DELETE'
            ? `Đã dọn dẹp và xóa ${rpcData.count ?? staleIds.length} tệp treo thành công qua RPC!`
            : `Đã cập nhật ${rpcData.count ?? staleIds.length} tệp sang trạng thái ERROR qua RPC.`
        );
      } else {
        // Method 2: Direct table operation fallback with .select() verification
        if (actionType === 'DELETE') {
          const { data: deleted, error } = await supabase.from('files').delete().in('id', staleIds).select('id');
          if (error) throw error;
          if (!deleted || deleted.length === 0) {
            throw new Error('Supabase RLS chưa cho phép Admin xóa bảng files. Vui lòng chạy file setup_admin_database.sql trên Supabase SQL Editor để cấp quyền.');
          }
          setLocallyDeletedIds((prev) => new Set([...prev, ...staleIds]));
          setCleanFeedback(`Đã dọn dẹp và xóa ${deleted.length} tệp treo thành công!`);
        } else {
          const { data: updated, error } = await supabase
            .from('files')
            .update({
              sync_status: 'ERROR',
              updated_at: new Date().toISOString(),
            })
            .in('id', staleIds)
            .select('id');
          if (error) throw error;
          if (!updated || updated.length === 0) {
            throw new Error('Supabase RLS chưa cho phép Admin cập nhật bảng files. Vui lòng chạy file setup_admin_database.sql.');
          }
          setCleanFeedback(`Đã cập nhật ${updated.length} tệp sang trạng thái ERROR.`);
        }
      }

      setTimeout(() => setCleanFeedback(null), 4000);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Lỗi xử lý tệp treo: ${err.message}\n\nLưu ý: Mở Supabase SQL Editor và chạy toàn bộ nội dung file setup_admin_database.sql để cấp quyền cho Admin.`);
    } finally {
      setIsCleaning(false);
    }
  };

  // Single file delete handler
  const handleDeleteSingleFile = async (fileId) => {
    if (!confirm('Xóa bản ghi dở dang này để giải phóng danh sách?')) return;
    try {
      // Method 1: Try RPC admin_delete_file first
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_delete_file', { p_file_id: fileId });
      if (!rpcErr && rpcRes?.success) {
        setLocallyDeletedIds((prev) => new Set([...prev, fileId]));
        setCleanFeedback('Đã xóa tệp dở dang thành công qua RPC!');
        setTimeout(() => setCleanFeedback(null), 3000);
        if (onRefresh) onRefresh();
        return;
      }

      // Method 2: Direct delete with .select() verification
      const { data: deleted, error } = await supabase.from('files').delete().eq('id', fileId).select('id');
      if (error) throw error;
      if (!deleted || deleted.length === 0) {
        throw new Error('Supabase RLS không cho phép Admin xóa bản ghi này. Vui lòng chạy file setup_admin_database.sql trên Supabase SQL Editor.');
      }
      setLocallyDeletedIds((prev) => new Set([...prev, fileId]));
      setCleanFeedback('Đã xóa tệp dở dang thành công!');
      setTimeout(() => setCleanFeedback(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Lỗi xóa file: ${err.message}\n\nHãy chạy file setup_admin_database.sql trên Supabase để cấp quyền.`);
    }
  };

  // Filtered files (immediately hide deleted items)
  const filteredFiles = useMemo(() => {
    return files
      .filter((f) => !locallyDeletedIds.has(f.id))
      .filter((f) => {
      const email = (userEmailMap.get(f.user_id) || '').toLowerCase();
      const name = (f.original_name || f.id || '').toLowerCase();
      const path = (f.storage_path || '').toLowerCase();
      const st = String(f.sync_status || '').toUpperCase();
      const cat = String(f.category || '').toUpperCase();

      const matchSearch =
        name.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase()) ||
        path.includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || st === statusFilter;
      const matchCat = categoryFilter === 'ALL' || cat === categoryFilter;

      return matchSearch && matchStatus && matchCat;
    });
  }, [files, locallyDeletedIds, userEmailMap, searchTerm, statusFilter, categoryFilter]);

  const getCategoryIcon = (category) => {
    switch (String(category).toUpperCase()) {
      case 'PHOTO':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case 'VIDEO':
        return <Video className="w-4 h-4 text-amber-400" />;
      case 'VOICE':
        return <Mic className="w-4 h-4 text-pink-400" />;
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-blue-400" />;
      default:
        return <HardDrive className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Giám Sát Tiến Trình Đồng Bộ Cloud
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {files.length} tệp đa phương tiện
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Theo dõi trạng thái tải file nhị phân mã hóa AES-256 lên Supabase Storage và dọn dẹp các tệp treo dở dang
          </p>
        </div>
        <div className="flex items-center gap-2">
          {staleUploadingFiles.length > 0 && (
            <button
              onClick={() => handleCleanStaleFiles('DELETE')}
              disabled={isCleaning}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Dọn dẹp {staleUploadingFiles.length} file kẹt
            </button>
          )}
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>
      </div>

      {/* Clean Feedback Toast */}
      {cleanFeedback && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{cleanFeedback}</span>
        </div>
      )}

      {/* Stale Warning Banner */}
      {staleUploadingFiles.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-200 text-sm">
                Phát hiện {staleUploadingFiles.length} tệp tin bị kẹt UPLOADING... dở dang!
              </div>
              <div className="text-amber-300/80">
                Các file này đã bắt đầu tải lên từ hơn 5 phút trước nhưng tiến trình mạng trên điện thoại bị ngắt
                (do tắt màn hình hoặc thoát app). Bấm nút bên phải để dọn dẹp ngay.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleCleanStaleFiles('MARK_ERROR')}
              disabled={isCleaning}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition"
            >
              Đánh dấu Lỗi
            </button>
            <button
              onClick={() => handleCleanStaleFiles('DELETE')}
              disabled={isCleaning}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-red-400 font-medium text-xs border border-slate-700 transition"
            >
              Xóa bản ghi rác
            </button>
          </div>
        </div>
      )}

      {/* KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Đồng Bộ Thành Công</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{stats.cloudCount} tệp</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tỷ lệ thành công: <strong className="text-emerald-400">{stats.successRate}%</strong>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Đang Trong Tiến Trình</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-2">{stats.uploadingCount} tệp</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {staleUploadingFiles.length > 0 ? (
              <span className="text-amber-400">{staleUploadingFiles.length} file bị treo dở dang</span>
            ) : (
              'Đang mã hóa & upload mạng'
            )}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tệp Đồng Bộ Thất Bại</span>
            <div
              className={`w-8 h-8 rounded-lg ${
                stats.errorCount > 0 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-400'
              } flex items-center justify-center`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold mt-2 ${stats.errorCount > 0 ? 'text-red-400' : 'text-slate-200'}`}>
            {stats.errorCount} tệp
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Lỗi Socket / App background</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Dung Lượng Đã Đẩy Lên</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">{formatBytes(stats.totalBytes)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Container AES-256 nhị phân</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên file, email khách hàng hoặc storage path..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Status Filter */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/80">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'CLOUD', label: 'Hoàn tất' },
            { id: 'UPLOADING', label: 'Đang tải' },
            { id: 'ERROR', label: 'Lỗi' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                statusFilter === st.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/80">
          {[
            { id: 'ALL', label: 'Tất cả loại' },
            { id: 'PHOTO', label: 'Ảnh' },
            { id: 'VIDEO', label: 'Video' },
            { id: 'DOCUMENT', label: 'Docs' },
            { id: 'VOICE', label: 'Ghi âm' },
          ].map((ct) => (
            <button
              key={ct.id}
              onClick={() => setCategoryFilter(ct.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                categoryFilter === ct.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* File Synchronization Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Tên Tệp Tin / Định Dạng</th>
                <th className="py-3.5 px-4">Chủ Sở Hữu (Email)</th>
                <th className="py-3.5 px-4">Loại Kho</th>
                <th className="py-3.5 px-4">Dung Lượng</th>
                <th className="py-3.5 px-4">Trạng Thái Đồng Bộ</th>
                <th className="py-3.5 px-4">Mã Hóa</th>
                <th className="py-3.5 px-4">Thời Gian</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                    <div>Đang tải tiến trình đồng bộ từ Supabase Storage...</div>
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Cloud className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                    Không tìm thấy tệp tin đồng bộ nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const email = userEmailMap.get(file.user_id) || 'Ẩn danh';
                  const st = String(file.sync_status || 'LOCAL').toUpperCase();
                  const sz = Number(file.size_bytes) || 0;
                  const isStale =
                    st === 'UPLOADING' &&
                    Date.now() - new Date(file.updated_at || file.created_at || 0).getTime() > 5 * 60 * 1000;

                  return (
                    <tr key={file.id} className="hover:bg-slate-800/40 transition">
                      {/* File Name & Path */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                            {getCategoryIcon(file.category)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate max-w-[200px]" title={file.original_name}>
                              {file.original_name || file.id}
                            </div>
                            <div
                              className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]"
                              title={file.storage_path}
                            >
                              {file.storage_path || `users/${file.user_id}/...`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner Email */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-slate-200">{email}</div>
                        <div className="font-mono text-[10px] text-slate-400">{file.user_id?.slice(0, 8)}...</div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {file.category || 'PHOTO'}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3.5 px-4 font-mono text-xs text-cyan-400">{formatBytes(sz)}</td>

                      {/* Sync Status */}
                      <td className="py-3.5 px-4">
                        {st === 'CLOUD' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> CLOUD (Thành công)
                          </span>
                        ) : st === 'UPLOADING' ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              isStale
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {isStale ? 'BỊ TREO (>5p)' : 'UPLOADING...'}
                          </span>
                        ) : st === 'ERROR' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                            <AlertTriangle className="w-3.5 h-3.5" /> ERROR (Thất bại)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            LOCAL
                          </span>
                        )}
                      </td>

                      {/* Encryption Version */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> AES-256 (v
                          {file.encryption_version || 1})
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {formatDate(file.updated_at || file.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {st === 'UPLOADING' && isStale && (
                          <button
                            onClick={() => handleDeleteSingleFile(file.id)}
                            title="Xóa bản ghi bị treo dở dang"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
  );
}
