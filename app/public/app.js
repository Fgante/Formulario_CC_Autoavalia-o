// =============================================================================
// FORMULÁRIO (navegador) – monta as perguntas na tela, controla as etapas,
// valida o preenchimento e ENVIA as respostas para o servidor.
//
// Importante: este arquivo NÃO calcula a classificação. O cálculo oficial é
// feito no servidor (app/questoes.js → classificar), que devolve o resultado
// pronto; aqui só exibimos (via resultado.js).
//
// Fluxo:  carrega perguntas (GET /api/questionario)
//         → usuário responde etapa por etapa (objeto `respostas`)
//         → envia (POST /api/avaliacoes)
//         → mostra a classificação devolvida pelo servidor.
// =============================================================================
(async function () {
  // Usuário logado (vem de nav.js) e a lista de perguntas (vem de app/questoes.js)
  const usuario = await window.usuarioAtual;
  const { ESTAGIOS, DIMENSOES, QUESTOES } = await (await fetch('/api/questionario')).json();
  const form = document.getElementById('form');
  const secoesEl = document.getElementById('secoes');
  const passosEl = document.getElementById('passos');
  // Respostas do usuário, no formato que o servidor espera:
  //   { "TP.1": "sim", "E1.MET.1": [0,1,2,3], "E1.MET.2": 2, "E1.TEC.3": "na", ... }
  //   gate simples → "sim"/"nao"/"na" | gate checklist → índices marcados | pontuável → índice da opção ou "na"
  const respostas = {};
  // Etapas do formulário: Identificação, Triagem (TP) e Estágios E1..E4
  const passos = ['ID', ...ESTAGIOS.map((e) => e.id)];
  let atual = 0;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Campos da identificação: valores iniciais e máscaras ----------
  // Data no formato brasileiro (dd/mm/aaaa); convertida para ISO (aaaa-mm-dd) só no envio
  form.data.value = new Date().toLocaleDateString('pt-BR');
  if (!form.responsavel.value) form.responsavel.value = usuario.nome || '';
  if (!form.email.value) form.email.value = usuario.email || '';
  form.data.addEventListener('input', () => {
    const d = form.data.value.replace(/\D/g, '').slice(0, 8);
    form.data.value = d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
  });
  const dataISO = (br) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
    if (!m) return null;
    const [, dd, mm, aaaa] = m;
    const dt = new Date(Date.UTC(+aaaa, +mm - 1, +dd));
    return dt.getUTCDate() === +dd && dt.getUTCMonth() === +mm - 1 ? `${aaaa}-${mm}-${dd}` : null;
  };
  form.cnpj.addEventListener('input', () => {
    const d = form.cnpj.value.replace(/\D/g, '').slice(0, 14);
    form.cnpj.value = d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  });

  // ---------- Montagem das perguntas na tela ----------
  // Gera o HTML de UMA pergunta conforme o tipo:
  //   gate checklist → caixas de seleção (gate = Sim só se todas marcadas)
  //   gate simples   → Sim / Não (e N/A nos gates do Ranking Siconfi)
  //   pontuável      → opções com os pontos de cada uma + N/A
  function htmlQuestao(q) {
    const nome = `q_${q.codigo}`;
    let corpo;
    if (q.tipo === 'O' && q.itens) {
      let grupoAtual = null;
      corpo = `<div class="opcoes">${q.itens.map((it, i) => {
        const g = it.grupo && it.grupo !== grupoAtual ? `<div class="grupo">${esc(it.grupo)}</div>` : '';
        grupoAtual = it.grupo || grupoAtual;
        return `${g}<label><input type="checkbox" name="${nome}" value="${i}"> <span>${esc(it.t)}</span></label>`;
      }).join('')}</div><div class="gate-status no" data-status>Resultado do gate: Não – um ou mais requisitos não atendidos</div>`;
    } else if (q.tipo === 'O') {
      corpo = `<div class="opcoes linha">
        <label><input type="radio" name="${nome}" value="sim"> Sim</label>
        <label><input type="radio" name="${nome}" value="nao"> Não</label>
        ${q.naFederal ? `<label><input type="radio" name="${nome}" value="na"> N/A (instituição federal)</label>` : ''}
      </div>`;
    } else {
      corpo = `<div class="opcoes">${q.opcoes.map((op, i) => `
        <label><input type="radio" name="${nome}" value="${i}"> <span>${esc(op.t)} <span class="pts">(${op.v} pt${op.v === 1 ? '' : 's'})</span></span></label>`).join('')}
        <label><input type="radio" name="${nome}" value="na"> <span>N/A</span></label></div>`;
    }
    return `<div class="q" data-q="${q.codigo}">
      <h4><span class="cod">${q.codigo}</span><span class="selo ${q.tipo}">${q.tipo === 'O' ? '[O] Gate' : '[P] Pontuável'}</span>${esc(q.titulo)}</h4>
      <p>${esc(q.texto)}</p>${q.nota ? `<p class="nota">${esc(q.nota)}</p>` : ''}${corpo}</div>`;
  }

  // Uma seção (etapa) por estágio, com as perguntas agrupadas por dimensão (MET, AMP, TEC...)
  for (const e of ESTAGIOS) {
    const qs = QUESTOES.filter((q) => q.estagio === e.id);
    let html = `<section class="secao" data-secao="${e.id}" hidden><h2>${esc(e.titulo)}</h2>`;
    if (e.subtitulo) html += `<p class="desc">${esc(e.subtitulo)}</p>`;
    if (e.descricao) html += `<p class="desc">${esc(e.descricao)}</p>`;
    if (e.corte) {
      const nO = qs.filter((q) => q.tipo === 'O').length; const nP = qs.length - nO;
      html += `<p class="desc">${nO} gates [O] (todos devem ser atendidos) · ${nP} questões [P] (corte ≥ ${Math.round(e.corte * 100)}% da pontuação válida)</p>`;
    }
    let dim = null;
    for (const q of qs) {
      if (q.dimensao && q.dimensao !== dim) { dim = q.dimensao; html += `<div class="dim">Dimensão ${dim} – ${esc(DIMENSOES[dim])}</div>`; }
      html += htmlQuestao(q);
    }
    if (e.id === 'TP') html += '<div class="aviso" id="avisoTP" hidden>Há resposta "Não" na Triagem Preparatória: a avaliação é interrompida e a entidade será classificada como <strong>Fase Preparatória</strong>. Você já pode enviar o formulário.</div>';
    secoesEl.insertAdjacentHTML('beforeend', `${html}</section>`);
  }

  // ---------- Registro das respostas ----------
  const qPorCodigo = Object.fromEntries(QUESTOES.map((q) => [q.codigo, q]));
  // Qualquer "Não" na Triagem interrompe a avaliação (Fase Preparatória) e esconde os estágios
  const tpFalhou = () => QUESTOES.some((q) => q.estagio === 'TP' && respostas[q.codigo] === 'nao');
  // Checklist sempre conta como respondido (nenhum item marcado = gate "Não")
  const respondida = (q) => (q.itens ? true : respostas[q.codigo] !== undefined);

  // Cada clique em uma opção grava a resposta no objeto `respostas`
  form.addEventListener('change', (ev) => {
    const name = ev.target.name || '';
    if (!name.startsWith('q_')) return;
    const q = qPorCodigo[name.slice(2)];
    const box = ev.target.closest('.q');
    if (q.itens) {
      respostas[q.codigo] = [...form.querySelectorAll(`input[name="${CSS.escape(name)}"]:checked`)].map((i) => Number(i.value));
      const ok = respostas[q.codigo].length === q.itens.length;
      const st = box.querySelector('[data-status]');
      st.className = `gate-status ${ok ? 'ok' : 'no'}`;
      st.textContent = ok ? 'Resultado do gate: Sim – todos os requisitos atendidos' : 'Resultado do gate: Não – um ou mais requisitos não atendidos';
    } else {
      respostas[q.codigo] = q.tipo === 'P' && ev.target.value !== 'na' ? Number(ev.target.value) : ev.target.value;
    }
    box.classList.remove('falta');
    atualizar();
  });

  // ---------- Navegação entre etapas ----------
  function passosVisiveis() { return tpFalhou() ? passos.slice(0, 2) : passos; }

  // Redesenha a barra de etapas, mostra só a seção atual, alterna Avançar/Enviar e atualiza o contador
  function atualizar() {
    const vis = passosVisiveis();
    if (atual >= vis.length) atual = vis.length - 1;
    passosEl.innerHTML = passos.map((id, i) => {
      const nome = id === 'ID' ? 'Identificação' : id === 'TP' ? 'Triagem' : `Estágio ${id[1]}`;
      return `<button type="button" data-i="${i}" class="${i === atual ? 'ativo' : ''} ${completo(id) ? 'feito' : ''}" ${i < vis.length ? '' : 'disabled'}>${nome}</button>`;
    }).join('');
    form.querySelectorAll('[data-secao]').forEach((s) => { s.hidden = s.dataset.secao !== passos[atual]; });
    document.getElementById('avisoTP').hidden = !tpFalhou();
    const ultimo = atual === vis.length - 1;
    document.getElementById('avancar').hidden = ultimo;
    document.getElementById('enviar').hidden = !ultimo;
    document.getElementById('voltar').style.visibility = atual === 0 ? 'hidden' : 'visible';
    const obrig = QUESTOES.filter((q) => vis.includes(q.estagio));
    document.getElementById('contador').textContent = `${obrig.filter(respondida).length} de ${obrig.length} questões respondidas`;
  }

  function completo(id) {
    if (id === 'ID') return ['nome', 'cnpj', 'esfera', 'data', 'objeto_custo'].every((n) => form[n].value.trim());
    return QUESTOES.filter((q) => q.estagio === id).every(respondida);
  }

  // ---------- Validação (no navegador; o servidor valida de novo ao receber) ----------
  // Marca em vermelho o que falta na etapa e rola até o primeiro problema
  function validarPasso(id) {
    let primeiro = null;
    if (id === 'ID') {
      for (const n of ['nome', 'cnpj', 'esfera', 'data', 'objeto_custo']) {
        const el = form[n];
        const bad = !el.value.trim() || (n === 'cnpj' && el.value.replace(/\D/g, '').length !== 14)
          || (n === 'data' && !dataISO(el.value));
        el.classList.toggle('invalido', bad);
        if (bad && !primeiro) primeiro = el;
      }
    } else {
      for (const q of QUESTOES.filter((x) => x.estagio === id)) {
        if (id !== 'TP' && tpFalhou()) break;
        const falta = !respondida(q);
        const box = form.querySelector(`[data-q="${CSS.escape(q.codigo)}"]`);
        box.classList.toggle('falta', falta);
        if (falta && !primeiro) primeiro = box;
      }
    }
    if (primeiro) { primeiro.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    return true;
  }

  function ir(i) { atual = i; atualizar(); window.scrollTo({ top: 0 }); }
  passosEl.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-i]');
    if (b && !b.disabled) ir(Number(b.dataset.i));
  });
  document.getElementById('avancar').onclick = () => { if (validarPasso(passos[atual])) ir(atual + 1); };
  document.getElementById('voltar').onclick = () => ir(atual - 1);
  form.addEventListener('input', (ev) => { ev.target.classList?.remove('invalido'); });

  // ---------- ENVIO: manda as respostas ao servidor e mostra a classificação ----------
  // O servidor (POST /api/avaliacoes em server.js) valida, CALCULA a classificação,
  // SALVA no banco e devolve o resultado, que é exibido por renderResultado (resultado.js).
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const errosEl = document.getElementById('erros');
    errosEl.hidden = true;
    for (let i = 0; i < passosVisiveis().length; i++) {
      if (!validarPasso(passos[i])) { ir(i); validarPasso(passos[i]); return; }
    }
    // checklists nunca marcados são enviados como lista vazia (gate não atendido)
    for (const q of QUESTOES) if (q.itens && !respostas[q.codigo]) respostas[q.codigo] = [];
    const v = (n) => form[n].value;
    // Corpo da requisição: dados do órgão, da avaliação e as respostas
    // (se a Triagem falhou, só as respostas da Triagem são enviadas)
    const corpo = {
      orgao: { nome: v('nome'), cnpj: v('cnpj'), esfera: v('esfera'), poder: v('poder'), uf: v('uf'), municipio: v('municipio'), responsavel: v('responsavel'), email: v('email') },
      avaliacao: { data: dataISO(v('data')), objeto_custo: v('objeto_custo'), justificativa: v('justificativa') },
      respostas: tpFalhou() ? Object.fromEntries(Object.entries(respostas).filter(([k]) => k.startsWith('TP.'))) : respostas,
    };
    const btn = document.getElementById('enviar');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const resp = await fetch('/api/avaliacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const data = await resp.json();
      if (!resp.ok) throw new Error((data.erros || ['Erro ao enviar.']).join('\n'));
      // SAÍDA: esconde o formulário e mostra a classificação calculada pelo servidor
      form.hidden = true; passosEl.hidden = true;
      const el = document.getElementById('resultado');
      el.hidden = false;
      window.renderResultado(data, el, {
        cabecalho: `<p>${esc(v('nome'))} · Avaliação nº ${data.id} salva</p>`,
        rodape: `<p><a href="/perfil?avaliacao=${data.id}">Ver no meu perfil</a> · <a href="/">Nova avaliação</a> · <a href="#" onclick="print();return false">Imprimir</a></p>`,
      });
      window.scrollTo({ top: 0 });
    } catch (e) {
      errosEl.textContent = e.message; errosEl.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = 'Enviar e ver classificação';
    }
  });

  atualizar();
}());
