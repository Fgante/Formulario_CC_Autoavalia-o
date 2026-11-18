const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const { ESTAGIOS, DIMENSOES, QUESTOES, avaliarQuestao, classificar } = require('./questoes');
const { conferirSenha, criarToken, lerToken, lerCookie, cookieSessao, DURACAO_MS } = require('./auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/questionario', (_req, res) => res.json({ ESTAGIOS, DIMENSOES, QUESTOES }));

const ESFERAS = ['Federal', 'Estadual', 'Municipal', 'Distrital'];
const s = (v, max = 255) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

app.post('/api/avaliacoes', async (req, res) => {
  const { orgao = {}, avaliacao = {}, respostas = {} } = req.body || {};
  const cnpj = s(orgao.cnpj, 30).replace(/\D/g, '');
  const erros = [];
  if (!s(orgao.nome)) erros.push('Nome do órgão é obrigatório.');
  if (cnpj.length !== 14) erros.push('CNPJ deve ter 14 dígitos.');
  if (!ESFERAS.includes(orgao.esfera)) erros.push('Esfera inválida.');
  if (!s(avaliacao.objeto_custo, 2000)) erros.push('Informe o objeto de custo avaliado.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(avaliacao.data || '')) erros.push('Data da avaliação inválida.');

  // Triagem é sempre obrigatória; se a triagem for aprovada, todas as demais também são.
  const tpFalhou = QUESTOES.filter((q) => q.estagio === 'TP').some((q) => respostas[q.codigo] === 'nao');
  const obrigatorias = tpFalhou ? QUESTOES.filter((q) => q.estagio === 'TP') : QUESTOES;
  const faltando = obrigatorias.filter((q) => !avaliarQuestao(q, respostas[q.codigo]).respondida).map((q) => q.codigo);
  if (faltando.length) erros.push(`Questões sem resposta: ${faltando.join(', ')}`);
  if (erros.length) return res.status(400).json({ erros });

  const resultado = classificar(respostas);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [org] } = await client.query(
      `INSERT INTO orgaos (nome, cnpj, esfera, poder, uf, municipio, responsavel, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (cnpj) DO UPDATE SET nome=EXCLUDED.nome, esfera=EXCLUDED.esfera, poder=EXCLUDED.poder,
         uf=EXCLUDED.uf, municipio=EXCLUDED.municipio, responsavel=EXCLUDED.responsavel, email=EXCLUDED.email
       RETURNING id`,
      [s(orgao.nome), cnpj, orgao.esfera, s(orgao.poder, 30) || null, s(orgao.uf, 2).toUpperCase() || null,
        s(orgao.municipio, 120) || null, s(orgao.responsavel, 200) || null, s(orgao.email, 200) || null],
    );
    const { rows: [cls] } = await client.query(
      `INSERT INTO classificacoes (orgao_id, data_avaliacao, objeto_custo, justificativa, nivel, triagem_aprovada, classificacao, detalhes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, criado_em`,
      [org.id, avaliacao.data, s(avaliacao.objeto_custo, 2000), s(avaliacao.justificativa, 4000) || null,
        resultado.nivel, resultado.triagemOk, resultado.classificacao,
        JSON.stringify({ estagios: resultado.estagios, lacunas: resultado.lacunas })],
    );
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
    res.status(201).json({ id: cls.id, orgaoId: org.id, ...resultado });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ erros: ['Erro ao salvar no banco de dados.'] });
  } finally {
    client.release();
  }
});

// ---------------- Área restrita ----------------
const tentativas = new Map(); // ip -> { falhas, bloqueadoAte }

app.post('/api/login', async (req, res) => {
  const ip = req.ip;
  const t = tentativas.get(ip) || { falhas: 0, bloqueadoAte: 0 };
  if (t.bloqueadoAte > Date.now()) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' });
  const login = s(req.body?.login, 80);
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
  const { rows: [u] } = await pool.query('SELECT login, senha_hash FROM usuarios WHERE login = $1', [login]);
  if (!u || !conferirSenha(senha, u.senha_hash)) {
    t.falhas += 1;
    if (t.falhas >= 5) { t.falhas = 0; t.bloqueadoAte = Date.now() + 15 * 60 * 1000; }
    tentativas.set(ip, t);
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }
  tentativas.delete(ip);
  res.setHeader('Set-Cookie', cookieSessao(criarToken(u.login), DURACAO_MS));
  res.json({ ok: true });
});

app.post('/api/logout', (_req, res) => {
  res.setHeader('Set-Cookie', cookieSessao('', 0));
  res.json({ ok: true });
});

// Exige sessão válida de um usuário que ainda exista na tabela (remover o usuário revoga o acesso)
async function exigirLogin(req, res, next) {
  const login = lerToken(lerCookie(req));
  const ok = login && (await pool.query('SELECT 1 FROM usuarios WHERE login = $1', [login])).rowCount;
  if (ok) { req.usuario = login; res.setHeader('Cache-Control', 'no-store'); return next(); }
  if (req.path.startsWith('/api/')) return res.status(401).json({ erro: 'Não autenticado.' });
  return res.redirect('/login.html');
}

app.get('/admin', exigirLogin, (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/api/admin/me', exigirLogin, (req, res) => res.json({ login: req.usuario }));

app.get('/api/admin/avaliacoes', exigirLogin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, o.nome, o.cnpj, o.esfera, c.data_avaliacao, c.objeto_custo, c.nivel, c.classificacao, c.criado_em
       FROM classificacoes c JOIN orgaos o ON o.id = c.orgao_id ORDER BY c.criado_em DESC LIMIT 500`,
  );
  res.json(rows);
});

app.get('/api/admin/avaliacoes/:id', exigirLogin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).end();
  const { rows: [c] } = await pool.query(
    `SELECT c.*, o.nome, o.cnpj, o.esfera FROM classificacoes c JOIN orgaos o ON o.id = c.orgao_id WHERE c.id = $1`, [id],
  );
  if (!c) return res.status(404).end();
  const { rows: respostas } = await pool.query('SELECT * FROM respostas WHERE classificacao_id = $1 ORDER BY id', [id]);
  res.json({ ...c, respostas });
});

const port = process.env.PORT || 3000;
pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY, login VARCHAR(80) NOT NULL UNIQUE, senha_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now())`)
  .then(() => app.listen(port, () => console.log(`Formulário GCSP em http://localhost:${port}`)))
  .catch((e) => { console.error(e); process.exit(1); });
