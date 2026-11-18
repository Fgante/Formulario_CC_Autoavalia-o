# Formulário – Autoavaliação de Maturidade (Anexo 4 do GCSP)

> ⚠️ **Este projeto é um EXEMPLO / PROTÓTIPO.**
> Ele mostra *como* o Instrumento de Autoavaliação de Maturidade (Anexo 4 do Guia de Custos
> para o Setor Público) pode ser implementado: formulário, cálculo da classificação, contas de
> usuário e gravação em banco. Serve como ponto de partida e referência para quem for fazer a
> versão definitiva, **não como sistema pronto para produção**. Veja
> [O que falta para produção](#o-que-falta-para-produção).

## O que o sistema faz
1. A pessoa **cria uma conta** (login e senha) e entra.
2. Preenche o **formulário**: identificação do órgão, Triagem Preparatória e Estágios 1 a 4.
3. Ao enviar, o servidor **calcula a classificação** pelas regras do Anexo 4, **salva tudo no banco**
   (órgão, respostas, classificação e quem respondeu) e **mostra o resultado na hora**.
4. Em **Meu perfil**, cada pessoa vê os questionários que respondeu.
5. **Administradores** também veem **Todas as avaliações**, com quem respondeu cada uma.

## Como rodar
Precisa apenas do **Docker**.
```
docker compose up -d --build
```
- Sistema: http://localhost:3000 (cadastro em http://localhost:3000/cadastro.html)
- Banco PostgreSQL (só desta máquina): `localhost:5433` · banco `gcsp` · usuário `gcsp` · senha `gcsp123`
- Parar: `docker compose down` (os dados ficam no volume `gcsp_data`; `docker compose down -v` apaga tudo)

Criar o primeiro administrador:
```
docker exec gcsp-app node usuarios.js adicionar <login> <senha>
```

## Onde está cada coisa
| Quero encontrar / mudar… | Arquivo | Onde |
|---|---|---|
| **Perguntas**, opções e pontos | `app/questoes.js` | lista `QUESTOES` |
| **Percentual de corte** de cada estágio | `app/questoes.js` | lista `ESTAGIOS` (campo `corte`) |
| **Cálculo da classificação** | `app/questoes.js` | função `classificar()` |
| Como uma resposta vira pontos / gate | `app/questoes.js` | função `avaliarQuestao()` |
| **Recebimento do formulário + gravação no banco** | `app/server.js` | rota `POST /api/avaliacoes` |
| **Criação de conta** | `app/server.js` (servidor) e `app/public/cadastro.html` (tela) | rota `POST /api/cadastro` |
| **Login / logout** | `app/server.js` e `app/public/login.html` | rotas `POST /api/login` e `/api/logout` |
| Quem pode ver o quê (permissões) | `app/server.js` | `exigirLogin`, `exigirAdmin` e rota `GET /api/avaliacoes/:id` |
| Como a senha é guardada (hash) e a sessão | `app/auth.js` | `hashSenha`, `conferirSenha`, `criarToken` |
| Comportamento do formulário na tela | `app/public/app.js` | etapas, validação e envio |
| **Exibição do resultado** (saída na tela) | `app/public/resultado.js` | função `renderResultado()` |
| Listas do perfil e do admin | `app/public/avaliacoes.js` | função `montarListaAvaliacoes()` |
| Menu do topo (links por perfil) | `app/public/nav.js` | — |
| Páginas que exigem login | `app/paginas/` | `formulario.html`, `perfil.html`, `admin.html` |
| Páginas abertas + visual | `app/public/` | `login.html`, `cadastro.html`, `style.css` |
| **Estrutura do banco** (tabelas) | `db/init.sql` | — |
| Gerenciar usuários pelo terminal | `app/usuarios.js` | — |
| Containers (banco, app, túnel) | `docker-compose.yml` | — |

Todos esses arquivos têm comentários explicando cada bloco.

## Fluxo de uma avaliação
```
Navegador (public/app.js)                     Servidor (server.js)                     Banco (PostgreSQL)
──────────────────────────                    ────────────────────                     ──────────────────
GET /api/questionario  ───────────────────▶  devolve QUESTOES (questoes.js)
usuário responde as etapas
POST /api/avaliacoes { orgao, avaliacao,  ─▶  1. valida os dados
                       respostas }            2. classificar(respostas)  ← CÁLCULO
                                              3. grava, numa transação: ────────────▶  orgaos
                                                                                       classificacoes (+ usuario_id)
                                                                                       respostas (1 linha por questão)
renderResultado(resultado)  ◀─────────────── 4. devolve o resultado     ← SAÍDA
(public/resultado.js)
```
O cálculo é feito **só no servidor**. O navegador apenas exibe o resultado, para que ninguém
consiga forjar uma classificação alterando o JavaScript da página.

## Regras de classificação (itens 3, 4 e 7 do Anexo 4)
- **Triagem Preparatória:** os 7 gates precisam ser "Sim". Qualquer "Não" resulta em Fase Preparatória.
- **Estágio N** é alcançado com: 100% dos gates [O] do estágio **e** pontuação [P] ≥ corte
  (E1 60%, E2 65%, E3 75%, E4 85%), arredondando para cima.
- Itens [P] marcados **N/A** saem da base de cálculo. Se **todos** forem N/A, o estágio não é alcançado.
- Cada estágio é apurado separadamente. A **classificação final** é o maior estágio consecutivo
  alcançado (1 → 2 → 3 → 4).
- Gates do Ranking Siconfi aceitam "N/A (instituição federal)", que conta como atendido.
- Pontuações máximas e mínimas conferem com a tabela do Anexo 4: E1 27/17 · E2 55/36 · E3 28/21 · E4 22/19.

## Banco de dados
| Tabela | Conteúdo |
|---|---|
| `usuarios` | contas: login, nome, e-mail, perfil (`usuario`/`admin`), senha em hash (scrypt) |
| `orgaos` | órgão avaliado (CNPJ único; reenvios atualizam os dados) |
| `classificacoes` | um registro por envio: resultado, nível 0–4, detalhes por estágio (JSON) e **`usuario_id` = quem respondeu** |
| `respostas` | uma linha por questão: resposta escolhida, pontos ou se atendeu o gate |

## Usuários e permissões
| Perfil | Como é criado | Pode acessar |
|---|---|---|
| `usuario` | qualquer pessoa, em **/cadastro.html** | Novo formulário (`/`) e Meu perfil (`/perfil`, só as próprias avaliações) |
| `admin` | pelo terminal | tudo acima + Todas as avaliações (`/admin`) |

```
docker exec gcsp-app node usuarios.js adicionar <login> <senha> [admin|usuario]  # cria/troca senha (padrão: admin)
docker exec gcsp-app node usuarios.js perfil <login> admin                       # promove um usuário cadastrado
docker exec gcsp-app node usuarios.js perfil <login> usuario                     # tira o admin
docker exec gcsp-app node usuarios.js remover <login>                            # revoga o acesso na hora
docker exec gcsp-app node usuarios.js listar
```
As senhas **não são gravadas**: só um hash scrypt com salt aleatório, que não pode ser revertido.

## Link público para testes (Cloudflare)
```
docker compose --profile tunel up -d
docker compose logs tunel        # procure o endereço https://xxxx.trycloudflare.com
docker compose stop tunel        # desliga o link
```
O link muda a cada reinício e só funciona com este computador ligado. Serve apenas para demonstração.

## O que falta para produção
Por ser um exemplo, ficaram de fora:
- **Hospedagem com HTTPS** e as variáveis `SESSION_SECRET` (fixa) e `COOKIE_SECURE=true` (ver `docker-compose.yml`).
- **Senhas de verdade** no banco (as do `docker-compose.yml` são de teste).
- **Recuperar e trocar senha** pelo site (hoje só pelo terminal) e confirmação de e-mail.
- **Backup** do banco.
- **Gerenciar usuários pela tela de admin** (hoje é pelo terminal).
- **Editar ou excluir** uma avaliação enviada e exportar para Excel/PDF.
- **Testes automatizados** do cálculo (`classificar`).
- **Revisão das perguntas por especialistas:** o texto foi transcrito do PDF do GCSP e pode haver
  pequenas diferenças de redação.
- **Integração com o site do Comitê** (iframe ou subdomínio) e **auditoria** (log de quem acessou o quê).
