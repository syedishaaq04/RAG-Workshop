import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import {
  ArrowLeft, Upload, Trash2, BookOpen, CheckCircle2,
  Clock, AlertCircle, Loader2, FileText, RefreshCw, Settings, UserPlus
} from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    indexed:    { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Indexed' },
    processing: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Processing' },
    pending:    { color: 'text-slate-400 bg-white/5 border-white/10',                icon: <Clock className="w-3 h-3" />, label: 'Pending' },
    error:      { color: 'text-red-400 bg-red-500/10 border-red-500/20',             icon: <AlertCircle className="w-3 h-3" />, label: 'Error' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${s.color}`}>
      {s.icon} {s.label}
    </span>
  );
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // User management state
  const [usersForm, setUsersForm] = useState([{ email: '', password: '' }]);
  const [userMsg, setUserMsg] = useState({ type: '', text: '' });
  const [creatingUsers, setCreatingUsers] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    return () => clearInterval(pollRef.current);
  }, []);

  const fetchDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/api/admin/documents');
      setDocuments(data);
      // Stop polling once all docs reach a final state
      const allDone = data.every(d => d.status === 'indexed' || d.status === 'error');
      if (allDone && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return data;
    } catch (err) {
      setError('Failed to load documents.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(() => fetchDocuments(true), 3000);
  };

  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['.pdf', '.docx', '.txt', '.csv'];
    const ext = file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    
    if (!allowed.includes('.' + ext)) {
      setError('Only PDF, DOCX, TXT, and CSV files are allowed');
      return;
    }
    setError('');
    setSuccess('');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/api/admin/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(`"${file.name}" uploaded — indexing in progress…`);
      await fetchDocuments();
      startPolling(); // auto-refresh every 3s until indexing completes
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process document');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUserRow = () => {
    setUsersForm([...usersForm, { email: '', password: '' }]);
  };

  const handleUserChange = (index, field, value) => {
    const newForm = [...usersForm];
    newForm[index][field] = value;
    setUsersForm(newForm);
  };

  const handleCreateUsers = async (e) => {
    e.preventDefault();
    setUserMsg({ type: '', text: '' });
    
    // Filter out empty rows
    const validUsers = usersForm.filter(u => u.email.trim() !== '' && u.password.trim() !== '');
    if (validUsers.length === 0) {
      setUserMsg({ type: 'error', text: 'Please fill in at least one user.' });
      return;
    }

    setCreatingUsers(true);
    try {
      const res = await api.post('/api/auth/admin/users', validUsers);
      
      let msg = res.data.message;
      if (res.data.errors && res.data.errors.length > 0) {
        msg += `. Errors: ${res.data.errors.join(', ')}`;
      }
      
      setUserMsg({ type: 'success', text: msg });
      setUsersForm([{ email: '', password: '' }]); // Reset form
    } catch (err) {
      setUserMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to create users.' });
    } finally {
      setCreatingUsers(false);
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Delete "${filename}" and all its indexed vectors?`)) return;
    try {
      await api.delete(`/api/admin/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccess(`"${filename}" deleted successfully.`);
    } catch (err) {
      setError('Delete failed.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 px-4 py-8"
      style={{ background: 'radial-gradient(ellipse at 20% 10%, #0f2640 0%, #0B0F19 55%)' }}>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              id="back-to-chat-btn"
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Document Management</h1>
              <p className="text-sm text-slate-400">Upload and monitor university knowledge base documents.</p>
            </div>
          </div>
          <button
            id="refresh-btn"
            onClick={fetchDocuments}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative mb-8 rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-blue-500/60 bg-blue-500/5'
              : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5'
          }`}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files[0])}
          />
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                <p className="text-slate-400 text-sm">Uploading and processing document…</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium">Drop a document here</p>
                  <p className="text-slate-500 text-sm mt-1">or click to select a file</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-500">PDF, DOCX, TXT, CSV</span>
              </>
            )}
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Indexed Documents
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full ml-1">{documents.length}</span>
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Settings</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all shadow-lg shadow-blue-500/20"
              >
                Back to Chat
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-14 text-slate-600">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{doc.chunks} chunks indexed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <StatusBadge status={doc.status} />
                    <button
                      id={`delete-${doc.id}`}
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      className="w-8 h-8 rounded-lg bg-red-500/0 hover:bg-red-500/15 border border-transparent hover:border-red-500/20 flex items-center justify-center text-slate-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Management Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">User Management</h2>
              <p className="text-sm text-slate-400">Create new student accounts.</p>
            </div>
          </div>

          {userMsg.text && (
            <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
              userMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm">{userMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateUsers}>
            <div className="space-y-3 mb-6">
              {usersForm.map((user, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="student@uni.edu"
                    value={user.email}
                    onChange={(e) => handleUserChange(index, 'email', e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-all text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={user.password}
                    onChange={(e) => handleUserChange(index, 'password', e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-all text-sm"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddUserRow}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all"
              >
                + Add Row
              </button>
              <button
                type="submit"
                disabled={creatingUsers}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60 flex items-center justify-center min-w-[120px]"
              >
                {creatingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Users'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}
