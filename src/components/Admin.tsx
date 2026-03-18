import React, { useState, useEffect } from 'react';
import { Book, Event, Stats, Subscription, User } from '../types';
import { Plus, Trash2, Edit2, LayoutDashboard, BookOpen, Calendar, Users, LogOut, Loader2, Save, X, Search, ArrowUpDown, Filter, CreditCard, Shield, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'books' | 'events' | 'subscriptions' | 'users'>('dashboard');
  const [books, setBooks] = useState<Book[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Partial<Book>>({});
  const [editingSub, setEditingSub] = useState<Partial<Subscription>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof Book>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBestseller, setFilterBestseller] = useState<'all' | 'yes' | 'no'>('all');
  const [filterAudiobook, setFilterAudiobook] = useState<'all' | 'yes' | 'no'>('all');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/check');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setLoginError('Invalid password');
      }
    } catch (error) {
      setLoginError('An error occurred');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAuthenticated(false);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [booksRes, eventsRes, statsRes, subsRes, usersRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/events'),
        fetch('/api/stats'),
        fetch('/api/subscriptions'),
        fetch('/api/admin/users')
      ]);
      setBooks(await booksRes.json());
      setEvents(await eventsRes.json());
      setStats(await statsRes.json());
      setSubs(await subsRes.json());
      setUsers(await usersRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedBooks = books
    .filter(book => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (book.title?.toLowerCase() || '').includes(query) || 
                           (book.author?.toLowerCase() || '').includes(query);
      const matchesBestseller = filterBestseller === 'all' || 
                               (filterBestseller === 'yes' && book.is_bestseller) ||
                               (filterBestseller === 'no' && !book.is_bestseller);
      const matchesAudiobook = filterAudiobook === 'all' || 
                              (filterAudiobook === 'yes' && book.is_audiobook) ||
                              (filterAudiobook === 'no' && !book.is_audiobook);
      return matchesSearch && matchesBestseller && matchesAudiobook;
    })
    .sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
      // For boolean or other types, just simple comparison
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (key: keyof Book) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingBook.id;
      const url = isEditing ? `/api/books/${editingBook.id}` : '/api/books';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBook)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingBook({});
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setEditingSub({});
    setIsModalOpen(true);
  };

  const handleEditSub = (sub: Subscription) => {
    setEditingSub(sub);
    setEditingBook({});
    setIsModalOpen(true);
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!editingSub.id;
      const url = isEditing ? `/api/subscriptions/${editingSub.id}` : '/api/subscriptions';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSub)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingSub({});
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSub = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscription plan?')) return;
    try {
      await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteBook = async (id: number) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await fetch(`/api/books/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-gold animate-spin" />
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate border border-gold/20 rounded-[40px] p-12 shadow-2xl space-y-8"
        >
          <div className="text-center space-y-4">
            <h1 className="font-urdu text-5xl text-gold">کتابوں کی دولت</h1>
            <p className="text-gold/60 uppercase tracking-[4px] text-xs font-bold">Admin Login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs text-gold/60 uppercase tracking-widest font-bold">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-midnight border border-gold/20 rounded-2xl py-4 px-6 text-white focus:border-gold outline-none transition-colors"
                placeholder="••••••••"
                required
              />
              {loginError && <p className="text-accent text-xs mt-2">{loginError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-gold text-midnight py-4 rounded-2xl font-bold text-lg hover:bg-gold-bright transition-colors shadow-xl shadow-gold/10"
            >
              Access Panel
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate border-r border-gold/10 p-6 flex flex-col">
        <div className="mb-12">
          <h1 className="font-urdu text-3xl text-gold mb-2">کتابوں کی دولت</h1>
          <p className="text-xs text-gold/60 tracking-widest uppercase">Admin Panel</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-gold text-midnight' : 'text-gold/60 hover:bg-gold/10'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'books' ? 'bg-gold text-midnight' : 'text-gold/60 hover:bg-gold/10'}`}
          >
            <BookOpen className="w-5 h-5" /> Manage Books
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'events' ? 'bg-gold text-midnight' : 'text-gold/60 hover:bg-gold/10'}`}
          >
            <Calendar className="w-5 h-5" /> Manage Events
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'subscriptions' ? 'bg-gold text-midnight' : 'text-gold/60 hover:bg-gold/10'}`}
          >
            <CreditCard className="w-5 h-5" /> Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-gold text-midnight' : 'text-gold/60 hover:bg-gold/10'}`}
          >
            <Users className="w-5 h-5" /> Manage Users
          </button>
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-accent hover:bg-accent/10 rounded-xl transition-colors mt-auto"
        >
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-serif text-white capitalize">{activeTab}</h2>
            <p className="text-gold/60">Welcome back, Admin</p>
          </div>
          {activeTab !== 'dashboard' && activeTab !== 'users' && (
            <button 
              onClick={() => {
                setEditingBook({});
                setEditingSub({});
                setIsModalOpen(true);
              }}
              className="bg-gold text-midnight px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gold-bright transition-colors"
            >
              <Plus className="w-5 h-5" /> Add New {activeTab === 'books' ? 'Book' : activeTab === 'events' ? 'Event' : 'Plan'}
            </button>
          )}
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate p-8 rounded-3xl border border-gold/10 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BookOpen className="w-24 h-24 text-gold" />
                </div>
                <div className="w-12 h-12 bg-gold/20 rounded-2xl flex items-center justify-center mb-6">
                  <BookOpen className="text-gold w-6 h-6" />
                </div>
                <h3 className="text-gold/60 text-sm uppercase tracking-widest mb-2 font-bold">Total Books</h3>
                <p className="text-5xl font-serif text-white">{stats?.books}</p>
                <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs">
                  <TrendingUp className="w-4 h-4" />
                  <span>Inventory growing</span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate p-8 rounded-3xl border border-gold/10 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar className="w-24 h-24 text-accent" />
                </div>
                <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center mb-6">
                  <Calendar className="text-accent w-6 h-6" />
                </div>
                <h3 className="text-gold/60 text-sm uppercase tracking-widest mb-2 font-bold">Events Held</h3>
                <p className="text-5xl font-serif text-white">{stats?.events}</p>
                <div className="mt-4 flex items-center gap-2 text-gold text-xs">
                  <TrendingUp className="w-4 h-4" />
                  <span>High engagement</span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate p-8 rounded-3xl border border-gold/10 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users className="w-24 h-24 text-emerald-500" />
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="text-emerald-500 w-6 h-6" />
                </div>
                <h3 className="text-gold/60 text-sm uppercase tracking-widest mb-2 font-bold">Happy Readers</h3>
                <p className="text-5xl font-serif text-white">{stats?.users.toLocaleString()}</p>
                <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs">
                  <TrendingUp className="w-4 h-4" />
                  <span>Community expanding</span>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate p-8 rounded-3xl border border-gold/10">
                <h3 className="text-xl font-serif text-white mb-8">Content Distribution</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Books', value: stats?.books || 0, color: '#D4AF37' },
                        { name: 'Events', value: stats?.events || 0, color: '#FF6321' },
                        { name: 'Users', value: users.length || 0, color: '#10b981' }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#D4AF37', fontSize: 12 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#D4AF37', fontSize: 12 }} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }}
                        contentStyle={{ 
                          backgroundColor: '#0A0A0A', 
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                          borderRadius: '12px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {[
                          { name: 'Books', color: '#D4AF37' },
                          { name: 'Events', color: '#FF6321' },
                          { name: 'Users', color: '#10b981' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate p-8 rounded-3xl border border-gold/10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-serif text-white">Recent Readers</h3>
                  <button 
                    onClick={() => setActiveTab('users')}
                    className="text-gold/60 text-xs hover:text-gold transition-colors uppercase tracking-widest font-bold"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-4">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-midnight/40 rounded-2xl border border-gold/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center text-gold">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{user.email}</p>
                          <p className="text-[10px] text-gold/40 uppercase tracking-widest">{user.role}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-white/20">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-center text-gold/20 py-10 italic">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'books' && (
          <div className="space-y-6">
            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-slate p-6 rounded-3xl border border-gold/10">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/40" />
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-midnight border border-gold/20 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold outline-none transition-colors"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 bg-midnight border border-gold/20 rounded-xl px-4 py-2">
                  <Filter className="w-4 h-4 text-gold/60" />
                  <select
                    value={filterBestseller}
                    onChange={(e) => setFilterBestseller(e.target.value as any)}
                    className="bg-transparent text-sm text-gold/80 outline-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="yes">Bestsellers</option>
                    <option value="no">Regular</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 bg-midnight border border-gold/20 rounded-xl px-4 py-2">
                  <BookOpen className="w-4 h-4 text-gold/60" />
                  <select
                    value={filterAudiobook}
                    onChange={(e) => setFilterAudiobook(e.target.value as any)}
                    className="bg-transparent text-sm text-gold/80 outline-none cursor-pointer"
                  >
                    <option value="all">All Formats</option>
                    <option value="yes">Audiobooks</option>
                    <option value="no">E-Books Only</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-slate rounded-3xl border border-gold/10 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-midnight/50 text-gold/60 text-xs uppercase tracking-widest">
                    <th className="px-8 py-6 cursor-pointer hover:text-gold transition-colors" onClick={() => toggleSort('title')}>
                      <div className="flex items-center gap-2">
                        Book {sortKey === 'title' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                    <th className="px-8 py-6 cursor-pointer hover:text-gold transition-colors" onClick={() => toggleSort('author')}>
                      <div className="flex items-center gap-2">
                        Author {sortKey === 'author' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                    <th className="px-8 py-6 cursor-pointer hover:text-gold transition-colors" onClick={() => toggleSort('price')}>
                      <div className="flex items-center gap-2">
                        Price {sortKey === 'price' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                    <th className="px-8 py-6 cursor-pointer hover:text-gold transition-colors" onClick={() => toggleSort('created_at')}>
                      <div className="flex items-center gap-2">
                        Added {sortKey === 'created_at' && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold/10">
                  {filteredAndSortedBooks.map(book => (
                    <tr key={book.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-navy rounded-lg flex items-center justify-center text-2xl overflow-hidden">
                            {book.cover_icon.startsWith('http') ? (
                              <img src={book.cover_icon} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                            ) : (
                              book.cover_icon
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white">{book.title}</p>
                            <p className="text-xs text-gold/60">{book.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-gold/80">{book.author}</td>
                      <td className="px-8 py-6 font-bold">Rs. {book.price}</td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-white/40">{new Date(book.created_at).toLocaleDateString()}</span>
                          <div className="flex gap-2">
                            {book.is_bestseller && (
                              <span className="bg-gold/20 text-gold text-[8px] px-2 py-0.5 rounded-full uppercase font-bold">Bestseller</span>
                            )}
                            {book.is_audiobook && (
                              <span className="bg-accent/20 text-accent text-[8px] px-2 py-0.5 rounded-full uppercase font-bold">Audio</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right space-x-2">
                        <button 
                          onClick={() => handleEditBook(book)}
                          className="p-2 text-gold/60 hover:text-gold"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteBook(book.id)}
                          className="p-2 text-accent/60 hover:text-accent"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAndSortedBooks.length === 0 && (
                <div className="p-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-gold/5 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-10 h-10 text-gold/20" />
                  </div>
                  <p className="text-gold/40">No books found matching your criteria</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="bg-slate rounded-3xl border border-gold/10 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-midnight/50 text-gold/60 text-xs uppercase tracking-widest">
                  <th className="px-8 py-6">Plan Name</th>
                  <th className="px-8 py-6">Price</th>
                  <th className="px-8 py-6">Duration</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {subs.map(sub => (
                  <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-white">{sub.name}</p>
                      <p className="text-xs text-gold/60 truncate max-w-xs">{sub.features}</p>
                    </td>
                    <td className="px-8 py-6 font-bold text-gold">Rs. {sub.price}</td>
                    <td className="px-8 py-6 text-white/60">{sub.duration}</td>
                    <td className="px-8 py-6">
                      {sub.is_popular && (
                        <span className="bg-gold/20 text-gold text-[10px] px-2 py-1 rounded-full uppercase font-bold">Popular</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right space-x-2">
                      <button 
                        onClick={() => handleEditSub(sub)}
                        className="p-2 text-gold/60 hover:text-gold"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSub(sub.id)}
                        className="p-2 text-accent/60 hover:text-accent"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-slate rounded-3xl border border-gold/10 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-midnight/50 text-gold/60 text-xs uppercase tracking-widest">
                  <th className="px-8 py-6">User Email</th>
                  <th className="px-8 py-6">Role</th>
                  <th className="px-8 py-6">Joined Date</th>
                  <th className="px-8 py-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/10">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center text-gold">
                          <Users className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-white">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {user.role === 'admin' ? (
                          <span className="flex items-center gap-1.5 bg-accent/20 text-accent text-[10px] px-3 py-1 rounded-full uppercase font-bold border border-accent/20">
                            <Shield className="w-3 h-3" /> {user.role}
                          </span>
                        ) : (
                          <span className="bg-gold/20 text-gold text-[10px] px-3 py-1 rounded-full uppercase font-bold border border-gold/20">
                            {user.role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-white/60">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="inline-flex items-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-20 text-center space-y-4">
                <div className="w-20 h-20 bg-gold/5 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-10 h-10 text-gold/20" />
                </div>
                <p className="text-gold/40">No users found in the system</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[7000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-midnight/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate border border-gold/20 rounded-3xl p-10 shadow-2xl"
            >
              <header className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-serif text-gold">
                  {activeTab === 'books' ? (editingBook.id ? 'Edit Book' : 'Add New Book') : (editingSub.id ? 'Edit Plan' : 'Add New Plan')}
                </h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingBook({});
                    setEditingSub({});
                  }} 
                  className="text-gold/60 hover:text-gold"
                >
                  <X className="w-8 h-8" />
                </button>
              </header>

              {activeTab === 'books' ? (
                <form onSubmit={handleSaveBook} className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Book Title</label>
                    <input
                      required
                      type="text"
                      value={editingBook.title || ''}
                      onChange={e => setEditingBook({ ...editingBook, title: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Author</label>
                    <input
                      required
                      type="text"
                      value={editingBook.author || ''}
                      onChange={e => setEditingBook({ ...editingBook, author: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Category</label>
                    <input
                      required
                      type="text"
                      value={editingBook.category || ''}
                      onChange={e => setEditingBook({ ...editingBook, category: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Price (Rs.)</label>
                    <input
                      required
                      type="number"
                      value={editingBook.price || ''}
                      onChange={e => setEditingBook({ ...editingBook, price: parseInt(e.target.value) })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Cover Icon (Emoji or Image URL)</label>
                    <input
                      required
                      type="text"
                      value={editingBook.cover_icon || ''}
                      onChange={e => setEditingBook({ ...editingBook, cover_icon: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                      placeholder="📖 or https://..."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Synopsis</label>
                    <textarea
                      required
                      rows={4}
                      value={editingBook.description || ''}
                      onChange={e => setEditingBook({ ...editingBook, description: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none resize-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Author Biography</label>
                    <textarea
                      rows={3}
                      value={editingBook.author_bio || ''}
                      onChange={e => setEditingBook({ ...editingBook, author_bio: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none resize-none"
                      placeholder="Brief biography of the author..."
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editingBook.is_bestseller}
                        onChange={e => setEditingBook({ ...editingBook, is_bestseller: e.target.checked })}
                        className="w-5 h-5 accent-gold"
                      />
                      <span className="text-sm text-gold/80">Bestseller</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editingBook.is_audiobook}
                        onChange={e => setEditingBook({ ...editingBook, is_audiobook: e.target.checked })}
                        className="w-5 h-5 accent-gold"
                      />
                      <span className="text-sm text-gold/80">Audiobook</span>
                    </label>
                  </div>
                  {editingBook.is_audiobook && (
                    <div>
                      <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Audio Duration</label>
                      <input
                        type="text"
                        value={editingBook.audio_duration || ''}
                        onChange={e => setEditingBook({ ...editingBook, audio_duration: e.target.value })}
                        className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                        placeholder="8h 32m"
                      />
                    </div>
                  )}
                  <div className="col-span-2 flex justify-end gap-4 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-8 py-3 rounded-xl border border-gold/20 text-gold hover:bg-gold/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-xl bg-gold text-midnight font-bold hover:bg-gold-bright transition-colors flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" /> Save Book
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveSub} className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Plan Name</label>
                    <input
                      required
                      type="text"
                      value={editingSub.name || ''}
                      onChange={e => setEditingSub({ ...editingSub, name: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                      placeholder="e.g. Monthly Pro"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Price (Rs.)</label>
                    <input
                      required
                      type="number"
                      value={editingSub.price || ''}
                      onChange={e => setEditingSub({ ...editingSub, price: parseInt(e.target.value) })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Duration</label>
                    <input
                      required
                      type="text"
                      value={editingSub.duration || ''}
                      onChange={e => setEditingSub({ ...editingSub, duration: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                      placeholder="e.g. month, 6 months"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">Features (Comma separated)</label>
                    <textarea
                      required
                      rows={3}
                      value={editingSub.features || ''}
                      onChange={e => setEditingSub({ ...editingSub, features: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none resize-none"
                      placeholder="Feature 1, Feature 2, Feature 3"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gold/60 uppercase tracking-widest mb-2">WhatsApp Link (Optional)</label>
                    <input
                      type="text"
                      value={editingSub.whatsapp_link || ''}
                      onChange={e => setEditingSub({ ...editingSub, whatsapp_link: e.target.value })}
                      className="w-full bg-midnight border border-gold/20 rounded-xl py-3 px-4 text-white focus:border-gold outline-none"
                      placeholder="https://wa.me/..."
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editingSub.is_popular}
                        onChange={e => setEditingSub({ ...editingSub, is_popular: e.target.checked })}
                        className="w-5 h-5 accent-gold"
                      />
                      <span className="text-sm text-gold/80">Mark as Popular</span>
                    </label>
                  </div>
                  <div className="col-span-2 flex justify-end gap-4 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-8 py-3 rounded-xl border border-gold/20 text-gold hover:bg-gold/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 rounded-xl bg-gold text-midnight font-bold hover:bg-gold-bright transition-colors flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" /> Save Plan
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
