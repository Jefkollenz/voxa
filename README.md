# VOXA 🎙️

**VOXA** é uma plataforma de monetização para criadores de conteúdo (influencers) no mercado brasileiro. A plataforma permite que os fãs paguem para enviar perguntas ou mensagens de apoio aos criadores, com garantia de resposta em texto, áudio ou vídeo em até 36 horas. A plataforma atua tanto na Web quanto via Aplicativo Mobile.

![Status](https://img.shields.io/badge/Status-Produção_&_Beta_Mobile-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.1-black)
![React Native](https://img.shields.io/badge/React_Native-Expo-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e)

## 🚀 Funcionalidades

- **Autenticação:** Login social via Google OAuth (Supabase Auth).
- **Perfis Premium:** Dark mode exclusivo, bio, avatar, preço mínimo por resposta, limites diários e link customizado (`/perfil/username`).
- **Dashboard do Criador:** Gerenciamento de perguntas, métricas financeiras detalhadas, histórico paginado e gamificação (marcos/milestones, sequências).
- **Múltiplos Formatos:** Respostas via texto, áudio (via MediaRecorder e Supabase Storage) ou upload de vídeos curtos.
- **Modo Apoio:** Fãs podem enviar pagamentos de contribuição sem exigir resposta do criador.
- **Aplicativo Mobile:** Versão nativa (Android/iOS) embrulhada em React Native WebView para acesso otimizado.
- **Integração de Pagamentos:** Mercado Pago (PIX e Cartão de Crédito) com Webhooks verificados por assinaturas HMAC.
- **Reembolsos Automáticos:** Acionados por Cron Jobs caso o prazo de 36h vença sem resposta do criador.
- **Painel Admin:** Gerenciamento centralizado de usuários, configuração de taxas da plataforma nativas do Supabase, gestão de bugs e painel de análise.

## 🛠️ Stack Tecnológico

- **Frontend Web:** Next.js 14.1 (App Router), React 18, TypeScript, Tailwind CSS (Design Mobile-First).
- **Frontend Mobile:** React Native com Expo, utilizando react-native-webview. Builds cloud gerenciadas pelo EAS (Expo Application Services).
- **Backend & BD:** Supabase (Auth, PostgreSQL com RLS Meticuloso, Storage e Cron Jobs).
- **Pagamentos:** Checkout do Mercado Pago.
- **Hospedagem / Deploy:** Render.com (Web) e EAS (Mobile APK/IPA).

## 📦 Estrutura do Projeto

```text
voxa/
├── CLAUDE.md                   # Guia detalhado de arquitetura (Leitura Obrigatória)
├── README.md                   # Este arquivo (Visão geral e setup)
├── frontend/                   # Aplicação Next.js Core (Interface e lógicas de servidor)
│   ├── src/app/                # Rotas App Router (dash, admin, setup, webhooks)
│   ├── src/lib/                # Utilitários (Supabase clients, MercadoPago)
│   ├── src/components/         # Componentes React reutilizáveis
│   └── public/                 # Assets (imagens, favicon, etc)
├── mobile/                     # Aplicativo Expo React Native (Wrapper WebView)
│   ├── App.tsx                 # Entrada principal contendo o WebView apontando para o app web
│   ├── app.json & eas.json     # Configurações de Build para lojas Android/iOS
│   └── assets/                 # Ícones nativos e splash screens
├── database/                   # Definições do banco de dados (BD Fonte de Verdade)
│   ├── schema.prisma           # Prisma Schema apenas visual (referencial)
│   └── supabase_setup.sql      # Script completo executável no Supabase SQL Editor
└── plans/                      # Histórico de planejamento de tarefas
```

## 🏗️ Pré-requisitos (Desenvolvimento Local)

- Node.js `18.x` ou versão superior
- Uma conta no [Supabase](https://supabase.com/) e cli (opcional)
- Conta no [Mercado Pago Developer](https://www.mercadopago.com.br/developers)
- Conta [Expo](https://expo.dev) e EAS CLI instalado (`npm i -g eas-cli`) para lidar com builds Mobile.

## ⚙️ Instalação e Configuração

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/voxa.git
cd voxa
```

### 2. Frontend Web
```bash
cd frontend
npm install
```
Configure as variáveis em `frontend/.env.local` usando seu Supabase e Mercado Pago (veja `.env.example`).
Inicie a web com: `npm run dev`

### 3. Aplicativo Mobile
```bash
cd mobile
npm install
```
Inicie no simulador: `npx expo start`
*(Nota: O mobile busca a versão em produção do app `askvoxa.com` por padrão. Para testar o app nativo no localhost, altere o endpoint no App.tsx temporariamente, mas retorne antes do commit.)*

### 4. Setup do Banco
Execute o `database/supabase_setup.sql` no painel SQL do Supabase. Certifique-se de ativar o Provider Google Autenticador.

## 📌 Documentação Aprofundada
Sempre consulte o arquivo **[`CLAUDE.md`](./CLAUDE.md)** antes de realizar alterações core visando manter a estrutura e arquitetura originais intactas.

## 📝 Licença
Desenvolvido para uso comercial. Copyright (c) 2026 VOXA. Todos os direitos reservados.
