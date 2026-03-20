# VOXA 🎙️

**VOXA** é uma plataforma de monetização para criadores de conteúdo (influencers) no mercado brasileiro. A plataforma permite que os fãs paguem para enviar perguntas ou mensagens de apoio (suporte) aos criadores, com garantia de resposta (em texto ou áudio) em até 36 horas para as perguntas. A plataforma cobra uma taxa sobre cada transação.

![Status](https://img.shields.io/badge/Status-Beta-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.1-black)
![React](https://img.shields.io/badge/React-18-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e)

## 🚀 Funcionalidades

- **Autenticação:** Login social via Google OAuth (Supabase Auth).
- **Perfis Customizáveis:** Bio, avatar, preço mínimo por resposta, limites diários e link customizado (`/perfil/username`).
- **Painel do Criador:** Gerenciamento de perguntas pendentes, métricas de ganhos, hitórico paginado e barra de progresso de marcos (milestones).
- **Respostas:** Suporte a respostas em texto ou áudio (via MediaRecorder e Supabase Storage).
- **Modo Apoio:** Fãs podem enviar pagamentos de contribuição sem exigir uma resposta rápida ("Apenas Apoiar").
- **Integração de Pagamentos:** Mercado Pago (Checkout Pro - PIX e Cartão de Crédito) com Webhooks verificados por assinaturas HMAC.
- **Reembolsos Automáticos:** Caso o limite diário seja alcançado durante concorrência de pagamentos.
- **Compartilhamento Social:** Geração de imagens otimizadas para Stories do Instagram (via html2canvas).
- **Painel Admin:** Gerenciamento de criadores (banimentos, taxas customizadas), gerenciamento da taxa global de uso e controle de prazos.

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 14.1 (App Router), React 18, TypeScript 5.
- **Estilização:** Tailwind CSS 3.3 com tema customizado (dark-first, gradientes baseados no Instagram) e Lucide React (Ícones).
- **Backend, Banco de Dados & Storage:** Supabase (Auth, PostgreSQL RLS, Storage de Áudios).
- **Pagamentos:** Checkout do Mercado Pago.
- **Hospedagem / Deploy:** Render.com.

## 📦 Estrutura do Projeto

```text
voxa/
├── CLAUDE.md                   # Guia detalhado de arquitetura e funcionamento interno
├── README.md                   # Este arquivo (guia de setup)
├── frontend/                   # Aplicação Next.js (Interface e rotas Server-Side)
│   ├── src/app/                # Rotas App Router (páginas, APIs de webhook, admin)
│   ├── src/lib/                # Utilitários (Supabase clients, MercadoPago)
│   ├── public/                 # Assets (imagens, favicon, etc)
│   └── package.json            # Dependências gerenciadas pelo NPM
├── database/                   # Definições do banco de dados (tabelas, policies, functions)
│   ├── schema.prisma           # Schema auxiliar para visibilidade (referência)
│   └── supabase_setup.sql      # Script completo para setup no Supabase
└── plans/                      # Documentação de rastreio de tarefas do projeto
```

## 🏗️ Pré-requisitos

Para rodar o projeto localmente, tenha na sua máquina:

- Node.js `18.x` ou versão superior
- NPM
- Uma conta no [Supabase](https://supabase.com/)
- Conta de vendedor/desenvolvedor no [Mercado Pago](https://www.mercadopago.com.br/developers)

## ⚙️ Instalação e Configuração Local

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/voxa.git
cd voxa
```

### 2. Instalar dependências Frontend
```bash
cd frontend
npm install
```

### 3. Configuração do Supabase
1. Crie um novo projeto no Supabase.
2. Acesse a seção **SQL Editor** do projeto e execute o conteúdo de `database/supabase_setup.sql` para criar todo o banco. Isto iniciará seu esquema, Storage (bucket de audios) e suas RLS Policies.
3. Não esqueça de verificar a existência de `increment_answered_today` para incrementar estatísticas.
4. Vá em **Authentication > Providers** e ative o provider **Google** com seu Client ID e Secret.
5. Adicione sua URL em *Authentication > URL Configuration > Redirect URLs* (ex: `http://localhost:3000/auth/callback`).

### 4. Variáveis de Ambiente
Crie um arquivo `.env.local` na pasta `frontend/`, copiando as informações de `.env.example`:

```bash
cp .env.example .env.local
```

Complete as variáveis obrigatórias:

```env
# Banco de Dados Supabase (obtenha nas settings > API do seu projeto Supabase)
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# Mercado Pago (obtenha na seção "Suas integrações" no portal devs MP)
MP_ACCESS_TOKEN=TEST-xxxxxxxx # Recomendado focar no accessToken de Teste inicialmente
MP_WEBHOOK_SECRET=sua_secret_de_webhook
NEXT_PUBLIC_MP_PUBLIC_KEY=sua_public_key

# Aplicação Base
NEXT_PUBLIC_APP_URL=http://localhost:3000
REFUND_SECRET=texto_seguro_arbitrario_exemplo
FEATURE_REFUNDS_ENABLED=false
```

### 5. Webhooks Locais do Mercado Pago
Para simular transações pagas com o Mercado Pago na sua máquina, exponha sua porta local usando o `ngrok`:

```bash
# Terminal 1: Iniciar Next.js
npm run dev

# Terminal 2: Ngrok
ngrok http 3000
```
Pegue a URL pública fornecida pelo `ngrok` (ex `https://1a2b-3c.ngrok-free.app`), vá ao painel de Webhooks do Mercado Pago, configure para disparar no path `/api/payment/webhook` para eventos de **pagamentos**.

### 6. Executando o Projeto
Execute o servidor:
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) em seu navegador.

## 📌 Documentação Aprofundada

Por favor, para fluxos complexos, verifique o arquivo **[`CLAUDE.md`](./CLAUDE.md)** antes de realizar alterações core, lá você encontrará descrições de:
- Modo Pagamento vs Modo Apoio e seus webhooks.
- Fluxo detalhado do painel Admin.
- Arquitetura oficial de banco e observações sobre uso de funções Cron Jobs.

## 📝 Licença

Desenvolvido para uso comercial. Copyright (c) 2026 VOXA. Todos os direitos reservados.
