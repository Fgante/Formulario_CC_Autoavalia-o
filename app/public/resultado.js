// =============================================================================
// SAÍDA NA TELA – exibe a classificação calculada pelo servidor.
// Usado ao terminar o formulário (app.js) e ao abrir uma avaliação salva (avaliacoes.js).
//
//   r     = resultado de classificar() (questoes.js): { nivel, triagemOk, classificacao, estagios, lacunas }
//   el    = elemento onde desenhar
//   extra = { cabecalho, rodape } – HTML adicional acima/abaixo
//
// Desenha 3 blocos: (1) estágio final + "escada" de estágios, (2) tabela de
// apuração por estágio (gates e pontos), (3) gap analysis (o que falta).
// Só exibe – não recalcula nada.
// =============================================================================
window.renderResultado = function renderResultado(r, el, extra = {}) {
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ordem = ['TP', 'E1', 'E2', 'E3', 'E4'];
  const nomes = { TP: 'Triagem', E1: 'Estágio 1', E2: 'Estágio 2', E3: 'Estágio 3', E4: 'Estágio 4' };
  const alcancado = (id) => (id === 'TP' ? r.triagemOk : r.triagemOk && Number(id[1]) <= r.nivel);

  // (2) Linhas da tabela de apuração: gates atendidos, pontos x mínimo (barra) e situação
  const linhas = ordem.map((id) => {
    const e = r.estagios[id];
    const pont = e.maximo == null ? '—'
      : `${e.pontos} / ${e.maximo} (mín. ${e.minimo})
         <div class="barra"><i style="width:${e.maximo ? (e.pontos / e.maximo) * 100 : 0}%"></i><b style="left:${e.maximo ? (e.minimo / e.maximo) * 100 : 0}%"></b></div>`;
    const status = alcancado(id) ? '<span class="tag ok">Alcançado</span>'
      : e.alcancado ? '<span class="tag no">Bloqueado por estágio anterior</span>'
        : '<span class="tag no">Não alcançado</span>';
    return `<tr><td><strong>${nomes[id]}</strong></td>
      <td>${e.gatesAtendidos} / ${e.totalGates}${e.gatesFalhos.length ? `<div class="nota">Falharam: ${e.gatesFalhos.map(esc).join(', ')}</div>` : ''}</td>
      <td>${pont}${e.itensNA ? `<div class="nota">${e.itensNA} item(ns) N/A fora da base</div>` : ''}${e.maximo === 0 ? '<div class="nota">Todos os itens [P] marcados N/A: sem base de pontuação</div>' : ''}</td><td>${status}</td></tr>`;
  }).join('');

  // (3) Gap analysis: gates que falharam e pontos que faltam para o próximo estágio
  const L = r.lacunas;
  const lacunas = !L ? '<p>A entidade alcançou o estágio máximo de maturidade.</p>'
    : `<p>Para alcançar <strong>${nomes[L.estagio]}</strong>:</p><ul>
        ${L.gatesFalhos.length ? `<li>Atender os gates obrigatórios: <strong>${L.gatesFalhos.map(esc).join(', ')}</strong></li>` : ''}
        ${L.pontosFaltantes ? `<li>Obter mais <strong>${L.pontosFaltantes}</strong> ponto(s) nas questões pontuáveis [P]</li>` : ''}
        ${!L.gatesFalhos.length && !L.pontosFaltantes ? '<li>Requisitos atendidos neste estágio — verifique estágios anteriores.</li>' : ''}
      </ul>`;

  // (1) Bloco principal + montagem final
  el.innerHTML = `
    <div class="secao res-topo">
      ${extra.cabecalho || ''}
      <div class="nivel">${r.triagemOk ? (r.nivel ? `E${r.nivel}` : 'TP ✓') : 'FP'}</div>
      <h2>${esc(r.classificacao)}</h2>
      <p>Classificação final = maior estágio consecutivo com 100% dos gates [O] e pontuação mínima nas questões [P].</p>
      <div class="escada">${ordem.map((id) => `<div class="degrau ${alcancado(id) ? 'on' : ''}">${nomes[id]}</div>`).join('')}</div>
    </div>
    <div class="secao">
      <h3 style="margin-top:0">Apuração por estágio</h3>
      <div class="tabela-wrap"><table>
        <thead><tr><th>Estágio</th><th>Gates [O]</th><th>Pontuação [P]</th><th>Situação</th></tr></thead>
        <tbody>${linhas}</tbody></table></div>
    </div>
    <div class="secao"><h3 style="margin-top:0">Gap analysis</h3>${lacunas}${extra.rodape || ''}</div>`;
};
