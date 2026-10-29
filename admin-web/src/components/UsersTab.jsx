import React, { useState, useMemo } from 'react';
import { Search, HardDrive, UserCheck, ShieldAlert, Sparkles, Filter, Copy, Check } from 'lucide-react';
import { formatBytes, formatDate } from '../utils/helpers';

export default function UsersTab({ users = [], subscriptions = [], files = [], loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('ALL'); // ALL | FREE | PAID
  const [selectedUser, setSelectedUser] = useState(null);
  const [copiedId, setCopiedId] = useState('');

  // Map user id to subscription
  const subMap = useMemo(() => {
    const map = new Map();
    subscriptions.forEach((sub) => {
      map.set(sub.user_id, sub);
    });
    return map;
  }, [subscriptions]);

  // Map user id to files count
  const fileCountMap = useMemo(() => {
    const map = new Map();
    files.forEach((f) => {
      map.set(f.user_id, (map.get(f.user_id) || 0) + 1);
    });
    return map;
  }, [files]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const email = (u.email || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      const matchSearch = email.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());

      const sub = subMap.get(u.id);
      const isPaid = sub && (sub.status === 'ACTIVE' || sub.plan === 'BASIC' || sub.plan === 'PRO');

      if (!matchSearch) return false;
      if (filterPlan === 'PAID') return isPaid;
      if (filterPlan === 'FREE') return !isPaid;
      return true;
    });
  }, [users, subMap, searchTerm, filterPlan]);

  // Aggregate Metrics
  const totalStorage = useMemo(() => {
    return users.reduce((sum, u) => sum + (Number(u.storage_used) || 0), 0);
  }, [users]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(''), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Cards */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Quản Lý Người Dùng
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {users.length} tài khoản
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Danh sách tất cả tài khoản đăng ký và lưu lượng đám mây trên Supabase
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Người Dùng</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">{users.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Đồng bộ từ Auth & Profiles</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Lưu Trữ Cloud Đã Dùng</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-400 mt-2">{formatBytes(totalStorage)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Mã hóa AES-256 trên Vault</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">User Trả Phí</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {subscriptions.filter((s) => s.status === 'ACTIVE' || s.plan === 'BASIC' || s.plan === 'PRO').length}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Đã kích hoạt gói lưu trữ</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Tệp Tin Cloud</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-2">{files.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ảnh, Video, Docs đã upload</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo email hoặc User ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block ml-1" />
          <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/80">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'FREE', label: 'Miễn phí' },
              { id: 'PAID', label: 'Trả phí' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterPlan(tab.id)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                  filterPlan === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Tài Khoản / Email</th>
                <th className="py-3.5 px-4">User ID</th>
                <th className="py-3.5 px-4">Gói Cước</th>
                <th className="py-3.5 px-4">Dung Lượng Đám Mây</th>
                <th className="py-3.5 px-4">Tệp Cloud</th>
                <th className="py-3.5 px-4">Ngày Đăng Ký</th>
                <th className="py-3.5 px-4 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                    <div>Đang tải dữ liệu người dùng từ Supabase...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const sub = subMap.get(u.id);
                  const isPaid = sub && (sub.status === 'ACTIVE' || sub.plan === 'BASIC' || sub.plan === 'PRO');
                  const filesCount = fileCountMap.get(u.id) || 0;
                  const storageUsed = Number(u.storage_used) || 0;
                  const storageLimit = Number(u.storage_limit) || 268435456; // 256MB default
                  const percent = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      {/* Email / Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white text-xs shadow">
                            {u.email ? u.email[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {u.email || 'Ẩn danh'}
                              {u.role === 'ADMIN' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">Mã hóa Client-Side AES-256</div>
                          </div>
                        </div>
                      </td>

                      {/* User ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                          <span>{u.id.substring(0, 8)}...</span>
                          <button
                            onClick={() => copyToClipboard(u.id)}
                            title="Sao chép User ID"
                            className="p-1 hover:text-white transition"
                          >
                            {copiedId === u.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Gói Cước */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ★ {sub.plan || 'BASIC'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            Free 256MB
                          </span>
                        )}
                      </td>

                      {/* Dung Lượng Đám Mây */}
                      <td className="py-3.5 px-4">
                        <div className="w-36">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-200">{formatBytes(storageUsed)}</span>
                            <span className="text-slate-400">{percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                              }`}
                              style={{ width: `${Math.max(3, percent)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Tệp Cloud */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                        {filesCount} tệp
                      </td>

                      {/* Ngày Đăng Ký */}
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Chi Tiết */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-1">Thông Tin Chi Tiết Người Dùng</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedUser.email}</p>

            <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono text-slate-200">{selectedUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-slate-200">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quyền hạn (Role):</span>
                <span className="font-bold text-indigo-400">{selectedUser.role || 'USER'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dung lượng sử dụng:</span>
                <span className="font-medium text-cyan-400">
                  {formatBytes(selectedUser.storage_used)} / {formatBytes(selectedUser.storage_limit || 268435456)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số file đã đồng bộ:</span>
                <span className="font-medium text-slate-200">{fileCountMap.get(selectedUser.id) || 0} tệp</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày tạo tài khoản:</span>
                <span className="text-slate-300">{formatDate(selectedUser.created_at)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

