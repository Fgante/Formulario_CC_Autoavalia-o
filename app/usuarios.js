// Gerencia usuários pelo terminal (dentro do contêiner).
//   node usuarios.js adicionar <login> <senha> [admin|usuario]   cria ou troca a senha (padrão: admin)
//   node usuarios.js perfil <login> <admin|usuario>               muda o perfil de um usuário
//   node usuarios.js remover <login>
//   node usuarios.js listar
const { Pool } = require('pg');
const { hashSenha } = require('./auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const [cmd, login, arg3, arg4] = process.argv.slice(2);
const PERFIS = ['admin', 'usuario'];

(async () => {
  if (cmd === 'adicionar' && login && arg3) {
    const perfil = arg4 || 'admin';
    if (!PERFIS.includes(perfil)) throw new Error('Perfil deve ser admin ou usuario.');
    if (arg3.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
    await pool.query(
      `INSERT INTO usuarios (login, senha_hash, nome, perfil) VALUES ($1, $2, $1, $3)
       ON CONFLICT (login) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, perfil = EXCLUDED.perfil`,
      [login.toLowerCase(), hashSenha(arg3), perfil],
    );
    console.log(`Usuário "${login}" salvo como ${perfil}.`);
  } else if (cmd === 'perfil' && login && PERFIS.includes(arg3)) {
    const r = await pool.query('UPDATE usuarios SET perfil = $2 WHERE login = $1', [login.toLowerCase(), arg3]);
    console.log(r.rowCount ? `Usuário "${login}" agora é ${arg3}.` : `Usuário "${login}" não encontrado.`);
  } else if (cmd === 'remover' && login) {
    const r = await pool.query('DELETE FROM usuarios WHERE login = $1', [login.toLowerCase()]);
    console.log(r.rowCount ? `Usuário "${login}" removido.` : `Usuário "${login}" não encontrado.`);
  } else if (cmd === 'listar') {
    const { rows } = await pool.query(`SELECT login, nome, email, perfil, to_char(criado_em, 'DD/MM/YYYY HH24:MI') AS criado_em
                                         FROM usuarios ORDER BY perfil, login`);
    console.table(rows);
  } else {
    console.log('Uso: node usuarios.js adicionar <login> <senha> [admin|usuario] | perfil <login> <admin|usuario> | remover <login> | listar');
  }
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
