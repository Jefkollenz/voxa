# Documentação de Arquitetura - VOXA

## Visão Geral

A arquitetura contempla uma Aplicação Web unificada servindo tanto navegadores de desktop quanto um **Wrapper Mobile (React Native / Expo)** para distribuição via lojas Android e iOS.

O design da aplicação possui um foco rigoroso em uma **UI/UX mobile-first brutal**, com forte contraste para interfaces de criadores, utilizando _dark mode_ premium.

## Stack Tecnológico Principal

### Stack Web
- Next.js 14.1 (App Router)
- React 18, TypeScript, Tailwind CSS

### Stack Mobile
- Expo, React Native WebView
- EAS CLI para gestão da build na nuvem (`.apk` / `.ipa`).

### Backend e Infra
- Supabase (Autenticação Google OAuth, PostgreSQL Serverless, Storage, Edge Functions)
- Render.com para a hospedagem do Web e Crons
- Mercado Pago para checkout transparente via PIX/Cartão.

## Integração UX Mobile e App Nativo

- O Frontend Web não usa "Sidebars" obsoletas. Ele renderiza a interface emulando App Nativo via **Bottom Navigation (`<BottomNav />`)** quando visualizado em resolução mobile.
- O Padding inferior na estrutura evita que as _Safe Areas_ do iOS estraguem o acesso aos botões.
- A pasta `mobile/` compila o frontend web isoladamente usando `react-native-webview` sem a barra de endereços do navegador (Chrome/Safari), criando o container executável ideal.

## Três Regras de Desenvolvimento Interno

1. **Nunca duplique regras do banco no Frontend:** Se os dados envolvem matemática de top supporters ou métricas, construa via RPC Function no Supabase. O Next.js _só consulta e plota dados_, nunca recalcula todos arrays da base do zero, dependendo sempre das Views ou RPCs no banco de dados.
2. **Contraste no Dark Mode:** O app foi arquitetado para um "Modo Venda Escuro / Premium". Cuidado dobrado com CSS (ex: Form Fields do painel do perfil). Usar variáveis semânticas como `bg-gradient-instagram` nos botões de conversão (tudo em globals.css usa CSS Vars). Jamais aplique hex colors *hardcoded* que quebrem o padrão de design _dark_.
3. **Mantenha os Assets no Local Correto:** O upload de avatares vai ao bucket público de `avatars`, áudios/assets vão ao `responses`. As policies (RLS) associadas aos Buckets restringem exclusões estritas ao próprio dono dos arquivos.
