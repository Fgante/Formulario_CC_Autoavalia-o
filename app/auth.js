// Autenticação da área restrita: senhas com scrypt, sessão em cookie assinado (HMAC)
const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas
const COOKIE = 'gcsp_sessao';

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(senha, salt, 64).toString('hex')}`;
}

function conferirSenha(senha, armazenado) {
  const [salt, hash] = String(armazenado).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(senha, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const assinar = (dados) => crypto.createHmac('sha256', SECRET).update(dados).digest('base64url');

function criarToken(login) {
  const dados = Buffer.from(JSON.stringify({ u: login, exp: Date.now() + DURACAO_MS })).toString('base64url');
  return `${dados}.${assinar(dados)}`;
}

function lerToken(token) {
  const [dados, sig] = String(token || '').split('.');
  if (!dados || !sig) return null;
  const esperado = assinar(dados);
  if (sig.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(dados, 'base64url').toString());
    return exp > Date.now() ? u : null;
  } catch { return null; }
}

function lerCookie(req) {
  const par = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  return par ? decodeURIComponent(par.slice(COOKIE.length + 1)) : null;
}

function cookieSessao(token, maxAgeMs) {
  const seguro = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${seguro}`;
}

module.exports = { hashSenha, conferirSenha, criarToken, lerToken, lerCookie, cookieSessao, DURACAO_MS };
