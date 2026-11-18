-- Banco do formulário de Autoavaliação de Maturidade (Anexo 4 – GCSP)

-- Órgãos avaliados
CREATE TABLE orgaos (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(255) NOT NULL,
    cnpj          VARCHAR(14)  NOT NULL UNIQUE,      -- somente dígitos
    esfera        VARCHAR(20)  NOT NULL CHECK (esfera IN ('Federal', 'Estadual', 'Municipal', 'Distrital')),
    poder         VARCHAR(30),
    uf            CHAR(2),
    municipio     VARCHAR(120),
    responsavel   VARCHAR(200),
    email         VARCHAR(200),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuários do sistema (cadastro pelo site = 'usuario'; administradores definidos via node usuarios.js)
CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    login       VARCHAR(80)  NOT NULL UNIQUE,
    senha_hash  TEXT         NOT NULL,               -- scrypt (salt:hash)
    nome        VARCHAR(200),
    email       VARCHAR(200),
    perfil      VARCHAR(10)  NOT NULL DEFAULT 'usuario' CHECK (perfil IN ('usuario', 'admin')),
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Classificação recebida em cada avaliação (uma linha por envio do formulário)
CREATE TABLE classificacoes (
    id                SERIAL PRIMARY KEY,
    orgao_id          INTEGER NOT NULL REFERENCES orgaos(id) ON DELETE CASCADE,
    usuario_id        INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,   -- quem respondeu
    data_avaliacao    DATE NOT NULL,
    objeto_custo      TEXT NOT NULL,                 -- item 5 do Anexo 4 (objeto de avaliação)
    justificativa     TEXT,
    nivel             SMALLINT NOT NULL CHECK (nivel BETWEEN 0 AND 4),  -- 0 = Fase Preparatória / sem estágio
    triagem_aprovada  BOOLEAN NOT NULL,
    classificacao     VARCHAR(255) NOT NULL,
    detalhes          JSONB NOT NULL,                -- pontuação, gates e lacunas por estágio
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_classificacoes_orgao ON classificacoes(orgao_id);
CREATE INDEX idx_classificacoes_usuario ON classificacoes(usuario_id);

-- Respostas (uma linha por questão respondida)
CREATE TABLE respostas (
    id                SERIAL PRIMARY KEY,
    orgao_id          INTEGER NOT NULL REFERENCES orgaos(id) ON DELETE CASCADE,
    classificacao_id  INTEGER NOT NULL REFERENCES classificacoes(id) ON DELETE CASCADE,
    questao_codigo    VARCHAR(20) NOT NULL,          -- ex.: TP.1, E1.MET.2
    estagio           VARCHAR(3)  NOT NULL,          -- TP, E1..E4
    dimensao          VARCHAR(3),                    -- MET, AMP, TEC, PRO, GOV, USO
    tipo              CHAR(1)     NOT NULL CHECK (tipo IN ('O', 'P')),
    resposta          TEXT        NOT NULL,          -- texto da opção escolhida / Sim / Não / N/A
    atende_gate       BOOLEAN,                       -- só para tipo O
    pontos            SMALLINT,                      -- só para tipo P (NULL se N/A)
    itens_marcados    JSONB,                         -- gates em checklist: itens marcados
    UNIQUE (classificacao_id, questao_codigo)
);
CREATE INDEX idx_respostas_orgao ON respostas(orgao_id);
