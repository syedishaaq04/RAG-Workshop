import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import {
  BookOpen, Send, LogOut, LayoutDashboard, Menu, X,
  Loader2, Bot, User, BookMarked, Plus, Trash2,
  Settings, Copy, Check, FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchHistory = async (preserveActive = false) => {
    try {
      const { data } = await api.get('/api/chat/history');
      setConversations(data);
      if (preserveActive) return;

      const sessionChatId = sessionStorage.getItem('campus_nexus_active_chat_id');
      if (sessionChatId) {
        const matchingChat = data.find((c) => c.id === sessionChatId);
        if (matchingChat) {
          setActiveChatId(matchingChat.id);
          setMessages(matchingChat.messages);
        } else {
          sessionStorage.removeItem('campus_nexus_active_chat_id');
          setActiveChatId(null);
          setMessages([]);
        }
      } else {
        // Fresh start: maintain new conversation window with starter prompts
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    sessionStorage.removeItem('campus_nexus_active_chat_id');
    setActiveChatId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/chat/${chatId}`);
      if (activeChatId === chatId) {
        startNewChat();
      }
      fetchHistory(true);
    } catch (err) {
      console.error('Failed to delete chat', err);
    }
  };

  const selectConversation = (conv) => {
    sessionStorage.setItem('campus_nexus_active_chat_id', conv.id);
    setActiveChatId(conv.id);
    setMessages(conv.messages);
    setSidebarOpen(false);
  };

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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
      const { data } = await api.post('/api/chat/message', {
        chat_id: activeChatId,
        question,
      });
      sessionStorage.setItem('campus_nexus_active_chat_id', data.chat_id);
      setActiveChatId(data.chat_id);
      setMessages((prev) => [...prev, data.message]);
      fetchHistory(true);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ An error occurred while retrieving answer. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const promptSuggestions = [
    { title: 'Fee Structure', desc: 'What is the complete fee structure for B.Tech?', tag: 'Finance' },
    { title: 'CSE Electives', desc: 'List all elective courses offered in the CSE curriculum.', tag: 'Courses' },
    { title: 'Hostel Guidelines', desc: 'What are the rules and timings for hostel accommodation?', tag: 'Campus Life' },
    { title: 'Academic Schedule', desc: 'When do odd semester midterm examinations commence?', tag: 'Calendar' }
  ];

  return (
    <div className="h-screen w-full flex bg-slate-100 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 overflow-hidden relative transition-colors duration-200">
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed md:relative z-40 h-full w-72 flex flex-col bg-slate-50 dark:bg-[#111827] border-r border-slate-200 dark:border-white/5 shrink-0 transition-transform duration-300 ease-in-out shadow-lg md:shadow-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Campus Nexus
              </p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || 'Guest'} Portal</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="md:hidden p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pt-3 pb-2">
          <button
            id="new-chat-btn"
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 transition-all border border-slate-300/80 dark:border-white/5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>New conversation</span>
          </button>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2 py-1.5 uppercase tracking-wider">
            Recent Conversations
          </p>
          {loadingHistory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer text-sm ${
                  activeChatId === conv.id
                    ? 'bg-blue-50 dark:bg-blue-600/15 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 font-medium shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => selectConversation(conv)}
              >
                <span className="truncate pr-2">
                  {conv.title || 'Untitled Query'}
                </span>
                <button
                  type="button"
                  title="Delete chat"
                  onClick={(e) => deleteChat(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition-all shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer Navigation */}
        <div className="border-t border-slate-200/80 dark:border-white/5 p-3 space-y-2">
          {user?.role === 'admin' && (
            <button
              id="admin-dashboard-btn"
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Admin Dashboard</span>
            </button>
          )}

          <div className="flex gap-2 pt-1">
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-transparent transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
            <button 
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-transparent transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-100/80 dark:bg-[#0B0F19]">
        {/* Top Navbar */}
        <header className="flex items-center justify-between px-4 md:px-8 py-3.5 border-b border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#0B0F19]/80 backdrop-blur-md shrink-0 transition-colors shadow-2xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="md:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                University Knowledge Base
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-300/80 dark:border-white/5">
              Groq OSS · Gemini
            </span>
            <ThemeToggle showLabel={false} />
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 lg:px-28 py-6 space-y-6">
          {loadingHistory && sessionStorage.getItem('campus_nexus_active_chat_id') ? (
            <div className="h-full flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Restoring session conversation…
                </span>
              </div>
            </div>
          ) : messages.length === 0 && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center mb-4 shadow-sm">
                <BookMarked className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome to Campus Nexus
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-8 max-w-md">
                Ask any question about admissions, syllabus courses, fee regulations, hostel policies, or exams.
              </p>

              {/* Starter Question Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
                {promptSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(item.desc)}
                    className="p-4 rounded-2xl bg-white dark:bg-white/5 hover:bg-blue-50/50 dark:hover:bg-white/10 border border-slate-200/90 dark:border-white/10 transition-all hover:border-blue-400 dark:hover:border-blue-500/30 hover:-translate-y-0.5 shadow-xs hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{item.title}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-transparent">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors leading-relaxed">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Render Messages */}
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-xs ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600/10 dark:bg-emerald-600/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className={`max-w-3xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1 min-w-0`}>
                <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed relative group ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-600/15'
                    : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-tl-xs shadow-sm'
                }`}>
                  {/* Markdown Renderer with Table and Syntax support */}
                  <div className={`prose prose-sm max-w-none ${
                    msg.role === 'user'
                      ? 'prose-invert text-white'
                      : 'prose-slate dark:prose-invert'
                  } prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:tracking-tight prose-table:border prose-table:border-slate-300 dark:prose-table:border-white/10 prose-th:bg-slate-100 dark:prose-th:bg-white/5 prose-th:p-2.5 prose-td:p-2.5 prose-td:border prose-td:border-slate-200 dark:prose-td:border-white/10`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Copy Button for Assistant Answers */}
                  {msg.role === 'assistant' && (
                    <button
                      type="button"
                      title="Copy response"
                      onClick={() => handleCopy(msg.content, idx)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-500 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Grounding Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-500 mr-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Sources:
                    </span>
                    {[...new Map(msg.citations.map(c => [c.source_file, c])).values()].map((c, i) => (
                      <span 
                        key={i} 
                        className="text-xs px-2.5 py-1 rounded-full bg-amber-100/80 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-amber-950 dark:text-amber-400 font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        📄 {c.source_file} {c.page_number ? `(p. ${c.page_number})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking / Searching Pipeline Indicator */}
          {loading && (
            <div className="flex gap-3 md:gap-4 items-start">
              <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-600/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="px-5 py-3.5 rounded-2xl rounded-tl-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Routing question & reviewing verified campus documents…
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Dock */}
        <div className="px-4 md:px-12 lg:px-28 py-4 border-t border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#0B0F19]/90 backdrop-blur-md shrink-0 shadow-lg shadow-slate-200/50 dark:shadow-none">
          <form onSubmit={sendMessage} className="relative max-w-4xl mx-auto">
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about admissions, fee schedules, courses, regulations…"
              disabled={loading}
              className="w-full px-5 pr-14 py-3.5 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-300 dark:bg-white/5 dark:border-white/10 rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm shadow-xs disabled:opacity-60"
            />
            <button
              type="submit"
              id="send-btn"
              disabled={!input.trim() || loading}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-sm shadow-blue-600/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            Answers are strictly cited from indexed university policies. Always verify critical academic deadlines.
          </p>
        </div>
      </main>

      {/* Password Modal */}
      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}
