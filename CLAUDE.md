# VOXA — Guia de Arquitetura e Desenvolvimento

Este é o documento principal de referência (fonte da verdade) para qualquer inteligência artificial ou desenvolvedor trabalhando no repositório **VOXA**.

---

## 📌 Visão Geral do Projeto

**VOXA** é uma plataforma de monetização onde fãs podem fazer perguntas pagas ou enviar apoio financeiro direto a criadores de conteúdo. O criador tem até 36 horas para responder (via texto, áudio ou vídeo) — ou uma fila automática efetua o reembolso.

A plataforma adota um **design UI/UX mobile-first brutal**, com forte contraste em interfaces de criadores, gamificação robusta e componentes polidos baseados em utilitários CSS e Tailwind. 
A arquitetura contempla uma Aplicação Web unificada servindo tanto navegadores de desktop quanto um **Wrapper Mobile (React Native / Expo)** para distribuição via lojas Android e iOS.

- **Stack Web:** Next.js 14.1 (App Router), React 18, TypeScript, Tailwind CSS.
- **Stack Mobile:** Expo, React Native WebView, EAS CLI para gestão da build na nuvem (`.apk` / `.ipa`).
- **Backend & Auth:** Supabase (Auth via Google OAuth, PostgreSQL Serverless, Storage, Edge Functions suportadas).
- **Pagamentos:** Checkout Transparente via Mercado Pago (PIX/Cartão).

---

## 📂 Estrutura Macro do Repositório

```text
voxa/
├── CLAUDE.md                   # Este arquivo (Guia arquitetônico obrigatório)
├── README.md                   # Instruções de setup
├── database/                   # Schema Supremo do banco
│   └── supabase_setup.sql      # Todas TBLs, RLS, Enum, Triggers e RPCs num só lugar.
├── frontend/                   # Monorepo da Aplicação Next.js (Visual server)
│   ├── src/app/
│   │   ├── admin/              # Controle Mestre (gestão de creators, infrações, % taxa plataforma logada)
│   │   ├── api/                # Endpoints core (webhooks, CRON jobs serverless)
│   │   ├── dashboard/          # Hub do Criador (gestão visual, financeiro, configs)
│   │   └── perfil/[username]/  # Ponto de venda: Perfil Dark Theme escuro para checkout focado
│   └── src/components/         # BottomNav nativa, Menus, Formulários isolados.
└── mobile/                     # App Native Container (Expo)
    ├── App.tsx                 # Core WebView consumindo a renderização do frontend Next.js logado.
    └── app.json/eas.json       # Headers de metadados das distribuições Play Store/App Store.
```

---

## 🏗️ Modelagem de Dados e Controle (RLS do Supabase)

Toda lógica central não habita o Servidor Web, habita O Supabase.
O `supabase_setup.sql` orquestra:
1. **`profiles`**: Define `is_admin`, limites de caixa, links.
2. **`questions`**: Status rígidos (`pending`, `answered`, `expired`). Triggers bloqueiam edições inapropriadas.
3. **`payment_intents` e `transactions`**: Garante as chaves de idempotência na reconciliação de Webhooks do Mercado Pago.
4. **`creator_stats` e Views**: Mantidas via TRIGGERS para performance perfeita (Onde Next.js apenas coleta o "Count" pronto para os Milestones).

**RLS (Segurança Absoluta):** Criadores leem tudo de seus IDs. Ninguém acessa painéis de `/admin` sem o bit `is_admin = TRUE` tanto no Postgres quanto no layout Header React. Scripts Cron processadores contam com bypass via `service_role_key`.

---

## 💳 Fluxos Core da Plataforma

### 1. Pagamentos / Webhook Handshake
O frontend NUNCA aprova o pagamento sozinho.
- Rota `/api/payment/create-preference` reserva a pergunta em `payment_intents` + Gera link.
- Mercado Pago bate no Webhook e nós calculamos o `X-Signature` HMAC SHA256 com timestamp. Se válido, insere o extrato `transactions` e move do intent pra fila `questions`.
- **Prevenção de Overselling:** Ao ingressar, o webhook checa limites novamente; se "lotado", emite Extorno imediato automático (Refund API) via API MercadoPago.

### 2. Estornos Manuais e Tempo Expirado:
O arquivo `app/api/cron/expire-questions` é despertado periodicamente (render/cron job):
- Filtra `status = 'pending'` que cruzaram 36h criadas.
- Muda para `expired`.
- Executa chamadas à API MP "Refund" pra repor o dono do dinheiro.

---

## 📱 Integração UX Mobile e App Nativo

- O Frontend Web não usa "Sidebars" obsoletas. Ele renderiza a interface emulando App Nativo via **Bottom Navigation (`<BottomNav />`)** quando visualizado em mobile. O Padding inferior na estrutura evita *Safe Areas* do iOS estraguem botões.
- A pasta `mobile/` compila isso isoladamente sem a barra de endereços do Chrome, criando o APK de consumo ideal para testadores Beta.

---

## 🛠️ Três Regras de Desenvolvimento Interno:

1. **Nunca duplique regras do banco no Frontend:** Se os dados envolvem matemática de top supporters ou métricas, construa via RPC Function no Supabase. O Next.js *só consulta*, nunca recalcula todos arrays da base.
2. **Contraste no Dark Mode:** O app foi arquitetado para um "Modo Venda Escuro / Premium". Cuidado com CSS (ex: Form Fields do painel do perfil). Usar variáveis como `bg-gradient-instagram` nos botões de conversão e não chaves Hardcoded (tudo em globals.css usa CSS Vars!).
3. **Mantenha os Assets no Local Correto:** O upload de avatares vai ao bucket de "avatars", áudios ao "responses". As policies do Bucket restringem exclusões ao próprio criador.
