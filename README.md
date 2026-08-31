# Glaz

Quadro Kanban e painel de gestão de tarefas compartilhado, com login por senha única.

## Configurar na Vercel

1. **Importe este repositório** em vercel.com → New Project.
2. **Adicione o armazenamento**: na aba *Storage* do projeto, clique em *Create Database* → *Upstash for Redis* (grátis) e conecte ao projeto. Isso injeta as variáveis de conexão automaticamente — não precisa copiar nada.
3. **Defina as variáveis de ambiente** (aba *Settings → Environment Variables*):
   - `BOARD_PASSWORD` — a senha que você e o Cassius vão usar para entrar.
   - `AUTH_SECRET` — uma string aleatória longa (gere uma com `openssl rand -hex 32`, ou qualquer texto longo e imprevisível).
4. **Deploy**. Depois de qualquer mudança nessas variáveis, faça um novo deploy (Deployments → ⋯ → Redeploy) para elas terem efeito.
5. Acesse a URL publicada, digite a senha, e pronto — os dois podem usar o mesmo link.

## Como funciona

- O estado do quadro (tarefas e atividade) fica salvo no Redis, numa única chave.
- Cada navegador consulta o estado a cada poucos segundos e salva alterações automaticamente — não é preciso "sincronizar" manualmente.
- A autenticação é uma senha única compartilhada (sem contas individuais), pensada para uso interno entre poucas pessoas de confiança — não é um sistema de autenticação robusto para dados sensíveis.
- "Quem é você" (Rafael/Cassius) é só uma preferência salva no navegador, usada para atribuir tarefas e o log de atividade — troque a qualquer momento pelo link "trocar" no topo.

## Rodar localmente

Requer Node.js 20+.

```bash
npm install
cp .env.example .env.local   # preencha BOARD_PASSWORD e AUTH_SECRET
npm run dev
```

Sem as variáveis do Redis (só existem quando conectado à Vercel), a leitura/gravação do quadro retorna erro — normal em ambiente local sem a integração.
