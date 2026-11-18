// Instrumento de Autoavaliação de Maturidade – Anexo 4 do GCSP (Guia de Custos para o Setor Público)
// tipo "O" = Gate obrigatório (Sim/Não ou checklist em que todos os itens devem ser atendidos)
// tipo "P" = Pontuável (escala de aderência, admite N/A)

const SIM_NAO = null; // gate binário simples

const ATR_E1 = {
  'Atributos de identificação': ['Descrição', 'Unidade Gestora/Jurisdicionada', 'Responsáveis', 'Modelo de gestão', 'Quantitativo de EPs vinculados'],
  'Atributos de dimensão operacional e de capacidade': ['Endereço', 'Natureza', 'Condição', 'Turno de funcionamento'],
};
const ATR_E2 = {
  'Atributos de identificação': ATR_E1['Atributos de identificação'],
  'Atributos de dimensão operacional e de capacidade': [...ATR_E1['Atributos de dimensão operacional e de capacidade'], 'Capacidade instalada vs. capacidade utilizada', 'Área construída'],
  'Atributos de dimensão orçamentária e financeira': ['Funções e subfunções de governo'],
};
const ATR_E3 = {
  'Atributos de identificação': ATR_E1['Atributos de identificação'],
  'Atributos de dimensão operacional e de capacidade': [...ATR_E2['Atributos de dimensão operacional e de capacidade'], 'Tipo de gestão'],
  'Atributos de dimensão orçamentária e financeira': ['Funções e subfunções de governo'],
  'Atributos de dimensão complexidade e especialização': ['Nível de complexidade do serviço', 'Especialização/Foco de atuação', 'Cadastros em sistemas nacionais'],
  'Atributos de dimensão recursos humanos': ['Proporção de profissionais especializados'],
  'Atributos de dimensão de demanda e perfil do público': ['Perfil socioeconômico do público atendido', 'Abrangência do atendimento'],
  'Atributos de dimensão tecnológica e de infraestrutura': ['Nível de informatização', 'Fonte de energia predominante', 'Tipo de abastecimento de água'],
  'Atributos de dimensão temporal e sazonalidade': ['Sazonalidade do serviço'],
  'Atributos de dimensão sustentabilidade e conformidade': ['Acessibilidade'],
};
const ATR_E4 = {
  ...ATR_E3,
  'Atributos de dimensão orçamentária e financeira': ['Funções e subfunções de governo', 'Fonte principal de financiamento', 'Existência de receitas próprias'],
  'Atributos de dimensão complexidade e especialização': [...ATR_E3['Atributos de dimensão complexidade e especialização'], 'Certificações e acreditações'],
  'Atributos de dimensão sustentabilidade e conformidade': ['Acessibilidade', 'Situação de regularidade ambiental', 'Situação de regularidade sanitária'],
};
const flatGroups = (g) => Object.entries(g).flatMap(([grupo, itens]) => itens.map((t) => ({ grupo, t })));

const ESTAGIOS = [
  { id: 'TP', titulo: 'Parte A – Triagem Preparatória', subtitulo: 'Fase diagnóstica inicial – avaliação de habilitação', corte: null,
    descricao: 'Todos os itens são gates [O]. Resposta "Não" em qualquer item interrompe a avaliação e classifica a entidade como Fase Preparatória.' },
  { id: 'E1', nivel: 1, titulo: 'Estágio 1 – Inicial', classificacao: 'Inicial: Estruturação Básica', corte: 0.60 },
  { id: 'E2', nivel: 2, titulo: 'Estágio 2 – Estruturado', classificacao: 'Estruturado: Sistematização e Controle', corte: 0.65 },
  { id: 'E3', nivel: 3, titulo: 'Estágio 3 – Gerenciado', classificacao: 'Gerenciado: Análise de Desempenho', corte: 0.75 },
  { id: 'E4', nivel: 4, titulo: 'Estágio 4 – Estratégico', classificacao: 'Estratégico (Excelência Integrada)', corte: 0.85 },
];

const DIMENSOES = {
  MET: 'Metodologia', AMP: 'Amplitude', TEC: 'Tecnologia', PRO: 'Processos', GOV: 'Governança', USO: 'Uso da Informação',
};

const NOTA_SICONFI = 'Considerar a pontuação vigente no Ranking Siconfi na data da avaliação. Não aplicável para instituições federais.';

const o = (codigo, titulo, texto, extra = {}) => ({ codigo, tipo: 'O', titulo, texto, ...extra });
const p = (codigo, titulo, texto, opcoes) => ({ codigo, tipo: 'P', titulo, texto, opcoes: opcoes.map(([t, v]) => ({ t, v })) });

const QUESTOES = [
  // ---------------- TRIAGEM PREPARATÓRIA ----------------
  o('TP.1', 'Existência de sistema contábil – SIAFIC', 'A entidade possui, formalmente instituído, Sistema Único e Integrado de Execução Orçamentária, Administração Financeira e Controle (SIAFIC), com funcionalidades que permitem o registro dos fatos geradores segundo o regime de competência?'),
  o('TP.2', 'Existência de sistema de recursos humanos – RH', 'A entidade possui, formalmente instituído, um sistema estruturante de recursos humanos, confiável, capaz de fornecer dados analíticos sobre a lotação efetiva dos servidores por objeto de custo?'),
  o('TP.3', 'Existência de sistema de informação de custos – SIC', 'A entidade possui, formalmente instituído, algum Sistema de Informação de Custos (SIC), específico, ou módulo de sistema que permite a acumulação das informações de custos (ainda que incipiente ou não integrado a outros sistemas)?'),
  o('TP.4', 'Integração de informações', 'Os sistemas de contabilidade, recursos humanos e SIC possuem funcionalidades que permitem a integração de informações entre si, seja de forma automatizada ou ainda dependente de intervenção humana?'),
  o('TP.5', 'Reconhecimento dos fatos geradores – contabilidade', 'O registro das variações patrimoniais diminutivas no sistema de contabilidade ocorre segundo o regime de competência, ou seja, reconhece as despesas patrimoniais segundo a ocorrência de seus fatos geradores?'),
  o('TP.6', 'Adoção do PCASP estendido', 'Os registros contábeis da entidade adotam o Plano de Contas Aplicado ao Setor Público (PCASP) estendido, com detalhamento das contas de VPD por natureza suficiente para identificar os gastos com materiais de consumo e serviços de terceiros utilizados na apuração de custos?'),
  o('TP.7', 'Patrocínio da alta administração', 'Há patrocínio de gestores da alta administração da entidade para a implantação do sistema de custos, mesmo que ainda não formalizado?'),

  // ---------------- ESTÁGIO 1 ----------------
  o('E1.MET.1', 'Definição do modelo básico de gerenciamento de custos', 'A entidade definiu um modelo básico de gerenciamento de custos? Marque cada requisito atendido (todos são necessários):', { itens: [
    { t: '(i) Modelagem orgânica – a(s) unidade(s) organizacional(is) (centros de responsabilidade) que compõe(m) o objeto de apuração está(ão) identificada(s) e delimitada(s).' },
    { t: '(ii) Método de custeio mínimo – há adoção de método de custeio, no mínimo, direto.' },
    { t: '(iii) Acumulação contínua – a acumulação dos custos ocorre, minimamente, em base contínua.' },
    { t: '(iv) Base de mensuração – a acumulação dos custos ocorre, minimamente, em base de mensuração histórica.' },
  ] }),
  p('E1.MET.2', 'Grau de documentação da metodologia', 'A metodologia de custeio adotada está documentada de forma que permita sua replicação por terceiros (ex.: manual técnico, nota metodológica, procedimento operacional padrão, política contábil)?', [
    ['Não documentada; conhecimento tácito/informal', 0], ['Documentação parcial, dispersa ou desatualizada', 1], ['Documentação formal, consolidada e atualizada', 2]]),
  p('E1.MET.3', 'Metodologia de Atribuição de Custos', 'Qual o nível de maturidade do sistema de custos da entidade quanto à atribuição de elementos de custo ao objeto de custo?', [
    ['Não há atribuição de elementos de custo ao objeto', 0],
    ['Apropria custos de forma assistemática ou tenta ratear custos indiretos sem antes consolidar os custos diretos', 1],
    ['Adota o método de Custeio Direto e apropria com precisão os elementos mínimos de Pessoal Ativo diretamente ao ID do objeto de custo de forma contínua', 3]]),
  o('E1.AMP.1', 'Cobertura mínima de unidades/áreas', 'A apuração de custos abrange, no mínimo, um centro de responsabilidade claramente identificado (não se limita a intenção declarada sem aplicação prática)?'),
  p('E1.AMP.2', 'Extensão da cobertura em relação ao total da entidade', 'Qual a proporção de centros de responsabilidades/áreas da entidade já incluídas no escopo de apuração de custos, em relação ao total de unidades existentes?', [
    ['Cobertura pontual/isolada (um centro de responsabilidade ou projeto-piloto apenas)', 0],
    ['Cobertura parcial (mais de um centro de responsabilidade, mas minoria do total)', 1],
    ['Cobertura abrange parcela representativa (próxima da maioria) dos centros de responsabilidades', 2]]),
  p('E1.AMP.3', 'Alinhamento da amplitude com o Objeto de Avaliação', 'A amplitude de cobertura atual é compatível com o(s) objeto(s) de avaliação declarado(s), sem lacunas que comprometam a leitura do objeto como um todo?', [
    ['Amplitude insuficiente para cobrir o objeto declarado', 0], ['Amplitude cobre parte do objeto, com lacunas relevantes', 1], ['Amplitude cobre integralmente o objeto declarado para este estágio', 2]]),
  o('E1.TEC.1', 'Atributos obrigatórios dos objetos de custos', 'O SIC (ou módulo de outro sistema utilizado para gerar as informações de custos) possui funcionalidades básicas que permitem o cadastramento dos objetos de custos com os seguintes atributos obrigatórios do Estágio 1? Marque os atendidos:', { itens: flatGroups(ATR_E1) }),
  o('E1.TEC.2', 'Atribuição de custos com pessoal ativo', 'O Sistema de Informação de Custos (SIC) permite a atribuição dos custos com pessoal ativo no(s) respectivo(s) objeto(s) de custo(s)?'),
  p('E1.TEC.3', 'Sistema de Recursos Humanos', 'Qual o nível de maturidade do sistema de RH quanto ao fornecimento de dados analíticos sobre a lotação e o exercício dos servidores por objeto de custo?', [
    ['O sistema de RH não é capaz de fornecer dados analíticos sobre a lotação e localização de exercício dos servidores por objeto de custo', 0],
    ['O sistema de RH possui os dados de lotação, mas as informações não são integradas ou conciliadas com a contabilidade de forma regular', 1],
    ['O sistema de RH fornece dados analíticos precisos de exercício dos servidores por objeto de custo e está integrado à execução contábil da folha', 2]]),
  o('E1.TEC.4', 'Nível de acumulação dos custos', 'A atribuição dos custos no SIC é realizada diretamente no ID do objeto de custo (ex.: unidade organizacional como um todo – Secretaria, Hospital etc.), sem necessidade de detalhamento em níveis inferiores (áreas funcionais ou centros de atividades)?'),
  p('E1.TEC.5', 'Grau de integração das informações', 'Qual o grau de integração das informações primárias, provenientes dos sistemas estruturantes (ex.: folha de pagamento), com o SIC ou solução equivalente utilizada?', [
    ['As informações são inseridas manualmente no SIC, sem qualquer integração com os sistemas estruturantes', 0],
    ['As informações são obtidas por extração e carregamento manual ou semiautomático (ex.: planilhas ou arquivos), sem integração direta', 1],
    ['As informações são integradas de forma automática e direta (interface, rotina de integração, API ou módulo integrado de GRP), sem intervenção manual', 2]]),
  p('E1.TEC.6', 'Geração de Informação e Transparência Inicial', 'Qual o nível de maturidade do sistema quanto à geração e divulgação de relatórios de custos de pessoal?', [
    ['O sistema não gera relatórios ou estes não são divulgados', 0],
    ['O sistema gera relatórios de custo de pessoal de forma esporádica, mas eles não são integrados à prestação de contas', 1],
    ['A entidade gera mensalmente relatórios de custos diretos (pessoal) por objeto de custo e os utiliza na composição de seus relatórios de gestão iniciais', 2]]),
  p('E1.TEC.7', 'Nível de detalhamento da informação nos relatórios gerados', 'A ferramenta/sistema utilizado é capaz de processar e apresentar relatórios no nível de detalhe exigido pelo(s) objeto(s) de avaliação declarado(s)?', [
    ['Ferramenta incapaz de captar o nível de detalhe exigido pelo objeto declarado', 0],
    ['Ferramenta capta parcialmente o detalhamento exigido, com necessidade de complementos manuais relevantes', 1],
    ['Ferramenta capta integralmente o nível de detalhe exigido pelo objeto declarado', 2]]),
  o('E1.PRO.1', 'Existência de rotina mínima de apuração', 'Existe uma rotina (ainda que informal) de apuração periódica de custos, com frequência definida (mensal, trimestral, anual), e não apenas levantamentos pontuais/eventuais?'),
  p('E1.PRO.2', 'Grau de formalização do processo', 'O processo de apuração de custos possui que nível de formalização quanto a atores, etapas e prazos?', [
    ['Processo informal, dependente de conhecimento individual, sem atores ou prazos definidos', 0],
    ['Processo com formalização parcial (algumas etapas ou responsáveis definidos, mas não documentado de ponta a ponta)', 1],
    ['Processo formalizado (fluxo, responsáveis e prazos definidos e documentados)', 2]]),
  p('E1.PRO.3', 'Aderência do processo ao Objeto de Avaliação', 'O processo de apuração, em suas etapas e periodicidade, é suficiente para produzir informações de custos consistentes com o(s) objeto(s) de avaliação declarado(s)?', [
    ['Processo insuficiente para gerar informação consistente sobre o objeto declarado', 0],
    ['Processo gera informação parcialmente consistente, com necessidade de ajustes/complementos', 1],
    ['Processo gera informação plenamente consistente e tempestiva sobre o objeto declarado', 2]]),
  o('E1.PRO.4', 'Aderência ao regime de competência (NBC TSP 34 / MCASP) – SIC', 'A acumulação dos custos no(s) objeto(s) considera o regime de competência na própria acumulação dos custos no SIC e não apenas no registro contábil de origem, condição estabelecida pela NBC TSP 34 como base do sistema de custos?'),
  o('E1.PRO.5', 'Qualidade da informação contábil', 'A entidade, em razão da qualidade da informação contábil produzida, obteve pontuação superior a 80.000 pontos no Ranking Siconfi (ICF/Siconfi)?', { naFederal: true, nota: NOTA_SICONFI }),
  o('E1.GOV.1', 'Existência de responsável designado', 'Existe unidade organizacional, setor ou servidor formalmente designado (portaria, ato normativo interno ou atribuição funcional registrada) como responsável pela apuração e acompanhamento de custos, ainda que como atribuição não exclusiva?'),
  o('E1.GOV.2', 'Constituição da Unidade Gestora de Custos', 'Existe uma Gestora Central de Custos (GCC) formalmente constituída (portaria, decreto, ato normativo interno ou disposição regimental), ainda que vinculada a uma estrutura já existente e sem exclusividade de atribuições?'),
  p('E1.GOV.3', 'Estrutura de Governança e Responsabilidades', 'Como estão definidas as responsabilidades pela geração e validação dos dados de custos?', [
    ['Não há clareza sobre as responsabilidades de geração e validação dos dados de custos', 0],
    ['Existe uma GCC definida, mas ela atua sem a colaboração formal das Detentoras dos Sistemas Estruturantes (DSE)', 1],
    ['A alta administração aprovou o ato normativo que institui o sistema de custos, definindo a GCC e estabelecendo as DSE responsáveis pelo fornecimento dos dados de pessoal e contabilidade', 2]]),
  o('E1.GOV.4', 'Atuação da Gestora Central de Custos', 'A GCC exerce, ainda que de forma simplificada, sua função no estágio inicial, participando da identificação e validação dos objetos de custos, coordenando o cadastro inicial e consolidando as primeiras informações produzidas?'),
  o('E1.GOV.5', 'Detentora dos Sistemas Estruturantes (DSE)', 'As DSE atendem aos seguintes pré-requisitos mínimos para o estágio inicial? Marque os atendidos:', { itens: [
    { t: 'O departamento de contabilidade garante a qualidade e a consistência dos registros contábeis dos custos com pessoal, observada a competência dos fatos geradores' },
    { t: 'A área de tecnologia da informação garante a disponibilidade e o funcionamento dos sistemas-fonte (Contabilidade, RH e SIC)' },
  ] }),
  p('E1.GOV.6', 'Grau de capacitação da(s) pessoa(s) responsável(is)', 'A(s) pessoa(s) responsável(is) pela apuração de custos, no âmbito da GCC, possui(em) que nível de capacitação técnica na área?', [
    ['Nenhuma capacitação formal; conhecimento empírico apenas', 0],
    ['Capacitação pontual (cursos isolados, treinamentos introdutórios), sem reforço contínuo', 1],
    ['Capacitação consistente e continuada (cursos regulares, certificações, ou formação específica em custos públicos)', 2]]),
  p('E1.GOV.7', 'Suficiência da equipe frente ao Objeto de Avaliação', 'A quantidade e dedicação de pessoas envolvidas na GCC é suficiente para sustentar a apuração de custos no nível de detalhe exigido pelo(s) objeto(s) de avaliação declarado(s)?', [
    ['Equipe insuficiente, comprometendo a apuração do objeto declarado', 0],
    ['Equipe suficiente para atender parcialmente ao objeto declarado, com sobrecarga ou dependência de poucas pessoas', 1],
    ['Equipe suficiente e adequadamente dimensionada para o objeto declarado', 2]]),

  // ---------------- ESTÁGIO 2 ----------------
  o('E2.MET.1', 'Consolidação metodológica', 'A metodologia de custeio adotada no Estágio 1 foi aplicada de forma consistente e documentada por pelo menos três ciclos de apuração consecutivos (não apenas testada uma única vez)?'),
  o('E2.MET.2', 'Evolução para custeio por absorção parcial', 'O método de custeio adotado neste estágio é o custeio por absorção parcial (evolução em relação ao método do Estágio 1)?'),
  p('E2.MET.3', 'Alocação de Custos Indiretos', 'Qual o nível de maturidade da entidade quanto à alocação dos custos indiretos aos objetos de custos?', [
    ['A entidade permanece utilizando apenas o custeio direto, ignorando a relevância dos custos indiretos', 0],
    ['A entidade realiza rateios de custos indiretos, mas de forma arbitrária, sem memória de cálculo documentada ou critérios técnicos padronizados', 1],
    ['A entidade aplica o método de Absorção Parcial, alocando custos indiretos de suporte às atividades finalísticas com base em direcionadores de custos e critérios técnicos documentados', 2]]),
  p('E2.MET.4', 'Tratamento de custos e integração com outras informações', 'Como a metodologia trata a integração analítica entre custos e outras dimensões de gestão (orçamentária, patrimonial, desempenho)?', [
    ['Sem integração; custos apurados isoladamente', 0], ['Integração parcial com apenas uma dimensão (ex.: orçamentária)', 1],
    ['Integração com duas dimensões (ex.: orçamentária e patrimonial/VPD)', 2],
    ['Integração plena com múltiplas dimensões, permitindo análises cruzadas (custo x orçamento x desempenho/produto entregue)', 3]]),
  p('E2.MET.5', 'Aderência técnica às normas de custos (PCASP e correlatas)', 'Em que medida o método de custeio aplicado observa, na prática, os conceitos técnicos previstos nas normas de custos aplicadas ao setor público (ex.: depreciação, custo de oportunidade, custos indiretos, distinção entre custo e despesa)?', [
    ['Aderência baixa: método aplicado de forma genérica, sem observância consistente dos conceitos técnicos normativos', 0],
    ['Aderência parcial: alguns conceitos técnicos são observados (ex.: depreciação), mas outros são ignorados ou tratados de forma inadequada', 1],
    ['Aderência substancial: a maioria dos conceitos técnicos normativos é observada de forma consistente', 2],
    ['Aderência plena: todos os conceitos técnicos relevantes são observados de forma sistemática e documentada, com respaldo normativo interno', 3]]),
  o('E2.AMP.1', 'Expansão da cobertura de objetos e elementos de custos', 'A cobertura de custeio foi expandida além do mínimo do Estágio 1, atendendo cumulativamente: (i) mais de um objeto de custeio; (ii) 5 ou mais funções de governo; (iii) materialidade acumulada ≥ 20% do orçamento total executado (despesas liquidadas) do Poder ou Órgão; e (iv) apuração cobrindo mais dois elementos de custos adicionais (Materiais de consumo e Depreciação)?'),
  p('E2.AMP.2', 'Abrangência de objetos de custeio', 'Quantos objetos de custos são efetivamente apurados de forma sistemática?', [
    ['Um único objeto', 0], ['Três objetos', 1], ['Cinco objetos', 2], ['Sete ou mais objetos', 3]]),
  p('E2.AMP.3', 'Cobertura organizacional', 'Qual a proporção de funções de governo já coberta pela apuração de custos?', [
    ['Cobertura incipiente, menos de cinco funções', 0], ['Cobertura básica para o estágio, mínimo cinco funções', 1],
    ['Cobertura ampliada para o estágio, mínimo dez funções', 2], ['Cobertura quase total ou total, mais de 90% das funções', 3]]),
  p('E2.AMP.4', 'Cobertura orçamentária', 'Qual a proporção do orçamento executado pelo Poder ou Órgão está coberta pela apuração de custos (materialidade acumulada dos objetos custeados)?', [
    ['Cobertura incipiente, inferior a 20% do orçamento executado', 0], ['Cobertura básica, entre 20% e 40% do orçamento executado', 1],
    ['Cobertura ampliada, entre 40% e 60% do orçamento executado', 2], ['Cobertura quase total ou total, acima de 60% do orçamento executado', 3]]),
  p('E2.AMP.5', 'Ampliação dos elementos de custos', 'Além do elemento de custo mínimo exigido no Estágio 1, quantos elementos de custo são efetivamente apurados de forma sistemática?', [
    ['Apenas o mínimo do E1', 0], ['Dois elementos adicionais (nível-piso do gate)', 1], ['Três a quatro elementos de custo apurados', 2], ['Cinco ou mais elementos', 3]]),
  o('E2.TEC.1', 'Atributos obrigatórios dos objetos de custos', 'O SIC (ou módulo de outro sistema) passou a permitir o cadastramento dos objetos de custos com todos os atributos obrigatórios do Estágio 2? Marque os atendidos:', { itens: flatGroups(ATR_E2) }),
  o('E2.TEC.2', 'Sistema de custos integrado', 'O sistema utilizado para apuração de custos está integrado (automaticamente, por interface estruturada ou mesmo por exportação de dados) com os novos sistemas estruturantes exigíveis para este estágio (controles patrimoniais: estoques e bens móveis e imóveis), eliminando a dependência de lançamentos manuais paralelos para a apuração básica?'),
  p('E2.TEC.3', 'Grau de automação da apuração', 'Como ocorre a geração das informações de custos?', [
    ['Manual, com lançamentos e cálculos feitos em planilhas eletrônicas', 0],
    ['Semiautomática, com extração de dados de sistemas seguida de processamento manual (planilhas alimentadas por exportações)', 1],
    ['Automatizada, com sistema dedicado que processa e calcula custos, mas com necessidade de ajustes manuais recorrentes', 2],
    ['Totalmente automatizada, com sistema integrado que processa, calcula e disponibiliza os custos sem intervenção manual recorrente', 3]]),
  p('E2.TEC.4', 'Confiabilidade e auditabilidade do sistema', 'O sistema utilizado permite rastreabilidade e auditoria das informações de custos?', [
    ['Sem trilha de auditoria; dados não rastreáveis à origem', 0],
    ['Trilha de auditoria parcial, permitindo rastrear alguns dados-fonte, mas não todo o processo', 1],
    ['Trilha de auditoria consistente, permitindo rastrear a maior parte do processo de apuração até a origem', 2],
    ['Trilha de auditoria completa e sistemática, com rastreabilidade integral (dado a dado) e registro de alterações (log)', 3]]),
  p('E2.TEC.5', 'Disseminação e acesso às informações de custos', 'Como as informações de custos são disponibilizadas aos usuários (gestores, controle interno, sociedade)?', [
    ['Não há disponibilização estruturada; informações acessadas apenas mediante solicitação direta à equipe responsável', 0],
    ['Disponibilização por meio de relatórios estáticos (planilhas, documentos) enviados periodicamente aos interessados', 1],
    ['Disponibilização por meio de relatórios gerenciais estruturados, com regularidade e padronização, ainda que sem ferramenta de autoatendimento', 2],
    ['Disponibilização por meio de painel/portal de BI ou ferramenta de autoatendimento, com atualização automática e acesso direto pelos usuários', 3]]),
  o('E2.PRO.1', 'Formalização e institucionalização do processo', 'O processo de apuração de custos está formalizado em normativo interno (portaria, manual, instrução normativa) que define responsáveis, periodicidade e fluxo, e esse normativo está efetivamente em vigor (não apenas em elaboração)?'),
  p('E2.PRO.2', 'Periodicidade e regularidade da apuração', 'Com que regularidade a apuração de custos é efetivamente realizada e disponibilizada?', [
    ['Apuração eventual/esporádica, sem periodicidade definida', 0], ['Apuração anual', 1], ['Apuração semestral ou trimestral', 2],
    ['Apuração mensal ou com periodicidade ainda mais frequente, de forma consistente', 3]]),
  o('E2.PRO.3', 'Aderência ao regime de competência (NBC TSP 34 / MCASP) – SIC', 'A acumulação dos custos no(s) objeto(s) considera o regime de competência para os elementos "materiais de consumo" e "depreciação"?'),
  p('E2.PRO.4', 'Depreciação dos Ativos', 'Qual o nível de maturidade do cálculo e da atribuição da depreciação dos ativos imobilizados aos respectivos centros de custo?', [
    ['Não há cálculo sistemático da depreciação dos bens móveis e imóveis, ou, quando existente, ela não é apropriada aos centros de custo responsáveis pelos ativos', 0],
    ['A depreciação é calculada com base no cadastro patrimonial, mas de forma não sistemática, com metodologia inconsistente, ou sua atribuição é apenas parcial ou pouco confiável', 1],
    ['A depreciação é calculada de forma sistemática e consistente, a partir de cadastro patrimonial confiável e atualizado, sendo devidamente apropriada aos centros de custo', 3]]),
  p('E2.PRO.5', 'Controle de Estoques', 'Qual o nível de maturidade do controle de estoques (materiais de consumo, medicamentos, materiais para manutenção, entre outros) para fins de apuração dos custos?', [
    ['Não há controle sistemático de estoques, impedindo a apuração confiável do consumo de materiais pelos centros de custo', 0],
    ['Existe um controle de estoques, mas ele está desatualizado, não valorizado adequadamente ou não permite associar as saídas aos centros de responsabilidade', 1],
    ['O controle de estoques é confiável, atualizado e permite identificar a quantidade, o valor e o objeto de custo consumidor', 2]]),
  p('E2.PRO.6', 'Conciliação entre Custos e Contabilidade', 'Qual a periodicidade e conciliação da apuração de custos com a contabilidade?', [
    ['Os dados de custos são apurados sem periodicidade definida e não há conciliação com a contabilidade', 0],
    ['A apuração é mensal, mas as divergências entre os custos apropriados no SIC e as VPDs registradas no SIAFIC superam 2%', 1],
    ['A GCC realiza a conciliação mensal obrigatória entre as VPDs do SIAFIC (pessoal, materiais e depreciação) e os custos do SIC, mantendo divergências abaixo de 2% com validação formal', 2]]),
  o('E2.PRO.7', 'Qualidade da informação contábil', 'A entidade, em razão da qualidade da informação contábil produzida, obteve pontuação superior a 100.000 pontos no Ranking Siconfi (ICF/Siconfi)?', { naFederal: true, nota: NOTA_SICONFI }),
  o('E2.GOV.1', 'Atuação ampliada da Gestora Central de Custos', 'A GCC, superando a atuação simplificada do estágio inicial, exerce as seguintes funções exigidas para este estágio? Marque as atendidas:', { itens: [
    { t: 'Documenta a metodologia de apuração dos novos elementos de custos incorporados neste estágio' },
    { t: 'Fornece/valida as informações operacionais (dados físicos, como número de atendimentos) necessárias à apuração' },
    { t: 'Valida a coerência dos custos apurados para suas unidades' },
    { t: 'Capacita os gestores operacionais no uso dos relatórios de custos' },
  ] }),
  o('E2.GOV.2', 'Engajamento da Alta Administração como demandante', 'A Alta Administração, superando o papel de mera patrocinadora, atua como demandante das informações de custos, solicitando relatórios comparativos e sinalizando formalmente (e-mails, atas, despachos, ofícios) a importância gerencial dos dados gerados?'),
  o('E2.GOV.3', 'Detentora dos Sistemas Estruturantes (DSE) – requisitos ampliados', 'As DSE atendem aos seguintes requisitos adicionais exigidos para este estágio? Marque os atendidos:', { itens: [
    { t: 'O departamento de contabilidade garante a correta classificação dos consumos de materiais e da depreciação dos ativos' },
    { t: 'O departamento de contabilidade apoia a definição de critérios para alocação dos custos indiretos' },
  ] }),
  o('E2.GOV.4', 'Equipe capacitada e dedicada', 'Existe equipe com dedicação específica (ainda que não exclusiva) às atividades de custos, com capacitação formal comprovada (cursos, certificações, treinamentos específicos em custos aplicados ao setor público)?'),
  p('E2.GOV.5', 'Suficiência da equipe frente ao Objeto de Avaliação', 'A quantidade e dedicação de pessoas na GCC é suficiente para sustentar a apuração de custos no nível de detalhe e na amplitude exigidos, considerando a ampliação de objetos, elementos de custo e funções de governo deste estágio?', [
    ['Equipe insuficiente, comprometendo a apuração do objeto declarado mesmo após a ampliação de escopo deste estágio', 0],
    ['Equipe suficiente para atender parcialmente, com sobrecarga ou dependência de poucas pessoas diante do volume ampliado', 1],
    ['Equipe suficiente e adequadamente dimensionada, absorvendo a ampliação de escopo sem sobrecarga estrutural', 2]]),
  p('E2.GOV.6', 'Nível de capacitação da equipe', 'Qual o grau de capacitação técnica da equipe envolvida em custos?', [
    ['Sem capacitação formal específica; conhecimento empírico/autodidata', 0],
    ['Capacitação básica pontual (ex.: participação em um treinamento/curso introdutório)', 1],
    ['Capacitação estruturada e recorrente (ex.: cursos periódicos, participação em redes/grupos técnicos de custos)', 2],
    ['Capacitação avançada e continuada (ex.: pós-graduação/especialização, certificações específicas, atuação em grupos técnicos nacionais)', 3]]),
  p('E2.GOV.7', 'Estabilidade e retenção da equipe', 'Qual o grau de estabilidade da equipe responsável por custos?', [
    ['Alta rotatividade, sem histórico de permanência (menos de 1 ano em média)', 0],
    ['Rotatividade moderada, permanência média entre 1 e 2 anos', 1],
    ['Equipe relativamente estável, permanência média entre 2 e 4 anos', 2],
    ['Equipe estável e consolidada, permanência média superior a 4 anos, com plano de sucessão ou redundância de conhecimento', 3]]),
  p('E2.USO.1', 'Utilização dos Custos no Planejamento e Orçamento', 'Qual o nível de maturidade da entidade quanto à utilização das informações de custos no processo de planejamento e elaboração orçamentária?', [
    ['As informações de custos não influenciam o planejamento ou o orçamento', 0],
    ['Os relatórios de custos são enviados para a área de planejamento, mas são ignorados na elaboração do orçamento (PPA, LDO, LOA)', 1],
    ['A GCC produz mensalmente relatórios de Análise de Desvios (Real vs. Padrão) e os custos unitários históricos são usados formalmente como insumo do orçamento e de metas de eficiência na LDO', 2]]),
  p('E2.USO.2', 'Uso das informações de custos na gestão', 'Em que medida as informações de custos produzidas são efetivamente utilizadas em processos de decisão?', [
    ['Não utilizadas; apuração é apenas cumprimento formal, sem uso gerencial', 0],
    ['Uso pontual/esporádico, em situações isoladas (ex.: resposta a demandas de auditoria)', 1],
    ['Uso recorrente em processos específicos (ex.: subsídio ao PLOA, prestação de contas)', 2],
    ['Uso sistemático e integrado à tomada de decisão gerencial corrente (ex.: avaliação de eficiência, revisão de programas, alocação orçamentária)', 3]]),
  p('E2.USO.3', 'Cálculo de Custos Unitários e Benchmarking', 'Qual o nível de aproveitamento das informações quanto ao cálculo de custos unitários e sua utilização para comparação entre unidades?', [
    ['As informações de custos não são utilizadas para comparações', 0],
    ['A entidade calcula custos totais, mas não consegue estabelecer indicadores de custos unitários confiáveis por falta de dados físicos', 1],
    ['A entidade calcula custos unitários básicos (ex.: custo por consulta na UBS, custo por aluno) com variáveis físicas padronizadas, permitindo benchmarking entre unidades similares', 3]]),

  // ---------------- ESTÁGIO 3 ----------------
  o('E3.MET.1', 'Detalhamento por objeto de custo', 'O custeio é apurado com detalhamento nível 1 no objeto de custo, permitindo a atribuição de custos por áreas funcionais dentro de cada objeto de custo?'),
  o('E3.MET.2', 'Sistema de acumulação (Contínua + Ordem de Serviço/Produção)', 'O sistema de custeio combina a acumulação contínua (por período) com acumulação por ordem de serviço ou produção, permitindo apuração de custos vinculada a eventos/processos específicos além do fluxo temporal regular?'),
  o('E3.MET.3', 'Aderência aos critérios de rateio de custos indiretos', 'Os custos indiretos apropriados aos objetos de custeio pelo método de absorção parcial observam os critérios de direcionadores ou métodos de rateio estabelecidos no Anexo 2 do GCSP, por tipo de elemento de custo?'),
  o('E3.AMP.1', 'Expansão da cobertura de objetos e elementos de custos', 'A cobertura de custeio foi ampliada em relação ao Estágio 2, atendendo cumulativamente: (i) mais de um objeto de custeio; (ii) 5 ou mais funções de governo (apenas para Poder Executivo); (iii) materialidade acumulada ≥ 50% do orçamento executado do Poder ou Órgão; (iv) elementos de custos adicionais de serviços exigíveis para este nível (energia elétrica, água e esgoto, telefonia, internet, dentre outros – Anexo 2)?'),
  p('E3.AMP.2', 'Abrangência de objetos de custeio', 'Quantos objetos de custos são efetivamente apurados de forma sistemática?', [
    ['Um único objeto', 0], ['Cinco objetos', 1], ['Dez objetos', 2], ['Vinte ou mais objetos', 3]]),
  p('E3.AMP.3', 'Cobertura organizacional', 'Qual a proporção de funções de governo já coberta pela apuração de custos?', [
    ['Cobertura incipiente, menos de cinco funções', 0], ['Cobertura básica para o estágio, mínimo cinco funções', 1],
    ['Cobertura ampliada para o estágio, mínimo dez funções', 2], ['Cobertura quase total ou total, mais de 90% das funções', 3]]),
  p('E3.AMP.4', 'Cobertura orçamentária', 'Qual a proporção do orçamento executado pelo Poder ou Órgão está coberta pela apuração de custos?', [
    ['Cobertura incipiente, inferior a 30% do orçamento executado', 0], ['Cobertura básica, entre 30% e 50% do orçamento executado', 1],
    ['Cobertura ampliada, entre 50% e 70% do orçamento executado', 2], ['Cobertura quase total ou total, acima de 70% do orçamento executado', 3]]),
  p('E3.AMP.5', 'Ampliação dos elementos de custos', 'Além dos elementos mínimos dos Estágios 1 e 2, quantos elementos de custo são efetivamente apurados de forma sistemática?', [
    ['Apenas o mínimo dos estágios 1 e 2', 0], ['Todos os elementos adicionais exigíveis para o nível 3 (Anexo 2 GCSP – piso do gate)', 1],
    ['Cinco ou mais elementos de custos além dos exigíveis para o nível 3', 2]]),
  o('E3.TEC.1', 'Atributos obrigatórios ampliados do objeto de custo', 'O sistema associa aos objetos de custos todos os atributos exigidos até este estágio? Marque os atendidos:', { itens: flatGroups(ATR_E3) }),
  o('E3.TEC.2', 'Integração com sistema de Gestão de Contratos', 'O sistema de custos está integrado (via interface automatizada ou módulo único) ao sistema de Gestão de Contratos, permitindo que dados contratuais, especialmente de serviços de terceiros, alimentem diretamente a apuração de custos?'),
  p('E3.TEC.3', 'Nível de automação da apuração de custos', 'Qual o nível de automação do processo de apuração de custos (captura, rateio, consolidação)?', [
    ['Predominantemente manual, com apoio pontual de planilhas', 0], ['Parcialmente automatizado (captura automática, mas rateio/consolidação manual)', 1],
    ['Majoritariamente automatizado, com poucas intervenções manuais residuais', 2], ['Integralmente automatizado, incluindo rateio de custos indiretos por regras parametrizadas no sistema', 3]]),
  p('E3.TEC.4', 'Auditabilidade e rastreabilidade', 'Qual o nível de rastreabilidade das informações de custo no sistema?', [
    ['Não há trilha de auditoria; dados podem ser alterados sem registro', 0], ['Há log básico de alterações, sem versionamento de parâmetros de rateio', 1],
    ['Há trilha de auditoria completa (quem, quando, o quê) e versionamento de critérios de rateio/direcionadores', 2],
    ['Trilha completa, versionamento de critérios e rastreabilidade de ponta a ponta (do lançamento contábil de origem ao objeto de custo final), com relatórios de auditoria extraíveis', 3]]),
  o('E3.PRO.1', 'Aderência ao regime de competência (NBC TSP 34/MCASP) – SIC', 'A acumulação dos custos no(s) objeto(s) considera o regime de competência para os elementos energia elétrica, água e esgoto, telefonia e internet?'),
  o('E3.PRO.2', 'Qualidade da informação contábil', 'A entidade, em razão da qualidade da informação contábil produzida, obteve pontuação superior a 140.000 pontos no Ranking Siconfi (ICF/Siconfi)?', { naFederal: true, nota: NOTA_SICONFI }),
  p('E3.PRO.3', 'Integração e Atribuição Analítica de Contratos de Serviços Terceirizados', 'Qual o nível de maturidade quanto à integração entre o SIC e o Sistema de Gestão de Contratos para atribuição dos custos de serviços terceirizados?', [
    ['Os custos com contratos de prestação de serviços continuados são apropriados de forma global ou manual', 0],
    ['O sistema de gestão de contratos está integrado ao SIAFIC, mas o SIC não consegue rastrear o consumo analítico por objeto de custo', 1],
    ['O SIC está integrado ao Sistema de Gestão de Contratos, permitindo atribuir analiticamente os custos de serviços terceirizados aos objetos consumidores', 2]]),
  o('E3.PRO.4', 'Custo-padrão como meta de desempenho', 'A entidade adota o Custo-padrão como meta de desempenho, utilizando o Custo Histórico para atribuição e evidenciação?'),
  p('E3.PRO.5', 'Custo-padrão e Metas de Desempenho: uso gerencial', 'Qual o nível de maturidade quanto à definição de metas de custos e à utilização do custo-padrão como referência de desempenho?', [
    ['A entidade utiliza apenas o custo histórico como referência para planejamento e tomada de decisão', 0],
    ['A entidade definiu metas de custos, mas baseadas em intuição ou projeções orçamentárias simples, sem estudos técnicos de custo-padrão', 1],
    ['A entidade adota o Custo-Padrão como meta de desempenho para serviços prioritários', 3]]),
  o('E3.GOV.1', 'Papel da Administração na política de gestão de custos', 'A Alta Administração exerce papel ativo de direcionamento, aprovando a Política de Gestão de Custos da entidade e utilizando análises de desempenho (real vs. padrão) para cobrar resultados e eficiência dos gestores táticos?'),
  o('E3.GOV.2', 'Atuação ampliada da Gestora Central de Custos', 'A GCC, formalmente instituída, exerce as seguintes funções exigidas para este estágio, atuando como parceira na gestão de desempenho? Marque as atendidas:', { itens: [
    { t: 'Documenta a metodologia de apuração dos novos elementos de custos incorporados neste estágio' },
    { t: 'Fornece e valida as informações operacionais (dados físicos) necessárias à apuração dos custos para todos os objetos mensurados' },
    { t: 'Valida a coerência dos custos apurados para suas unidades' },
    { t: 'Capacita os gestores operacionais no uso dos relatórios de custos' },
    { t: 'Lidera e participa ativamente da discussão e validação do custo-padrão, elaborando análises de desvios' },
    { t: 'Atua como consultora interna para as demais áreas' },
  ] }),
  o('E3.GOV.3', 'Envolvimento das DSE, ASC e UIC', 'As Detentoras dos Sistemas Estruturantes (DSE), Alimentadoras do SIC (ASC) e Usuárias da Informação de Custos (UIC) ampliaram seu papel conforme exigido neste estágio? Marque os atendidos:', { itens: [
    { t: 'O planejamento e orçamento iniciam seu envolvimento formal, utilizando estudos de custos para analisar propostas orçamentárias e subsidiar decisões de "comprar vs. fazer"' },
    { t: 'As unidades envolvidas nos estágios anteriores aprimoram os processos de trabalho, visando a melhoria contínua na qualidade e tempestividade das informações' },
    { t: 'Novas áreas, como a gestão de contratos, integram-se aos trabalhos, garantindo informações estruturadas sobre a execução dos contratos' },
    { t: 'O uso de direcionadores e técnicas de rateio é aplicado na alocação dos custos com serviços de terceiros' },
  ] }),
  o('E3.GOV.4', 'Utilização dos Relatórios pela Usuária da Informação de Custos (UIC)', 'A UIC está utilizando os relatórios do sistema de custos para fornecer feedback metodológico às demais partes interessadas (GCC, GSC e DSE)? Marque os atendidos:', { itens: [
    { t: 'A UIC utiliza os relatórios de forma sistemática em suas rotinas de análise e gestão' },
    { t: 'A UIC identifica inconsistências, limitações ou oportunidades de melhoria nos dados recebidos' },
    { t: 'As UICs formalizam e transmitem feedback metodológico às DSEs, orientando ajustes nos processos de coleta e apuração' },
    { t: 'O feedback fornecido pela UIC é incorporado pelas DSEs na melhoria contínua das informações' },
  ] }),
  o('E3.GOV.5', 'Atuação Avaliativa da Controladoria Interna', 'A Controladoria Interna iniciou sua atuação avaliativa em relação ao sistema de custos? Marque os atendidos:', { itens: [
    { t: 'Realiza verificações periódicas da metodologia de alocação dos custos indiretos' },
    { t: 'Avalia a aderência dessa metodologia às normas contábeis e aos procedimentos definidos pela entidade' },
    { t: 'Identifica fragilidades ou inconsistências nos processos e controles do sistema de custos' },
    { t: 'Propõe e acompanha recomendações de melhoria para os processos e controles avaliados' },
  ] }),
  p('E3.USO.1', 'Disseminação da informação (painéis e relatórios)', 'Qual o nível de disseminação das informações de custo pelo sistema?', [
    ['Relatórios estáticos, gerados sob demanda, sem padronização', 0], ['Relatórios padronizados periódicos (ex.: mensal/trimestral), distribuídos às áreas interessadas', 1],
    ['Painéis gerenciais interativos (dashboards) com indicadores real vs. padrão, atualizados periodicamente', 2],
    ['Painéis interativos de autoatendimento (self-service BI), em tempo real ou near real-time, com detalhamento por objeto de custo e alertas automáticos de desvio', 3]]),
  p('E3.USO.2', 'Análise de desvios e feedback', 'O processo de análise de desvios entre o custo real e o custo-padrão é sistemático e fornece feedback à gestão?', [
    ['Não há análise de desvios', 0], ['Análise esporádica', 1], ['Análise sistemática, mas sem feedback formal', 2], ['Análise formal e feedback contínuo para a gestão', 3]]),

  // ---------------- ESTÁGIO 4 ----------------
  o('E4.MET.1', 'Detalhamento por centro de atividade (Nível 2)', 'O custeio é apurado com detalhamento nível 2 (Centros de Atividade) dentro de cada objeto de custo, atingindo o nível mais granular de exibição padronizado pelo GCSP?'),
  o('E4.MET.2', 'Múltiplas modelagens de custeio', 'O sistema de custos utiliza simultaneamente as modelagens Orgânica, por Políticas Públicas, por Processos ou outra modelagem, permitindo responder a perguntas estratégicas complexas sob diferentes perspectivas analíticas?'),
  o('E4.MET.3', 'Absorção Integral (Custeio Pleno) com técnicas avançadas', 'A entidade adota o método de Absorção Integral (Custeio Pleno), alcançando 100% das VPDs ocorridas – incluindo custos administrativos, financeiros e de suporte geral – a todos os objetos de custos cadastrados, podendo empregar técnicas avançadas como o ABC?'),
  p('E4.MET.4', 'Nível de sofisticação da modelagem e do detalhamento', 'Qual o nível de sofisticação da modelagem de custeio e do detalhamento adotado pela entidade?', [
    ['Detalhamento restrito a áreas funcionais (Nível 1), sem múltiplas modelagens', 0],
    ['Detalhamento por centros de atividade (Nível 2), mas sem uso de múltiplas modelagens além da orgânica', 1],
    ['Custos apropriados no Nível 2 (Centros de Atividade) e uso de múltiplas modelagens (Orgânica, Políticas Públicas e Processos) para decisões estratégicas', 2]]),
  p('E4.MET.5', 'Alcance da absorção integral dos custos (Custeio Pleno)', 'A entidade apropria a totalidade dos custos administrativos e de suporte geral aos objetos de custos finalísticos, com apoio de técnicas avançadas de rateio quando aplicável?', [
    ['Os custos administrativos e de suporte geral não são distribuídos aos objetos finalísticos', 0],
    ['A entidade aloca custos administrativos de forma simplificada, deixando parcelas relevantes do orçamento sem atribuição', 1],
    ['A entidade adota Absorção Integral, apropriando 100% do orçamento executado a todos os objetos de custos cadastrados, com técnicas avançadas (como o ABC, se aplicável)', 2]]),
  o('E4.AMP.1', 'Amplitude total de objetos, funções e elementos de custos', 'A cobertura de custeio alcança cumulativamente: (i) 100% dos objetos de custos presentes na entidade; (ii) cobertura completa das funções de governo atendidas; (iii) materialidade de 100% do orçamento executado pelo Poder ou Órgão; (iv) apuração de todos os elementos de custo existentes?'),
  p('E4.AMP.2', 'Abrangência de objetos de custeio', 'Qual a proporção de objetos de custos presentes na entidade que são efetivamente apurados de forma sistemática?', [
    ['Cobertura ainda incompleta, com objetos relevantes não custeados', 0], ['Cobertura entre 90% e 95% dos objetos de custos', 1], ['Cobertura de 100% dos objetos de custos presentes na entidade', 2]]),
  p('E4.AMP.3', 'Cobertura orçamentária (materialidade)', 'Qual a proporção do orçamento executado pelo Poder ou Órgão está coberta pela apuração de custos?', [
    ['Parcelas relevantes do orçamento executado (acima de 10%) permanecem sem atribuição', 0],
    ['Materialidade apropriada entre 90% e 95% do orçamento executado, com elementos ou custos administrativos ainda não distribuídos', 1],
    ['Materialidade de 100% do orçamento executado, incluindo custos administrativos, financeiros e de suporte geral', 2]]),
  p('E4.AMP.4', 'Amplitude dos elementos de custos', 'Qual a proporção de elementos de custo existentes na entidade que são efetivamente apurados?', [
    ['Ainda há elementos de custo relevantes não apurados', 0], ['Quase todos os elementos são apurados, com exceções pontuais e pouco relevantes', 1], ['Todos os elementos de custo existentes são apurados', 2]]),
  o('E4.TEC.1', 'Atributos obrigatórios ampliados do objeto de custo', 'O sistema associa aos objetos de custos todos os atributos previstos no GCSP? Marque os atendidos:', { itens: flatGroups(ATR_E4) }),
  o('E4.TEC.2', 'Integração tecnológica plena via APIs e bases externas', 'O ecossistema de informações está totalmente integrado e automatizado, conectando em tempo real (ou com defasagem máxima de 5 dias úteis) o SIAFIC, os sistemas estruturantes internos e fontes de dados externas (ex.: SIOPS, INEP, CNES), com disponibilização de painéis de BI?'),
  p('E4.TEC.3', 'Nível de automação e integração tecnológica', 'Qual o nível de automação e integração do ecossistema de sistemas de custos da entidade?', [
    ['O SIC depende de cargas de dados manuais ou rotinas de lote com atrasos significativos', 0],
    ['O sistema é integrado, mas não possui ferramentas de visualização dinâmica para a alta administração', 1],
    ['O ecossistema é totalmente integrado em tempo real (ou defasagem máx. de 5 dias úteis) via APIs, conectando SIAFIC, sistemas estruturantes e bases nacionais, com painéis de BI', 2]]),
  p('E4.TEC.4', 'Auditabilidade e rastreabilidade', 'Qual o nível de rastreabilidade das informações de custo no sistema?', [
    ['Há trilha de auditoria completa e versionamento de critérios de rateio, mas sem rastreabilidade de ponta a ponta', 0],
    ['Há rastreabilidade de ponta a ponta (do lançamento contábil de origem ao objeto de custo final), com relatórios de auditoria extraíveis', 1],
    ['Há rastreabilidade de ponta a ponta integrada às bases externas, com relatórios de auditoria e alertas automáticos de inconsistência entre fontes internas e externas', 2]]),
  p('E4.TEC.5', 'Disseminação da informação (painéis e relatórios)', 'Qual o nível de disseminação das informações de custo pelo sistema?', [
    ['Painéis interativos de autoatendimento (self-service BI), em tempo real ou near real-time, com detalhamento por objeto de custo e alertas automáticos de desvio', 0],
    ['Painéis de BI com indicadores de desempenho em tempo real, incorporando dados de fontes externas (benchmarking) para decisões estratégicas', 1],
    ['Painéis estratégicos integrados ao ciclo de planejamento (PPA/LDO/LOA) e à prestação de contas em Relato Integrado, com simulação de cenários e projeções de longo prazo', 2]]),
  o('E4.PRO.1', 'Qualidade da informação contábil', 'A entidade, em razão da qualidade da informação contábil produzida, obteve pontuação superior a 170.000 pontos no Ranking Siconfi (ICF/Siconfi)?', { naFederal: true, nota: NOTA_SICONFI }),
  o('E4.PRO.2', 'Custo-padrão como meta de desempenho consolidada', 'A entidade adota o Custo-padrão como meta de desempenho de forma consolidada para a totalidade (ou quase totalidade) dos objetos de custos relevantes, comparando-o sistematicamente com o Custo Histórico apurado e identificando desvios?'),
  o('E4.PRO.3', 'Sistemas de acumulação combinados (Contínua e por Ordem de Serviço/Produção)', 'A entidade opera simultaneamente com sistema de acumulação Contínua (operações rotineiras) e por Ordem de Serviço/Produção (projetos específicos), aplicando cada um conforme a natureza do objeto de custo?'),
  p('E4.PRO.4', 'Nível de maturidade na gestão baseada em custo-padrão e benchmarking', 'Qual o grau de utilização do custo-padrão e de mecanismos de benchmarking na gestão da entidade?', [
    ['Não há uso sistemático de custo-padrão nem de benchmarking externo', 0],
    ['Há uso pontual de custo-padrão e/ou comparações internas, sem benchmarking externo consolidado', 1],
    ['O custo-padrão é utilizado como meta de forma consolidada, com benchmarking externo (outras entidades/bases nacionais) para avaliação comparativa de eficiência', 2]]),
  o('E4.GOV.1', 'Alta Administração como promotora da cultura de custo-efetividade', 'A Alta Administração incorpora a análise de custo-efetividade como critério mandatório nos processos decisórios sobre políticas públicas e investimentos estratégicos, atuando como principal usuária e promotora da cultura de custos?'),
  o('E4.GOV.2', 'Gestora Central de Custos como parceira estratégica', 'A GCC atua como parceira estratégica da Alta Administração, produzindo análises proativas e modelando cenários para subsidiar o planejamento e decisões de longo prazo, participando diretamente do comitê de planejamento estratégico e orçamentário?'),
  o('E4.GOV.3', 'Integração total com Planejamento e Orçamento (PPA/LDO/LOA)', 'A informação de custos é insumo essencial e totalmente incorporado ao ciclo orçamentário (PPA, LDO, LOA), conectando a alocação de recursos a evidências de desempenho e eficiência?'),
  o('E4.GOV.4', 'Controladoria Interna como asseguradora de efetividade', 'A Controladoria Interna avalia não apenas a conformidade, mas a efetividade do sistema de custos (se o uso da informação gera melhores decisões e mais valor público), realizando auditorias de qualidade, verificação metodológica, identificação de riscos e proposição de melhorias?'),
  p('E4.GOV.5', 'Grau de protagonismo da governança estratégica de custos', 'Qual o nível de protagonismo da GCC na governança da entidade?', [
    ['A GCC atua de forma isolada, focada apenas no fechamento contábil dos custos', 0],
    ['A GCC fornece relatórios estratégicos, mas não participa ativamente das decisões de alto nível', 1],
    ['A GCC é reconhecida formalmente como parceira estratégica, participando diretamente do comitê de planejamento estratégico e orçamentário', 2]]),
  o('E4.USO.1', 'Análises de custo-benefício/custo-efetividade mandatórias', 'Análises de Custo-Benefício e Custo-Efetividade são requisitos mandatórios para a criação ou alteração de políticas públicas na entidade?'),
  o('E4.USO.2', 'Relato Integrado', 'A prestação de contas anual da Alta Administração, elaborada no modelo de Relato Integrado, conecta custos, estratégia e geração de valor público?'),
  o('E4.USO.3', 'UIC como agente ativo de gestão', 'A UIC analisa os resultados dos relatórios de custos, define parâmetros e indicadores de eficiência, identifica oportunidades de otimização orçamentária, toma decisões baseadas nas informações de custos, implementa melhorias e zela pela qualidade dos insumos?'),
  o('E4.USO.4', 'Estudos de viabilidade de novos projetos baseados em custos', 'A entidade realiza estudos de viabilidade de novos projetos e investimentos estratégicos com base em projeções de custos?'),
  p('E4.USO.5', 'Grau de institucionalização do uso estratégico das informações de custos', 'Qual o grau de institucionalização do uso das informações de custos nas decisões sobre políticas públicas?', [
    ['As decisões de expansão ou corte de políticas públicas não consideram as evidências de custos', 0],
    ['Estudos de custo-efetividade são realizados apenas sob demanda externa ou de forma esporádica', 1],
    ['Análises de Custo-Benefício e Custo-Efetividade são mandatórias para criação/alteração de políticas públicas, com prestação de contas em Relato Integrado', 2]]),
].map((q) => {
  const [est, dim] = q.codigo.split('.');
  return { ...q, estagio: est === 'TP' ? 'TP' : est, dimensao: est === 'TP' ? null : dim };
});

// ---------------------------------------------------------------------------
// Avaliação de uma resposta individual
// Respostas aceitas:
//   gate simples   -> "sim" | "nao" | "na" (só para gates do Ranking Siconfi, instituição federal)
//   gate checklist -> array de índices marcados (atende se todos marcados)
//   pontuável      -> índice da opção (número) | "na"
function avaliarQuestao(q, resp) {
  if (q.tipo === 'O') {
    if (q.itens) {
      const marcados = Array.isArray(resp) ? [...new Set(resp.map(Number))].filter((i) => i >= 0 && i < q.itens.length) : [];
      const ok = marcados.length === q.itens.length;
      return { respondida: Array.isArray(resp), atende: ok, texto: ok ? 'Sim' : 'Não', pontos: null, marcados };
    }
    if (resp === 'na' && q.naFederal) return { respondida: true, atende: true, texto: 'N/A (instituição federal)', pontos: null };
    if (resp === 'sim') return { respondida: true, atende: true, texto: 'Sim', pontos: null };
    if (resp === 'nao') return { respondida: true, atende: false, texto: 'Não', pontos: null };
    return { respondida: false, atende: false, texto: null, pontos: null };
  }
  const max = Math.max(...q.opcoes.map((x) => x.v));
  if (resp === 'na') return { respondida: true, na: true, texto: 'N/A', pontos: null, max: 0 };
  const idx = Number(resp);
  if (resp === null || resp === undefined || resp === '' || !Number.isInteger(idx) || !q.opcoes[idx]) return { respondida: false, pontos: null };
  return { respondida: true, texto: q.opcoes[idx].t, pontos: q.opcoes[idx].v, max };
}

// Classificação conforme itens 3, 4 e 7 do Anexo 4
function classificar(respostas) {
  const porEstagio = {};
  for (const e of ESTAGIOS) {
    const qs = QUESTOES.filter((q) => q.estagio === e.id);
    const gatesFalhos = [];
    let pontos = 0; let maximo = 0; let validos = 0; let na = 0;
    for (const q of qs) {
      const r = avaliarQuestao(q, respostas[q.codigo]);
      if (q.tipo === 'O') { if (!r.atende) gatesFalhos.push(q.codigo); }
      else if (r.na) na += 1;
      else if (r.respondida) { pontos += r.pontos; maximo += r.max; validos += 1; }
      else { maximo += Math.max(...q.opcoes.map((x) => x.v)); validos += 1; } // não respondida conta como 0
    }
    const totalGates = qs.filter((q) => q.tipo === 'O').length;
    const minimo = e.corte == null ? null : Math.ceil(e.corte * maximo - 1e-9);
    const gatesOk = gatesFalhos.length === 0;
    // Com todos os itens [P] em N/A não há base de pontuação: o estágio não pode ser considerado alcançado.
    const pontuacaoOk = e.corte == null ? true : maximo > 0 && pontos >= minimo;
    porEstagio[e.id] = {
      estagio: e.id, titulo: e.titulo, totalGates, gatesAtendidos: totalGates - gatesFalhos.length, gatesFalhos,
      pontos: e.corte == null ? null : pontos, maximo: e.corte == null ? null : maximo, minimo,
      percentual: e.corte == null || maximo === 0 ? null : Math.round((pontos / maximo) * 1000) / 10,
      corte: e.corte, itensValidos: validos, itensNA: na, alcancado: gatesOk && pontuacaoOk,
    };
  }

  let nivel = 0;
  const triagemOk = porEstagio.TP.alcancado;
  if (triagemOk) {
    for (const e of ESTAGIOS.filter((x) => x.nivel)) {
      if (porEstagio[e.id].alcancado) nivel = e.nivel; else break;
    }
  }

  let classificacao;
  if (!triagemOk) classificacao = 'Fase Preparatória – Imaturidade Estrutural (Habilitação pendente)';
  else if (nivel === 0) classificacao = 'Habilitada (Triagem aprovada) – Estágio 1 ainda não alcançado';
  else classificacao = `Estágio ${nivel} – ${ESTAGIOS.find((x) => x.nivel === nivel).classificacao}`;

  // Gap analysis: o que falta para o próximo estágio
  const proximoId = !triagemOk ? 'TP' : (nivel < 4 ? `E${nivel + 1}` : null);
  let lacunas = null;
  if (proximoId) {
    const d = porEstagio[proximoId];
    lacunas = {
      estagio: proximoId, gatesFalhos: d.gatesFalhos,
      pontosFaltantes: d.minimo == null ? 0 : Math.max(0, d.minimo - d.pontos),
    };
  }

  return { nivel, triagemOk, classificacao, estagios: porEstagio, lacunas };
}

module.exports = { ESTAGIOS, DIMENSOES, QUESTOES, avaliarQuestao, classificar };
