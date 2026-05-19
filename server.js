try {
  require('dotenv').config();
} catch (err) {
  // dotenv je volitelný pro lokální .env soubor. Na hostingu proměnné běží i bez něj.
}
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const expressRateLimit = require('express-rate-limit');
const webPush = require('web-push');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createDatabase } = require('./database');
const { dirname } = require('path/posix');

const app = express();
// Bezpečné defaulty pro produkci (Render je typicky za reverzní proxy).
app.disable('x-powered-by');
app.set('trust proxy', 1);

// =========================================================
// Security runtime config (přes .env)
// =========================================================
const NODE_ENV = String(process.env.NODE_ENV || 'development');
const IS_PROD = NODE_ENV === 'production' || Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
const ALLOW_INSECURE_USER_HEADER = String(process.env.ALLOW_INSECURE_USER_HEADER || '').toLowerCase() === 'true';
const SESSION_SECRET = String(process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'));
const SESSION_COOKIE_NAME = (IS_PROD ? '__Host-anuk.sid' : 'anuk.sid');
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7); // 7 dní
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const MAIL_FROM = String(process.env.MAIL_FROM || 'Anuk <jiricekkunacz@gmail.com>');
const SMTP_USER = String(process.env.SMTP_USER || 'jiricekkunacz@gmail.com');
const SMTP_PASS = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
const SMTP_HOST = String(process.env.SMTP_HOST || 'smtp.gmail.com');
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false';
const PUBLIC_APP_URL = String(process.env.PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || '').trim();
const RENDER_EXTERNAL_URL = String(process.env.RENDER_EXTERNAL_URL || '').trim();
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '.data');
const resolveAppPath = (configured, fallback) => {
  const value = String(configured || '').trim();
  if (!value) return fallback;
  return path.isAbsolute(value) ? value : path.join(DATA_DIR, value);
};
const UPLOAD_DIR = path.join(DATA_DIR, '.uploads');
const database = createDatabase(DATA_DIR);
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MEDIA_FILE = path.join(DATA_DIR, 'media.json');
const FOLLOWS_FILE = path.join(DATA_DIR, 'follows.json'); // follow requests + accepted follows
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json'); // userId -> notifications[]
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const PRIVACY_POLICY_VERSION = '2026-05-14';
const SECURITY_POLICY_VERSION = '2026-05-14';
const EMAIL_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 dní
const STORAGE_PROVIDER = String(process.env.STORAGE_PROVIDER || 'local').toLowerCase(); // local | s3 | r2
const S3_BUCKET = String(process.env.S3_BUCKET || process.env.R2_BUCKET || '').trim();
const S3_REGION = String(process.env.S3_REGION || process.env.AWS_REGION || 'auto').trim();
const S3_ENDPOINT = String(process.env.S3_ENDPOINT || process.env.R2_ENDPOINT || '').trim();
const S3_ACCESS_KEY_ID = String(process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '').trim();
const S3_SECRET_ACCESS_KEY = String(process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '').trim();
const S3_PUBLIC_BASE_URL = String(process.env.S3_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = String(process.env.VAPID_SUBJECT || `mailto:${SMTP_USER || 'admin@example.com'}`).trim();
const REDIS_URL = String(process.env.REDIS_URL || '').trim();
const QUEUE_MODE = String(process.env.QUEUE_MODE || (REDIS_URL ? 'redis' : 'sqlite')).toLowerCase();
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const PUSH_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');

const loadJson = (filePath) => {
  return database.loadDocument(filePath, []);
};

const saveJson = (filePath, data) => {
  database.saveDocument(filePath, data);
};

const getUsers = () => loadJson(USERS_FILE).map((user) => expireBan(normalizeUser(user)));
const getMedia = () => loadJson(MEDIA_FILE);
const getFollows = () => loadJson(FOLLOWS_FILE);
const getChats = () => {
  const data = loadJson(CHATS_FILE);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : { threads: [] };
};
const saveChats = (data) => saveJson(CHATS_FILE, data && typeof data === 'object' ? data : { threads: [] });
const getNotificationsMap = () => {
  const data = loadJson(NOTIFICATIONS_FILE);
  // loadJson vrac· [] p·i chyb· · my chceme objekt
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
};

const saveNotificationsMap = (map) => saveJson(NOTIFICATIONS_FILE, map || {});
const getReports = () => {
  const data = loadJson(REPORTS_FILE);
  return Array.isArray(data) ? data : [];
};
const saveReports = (reports) => saveJson(REPORTS_FILE, Array.isArray(reports) ? reports : []);
const getPushSubscriptions = () => {
  const data = loadJson(PUSH_SUBSCRIPTIONS_FILE);
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
};
const savePushSubscriptions = (subscriptions) => saveJson(PUSH_SUBSCRIPTIONS_FILE, subscriptions || {});
const getJobs = () => {
  const data = loadJson(JOBS_FILE);
  return Array.isArray(data) ? data : [];
};
const saveJobs = (jobs) => saveJson(JOBS_FILE, Array.isArray(jobs) ? jobs : []);
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 8)}`;

const ERROR_GUIDES = {
  AUTH_REQUIRED: {
    name: 'Přihlášení vypršelo',
    fix: 'Přihlas se znovu a zopakuj akci.',
    steps: ['Otevři přihlášení.', 'Přihlas se ke svému účtu.', 'Vrať se na akci a spusť ji znovu.']
  },
  FORBIDDEN_ACCESS: {
    name: 'Akce není povolená',
    fix: 'Zkontroluj, jestli máš právo tuhle akci udělat.',
    steps: ['Ověř, že jsi přihlášený správným účtem.', 'Pokud jde o soukromý obsah, požádej o přístup.', 'Admin může zkontrolovat roli nebo blokaci uživatele.']
  },
  VALIDATION_ERROR: {
    name: 'Chybí nebo nesedí údaje',
    fix: 'Doplň požadované pole nebo uprav hodnotu podle hlášky.',
    steps: ['Přečti si konkrétní hlášku.', 'Doplň chybějící údaj.', 'Odešli formulář znovu.']
  },
  NOT_FOUND: {
    name: 'Obsah nenalezen',
    fix: 'Obnov stránku nebo se vrať zpět, protože daný obsah už nemusí existovat.',
    steps: ['Obnov stránku.', 'Zkontroluj odkaz nebo kód místnosti.', 'Pokud obsah zmizel, pravděpodobně byl smazán nebo uzavřen.']
  },
  CONFLICT: {
    name: 'Akce už proběhla',
    fix: 'Stav se mezitím změnil, obnov stránku a pokračuj podle aktuálního stavu.',
    steps: ['Obnov data.', 'Zkontroluj, jestli už není akce hotová.', 'Pokud se chyba opakuje, zkus se odhlásit a přihlásit.']
  },
  RATE_LIMITED: {
    name: 'Příliš mnoho pokusů',
    fix: 'Chvilku počkej a zkus to znovu pomaleji.',
    steps: ['Počkej několik desítek sekund.', 'Neodesílej stejnou akci opakovaně.', 'Pak akci zopakuj.']
  },
  CLOSED_RESOURCE: {
    name: 'Obsah je uzavřený',
    fix: 'Vysílání nebo místnost už skončila, otevři nové.',
    steps: ['Vrať se na seznam live vysílání.', 'Vyber jiné vysílání nebo vytvoř nové.', 'Pokud máš kód místnosti, ověř ho u vysílatele.']
  },
  SERVER_ERROR: {
    name: 'Chyba serveru',
    fix: 'Zkus akci zopakovat. Pokud se chyba vrací, zkontroluj health endpoint a server log.',
    steps: ['Obnov stránku.', 'Zkus akci znovu.', 'Admin: otevři /api/health a zkontroluj log serveru.']
  },
  BAD_JSON: {
    name: 'Neplatná data požadavku',
    fix: 'Požadavek poslal neplatný JSON, většinou pomůže obnovit stránku.',
    steps: ['Obnov stránku.', 'Zkus akci znovu.', 'Pokud chyba zůstává, zkontroluj frontend request body.']
  }
};

const inferErrorCode = (status, message = '') => {
  const text = String(message || '').toLowerCase();
  if (text.includes('json')) return 'BAD_JSON';
  if (status === 401 || text.includes('neautoriz') || text.includes('přihlášení vypršelo')) return 'AUTH_REQUIRED';
  if (status === 403 || text.includes('přístup odepřen') || text.includes('neplatný přístup')) return 'FORBIDDEN_ACCESS';
  if (status === 404 || text.includes('nenalezen')) return 'NOT_FOUND';
  if (status === 409 || text.includes('už')) return 'CONFLICT';
  if (status === 410 || text.includes('uzavřen')) return 'CLOSED_RESOURCE';
  if (status === 429 || text.includes('moc rychle') || text.includes('příliš mnoho')) return 'RATE_LIMITED';
  if (status >= 400 && status < 500) return 'VALIDATION_ERROR';
  return 'SERVER_ERROR';
};

const buildApiErrorPayload = (req, status, body = {}) => {
  const source = body && typeof body === 'object' && !Array.isArray(body) ? body : { message: String(body || '') };
  const message = String(source.message || source.error?.message || 'Chyba');
  const code = String(source.code || source.error?.code || inferErrorCode(status, message));
  const guide = ERROR_GUIDES[code] || ERROR_GUIDES.SERVER_ERROR;
  return {
    ...source,
    message,
    code,
    error: {
      code,
      name: source.error?.name || guide.name,
      message,
      fix: source.error?.fix || guide.fix,
      steps: Array.isArray(source.error?.steps) ? source.error.steps : guide.steps,
      status,
      path: req.originalUrl || req.url || '',
      at: new Date().toISOString()
    }
  };
};

const chatCallSignals = new Map();
const webPushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (webPushConfigured) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const sendWebPushToUser = async (userId, payload) => {
  if (!webPushConfigured || !userId) return;
  const subscriptions = getPushSubscriptions();
  const list = Array.isArray(subscriptions[String(userId)]) ? subscriptions[String(userId)] : [];
  if (!list.length) return;
  const nextList = [];
  for (const sub of list) {
    try {
      await webPush.sendNotification(sub.subscription, JSON.stringify({
        title: payload.title || 'Anuk',
        body: payload.message || '',
        data: payload
      }));
      nextList.push(sub);
    } catch (err) {
      const status = Number(err?.statusCode || 0);
      if (![404, 410].includes(status)) nextList.push(sub);
    }
  }
  subscriptions[String(userId)] = nextList;
  savePushSubscriptions(subscriptions);
};

const pushNotification = (userId, notification) => {
  const map = getNotificationsMap();
  const key = String(userId);
  if (!Array.isArray(map[key])) map[key] = [];
  map[key].push(notification);
  saveNotificationsMap(map);
  sendWebPushToUser(key, notification).catch((err) => {
    console.warn('Web push delivery failed:', err.message);
  });
};

const getDisplayName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.contact || 'Uživatel';

const pushUserNotification = (userId, payload) => {
  if (!userId) return;
  pushNotification(userId, {
    id: makeId('notif'),
    type: 'info',
    title: '',
    message: '',
    createdAt: new Date().toISOString(),
    readAt: '',
    ...payload
  });
};

const normalizeFollow = (follow) => ({
  id: '',
  fromUserId: '',
  toUserId: '',
  status: 'pending', // pending | accepted | rejected
  createdAt: new Date().toISOString(),
  respondedAt: '',
  ...follow
});

const isFollowing = (follows, fromUserId, toUserId) => {
  return (follows || []).some((f) =>
    f && f.status === 'accepted' && String(f.fromUserId) === String(fromUserId) && String(f.toUserId) === String(toUserId)
  );
};

const hasPendingFollow = (follows, fromUserId, toUserId) => {
  return (follows || []).some((f) =>
    f && f.status === 'pending' && String(f.fromUserId) === String(fromUserId) && String(f.toUserId) === String(toUserId)
  );
};

const isMutualFollow = (follows, aId, bId) => (
  isFollowing(follows, aId, bId) && isFollowing(follows, bId, aId)
);

const getPublicUser = (user) => {
  if (!user) return null;
  const { passwordHash, security = {}, ...rest } = user;
  const {
    emailVerifyTokenHash,
    emailVerifyExpiresAt,
    accountDeleteTokenHash,
    accountDeleteExpiresAt,
    ...publicSecurity
  } = security || {};
  return { ...rest, security: publicSecurity };
};

const getPublicProfile = (user) => {
  if (!user) return null;
  const {
    id,
    firstName,
    lastName,
    role,
    profilePhoto,
    coverVideo,
    bio,
    createdAt
  } = user;
  return { id, firstName, lastName, role, profilePhoto, coverVideo, bio, createdAt };
};

const normalizeUser = (user) => ({
  lastLoginAt: '',
  lastLoginIp: '',
  lastLoginDevice: '',
  wifiNote: '',
  banHistory: [],
  blockedUntil: '',
  profilePhoto: '',
  coverVideo: '',
  bio: '',
  settings: {
    privateAccount: true, // kdy· true, sledování vyžaduje schválení
    notifications: {
      followRequests: true,
      followAccepted: true,
      followRejected: true
    },
    preferences: {
      theme: 'glass',
      density: 'comfortable',
      textScale: 'normal',
      radius: 'soft',
      layoutWidth: 'standard',
      glassStrength: 'frosted',
      reduceMotion: false,
      enterToSend: true,
      chatSound: false,
      accent: 'teal',
      backgroundEffects: 'quiet',
      navigation: 'full',
      mediaAutoplay: false,
      updatedAt: ''
    }
  },
  blockedUsers: [], // userId[]
  privacy: {
    policyVersion: '',
    acceptedAt: '',
    marketingConsent: false
  },
  security: {
    passwordChangedAt: '',
    failedLoginCount: 0,
    lastFailedLoginAt: '',
    emailVerifiedAt: '',
    emailVerifyTokenHash: '',
    emailVerifyExpiresAt: '',
    accountDeleteTokenHash: '',
    accountDeleteExpiresAt: ''
  },
  ...user,
  banHistory: Array.isArray(user.banHistory) ? user.banHistory : [],
  blockedUsers: Array.isArray(user.blockedUsers) ? user.blockedUsers.map((x) => String(x)) : [],
  privacy: {
    policyVersion: user?.privacy?.policyVersion || '',
    acceptedAt: user?.privacy?.acceptedAt || '',
    marketingConsent: Boolean(user?.privacy?.marketingConsent)
  },
  security: {
    passwordChangedAt: user?.security?.passwordChangedAt || '',
    failedLoginCount: Number(user?.security?.failedLoginCount || 0),
    lastFailedLoginAt: user?.security?.lastFailedLoginAt || '',
    emailVerifiedAt: user?.security?.emailVerifiedAt || '',
    emailVerifyTokenHash: user?.security?.emailVerifyTokenHash || '',
    emailVerifyExpiresAt: user?.security?.emailVerifyExpiresAt || '',
    accountDeleteTokenHash: user?.security?.accountDeleteTokenHash || '',
    accountDeleteExpiresAt: user?.security?.accountDeleteExpiresAt || ''
  },
  settings: {
    privateAccount: user?.settings?.privateAccount ?? true,
    notifications: {
      followRequests: user?.settings?.notifications?.followRequests ?? true,
      followAccepted: user?.settings?.notifications?.followAccepted ?? true,
      followRejected: user?.settings?.notifications?.followRejected ?? true
    },
    preferences: {
      theme: ['glass', 'contrast', 'calm'].includes(String(user?.settings?.preferences?.theme || ''))
        ? String(user.settings.preferences.theme)
        : 'glass',
      density: ['comfortable', 'compact'].includes(String(user?.settings?.preferences?.density || ''))
        ? String(user.settings.preferences.density)
        : 'comfortable',
      textScale: ['normal', 'large'].includes(String(user?.settings?.preferences?.textScale || ''))
        ? String(user.settings.preferences.textScale)
        : 'normal',
      radius: ['sharp', 'soft', 'rounded'].includes(String(user?.settings?.preferences?.radius || ''))
        ? String(user.settings.preferences.radius)
        : 'soft',
      layoutWidth: ['standard', 'wide'].includes(String(user?.settings?.preferences?.layoutWidth || ''))
        ? String(user.settings.preferences.layoutWidth)
        : 'standard',
      glassStrength: ['clear', 'frosted', 'solid'].includes(String(user?.settings?.preferences?.glassStrength || ''))
        ? String(user.settings.preferences.glassStrength)
        : 'frosted',
      reduceMotion: Boolean(user?.settings?.preferences?.reduceMotion),
      enterToSend: user?.settings?.preferences?.enterToSend !== false,
      chatSound: Boolean(user?.settings?.preferences?.chatSound),
      accent: ['teal', 'violet', 'blue', 'amber'].includes(String(user?.settings?.preferences?.accent || ''))
        ? String(user.settings.preferences.accent)
        : 'teal',
      backgroundEffects: ['quiet', 'standard', 'off'].includes(String(user?.settings?.preferences?.backgroundEffects || ''))
        ? String(user.settings.preferences.backgroundEffects)
        : 'quiet',
      navigation: ['full', 'compact'].includes(String(user?.settings?.preferences?.navigation || ''))
        ? String(user.settings.preferences.navigation)
        : 'full',
      mediaAutoplay: Boolean(user?.settings?.preferences?.mediaAutoplay),
      updatedAt: user?.settings?.preferences?.updatedAt || ''
    }
  }
});

const expireBan = (user) => {
  if (!user || !user.blockedUntil) return user;
  const until = Number(new Date(user.blockedUntil));
  const now = Date.now();
  if (!Number.isNaN(until) && now > until) {
    user.blocked = false;
    user.blockedReason = '';
    user.blockedUntil = '';
    if (Array.isArray(user.banHistory)) {
      user.banHistory = user.banHistory.map((entry) => ({
        ...entry,
        active: entry.active && new Date(entry.endAt).getTime() > 0 && new Date(entry.endAt).getTime() <= now ? false : entry.active
      }));
    }
  }
  return user;
};

const getRequestIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? String(forwarded).split(',')[0].trim() : req.ip || '';
};

const getDeviceInfo = (req) => String(req.headers['user-agent'] || '').slice(0, 240);

const getUserFromSession = (req) => {
  const userId = req.session?.userId;
  if (!userId) return null;
  const users = getUsers();
  return users.find((entry) => entry.id === String(userId));
};

// POZOR: x-user-id je záměrně považované za nezabezpečené (uživatel si ho může zfalšovat).
// Necháváme ho jen jako nouzový přepínač pro vývoj/migraci, pokud nastavíš:
//   ALLOW_INSECURE_USER_HEADER=true
const getUserFromHeader = (req) => {
  if (!ALLOW_INSECURE_USER_HEADER) return null;
  const userId = req.headers['x-user-id'];
  if (!userId) return null;
  const users = getUsers();
  return users.find((entry) => entry.id === String(userId));
};

const getUserFromRequest = (req) => getUserFromSession(req) || getUserFromHeader(req);

const isBlockedEitherWay = (users, aId, bId) => {
  const a = users.find((u) => String(u.id) === String(aId));
  const b = users.find((u) => String(u.id) === String(bId));
  if (!a || !b) return false;
  const aBlocksB = Array.isArray(a.blockedUsers) && a.blockedUsers.map(String).includes(String(bId));
  const bBlocksA = Array.isArray(b.blockedUsers) && b.blockedUsers.map(String).includes(String(aId));
  return aBlocksB || bBlocksA;
};

const requireAdmin = (req, res, next) => {
  const user = getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup odepřen: administrátor pouze.' });
  }
  req.adminUser = user;
  next();
};

const clientIpKey = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? String(forwarded).split(',')[0].trim() : req.ip || req.socket?.remoteAddress || 'unknown';
};

const rateBuckets = new Map();
const rateLimit = ({ windowMs, max, keyPrefix }) => (req, res, next) => {
  const now = Date.now();
  const key = `${keyPrefix}:${clientIpKey(req)}`;
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  res.setHeader('RateLimit-Limit', String(max));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
  res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count > max) {
    return res.status(429).json({ message: 'Příliš mnoho pokusů. Zkuste to prosím později.' });
  }
  return next();
};

const spamBuckets = new Map();
const guardSpam = (req, res, action, { windowMs = 60_000, max = 20, text = '' } = {}) => {
  const user = getUserFromRequest(req);
  const actor = user?.id || getRequestIp(req);
  const key = `${action}:${actor}`;
  const now = Date.now();
  const normalizedText = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 400);
  const bucket = spamBuckets.get(key) || { resetAt: now + windowMs, count: 0, lastText: '', repeat: 0 };
  if (now > bucket.resetAt) {
    bucket.resetAt = now + windowMs;
    bucket.count = 0;
    bucket.repeat = 0;
    bucket.lastText = '';
  }
  bucket.count += 1;
  if (normalizedText && normalizedText === bucket.lastText) bucket.repeat += 1;
  else bucket.repeat = 0;
  bucket.lastText = normalizedText || bucket.lastText;
  spamBuckets.set(key, bucket);
  res.setHeader('X-AntiSpam-Remaining', String(Math.max(0, max - bucket.count)));
  if (bucket.count > max || bucket.repeat >= 4) {
    return res.status(429).json({ message: 'Zpráv je moc rychle za sebou. Chvilku počkej a zkus to znovu.' });
  }
  return null;
};

const enqueueJob = (type, payload = {}) => {
  const jobs = getJobs();
  const job = {
    id: makeId('job'),
    type,
    status: 'queued',
    payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    note: QUEUE_MODE === 'redis'
      ? 'Redis/BullMQ backend připraven přes env, tento fallback job je evidovaný v SQLite dokumentu.'
      : 'Lokální SQLite fallback queue.'
  };
  jobs.push(job);
  saveJobs(jobs.slice(-1000));
  return job;
};

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob:",
    // WebRTC (ICE/STUN/TURN) může v některých prohlížečích spadat pod connect-src,
    // proto povolujeme i https/wss + (pokud prohlížeč podporuje) stun/turn schémata.
    "connect-src 'self' https: wss: stun: turn:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
};

const sendStaticAsset = (res, fileName, contentType, fallback) => {
  // Priorita: projektový root ( __dirname ) -> DATA_DIR ( .data ).
  // Na Renderu typicky nejsou / nejsou konzistentně dostupné soubory v DATA_DIR.
  const filePathCandidates = [
    path.join(__dirname, fileName),
    path.join(DATA_DIR, fileName)
  ];

  // res.type() může mít nečekané chování, když mu pošleme hodnotu s `; charset=...`.
  // Na produkci chceme mít Content-Type vždy deterministický.
  if (contentType) res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (String(contentType || '').includes('text/html') || String(contentType || '').includes('javascript')) {
    res.setHeader('Cache-Control', 'no-store');
  }

  for (const candidate of filePathCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        return res.sendFile(candidate);
      }
    } catch {}
  }

  // Uživatelsky méně detailní odpověď, ale log do serveru.
  console.warn(`[static-asset-miss] ${String(fileName || '')}`);

  if (typeof fallback === 'string' && fallback.length) {
    return res.status(200).send(fallback);
  }
  return res.status(404).type('text/plain; charset=utf-8').send('Not found');
};

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const objectStorageEnabled = ['s3', 'r2'].includes(STORAGE_PROVIDER) && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY;
const objectStorageClient = objectStorageEnabled ? new S3Client({
  region: S3_REGION || 'auto',
  endpoint: S3_ENDPOINT || undefined,
  forcePathStyle: STORAGE_PROVIDER === 'r2' || Boolean(S3_ENDPOINT),
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY
  }
}) : null;

const makeUploadFileName = (originalName = '') => {
  const ext = path.extname(String(originalName || '')).toLowerCase();
  const safeExt = /^[a-z0-9.]{0,12}$/.test(ext) ? ext : '';
  return `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
};

const uploadStorage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, UPLOAD_DIR),
  filename: (req, file, callback) => {
    callback(null, makeUploadFileName(file.originalname));
  }
});

const uploadFile = multer({
  storage: objectStorageEnabled ? multer.memoryStorage() : uploadStorage,
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25 * 1024 * 1024),
    files: 1
  },
  fileFilter: (req, file, callback) => {
    const type = String(file.mimetype || '').toLowerCase();
    if (/^(image|video|audio)\//.test(type)) return callback(null, true);
    return callback(new Error('Povolené jsou jen obrázky, video nebo audio soubory.'));
  }
});

const saveUploadedObject = async (file) => {
  if (!objectStorageEnabled) {
    return {
      url: `/uploads/${file.filename}`,
      fileName: file.filename
    };
  }
  const fileName = makeUploadFileName(file.originalname);
  const keyPrefix = String(process.env.S3_KEY_PREFIX || process.env.R2_KEY_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');
  const key = `${keyPrefix}/${fileName}`;
  await objectStorageClient.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    CacheControl: 'public, max-age=31536000, immutable'
  }));
  const publicUrl = S3_PUBLIC_BASE_URL
    ? `${S3_PUBLIC_BASE_URL}/${key}`
    : (S3_ENDPOINT ? `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET}/${key}` : `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`);
  return { url: publicUrl, fileName: key };
};

// =========================================================
// Security middleware stack
// =========================================================
app.use(helmet({
  // CSP řešíme vlastní hlavičkou (securityHeaders), abychom měli plnou kontrolu.
  contentSecurityPolicy: false
}));
app.use(securityHeaders);
app.use(cookieParser(SESSION_SECRET));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const method = String(req.method || '').toUpperCase();
    const pathOnly = String(req.originalUrl || req.url || '').split('?')[0];
    const status = res.statusCode;
    const ms = Date.now() - startedAt;
    const ip = getRequestIp(req);
    console.log(`[${new Date().toISOString()}] ${method} ${pathOnly} ${status} ${ms}ms ip=${ip}`);
  });
  next();
});
app.use(session({
  name: SESSION_COOKIE_NAME,
  secret: SESSION_SECRET,
  store: database.createSessionStore(session),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/'
  }
}));

const getSelfOrigin = (req) => {
  const host = req.headers.host;
  if (!host) return '';
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${host}`;
};

const normalizeBaseUrl = (url) => String(url || '').trim().replace(/\/$/, '');
const getConfiguredPublicAppUrl = () => normalizeBaseUrl(PUBLIC_APP_URL || RENDER_EXTERNAL_URL);
const getPublicAppUrl = (req) => getConfiguredPublicAppUrl() || getSelfOrigin(req);

const setCsrfCookie = (res, token) => {
  // Cookie je čitelná pro JS (není HttpOnly), aby ji klient mohl poslat v X-CSRF-Token headeru.
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: IS_PROD,
    path: '/'
  });
};

// CORS/Origin hardening pro /api:
// - Same-origin projde automaticky.
// - Cross-origin musí být v ALLOWED_ORIGINS nebo odpovídat vlastnímu hostu aplikace.
// - credentials:true dovolí bezpečné session cookies jen pro povolené originy.
app.use('/api', cors({
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-User-Id'],
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = new Set([
      ...ALLOWED_ORIGINS,
      getConfiguredPublicAppUrl(),
      RENDER_EXTERNAL_URL
    ].filter(Boolean));
    return callback(null, allowed.has(origin));
  }
}));

app.use('/api', (req, res, next) => {
  const origin = String(req.headers.origin || '');
  if (!origin) return next();
  const selfOrigin = getSelfOrigin(req);
  const allowed = new Set([
    ...ALLOWED_ORIGINS,
    selfOrigin,
    getConfiguredPublicAppUrl(),
    RENDER_EXTERNAL_URL
  ].filter(Boolean));
  if (!allowed.has(origin)) {
    return res.status(403).json({ message: 'CORS/Origin není povolen pro API.' });
  }
  return next();
});

// Základní rate limit pro celé API (polling živého vysílání je častý, proto vyšší limit).
app.use('/api', expressRateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

// Route-specific brute-force limity
app.use('/api/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'login' }));
app.use('/api/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 12, keyPrefix: 'register' }));
app.use('/api/forgot', rateLimit({ windowMs: 60 * 60 * 1000, max: 8, keyPrefix: 'forgot' }));

// Bezpečnostní limity pro body. Malý limit brání zahlcení serveru obřím JSON requestem.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '5mb' }));
app.use(express.urlencoded({ extended: false, limit: process.env.FORM_BODY_LIMIT || '256kb' }));

// CSRF token (double-submit přes cookie + header)
app.use((req, res, next) => {
  if (!req.session) return next();
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  setCsrfCookie(res, req.session.csrfToken);
  return next();
});

app.use('/api', (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) {
      return json(buildApiErrorPayload(req, res.statusCode, body));
    }
    return json(body);
  };
  return next();
});

app.use('/api', (req, res, next) => {
  const method = String(req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();
  // Login/register/forgot musí fungovat bez CSRF (uživatel ještě nemá session).
  if (req.path === '/login' || req.path === '/register' || req.path === '/forgot') return next();
  const token = String(req.headers['x-csrf-token'] || '');
  if (!req.session?.csrfToken || token !== req.session.csrfToken) {
    return res.status(403).json({ message: 'CSRF token chybí nebo je neplatný.' });
  }
  return next();
});

// =========================================================
app.get('/', (req, res) => sendStaticAsset(res, 'index.html', 'text/html; charset=utf-8'));
app.get(['/index.html', '/feed.html', '/account.html', '/user.html'], (req, res) => {
  sendStaticAsset(res, req.path.slice(1), 'text/html; charset=utf-8');
});
// Pohodlné aliasy (uživatelé často píšou /feed místo /feed.html)
app.get(['/index', '/home'], (req, res) => res.redirect(302, `/index.html${req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''}`));
app.get('/feed', (req, res) => res.redirect(302, `/feed.html${req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''}`));
app.get('/account', (req, res) => res.redirect(302, `/account.html${req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''}`));
app.get('/user', (req, res) => res.redirect(302, `/user.html${req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''}`));
app.get(['/Anuk-logo.png', '/favicon.ico'], (req, res) => {
  sendStaticAsset(res, 'Anuk-logo.png', 'image/png');
});
app.get(['/styles.css', '/modal.css', '/premium.css', '/admin.css'], (req, res) => {
  // Některé doplňkové CSS soubory nemusí být v buildu nasazené.
  // Prohlížeč pak nesmí dostat 404, protože Render/klient to hlásí jako rozbitou cestu.
  const optionalCssFallback = req.path === '/styles.css' ? '' : '/* optional stylesheet not bundled */';
  sendStaticAsset(res, req.path.slice(1), 'text/css; charset=utf-8', optionalCssFallback);
});
app.get([
  '/script.js',
  '/feed.js',
  '/chat.js',
  '/user.js',
  '/background.js',
  '/three-bg.js',
  '/media-optimizer.js',
  '/ui-text-fixes.js',
  '/push-sw.js'
], (req, res) => {
  sendStaticAsset(res, req.path.slice(1), 'application/javascript; charset=utf-8');
});
app.use('/uploads', express.static(UPLOAD_DIR, {
  fallthrough: false,
  maxAge: IS_PROD ? '7d' : 0,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', IS_PROD ? 'public, max-age=604800' : 'no-store');
  }
}));
app.use((req, res, next) => {
  const requestedPath = String(req.path || '').toLowerCase();
  if (/\.(json|sqlite|sqlite3|db|env)$/i.test(requestedPath) || requestedPath.includes('/.uploads/')) {
    return res.status(404).type('text/plain; charset=utf-8').send('Not found');
  }
  return next();
});
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.css') res.setHeader('Content-Type', 'text/css; charset=utf-8');
    if (ext === '.js') res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    if (ext === '.html') res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

app.post('/api/uploads', (req, res, next) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser) return;
  req.currentUser = currentUser;
  return next();
}, uploadFile.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Soubor chybí.' });
  }
  const spam = guardSpam(req, res, 'upload', { windowMs: 60_000, max: 12 });
  if (spam) return spam;
  let stored;
  try {
    stored = await saveUploadedObject(req.file);
  } catch (err) {
    console.error('Object storage upload failed:', err);
    return res.status(500).json({ message: 'Soubor se nepodařilo uložit do storage.' });
  }
  if (String(req.file.mimetype || '').startsWith('video/')) {
    enqueueJob('video_transcode', {
      sourceUrl: stored.url,
      fileName: stored.fileName,
      mimeType: req.file.mimetype,
      size: req.file.size,
      userId: req.currentUser?.id || ''
    });
  }

  return res.status(201).json({
    success: true,
    url: stored.url,
    fileName: stored.fileName,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageProvider: objectStorageEnabled ? STORAGE_PROVIDER : 'local'
  });
});

// =========================================================
// Live (WebRTC) · jednoduch· signalizace pžes REST + polling
// Podporuje:
//  - soukromé vysílání (kdokoliv vytvo·· k·d a sd·l· ho)
//  - veřejné vysílání (zobraz· se ve feedu pro vžechny)
//
// Live místnosti běží primárně v paměti kvůli rychlému WebRTC pollingu,
// ale metadata ukládáme i do SQLite, aby veřejné/pending místnosti nezmizely jen kvůli restartu.
// =========================================================
const LIVE_ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6 hodin

const serializeLiveRoom = (room) => ({
  ...room,
  offers: Array.isArray(room.offers) ? room.offers : [],
  answers: Array.from((room.answers instanceof Map ? room.answers : new Map()).entries()),
  iceToBroadcaster: Array.isArray(room.iceToBroadcaster) ? room.iceToBroadcaster : [],
  iceToViewer: Array.from((room.iceToViewer instanceof Map ? room.iceToViewer : new Map()).entries()),
  viewers: Array.from((room.viewers instanceof Map ? room.viewers : new Map()).entries())
});

const restoreLiveRoom = (room) => ({
  ...room,
  offers: Array.isArray(room.offers) ? room.offers : [],
  answers: new Map(Array.isArray(room.answers) ? room.answers : []),
  iceToBroadcaster: Array.isArray(room.iceToBroadcaster) ? room.iceToBroadcaster : [],
  iceToViewer: new Map(Array.isArray(room.iceToViewer) ? room.iceToViewer : []),
  viewers: new Map(Array.isArray(room.viewers) ? room.viewers : [])
});

const loadLiveRooms = () => {
  const rows = database.loadDocument('liveRooms', []);
  return new Map((Array.isArray(rows) ? rows : [])
    .filter((room) => room && room.id)
    .map((room) => [String(room.id), restoreLiveRoom(room)]));
};

const liveRooms = loadLiveRooms(); // roomId -> room

const saveLiveRooms = () => {
  database.saveDocument('liveRooms', Array.from(liveRooms.values()).map(serializeLiveRoom));
};

const cleanupLiveRooms = () => {
  const now = Date.now();
  const existingUserIds = new Set(getUsers().map((user) => String(user.id)));
  let changed = false;
  for (const [id, room] of liveRooms.entries()) {
    if (!room) continue;
    if (room.closed || (room.ownerId && !existingUserIds.has(String(room.ownerId)))) {
      liveRooms.delete(id);
      changed = true;
      continue;
    }
    if (now - (room.createdAtTs || now) > LIVE_ROOM_TTL_MS) {
      liveRooms.delete(id);
      changed = true;
    }
  }
  if (changed) saveLiveRooms();
};

const getLiveRoom = (roomId) => {
  cleanupLiveRooms();
  return liveRooms.get(String(roomId));
};

const LIVE_PRESENCE_TTL_MS = 22 * 1000;

const ensureLiveViewers = (room) => {
  if (!room) return new Map();
  if (room.viewers instanceof Map) return room.viewers;
  room.viewers = new Map();
  return room.viewers;
};

const pruneLiveViewers = (room) => {
  const viewers = ensureLiveViewers(room);
  const now = Date.now();
  for (const [userId, presence] of viewers.entries()) {
    if (now - (Number(presence.lastSeenTs) || 0) > LIVE_PRESENCE_TTL_MS) {
      viewers.delete(userId);
    }
  }
  return viewers;
};

const getLivePresencePhoto = (photo) => {
  const value = String(photo || '');
  if (!value || value.startsWith('data:')) return '';
  return value.slice(0, 500);
};

const makeLiveParticipant = (user, presenceRole, timestamps = {}) => ({
  userId: user?.id || '',
  userName: getDisplayName(user),
  userRole: user?.role || 'user',
  profilePhoto: getLivePresencePhoto(user?.profilePhoto),
  presenceRole,
  joinedAt: timestamps.joinedAtTs ? new Date(timestamps.joinedAtTs).toISOString() : '',
  lastSeenAt: timestamps.lastSeenTs ? new Date(timestamps.lastSeenTs).toISOString() : ''
});

const getLiveAudiencePayload = (room) => {
  if (!room) {
    return { viewerCount: 0, participantCount: 0, participants: [] };
  }
  const users = getUsers();
  const userMap = new Map(users.map((user) => [String(user.id), user]));
  const viewers = pruneLiveViewers(room);
  const participants = [];
  const owner = userMap.get(String(room.ownerId));

  if (owner) {
    participants.push(makeLiveParticipant(owner, 'broadcaster', {
      joinedAtTs: room.startedAtTs || room.createdAtTs,
      lastSeenTs: Date.now()
    }));
  }

  for (const presence of viewers.values()) {
    if (!presence?.userId || String(presence.userId) === String(room.ownerId)) continue;
    const user = userMap.get(String(presence.userId));
    if (!user) continue;
    participants.push(makeLiveParticipant(user, 'viewer', presence));
  }

  const viewerCount = participants.filter((entry) => entry.presenceRole === 'viewer').length;
  return {
    viewerCount,
    participantCount: participants.length,
    participants: participants.slice(0, 24)
  };
};

const touchLivePresence = (room, user, role = 'viewer') => {
  const viewers = ensureLiveViewers(room);
  const key = String(user.id);
  const existing = viewers.get(key);
  const now = Date.now();
  viewers.set(key, {
    userId: user.id,
    presenceRole: role === 'broadcaster' ? 'broadcaster' : 'viewer',
    joinedAtTs: existing?.joinedAtTs || now,
    lastSeenTs: now
  });
  return getLiveAudiencePayload(room);
};

const requireAuth = (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(403).json({ message: 'Neautorizováno' });
    return null;
  }
  if (user.blocked) {
    res.status(403).json({ message: 'Uživatel je zablokován.' });
    return null;
  }
  return user;
};

// Veřejné live: dle požadavku může spustit každý přihlášený uživatel.
// (Dříve bylo omezeno na role admin/creator.)
const canBroadcastPublicLive = (user) => Boolean(user);

const getMailStatus = () => {
  const passMissing = !SMTP_PASS || SMTP_PASS === 'VLOZ_SEM_GMAIL_APP_PASSWORD';
  return {
    from: MAIL_FROM,
    user: SMTP_USER,
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    configured: Boolean(SMTP_USER && !passMissing),
    publicAppUrl: getConfiguredPublicAppUrl(),
    passSet: !passMissing,
    passLooksLikeGoogleAppPassword: /^[a-z0-9]{16}$/i.test(SMTP_PASS),
    lastDelivery: lastMailDelivery
  };
};

app.get('/api/health', (req, res) => {
  const fileExists = (file) => fs.existsSync(file);
  const statIso = (file) => {
    try {
      return fs.statSync(file).mtime.toISOString();
    } catch {
      return null;
    }
  };
  const canWriteDataDir = (() => {
    try {
      fs.accessSync(DATA_DIR, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  })();
  const canWriteUploadDir = (() => {
    try {
      fs.accessSync(UPLOAD_DIR, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  })();
  const media = getMedia();
  const users = getUsers();

  res.json({
    ok: true,
    service: 'anuk',
    environment: process.env.RENDER ? 'render' : 'local',
    publicUrl: getPublicAppUrl(req),
    mail: getMailStatus(),
    serverJsMtime: statIso(__filename),
    assets: {
      indexHtml: statIso(path.join(DATA_DIR, 'index.html')),
      feedHtml: statIso(path.join(DATA_DIR, 'feed.html')),
      feedJs: statIso(path.join(DATA_DIR, 'feed.js')),
      chatJs: statIso(path.join(DATA_DIR, 'chat.js')),
      modalCss: statIso(path.join(DATA_DIR, 'modal.css'))
    },
    checkedAt: new Date().toISOString(),
    storage: {
      writable: canWriteDataDir,
      usersFile: fileExists(USERS_FILE),
      mediaFile: fileExists(MEDIA_FILE),
      chatsFile: fileExists(CHATS_FILE),
      followsFile: fileExists(FOLLOWS_FILE),
      provider: objectStorageEnabled ? STORAGE_PROVIDER : 'local',
      objectStorageConfigured: Boolean(objectStorageEnabled),
      uploadDir: UPLOAD_DIR,
      uploadDirWritable: canWriteUploadDir
    },
    realtime: {
      websocketPackage: true,
      redisConfigured: Boolean(REDIS_URL),
      queueMode: QUEUE_MODE,
      queuedJobs: getJobs().filter((job) => job.status === 'queued').length
    },
    push: {
      configured: webPushConfigured,
      subscribers: Object.values(getPushSubscriptions()).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0)
    },
    moderation: {
      openReports: getReports().filter((report) => report.status === 'open').length,
      totalReports: getReports().length
    },
    live: {
      iceServersConfigured: getConfiguredIceServers().length
    },
    renderFallback: {
      publicAppUrl: getConfiguredPublicAppUrl(),
      databasePath: database.dbPath,
      sqliteQueueEnabled: QUEUE_MODE !== 'redis',
      jobsDocument: 'jobs',
      localUploadFallback: !objectStorageEnabled,
      uploadDir: UPLOAD_DIR,
      persistentDiskRecommended: Boolean(IS_PROD && (!objectStorageEnabled || QUEUE_MODE !== 'redis'))
    },
    counts: {
      users: users.length,
      media: media.length,
      comments: media.reduce((sum, item) => sum + (Array.isArray(item.comments) ? item.comments.length : 0), 0)
    },
    features: {
      onlineDeploy: Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL),
      backend: true,
      publicAccess: true,
      realApi: true,
      registration: true,
      postStorage: canWriteDataDir && fileExists(MEDIA_FILE)
    }
  });
});

app.get('/api/error-guide', (req, res) => {
  res.json({
    errors: ERROR_GUIDES,
    usage: {
      message: 'Každá API chyba vrací message, code a error se jménem problému, opravou a kroky.',
      example: {
        message: 'Neautorizováno',
        code: 'AUTH_REQUIRED',
        error: ERROR_GUIDES.AUTH_REQUIRED
      }
    }
  });
});

const getConfiguredIceServers = () => {
  const explicit = String(process.env.ANUK_ICE_SERVERS || '').trim();
  if (explicit) {
    try {
      const parsed = JSON.parse(explicit);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  const turnUrls = String(process.env.TURN_URLS || process.env.TURN_URL || '').split(',').map((v) => v.trim()).filter(Boolean);
  const servers = [];
  if (turnUrls.length) {
    servers.push({
      urls: turnUrls,
      username: String(process.env.TURN_USERNAME || '').trim(),
      credential: String(process.env.TURN_CREDENTIAL || '').trim()
    });
  }
  servers.push({
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302'
    ]
  });
  return servers;
};

app.get('/api/live/ice-servers', (req, res) => {
  res.json({
    iceServers: getConfiguredIceServers(),
    turnConfigured: Boolean(String(process.env.TURN_URLS || process.env.TURN_URL || '').trim())
  });
});

app.get('/api/push/public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY, configured: webPushConfigured });
});

app.post('/api/push/subscriptions', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const subscription = req.body?.subscription || req.body;
  const endpoint = String(subscription?.endpoint || '');
  if (!endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ message: 'Push subscription není platná.' });
  }
  const map = getPushSubscriptions();
  const key = String(user.id);
  const list = Array.isArray(map[key]) ? map[key] : [];
  const next = list.filter((item) => String(item.subscription?.endpoint || '') !== endpoint);
  next.push({ id: makeId('push'), subscription, createdAt: new Date().toISOString(), userAgent: getDeviceInfo(req) });
  map[key] = next.slice(-8);
  savePushSubscriptions(map);
  res.status(201).json({ success: true, configured: webPushConfigured, count: map[key].length });
});

app.delete('/api/push/subscriptions', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const endpoint = String(req.body?.endpoint || '');
  const map = getPushSubscriptions();
  const key = String(user.id);
  map[key] = endpoint
    ? (Array.isArray(map[key]) ? map[key].filter((item) => String(item.subscription?.endpoint || '') !== endpoint) : [])
    : [];
  savePushSubscriptions(map);
  res.json({ success: true, count: map[key].length });
});

app.post('/api/reports', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const spam = guardSpam(req, res, 'report', { windowMs: 10 * 60_000, max: 10, text: req.body?.reason });
  if (spam) return spam;
  const targetType = String(req.body?.targetType || '').trim().toLowerCase();
  const targetId = String(req.body?.targetId || '').trim();
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);
  if (!['media', 'comment', 'user', 'chat', 'live'].includes(targetType) || !targetId || !reason) {
    return res.status(400).json({ message: 'Report musí mít typ, cíl a důvod.' });
  }
  const reports = getReports();
  const report = {
    id: makeId('report'),
    targetType,
    targetId,
    reason,
    reporterId: String(user.id),
    status: 'open',
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  reports.push(report);
  saveReports(reports);
  getUsers().filter((admin) => admin.role === 'admin').forEach((admin) => {
    pushUserNotification(admin.id, {
      type: 'moderation_report',
      title: 'Nové nahlášení',
      message: `${getDisplayName(user)} nahlásil(a) ${targetType}: ${reason.slice(0, 120)}`,
      reportId: report.id
    });
  });
  res.status(201).json(report);
});

app.get('/api/admin/reports', requireAdmin, (req, res) => {
  const status = String(req.query.status || '').trim().toLowerCase();
  const reports = getReports();
  res.json({
    reports: status ? reports.filter((report) => report.status === status) : reports
  });
});

app.post('/api/admin/reports/:id', requireAdmin, (req, res) => {
  const reports = getReports();
  const report = reports.find((item) => String(item.id) === String(req.params.id));
  if (!report) return res.status(404).json({ message: 'Report nenalezen.' });
  const status = String(req.body?.status || report.status).trim().toLowerCase();
  if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ message: 'Neplatný stav reportu.' });
  }
  report.status = status;
  report.updatedAt = new Date().toISOString();
  if (!Array.isArray(report.notes)) report.notes = [];
  const note = String(req.body?.note || '').trim();
  if (note) {
    report.notes.push({
      id: makeId('note'),
      adminId: String(req.adminUser.id),
      text: note.slice(0, 1000),
      createdAt: new Date().toISOString()
    });
  }
  saveReports(reports);
  res.json(report);
});

app.get('/api/admin/jobs', requireAdmin, (req, res) => {
  const status = String(req.query.status || '').trim().toLowerCase();
  const type = String(req.query.type || '').trim().toLowerCase();
  let jobs = getJobs();
  if (status) jobs = jobs.filter((job) => String(job.status || '').toLowerCase() === status);
  if (type) jobs = jobs.filter((job) => String(job.type || '').toLowerCase() === type);
  res.json({
    queueMode: QUEUE_MODE,
    fallback: QUEUE_MODE !== 'redis',
    jobs
  });
});

app.post('/api/admin/jobs/:id', requireAdmin, (req, res) => {
  const jobs = getJobs();
  const job = jobs.find((item) => String(item.id) === String(req.params.id));
  if (!job) return res.status(404).json({ message: 'Queue job nenalezen.' });
  const status = String(req.body?.status || job.status || 'queued').trim().toLowerCase();
  if (!['queued', 'processing', 'done', 'failed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Neplatný stav queue jobu.' });
  }
  job.status = status;
  job.updatedAt = new Date().toISOString();
  if (!Array.isArray(job.notes)) job.notes = [];
  const note = String(req.body?.note || '').trim();
  if (note) {
    job.notes.push({
      id: makeId('job-note'),
      adminId: String(req.adminUser.id),
      text: note.slice(0, 1000),
      createdAt: new Date().toISOString()
    });
  }
  saveJobs(jobs);
  res.json(job);
});

const getPrivacyPolicy = () => ({
  version: PRIVACY_POLICY_VERSION,
  appName: 'Anuk',
  controller: 'Provozovatel aplikace Anuk',
  contact: 'Doplňte kontaktní e-mail správce osobních údajů',
  updatedAt: '2026-05-14',
  summary: [
    'Zpracováváme jen údaje potřebné pro účet, bezpečnost, sociální funkce, chaty, příspěvky a živé vysílání.',
    'Hesla ukládáme pouze jako hash, nikoli v čitelné podobě.',
    'Uživatel může požádat o přístup, opravu, výmaz, omezení, přenositelnost a námitku proti zpracování.',
    'Obsah, který zveřejníte, vidí podle nastavení veřejnost nebo sledující.'
  ],
  dataCategories: [
    'identifikační údaje: jméno, příjmení, datum narození a pohlaví',
    'kontaktní údaj: e-mail nebo telefon',
    'bezpečnostní údaje: IP adresa, zařízení, čas přihlášení a administrátorské bezpečnostní poznámky',
    'uživatelský obsah: fotky, videa, textové příspěvky, komentáře, reakce a zprávy',
    'technická data živého vysílání: dočasné kódy místností, reakce, komentáře, WebRTC signalizace a počet účastníků'
  ],
  purposes: [
    'vytvoření a správa uživatelského účtu',
    'zobrazení profilu, příspěvků, komentářů, sledování a oznámení',
    'doručení chatu, žádostí o zprávu a živého vysílání',
    'ochrana účtů, prevence zneužití, moderace a administrace',
    'splnění zákonných povinností, pokud se uplatní'
  ],
  legalBases: [
    'plnění služby vůči uživateli',
    'oprávněný zájem na bezpečnosti, moderaci a prevenci zneužití',
    'souhlas tam, kde je vyžadován',
    'zákonná povinnost, pokud ji ukládá právo'
  ],
  retention: [
    'účet a profil držíme po dobu existence účtu',
    'příspěvky, komentáře a chaty držíme do smazání uživatelem nebo administrátorem',
    'dočasné live místnosti se mažou z paměti serveru nejpozději po 6 hodinách nebo při ukončení',
    'bezpečnostní záznamy držíme po dobu potřebnou k ochraně služby'
  ],
  rights: [
    'přístup k osobním údajům',
    'oprava nepřesných údajů',
    'výmaz účtu a obsahu',
    'omezení zpracování',
    'přenositelnost údajů',
    'námitka proti zpracování',
    'odvolání souhlasu, pokud je zpracování na souhlasu založeno',
    'stížnost u dozorového úřadu'
  ],
  security: [
    'hashování hesel pomocí bcrypt',
    'bezpečnostní HTTP hlavičky a ochrana proti vložení do cizí stránku',
    'omezení počtu pokusů o přihlášení, registraci a obnovu hesla',
    'minimalizace dat v live přítomnosti, bez posílání velkých base64 profilovek',
    'uživatelský export dat a možnost smazání účtu'
  ]
});

app.get('/api/privacy-policy', (req, res) => {
  res.json(getPrivacyPolicy());
});

app.post('/api/live/rooms', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const visibility = String(req.body?.visibility || 'private').toLowerCase(); // private | public
  const title = String(req.body?.title || '').trim().slice(0, 60);
  if (!['private', 'public'].includes(visibility)) {
    return res.status(400).json({ message: 'Neplatné visibility (použijte private nebo public).' });
  }
  if (visibility === 'public' && !canBroadcastPublicLive(user)) {
    return res.status(403).json({ message: 'Veřejné vysílání může spustit pouze přihlášený uživatel.' });
  }

  const roomId = `live-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 7)}`;
  liveRooms.set(roomId, {
    id: roomId,
    ownerId: user.id,
    title,
    visibility,
    active: false, // za·ne být aktivn· a· ve chv·li, kdy vys·latel opravdu spustě stream
    startedAtTs: 0,
    createdAtTs: Date.now(),
    closed: false,
    offers: [], // { offerId, viewerId, sdp, createdAtTs }
    answers: new Map(), // offerId -> sdp
    iceToBroadcaster: [], // { offerId, candidate, createdAtTs }
    iceToViewer: new Map(), // offerId -> [{ candidate, createdAtTs }]
    comments: [], // { id, userId, userName, text, createdAtTs }
    reactions: { like: [], heart: [], fire: [], clap: [] },
    viewers: new Map()
  });
  saveLiveRooms();

  res.json({ roomId, visibility, title });
});

app.get('/api/live/rooms/:id', (req, res) => {
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });
  const audience = getLiveAudiencePayload(room);
  res.json({
    roomId: room.id,
    ownerId: room.ownerId,
    title: room.title || '',
    visibility: room.visibility || 'private',
    active: Boolean(room.active),
    startedAt: room.startedAtTs ? new Date(room.startedAtTs).toISOString() : '',
    createdAt: new Date(room.createdAtTs).toISOString(),
    viewerCount: audience.viewerCount,
    participantCount: audience.participantCount,
    participants: audience.participants
  });
});

// Vysílatel ozn·máš, že opravdu spustil stream (pžedtěm se místnost nemáš ukazovat jako aktivn·).
app.post('/api/live/rooms/:id/start', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });
  if (room.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup odepřen.' });
  }
  // kontrola role jen pro veřejné vysílání
  if (room.visibility === 'public' && !canBroadcastPublicLive(user)) {
    return res.status(403).json({ message: 'Veřejné vysílání může spustit pouze přihlášený uživatel.' });
  }

  room.active = true;
  if (!room.startedAtTs) room.startedAtTs = Date.now();
  const audience = touchLivePresence(room, user, 'broadcaster');
  saveLiveRooms();
  res.json({ success: true, ...audience });
});

// Seznam veřejnéch vysílání (pro feed)
app.get('/api/live/public', (req, res) => {
  cleanupLiveRooms();
  const users = getUsers().map(getPublicProfile);
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rooms = Array.from(liveRooms.values())
    // Zobrazovat jen re·ln· aktivn· vysílání (ne jen "vytvořenou místnost").
    .filter((room) => room && !room.closed && room.visibility === 'public' && room.active)
    .filter((room) => userMap.has(String(room.ownerId)))
    .sort((a, b) => (b.createdAtTs || 0) - (a.createdAtTs || 0))
    .slice(0, 30)
    .map((room) => {
      const owner = userMap.get(room.ownerId);
      const audience = getLiveAudiencePayload(room);
      return {
        roomId: room.id,
        title: room.title || 'Živé vysílání',
        ownerId: room.ownerId,
        ownerName: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.role : '',
        ownerRole: owner?.role || '',
        ownerPhoto: getLivePresencePhoto(owner?.profilePhoto),
        viewerCount: audience.viewerCount,
        participantCount: audience.participantCount,
        participants: audience.participants,
        startedAt: room.startedAtTs ? new Date(room.startedAtTs).toISOString() : '',
        createdAt: new Date(room.createdAtTs).toISOString()
      };
    });

  res.json({ rooms });
});

// Zavžen· místnosti (owner nebo admin)
app.post('/api/live/rooms/:id/close', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup odepřen.' });
  }
  room.closed = true;
  room.active = false;
  saveLiveRooms();
  res.json({ success: true });
});

app.post('/api/live/rooms/:id/heartbeat', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });
  const requestedRole = String(req.body?.role || '').toLowerCase();
  const role = (requestedRole === 'broadcaster' && (room.ownerId === user.id || user.role === 'admin')) ? 'broadcaster' : 'viewer';
  const audience = touchLivePresence(room, user, role);
  saveLiveRooms();
  res.json({ success: true, ...audience });
});

app.post('/api/live/rooms/:id/leave', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.json({ success: true });
  ensureLiveViewers(room).delete(String(user.id));
  saveLiveRooms();
  res.json({ success: true, ...getLiveAudiencePayload(room) });
});

app.get('/api/live/rooms/:id/participants', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });
  res.json(getLiveAudiencePayload(room));
});

// Viewer -> server: vytvo·· offer (pro p·ipojen· do live)
app.post('/api/live/rooms/:id/offers', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });

  const { sdp } = req.body || {};
  if (!sdp) return res.status(400).json({ message: 'Chybí SDP offer.' });
  touchLivePresence(room, user, String(user.id) === String(room.ownerId) ? 'broadcaster' : 'viewer');

  const offerId = `offer-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 7)}`;
  room.offers.push({
    offerId,
    viewerId: user.id,
    sdp,
    createdAtTs: Date.now()
  });
  saveLiveRooms();
  res.json({ offerId });
});

// Broadcaster -> server: pže·te nab·dky div·k·
app.get('/api/live/rooms/:id/offers', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup odepřen.' });
  }

  const since = Number(req.query.since || 0);
  const offers = room.offers
    .filter((o) => (Number(o.createdAtTs) || 0) > since)
    .map((o) => ({ offerId: o.offerId, viewerId: o.viewerId, sdp: o.sdp, createdAtTs: o.createdAtTs }));

  res.json({ now: Date.now(), offers });
});

// Broadcaster -> server: ulo·· answer pro konkr·tn· offer
app.post('/api/live/rooms/:id/answers', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ message: 'Přístup odepřen.' });
  }

  const { offerId, sdp } = req.body || {};
  if (!offerId || !sdp) return res.status(400).json({ message: 'Chybí offerId nebo SDP answer.' });

  room.answers.set(String(offerId), sdp);
  saveLiveRooms();
  res.json({ success: true });
});

// Viewer -> server: pže·te answer pro svůj offer
app.get('/api/live/rooms/:id/answers', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });

  const offerId = String(req.query.offerId || '');
  if (!offerId) return res.status(400).json({ message: 'Chybí offerId.' });
  const sdp = room.answers.get(offerId) || null;
  res.json({ sdp });
});

// ICE candidates (ob· strany)
app.post('/api/live/rooms/:id/ice', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });

  const { to, offerId, candidate } = req.body || {};
  if (!to || !candidate) return res.status(400).json({ message: 'Chybí parametr to nebo candidate.' });

  const ts = Date.now();
  if (to === 'broadcaster') {
    // pos·l· viewer -> broadcaster
    if (!offerId) return res.status(400).json({ message: 'Chybí offerId.' });
    room.iceToBroadcaster.push({ offerId: String(offerId), candidate, createdAtTs: ts });
    saveLiveRooms();
    return res.json({ success: true });
  }
  if (to === 'viewer') {
    // pos·l· broadcaster -> viewer
    if (!offerId) return res.status(400).json({ message: 'Chybí offerId.' });
    const key = String(offerId);
    if (!room.iceToViewer.has(key)) room.iceToViewer.set(key, []);
    room.iceToViewer.get(key).push({ candidate, createdAtTs: ts });
    saveLiveRooms();
    return res.json({ success: true });
  }

  res.status(400).json({ message: 'Neplatné to (použij broadcaster nebo viewer).' });
});

app.get('/api/live/rooms/:id/ice', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });

  const to = String(req.query.to || '');
  const since = Number(req.query.since || 0);

  if (to === 'broadcaster') {
    if (room.ownerId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ message: 'Přístup odepřen.' });
    }
    const candidates = room.iceToBroadcaster
      .filter((c) => (Number(c.createdAtTs) || 0) > since)
      .map((c) => ({ offerId: c.offerId, candidate: c.candidate, createdAtTs: c.createdAtTs }));
    return res.json({ now: Date.now(), candidates });
  }

  if (to === 'viewer') {
    const offerId = String(req.query.offerId || '');
    if (!offerId) return res.status(400).json({ message: 'Chybí offerId.' });
    const list = room.iceToViewer.get(offerId) || [];
    const candidates = list
      .filter((c) => (Number(c.createdAtTs) || 0) > since)
      .map((c) => ({ candidate: c.candidate, createdAtTs: c.createdAtTs }));
    return res.json({ now: Date.now(), candidates });
  }

  res.status(400).json({ message: 'Neplatné to (použij broadcaster nebo viewer).' });
});

app.get('/api/live/rooms/:id/comments', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });

  const since = Number(req.query.since || 0);
  const comments = (room.comments || [])
    .filter((c) => (Number(c.createdAtTs) || 0) > since)
    .map((c) => ({
      id: c.id,
      userId: c.userId,
      userName: c.userName,
      text: c.text,
      createdAt: new Date(c.createdAtTs).toISOString(),
      createdAtTs: c.createdAtTs
    }));
  const reactions = room.reactions || { like: [], heart: [], fire: [], clap: [] };
  res.json({
    now: Date.now(),
    comments,
    reactions: {
      like: (reactions.like || []).length,
      heart: (reactions.heart || []).length,
      fire: (reactions.fire || []).length,
      clap: (reactions.clap || []).length
    }
  });
});

app.post('/api/live/rooms/:id/comments', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const spam = guardSpam(req, res, 'live-comment', { windowMs: 30_000, max: 12, text: req.body?.text });
  if (spam) return spam;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });

  const text = String(req.body?.text || '').trim().slice(0, 500);
  if (!text) return res.status(400).json({ message: 'Komentář nesmí být prázdný.' });

  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.contact || 'Uživatel';
  const comment = {
    id: `live-comment-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 7)}`,
    userId: user.id,
    userName,
    text,
    createdAtTs: Date.now()
  };
  if (!Array.isArray(room.comments)) room.comments = [];
  room.comments.push(comment);
  room.comments = room.comments.slice(-250);
  saveLiveRooms();
  res.json({
    success: true,
    comment: {
      ...comment,
      createdAt: new Date(comment.createdAtTs).toISOString()
    }
  });
});

app.post('/api/live/rooms/:id/react', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });

  const type = String(req.body?.type || '').toLowerCase();
  const allowed = ['like', 'heart', 'fire', 'clap'];
  if (!allowed.includes(type)) return res.status(400).json({ message: 'Neplatná reakce.' });

  if (!room.reactions) room.reactions = { like: [], heart: [], fire: [], clap: [] };
  for (const key of allowed) {
    room.reactions[key] = (room.reactions[key] || []).filter((id) => String(id) !== String(user.id));
  }
  room.reactions[type].push(user.id);
  saveLiveRooms();
  res.json({
    success: true,
    reactions: {
      like: (room.reactions.like || []).length,
      heart: (room.reactions.heart || []).length,
      fire: (room.reactions.fire || []).length,
      clap: (room.reactions.clap || []).length
    }
  });
});

app.post('/api/live/rooms/:id/call-admin', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });
  if (room.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ message: 'Admina může přivolat vysílatel této místnosti.' });
  }

  const users = getUsers();
  const admins = users.filter((entry) => entry.role === 'admin');
  const message = String(req.body?.message || '').trim().slice(0, 500)
    || `Vysílatel ${getDisplayName(user)} žádá admina v live místnosti ${room.id}.`;
  const title = '🚨 Žádost o admina v live';
  for (const admin of admins) {
    pushUserNotification(admin.id, {
      type: 'live-admin-call',
      title,
      message,
      roomId: room.id,
      fromUserId: user.id,
      fromUserName: getDisplayName(user)
    });
  }
  res.json({ success: true, notified: admins.length });
});

app.post('/api/live/rooms/:id/share-followers', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const room = getLiveRoom(req.params.id);
  if (!room) return res.status(404).json({ message: 'Místnost nenalezena.' });
  if (room.closed) return res.status(410).json({ message: 'Místnost je uzavřená.' });
  if (room.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ message: 'Kód může sdílet jen vysílatel.' });
  }
  if (room.visibility !== 'private') {
    return res.status(400).json({ message: 'Sledujícím lze sdílet jen soukromé vysílání.' });
  }

  const follows = getFollows().map(normalizeFollow);
  const followerIds = [...new Set(follows
    .filter((f) => f.status === 'accepted' && String(f.toUserId) === String(room.ownerId))
    .map((f) => String(f.fromUserId)))];
  const ownerName = getDisplayName(user);
  for (const followerId of followerIds) {
    pushUserNotification(followerId, {
      type: 'live_private_invite',
      title: 'Soukromé živé vysílání',
      message: `${ownerName} sdílí soukromé live. Kód místnosti: ${room.id}`,
      roomId: room.id,
      fromUserId: user.id,
      fromUserName: ownerName
    });
  }
  res.json({ success: true, notified: followerIds.length, roomId: room.id });
});

const validatePasswordStrength = (password) => {
  const value = String(password || '');
  const issues = [];
  if (value.length < 10) issues.push('alespoň 10 znaků');
  if (!/[a-zá-ž]/i.test(value)) issues.push('písmeno');
  if (!/[0-9]/.test(value)) issues.push('číslo');
  if (!/[^A-Za-z0-9Á-ž]/.test(value)) issues.push('speciální znak');
  return {
    ok: issues.length === 0,
    message: issues.length ? `Heslo musí obsahovat: ${issues.join(', ')}.` : ''
  };
};

const normalizeContact = (contact) => String(contact || '').trim().toLowerCase();
const isEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const htmlEscape = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const makeEmailToken = () => crypto.randomBytes(32).toString('base64url');
const hashEmailToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');
const tokenIsFresh = (expiresAt) => {
  const ts = Number(new Date(expiresAt));
  return Boolean(expiresAt && !Number.isNaN(ts) && ts > Date.now());
};
const makeAbsoluteUrl = (req, pathname, params = {}) => {
  const base = getPublicAppUrl(req);
  const url = new URL(pathname, `${base}/`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url.toString();
};

const findUserBySecurityToken = (users, token, hashField, expiresField) => {
  const hash = hashEmailToken(token);
  return users.find((entry) => (
    entry?.security?.[hashField] === hash
    && tokenIsFresh(entry?.security?.[expiresField])
  ));
};

let mailTransporter = null;
let lastMailDelivery = null;
const createMailTransporter = ({ host = SMTP_HOST, port = SMTP_PORT, secure = SMTP_SECURE } = {}) => nodemailer.createTransport({
  host,
  port,
  secure,
  requireTLS: !secure,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  tls: {
    servername: host
  },
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

const getMailTransporter = () => {
  if (!SMTP_USER || !SMTP_PASS || SMTP_PASS === 'VLOZ_SEM_GMAIL_APP_PASSWORD') return null;
  if (!mailTransporter) {
    mailTransporter = createMailTransporter();
  }
  return mailTransporter;
};

const getSmtpAttemptConfig = (attempt) => {
  if (attempt === 1 || SMTP_HOST !== 'smtp.gmail.com') {
    return { host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, fallback: false };
  }
  if (SMTP_PORT === 465 && SMTP_SECURE) {
    return { host: SMTP_HOST, port: 587, secure: false, fallback: true };
  }
  return { host: SMTP_HOST, port: 465, secure: true, fallback: true };
};

const normalizeMailError = (err) => ({
  errorCode: String(err?.code || err?.responseCode || '').slice(0, 80),
  errorCommand: String(err?.command || '').slice(0, 80),
  errorMessage: String(err?.message || 'Mail send failed').slice(0, 240)
});

const sendMailWithRetry = async (mailOptions, deliveryBase) => {
  const transporter = getMailTransporter();
  if (!transporter) {
    lastMailDelivery = { ...deliveryBase, ok: false, skipped: true, reason: 'missing_smtp' };
    return { sent: false, skipped: true, reason: 'missing_smtp' };
  }

  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const smtpAttempt = getSmtpAttemptConfig(attempt);
    const transporter = smtpAttempt.fallback ? createMailTransporter(smtpAttempt) : getMailTransporter();
    try {
      const info = await transporter.sendMail({
        envelope: {
          from: SMTP_USER,
          to: mailOptions.to
        },
        sender: SMTP_USER,
        ...mailOptions
      });
      lastMailDelivery = {
        ...deliveryBase,
        ok: true,
        attempt,
        smtpHost: smtpAttempt.host,
        smtpPort: smtpAttempt.port,
        smtpSecure: smtpAttempt.secure,
        smtpFallback: smtpAttempt.fallback,
        accepted: Array.isArray(info.accepted) ? info.accepted.length : 0,
        rejected: Array.isArray(info.rejected) ? info.rejected.length : 0,
        pending: Array.isArray(info.pending) ? info.pending.length : 0,
        response: String(info.response || '').slice(0, 180),
        messageIdSet: Boolean(info.messageId)
      };
      return { sent: true, info };
    } catch (err) {
      lastErr = err;
      lastMailDelivery = {
        ...deliveryBase,
        ok: false,
        attempt,
        smtpHost: smtpAttempt.host,
        smtpPort: smtpAttempt.port,
        smtpSecure: smtpAttempt.secure,
        smtpFallback: smtpAttempt.fallback,
        ...normalizeMailError(err)
      };
      mailTransporter = null;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }
  throw lastErr;
};

const getMailDomain = (email) => {
  const normalized = normalizeContact(email);
  const at = normalized.lastIndexOf('@');
  return at > -1 ? normalized.slice(at + 1) : '';
};

const sendAccountCreatedEmail = async (user, links = {}) => {
  const to = normalizeContact(user?.contact);
  const deliveryBase = {
    type: 'account_created',
    toDomain: getMailDomain(to),
    attemptedAt: new Date().toISOString()
  };
  if (!isEmailAddress(to)) {
    console.warn(`Potvrzovací e-mail přeskočen: kontakt není e-mail (${to}).`);
    lastMailDelivery = { ...deliveryBase, ok: false, skipped: true, reason: 'not_email' };
    return { sent: false, skipped: true, reason: 'not_email' };
  }

  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn('Potvrzovací e-mail nebyl odeslán: SMTP není nakonfigurované.', getMailStatus());
    lastMailDelivery = { ...deliveryBase, ok: false, skipped: true, reason: 'missing_smtp' };
    return { sent: false, skipped: true, reason: 'missing_smtp' };
  }

  const displayName = getDisplayName(user);
  const confirmUrl = links.confirmUrl || '#';
  const deleteUrl = links.deleteUrl || '#';
  const safeDisplayName = htmlEscape(displayName);
  try {
    const result = await sendMailWithRetry({
      from: MAIL_FROM,
      to,
      subject: 'Potvrzení vytvoření účtu na Anuk',
      text: [
        'Dobrý den,',
        '',
        'děkujeme za registraci na sociální síti Anuk.',
        '',
        'Váš účet byl úspěšně vytvořen a nyní můžete začít objevovat komunitu, sdílet příspěvky a spojovat se s ostatními uživateli.',
        '',
        'Pro aktivaci účtu prosím potvrďte svou e-mailovou adresu kliknutím na odkaz níže:',
        confirmUrl,
        '',
        'Pokud jste si účet nevytvořili vy, můžete jej odstranit zde:',
        deleteUrl,
        '',
        'S pozdravem',
        'Tým Anuk'
      ].join('\n'),
      html: `
        <div style="margin:0;padding:24px;background:#f6f7fb;font-family:Arial,sans-serif;color:#111827">
          <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:28px">
            <h1 style="margin:0 0 18px;font-size:24px;color:#111827">Anuk</h1>
            <p>Dobrý den${safeDisplayName ? ` ${safeDisplayName}` : ''},</p>
            <p>děkujeme za registraci na sociální síti <strong>Anuk</strong>.</p>
            <p>Váš účet byl úspěšně vytvořen a nyní můžete začít objevovat komunitu, sdílet příspěvky a spojovat se s ostatními uživateli.</p>
            <p>Pro aktivaci účtu prosím potvrďte svou e-mailovou adresu kliknutím na odkaz níže:</p>
            <p style="margin:26px 0">
              <a href="${htmlEscape(confirmUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Potvrdit účet</a>
            </p>
            <p style="color:#4b5563">Pokud jste si účet nevytvořili vy, můžete jej odstranit zde:</p>
            <p>
              <a href="${htmlEscape(deleteUrl)}" style="color:#b91c1c;font-weight:700">Smazat účet</a>
            </p>
            <p style="margin-top:28px">S pozdravem<br>Tým Anuk</p>
          </div>
        </div>
      `
    }, deliveryBase);
    console.log(`Potvrzovací e-mail odeslán na ${to}.`);
    return { sent: true, accepted: lastMailDelivery?.accepted || 0, rejected: lastMailDelivery?.rejected || 0 };
  } catch (err) {
    lastMailDelivery = {
      ...deliveryBase,
      ok: false,
      ...normalizeMailError(err)
    };
    throw err;
  }
};

const sendDiagnosticEmail = async (to, adminUser) => {
  const target = normalizeContact(to || adminUser?.contact);
  const deliveryBase = {
    type: 'admin_test',
    toDomain: getMailDomain(target),
    attemptedAt: new Date().toISOString()
  };
  if (!isEmailAddress(target)) {
    lastMailDelivery = { ...deliveryBase, ok: false, skipped: true, reason: 'not_email' };
    return { sent: false, skipped: true, reason: 'not_email' };
  }
  if (!getMailTransporter()) {
    lastMailDelivery = { ...deliveryBase, ok: false, skipped: true, reason: 'missing_smtp' };
    return { sent: false, skipped: true, reason: 'missing_smtp' };
  }

  await sendMailWithRetry({
    from: MAIL_FROM,
    to: target,
    subject: 'Test e-mailu Anuk',
    text: [
      'Dobrý den,',
      '',
      'toto je testovací e-mail z produkční aplikace Anuk na Renderu.',
      `Čas testu: ${new Date().toISOString()}`,
      '',
      'Pokud tento e-mail dorazil, SMTP odesílání funguje.'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;color:#111827">
        <h2>Anuk - test e-mailu</h2>
        <p>Toto je testovací e-mail z produkční aplikace Anuk na Renderu.</p>
        <p><strong>Čas testu:</strong> ${htmlEscape(new Date().toISOString())}</p>
        <p>Pokud tento e-mail dorazil, SMTP odesílání funguje.</p>
      </div>
    `
  }, deliveryBase);

  return { sent: true, accepted: lastMailDelivery?.accepted || 0, rejected: lastMailDelivery?.rejected || 0 };
};

const deleteUserCascade = (userId) => {
  const id = String(userId);
  const users = getUsers();
  const userIndex = users.findIndex((entry) => String(entry.id) === id);
  if (userIndex < 0) return { ok: false, status: 404, message: 'Uživatel nenalezen.' };

  let liveChanged = false;
  for (const [roomId, room] of liveRooms.entries()) {
    if (String(room?.ownerId) === id) {
      liveRooms.delete(roomId);
      liveChanged = true;
    }
  }
  if (liveChanged) saveLiveRooms();

  users.splice(userIndex, 1);
  for (const entry of users) {
    entry.blockedUsers = (entry.blockedUsers || []).map(String).filter((blockedId) => blockedId !== id);
  }
  saveJson(USERS_FILE, users);

  const media = getMedia();
  const remainingMedia = media
    .filter((item) => String(item.ownerId) !== id)
    .map((item) => ({
      ...item,
      reactions: {
        likes: (item.reactions?.likes || []).map(String).filter((reactionUserId) => reactionUserId !== id),
        dislikes: (item.reactions?.dislikes || []).map(String).filter((reactionUserId) => reactionUserId !== id)
      },
      comments: (item.comments || [])
        .filter((comment) => String(comment.userId) !== id)
        .map((comment) => ({
          ...comment,
          reactions: {
            likes: (comment.reactions?.likes || []).map(String).filter((reactionUserId) => reactionUserId !== id),
            dislikes: (comment.reactions?.dislikes || []).map(String).filter((reactionUserId) => reactionUserId !== id)
          }
        }))
    }));
  saveJson(MEDIA_FILE, remainingMedia);

  const follows = getFollows().map(normalizeFollow).filter((follow) => String(follow.fromUserId) !== id && String(follow.toUserId) !== id);
  saveJson(FOLLOWS_FILE, follows);

  const notifMap = getNotificationsMap();
  delete notifMap[id];
  for (const key of Object.keys(notifMap)) {
    notifMap[key] = (Array.isArray(notifMap[key]) ? notifMap[key] : []).filter((n) => String(n.fromUserId || n?.meta?.fromUserId || n?.meta?.toUserId || '') !== id);
  }
  saveNotificationsMap(notifMap);

  const chats = getChats();
  chats.threads = (chats.threads || []).filter((thread) => !(thread.participantIds || []).map(String).includes(id));
  saveChats(chats);

  return { ok: true };
};

const renderEmailActionPage = (title, body, actionHtml = '') => `
<!doctype html>
<html lang="cs">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${htmlEscape(title)} | Anuk</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f7fb;color:#111827;font-family:Arial,sans-serif}
      main{width:min(560px,calc(100% - 32px));background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;box-shadow:0 18px 45px rgba(15,23,42,.08)}
      h1{margin:0 0 12px;font-size:26px}
      p{line-height:1.55;color:#374151}
      a,.btn{display:inline-block;border:0;border-radius:10px;padding:12px 16px;text-decoration:none;font-weight:700;cursor:pointer}
      a,.btn-primary{background:#111827;color:#fff}
      .btn-danger{background:#b91c1c;color:#fff}
      .muted{color:#6b7280;font-size:14px}
    </style>
  </head>
  <body>
    <main>
      <h1>${htmlEscape(title)}</h1>
      <p>${htmlEscape(body)}</p>
      ${actionHtml}
      <p class="muted">Tým Anuk</p>
    </main>
  </body>
</html>`;

app.get('/email/confirm', (req, res) => {
  const token = String(req.query.token || '').trim();
  const users = getUsers();
  const user = token ? findUserBySecurityToken(users, token, 'emailVerifyTokenHash', 'emailVerifyExpiresAt') : null;
  if (!user) {
    return res.status(400).type('html').send(renderEmailActionPage('Odkaz není platný', 'Potvrzovací odkaz je neplatný nebo vypršel.'));
  }

  user.security.emailVerifiedAt = new Date().toISOString();
  user.security.emailVerifyTokenHash = '';
  user.security.emailVerifyExpiresAt = '';
  saveJson(USERS_FILE, users);

  return res.type('html').send(renderEmailActionPage(
    'E-mail potvrzen',
    'Děkujeme. Vaše e-mailová adresa byla úspěšně potvrzena.',
    '<a href="/index.html">Pokračovat na Anuk</a>'
  ));
});

app.get('/email/delete', (req, res) => {
  const token = String(req.query.token || '').trim();
  const users = getUsers();
  const user = token ? findUserBySecurityToken(users, token, 'accountDeleteTokenHash', 'accountDeleteExpiresAt') : null;
  if (!user) {
    return res.status(400).type('html').send(renderEmailActionPage('Odkaz není platný', 'Odkaz pro smazání účtu je neplatný nebo vypršel.'));
  }

  return res.type('html').send(renderEmailActionPage(
    'Smazat účet',
    `Účet ${user.contact} můžete smazat tímto potvrzením. Tato akce odstraní profil, příspěvky, chaty, sledování a oznámení.`,
    `<form method="post" action="/email/delete">
      <input type="hidden" name="token" value="${htmlEscape(token)}">
      <button class="btn btn-danger" type="submit">Opravdu smazat účet</button>
    </form>`
  ));
});

app.post('/email/delete', (req, res) => {
  const token = String(req.body?.token || '').trim();
  const users = getUsers();
  const user = token ? findUserBySecurityToken(users, token, 'accountDeleteTokenHash', 'accountDeleteExpiresAt') : null;
  if (!user) {
    return res.status(400).type('html').send(renderEmailActionPage('Odkaz není platný', 'Odkaz pro smazání účtu je neplatný nebo vypršel.'));
  }

  const result = deleteUserCascade(user.id);
  if (!result.ok) {
    return res.status(result.status || 500).type('html').send(renderEmailActionPage('Účet se nepodařilo smazat', result.message || 'Nastala chyba.'));
  }

  return res.type('html').send(renderEmailActionPage('Účet byl smazán', 'Účet vytvořený na tuto e-mailovou adresu byl odstraněn.'));
});

app.post('/api/register', (req, res) => {
  const { contact, password, firstName, lastName, birthDate, gender, privacyAccepted, marketingConsent } = req.body;
  if (!contact || !password) {
    return res.status(400).json({ message: 'Kontakt a heslo jsou povinné.' });
  }
  if (!privacyAccepted) {
    return res.status(400).json({ message: 'Pro registraci je potřeba souhlasit se zásadami soukromí a zpracováním nezbytných údajů.' });
  }
  const passwordStrength = validatePasswordStrength(password);
  if (!passwordStrength.ok) {
    return res.status(400).json({ message: passwordStrength.message });
  }

  const users = getUsers();
  const normalizedContact = normalizeContact(contact);
  const exists = users.find((user) => String(user.contact).trim().toLowerCase() === normalizedContact);
  if (exists) {
    return res.status(409).json({ message: 'Uživatel s tímto emailem nebo číslem již existuje.' });
  }

  const nowIso = new Date().toISOString();
  const emailVerifyToken = makeEmailToken();
  const accountDeleteToken = makeEmailToken();
  const tokenExpiresAt = new Date(Date.now() + EMAIL_TOKEN_MAX_AGE_MS).toISOString();
  const user = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    contact: normalizedContact,
    passwordHash: bcrypt.hashSync(String(password), 12),
    firstName: String(firstName || '').trim(),
    lastName: String(lastName || '').trim(),
    birthDate: String(birthDate || '').trim(),
    gender: String(gender || '').trim(),
    role: users.length === 0 ? 'admin' : 'user',
    blocked: false,
    blockedReason: '',
    blockedUntil: '',
    wifiNote: '',
    lastLoginAt: '',
    lastLoginIp: '',
    lastLoginDevice: '',
    banHistory: [],
    privacy: {
      policyVersion: PRIVACY_POLICY_VERSION,
      acceptedAt: nowIso,
      marketingConsent: Boolean(marketingConsent)
    },
    security: {
      passwordChangedAt: nowIso,
      failedLoginCount: 0,
      lastFailedLoginAt: '',
      emailVerifiedAt: '',
      emailVerifyTokenHash: hashEmailToken(emailVerifyToken),
      emailVerifyExpiresAt: tokenExpiresAt,
      accountDeleteTokenHash: hashEmailToken(accountDeleteToken),
      accountDeleteExpiresAt: tokenExpiresAt
    },
    createdAt: nowIso
  };

  users.push(user);
  saveJson(USERS_FILE, users);

  req.session.regenerate(async (err) => {
    if (err) {
      console.error('Session regenerate failed:', err);
      return res.status(500).json({ message: 'Registrace proběhla, ale nepodařilo se vytvořit bezpečnou session.' });
    }
    req.session.userId = String(user.id);
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    setCsrfCookie(res, req.session.csrfToken);
    // POZOR: odesílání e-mailu může na některých hostinzích timeoutovat (např. blokovaný SMTP port).
    // Registrace nesmí čekat na SMTP – uživatel má být okamžitě přihlášený a přesměrovaný na profil.
    const mailDelivery = { sent: false, queued: true };
    Promise.resolve()
      .then(() => sendAccountCreatedEmail(user, {
        confirmUrl: makeAbsoluteUrl(req, '/email/confirm', { token: emailVerifyToken }),
        deleteUrl: makeAbsoluteUrl(req, '/email/delete', { token: accountDeleteToken })
      }))
      .catch((mailErr) => {
        console.error('Potvrzovací e-mail se nepodařilo odeslat:', mailErr);
      });
    return res.status(201).json({
      ...getPublicUser(user),
      mailDelivery
    });
  });
});

app.post('/api/login', (req, res) => {
  const { contact, password } = req.body;
  if (!contact || !password) {
    return res.status(400).json({ message: 'Kontakt a heslo jsou povinné.' });
  }

  const users = getUsers();
  const normalizedContact = normalizeContact(contact);
  const user = users.find((entry) => String(entry.contact).trim().toLowerCase() === normalizedContact);
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    if (user) {
      user.security = {
        ...(user.security || {}),
        failedLoginCount: Number(user.security?.failedLoginCount || 0) + 1,
        lastFailedLoginAt: new Date().toISOString()
      };
      saveJson(USERS_FILE, users);
    }
    return res.status(401).json({ message: 'Neplatné přihlašovací údaje.' });
  }

  if (user.blocked) {
    return res.status(403).json({ message: `Uživatel je zablokován.${user.blockedReason ? ` Důvod: ${user.blockedReason}` : ''}` });
  }

  user.lastLoginAt = new Date().toISOString();
  user.lastLoginIp = getRequestIp(req);
  user.lastLoginDevice = getDeviceInfo(req);
  user.security = {
    ...(user.security || {}),
    failedLoginCount: 0,
    lastFailedLoginAt: user.security?.lastFailedLoginAt || ''
  };
  saveJson(USERS_FILE, users);

  req.session.regenerate((err) => {
    if (err) {
      console.error('Session regenerate failed:', err);
      return res.status(500).json({ message: 'Nepodařilo se vytvořit bezpečnou session.' });
    }
    req.session.userId = String(user.id);
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    setCsrfCookie(res, req.session.csrfToken);
    return res.json(getPublicUser(user));
  });
});


app.get('/api/session', (req, res) => {
  const user = getUserFromSession(req);
  if (!user) {
    return res.json({ authenticated: false, user: null });
  }
  return res.json({ authenticated: true, user: getPublicUser(user) });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy failed:', err);
      return res.status(500).json({ message: 'Odhlášení se nepodařilo.' });
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    return res.json({ success: true });
  });
});

app.post('/api/forgot', (req, res) => {
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ message: 'Kontakt je povinné.' });
  }

  const users = getUsers();
  const normalizedContact = String(contact).trim().toLowerCase();
  const user = users.find((entry) => String(entry.contact).trim().toLowerCase() === normalizedContact);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }

  res.json({ message: `Odkaz pro obnovení byl odeslán na: ${String(contact).trim()}` });
});

app.get('/api/users/:id', (req, res) => {
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }
  res.json(getPublicUser(user));
});

app.get('/api/users', (req, res) => {
  const users = getUsers().map(getPublicProfile);
  res.json(users);
});

// =========================================================
// Sledov·n· (follow) + notifikace
// =========================================================
app.post('/api/follow/request', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const toUserId = String(req.body?.toUserId || '').trim();
  if (!toUserId) return res.status(400).json({ message: 'Chybí toUserId.' });
  if (toUserId === user.id) return res.status(400).json({ message: 'Nemůžeš sledovat sám sebe.' });

  const users = getUsers();
  const target = users.find((u) => String(u.id) === String(toUserId));
  if (!target) return res.status(404).json({ message: 'Uživatel nenalezen.' });
  if (isBlockedEitherWay(users, user.id, toUserId)) {
    return res.status(403).json({ message: 'Nelze odeslat Žádost (uživatel je zablokovaný).' });
  }

  const follows = getFollows().map(normalizeFollow);
  if (isFollowing(follows, user.id, toUserId)) {
    return res.status(409).json({ message: 'Už tohoto uživatele sleduješ.' });
  }
  if (hasPendingFollow(follows, user.id, toUserId)) {
    return res.status(409).json({ message: 'Žádost už byla odeslána.' });
  }

  const isPrivate = Boolean(target?.settings?.privateAccount);

  const request = normalizeFollow({
    id: `follow-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 7)}`,
    fromUserId: user.id,
    toUserId,
    status: isPrivate ? 'pending' : 'accepted',
    createdAt: new Date().toISOString(),
    respondedAt: isPrivate ? '' : new Date().toISOString()
  });

  follows.push(request);
  saveJson(FOLLOWS_FILE, follows);

  const requesterName = `${`${user.firstName} ${user.lastName}`.trim() || user.contact}`;

  if (isPrivate) {
    if (target?.settings?.notifications?.followRequests !== false) {
      pushNotification(toUserId, {
        id: `notif-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 7)}`,
        type: 'follow_request',
        createdAt: new Date().toISOString(),
        readAt: '',
        message: `${requesterName} chce sledovat tvůj profil.`,
        meta: { requestId: request.id, fromUserId: user.id }
      });
    }
  } else {
    // veřejné účet: okamášitě sledování + notifikace ob·ma stran·m
    if (target?.settings?.notifications?.followAccepted !== false) {
      pushNotification(toUserId, {
        id: `notif-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 7)}`,
        type: 'follow_accepted',
        createdAt: new Date().toISOString(),
        readAt: '',
        message: `${requesterName} tě začal(a) sledovat.`,
        meta: { fromUserId: user.id }
      });
    }
    pushNotification(user.id, {
      id: `notif-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 7)}`,
      type: 'follow_accepted',
      createdAt: new Date().toISOString(),
      readAt: '',
      message: `Teď sleduješ ${`${target.firstName} ${target.lastName}`.trim() || target.contact}.`,
      meta: { toUserId }
    });
  }

  res.status(201).json({ success: true, request });
});

app.get('/api/follow/requests', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const follows = getFollows().map(normalizeFollow);
  const incoming = follows
    .filter((f) => f.status === 'pending' && String(f.toUserId) === String(user.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const users = getUsers();
  const userMap = new Map(users.map((u) => [String(u.id), u]));

  res.json(incoming.map((reqItem) => {
    const from = userMap.get(String(reqItem.fromUserId));
    return {
      ...reqItem,
      from: from ? getPublicProfile(from) : null
    };
  }));
});

app.get('/api/follow/requests/outgoing', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const follows = getFollows().map(normalizeFollow);
  const outgoing = follows
    .filter((f) => f.status === 'pending' && String(f.fromUserId) === String(user.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const users = getUsers();
  const userMap = new Map(users.map((u) => [String(u.id), u]));
  res.json(outgoing.map((reqItem) => {
    const to = userMap.get(String(reqItem.toUserId));
    return { ...reqItem, to: to ? getPublicProfile(to) : null };
  }));
});

app.post('/api/follow/requests/:id/cancel', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const follows = getFollows().map(normalizeFollow);
  const item = follows.find((f) => String(f.id) === String(req.params.id));
  if (!item) return res.status(404).json({ message: 'Žádost nenalezena.' });
  if (String(item.fromUserId) !== String(user.id) && user.role !== 'admin') {
    return res.status(403).json({ message: 'Nemáš právo zružit tuto Žádost.' });
  }
  if (item.status !== 'pending') return res.status(409).json({ message: 'Žádost už byla zpracována.' });

  const next = follows.filter((f) => String(f.id) !== String(req.params.id));
  saveJson(FOLLOWS_FILE, next);
  res.json({ success: true });
});

app.get('/api/followers', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const follows = getFollows().map(normalizeFollow);
  const followers = follows
    .filter((f) => f.status === 'accepted' && String(f.toUserId) === String(user.id))
    .sort((a, b) => new Date(b.respondedAt || b.createdAt) - new Date(a.respondedAt || a.createdAt));

  const users = getUsers();
  const userMap = new Map(users.map((u) => [String(u.id), u]));
  res.json(followers.map((f) => {
    const from = userMap.get(String(f.fromUserId));
    return { followId: f.id, fromUserId: f.fromUserId, from: from ? getPublicProfile(from) : null, createdAt: f.createdAt };
  }).filter((x) => x.from));
});

app.post('/api/followers/remove', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const fromUserId = String(req.body?.fromUserId || '').trim();
  if (!fromUserId) return res.status(400).json({ message: 'Chybí fromUserId.' });

  const follows = getFollows().map(normalizeFollow);
  const next = follows.filter((f) => !(f.status === 'accepted' && String(f.fromUserId) === String(fromUserId) && String(f.toUserId) === String(user.id)));
  saveJson(FOLLOWS_FILE, next);
  res.json({ success: true });
});

app.post('/api/follow/requests/:id/respond', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const action = String(req.body?.action || '').trim().toLowerCase(); // accept | reject
  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Neplatné akce (použijte accept nebo reject).' });
  }

  const follows = getFollows().map(normalizeFollow);
  const item = follows.find((f) => String(f.id) === String(req.params.id));
  if (!item) return res.status(404).json({ message: 'Žádost nenalezena.' });

  if (String(item.toUserId) !== String(user.id) && user.role !== 'admin') {
    return res.status(403).json({ message: 'Nemáš právo zpracovat tuto Žádost.' });
  }

  if (item.status !== 'pending') {
    return res.status(409).json({ message: 'Žádost už byla zpracována.' });
  }

  item.status = action === 'accept' ? 'accepted' : 'rejected';
  item.respondedAt = new Date().toISOString();
  saveJson(FOLLOWS_FILE, follows);

  const users = getUsers();
  const targetUser = users.find((u) => String(u.id) === String(item.toUserId));
  const targetName = targetUser ? (`${targetUser.firstName} ${targetUser.lastName}`.trim() || targetUser.contact) : 'Uživatel';

  pushNotification(item.fromUserId, {
    id: `notif-${Date.now().toString(36)}${Math.random().toString(16).slice(2, 7)}`,
    type: action === 'accept' ? 'follow_accepted' : 'follow_rejected',
    createdAt: new Date().toISOString(),
    readAt: '',
    message: action === 'accept'
      ? `${targetName} přijal(a) tvoji Žádost o sledování.`
      : `${targetName} odmítl(a) tvoji Žádost o sledování.`,
    meta: { toUserId: item.toUserId }
  });

  res.json({ success: true, request: item });
});

app.get('/api/following', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const follows = getFollows().map(normalizeFollow);
  const followingIds = follows
    .filter((f) => f.status === 'accepted' && String(f.fromUserId) === String(user.id))
    .map((f) => String(f.toUserId));

  const users = getUsers();
  const map = new Map(users.map((u) => [String(u.id), u]));
  res.json(followingIds.map((id) => {
    const u = map.get(id);
    return u ? getPublicProfile(u) : null;
  }).filter(Boolean));
});

app.get('/api/follow/counts/:userId', (req, res) => {
  const userId = String(req.params.userId || '').trim();
  if (!userId) return res.status(400).json({ message: 'Chybí userId.' });

  const follows = getFollows().map(normalizeFollow);
  
  // Počet followers: lidí, kteď· sleduj· tohoto uživatele
  const followersCount = follows.filter((f) => f.status === 'accepted' && String(f.toUserId) === userId).length;
  
  // Počet following: lidí, které tento uživatel sleduje
  const followingCount = follows.filter((f) => f.status === 'accepted' && String(f.fromUserId) === userId).length;
  
  res.json({ followersCount, followingCount });
});

app.get('/api/follow/status/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const otherId = String(req.params.id || '').trim();
  if (!otherId) return res.status(400).json({ message: 'Chybí id.' });

  const follows = getFollows().map(normalizeFollow);
  const accepted = isFollowing(follows, user.id, otherId);
  const pendingOut = hasPendingFollow(follows, user.id, otherId);
  const pendingIn = hasPendingFollow(follows, otherId, user.id);

  res.json({
    userId: user.id,
    otherId,
    status: accepted ? 'accepted' : pendingOut ? 'pending_outgoing' : pendingIn ? 'pending_incoming' : 'none'
  });
});

app.post('/api/follow/unfollow', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const toUserId = String(req.body?.toUserId || '').trim();
  if (!toUserId) return res.status(400).json({ message: 'Chybí toUserId.' });

  const follows = getFollows().map(normalizeFollow);
  const next = follows.filter((f) => !(f.status === 'accepted' && String(f.fromUserId) === String(user.id) && String(f.toUserId) === String(toUserId)));
  saveJson(FOLLOWS_FILE, next);
  res.json({ success: true });
});

app.get('/api/notifications', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const map = getNotificationsMap();
  const list = Array.isArray(map[String(user.id)]) ? map[String(user.id)] : [];
  const sorted = list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

app.post('/api/notifications/:id/read', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const map = getNotificationsMap();
  const list = Array.isArray(map[String(user.id)]) ? map[String(user.id)] : [];
  const item = list.find((n) => String(n.id) === String(req.params.id));
  if (!item) return res.status(404).json({ message: 'Notifikace nenalezena.' });
  item.readAt = new Date().toISOString();
  map[String(user.id)] = list;
  saveNotificationsMap(map);
  res.json({ success: true });
});

app.delete('/api/notifications/:id', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const map = getNotificationsMap();
  const key = String(user.id);
  const list = Array.isArray(map[key]) ? map[key] : [];
  const next = list.filter((n) => String(n.id) !== String(req.params.id));
  if (next.length === list.length) return res.status(404).json({ message: 'Notifikace nenalezena.' });
  map[key] = next;
  saveNotificationsMap(map);
  res.json({ success: true });
});

app.post('/api/notifications/read-all', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const map = getNotificationsMap();
  const list = Array.isArray(map[String(user.id)]) ? map[String(user.id)] : [];
  const now = new Date().toISOString();
  for (const n of list) {
    if (!n.readAt) n.readAt = now;
  }
  map[String(user.id)] = list;
  saveNotificationsMap(map);
  res.json({ success: true });
});

app.get('/api/media', (req, res) => {
  const ownerId = req.query.ownerId;
  const currentUser = getUserFromRequest(req);
  const follows = getFollows().map(normalizeFollow);
  const items = getMedia();
  const users = getUsers();

  // Profilová zobrazen· · pokud se ptěme na konkrétního autora, omezit podle viditelnosti
  if (ownerId) {
    const targetId = String(ownerId);
    if (currentUser && isBlockedEitherWay(users, currentUser.id, targetId)) {
      return res.status(403).json({ message: 'Uživatel je zablokovaný.' });
    }
    const canSeeFollowersOnly =
      currentUser && (currentUser.role === 'admin' || String(currentUser.id) === targetId || isFollowing(follows, currentUser.id, targetId));

    const filtered = items.filter((item) => String(item.ownerId) === targetId)
      .filter((item) => {
        if (String(item.visibility || 'public') === 'public') return true;
        if (String(item.visibility) === 'followers') return Boolean(canSeeFollowersOnly);
        return false;
      });
    return res.json(filtered);
  }

  // Veřejné n·stěnka
  res.json(items.filter((item) => String(item.visibility || 'public') === 'public'));
});

// Feed pro ·Sledujiž (sledované + vlastn· p··sp·vky)
app.get('/api/media/following', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const follows = getFollows().map(normalizeFollow);
  const followingIds = new Set(
    follows
      .filter((f) => f.status === 'accepted' && String(f.fromUserId) === String(user.id))
      .map((f) => String(f.toUserId))
  );
  followingIds.add(String(user.id));

  const users = getUsers();
  const items = getMedia()
    .filter((item) => followingIds.has(String(item.ownerId)))
    .filter((item) => !isBlockedEitherWay(users, user.id, item.ownerId))
    .filter((item) => ['public', 'followers'].includes(String(item.visibility || 'public')))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(items);
});

app.get('/api/chats', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const users = getUsers();
  const userMap = new Map(users.map((u) => [String(u.id), u]));
  const chats = getChats();
  const threads = Array.isArray(chats.threads) ? chats.threads : [];
  const visible = threads
    .filter((thread) => Array.isArray(thread.participantIds) && thread.participantIds.map(String).includes(String(user.id)))
    .filter((thread) => !thread.participantIds.some((id) => id !== user.id && isBlockedEitherWay(users, user.id, id)))
    .map((thread) => {
      const otherId = thread.participantIds.map(String).find((id) => id !== String(user.id));
      const other = userMap.get(String(otherId));
      const messages = Array.isArray(thread.messages) ? thread.messages : [];
      const unreadCount = messages.filter((m) => String(m.senderId) !== String(user.id) && !m.readBy?.map?.(String).includes(String(user.id))).length;
      return {
        id: thread.id,
        status: thread.status || 'accepted',
        requestedBy: thread.requestedBy || '',
        createdAt: thread.createdAt || '',
        updatedAt: thread.updatedAt || thread.createdAt || '',
        other: other ? getPublicProfile(other) : null,
        lastMessage: messages[messages.length - 1] || null,
        unreadCount,
        messages
      };
    })
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  res.json(visible);
});

app.get('/api/chats/contacts', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const users = getUsers();
  const follows = getFollows().map(normalizeFollow);
  const mutualIds = new Set(
    follows
      .filter((f) => f.status === 'accepted' && String(f.fromUserId) === String(user.id) && isFollowing(follows, f.toUserId, user.id))
      .map((f) => String(f.toUserId))
  );
  const followingOnlyIds = new Set(
    follows
      .filter((f) => f.status === 'accepted' && String(f.fromUserId) === String(user.id) && !mutualIds.has(String(f.toUserId)))
      .map((f) => String(f.toUserId))
  );

  const contacts = users
    .filter((u) => String(u.id) !== String(user.id))
    .filter((u) => !isBlockedEitherWay(users, user.id, u.id))
    .filter((u) => mutualIds.has(String(u.id)) || followingOnlyIds.has(String(u.id)))
    .map((u) => ({
      ...getPublicProfile(u),
      chatAccess: mutualIds.has(String(u.id)) ? 'direct' : 'request'
    }));

  res.json(contacts);
});

app.post('/api/chats/messages', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const spam = guardSpam(req, res, 'chat-message', { windowMs: 60_000, max: 30, text: req.body?.text });
  if (spam) return spam;

  const toUserId = String(req.body?.toUserId || '').trim();
  const text = String(req.body?.text || '').trim();
  const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments.slice(0, 4) : [];
  if (!toUserId) return res.status(400).json({ message: 'Chybí příjemce zprávy.' });
  if (!text && !attachments.length) return res.status(400).json({ message: 'Zpráva nesmí být prázdná.' });
  if (toUserId === String(user.id)) return res.status(400).json({ message: 'Nelze psát sám sobě.' });

  const users = getUsers();
  const target = users.find((u) => String(u.id) === toUserId);
  if (!target) return res.status(404).json({ message: 'Uživatel nenalezen.' });
  if (isBlockedEitherWay(users, user.id, toUserId)) return res.status(403).json({ message: 'Chat je blokovaný.' });

  const follows = getFollows().map(normalizeFollow);
  const mutual = isMutualFollow(follows, user.id, toUserId);
  const followsTarget = isFollowing(follows, user.id, toUserId);
  const targetFollowsUser = isFollowing(follows, toUserId, user.id);
  if (!mutual && !followsTarget && !targetFollowsUser) {
    return res.status(403).json({ message: 'Nejdřív se musíte aspoň jednostranně sledovat. Pak zpráva půjde do žádostí.' });
  }

  const chats = getChats();
  if (!Array.isArray(chats.threads)) chats.threads = [];
  let thread = chats.threads.find((t) => {
    const ids = (t.participantIds || []).map(String);
    return ids.includes(String(user.id)) && ids.includes(toUserId);
  });
  const now = new Date().toISOString();
  if (!thread) {
    thread = {
      id: makeId('chat'),
      participantIds: [String(user.id), toUserId],
      status: mutual ? 'accepted' : 'requested',
      requestedBy: mutual ? '' : String(user.id),
      createdAt: now,
      updatedAt: now,
      messages: []
    };
    chats.threads.push(thread);
  }
  if (mutual && thread.status !== 'accepted') {
    thread.status = 'accepted';
    thread.requestedBy = '';
  }
  if (thread.status === 'rejected' && String(thread.requestedBy) !== String(user.id)) {
    thread.status = mutual ? 'accepted' : 'requested';
  }

  const normalizedAttachments = attachments.map((a) => {
    const type = ['image', 'video', 'call'].includes(String(a?.type)) ? String(a.type) : 'file';
    const url = String(a?.url || '');
    return {
      type,
      url: url.startsWith('data:') ? '' : url.slice(0, 2000),
      name: String(a?.name || '').slice(0, 120),
      callKind: ['audio', 'video'].includes(String(a?.callKind)) ? String(a.callKind) : '',
      callStatus: ['started', 'accepted', 'rejected', 'ended', 'missed'].includes(String(a?.callStatus)) ? String(a.callStatus) : ''
    };
  }).filter((a) => a.type === 'call' || a.url);

  const message = {
    id: makeId('msg'),
    senderId: String(user.id),
    text: text.slice(0, 2000),
    attachments: normalizedAttachments,
    createdAt: now,
    readBy: [String(user.id)]
  };
  if (!Array.isArray(thread.messages)) thread.messages = [];
  thread.messages.push(message);
  thread.updatedAt = now;
  saveChats(chats);

  const callAttachment = normalizedAttachments.find((a) => a.type === 'call' && a.callStatus === 'started');
  pushUserNotification(toUserId, {
    type: callAttachment ? 'call' : (thread.status === 'requested' ? 'message_request' : 'message'),
    title: callAttachment ? 'Příchozí hovor' : (thread.status === 'requested' ? 'Nová žádost o zprávu' : 'Nová zpráva'),
    message: callAttachment
      ? `${getDisplayName(user)} volá (${callAttachment.callKind === 'video' ? 'video' : 'audio'}).`
      : `${getDisplayName(user)}: ${text || 'poslal(a) přílohu'}`,
    fromUserId: String(user.id),
    threadId: thread.id,
    createdAt: now
  });

  res.status(201).json({ threadId: thread.id, status: thread.status, message });
});

app.post('/api/chats/:id/read', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const chats = getChats();
  const thread = (chats.threads || []).find((t) => String(t.id) === String(req.params.id));
  if (!thread || !thread.participantIds?.map(String).includes(String(user.id))) return res.status(404).json({ message: 'Chat nenalezen.' });
  (thread.messages || []).forEach((m) => {
    if (!Array.isArray(m.readBy)) m.readBy = [];
    if (!m.readBy.map(String).includes(String(user.id))) m.readBy.push(String(user.id));
  });
  saveChats(chats);
  res.json({ success: true });
});

app.post('/api/chats/:id/calls/:messageId/respond', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const action = String(req.body?.action || '').toLowerCase();
  if (!['accept', 'reject', 'end', 'missed'].includes(action)) {
    return res.status(400).json({ message: 'Akce musí být accept, reject, end nebo missed.' });
  }

  const chats = getChats();
  const thread = (chats.threads || []).find((t) => String(t.id) === String(req.params.id));
  if (!thread || !thread.participantIds?.map(String).includes(String(user.id))) {
    return res.status(404).json({ message: 'Chat nenalezen.' });
  }

  const message = (thread.messages || []).find((m) => String(m.id) === String(req.params.messageId));
  const call = message?.attachments?.find((a) => a.type === 'call');
  if (!message || !call) return res.status(404).json({ message: 'Hovor nenalezen.' });

  const fromUserId = String(message.senderId || '');
  const otherUserId = (thread.participantIds || []).map(String).find((id) => id !== String(user.id));
  if (action === 'accept' && fromUserId === String(user.id)) {
    return res.status(400).json({ message: 'Vlastní hovor nejde přijmout.' });
  }

  const nextStatus = action === 'accept'
    ? 'accepted'
    : action === 'reject'
      ? 'rejected'
      : action === 'missed'
        ? 'missed'
        : 'ended';
  call.callStatus = nextStatus;
  call.respondedBy = String(user.id);
  call.respondedAt = new Date().toISOString();
  thread.updatedAt = call.respondedAt;
  saveChats(chats);

  if (otherUserId) {
    pushUserNotification(otherUserId, {
      type: 'call',
      title: nextStatus === 'accepted' ? 'Hovor přijat' : nextStatus === 'rejected' ? 'Hovor odmítnut' : 'Hovor ukončen',
      message: `${getDisplayName(user)}: ${nextStatus === 'accepted' ? 'přijal(a) hovor' : nextStatus === 'rejected' ? 'odmítl(a) hovor' : 'ukončil(a) hovor'}`,
      fromUserId: String(user.id),
      threadId: thread.id,
      createdAt: thread.updatedAt
    });
  }

  res.json({ success: true, status: nextStatus, threadId: thread.id, messageId: message.id });
});

const getChatCallContext = (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return null;

  const chats = getChats();
  const thread = (chats.threads || []).find((t) => String(t.id) === String(req.params.id));
  if (!thread || !thread.participantIds?.map(String).includes(String(user.id))) {
    res.status(404).json({ message: 'Chat nenalezen.' });
    return null;
  }

  const message = (thread.messages || []).find((m) => String(m.id) === String(req.params.messageId));
  const call = message?.attachments?.find((a) => a.type === 'call');
  if (!message || !call) {
    res.status(404).json({ message: 'Hovor nenalezen.' });
    return null;
  }

  const key = `${thread.id}:${message.id}`;
  if (!chatCallSignals.has(key)) {
    chatCallSignals.set(key, {
      offer: null,
      answer: null,
      iceToCaller: [],
      iceToCallee: [],
      updatedAt: Date.now()
    });
  }
  return { user, thread, message, call, key, signal: chatCallSignals.get(key) };
};

app.post('/api/chats/:id/calls/:messageId/offer', (req, res) => {
  const ctx = getChatCallContext(req, res);
  if (!ctx) return;
  if (String(ctx.message.senderId) !== String(ctx.user.id)) {
    return res.status(403).json({ message: 'Offer může vytvořit jen volající.' });
  }
  const sdp = req.body?.sdp;
  if (!sdp) return res.status(400).json({ message: 'Chybí SDP offer.' });
  ctx.signal.offer = sdp;
  ctx.signal.updatedAt = Date.now();
  res.json({ success: true });
});

app.get('/api/chats/:id/calls/:messageId/offer', (req, res) => {
  const ctx = getChatCallContext(req, res);
  if (!ctx) return;
  res.json({ offer: ctx.signal.offer || null, now: Date.now() });
});

app.post('/api/chats/:id/calls/:messageId/answer', (req, res) => {
  const ctx = getChatCallContext(req, res);
  if (!ctx) return;
  if (String(ctx.message.senderId) === String(ctx.user.id)) {
    return res.status(403).json({ message: 'Answer může vytvořit jen příjemce.' });
  }
  const sdp = req.body?.sdp;
  if (!sdp) return res.status(400).json({ message: 'Chybí SDP answer.' });
  ctx.signal.answer = sdp;
  ctx.signal.updatedAt = Date.now();
  res.json({ success: true });
});

app.get('/api/chats/:id/calls/:messageId/answer', (req, res) => {
  const ctx = getChatCallContext(req, res);
  if (!ctx) return;
  res.json({ answer: ctx.signal.answer || null, now: Date.now() });
});

app.post('/api/chats/:id/calls/:messageId/ice', (req, res) => {
  const ctx = getChatCallContext(req, res);
  if (!ctx) return;
  const to = String(req.body?.to || '');
  const candidate = req.body?.candidate;
  if (!candidate || !['caller', 'callee'].includes(to)) {
    return res.status(400).json({ message: 'Chybí ICE kandidát nebo cíl.' });
  }
  const entry = { candidate, createdAtTs: Date.now(), fromUserId: String(ctx.user.id) };
  if (to === 'caller') ctx.signal.iceToCaller.push(entry);
  if (to === 'callee') ctx.signal.iceToCallee.push(entry);
  ctx.signal.updatedAt = Date.now();
  res.json({ success: true });
});

app.get('/api/chats/:id/calls/:messageId/ice', (req, res) => {
  const ctx = getChatCallContext(req, res);
  if (!ctx) return;
  const to = String(req.query.to || '');
  const since = Number(req.query.since || 0);
  if (!['caller', 'callee'].includes(to)) {
    return res.status(400).json({ message: 'Neplatný cíl ICE.' });
  }
  const list = to === 'caller' ? ctx.signal.iceToCaller : ctx.signal.iceToCallee;
  res.json({
    now: Date.now(),
    candidates: list
      .filter((entry) => (Number(entry.createdAtTs) || 0) > since && String(entry.fromUserId) !== String(ctx.user.id))
      .map((entry) => ({ candidate: entry.candidate, createdAtTs: entry.createdAtTs }))
  });
});

app.post('/api/chats/:id/respond', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const action = String(req.body?.action || '').toLowerCase();
  if (!['accept', 'reject'].includes(action)) return res.status(400).json({ message: 'Akce musí být accept nebo reject.' });

  const chats = getChats();
  const thread = (chats.threads || []).find((t) => String(t.id) === String(req.params.id));
  if (!thread || !thread.participantIds?.map(String).includes(String(user.id))) return res.status(404).json({ message: 'Chat nenalezen.' });
  if (String(thread.requestedBy) === String(user.id)) return res.status(400).json({ message: 'Na vlastní žádost nejde odpovědět.' });
  thread.status = action === 'accept' ? 'accepted' : 'rejected';
  thread.updatedAt = new Date().toISOString();
  saveChats(chats);
  res.json({ success: true, status: thread.status });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = getUsers().map(getPublicUser);
  res.json(users);
});

app.post('/api/admin/mail-test', requireAdmin, async (req, res) => {
  try {
    const result = await sendDiagnosticEmail(req.body?.to, req.adminUser);
    res.json({
      success: Boolean(result.sent),
      result,
      mail: getMailStatus()
    });
  } catch (err) {
    res.status(502).json({
      success: false,
      message: 'Testovací e-mail se nepodařilo odeslat.',
      mail: getMailStatus(),
      error: normalizeMailError(err)
    });
  }
});

app.post('/api/admin/users/:id/block', requireAdmin, (req, res) => {
  const { reason = '' } = req.body;
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }
  if (user.role === 'admin' && user.id === req.adminUser.id) {
    return res.status(400).json({ message: 'Nelze zablokovat vlastního administrátora.' });
  }
  user.blocked = true;
  user.blockedReason = String(reason).trim();
  saveJson(USERS_FILE, users);
  res.json(getPublicUser(user));
});

app.post('/api/admin/users/:id/unblock', requireAdmin, (req, res) => {
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }
  user.blocked = false;
  user.blockedReason = '';
  saveJson(USERS_FILE, users);
  res.json(getPublicUser(user));
});

app.post('/api/admin/users/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!role || !['user', 'admin', 'creator'].includes(role)) {
    return res.status(400).json({ message: 'Role musí být user, admin nebo creator.' });
  }
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }
  if (user.id === req.adminUser.id && role !== 'admin') {
    return res.status(400).json({ message: 'Nelze odebrat administrátorská práva sám sobě.' });
  }
  user.role = role;
  saveJson(USERS_FILE, users);
  res.json(getPublicUser(user));
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const users = getUsers();
  const userIndex = users.findIndex((entry) => entry.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }
  if (users[userIndex].id === req.adminUser.id) {
    return res.status(400).json({ message: 'Nelze smazat svého vlastního administrátora.' });
  }
  users.splice(userIndex, 1);
  saveJson(USERS_FILE, users);
  res.json({ message: 'Uživatel byl smazán.' });
});

app.get('/api/admin/media', requireAdmin, (req, res) => {
  const items = getMedia();
  res.json(items);
});

app.delete('/api/admin/media/:id', requireAdmin, (req, res) => {
  const items = getMedia();
  const itemIndex = items.findIndex((entry) => entry.id === req.params.id);
  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Média nenalezena.' });
  }
  items.splice(itemIndex, 1);
  saveJson(MEDIA_FILE, items);
  res.json({ message: 'Média byla smazána.' });
});

app.post('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
  const { hours = 24, reason = '' } = req.body;
  const banHours = Number(hours);
  if (Number.isNaN(banHours) || banHours <= 0) {
    return res.status(400).json({ message: 'Čas banu musí být kladné číslo hodin.' });
  }

  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }
  if (user.id === req.adminUser.id) {
    return res.status(400).json({ message: 'Nelze si udělit ban sám sobě.' });
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + banHours * 60 * 60 * 1000).toISOString();

  user.blocked = true;
  user.blockedReason = String(reason || 'Ban udělen správcem.').trim();
  user.blockedUntil = endsAt;
  user.banHistory = user.banHistory || [];
  user.banHistory.unshift({
    id: `ban-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    adminId: req.adminUser.id,
    adminContact: req.adminUser.contact,
    reason: user.blockedReason,
    startAt: now.toISOString(),
    endAt: endsAt,
    active: true
  });

  saveJson(USERS_FILE, users);
  res.json(getPublicUser(user));
});

app.post('/api/admin/users/:id/unban', requireAdmin, (req, res) => {
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }

  user.blocked = false;
  user.blockedReason = '';
  user.blockedUntil = '';
  if (Array.isArray(user.banHistory)) {
    user.banHistory = user.banHistory.map((entry) => ({ ...entry, active: false }));
  }

  saveJson(USERS_FILE, users);
  res.json(getPublicUser(user));
});

app.post('/api/admin/users/:id/note', requireAdmin, (req, res) => {
  const { wifiName = '' } = req.body;
  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }
  user.wifiNote = String(wifiName).trim();
  saveJson(USERS_FILE, users);
  res.json(getPublicUser(user));
});

app.post('/api/admin/media/:id/wifi', requireAdmin, (req, res) => {
  const { wifiName = '' } = req.body;
  const items = getMedia();
  const item = items.find((entry) => entry.id === req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Média nenalezena.' });
  }
  item.wifiNote = String(wifiName).trim();
  saveJson(MEDIA_FILE, items);
  res.json(item);
});

app.post('/api/users/:id/profile', (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser || currentUser.id !== req.params.id) {
    return res.status(403).json({ message: 'Neplatný přístup k profilu.' });
  }

  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Uživatel nenalezen.' });
  }

  const { profilePhoto = '', coverVideo = '', bio = '' } = req.body;
  user.profilePhoto = String(profilePhoto || user.profilePhoto).trim();
  user.coverVideo = String(coverVideo || user.coverVideo).trim();
  user.bio = String(bio || user.bio).trim();

  saveJson(USERS_FILE, users);
  res.json(getPublicUser(user));
});

app.post('/api/users/:id/identity', (req, res) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser || String(currentUser.id) !== String(req.params.id)) {
    return res.status(403).json({ message: 'Neplatný přístup k účtu.' });
  }

  const { firstName = '', lastName = '', contact = '', currentPassword = '' } = req.body || {};
  const normalizedContact = String(contact).trim().toLowerCase();
  if (!String(firstName).trim() || !String(lastName).trim() || !normalizedContact) {
    return res.status(400).json({ message: 'Jméno, příjmení a kontakt jsou povinné.' });
  }

  const users = getUsers();
  const user = users.find((entry) => String(entry.id) === String(req.params.id));
  if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });
  if (!currentPassword || !bcrypt.compareSync(String(currentPassword), user.passwordHash)) {
    return res.status(401).json({ message: 'Heslo není správné.' });
  }
  const duplicate = users.find((entry) => String(entry.id) !== String(user.id) && String(entry.contact || '').trim().toLowerCase() === normalizedContact);
  if (duplicate) return res.status(409).json({ message: 'Tento email nebo telefon už používá jiný účet.' });

  user.firstName = String(firstName).trim();
  user.lastName = String(lastName).trim();
  user.contact = normalizedContact;
  saveJson(USERS_FILE, users);
  res.json(getPublicUser(user));
});

app.delete('/api/users/:id', (req, res) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser || String(currentUser.id) !== String(req.params.id)) {
    return res.status(403).json({ message: 'Neplatný přístup k účtu.' });
  }

  const { currentPassword = '', confirmText = '' } = req.body || {};
  const users = getUsers();
  const userIndex = users.findIndex((entry) => String(entry.id) === String(req.params.id));
  if (userIndex < 0) return res.status(404).json({ message: 'Uživatel nenalezen.' });
  const user = users[userIndex];
  if (!currentPassword || !bcrypt.compareSync(String(currentPassword), user.passwordHash)) {
    return res.status(401).json({ message: 'Heslo není správné.' });
  }
  if (String(confirmText).trim().toUpperCase() !== 'SMAZAT') {
    return res.status(400).json({ message: 'Pro potvrzení napiš SMAZAT.' });
  }

  const userId = String(user.id);
  let liveChanged = false;
  for (const [roomId, room] of liveRooms.entries()) {
    if (String(room?.ownerId) === userId) {
      liveRooms.delete(roomId);
      liveChanged = true;
    }
  }
  if (liveChanged) saveLiveRooms();

  users.splice(userIndex, 1);
  for (const entry of users) {
    entry.blockedUsers = (entry.blockedUsers || []).map(String).filter((id) => id !== userId);
  }
  saveJson(USERS_FILE, users);

  const media = getMedia();
  const remainingMedia = media
    .filter((item) => String(item.ownerId) !== userId)
    .map((item) => ({
      ...item,
      reactions: {
        likes: (item.reactions?.likes || []).map(String).filter((id) => id !== userId),
        dislikes: (item.reactions?.dislikes || []).map(String).filter((id) => id !== userId)
      },
      comments: (item.comments || [])
        .filter((comment) => String(comment.userId) !== userId)
        .map((comment) => ({
          ...comment,
          reactions: {
            likes: (comment.reactions?.likes || []).map(String).filter((id) => id !== userId),
            dislikes: (comment.reactions?.dislikes || []).map(String).filter((id) => id !== userId)
          }
        }))
    }));
  saveJson(MEDIA_FILE, remainingMedia);

  const follows = getFollows().map(normalizeFollow).filter((follow) => String(follow.fromUserId) !== userId && String(follow.toUserId) !== userId);
  saveJson(FOLLOWS_FILE, follows);

  const notifMap = getNotificationsMap();
  delete notifMap[userId];
  for (const key of Object.keys(notifMap)) {
    notifMap[key] = (Array.isArray(notifMap[key]) ? notifMap[key] : []).filter((n) => String(n.fromUserId || n?.meta?.fromUserId || n?.meta?.toUserId || '') !== userId);
  }
  saveNotificationsMap(notifMap);

  const chats = getChats();
  chats.threads = (chats.threads || []).filter((thread) => !(thread.participantIds || []).map(String).includes(userId));
  saveChats(chats);

  res.json({ success: true });
});

app.get('/api/users/:id/settings', (req, res) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser) return;
  const requestedId = String(req.params.id);
  const effectiveId = (String(currentUser.id) === requestedId || currentUser.role === 'admin') ? requestedId : String(currentUser.id);
  const users = getUsers();
  const user = users.find((entry) => String(entry.id) === effectiveId);
  if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });
  res.json({
    settings: user.settings || {},
    blockedUsers: Array.isArray(user.blockedUsers) ? user.blockedUsers : []
  });
});

app.post('/api/users/:id/settings', (req, res) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser) return;
  const requestedId = String(req.params.id);
  const effectiveId = (String(currentUser.id) === requestedId || currentUser.role === 'admin') ? requestedId : String(currentUser.id);
  const users = getUsers();
  const user = users.find((entry) => String(entry.id) === effectiveId);
  if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });

  const next = user.settings || {};
  if (typeof req.body?.privateAccount === 'boolean') {
    next.privateAccount = Boolean(req.body.privateAccount);
  }
  const n = next.notifications || {};
  if (typeof req.body?.notifications?.followRequests === 'boolean') n.followRequests = Boolean(req.body.notifications.followRequests);
  if (typeof req.body?.notifications?.followAccepted === 'boolean') n.followAccepted = Boolean(req.body.notifications.followAccepted);
  if (typeof req.body?.notifications?.followRejected === 'boolean') n.followRejected = Boolean(req.body.notifications.followRejected);
  next.notifications = n;
  const p = next.preferences || {};
  const requestedTheme = String(req.body?.preferences?.theme || p.theme || 'glass');
  const requestedDensity = String(req.body?.preferences?.density || p.density || 'comfortable');
  const requestedTextScale = String(req.body?.preferences?.textScale || p.textScale || 'normal');
  const requestedRadius = String(req.body?.preferences?.radius || p.radius || 'soft');
  const requestedLayoutWidth = String(req.body?.preferences?.layoutWidth || p.layoutWidth || 'standard');
  const requestedGlassStrength = String(req.body?.preferences?.glassStrength || p.glassStrength || 'frosted');
  const requestedAccent = String(req.body?.preferences?.accent || p.accent || 'teal');
  const requestedBackgroundEffects = String(req.body?.preferences?.backgroundEffects || p.backgroundEffects || 'quiet');
  const requestedNavigation = String(req.body?.preferences?.navigation || p.navigation || 'full');
  if (['glass', 'contrast', 'calm'].includes(requestedTheme)) p.theme = requestedTheme;
  if (['comfortable', 'compact'].includes(requestedDensity)) p.density = requestedDensity;
  if (['normal', 'large'].includes(requestedTextScale)) p.textScale = requestedTextScale;
  if (['sharp', 'soft', 'rounded'].includes(requestedRadius)) p.radius = requestedRadius;
  if (['standard', 'wide'].includes(requestedLayoutWidth)) p.layoutWidth = requestedLayoutWidth;
  if (['clear', 'frosted', 'solid'].includes(requestedGlassStrength)) p.glassStrength = requestedGlassStrength;
  if (['teal', 'violet', 'blue', 'amber'].includes(requestedAccent)) p.accent = requestedAccent;
  if (['quiet', 'standard', 'off'].includes(requestedBackgroundEffects)) p.backgroundEffects = requestedBackgroundEffects;
  if (['full', 'compact'].includes(requestedNavigation)) p.navigation = requestedNavigation;
  if (typeof req.body?.preferences?.reduceMotion === 'boolean') p.reduceMotion = Boolean(req.body.preferences.reduceMotion);
  if (typeof req.body?.preferences?.enterToSend === 'boolean') p.enterToSend = Boolean(req.body.preferences.enterToSend);
  if (typeof req.body?.preferences?.chatSound === 'boolean') p.chatSound = Boolean(req.body.preferences.chatSound);
  if (typeof req.body?.preferences?.mediaAutoplay === 'boolean') p.mediaAutoplay = Boolean(req.body.preferences.mediaAutoplay);
  next.preferences = {
    theme: p.theme || 'glass',
    density: p.density || 'comfortable',
    textScale: p.textScale || 'normal',
    radius: p.radius || 'soft',
    layoutWidth: p.layoutWidth || 'standard',
    glassStrength: p.glassStrength || 'frosted',
    reduceMotion: Boolean(p.reduceMotion),
    enterToSend: p.enterToSend !== false,
    chatSound: Boolean(p.chatSound),
    accent: p.accent || 'teal',
    backgroundEffects: p.backgroundEffects || 'quiet',
    navigation: p.navigation || 'full',
    mediaAutoplay: Boolean(p.mediaAutoplay),
    updatedAt: new Date().toISOString()
  };
  user.settings = next;

  saveJson(USERS_FILE, users);
  res.json({ success: true, settings: user.settings });
});

app.post('/api/users/:id/password', (req, res) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser) return;

  if (String(currentUser.id) !== String(req.params.id) && currentUser.role !== 'admin') {
    return res.status(403).json({ message: 'Neplatný přístup.' });
  }

  const { currentPassword, newPassword } = req.body || {};
  const passwordStrength = validatePasswordStrength(newPassword);
  if (!passwordStrength.ok) {
    return res.status(400).json({ message: passwordStrength.message });
  }

  const users = getUsers();
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });

  // Admin může resetovat i bez znalosti starého hesla
  const isAdminReset = currentUser.role === 'admin' && String(currentUser.id) !== String(req.params.id);
  if (!isAdminReset) {
    if (!currentPassword) return res.status(400).json({ message: 'Chybí současné heslo.' });
    if (!bcrypt.compareSync(String(currentPassword), user.passwordHash)) {
      return res.status(401).json({ message: 'Současné heslo není správné.' });
    }
  }

  user.passwordHash = bcrypt.hashSync(String(newPassword), 12);
  user.security = {
    ...(user.security || {}),
    passwordChangedAt: new Date().toISOString(),
    failedLoginCount: 0
  };
  saveJson(USERS_FILE, users);
  res.json({ success: true });
});

app.get('/api/users/:id/export', (req, res) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser) return;
  if (String(currentUser.id) !== String(req.params.id) && currentUser.role !== 'admin') {
    return res.status(403).json({ message: 'Export může stáhnout jen vlastník účtu nebo admin.' });
  }

  const users = getUsers();
  const user = users.find((entry) => String(entry.id) === String(req.params.id));
  if (!user) return res.status(404).json({ message: 'Uživatel nenalezen.' });

  const userId = String(user.id);
  const media = getMedia();
  const follows = getFollows().map(normalizeFollow);
  const notifications = getNotificationsMap();
  const chats = getChats();
  const ownedMedia = media.filter((item) => String(item.ownerId) === userId);
  const comments = media.flatMap((item) => (Array.isArray(item.comments) ? item.comments : [])
    .filter((comment) => String(comment.userId) === userId)
    .map((comment) => ({ mediaId: item.id, mediaTitle: item.title || '', ...comment })));
  const chatThreads = (Array.isArray(chats.threads) ? chats.threads : [])
    .filter((thread) => (thread.participants || []).map(String).includes(userId))
    .map((thread) => ({
      ...thread,
      messages: (thread.messages || []).filter((message) => (thread.participants || []).map(String).includes(userId))
    }));

  res.json({
    exportedAt: new Date().toISOString(),
    policyVersion: PRIVACY_POLICY_VERSION,
    account: getPublicUser(user),
    content: {
      media: ownedMedia,
      comments
    },
    social: {
      following: follows.filter((f) => String(f.fromUserId) === userId),
      followers: follows.filter((f) => String(f.toUserId) === userId)
    },
    notifications: Array.isArray(notifications[userId]) ? notifications[userId] : [],
    chats: chatThreads
  });
});

// Blokace uživatel· (pro běžné uživatele v nastaven·)
app.get('/api/blocks', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const users = getUsers();
  const me = users.find((u) => String(u.id) === String(user.id));
  if (!me) return res.status(404).json({ message: 'Uživatel nenalezen.' });
  const blocked = Array.isArray(me.blockedUsers) ? me.blockedUsers.map(String) : [];
  const map = new Map(users.map((u) => [String(u.id), u]));
  res.json(blocked.map((id) => {
    const u = map.get(String(id));
    return u ? getPublicProfile(u) : null;
  }).filter(Boolean));
});

app.post('/api/block', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const targetId = String(req.body?.userId || '').trim();
  if (!targetId) return res.status(400).json({ message: 'Chybí userId.' });
  if (targetId === user.id) return res.status(400).json({ message: 'Nemůžeš zablokovat sám sebe.' });

  const users = getUsers();
  const me = users.find((u) => String(u.id) === String(user.id));
  const target = users.find((u) => String(u.id) === String(targetId));
  if (!me || !target) return res.status(404).json({ message: 'Uživatel nenalezen.' });

  if (!Array.isArray(me.blockedUsers)) me.blockedUsers = [];
  if (!me.blockedUsers.map(String).includes(String(targetId))) {
    me.blockedUsers.push(String(targetId));
  }
  saveJson(USERS_FILE, users);
  res.json({ success: true });
});

app.post('/api/unblock', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const targetId = String(req.body?.userId || '').trim();
  if (!targetId) return res.status(400).json({ message: 'Chybí userId.' });

  const users = getUsers();
  const me = users.find((u) => String(u.id) === String(user.id));
  if (!me) return res.status(404).json({ message: 'Uživatel nenalezen.' });
  me.blockedUsers = (me.blockedUsers || []).map(String).filter((id) => id !== String(targetId));
  saveJson(USERS_FILE, users);
  res.json({ success: true });
});

const TEXT_STYLE_DEFAULTS = {
  preset: 'soft',
  fontFamily: 'Inter',
  fontSize: 20,
  textColor: '#f8fafc',
  backgroundColor: '#1f2937',
  textAlign: 'left',
  borderStyle: 'glass',
  bold: false,
  italic: false,
  shadow: true
};

const sanitizeTextStyle = (style = {}) => {
  const allowedFonts = new Set(['Inter', 'Georgia', 'Trebuchet MS', 'Courier New', 'Impact']);
  const allowedAligns = new Set(['left', 'center', 'right']);
  const allowedBorders = new Set(['glass', 'clean', 'bold']);
  const allowedPresets = new Set(['soft', 'sunset', 'ocean', 'ink', 'paper']);
  const safeHex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
  const fontSize = Math.max(16, Math.min(34, Number.parseInt(style.fontSize, 10) || TEXT_STYLE_DEFAULTS.fontSize));

  return {
    preset: allowedPresets.has(String(style.preset || '')) ? String(style.preset) : TEXT_STYLE_DEFAULTS.preset,
    fontFamily: allowedFonts.has(String(style.fontFamily || '')) ? String(style.fontFamily) : TEXT_STYLE_DEFAULTS.fontFamily,
    fontSize,
    textColor: safeHex(style.textColor, TEXT_STYLE_DEFAULTS.textColor),
    backgroundColor: safeHex(style.backgroundColor, TEXT_STYLE_DEFAULTS.backgroundColor),
    textAlign: allowedAligns.has(String(style.textAlign || '')) ? String(style.textAlign) : TEXT_STYLE_DEFAULTS.textAlign,
    borderStyle: allowedBorders.has(String(style.borderStyle || '')) ? String(style.borderStyle) : TEXT_STYLE_DEFAULTS.borderStyle,
    bold: Boolean(style.bold),
    italic: Boolean(style.italic),
    shadow: style.shadow !== false
  };
};

app.post('/api/media', (req, res) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser) return;
  const spam = guardSpam(req, res, 'media-create', { windowMs: 10 * 60_000, max: 20, text: `${req.body?.title || ''} ${req.body?.description || ''}` });
  if (spam) return spam;

  const { ownerId, title, type, url, visibility } = req.body;
  const normalizedType = String(type || '').trim().toLowerCase();
  const description = String(req.body.description || '').trim();

  if (!ownerId || !normalizedType) {
    return res.status(400).json({ message: 'ownerId a type jsou povinné.' });
  }
  if (String(ownerId) !== String(currentUser.id) && currentUser.role !== 'admin') {
    return res.status(403).json({ message: 'Nelze publikovat příspěvek za jiného uživatele.' });
  }

  // Text příspěvek: nevyžaduje url, ale vyžaduje popis (text).
  if (normalizedType === 'text') {
    if (!description) {
      return res.status(400).json({ message: 'Text příspěvek musí mít vyplněný text (description).' });
    }
  } else {
    // Foto/video: url je povinné. Nové uploady mají být soubory přes /api/uploads,
    // ne obří data URL/base64 uložené v databázi.
    if (!title || !url) {
      return res.status(400).json({ message: 'ownerId, title, type a url jsou povinné.' });
    }
    if (String(url).startsWith('data:')) {
      return res.status(400).json({ message: 'Soubor nejdřív nahrajte přes /api/uploads, data URL už se do databáze neukládá.' });
    }
  }

  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ownerId,
    title: String(title || '').trim() || (normalizedType === 'text' ? 'Textový příspěvek' : 'Bez názvu'),
    type: normalizedType,
    url: String(url || ''),
    description,
    visibility: ['public', 'followers'].includes(String(visibility || '').toLowerCase())
      ? String(visibility).toLowerCase()
      : 'public',
    textStyle: normalizedType === 'text' ? sanitizeTextStyle(req.body.textStyle || {}) : undefined,
    createdAt: new Date().toISOString(),
    ipAddress: getRequestIp(req),
    deviceInfo: getDeviceInfo(req),
    wifiNote: '',
    reactions: { likes: [], dislikes: [] },
    comments: []
  };

  const items = getMedia();
  items.push(item);
  saveJson(MEDIA_FILE, items);

  res.status(201).json(item);
});

app.post('/api/media/:id/react', (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) {
    return res.status(403).json({ message: 'Neautorizováno' });
  }

  const items = getMedia();
  const item = items.find((entry) => entry.id === req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Média nenalezena.' });
  }

  const { type } = req.body; // 'like' nebo 'dislike'
  if (!item.reactions) {
    item.reactions = { likes: [], dislikes: [] };
  }

  const likes = item.reactions.likes || [];
  const dislikes = item.reactions.dislikes || [];
  const userId = currentUser.id;

  if (type === 'like') {
    const wasLiked = likes.includes(userId);
    if (!wasLiked) {
      likes.push(userId);
    }
    const disIdx = dislikes.indexOf(userId);
    if (disIdx > -1) {
      dislikes.splice(disIdx, 1);
    }
    if (!wasLiked && String(item.ownerId) !== String(userId)) {
      pushUserNotification(item.ownerId, {
        type: 'media_like',
        title: 'Nový like',
        message: `${getDisplayName(currentUser)} dal(a) like na tvůj příspěvek „${item.title || 'Příspěvek'}“.`,
        fromUserId: userId,
        mediaId: item.id
      });
    }
  } else if (type === 'dislike') {
    const wasDisliked = dislikes.includes(userId);
    if (!wasDisliked) {
      dislikes.push(userId);
    }
    const likeIdx = likes.indexOf(userId);
    if (likeIdx > -1) {
      likes.splice(likeIdx, 1);
    }
    if (!wasDisliked && String(item.ownerId) !== String(userId)) {
      pushUserNotification(item.ownerId, {
        type: 'media_dislike',
        title: 'Nový dislike',
        message: `${getDisplayName(currentUser)} dal(a) dislike na tvůj příspěvek „${item.title || 'Příspěvek'}“.`,
        fromUserId: userId,
        mediaId: item.id
      });
    }
  }

  item.reactions = { likes, dislikes };
  saveJson(MEDIA_FILE, items);
  res.json(item.reactions);
});

app.post('/api/media/:id/comment', (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) {
    return res.status(403).json({ message: 'Neautorizováno' });
  }
  const spam = guardSpam(req, res, 'media-comment', { windowMs: 60_000, max: 20, text: req.body?.text });
  if (spam) return spam;

  const items = getMedia();
  const item = items.find((entry) => entry.id === req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Média nenalezena.' });
  }

  const { text } = req.body;
  if (!text || !String(text).trim()) {
    return res.status(400).json({ message: 'Komentář nesmí být prázdné.' });
  }

  if (!Array.isArray(item.comments)) {
    item.comments = [];
  }

  const comment = {
    id: `comment-${Date.now()}`,
    userId: currentUser.id,
    userName: `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.contact,
    text: String(text).trim(),
    createdAt: new Date().toISOString(),
    reactions: { likes: [], dislikes: [] }
  };

  item.comments.push(comment);
  saveJson(MEDIA_FILE, items);
  if (String(item.ownerId) !== String(currentUser.id)) {
    pushUserNotification(item.ownerId, {
      type: 'comment',
      title: 'Nový komentář',
      message: `${getDisplayName(currentUser)} okomentoval(a) tvůj příspěvek „${item.title || 'Příspěvek'}“.`,
      fromUserId: currentUser.id,
      mediaId: item.id,
      commentId: comment.id
    });
  }
  res.json(comment);
});

app.post('/api/media/:id/comment/:commentId/react', (req, res) => {
  const currentUser = requireAuth(req, res);
  if (!currentUser) return;

  const items = getMedia();
  const item = items.find((entry) => entry.id === req.params.id);
  if (!item || !Array.isArray(item.comments)) return res.status(404).json({ message: 'Komentář nenalezen.' });
  const comment = item.comments.find((c) => String(c.id) === String(req.params.commentId));
  if (!comment) return res.status(404).json({ message: 'Komentář nenalezen.' });

  const type = String(req.body?.type || '').toLowerCase();
  if (!['like', 'dislike'].includes(type)) return res.status(400).json({ message: 'Reakce musí být like nebo dislike.' });
  if (!comment.reactions) comment.reactions = { likes: [], dislikes: [] };
  const likes = Array.isArray(comment.reactions.likes) ? comment.reactions.likes.map(String) : [];
  const dislikes = Array.isArray(comment.reactions.dislikes) ? comment.reactions.dislikes.map(String) : [];
  const userId = String(currentUser.id);

  if (type === 'like') {
    const wasLiked = likes.includes(userId);
    if (!wasLiked) likes.push(userId);
    const idx = dislikes.indexOf(userId);
    if (idx > -1) dislikes.splice(idx, 1);
    if (!wasLiked && String(comment.userId) !== userId) {
      pushUserNotification(comment.userId, {
        type: 'comment_like',
        title: 'Like na komentář',
        message: `${getDisplayName(currentUser)} dal(a) like na tvůj komentář.`,
        fromUserId: userId,
        mediaId: item.id,
        commentId: comment.id
      });
    }
  } else {
    const wasDisliked = dislikes.includes(userId);
    if (!wasDisliked) dislikes.push(userId);
    const idx = likes.indexOf(userId);
    if (idx > -1) likes.splice(idx, 1);
    if (!wasDisliked && String(comment.userId) !== userId) {
      pushUserNotification(comment.userId, {
        type: 'comment_dislike',
        title: 'Dislike na komentář',
        message: `${getDisplayName(currentUser)} dal(a) dislike na tvůj komentář.`,
        fromUserId: userId,
        mediaId: item.id,
        commentId: comment.id
      });
    }
  }

  comment.reactions = { likes, dislikes };
  saveJson(MEDIA_FILE, items);
  res.json(comment.reactions);
});

app.post('/api/media/:id/comment/:commentId/delete', (req, res) => {
  const currentUser = getUserFromRequest(req);
  if (!currentUser) {
    return res.status(403).json({ message: 'Neautorizováno' });
  }

  const items = getMedia();
  const item = items.find((entry) => entry.id === req.params.id);
  if (!item) {
    return res.status(404).json({ message: 'Média nenalezena.' });
  }

  if (!Array.isArray(item.comments)) {
    return res.status(404).json({ message: 'Komentář nenalezen.' });
  }

  const commentIdx = item.comments.findIndex((c) => c.id === req.params.commentId);
  if (commentIdx < 0) {
    return res.status(404).json({ message: 'Komentář nenalezen.' });
  }

  const comment = item.comments[commentIdx];
  if (comment.userId !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ message: 'Nelze smazat cizí komentář.' });
  }

  item.comments.splice(commentIdx, 1);
  saveJson(MEDIA_FILE, items);
  res.json({ success: true });
});

// 404 handler (hlavně pro /api, aby klient nedostal HTML a nepadal na JSON parse)
app.use((req, res) => {
  if (req.path?.startsWith('/api/')) {
    return res.status(404).json({ message: 'Endpoint nenalezen.' });
  }
  return res.status(404).type('text/plain; charset=utf-8').send('Not found');
});

// Error handler (JSON pro /api, text pro statické stránky)
app.use((err, req, res, next) => {
  if (!err) return next();
  const status = Number(err.statusCode || err.status) || 500;
  const safeStatus = status >= 400 && status <= 599 ? status : 500;
  const isApi = req.path?.startsWith('/api/');

  // Typicky chybný JSON v requestu (express.json)
  if (err.type === 'entity.parse.failed' && isApi) {
    return res.status(400).json({ message: 'Neplatný JSON v requestu.' });
  }

  // Log jen na server, klientovi posílat bezpečnou hlášku.
  console.error('Server error:', err);
  const message = safeStatus >= 500 ? 'Interní chyba serveru.' : (err.message || 'Chyba');

  if (isApi) {
    return res.status(safeStatus).json({ message });
  }
  return res.status(safeStatus).type('text/plain; charset=utf-8').send(message);
});

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
