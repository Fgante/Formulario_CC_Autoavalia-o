// Menu do usuário logado. Preenche <nav id="menu"> e expõe window.usuarioAtual (Promise).
window.usuarioAtual = (async () => {
  const r = await fetch('/api/me');
  if (r.status === 401) { location.href = `/login.html?volta=${encodeURIComponent(location.pathname)}`; return new Promise(() => {}); }
  const u = await r.json();
  const nav = document.getElementById('menu');
  if (nav) {
    const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const links = [['/', 'Novo formulário'], ['/perfil', 'Meu perfil']];
    if (u.perfil === 'admin') links.push(['/admin', 'Todas as avaliações']);
    nav.innerHTML = `${links.map(([href, t]) => `<a href="${href}" class="menu-link${location.pathname === href ? ' atual' : ''}">${t}</a>`).join('')}
      <span class="menu-usuario">${esc(u.nome || u.login)}${u.perfil === 'admin' ? ' <span class="selo O">admin</span>' : ''}</span>
      <button type="button" class="btn sec btn-sm" id="sair">Sair</button>`;
    document.getElementById('sair').onclick = async () => { await fetch('/api/logout', { method: 'POST' }); location.href = '/login.html'; };
  }
  return u;
})();
