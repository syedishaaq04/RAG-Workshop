import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ThemeToggle from '../components/ThemeToggle';
import {
  ArrowLeft, Upload, Trash2, BookOpen, CheckCircle2,
  Clock, AlertCircle, Loader2, FileText, RefreshCw, Settings, UserPlus
} from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    indexed:    { color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Indexed' },
    processing: { color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',       icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Processing' },
    pending:    { color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10',                icon: <Clock className="w-3 h-3" />, label: 'Pending' },
    error:      { color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',             icon: <AlertCircle className="w-3 h-3" />, label: 'Error' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${s.color}`}>
      {s.icon} {s.label}
    </span>
  );
};

export default function AdminDashboard() {
  const { user } = useAuth();
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
    if (pollRef.current) return;
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
      setSuccess(`"${file.name}" uploaded successfully — background vector embedding started.`);
      await fetchDocuments();
      startPolling();
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
    
    const validUsers = usersForm.filter(u => u.email.trim() !== '' && u.password.trim() !== '');
    if (validUsers.length === 0) {
      setUserMsg({ type: 'error', text: 'Please fill in at least one valid user email and password.' });
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
      setUsersForm([{ email: '', password: '' }]);
    } catch (err) {
      setUserMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to create student accounts.' });
    } finally {
      setCreatingUsers(false);
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Delete "${filename}" and all its indexed vector chunks?`)) return;
    try {
      await api.delete(`/api/admin/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setSuccess(`"${filename}" and its vectors deleted successfully.`);
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 px-4 py-8 relative transition-colors duration-200">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-10 w-[500px] h-[500px] rounded-full bg-blue-500/5 dark:bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3.5">
            <button
              id="back-to-chat-btn"
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-xs cursor-pointer"
              title="Back to Chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Knowledge Base Administration
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Logged in as <span className="font-semibold text-blue-600 dark:text-blue-400">{user?.email || 'Admin'}</span> · Manage university documents, vectors, and accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="refresh-btn"
              onClick={() => fetchDocuments()}
              className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-xs cursor-pointer"
              title="Refresh document status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <ThemeToggle showLabel={false} />
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-5 px-4 py-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-center gap-2.5 font-medium shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-5 px-4 py-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-sm flex items-center gap-2.5 font-medium shadow-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
          className={`relative mb-8 rounded-3xl border-2 border-dashed p-10 sm:p-12 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-50/60 dark:border-blue-500/60 dark:bg-blue-500/10'
              : 'border-slate-300 dark:border-white/10 bg-white/70 dark:bg-white/3 hover:border-blue-400 dark:hover:border-white/20 hover:bg-blue-50/20 dark:hover:bg-white/5 shadow-xs'
          }`}
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
                <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                  Uploading and extracting document content…
                </p>
                <p className="text-slate-500 text-xs">
                  Generating embeddings and indexing into Atlas Vector Search.
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-slate-900 dark:text-slate-200 font-semibold text-base">
                    Click to browse or drag and drop document
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    Upload syllabus, exam schedules, fee structures, or policies
                  </p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-medium">
                  Supported formats: PDF, DOCX, TXT, CSV
                </span>
              </>
            )}
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white dark:bg-white/4 border border-slate-200/90 dark:border-white/8 rounded-3xl overflow-hidden mb-8 shadow-xs">
          <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-white/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Indexed Documents</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-full font-semibold ml-1">
                {documents.length}
              </span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all text-xs font-semibold cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-sm shadow-blue-500/20 text-xs cursor-pointer"
              >
                Back to Chat
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-14 text-slate-400 dark:text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No documents uploaded yet.</p>
              <p className="text-xs mt-1">Upload files using the box above to seed the knowledge base.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 dark:hover:bg-white/3 transition-all">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-red-500 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {doc.chunks} chunks indexed in Atlas Vector Search
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5 shrink-0">
                    <StatusBadge status={doc.status} />
                    <button
                      id={`delete-${doc.id}`}
                      onClick={() => handleDelete(doc.id, doc.filename)}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-all flex items-center justify-center cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Student Account Creation Section */}
        <div className="bg-white dark:bg-white/5 border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Student Account Provisioning
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Create new authenticated student accounts in bulk.
              </p>
            </div>
          </div>

          {userMsg.text && (
            <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
              userMsg.type === 'error' 
                ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400' 
                : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm font-medium">{userMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateUsers}>
            <div className="space-y-3 mb-5">
              {usersForm.map((user, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="student@uni.edu"
                    value={user.email}
                    onChange={(e) => handleUserChange(index, 'email', e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-transparent focus:outline-none focus:border-blue-600 dark:focus:border-blue-500/60 transition-all text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Initial Password"
                    value={user.password}
                    onChange={(e) => handleUserChange(index, 'password', e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-transparent focus:outline-none focus:border-blue-600 dark:focus:border-blue-500/60 transition-all text-sm"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAddUserRow}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                + Add Another User
              </button>
              <button
                type="submit"
                disabled={creatingUsers}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-500/20 disabled:opacity-60 flex items-center justify-center min-w-[120px] cursor-pointer"
              >
                {creatingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Accounts'}
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
