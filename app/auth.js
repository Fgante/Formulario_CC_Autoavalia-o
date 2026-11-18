// =============================================================================
// SEGURANÇA: senhas e sessão (usado por server.js e usuarios.js)
//
//   hashSenha / conferirSenha → a senha NUNCA é gravada. Grava-se "salt:hash" (scrypt),
//                               que não pode ser revertido para a senha original.
//   criarToken / lerToken     → sessão em cookie assinado com HMAC: o cookie diz quem é
//                               o usuário e até quando vale; a assinatura impede falsificação.
//   cookieSessao              → monta o cookie (HttpOnly: o JavaScript da página não lê).
// =============================================================================
const crypto = require('crypto');

// Chave que assina as sessões. Sem SESSION_SECRET definido, é gerada ao iniciar
// (efeito: todos precisam logar de novo quando o servidor reinicia). Em produção, defina uma fixa.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas
const COOKIE = 'gcsp_sessao';

// Gera o hash para gravar no banco (salt aleatório por usuário)
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(senha, salt, 64).toString('hex')}`;
}

// No login: recalcula o hash da senha digitada e compara (comparação em tempo constante)
function conferirSenha(senha, armazenado) {
  const [salt, hash] = String(armazenado).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(senha, salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const assinar = (dados) => crypto.createHmac('sha256', SECRET).update(dados).digest('base64url');

// Token de sessão = dados (login + validade) em base64 + "." + assinatura
function criarToken(login) {
  const dados = Buffer.from(JSON.stringify({ u: login, exp: Date.now() + DURACAO_MS })).toString('base64url');
  return `${dados}.${assinar(dados)}`;
}

// Devolve o login se o token for autêntico e não tiver expirado; senão, null
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
