// =============================================================================
// LISTA DE AVALIAÇÕES SALVAS + DETALHE (leitura do banco, via API)
// Usado em "Meu perfil" (url /api/avaliacoes → só as do usuário) e em
// "Todas as avaliações" (url /api/admin/avaliacoes → todas, com quem respondeu).
// Ao clicar num órgão, busca /api/avaliacoes/:id e mostra classificação + respostas.
// =============================================================================
window.montarListaAvaliacoes = async function montarListaAvaliacoes({ url, mostrarRespondente, vazio }) {
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dataBR = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const dataHoraBR = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const api = async (u) => {
    const r = await fetch(u);
    if (r.status === 401) { location.href = '/login.html'; throw new Error('sessão expirada'); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro || 'Erro ao carregar.');
    return r.json();
  };

  const tbody = document.getElementById('lista');
  const thead = document.getElementById('lista-cabecalho');
  const detalhe = document.getElementById('detalhe');
  const cols = ['#', 'Órgão', 'Data', 'Objeto de custo', ...(mostrarRespondente ? ['Respondido por'] : []), 'Classificação'];
  thead.innerHTML = `<tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>`;

  // Detalhe de uma avaliação: resultado (resultado.js) + tabela com cada resposta
  async function abrir(id) {
    const c = await api(`/api/avaliacoes/${id}`);
    const resp = c.respostas.map((r) => `<tr><td class="cod">${esc(r.questao_codigo)}</td><td>${esc(r.resposta)}${r.itens_marcados ? `<div class="nota">${r.itens_marcados.length} item(ns) marcado(s)</div>` : ''}</td><td>${r.tipo === 'P' ? (r.pontos ?? 'N/A') : (r.atende_gate ? '✓' : '✗')}</td></tr>`).join('');
    const quem = c.respondente_login ? ` · Respondido por ${esc(c.respondente || c.respondente_login)} (${esc(c.respondente_login)})` : '';
    window.renderResultado({ nivel: c.nivel, triagemOk: c.triagem_aprovada, classificacao: c.classificacao, ...c.detalhes }, detalhe, {
      cabecalho: `<p>${esc(c.nome)} · Avaliação nº ${c.id} · ${dataBR(c.data_avaliacao)}${quem}</p>
                  <p class="nota">Objeto de custo: ${esc(c.objeto_custo)}</p>`,
      rodape: `<h3>Respostas</h3><div class="tabela-wrap"><table><thead><tr><th>Questão</th><th>Resposta</th><th>Pts / Gate</th></tr></thead><tbody>${resp}</tbody></table></div>`,
    });
    detalhe.scrollIntoView({ behavior: 'smooth' });
  }

  // Monta a tabela com a lista
  try {
    const rows = await api(url);
    tbody.innerHTML = rows.length ? rows.map((r) => `
      <tr><td>${r.id}</td>
        <td><a href="#" data-id="${r.id}">${esc(r.nome)}</a><div class="nota">${esc(r.esfera)} · CNPJ ${esc(r.cnpj)}</div></td>
        <td>${dataBR(r.data_avaliacao)}<div class="nota">enviado ${dataHoraBR(r.criado_em)}</div></td>
        <td>${esc(r.objeto_custo)}</td>
        ${mostrarRespondente ? `<td>${r.respondente_login ? `${esc(r.respondente || r.respondente_login)}<div class="nota">${esc(r.respondente_login)}</div>` : '<span class="nota">—</span>'}</td>` : ''}
        <td><strong>${r.nivel ? `E${r.nivel}` : '—'}</strong> ${esc(r.classificacao)}</td></tr>`).join('')
      : `<tr><td colspan="${cols.length}">${vazio}</td></tr>`;
    tbody.addEventListener('click', (ev) => {
      const a = ev.target.closest('a[data-id]');
      if (a) { ev.preventDefault(); abrir(a.dataset.id); }
    });
    return rows;
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="${cols.length}" class="erros">${esc(e.message)}</td></tr>`;
    return [];
  }
};
