import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 4173);
const rootDir = __dirname;
const uploadDir = path.join(rootDir, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const IMAGE_SET = [
  'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=85'
];

const seedPostData = [
  ['Warm wood, quiet corners', 'A calm study nook built around natural light and tactile materials.', ['interiors', 'workspace'], 19],
  ['The Sunday reset', 'Simple rituals that make a home feel like a fresh start.', ['lifestyle', 'slow living'], 42],
  ['Build your dream desk', 'A practical setup for deep work, sketching, and everything in between.', ['workspace', 'productivity'], 31],
  ['Color story: sage + clay', 'A soft palette that adds warmth without taking over the room.', ['color', 'interiors'], 27],
  ['A better way to brainstorm', 'Turn a blank wall into a visual thinking space.', ['ideas', 'creative'], 54],
  ['Tiny garden, big joy', 'Low-maintenance greens for small apartments and busy weeks.', ['plants', 'home'], 23],
  ['Light that changes a room', 'Layered lighting ideas for evenings that feel a little more intentional.', ['interiors', 'lighting'], 38],
  ['Weekend baking board', 'Notes from a very good focaccia experiment.', ['recipes', 'weekend'], 18],
  ['The maker shelf', 'Tools, objects, and little references worth keeping close.', ['creative', 'studio'], 36],
  ['A soft landing', 'Bedroom details that make rest feel like a real destination.', ['home', 'wellness'], 49],
  ['Notes from the coast', 'Textures, colors, and forms collected on a slow afternoon.', ['travel', 'inspiration'], 29],
  ['Make room for play', 'Design prompts for a more curious, less perfect creative practice.', ['creative', 'ideas'], 61]
];

let persistenceMode = 'memory';
let memorySeeded = false;
const memory = { users: [], boards: [], posts: [] };

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  bio: { type: String, default: 'Collecting little sparks of inspiration.' },
  avatar: { type: String, default: '' }
}, { timestamps: true });

const boardSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 40 },
  description: { type: String, default: '', maxlength: 160 },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  coverImage: { type: String, default: '' }
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, required: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  link: { type: String, default: '' },
  tags: [{ type: String, trim: true, lowercase: true }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Board = mongoose.models.Board || mongoose.model('Board', boardSchema);
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

const idOf = (value) => String(value?._id ?? value?.id ?? value);
const now = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function publicUser(user) {
  if (!user) return null;
  return { id: idOf(user), username: user.username, email: user.email, bio: user.bio || '', avatar: user.avatar || '' };
}

function ownerView(user) {
  return user ? { id: idOf(user), username: user.username, avatar: user.avatar || '' } : null;
}

function postView(post, currentUserId = '') {
  const owner = post.owner?.username ? ownerView(post.owner) : { id: String(post.ownerId || post.owner), username: post.ownerUsername || 'creator', avatar: post.ownerAvatar || '' };
  const likes = post.likes || [];
  const saves = post.saves || [];
  return {
    id: idOf(post), image: post.image, title: post.title, description: post.description || '', link: post.link || '', tags: post.tags || [],
    createdAt: post.createdAt, owner, likesCount: likes.length, savesCount: saves.length,
    isLiked: likes.some((id) => idOf(id) === String(currentUserId)), isSaved: saves.some((id) => idOf(id) === String(currentUserId))
  };
}

function boardView(board) {
  return { id: idOf(board), title: board.title, description: board.description || '', postsCount: (board.posts || []).length, coverImage: board.coverImage || '' };
}

async function seedMemory() {
  if (memorySeeded) return;
  const passwordHash = await bcrypt.hash('demo123', 10);
  const demo = { id: 'demo-user', username: 'demo', email: 'demo@pinnest.dev', passwordHash, bio: 'Collecting little sparks of inspiration.', avatar: 'https://i.pravatar.cc/120?img=12', createdAt: now() };
  const board = { id: 'demo-board', ownerId: demo.id, title: 'Saved ideas', description: 'A little shelf for future projects.', posts: [], coverImage: IMAGE_SET[0], createdAt: now() };
  memory.users.push(demo); memory.boards.push(board);
  seedPostData.forEach(([title, description, tags, likes], index) => {
    const post = { id: `demo-post-${index + 1}`, ownerId: demo.id, ownerUsername: demo.username, ownerAvatar: demo.avatar, image: IMAGE_SET[index], title, description, link: '', tags, likes: Array.from({ length: likes }, (_, i) => `seed-like-${index}-${i}`), saves: [], createdAt: new Date(Date.now() - index * 3600000).toISOString() };
    memory.posts.push(post);
  });
  memorySeeded = true;
}

async function seedMongo() {
  let demo = await User.findOne({ email: 'demo@pinnest.dev' });
  if (!demo) {
    demo = await User.create({ username: 'demo', email: 'demo@pinnest.dev', passwordHash: await bcrypt.hash('demo123', 10), bio: 'Collecting little sparks of inspiration.', avatar: 'https://i.pravatar.cc/120?img=12' });
  }
  let board = await Board.findOne({ owner: demo._id, title: 'Saved ideas' });
  if (!board) board = await Board.create({ owner: demo._id, title: 'Saved ideas', description: 'A little shelf for future projects.', coverImage: IMAGE_SET[0] });
  const count = await Post.countDocuments({ owner: demo._id });
  if (!count) {
    await Post.insertMany(seedPostData.map(([title, description, tags], index) => ({ owner: demo._id, image: IMAGE_SET[index], title, description, tags })));
  }
}

async function initPersistence() {
  if (!process.env.MONGODB_URI) {
    await seedMemory();
    console.log('Pinnest running in memory mode. Add MONGODB_URI for persistent data.');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 1800 });
    persistenceMode = 'mongo';
    await seedMongo();
    console.log('Connected to MongoDB.');
  } catch (error) {
    persistenceMode = 'memory';
    await seedMemory();
    console.warn(`MongoDB unavailable (${error.message}). Falling back to memory mode.`);
  }
}

async function findUserByEmail(email) {
  if (persistenceMode === 'mongo') return User.findOne({ email: email.toLowerCase() });
  return memory.users.find((user) => user.email === email.toLowerCase()) || null;
}

async function findUserById(id) {
  if (!id) return null;
  if (persistenceMode === 'mongo') return User.findById(id);
  return memory.users.find((user) => idOf(user) === String(id)) || null;
}

async function findUserByUsername(username) {
  if (persistenceMode === 'mongo') return User.findOne({ username });
  return memory.users.find((user) => user.username.toLowerCase() === username.toLowerCase()) || null;
}

async function createUser({ username, email, passwordHash, bio = '', avatar = '' }) {
  if (persistenceMode === 'mongo') {
    const user = await User.create({ username, email, passwordHash, bio, avatar });
    await Board.create({ owner: user._id, title: 'Saved ideas', description: 'A little shelf for future projects.' });
    return user;
  }
  const user = { id: makeId('user'), username, email: email.toLowerCase(), passwordHash, bio, avatar, createdAt: now() };
  const board = { id: makeId('board'), ownerId: user.id, title: 'Saved ideas', description: 'A little shelf for future projects.', posts: [], coverImage: '', createdAt: now() };
  memory.users.push(user); memory.boards.push(board);
  return user;
}

async function listPosts({ query = '', currentUserId = '' } = {}) {
  if (persistenceMode === 'mongo') {
    const filter = query ? { $or: [{ title: new RegExp(query, 'i') }, { description: new RegExp(query, 'i') }, { tags: new RegExp(query, 'i') }] } : {};
    const posts = await Post.find(filter).populate('owner', 'username avatar').sort({ createdAt: -1 }).limit(60).lean();
    return posts.map((post) => postView(post, currentUserId));
  }
  const term = query.toLowerCase();
  return memory.posts.filter((post) => !term || [post.title, post.description, ...(post.tags || []), post.ownerUsername].join(' ').toLowerCase().includes(term)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((post) => postView(post, currentUserId));
}

async function getPostById(id) {
  if (persistenceMode === 'mongo') return Post.findById(id);
  return memory.posts.find((post) => idOf(post) === String(id)) || null;
}

async function getBoardsForUser(userId) {
  if (persistenceMode === 'mongo') return (await Board.find({ owner: userId }).sort({ createdAt: -1 }).lean()).map(boardView);
  return memory.boards.filter((board) => board.ownerId === String(userId)).map(boardView);
}

async function getDefaultBoard(userId) {
  if (persistenceMode === 'mongo') {
    let board = await Board.findOne({ owner: userId }).sort({ createdAt: 1 });
    if (!board) board = await Board.create({ owner: userId, title: 'Saved ideas' });
    return board;
  }
  let board = memory.boards.find((item) => item.ownerId === String(userId));
  if (!board) {
    board = { id: makeId('board'), ownerId: String(userId), title: 'Saved ideas', description: '', posts: [], coverImage: '', createdAt: now() };
    memory.boards.push(board);
  }
  return board;
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => callback(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith('image/'))
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'pinnest-local-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }
};
if (process.env.MONGODB_URI) sessionOptions.store = MongoStore.create({ mongoUrl: process.env.MONGODB_URI });
app.use(session(sessionOptions));

passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
  try {
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return done(null, false, { message: 'Email or password is incorrect.' });
    return done(null, user);
  } catch (error) { return done(error); }
}));
passport.serializeUser((user, done) => done(null, idOf(user)));
passport.deserializeUser(async (id, done) => { try { done(null, await findUserById(id)); } catch (error) { done(error); } });
app.use(passport.initialize());
app.use(passport.session());

const requireAuth = (req, res, next) => req.user ? next() : res.status(401).json({ error: 'Please sign in to continue.' });

app.get('/api/health', (_req, res) => res.json({ ok: true, mode: persistenceMode, mongo: persistenceMode === 'mongo' }));
app.get('/api/auth/me', (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/auth/register', route(async (req, res, next) => {
  const username = String(req.body.username || '').trim().replace(/\s+/g, '-');
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) return res.status(400).json({ error: 'Username must be 3–24 letters, numbers, dashes, or underscores.' });
  if (!email.includes('@') || password.length < 6) return res.status(400).json({ error: 'Use a valid email and a password of at least 6 characters.' });
  if (await findUserByEmail(email) || await findUserByUsername(username)) return res.status(409).json({ error: 'That email or username is already in use.' });
  const user = await createUser({ username, email, passwordHash: await bcrypt.hash(password, 10), bio: 'Collecting little sparks of inspiration.' });
  req.login(user, (error) => error ? next(error) : res.status(201).json({ user: publicUser(user) }));
}));

app.post('/api/auth/login', (req, res, next) => passport.authenticate('local', (error, user, info) => {
  if (error) return next(error);
  if (!user) return res.status(401).json({ error: info?.message || 'Unable to sign in.' });
  req.login(user, (loginError) => loginError ? next(loginError) : res.json({ user: publicUser(user) }));
})(req, res, next));

app.post('/api/auth/logout', (req, res, next) => req.logout((error) => error ? next(error) : req.session.destroy(() => res.json({ ok: true }))));

app.get('/api/posts', route(async (req, res) => {
  const posts = await listPosts({ query: String(req.query.q || '').trim(), currentUserId: idOf(req.user) });
  res.json({ posts, mode: persistenceMode });
}));

app.post('/api/posts', requireAuth, upload.single('image'), route(async (req, res) => {
  const image = req.file ? `/uploads/${req.file.filename}` : String(req.body.imageUrl || '').trim();
  const title = String(req.body.title || '').trim();
  if (!image || !title) return res.status(400).json({ error: 'Add an image and a title before publishing.' });
  const tags = String(req.body.tags || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 8);
  if (persistenceMode === 'mongo') {
    const post = await Post.create({ owner: req.user._id, image, title, description: String(req.body.description || '').trim(), link: String(req.body.link || '').trim(), tags });
    const populated = await Post.findById(post._id).populate('owner', 'username avatar').lean();
    return res.status(201).json({ post: postView(populated, idOf(req.user)) });
  }
  const post = { id: makeId('post'), ownerId: idOf(req.user), ownerUsername: req.user.username, ownerAvatar: req.user.avatar || '', image, title, description: String(req.body.description || '').trim(), link: String(req.body.link || '').trim(), tags, likes: [], saves: [], createdAt: now() };
  memory.posts.unshift(post);
  res.status(201).json({ post: postView(post, idOf(req.user)) });
}));

app.post('/api/posts/:id/like', requireAuth, route(async (req, res) => {
  const post = await getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Pin not found.' });
  const userId = idOf(req.user);
  const likes = post.likes || [];
  const index = likes.findIndex((id) => idOf(id) === userId);
  if (index === -1) likes.push(persistenceMode === 'mongo' ? req.user._id : userId); else likes.splice(index, 1);
  if (persistenceMode === 'mongo') { post.likes = likes; await post.save(); }
  res.json({ liked: index === -1, likesCount: likes.length });
}));

app.post('/api/posts/:id/save', requireAuth, route(async (req, res) => {
  const post = await getPostById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Pin not found.' });
  const userId = idOf(req.user);
  const saves = post.saves || [];
  const index = saves.findIndex((id) => idOf(id) === userId);
  const saving = index === -1;
  if (saving) saves.push(persistenceMode === 'mongo' ? req.user._id : userId); else saves.splice(index, 1);
  const board = await getDefaultBoard(userId);
  if (persistenceMode === 'mongo') {
    post.saves = saves;
    if (saving && !board.posts.some((id) => idOf(id) === idOf(post))) { board.posts.push(post._id); board.coverImage ||= post.image; }
    if (!saving) board.posts = board.posts.filter((id) => idOf(id) !== idOf(post));
    await Promise.all([post.save(), board.save()]);
  } else {
    post.saves = saves;
    if (saving && !board.posts.includes(idOf(post))) { board.posts.push(idOf(post)); board.coverImage ||= post.image; }
    if (!saving) board.posts = board.posts.filter((id) => id !== idOf(post));
  }
  res.json({ saved: saving, savesCount: saves.length });
}));

app.get('/api/boards', requireAuth, route(async (req, res) => res.json({ boards: await getBoardsForUser(idOf(req.user)) })));
app.post('/api/boards', requireAuth, route(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Board title is required.' });
  const description = String(req.body.description || '').trim();
  const board = persistenceMode === 'mongo' ? await Board.create({ owner: req.user._id, title, description }) : (() => { const item = { id: makeId('board'), ownerId: idOf(req.user), title, description, posts: [], coverImage: '', createdAt: now() }; memory.boards.push(item); return item; })();
  res.status(201).json({ board: boardView(board) });
}));

app.get('/api/boards/:id', requireAuth, route(async (req, res) => {
  let board;
  if (persistenceMode === 'mongo') board = await Board.findOne({ _id: req.params.id, owner: req.user._id }).lean();
  else board = memory.boards.find((item) => item.id === req.params.id && item.ownerId === idOf(req.user));
  if (!board) return res.status(404).json({ error: 'Board not found.' });
  let posts = [];
  if (persistenceMode === 'mongo') posts = (await Post.find({ _id: { $in: board.posts } }).populate('owner', 'username avatar').lean()).map((post) => postView(post, idOf(req.user)));
  else posts = memory.posts.filter((post) => board.posts.includes(post.id)).map((post) => postView(post, idOf(req.user)));
  res.json({ board: boardView(board), posts });
}));

app.get('/api/profile/:username', route(async (req, res) => {
  const user = await findUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Creator not found.' });
  let posts;
  if (persistenceMode === 'mongo') posts = (await Post.find({ owner: user._id }).populate('owner', 'username avatar').sort({ createdAt: -1 }).lean()).map((post) => postView(post, idOf(req.user)));
  else posts = memory.posts.filter((post) => post.ownerId === idOf(user)).map((post) => postView(post, idOf(req.user)));
  res.json({ user: publicUser(user), posts, boards: await getBoardsForUser(idOf(user)) });
}));

app.use('/uploads', express.static(uploadDir));
app.use(express.static(rootDir, { extensions: ['html'] }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.message });
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

await initPersistence();
app.listen(PORT, () => console.log(`Pinnest listening at http://127.0.0.1:${PORT}`));
