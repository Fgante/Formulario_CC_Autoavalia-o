# Formulário – Autoavaliação de Maturidade (Anexo 4 do GCSP)

## Subir
```
docker compose up -d --build
```
- Sistema: http://localhost:3000 (exige login; cadastro em http://localhost:3000/cadastro.html)
- PostgreSQL (só deste computador): `localhost:5433` · banco `gcsp` · usuário `gcsp` · senha `gcsp123`

## Link público para testes (Cloudflare)
```
docker compose --profile tunel up -d
docker compose logs tunel        # procure o endereço https://xxxx.trycloudflare.com
docker compose stop tunel        # desliga o link
```
O endereço muda a cada vez que o túnel é reiniciado e só funciona enquanto este computador
e os contêineres estiverem ligados. É um link de teste, não de produção.

## Usuários e permissões
| Perfil | Como é criado | Pode acessar |
|---|---|---|
| `usuario` | qualquer pessoa, em **/cadastro.html** | Novo formulário (`/`) e Meu perfil (`/perfil`, só as próprias avaliações) |
| `admin` | pelo terminal | tudo acima + Todas as avaliações (`/admin`, com quem respondeu cada uma) |

Cada avaliação guarda quem a respondeu (`classificacoes.usuario_id`).

```
docker exec gcsp-app node usuarios.js adicionar <login> <senha> [admin|usuario]  # cria/troca senha (padrão: admin)
docker exec gcsp-app node usuarios.js perfil <login> admin                       # promove um usuário cadastrado
docker exec gcsp-app node usuarios.js perfil <login> usuario                     # tira o admin
docker exec gcsp-app node usuarios.js remover <login>                            # revoga o acesso na hora
docker exec gcsp-app node usuarios.js listar
```
A sessão dura 8 horas. Se publicar o sistema fora desta máquina, use HTTPS e defina
`COOKIE_SECURE=true` e `SESSION_SECRET=<valor aleatório>` no serviço `app`.

Parar: `docker compose down` (os dados ficam no volume `gcsp_data`; `docker compose down -v` apaga tudo).

## Tabelas
| Tabela | Conteúdo |
|---|---|
| `orgaos` | órgão avaliado (PK `id`, CNPJ único) |
| `usuarios` | contas de acesso (login, nome, e-mail, perfil `usuario`/`admin`, senha com scrypt) |
| `respostas` | uma linha por questão respondida (`orgao_id`, `classificacao_id`, código, resposta, pontos/gate) |
| `classificacoes` | resultado de cada envio (`orgao_id`, `usuario_id` = quem respondeu, nível 0–4, texto da classificação, detalhes por estágio em JSONB) |

## Regras de classificação (itens 3, 4 e 7 do Anexo 4)
- Triagem Preparatória: os 7 gates precisam ser "Sim"; qualquer "Não" = Fase Preparatória.
- Estágio N: 100% dos gates [O] + pontuação [P] ≥ corte (E1 60%, E2 65%, E3 75%, E4 85%),
  arredondando para cima. Itens [P] marcados N/A saem da base; se todos forem N/A, o estágio não é alcançado.
- Classificação final = maior estágio consecutivo atendido (1 → 2 → 3 → 4).

As perguntas e o cálculo ficam em `app/questoes.js`.
