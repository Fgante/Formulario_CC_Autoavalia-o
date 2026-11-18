# Formulário – Autoavaliação de Maturidade (Anexo 4 do GCSP)

## Subir
```
docker compose up -d --build
```
- Formulário (público): http://localhost:3000
- Avaliações salvas (restrito, exige login): http://localhost:3000/admin
- PostgreSQL (só deste computador): `localhost:5433` · banco `gcsp` · usuário `gcsp` · senha `gcsp123`

## Link público para testes (Cloudflare)
```
docker compose --profile tunel up -d
docker compose logs tunel        # procure o endereço https://xxxx.trycloudflare.com
docker compose stop tunel        # desliga o link
```
O endereço muda a cada vez que o túnel é reiniciado e só funciona enquanto este computador
e os contêineres estiverem ligados. É um link de teste, não de produção.

## Quem pode ver as avaliações
Só usuários cadastrados na tabela `usuarios`. Gerenciar com:
```
docker exec gcsp-app node usuarios.js adicionar <login> <senha>   # cria ou troca a senha
docker exec gcsp-app node usuarios.js remover <login>             # revoga o acesso na hora
docker exec gcsp-app node usuarios.js listar
```
A sessão dura 8 horas. Se publicar o sistema fora desta máquina, use HTTPS e defina
`COOKIE_SECURE=true` e `SESSION_SECRET=<valor aleatório>` no serviço `app`.

Parar: `docker compose down` (os dados ficam no volume `gcsp_data`; `docker compose down -v` apaga tudo).

## Tabelas
| Tabela | Conteúdo |
|---|---|
| `orgaos` | órgão avaliado (PK `id`, CNPJ único) |
| `respostas` | uma linha por questão respondida (`orgao_id`, `classificacao_id`, código, resposta, pontos/gate) |
| `classificacoes` | resultado de cada envio (`orgao_id`, nível 0–4, texto da classificação, detalhes por estágio em JSONB) |

## Regras de classificação (itens 3, 4 e 7 do Anexo 4)
- Triagem Preparatória: os 7 gates precisam ser "Sim"; qualquer "Não" = Fase Preparatória.
- Estágio N: 100% dos gates [O] + pontuação [P] ≥ corte (E1 60%, E2 65%, E3 75%, E4 85%),
  arredondando para cima. Itens [P] marcados N/A saem da base.
- Classificação final = maior estágio consecutivo atendido (1 → 2 → 3 → 4).

As perguntas e o cálculo ficam em `app/questoes.js`.
