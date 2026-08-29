import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Send, LogOut, LayoutDashboard, ChevronDown,
  Loader2, Bot, User, BookMarked, Sparkles, Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const API = 'http://localhost:8000';

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async (preserveActive = false) => {
    try {
      const { data } = await axios.get(`${API}/api/chat/history`);
      setConversations(data);
      if (data.length > 0 && !preserveActive && !activeChatId) {
        setActiveChatId(data[0].id);
        setMessages(data[0].messages);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const selectConversation = (conv) => {
    setActiveChatId(conv.id);
    setMessages(conv.messages);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setLoading(true);

    const userMsg = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data } = await axios.post(`${API}/api/chat/message`, {
        chat_id: activeChatId,
        question,
      });
      setActiveChatId(data.chat_id);
      setMessages((prev) => [...prev, data.message]);
      // Refresh history sidebar without resetting active chat
      fetchHistory(true);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ An error occurred. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen w-full flex bg-[#0B0F19] text-slate-200 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-72 flex flex-col bg-[#111827] border-r border-white/5 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">SyllabusAI</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* New Chat */}
        <div className="px-3 py-3">
          <button
            id="new-chat-btn"
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all border border-white/5"
          >
            <Plus className="w-4 h-4" /> New conversation
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          <p className="text-xs text-slate-600 px-2 py-1 uppercase tracking-wider">Recent</p>
          {loadingHistory ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-600" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-6">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm truncate transition-all ${
                  activeChatId === conv.id
                    ? 'bg-blue-600/15 text-blue-300 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {conv.title || 'Untitled Chat'}
              </button>
            ))
          )}
        </div>

        {/* Bottom Nav */}
        <div className="border-t border-white/5 p-3 space-y-1">
          {user?.role === 'admin' && (
            <button
              id="admin-dashboard-btn"
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            >
              <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
            </button>
          )}
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">University Syllabus Assistant</span>
          </div>
          <span className="text-xs text-slate-600 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            Powered by Groq + Gemini
          </span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-24 py-6 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-5">
                <BookMarked className="w-8 h-8 text-blue-400/60" />
              </div>
              <h2 className="text-xl font-semibold text-slate-300 mb-2">Ask about your syllabus</h2>
              <p className="text-slate-500 text-sm max-w-md">
                Ask questions about course content, lab experiments, electives, regulations, or anything from the uploaded syllabi.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                {['What are the lab experiments for Data Structures?', 'List the electives in CSE program.', 'What are the regulations for AI-DS?', 'Compare CSE and AI-DS syllabi.'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-4 py-3 text-left text-xs text-slate-400 bg-white/4 hover:bg-white/8 border border-white/8 rounded-xl transition-all hover:text-slate-200 hover:border-white/15"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                msg.role === 'user'
                  ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                  : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600/20 border border-blue-500/20 text-slate-200 rounded-tr-sm'
                    : 'bg-white/5 border border-white/8 text-slate-300 rounded-tl-sm'
                }`}>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {[...new Map(msg.citations.map(c => [c.source_file, c])).values()].map((c, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        📄 {c.source_file}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-white/5 border border-white/8 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                <span className="text-sm text-slate-400">Searching syllabus…</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 md:px-12 lg:px-24 py-5 border-t border-white/5 shrink-0">
          <form onSubmit={sendMessage} className="relative">
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about courses, experiments, regulations…"
              disabled={loading}
              className="w-full px-5 pr-14 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-60 text-sm"
            />
            <button
              type="submit"
              id="send-btn"
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
          <p className="text-center text-xs text-slate-700 mt-3">
            Answers are grounded in indexed university syllabi. Always verify important information.
          </p>
        </div>
      </main>
    </div>
  );
}
