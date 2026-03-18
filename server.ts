import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

const db = new Database('database.sqlite');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_COOKIE_NAME = 'admin_session';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT DEFAULT 'Dolat Khan Kakar',
    author_bio TEXT,
    category TEXT,
    price INTEGER,
    description TEXT,
    cover_icon TEXT,
    is_bestseller BOOLEAN DEFAULT 0,
    is_audiobook BOOLEAN DEFAULT 0,
    audio_duration TEXT,
    formats TEXT DEFAULT 'PDF,EPUB',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    celebrity_name TEXT,
    celebrity_title TEXT,
    event_date TEXT,
    quote TEXT,
    image_icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER,
    duration TEXT,
    features TEXT,
    is_popular BOOLEAN DEFAULT 0,
    whatsapp_link TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial data if empty
const bookCount = db.prepare('SELECT count(*) as count FROM books').get() as { count: number };
if (bookCount.count === 0) {
  const insertBook = db.prepare('INSERT INTO books (title, author_bio, category, price, description, cover_icon, is_bestseller, is_audiobook, audio_duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertBook.run('The Silent Echo', 'Dolat Khan Kakar is a master of suspense and cultural storytelling, deeply rooted in the traditions of Balochistan.', 'Fiction • Thriller', 1299, 'A gripping thriller about the secrets hidden in the mountains of Balochistan.', '📖', 1, 1, '8h 32m');
  insertBook.run('Mindful Leadership', 'Dolat Khan Kakar is a visionary leader and psychologist who has spent decades studying the human mind.', 'Self-Help', 1599, 'Transform your leadership style with ancient wisdom and modern psychology.', '📚', 1, 1, '6h 15m');
  insertBook.run('Khwahishon Ki Baarish', 'Dolat Khan Kakar is a renowned poet whose verses capture the raw emotions of the human experience.', 'Poetry • Urdu', 999, 'A beautiful collection of Urdu poetry reflecting the soul of the desert.', '📕', 0, 0, null);
  insertBook.run('Building Fortune', 'Dolat Khan Kakar is a financial expert and entrepreneur who has helped thousands build wealth.', 'Business • Finance', 1799, 'The ultimate guide to building generational wealth in Pakistan.', '📗', 0, 0, null);
  insertBook.run('Constitution of Pakistan', 'Dolat Khan Kakar provides a detailed commentary on the constitutional framework of Pakistan.', 'Case Laws • Legal', 2500, 'A comprehensive guide to the Constitution of Pakistan with landmark case laws.', '⚖️', 1, 0, null);
  insertBook.run('Landmark Judgments', 'Dolat Khan Kakar analyzes the most significant judgments in the history of the Supreme Court.', 'Case Laws • Legal', 2200, 'An essential collection for legal practitioners and students.', '📜', 0, 1, '12h 45m');

  const insertEvent = db.prepare('INSERT INTO events (title, celebrity_name, celebrity_title, event_date, quote, image_icon) VALUES (?, ?, ?, ?, ?, ?)');
  insertEvent.run('Supreme Court Book Launch', 'Justice Qazi Faez Isa', 'Chief Justice of Pakistan', '2025-12-15', 'This book brilliantly captures the essence of Pakistani jurisprudence...', '👨‍⚖️');
  insertEvent.run('Celebrity Meet', 'Mahira Khan', 'Leading Actor', '2025-11-22', 'Dolat\'s storytelling transported me to another world. A must-read!', '🌟');

  const insertSub = db.prepare('INSERT INTO subscriptions (name, price, duration, features, is_popular, whatsapp_link) VALUES (?, ?, ?, ?, ?, ?)');
  insertSub.run('Monthly', 499, 'month', 'Full E-Library access,Unlimited downloads,Audio book streaming', 0, 'https://wa.me/923000000000?text=I want to subscribe to the Monthly plan');
  insertSub.run('Half-Yearly', 2399, '6 months', 'Everything in Quarterly,1 signed paperback free,Private community access', 1, 'https://wa.me/923000000000?text=I want to subscribe to the Half-Yearly plan');
}

const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (email, role) VALUES (?, ?)');
  insertUser.run('kashifharryseller@gmail.com', 'admin');
  insertUser.run('reader@example.com', 'user');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const isAdmin = (req: any) => {
    return req.cookies[SESSION_COOKIE_NAME] === 'authenticated';
  };

  const adminOnly = (req: any, res: any, next: any) => {
    if (isAdmin(req)) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // API Routes
  app.get('/api/books', (req, res) => {
    const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
    res.json(books);
  });

  app.post('/api/books', adminOnly, (req, res) => {
    const { title, author, author_bio, category, price, description, cover_icon, is_bestseller, is_audiobook, audio_duration } = req.body;
    const info = db.prepare('INSERT INTO books (title, author, author_bio, category, price, description, cover_icon, is_bestseller, is_audiobook, audio_duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(title, author || 'Dolat Khan Kakar', author_bio, category, price, description, cover_icon, is_bestseller ? 1 : 0, is_audiobook ? 1 : 0, audio_duration);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete('/api/books/:id', adminOnly, (req, res) => {
    db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put('/api/books/:id', adminOnly, (req, res) => {
    const { title, author, author_bio, category, price, description, cover_icon, is_bestseller, is_audiobook, audio_duration } = req.body;
    db.prepare('UPDATE books SET title = ?, author = ?, author_bio = ?, category = ?, price = ?, description = ?, cover_icon = ?, is_bestseller = ?, is_audiobook = ?, audio_duration = ? WHERE id = ?')
      .run(title, author, author_bio, category, price, description, cover_icon, is_bestseller ? 1 : 0, is_audiobook ? 1 : 0, audio_duration, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/events', (req, res) => {
    const events = db.prepare('SELECT * FROM events ORDER BY event_date DESC').all();
    res.json(events);
  });

  app.post('/api/events', adminOnly, (req, res) => {
    const { title, celebrity_name, celebrity_title, event_date, quote, image_icon } = req.body;
    const info = db.prepare('INSERT INTO events (title, celebrity_name, celebrity_title, event_date, quote, image_icon) VALUES (?, ?, ?, ?, ?, ?)').run(title, celebrity_name, celebrity_title, event_date, quote, image_icon);
    res.json({ id: info.lastInsertRowid });
  });

  app.get('/api/subscriptions', (req, res) => {
    const subs = db.prepare('SELECT * FROM subscriptions').all();
    res.json(subs);
  });

  app.post('/api/subscriptions', adminOnly, (req, res) => {
    const { name, price, duration, features, is_popular, whatsapp_link } = req.body;
    const info = db.prepare('INSERT INTO subscriptions (name, price, duration, features, is_popular, whatsapp_link) VALUES (?, ?, ?, ?, ?, ?)').run(name, price, duration, features, is_popular ? 1 : 0, whatsapp_link);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/subscriptions/:id', adminOnly, (req, res) => {
    const { name, price, duration, features, is_popular, whatsapp_link } = req.body;
    db.prepare('UPDATE subscriptions SET name = ?, price = ?, duration = ?, features = ?, is_popular = ?, whatsapp_link = ? WHERE id = ?')
      .run(name, price, duration, features, is_popular ? 1 : 0, whatsapp_link, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/subscriptions/:id', adminOnly, (req, res) => {
    db.prepare('DELETE FROM subscriptions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/admin/users', adminOnly, (req, res) => {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json(users);
  });

  app.get('/api/stats', (req, res) => {
    const bookCount = db.prepare('SELECT count(*) as count FROM books').get() as any;
    const eventCount = db.prepare('SELECT count(*) as count FROM events').get() as any;
    const userCount = db.prepare('SELECT count(*) as count FROM users').get() as any;
    res.json({
      books: bookCount.count,
      events: eventCount.count,
      users: userCount.count + 50000 // Adding the mock 50k happy readers
    });
  });

  // Admin Auth Routes
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.cookie(SESSION_COOKIE_NAME, 'authenticated', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  });

  app.get('/api/admin/check', (req, res) => {
    res.json({ authenticated: isAdmin(req) });
  });

  app.post('/api/admin/logout', (req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
