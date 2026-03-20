# VOXA — Guia de Arquitetura e Desenvolvimento

Este é o documento principal de referência (fonte da verdade) para qualquer inteligência artificial ou desenvolvedor trabalhando no repositório **VOXA**.

---

## 📌 Visão Geral do Projeto

**VOXA** é uma plataforma de monetização onde fãs podem fazer perguntas pagas ou enviar apoio financeiro direto a criadores de conteúdo. O criador tem até 36 horas para responder (em texto ou áudio) às perguntas.

- **Stack Principal:** Next.js 14.1 (App Router), React 18, TypeScript, Tailwind CSS.
- **Backend & Auth:** Supabase (Auth via Google OAuth, PostgreSQL com Row Level Security, Storage para áudios).
- **Pagamentos:** Mercado Pago (Checkout Pro - PIX e Cartão de crédito).
- **Infra e Deploy:** Render.com (produção) com Webhooks HTTPS.

---

## 📂 Estrutura de Diretórios

```text
voxa/
├── CLAUDE.md                   # Este arquivo (Sempre leia antes de alterar a arquitetura)
├── README.md                   # Instruções de setup para desenvolvedores locais
├── database/                   # Schema e definições do Supabase
│   ├── schema.prisma           # Schema para facilitar visualização dos relacionamentos
│   └── supabase_setup.sql      # Script oficial completo (Tabelas, RLS, Functions, Triggers)
├── frontend/                   # Aplicação Web (Next.js)
│   ├── src/app/
│   │   ├── admin/              # Painel de administração da plataforma (protegido)
│   │   ├── api/                # Rotas de API (cron, webhooks de payment, refunds, questions)
│   │   ├── auth/               # Callback do Google OAuth
│   │   ├── dashboard/          # Painel do Criador (perguntas, milestones, configurações)
│   │   ├── perfil/[username]/  # Perfil público do criador (formulário de pagamento e feed)
│   │   ├── setup/              # Onboarding inicial do criador
│   │   └── vender/ & join/     # Landing pages e fluxos de marketing
│   └── src/lib/                # Regras de Negócio e Clientes
│       ├── supabase/           # Clientes Supabase SSR (client, server, admin)
│       ├── email.ts            # Integração Resend (envio de emails)
│       ├── milestones.ts       # Sistema de gamificação e marcos dos criadores
│       └── cropImage.ts        # Utilitário para corte de Avatar (react-easy-crop)
└── plans/                      # Histórico de planejamento de tarefas e checklists
```

---

## 🏗️ Modelagem de Dados (Supabase)

O banco de dados é gerido inteiramente no Supabase. O arquivo oficial é `database/supabase_setup.sql`.

### Entidades Principais
1. **`profiles`**: Dados dos criadores (username, bio, limites diários, avatar_url, taxas customizadas).
2. **`questions`**: Armazena as perguntas ou apoios.
   - `status`: `pending` (aguardando resposta), `answered` (respondida) ou `expired` (não respondida em 36h).
   - `is_support_only`: Se for `true`, indica apenas um "Apoio" (doação). Não exige resposta e o criador não perde limite de tempo. É persistido já como `answered`.
3. **`transactions`**: Registro do pagamento atrelado a uma pergunta e ID do Mercado Pago.
4. **`payment_intents`**: Tabela temporária para evitar perda de dados durante o redirecionamento do checkout MP.
5. **`daily_activity` & `creator_stats`**: Utilizadas para o cálculo dos *Milestones* (marcos de atividade, dias de "sold out", streaks de dias respondendo).

### Políticas de Segurança (RLS - Row Level Security)
- Perfis (`profiles`), feed de respostas públicas (`questions` com `is_shareable = true`, status `answered`) e estatísticas (`creator_stats`) são **públicos para leitura**.
- Criadores **só podem ler e atualizar seus próprios** dados, perguntas pendentes e transações.
- Rotas como Webhooks e Cron Jobs utilizam a `SUPABASE_SERVICE_ROLE_KEY` bypassando o RLS.

---

## 💳 Fluxos de Pagamento e Funcionalidades Core

### 1. Fluxo "Fazer Pergunta" (Garantia de Resposta)
1. Fã acessa `/perfil/[username]`.
2. O sistema faz validação atômica se o criador pode receber novas perguntas (RPC `can_accept_question` evita **race conditions** de limite diário).
3. Post via `/api/payment/create-preference` cria intenção de pagamento no banco (`payment_intents`) e Preference no Mercado Pago.
4. Fã é redirecionado, paga e o MP bate no Webhook `/api/payment/webhook`.
5. Webhook usando validação HMAC aprova, move os dados de `payment_intents` para `questions` (pending) e `transactions`. Se o limite do criador houver estourado no meio tempo, faz `Refund` imediato.

### 2. Fluxo "Apoio"
Mesmo fluxo acima, porém `is_support_only = true`. A pergunta cai no webhook, é salva  imediatamente como `answered`, e nunca exige resposta do criador.

### 3. Resposta e Compartilhamento
- O criador responde via Texto ou Áudio (gravado localmente via `MediaRecorder` com envio ao Supabase Storage no bucket `responses`).
- Compartilhamento no Instagram Stories via componente customizado que usa `html2canvas` renderizando as cores da plataforma (escala 3x HD).

---

## ⏱️ Cron Jobs (Rotinas Automáticas)

A aplicação conta com endpoints em `/api/cron/` para a infraestrutura de CRON (ex: pg_cron do Supabase ou Cron Vercel/Render):
- **`GET /api/cron/reset-daily`**: Reseta os limites diários de perguntas à meia-noite.
- **`GET /api/cron/expire-questions`**: Varre respostas `pending` há mais de 36 horas, marca como `expired` e envia para fila de `refund_queue`.
- **`GET /api/cron/cleanup-intents`**: Deleta carrinhos (payment_intents) velhos e não concluídos.

---

## 🎨 Sistema de Design e UI

- **Tailwind customizado**: Utiliza variáveis modernas em `globals.css` (ex: `--gradient-instagram`).
- Sem uso de bibliotecas de componentes externas pesadas além do essencial (Radix UI esporádico ou Lucide React para ícones).
- UX rica: Crop de imagem no setup (`react-easy-crop`), *skeleton loaders* para carregamentos otimistas e feedback instantâneo no formulário de pagamentos.

---

## 🛠️ Regras de Desenvolvimento e Padrões de Código

1. **App Router e Componentes Server/Client:**
   - Default para **Server Components** pre-fetching dados com `@supabase/ssr`.
   - Use `"use client"` estritamente na árvore visual ou onde há React Hooks/Estado (ex: Player de Áudio, MediaRecorder e Crop de Imagens).
2. **Cuidado com Env Vars:**
   - NUNCA exponha a `SUPABASE_SERVICE_ROLE_KEY` ou chaves privadas do Mercado Pago (`MP_WEBHOOK_SECRET`) no Client. Restrinja-os à pasta `api/`.
3. **Padrão de Retorno nas APIs:**
   - Centralize o instanciamento do banco na pasta `src/lib/supabase` (nunca recrie conectores globalmente na API de forma impura).
4. **Verificações de Segurança:**
   - Webhooks devem sempre validar a integridade da requisição (`x-signature` HMAC no Mercado Pago).
   - Ações de **Admin** no painel validam a flag `is_admin = true` da sessão ativa.

---

> **Antes de qualquer refatoração profunda:** Releia os scripts SQL em `database/supabase_setup.sql`. As regras de negócios pesadas (estatísticas, sold out, top supporters) estão desenhadas via Triggers e RPCs no banco de dados para extrema performance, evite reimplementar esses contadores no Server Next.js.
