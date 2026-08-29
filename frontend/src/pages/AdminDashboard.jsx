import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Upload, Trash2, BookOpen, CheckCircle2,
  Clock, AlertCircle, Loader2, FileText, RefreshCw
} from 'lucide-react';

const API = 'http://localhost:8000';

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
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/documents`);
      setDocuments(data);
    } catch (err) {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) {
      setError('Only PDF files are allowed.');
      return;
    }
    setError('');
    setSuccess('');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API}/api/admin/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(`"${file.name}" is being processed and will be indexed shortly.`);
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Delete "${filename}" and all its indexed vectors?`)) return;
    try {
      await axios.delete(`${API}/api/admin/documents/${docId}`);
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
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-slate-500">Manage university syllabus documents</p>
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
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files[0])}
          />
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                <p className="text-slate-400 text-sm">Uploading and processing PDF…</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-300 font-medium">Drop a syllabus PDF here</p>
                  <p className="text-slate-500 text-sm mt-1">or click to select a file</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-500">PDF only</span>
              </>
            )}
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Indexed Documents
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full ml-1">{documents.length}</span>
            </h2>
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
      </div>
    </div>
  );
}
