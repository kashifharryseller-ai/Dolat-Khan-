import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Highlight } from './components/Highlight';
import { Book, Event, Stats, Subscription, Review } from './types';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Headphones, 
  Calendar, 
  Info, 
  ChevronRight, 
  Star, 
  Play, 
  Smartphone, 
  Moon, 
  Sun,
  Edit3, 
  BarChart3, 
  MessageCircle, 
  Gift,
  Check,
  X,
  Menu,
  ShoppingBag,
  ArrowRight,
  Quote,
  Loader2,
  Search,
  Heart,
  LogOut,
  User as UserIcon,
  TrendingUp,
  Clock,
  Send,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Trophy,
  Award,
  FileText,
  Music,
  Scale,
  Zap,
  ShieldCheck,
  Download
} from 'lucide-react';
import Splash from './components/Splash';
import { auth, db, signInWithGoogle, logout, handleFirestoreError } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, setDoc, deleteDoc, serverTimestamp, addDoc, orderBy, getDoc } from 'firebase/firestore';
import { OperationType } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import ProfileModal from './components/ProfileModal';

const Admin = lazy(() => import('./components/Admin'));
const AudioPlayer = lazy(() => import('./components/AudioPlayer'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="w-8 h-8 text-gold animate-spin" />
  </div>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [playingAudiobook, setPlayingAudiobook] = useState<Book | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [readingProgress, setReadingProgress] = useState<Record<string, number>>({});
  const [bookReviews, setBookReviews] = useState<Review[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [showPaymentGuide, setShowPaymentGuide] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [isLightMode]);

  useEffect(() => {
    if (selectedBook) {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('bookId', '==', selectedBook.id.toString()),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
        setBookReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'reviews');
      });
      return () => unsubscribe();
    } else {
      setBookReviews([]);
      setNewRating(5);
      setNewComment('');
    }
  }, [selectedBook]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        
        // Listen for user data (to check premium/membership status)
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        });

        // Listen for favorites
        const favsQuery = collection(db, 'users', currentUser.uid, 'favorites');
        const unsubscribeFavs = onSnapshot(favsQuery, (snapshot) => {
          setFavorites(snapshot.docs.map(doc => doc.data().bookId));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/favorites`);
        });

        // Listen for reading progress
        const progressQuery = collection(db, 'users', currentUser.uid, 'reading_progress');
        const unsubscribeProgress = onSnapshot(progressQuery, (snapshot) => {
          const progressMap: Record<string, number> = {};
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            progressMap[data.bookId] = data.progress;
          });
          setReadingProgress(progressMap);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/reading_progress`);
        });

        return () => {
          unsubscribeFavs();
          unsubscribeProgress();
          unsubscribeUser();
        };
      } else {
        setFavorites([]);
        setReadingProgress({});
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) {
      return books.map(book => ({ item: book, matches: undefined }));
    }
    
    const fuse = new Fuse(books, {
      keys: ['title', 'author', 'category', 'description'],
      includeMatches: true,
      threshold: 0.3,
      ignoreLocation: true,
    });
    
    return fuse.search(searchQuery) as any[];
  }, [books, searchQuery]);

  const averageRating = useMemo(() => {
    if (bookReviews.length === 0) return 0;
    return bookReviews.reduce((acc, review) => acc + review.rating, 0) / bookReviews.length;
  }, [bookReviews]);

  const selectedBookMatches = useMemo(() => {
    if (!selectedBook) return undefined;
    const found = filteredBooks.find(b => b.item.id === selectedBook.id);
    return found?.matches;
  }, [selectedBook, filteredBooks]);

  const similarBooks = useMemo(() => {
    if (!selectedBook) return [];
    return books
      .filter(book => 
        book.id !== selectedBook.id && 
        (book.category === selectedBook.category || book.author === selectedBook.author)
      )
      .slice(0, 4);
  }, [selectedBook, books]);

  const toggleFavorite = async (bookId: number) => {
    if (!user) return;

    const idStr = bookId.toString();
    const favDocRef = doc(db, 'users', user.uid, 'favorites', idStr);
    const isFav = favorites.includes(idStr);
    try {
      if (isFav) {
        await deleteDoc(favDocRef);
      } else {
        await setDoc(favDocRef, {
          userId: user.uid,
          bookId: idStr,
          savedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, isFav ? OperationType.DELETE : OperationType.WRITE, `users/${user.uid}/favorites/${idStr}`);
    }
  };

  const updateProgress = async (bookId: number, progress: number) => {
    if (!user) return;
    const idStr = bookId.toString();
    const progressDocRef = doc(db, 'users', user.uid, 'reading_progress', idStr);
    try {
      await setDoc(progressDocRef, {
        userId: user.uid,
        bookId: idStr,
        progress,
        lastReadAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/reading_progress/${idStr}`);
    }
  };

  const handlePremiumAction = (action: () => void) => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    const isPremium = userData?.role === 'admin' || userData?.isPremium || userData?.role === 'member';
    if (isPremium) {
      action();
    } else {
      setShowPaymentGuide(true);
    }
  };

  const submitReview = async () => {
    if (!user || !newComment.trim() || !selectedBook) return;

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        bookId: selectedBook.id.toString(),
        rating: newRating,
        comment: newComment,
        createdAt: new Date().toISOString()
      });
      setNewComment('');
      setNewRating(5);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fetchData = async () => {
    try {
      const [booksRes, eventsRes, statsRes, subsRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/events'),
        fetch('/api/stats'),
        fetch('/api/subscriptions')
      ]);
      setBooks(await booksRes.json());
      setEvents(await eventsRes.json());
      setStats(await statsRes.json());
      setSubs(await subsRes.json());
    } catch (error) {
      console.error(error);
    }
  };

  if (isAdmin) return (
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-midnight flex items-center justify-center"><Loader2 className="w-12 h-12 text-gold animate-spin" /></div>}>
        <Admin />
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-midnight selection:bg-gold selection:text-midnight">
      <Splash />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-[1000] bg-midnight/80 backdrop-blur-2xl border-b border-gold/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-5 sm:py-6 flex justify-between items-center">
          <div className="flex flex-col group cursor-pointer relative">
            <span className="font-urdu text-3xl sm:text-4xl text-gold leading-[2] drop-shadow-md transition-transform duration-500 group-hover:scale-105 pt-4 pb-2">کتابوں کی دولت</span>
            <div className="absolute -inset-2 bg-gold/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            <Link to="/" className="text-sm font-medium text-white/70 hover:text-gold transition-colors relative group">Home</Link>
            <Link to="/e-library" className="text-sm font-medium text-white/70 hover:text-gold transition-colors relative group">E Books</Link>
            <Link to="/events" className="text-sm font-medium text-white/70 hover:text-gold transition-colors relative group">Events</Link>
            <Link to="/about" className="text-sm font-medium text-white/70 hover:text-gold transition-colors relative group">About</Link>
            
            <button 
              onClick={() => setIsLightMode(!isLightMode)}
              className="p-2 text-white/70 hover:text-gold transition-colors rounded-full hover:bg-white/5"
              aria-label="Toggle theme"
            >
              {isLightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 group cursor-pointer hover:border-gold/30 transition-all"
                >
                  <div className="relative">
                    <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-gold/20" />
                    <div className="absolute -bottom-1 -right-1 bg-gold text-midnight rounded-full p-0.5">
                      <Trophy className="w-2.5 h-2.5" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white/80 leading-none">{user.displayName?.split(' ')[0]}</span>
                    <span className="text-[8px] text-gold font-bold uppercase tracking-widest">Level 12 • 2450 pts</span>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-gold hover:text-midnight transition-all"
              >
                <UserIcon className="w-4 h-4" /> Sign In
              </button>
            )}
            <Link to="/subscriptions" className="bg-gradient-to-br from-accent to-accent-light text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-full text-sm font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-transform">
              Subscribe
            </Link>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-gold p-2">
            <Menu className="w-7 h-7" />
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-slate border-b border-gold/10 overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-4">
                <Link 
                  to="/" 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg font-medium text-white/70 hover:text-gold py-2"
                >
                  Home
                </Link>
                <Link 
                  to="/e-library" 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg font-medium text-white/70 hover:text-gold py-2"
                >
                  E Books
                </Link>
                <Link 
                  to="/events" 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg font-medium text-white/70 hover:text-gold py-2"
                >
                  Events
                </Link>
                <Link 
                  to="/about" 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg font-medium text-white/70 hover:text-gold py-2"
                >
                  About
                </Link>
                <Link 
                  to="/subscriptions" 
                  onClick={() => setIsMenuOpen(false)}
                  className="bg-gold text-midnight text-center py-4 rounded-xl font-bold mt-4"
                >
                  Subscribe Now
                </Link>
                
                {user ? (
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-white/5 text-white py-4 rounded-xl font-bold mt-2 border border-white/10"
                  >
                    <UserIcon className="w-5 h-5" /> View Profile
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      signInWithGoogle();
                    }}
                    className="flex items-center justify-center gap-2 bg-white/5 text-white py-4 rounded-xl font-bold mt-2 border border-white/10"
                  >
                    <UserIcon className="w-5 h-5" /> Sign In
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Profile Modal */}
      {user && (
        <ProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          user={user} 
          onLogout={logout} 
        />
      )}

      <Routes>
        <Route path="/" element={
          <>
            {/* Hero */}
            <section id="home" className="relative min-h-screen flex items-center justify-center pt-24 pb-12 overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-gold/5 rounded-full blur-[80px] sm:blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-accent/5 rounded-full blur-[80px] sm:blur-[120px]" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 sm:space-y-8"
          >
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-12 group">
              <motion.div
                whileHover={{ rotate: -10, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-full h-full bg-slate rounded-[2.5rem] border-2 border-gold/20 overflow-hidden shadow-2xl relative z-10 cursor-pointer"
              >
                <img 
                  src="https://picsum.photos/seed/book-hero/600/800" 
                  alt="Featured Book" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight/60 to-transparent" />
              </motion.div>
              <div className="absolute -inset-4 bg-gold/10 rounded-[3rem] blur-2xl group-hover:bg-gold/20 transition-colors" />
            </div>

            <div className="flex flex-col items-center justify-center mb-12 relative group">
              <div className="relative">
                <h2 className="font-urdu text-6xl sm:text-8xl lg:text-[10rem] text-gold drop-shadow-2xl leading-[2] sm:leading-[2.2] lg:leading-[2.5] transition-transform duration-700 group-hover:scale-105 pt-8 pb-8">
                  کتابوں کی دولت
                </h2>
                <div className="absolute -inset-10 bg-gold/10 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
              <div className="flex items-center gap-6 mt-2 sm:mt-4">
                <div className="h-[2px] w-16 sm:w-24 bg-gradient-to-r from-transparent via-gold/50 to-gold" />
                <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl text-white/90 font-bold tracking-[0.3em] uppercase drop-shadow-lg">
                  Kitabon Ki Dolat
                </h1>
                <div className="h-[2px] w-16 sm:w-24 bg-gradient-to-l from-transparent via-gold/50 to-gold" />
              </div>
            </div>
            <p className="font-serif text-xl sm:text-2xl text-gold/80 italic mb-8 drop-shadow-md">"Where Books Are True Wealth"</p>
            <p className="max-w-3xl mx-auto text-base sm:text-lg lg:text-xl text-white/60 leading-relaxed mb-10">
              Welcome to Pakistan's premier digital publishing platform by Dolat Khan Kakar. 
              Discover, read, and own books that transform lives. Your journey into knowledge, 
              wisdom, and fortune starts here.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link to="/e-library" className="btn-primary w-full sm:w-auto">
                Explore Collection
              </Link>
              <Link to="/audiobooks" className="btn-outline w-full sm:w-auto flex items-center justify-center gap-3">
                <Headphones className="w-6 h-6" /> Listen to Audiobooks
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate border-y border-gold/10 py-20 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold via-transparent to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16">
            {[
              { label: 'Published Books', value: stats?.books || '100+', icon: BookOpen },
              { label: 'Happy Readers', value: stats?.users.toLocaleString() || '50K+', icon: Star },
              { label: 'E-Books Available', value: '2000+', icon: Smartphone },
              { label: 'Library Access', value: '24/7', icon: Headphones },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center space-y-3 sm:space-y-4"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gold/10 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <stat.icon className="text-gold w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="block font-serif text-3xl sm:text-4xl lg:text-5xl text-gold font-bold">{stat.value}</span>
                <span className="block text-[10px] sm:text-xs text-gold/60 uppercase tracking-widest font-bold">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

        {/* Featured Books Preview */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-gold text-xs font-bold tracking-[4px] uppercase">Featured Collection</span>
              <h2 className="font-serif text-3xl sm:text-5xl text-white mt-4">Books by Dolat Khan Kakar</h2>
            </div>
            <Link to="/e-library" className="text-gold hover:text-white transition-colors flex items-center gap-2 font-bold text-sm uppercase tracking-widest bg-white/5 px-6 py-3 rounded-full border border-gold/20 hover:border-gold">
              View All Books <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
            {books.slice(0, 4).map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
              >
                <div className="bg-slate aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-gold/10 relative group-hover:border-gold/50 transition-all duration-500 group-hover:-translate-y-3 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div 
                    onClick={() => setSelectedBook(book)}
                    className="w-full h-full flex items-center justify-center text-8xl sm:text-9xl group-hover:scale-110 transition-transform duration-700 overflow-hidden"
                  >
                    {book.cover_icon.startsWith('http') ? (
                      <img src={book.cover_icon} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    ) : (
                      <span className="drop-shadow-[0_20px_20px_rgba(0,0,0,0.4)]">{book.cover_icon}</span>
                    )}
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(book.id);
                    }}
                    className={`absolute top-6 left-6 p-3 rounded-xl backdrop-blur-md border transition-all duration-300 ${favorites.includes(book.id.toString()) ? 'bg-accent text-white border-accent' : 'bg-white/5 text-white/40 border-white/10 hover:text-gold hover:border-gold'}`}
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(book.id.toString()) ? 'fill-current' : ''}`} />
                  </button>

                  {book.is_bestseller && (
                    <div className="absolute top-6 right-6">
                      <span className="bg-accent text-white text-[10px] px-4 py-2 rounded-full font-bold uppercase tracking-widest shadow-lg shadow-accent/20">Bestseller</span>
                    </div>
                  )}
                  <div className="absolute bottom-8 left-8 right-8 opacity-0 group-hover:opacity-100 transition-all translate-y-6 group-hover:translate-y-0 duration-500">
                    <button 
                      onClick={() => setSelectedBook(book)}
                      className="w-full bg-gold text-midnight py-4 rounded-2xl font-bold flex items-center justify-center gap-3 text-sm shadow-xl shadow-gold/20"
                    >
                      View Details <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-8 space-y-3 px-2">
                  <div className="flex items-center gap-3">
                    <span className="text-gold text-[10px] font-bold uppercase tracking-[3px]">
                      {book.category}
                    </span>
                    <div className="h-px flex-1 bg-gold/10" />
                  </div>
                  <h3 className="font-serif text-2xl text-white group-hover:text-gold transition-colors line-clamp-1 leading-tight">
                    {book.title}
                  </h3>
                  
                  {readingProgress[book.id.toString()] !== undefined && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                        <span>Progress</span>
                        <span>{readingProgress[book.id.toString()]}%</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${readingProgress[book.id.toString()]}%` }}
                          className="h-full bg-gold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-white/40 text-sm font-medium">
                      by {book.author}
                    </span>
                    <div className="flex gap-2">
                      {book.is_audiobook && <Music className="w-4 h-4 text-gold/40" />}
                      <FileText className="w-4 h-4 text-gold/40" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1.5">
                      {(book.formats || ['PDF', 'EPUB']).map(f => (
                        <span key={f} className="text-[8px] font-bold text-gold/40 border border-gold/10 px-1.5 py-0.5 rounded uppercase">{f}</span>
                      ))}
                    </div>
                    <span className="text-gold font-bold text-lg">Rs. {book.price}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Audiobooks Preview */}
        <section className="py-24 bg-slate border-y border-gold/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <span className="text-gold text-xs font-bold tracking-[4px] uppercase">Listen Anywhere</span>
                <h2 className="font-serif text-3xl sm:text-5xl text-white mt-4">Premium Audiobooks</h2>
              </div>
              <Link to="/audiobooks" className="text-gold hover:text-white transition-colors flex items-center gap-2 font-bold text-sm uppercase tracking-widest bg-white/5 px-6 py-3 rounded-full border border-gold/20 hover:border-gold">
                View All Audiobooks <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {books.filter(b => b.is_audiobook).slice(0, 2).map((book, i) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-midnight p-6 sm:p-8 rounded-[2.5rem] border border-gold/10 flex flex-col md:flex-row gap-6 sm:gap-8 hover:border-gold/40 transition-all group"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                  <div className="w-40 h-40 sm:w-48 sm:h-48 bg-navy rounded-3xl flex items-center justify-center text-6xl sm:text-7xl shadow-2xl group-hover:scale-105 transition-transform duration-700 overflow-hidden relative z-10">
                    {book.cover_icon.startsWith('http') ? (
                      <img src={book.cover_icon} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    ) : (
                      <span className="drop-shadow-2xl">{book.cover_icon}</span>
                    )}
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      <h3 className="font-serif text-3xl sm:text-4xl text-white">{book.title}</h3>
                      <span className="inline-flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-full border border-accent/20 w-fit mx-auto md:mx-0">
                        <Headphones className="w-3 h-3" /> Audiobook
                      </span>
                    </div>
                    <p className="text-gold/60 text-base sm:text-lg">Narrated by Professional Voice Artists • {book.audio_duration}</p>
                    <div className="flex items-center justify-center md:justify-start gap-6 pt-4">
                      <button 
                        onClick={() => handlePremiumAction(() => setPlayingAudiobook(book))}
                        className="w-14 h-14 sm:w-16 sm:h-16 bg-gold text-midnight rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl shadow-gold/30 group/play"
                      >
                        <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current group-hover:scale-110 transition-transform" />
                      </button>
                      <div className="flex flex-col">
                        <span className="text-gold font-bold text-sm">Listen to Sample</span>
                        <span className="text-white/40 text-xs">High Quality Audio</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Events Preview */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-gold text-xs font-bold tracking-[4px] uppercase">Literary Events</span>
              <h2 className="font-serif text-3xl sm:text-5xl text-white mt-4">Celebrity Book Launches</h2>
            </div>
            <Link to="/events" className="text-gold hover:text-white transition-colors flex items-center gap-2 font-bold text-sm uppercase tracking-widest bg-white/5 px-6 py-3 rounded-full border border-gold/20 hover:border-gold">
              View All Events <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16">
            {events.slice(0, 2).map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate rounded-[2.5rem] overflow-hidden border border-gold/10 hover:border-gold/30 transition-all duration-500 group"
              >
                <div className="aspect-video bg-navy flex items-center justify-center text-8xl sm:text-9xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/20 to-transparent opacity-80" />
                  <span className="drop-shadow-2xl group-hover:scale-110 transition-transform duration-700">{event.image_icon}</span>
                  <div className="absolute top-6 right-6 bg-gold text-midnight px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase shadow-xl">
                    {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div className="p-8 sm:p-12 space-y-8 sm:space-y-10">
                  <h3 className="font-serif text-3xl sm:text-4xl text-white line-clamp-1 leading-tight">{event.title}</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gold/10 rounded-full flex items-center justify-center text-3xl sm:text-4xl border border-gold/20 shadow-inner">
                      {event.image_icon}
                    </div>
                    <div>
                      <p className="font-bold text-gold text-lg sm:text-xl">{event.celebrity_name}</p>
                      <p className="text-xs sm:text-sm text-gold/60 uppercase tracking-[3px] font-medium">{event.celebrity_title}</p>
                    </div>
                  </div>
                  <div className="relative pt-4">
                    <Quote className="absolute -top-6 -left-6 w-12 h-12 sm:w-16 sm:h-16 text-gold/5" />
                    <p className="text-lg sm:text-xl text-white/60 italic leading-relaxed pl-8 border-l-4 border-gold/20">
                      "{event.quote}"
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
          </>
        } />

        <Route path="/e-library" element={
          <>
            {/* Books Grid */}
            <section id="books" className="py-24 sm:py-32 max-w-7xl mx-auto px-6 scroll-mt-20">
        <div className="text-center mb-16 sm:mb-20 space-y-6">
          <div className="space-y-4">
            <span className="text-gold text-xs sm:text-sm font-bold tracking-[4px] uppercase">Featured Collection</span>
            <h2 className="font-serif text-3xl sm:text-5xl text-white">Books by Dolat Khan Kakar</h2>
            <p className="text-gold/60 max-w-2xl mx-auto text-sm sm:text-base">Discover stories, wisdom, and knowledge from one of Pakistan's finest authors</p>
          </div>

          <div className="max-w-xl mx-auto relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gold/40 group-focus-within:text-gold transition-colors" />
            <input 
              type="text"
              placeholder="Search by title, author, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-gold/10 rounded-2xl py-4 pl-16 pr-6 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 focus:bg-white/10 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
          {filteredBooks.map(({ item: book, matches }, i) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <div className="bg-slate aspect-[3/4] rounded-[2.5rem] overflow-hidden border border-gold/10 relative group-hover:border-gold/50 transition-all duration-500 group-hover:-translate-y-3 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div 
                  onClick={() => setSelectedBook(book)}
                  className="w-full h-full flex items-center justify-center text-8xl sm:text-9xl group-hover:scale-110 transition-transform duration-700 overflow-hidden"
                >
                  {book.cover_icon.startsWith('http') ? (
                    <img src={book.cover_icon} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <span className="drop-shadow-[0_20px_20px_rgba(0,0,0,0.4)]">{book.cover_icon}</span>
                  )}
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(book.id);
                  }}
                  className={`absolute top-6 left-6 p-3 rounded-xl backdrop-blur-md border transition-all duration-300 ${favorites.includes(book.id.toString()) ? 'bg-accent text-white border-accent' : 'bg-white/5 text-white/40 border-white/10 hover:text-gold hover:border-gold'}`}
                >
                  <Heart className={`w-5 h-5 ${favorites.includes(book.id.toString()) ? 'fill-current' : ''}`} />
                </button>

                {book.is_bestseller && (
                  <div className="absolute top-6 right-6">
                    <span className="bg-accent text-white text-[10px] px-4 py-2 rounded-full font-bold uppercase tracking-widest shadow-lg shadow-accent/20">Bestseller</span>
                  </div>
                )}
                <div className="absolute bottom-8 left-8 right-8 opacity-0 group-hover:opacity-100 transition-all translate-y-6 group-hover:translate-y-0 duration-500">
                  <button 
                    onClick={() => setSelectedBook(book)}
                    className="w-full bg-gold text-midnight py-4 rounded-2xl font-bold flex items-center justify-center gap-3 text-sm shadow-xl shadow-gold/20"
                  >
                    View Details <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-8 space-y-3 px-2">
                <div className="flex items-center gap-3">
                  <span className="text-gold text-[10px] font-bold uppercase tracking-[3px]">
                    <Highlight text={book.category} matches={matches?.filter(m => m.key === 'category')} />
                  </span>
                  <div className="h-px flex-1 bg-gold/10" />
                </div>
                <h3 className="font-serif text-2xl text-white group-hover:text-gold transition-colors line-clamp-1 leading-tight">
                  <Highlight text={book.title} matches={matches?.filter(m => m.key === 'title')} />
                </h3>
                
                {readingProgress[book.id.toString()] !== undefined && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                      <span>Progress</span>
                      <span>{readingProgress[book.id.toString()]}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${readingProgress[book.id.toString()]}%` }}
                        className="h-full bg-gold"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-white/40 text-sm font-medium">
                    by <Highlight text={book.author} matches={matches?.filter((m: any) => m.key === 'author')} />
                  </span>
                  <div className="flex gap-2">
                    {book.is_audiobook && <Music className="w-4 h-4 text-gold/40" />}
                    <FileText className="w-4 h-4 text-gold/40" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5">
                    {(book.formats || ['PDF', 'EPUB']).map(f => (
                      <span key={f} className="text-[8px] font-bold text-gold/40 border border-gold/10 px-1.5 py-0.5 rounded uppercase">{f}</span>
                    ))}
                  </div>
                  <span className="text-gold font-bold text-lg">Rs. {book.price}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {filteredBooks.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gold/5 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-10 h-10 text-gold/20" />
            </div>
            <p className="text-gold/40 text-lg">No books found matching "{searchQuery}"</p>
          </div>
        )}
      </section>
          </>
        } />

        <Route path="/audiobooks" element={
          <>
            {/* Audiobooks */}
            <section id="audiobooks" className="bg-slate py-24 sm:py-32 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 sm:mb-20 space-y-4">
            <span className="text-gold text-xs sm:text-sm font-bold tracking-[4px] uppercase">Listen Anywhere</span>
            <h2 className="font-serif text-3xl sm:text-5xl text-white">Audiobook Collection</h2>
            <p className="text-gold/60 max-w-2xl mx-auto text-sm sm:text-base">Professional narrations of your favorite books. Perfect for multitasking.</p>
          </div>

          <div className="space-y-8 sm:space-y-10">
            {books.filter(b => b.is_audiobook).map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-midnight p-8 sm:p-10 rounded-[2.5rem] border border-gold/10 flex flex-col md:flex-row items-center gap-8 sm:gap-12 hover:border-gold/40 transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                <div className="w-40 h-40 sm:w-48 sm:h-48 bg-navy rounded-3xl flex items-center justify-center text-6xl sm:text-7xl shadow-2xl group-hover:scale-105 transition-transform duration-700 overflow-hidden relative z-10">
                  {book.cover_icon.startsWith('http') ? (
                    <img src={book.cover_icon} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <span className="drop-shadow-2xl">{book.cover_icon}</span>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left space-y-4 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <h3 className="font-serif text-3xl sm:text-4xl text-white">{book.title}</h3>
                    <span className="inline-flex items-center gap-2 text-accent text-[10px] font-bold uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-full border border-accent/20 w-fit mx-auto md:mx-0">
                      <Headphones className="w-3 h-3" /> Audiobook
                    </span>
                  </div>
                  <p className="text-gold/60 text-base sm:text-lg">Narrated by Professional Voice Artists • {book.audio_duration}</p>
                  <div className="flex items-center justify-center md:justify-start gap-6 pt-4">
                    <button 
                      onClick={() => handlePremiumAction(() => setPlayingAudiobook(book))}
                      className="w-14 h-14 sm:w-16 sm:h-16 bg-gold text-midnight rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl shadow-gold/30 group/play"
                    >
                      <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-gold font-bold text-sm">Listen to Sample</span>
                      <span className="text-white/40 text-xs">High Quality Audio</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center md:items-end gap-4 sm:gap-6 w-full md:w-auto mt-6 md:mt-0 relative z-10">
                  <div className="text-center md:text-right">
                    <span className="text-white/40 text-xs line-through block">Rs. {book.price}</span>
                    <span className="text-3xl sm:text-4xl font-bold text-white">Rs. {Math.floor(book.price * 0.7)}</span>
                  </div>
                  <button 
                    onClick={() => navigate('/subscriptions')}
                    className="w-full md:w-auto bg-white/5 border border-gold/20 text-gold px-10 py-4 rounded-2xl font-bold hover:bg-gold hover:text-midnight transition-all duration-300 text-sm sm:text-base shadow-xl"
                  >
                    Buy Audiobook
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
          </>
        } />

        <Route path="/events" element={
          <>
            {/* Events Gallery */}
            <section id="events" className="py-24 sm:py-32 max-w-7xl mx-auto px-6 scroll-mt-20">
        <div className="text-center mb-16 sm:mb-20 space-y-4">
          <span className="text-gold text-xs sm:text-sm font-bold tracking-[4px] uppercase">Literary Events</span>
          <h2 className="font-serif text-3xl sm:text-5xl text-white">Celebrity Book Launches</h2>
          <p className="text-gold/60 max-w-2xl mx-auto text-sm sm:text-base">Presenting books to Pakistan's most influential personalities</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-slate rounded-[2.5rem] overflow-hidden border border-gold/10 hover:border-gold/30 transition-all duration-500 group"
            >
              <div className="aspect-video bg-navy flex items-center justify-center text-8xl sm:text-9xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/20 to-transparent opacity-80" />
                <span className="drop-shadow-2xl group-hover:scale-110 transition-transform duration-700">{event.image_icon}</span>
                <div className="absolute top-6 right-6 bg-gold text-midnight px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase shadow-xl">
                  {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div className="p-8 sm:p-12 space-y-8 sm:space-y-10">
                <h3 className="font-serif text-3xl sm:text-4xl text-white line-clamp-1 leading-tight">{event.title}</h3>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gold/10 rounded-full flex items-center justify-center text-3xl sm:text-4xl border border-gold/20 shadow-inner">
                    {event.image_icon}
                  </div>
                  <div>
                    <p className="font-bold text-gold text-lg sm:text-xl">{event.celebrity_name}</p>
                    <p className="text-xs sm:text-sm text-gold/60 uppercase tracking-[3px] font-medium">{event.celebrity_title}</p>
                  </div>
                </div>
                <div className="relative pt-4">
                  <Quote className="absolute -top-6 -left-6 w-12 h-12 sm:w-16 sm:h-16 text-gold/5" />
                  <p className="text-lg sm:text-xl text-white/60 italic leading-relaxed pl-8 border-l-4 border-gold/20">
                    "{event.quote}"
                  </p>
                </div>
                <button 
                  onClick={() => navigate('/subscriptions')}
                  className="w-full border-2 border-gold/20 text-gold py-4 sm:py-5 rounded-2xl font-bold hover:bg-gold hover:text-midnight transition-all duration-300 text-sm sm:text-base shadow-lg"
                >
                  View Full Event Gallery
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
          </>
        } />

        <Route path="/subscriptions" element={
          <>
            {/* Subscription Guide */}
            <section className="py-24 bg-midnight relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate rounded-[3rem] p-12 sm:p-20 border border-gold/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-[100px] -mr-48 -mt-48" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-gold text-xs font-bold tracking-[4px] uppercase">Member Benefits</span>
                  <h2 className="font-serif text-4xl sm:text-5xl text-white">Why Subscribe to Kitabon Ki Dolat?</h2>
                </div>
                <div className="space-y-6">
                  {[
                    { icon: Zap, title: 'Instant Access', desc: 'Read any book from our 2000+ collection instantly on any device.' },
                    { icon: ShieldCheck, title: 'Verified Content', desc: 'Authentic publications directly from Dolat Khan Kakar.' },
                    { icon: Download, title: 'Offline Reading', desc: 'Download your favorite books and read them without internet.' },
                    { icon: Award, title: 'Exclusive Events', desc: 'Priority invites to celebrity book launches and literary meets.' }
                  ].map((benefit, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-gold/20">
                        <benefit.icon className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg">{benefit.title}</h4>
                        <p className="text-white/40 text-sm">{benefit.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square bg-midnight rounded-[3rem] border border-gold/20 p-8 flex flex-col justify-center items-center text-center space-y-8 shadow-2xl">
                  <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center">
                    <Trophy className="w-12 h-12 text-gold" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-serif text-white">Start Your Journey Today</h3>
                    <p className="text-white/40 text-sm">Join 50,000+ readers across Pakistan</p>
                  </div>
                  <button onClick={() => navigate('/subscriptions')} className="btn-primary w-full">View All Plans</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscriptions */}
      <section id="subscriptions" className="bg-slate py-24 sm:py-32 border-t-2 border-gold scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 sm:mb-20 space-y-4">
            <span className="text-gold text-xs sm:text-sm font-bold tracking-[4px] uppercase">Premium Access</span>
            <h2 className="font-serif text-3xl sm:text-5xl text-white">Unlimited Reading Plans</h2>
            <p className="text-gold/60 max-w-2xl mx-auto text-sm sm:text-base">Get access to everything above with our affordable membership plans</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 sm:gap-12">
            {subs.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative p-10 sm:p-12 rounded-[3rem] border-2 transition-all duration-500 hover:-translate-y-4 ${sub.is_popular ? 'bg-gradient-to-br from-slate via-slate to-gold/5 border-gold shadow-[0_30px_60px_-15px_rgba(212,175,55,0.15)]' : 'bg-midnight border-gold/10 hover:border-gold/30'}`}
              >
                {sub.is_popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <span className="bg-gold text-midnight px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-[4px] shadow-2xl shadow-gold/20">Most Popular</span>
                  </div>
                )}
                <div className="space-y-8 sm:space-y-10">
                  <div className="space-y-2">
                    <h3 className="font-serif text-3xl sm:text-4xl text-white">{sub.name}</h3>
                    <p className="text-gold/40 text-xs uppercase tracking-widest font-bold">Premium Reading Experience</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl sm:text-7xl font-bold text-gold">Rs. {sub.price}</span>
                    <span className="text-gold/60 font-medium text-lg">/{sub.duration}</span>
                  </div>
                  <div className="h-px bg-gold/10 w-full" />
                  <ul className="space-y-5">
                    {sub.features.split(',').map((feature, j) => (
                      <li key={j} className="flex items-center gap-4 text-white/70">
                        <div className="w-6 h-6 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0 border border-gold/20">
                          <Check className="w-3.5 h-3.5 text-gold" />
                        </div>
                        <span className="text-sm sm:text-base font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a 
                    href={sub.whatsapp_link || `https://wa.me/923000000000?text=I'm interested in the ${sub.name} plan`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-300 shadow-2xl text-center block ${sub.is_popular ? 'bg-gold text-midnight hover:bg-gold-bright shadow-gold/30' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                  >
                    Subscribe Now
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
          </>
        } />

        <Route path="/about" element={
          <>
            {/* About Section */}
            <section id="about" className="py-24 sm:py-32 scroll-mt-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-[3rem] overflow-hidden border-2 border-gold/20 shadow-2xl relative z-10">
                <img 
                  src="https://picsum.photos/seed/author/800/1000" 
                  alt="Dolat Khan Kakar" 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-midnight via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl -z-10" />
              <div className="absolute -top-10 -left-10 w-40 h-40 border-t-4 border-l-4 border-gold/20 rounded-tl-[3rem]" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-10"
            >
              <div className="space-y-4">
                <span className="text-gold text-xs sm:text-sm font-bold tracking-[4px] uppercase">The Visionary</span>
                <h2 className="font-serif text-4xl sm:text-6xl text-white leading-tight">Dolat Khan Kakar</h2>
                <p className="text-gold/60 text-xl font-medium italic">"Knowledge is the only wealth that grows when shared."</p>
              </div>

              <div className="space-y-6 text-white/60 text-lg leading-relaxed">
                <p>
                  Dolat Khan Kakar is a visionary author and publisher dedicated to the intellectual 
                  empowerment of Pakistan. With over two decades of experience in literature and 
                  community service, he has authored numerous bestsellers that explore the intersection 
                  of culture, wisdom, and modern progress.
                </p>
                <p>
                  His mission through "Kitabon Ki Dolat" is to create a digital sanctuary where 
                  quality Urdu and English literature is accessible to everyone, regardless of 
                  their geographical location. He believes that by fostering a culture of reading, 
                  we can build a more enlightened and prosperous society.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6">
                <div className="space-y-2">
                  <TrendingUp className="text-gold w-8 h-8" />
                  <h4 className="text-white font-bold">100+ Books</h4>
                  <p className="text-white/40 text-sm">Authored & Published</p>
                </div>
                <div className="space-y-2">
                  <Clock className="text-gold w-8 h-8" />
                  <h4 className="text-white font-bold">20+ Years</h4>
                  <p className="text-white/40 text-sm">Literary Excellence</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
          </>
        } />
      </Routes>

      {/* Footer */}
      <footer className="bg-midnight pt-32 sm:pt-40 pb-16 border-t border-gold/10 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-gold/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-24 mb-24 sm:mb-32">
            <div className="col-span-1 sm:col-span-2 space-y-10">
              <div className="flex flex-col items-start group cursor-pointer">
                <div className="relative">
                  <span className="font-urdu text-6xl sm:text-7xl text-gold drop-shadow-2xl transition-transform duration-500 group-hover:scale-105 pt-6 pb-4">کتابوں کی دولت</span>
                  <div className="absolute -inset-4 bg-gold/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <div className="h-[1px] w-12 bg-gradient-to-r from-gold/80 to-transparent" />
                  <span className="text-sm sm:text-base text-gold/90 tracking-[8px] uppercase font-bold drop-shadow-md">Kitabon Ki Dolat</span>
                  <div className="h-[1px] w-12 bg-gradient-to-l from-gold/80 to-transparent" />
                </div>
              </div>
              <p className="text-white/50 text-lg sm:text-xl leading-relaxed max-w-xl font-medium">
                Dolat Khan Kakar is a celebrated Pakistani author, publisher, and advocate for literacy. 
                His mission is to make quality literature accessible to every Pakistani household.
              </p>
              <div className="flex gap-4 sm:gap-6">
                {[
                  { icon: Facebook, href: '#', label: 'Facebook' },
                  { icon: Twitter, href: '#', label: 'Twitter' },
                  { icon: Instagram, href: 'https://www.instagram.com/dolatkhankakar_', label: 'Instagram' },
                  { icon: Youtube, href: '#', label: 'Youtube' }
                ].map((social, i) => (
                  <motion.a 
                    key={i} 
                    href={social.href} 
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -5, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white/60 hover:bg-gold hover:text-midnight transition-all duration-300 border border-white/10 hover:border-gold shadow-lg hover:shadow-gold/20"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </motion.a>
                ))}
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <h4 className="text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs">Quick Links</h4>
              <ul className="space-y-3 sm:space-y-4">
                {[
                  { label: 'Home', path: '/' },
                  { label: 'Books', path: '/e-library' },
                  { label: 'Audiobooks', path: '/audiobooks' },
                  { label: 'Events', path: '/events' },
                  { label: 'About', path: '/about' }
                ].map(link => (
                  <li key={link.label}>
                    <Link to={link.path} className="text-white/40 hover:text-gold transition-colors text-sm sm:text-base">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <h4 className="text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs">Contact</h4>
              <ul className="space-y-3 sm:space-y-4 text-white/40 text-sm sm:text-base">
                <li>Quetta, Balochistan, Pakistan</li>
                <li>contact@kitabondolat.com</li>
                <li>+92 300 1234567</li>
              </ul>
            </div>
          </div>

          <div className="pt-10 sm:pt-12 border-t border-gold/5 flex flex-col md:flex-row justify-between items-center gap-6 text-white/20 text-[10px] sm:text-xs">
            <p>© 2026 Kitabon Ki Dolat. All rights reserved.</p>
            <div className="flex gap-6 sm:gap-10">
              <Link to="#" className="hover:text-gold transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-gold transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <a 
        href="https://wa.me/923000000000" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-[2000] w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="absolute right-full mr-4 bg-white text-midnight px-4 py-2 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-gold/10">
          Chat with us on WhatsApp
        </span>
      </a>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {showPaymentGuide && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentGuide(false)}
              className="absolute inset-0 bg-midnight/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate border border-gold/20 rounded-[32px] p-8 text-center shadow-2xl"
            >
              <button 
                onClick={() => setShowPaymentGuide(false)}
                className="absolute top-4 right-4 bg-white/5 p-2 rounded-full text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-gold" />
              </div>
              
              <h2 className="font-serif text-2xl text-white mb-2">Premium Access Required</h2>
              <p className="text-white/60 mb-8 text-sm">
                To access full premium books and audiobooks, you need an active membership. 
              </p>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left space-y-4">
                <h3 className="text-gold font-bold uppercase tracking-widest text-xs">Payment Guide</h3>
                <div className="space-y-4 text-sm text-white/80">
                  <p>1. Send Rs. 500 via <strong className="text-white">EasyPaisa</strong> or <strong className="text-white">JazzCash</strong> to:</p>
                  <p className="text-center font-mono text-xl text-gold font-bold tracking-wider bg-midnight/50 py-3 rounded-xl border border-gold/10">0300-1234567</p>
                  <p>2. Take a screenshot of your successful transaction.</p>
                  <p>3. Send the screenshot along with your email (<span className="text-gold">{user?.email || 'your email'}</span>) to our WhatsApp.</p>
                </div>
              </div>
              
              <a 
                href={`https://wa.me/923001234567?text=Hi, I would like to upgrade my account. My email is ${user?.email || ''}. Here is the payment screenshot:`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5 fill-current" /> Send WhatsApp Message
              </a>
            </motion.div>
          </div>
        )}
        {playingAudiobook && (
          <Suspense key="audio-player" fallback={<div className="fixed inset-0 z-[6000] bg-midnight/80 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-10 h-10 text-gold animate-spin" /></div>}>
            <AudioPlayer 
              book={playingAudiobook} 
              onClose={() => setPlayingAudiobook(null)} 
            />
          </Suspense>
        )}
        {selectedBook && (
          <div key={selectedBook.id} className="fixed inset-0 z-[5000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBook(null)}
              className="fixed inset-0 bg-midnight/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-5xl bg-slate border border-gold/20 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl my-auto"
            >
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10 w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-full flex items-center justify-center text-white/60 hover:bg-accent hover:text-white transition-all"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-5 h-[90vh] md:h-[80vh]">
                <div className="bg-navy md:col-span-2 flex items-center justify-center p-12 sm:p-20 relative overflow-hidden group h-64 md:h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent opacity-50" />
                  <div className="relative z-10 drop-shadow-[0_45px_45px_rgba(0,0,0,0.6)] transform group-hover:scale-105 transition-transform duration-700 w-full h-full flex items-center justify-center">
                    {selectedBook.cover_icon.startsWith('http') ? (
                      <img src={selectedBook.cover_icon} alt={selectedBook.title} className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-[8rem] sm:text-[12rem] leading-none select-none">
                        {selectedBook.cover_icon}
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center text-white/20 hidden md:flex">
                    <BookOpen className="w-8 h-8" />
                    <span className="font-serif italic text-sm tracking-widest">Kitabon Ki Dolat</span>
                  </div>
                </div>
                <div className="md:col-span-3 p-6 sm:p-10 lg:p-14 flex flex-col h-[calc(90vh-16rem)] md:h-full overflow-y-auto border-l border-white/5 scroll-smooth">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-gold/10 text-gold px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-gold/20">
                          <Highlight text={selectedBook.category} matches={selectedBookMatches?.filter((m: any) => m.key === 'category')} />
                        </span>
                        {selectedBook.is_bestseller && (
                          <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-accent/20">
                            Bestseller
                          </span>
                        )}
                      </div>
                      <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
                        <Highlight text={selectedBook.title} matches={selectedBookMatches?.filter((m: any) => m.key === 'title')} />
                      </h2>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center text-gold font-bold">
                          {selectedBook.author.charAt(0)}
                        </div>
                        <p className="text-xl text-gold/80 font-medium">by <Highlight text={selectedBook.author} matches={selectedBookMatches?.filter((m: any) => m.key === 'author')} /></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 py-4 border-y border-white/5">
                      <div className="flex items-center gap-1 text-gold">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 sm:w-5 sm:h-5 ${i < Math.round(averageRating) ? 'fill-current' : 'opacity-30'}`} />
                        ))}
                      </div>
                      <div className="h-4 w-px bg-white/10" />
                      <span className="text-white/40 text-xs sm:text-sm font-medium tracking-wide">
                        {bookReviews.length > 0 
                          ? `${averageRating.toFixed(1)} (${bookReviews.length} Verified Review${bookReviews.length !== 1 ? 's' : ''})`
                          : 'No Reviews Yet'}
                      </span>
                    </div>

                    {/* Action Buttons moved up */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3 hover:border-gold transition-colors flex flex-col justify-between">
                        <div>
                          <span className="text-gold text-[10px] font-bold uppercase tracking-widest">Digital Access</span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-white">Premium</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handlePremiumAction(() => {
                             if (selectedBook.is_audiobook) {
                               setSelectedBook(null);
                               setPlayingAudiobook(selectedBook);
                             } else {
                               alert("Book Guide: You can now access the full E-Book from your library. Format options will appear shortly.");
                             }
                          })}
                          className="w-full bg-gold text-midnight py-3 rounded-xl font-bold hover:bg-gold-bright transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          {selectedBook.is_audiobook ? <Play className="w-4 h-4 fill-current" /> : <BookOpen className="w-4 h-4" />} Access Now
                        </button>
                      </div>
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3 hover:border-accent transition-colors flex flex-col justify-between">
                        <div>
                          <span className="text-accent text-[10px] font-bold uppercase tracking-widest">Print Edition</span>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-white">Rs. {Math.floor(selectedBook.price * 1.5)}</span>
                          </div>
                        </div>
                        <a 
                          href={`https://wa.me/923001234567?text=Hi, I would like to order the print edition of "${selectedBook.title}".`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full bg-white/10 text-white border border-white/20 py-3 rounded-xl font-bold hover:bg-accent hover:border-accent hover:scale-[1.02] transition-all text-sm flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" /> Order via WhatsApp
                        </a>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-white font-bold uppercase tracking-widest text-[10px]">Synopsis</h4>
                      <p className="text-white/60 leading-relaxed text-sm sm:text-base">
                        <Highlight text={selectedBook.description} matches={selectedBookMatches?.filter((m: any) => m.key === 'description')} />
                      </p>
                    </div>

                    {selectedBook.author_bio && (
                      <div className="space-y-4">
                        <h4 className="text-white font-bold uppercase tracking-widest text-[10px]">About the Author</h4>
                        <p className="text-white/40 leading-relaxed text-sm italic">
                          <Highlight text={selectedBook.author_bio} matches={selectedBookMatches?.filter((m: any) => m.key === 'author_bio')} />
                        </p>
                      </div>
                    )}

                    {user && (
                      <div className="space-y-4 p-5 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center">
                          <h4 className="text-gold font-bold uppercase tracking-widest text-[10px]">Your Reading Progress</h4>
                          <span className="text-gold font-bold text-sm">{readingProgress[selectedBook.id.toString()] || 0}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={readingProgress[selectedBook.id.toString()] || 0}
                          onChange={(e) => updateProgress(selectedBook.id, parseInt(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-gold"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-6 border-y border-white/5">
                      {[
                        { label: 'Format', value: selectedBook.is_audiobook ? 'Audio & E-Book' : 'E-Book Only' },
                        { label: 'Language', value: 'Urdu / English' },
                        { label: 'Delivery', value: 'Instant Access' },
                      ].map((detail, idx) => (
                        <div key={idx} className="space-y-1">
                          <p className="text-[10px] text-gold/40 uppercase font-bold tracking-widest">{detail.label}</p>
                          <p className="text-sm text-white/80 font-medium">{detail.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-bold uppercase tracking-widest text-[10px]">Reader Reviews</h4>
                        <div className="flex items-center gap-2 text-gold">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-bold">
                            {bookReviews.length > 0 
                              ? averageRating.toFixed(1)
                              : 'No ratings yet'}
                          </span>
                        </div>
                      </div>

                      {user ? (
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-bold text-sm">Rate this book</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setNewRating(star)}
                                  className={`transition-colors ${star <= newRating ? 'text-gold' : 'text-white/20'}`}
                                >
                                  <Star className={`w-6 h-6 ${star <= newRating ? 'fill-current' : ''}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="relative">
                            <textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Share your thoughts about this book..."
                              className="w-full bg-midnight border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-gold transition-colors resize-none h-24"
                            />
                            <button
                              onClick={submitReview}
                              disabled={isSubmittingReview || !newComment.trim()}
                              className="absolute bottom-4 right-4 bg-gold text-midnight p-2 rounded-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:scale-100"
                            >
                              {isSubmittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                          <p className="text-white/40 text-sm mb-4">Sign in to leave a review and rate this book</p>
                          <button 
                            onClick={signInWithGoogle}
                            className="bg-gold text-midnight px-6 py-2 rounded-full font-bold text-sm"
                          >
                            Sign In
                          </button>
                        </div>
                      )}

                      <div className="space-y-6">
                        {bookReviews.map((review) => (
                          <div key={review.id} className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <img src={review.userPhoto} alt="" className="w-8 h-8 rounded-full border border-gold/20" />
                                <div>
                                  <p className="text-white font-bold text-sm">{review.userName}</p>
                                  <div className="flex gap-0.5 text-gold">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'opacity-20'}`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-white/20">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-white/60 text-sm leading-relaxed pl-11">
                              {review.comment}
                            </p>
                          </div>
                        ))}
                        {bookReviews.length === 0 && (
                          <p className="text-center text-white/20 py-8 italic text-sm">Be the first to review this book!</p>
                        )}
                      </div>
                    </div>

                    {similarBooks.length > 0 && (
                      <div className="space-y-6 pt-8 border-t border-white/5">
                        <h4 className="text-white font-bold uppercase tracking-widest text-[10px]">Similar Books</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {similarBooks.map((book) => (
                            <div 
                              key={book.id} 
                              className="cursor-pointer group"
                              onClick={() => setSelectedBook(book)}
                            >
                              <div className="bg-slate aspect-[3/4] rounded-xl overflow-hidden border border-gold/10 relative group-hover:border-gold/50 transition-all shadow-lg mb-2">
                                {book.cover_icon.startsWith('http') ? (
                                  <img src={book.cover_icon} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-4xl select-none">
                                    {book.cover_icon}
                                  </div>
                                )}
                              </div>
                              <h5 className="text-white text-xs font-bold truncate">{book.title}</h5>
                              <p className="text-white/40 text-[10px] truncate">{book.author}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </ErrorBoundary>
  );
}
