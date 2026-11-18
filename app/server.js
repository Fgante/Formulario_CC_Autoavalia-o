// =============================================================================
// SERVIDOR (Node + Express) – ponto central do sistema
//
// Mapa deste arquivo:
//   - Sessão / permissões ............ usuarioDaSessao, exigirLogin, exigirAdmin
//   - Login .......................... POST /api/login
//   - CRIAÇÃO DE CONTA ............... POST /api/cadastro
//   - Páginas protegidas ............. GET /, /perfil, /admin
//   - Perguntas ...................... GET /api/questionario   (vêm de questoes.js)
//   - RECEBE + CALCULA + SALVA ....... POST /api/avaliacoes
//   - Consultas (perfil e admin) ..... GET /api/avaliacoes, /api/admin/avaliacoes, /api/avaliacoes/:id
//   - Migração do banco e início ..... migrar(), app.listen
//
// Pastas servidas:
//   public/  → arquivos abertos a todos (css, js, fontes, login.html, cadastro.html)
//   paginas/ → páginas que só abrem com login (formulário, perfil, admin)
// =============================================================================
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const { ESTAGIOS, DIMENSOES, QUESTOES, avaliarQuestao, classificar } = require('./questoes');
const { hashSenha, conferirSenha, criarToken, lerToken, lerCookie, cookieSessao, DURACAO_MS } = require('./auth');

// Conexão com o PostgreSQL (endereço definido em docker-compose.yml → DATABASE_URL)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.set('trust proxy', 'loopback, uniquelocal'); // IP real atrás do túnel/proxy
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
const pagina = (nome) => path.join(__dirname, 'paginas', nome);

// Higieniza texto vindo do navegador: garante string, tira espaços e limita o tamanho
const s = (v, max = 255) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ESFERAS = ['Federal', 'Estadual', 'Municipal', 'Distrital'];

// ---------------- Limite de tentativas (login e cadastro) ----------------
// Proteção simples contra força bruta, guardada em memória (zera se o servidor reiniciar).
// Em produção com mais de um servidor, trocar por algo compartilhado (ex.: Redis).
const limites = new Map(); // chave -> { n, ate }
function excedeu(chave, max, janelaMs) {
  const agora = Date.now();
  const l = limites.get(chave);
  if (!l || l.ate < agora) { limites.set(chave, { n: 1, ate: agora + janelaMs }); return false; }
  l.n += 1;
  return l.n > max;
}

// ---------------- Sessão e permissões ----------------
// A sessão é um cookie assinado (ver auth.js) que guarda o login. A cada requisição
// o usuário é buscado no banco – assim, remover o usuário corta o acesso na hora.
async function usuarioDaSessao(req) {
  const login = lerToken(lerCookie(req));
  if (!login) return null;
  const { rows: [u] } = await pool.query('SELECT id, login, nome, email, perfil FROM usuarios WHERE login = $1', [login]);
  return u || null;
}

// Bloqueia quem não está logado: API → erro 401; página → manda para o login
function exigirLogin(req, res, next) {
  usuarioDaSessao(req).then((u) => {
    if (u) { req.usuario = u; res.setHeader('Cache-Control', 'no-store'); return next(); }
    if (req.path.startsWith('/api/')) return res.status(401).json({ erro: 'Não autenticado.' });
    return res.redirect(`/login.html?volta=${encodeURIComponent(req.originalUrl)}`);
  }).catch(next);
}

// Só deixa passar perfil 'admin' (usar sempre DEPOIS de exigirLogin)
function exigirAdmin(req, res, next) {
  if (req.usuario?.perfil === 'admin') return next();
  if (req.path.startsWith('/api/')) return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
  return res.redirect('/perfil');
}

// ---------------- LOGIN ----------------
// Confere a senha digitada contra o hash gravado (scrypt, ver auth.js) e cria o cookie de sessão.
app.post('/api/login', async (req, res) => {
  if (excedeu(`login:${req.ip}`, 5, 15 * 60 * 1000)) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' });
  const login = s(req.body?.login, 40).toLowerCase();
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
  const { rows: [u] } = await pool.query('SELECT login, senha_hash FROM usuarios WHERE login = $1', [login]);
  if (!u || !conferirSenha(senha, u.senha_hash)) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  limites.delete(`login:${req.ip}`);
  res.setHeader('Set-Cookie', cookieSessao(criarToken(u.login), DURACAO_MS));
  res.json({ ok: true });
});

// ---------------- CRIAÇÃO DE CONTA (cadastro pelo site) ----------------
// Valida os dados, grava o usuário com perfil 'usuario' e senha em hash, e já faz o login.
// Administradores NÃO são criados aqui: use `node usuarios.js` (ver README).
app.post('/api/cadastro', async (req, res) => {
  const nome = s(req.body?.nome, 200);
  const email = s(req.body?.email, 200).toLowerCase();
  const login = s(req.body?.login, 40).toLowerCase();
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
  const erros = [];
  if (nome.length < 3) erros.push('Informe seu nome completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push('E-mail inválido.');
  if (!/^[a-z0-9._-]{3,40}$/.test(login)) erros.push('Login deve ter de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.');
  if (senha.length < 8 || senha.length > 200) erros.push('A senha deve ter pelo menos 8 caracteres.');
  if (erros.length) return res.status(400).json({ erro: erros.join('\n') });
  if (excedeu(`cadastro:${req.ip}`, 10, 60 * 60 * 1000)) return res.status(429).json({ erro: 'Muitos cadastros a partir desta rede. Tente mais tarde.' });
  try {
    // SALVA o novo usuário (a senha nunca é gravada, só o hash)
    await pool.query('INSERT INTO usuarios (login, senha_hash, nome, email, perfil) VALUES ($1,$2,$3,$4,$5)',
      [login, hashSenha(senha), nome, email, 'usuario']);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'Este login já está em uso. Escolha outro.' });
    throw e;
  }
  res.setHeader('Set-Cookie', cookieSessao(criarToken(login), DURACAO_MS));
  res.status(201).json({ ok: true });
});

// ---------------- LOGOUT (apaga o cookie) e dados do usuário logado ----------------
app.post('/api/logout', (_req, res) => {
  res.setHeader('Set-Cookie', cookieSessao('', 0));
  res.json({ ok: true });
});

app.get('/api/me', exigirLogin, (req, res) => res.json(req.usuario));

// ---------------- Páginas protegidas (arquivos da pasta paginas/) ----------------
app.get(['/', '/index.html'], exigirLogin, (_req, res) => res.sendFile(pagina('formulario.html')));
app.get('/perfil', exigirLogin, (_req, res) => res.sendFile(pagina('perfil.html')));
app.get('/admin', exigirLogin, exigirAdmin, (_req, res) => res.sendFile(pagina('admin.html')));

// ---------------- Questionário ----------------
// Entrega ao formulário a lista de perguntas definida em questoes.js
app.get('/api/questionario', exigirLogin, (_req, res) => res.json({ ESTAGIOS, DIMENSOES, QUESTOES }));

// ---------------- RECEBE O FORMULÁRIO → CALCULA → SALVA → DEVOLVE O RESULTADO ----------------
// Etapas:
//   1. Validação dos dados (o navegador já valida, mas nunca confiamos só nele)
//   2. CÁLCULO da classificação: classificar(respostas) em questoes.js
//   3. GRAVAÇÃO no banco, numa transação (tudo ou nada):
//        orgaos (cria ou atualiza pelo CNPJ) → classificacoes (resultado + quem respondeu) → respostas (1 linha por questão)
//   4. SAÍDA: devolve o resultado em JSON; o navegador exibe com resultado.js
app.post('/api/avaliacoes', exigirLogin, async (req, res) => {
  const { orgao = {}, avaliacao = {}, respostas = {} } = req.body || {};
  // --- 1. Validação ---
  const cnpj = s(orgao.cnpj, 30).replace(/\D/g, '');
  const erros = [];
  if (!s(orgao.nome)) erros.push('Nome do órgão é obrigatório.');
  if (cnpj.length !== 14) erros.push('CNPJ deve ter 14 dígitos.');
  if (!ESFERAS.includes(orgao.esfera)) erros.push('Esfera inválida.');
  if (!s(avaliacao.objeto_custo, 2000)) erros.push('Informe o objeto de custo avaliado.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(avaliacao.data || '') || Number.isNaN(Date.parse(avaliacao.data))) erros.push('Data da avaliação inválida.');

  // Triagem é sempre obrigatória; se a triagem for aprovada, todas as demais também são.
  const tpFalhou = QUESTOES.filter((q) => q.estagio === 'TP').some((q) => respostas[q.codigo] === 'nao');
  const obrigatorias = tpFalhou ? QUESTOES.filter((q) => q.estagio === 'TP') : QUESTOES;
  const faltando = obrigatorias.filter((q) => !avaliarQuestao(q, respostas[q.codigo]).respondida).map((q) => q.codigo);
  if (faltando.length) erros.push(`Questões sem resposta: ${faltando.join(', ')}`);
  if (erros.length) return res.status(400).json({ erros });

  // --- 2. CÁLCULO da classificação (regras do Anexo 4, em questoes.js) ---
  const resultado = classificar(respostas);

  // --- 3. GRAVAÇÃO no banco (transação: se algo falhar, nada é salvo) ---
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 3a. Órgão: cria, ou atualiza os dados se o CNPJ já existir
    const { rows: [org] } = await client.query(
      `INSERT INTO orgaos (nome, cnpj, esfera, poder, uf, municipio, responsavel, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (cnpj) DO UPDATE SET nome=EXCLUDED.nome, esfera=EXCLUDED.esfera, poder=EXCLUDED.poder,
         uf=EXCLUDED.uf, municipio=EXCLUDED.municipio, responsavel=EXCLUDED.responsavel, email=EXCLUDED.email
       RETURNING id`,
      [s(orgao.nome), cnpj, orgao.esfera, s(orgao.poder, 30) || null, s(orgao.uf, 2).toUpperCase() || null,
        s(orgao.municipio, 120) || null, s(orgao.responsavel, 200) || null, s(orgao.email, 200) || null],
    );
    // 3b. Classificação: o resultado do cálculo + quem respondeu (usuario_id) + detalhes por estágio (JSON)
    const { rows: [cls] } = await client.query(
      `INSERT INTO classificacoes (orgao_id, usuario_id, data_avaliacao, objeto_custo, justificativa, nivel, triagem_aprovada, classificacao, detalhes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [org.id, req.usuario.id, avaliacao.data, s(avaliacao.objeto_custo, 2000), s(avaliacao.justificativa, 4000) || null,
        resultado.nivel, resultado.triagemOk, resultado.classificacao,
        JSON.stringify({ estagios: resultado.estagios, lacunas: resultado.lacunas })],
    );
    // 3c. Respostas: uma linha por questão respondida, com o texto escolhido e os pontos/gate
    for (const q of QUESTOES) {
      const r = avaliarQuestao(q, respostas[q.codigo]);
      if (!r.respondida) continue;
      await client.query(
        `INSERT INTO respostas (orgao_id, classificacao_id, questao_codigo, estagio, dimensao, tipo, resposta, atende_gate, pontos, itens_marcados)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [org.id, cls.id, q.codigo, q.estagio, q.dimensao, q.tipo, r.texto,
          q.tipo === 'O' ? r.atende : null, q.tipo === 'P' ? r.pontos : null,
          q.itens ? JSON.stringify(r.marcados.map((i) => q.itens[i].t)) : null],
      );
    }
    await client.query('COMMIT');
    // --- 4. SAÍDA: resultado do cálculo devolvido ao navegador ---
    res.status(201).json({ id: cls.id, orgaoId: org.id, ...resultado });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ erros: ['Erro ao salvar no banco de dados.'] });
  } finally {
    client.release();
  }
});

// ---------------- CONSULTA de avaliações salvas ----------------
// Base da listagem: avaliação + órgão + quem respondeu
const SQL_LISTA = `
  SELECT c.id, o.nome, o.cnpj, o.esfera, c.data_avaliacao, c.objeto_custo, c.nivel, c.classificacao, c.criado_em,
         u.nome AS respondente, u.login AS respondente_login
    FROM classificacoes c JOIN orgaos o ON o.id = c.orgao_id LEFT JOIN usuarios u ON u.id = c.usuario_id`;

// Minhas avaliações (todo usuário)
app.get('/api/avaliacoes', exigirLogin, async (req, res) => {
  const { rows } = await pool.query(`${SQL_LISTA} WHERE c.usuario_id = $1 ORDER BY c.criado_em DESC`, [req.usuario.id]);
  res.json(rows);
});

// Todas as avaliações (só admin)
app.get('/api/admin/avaliacoes', exigirLogin, exigirAdmin, async (_req, res) => {
  const { rows } = await pool.query(`${SQL_LISTA} ORDER BY c.criado_em DESC LIMIT 1000`);
  res.json(rows);
});

// Detalhe de uma avaliação (resultado + respostas): só o dono ou um admin.
// Para os demais responde 404, sem revelar que a avaliação existe.
app.get('/api/avaliacoes/:id', exigirLogin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).end();
  const { rows: [c] } = await pool.query(
    `SELECT c.*, o.nome, o.cnpj, o.esfera, u.nome AS respondente, u.login AS respondente_login
       FROM classificacoes c JOIN orgaos o ON o.id = c.orgao_id LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.id = $1`, [id],
  );
  if (!c || (c.usuario_id !== req.usuario.id && req.usuario.perfil !== 'admin')) return res.status(404).json({ erro: 'Avaliação não encontrada.' });
  const { rows: respostas } = await pool.query('SELECT * FROM respostas WHERE classificacao_id = $1 ORDER BY id', [id]);
  res.json({ ...c, respostas });
});

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ erro: 'Erro interno.' }); });

// ---------------- Migração e início ----------------
// Ajusta um banco criado por versões anteriores (colunas novas). Em banco novo,
// as tabelas já vêm de db/init.sql e estes comandos não fazem nada.
async function migrar() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY, login VARCHAR(80) NOT NULL UNIQUE, senha_hash TEXT NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT now());
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome VARCHAR(200);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(200);
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil VARCHAR(10) NOT NULL DEFAULT 'usuario';
    ALTER TABLE classificacoes ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_classificacoes_usuario ON classificacoes(usuario_id);`);
}

const port = process.env.PORT || 3000;
migrar()
  .then(() => app.listen(port, () => console.log(`Formulário GCSP em http://localhost:${port}`)))
  .catch((e) => { console.error(e); process.exit(1); });
