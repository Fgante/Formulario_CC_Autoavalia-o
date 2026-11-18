// Gerencia quem pode acessar a área restrita.
// Uso (dentro do contêiner):
//   node usuarios.js adicionar <login> <senha>    (também troca a senha se já existir)
//   node usuarios.js remover <login>
//   node usuarios.js listar
const { Pool } = require('pg');
const { hashSenha } = require('./auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const [cmd, login, senha] = process.argv.slice(2);

(async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY, login VARCHAR(80) NOT NULL UNIQUE, senha_hash TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now())`);
  if (cmd === 'adicionar' && login && senha) {
    if (senha.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
    await pool.query(
      `INSERT INTO usuarios (login, senha_hash) VALUES ($1, $2)
       ON CONFLICT (login) DO UPDATE SET senha_hash = EXCLUDED.senha_hash`, [login, hashSenha(senha)],
    );
    console.log(`Usuário "${login}" salvo.`);
  } else if (cmd === 'remover' && login) {
    const r = await pool.query('DELETE FROM usuarios WHERE login = $1', [login]);
    console.log(r.rowCount ? `Usuário "${login}" removido.` : `Usuário "${login}" não encontrado.`);
  } else if (cmd === 'listar') {
    const { rows } = await pool.query('SELECT login, criado_em FROM usuarios ORDER BY login');
    console.table(rows);
  } else {
    console.log('Uso: node usuarios.js adicionar <login> <senha> | remover <login> | listar');
  }
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
