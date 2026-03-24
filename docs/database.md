# Documentação do Banco de Dados - VOXA

## Fonte da Verdade

Toda lógica central e restrições de integridade habitam estritamente o **Supabase Database** (PostgreSQL Serverless) e não o servidor web.
O diretório `database/` possui o arquivo supremo `supabase_setup.sql` que orquestra todas as tabelas, RLS, Enum, Triggers e funções RPC em um único script que deve ser adotado como referência primordial para mudanças de schema.

## Estruturas de Tabelas Centrais

1. **`profiles`**: Mantém a tabela mestre de usuários; define `is_admin`, limites de caixa por dia/semana, configuração de preços, custom link (`/perfil/username`) e afins.
2. **`questions`**: Entidade principal de interações. Possui _status_ rígidos restritos (`pending`, `answered`, `expired`). Triggers no banco ativamente bloqueiam edições ou contaminações de estado inapropriadas.
3. **`payment_intents` e `transactions`**: Mantém de forma resiliente as chaves de idempotência exigidas na reconciliação e validação de Webhooks do Mercado Pago, prevenindo estornos falhos ou aprovações duplicadas.
4. **`creator_stats` e Views**: Mantidas estritamente via TRIGGERS a nível de servidor SQL para propiciar uma performance impecável. O Next.js não gasta tempo somando arrays pesados e lendo contadores, pois utiliza visões indexadas e contagens pré-atualizadas para os Milestones e Painéis Analíticos.

## RLS (Row Level Security - Segurança Absoluta)
- **Criadores:** Possuem direitos apenas de leitura total a tudo indexado com o seu próprio ID numérico ou referencial.
- **Administrador:** Ninguém além de contas contendo o _bit_ `is_admin = TRUE` tanto no Postgres quanto verificado no layout/Middlewares tem autorização de acesso a informações e painéis de roteamento `/admin`.
- **Worker (Webhooks/Cron):** Endpoints responsáveis por processadores assíncronos contam com bypass das políticas usuais via injeção segura de chamadas de cliente usando a `service_role_key`. Portanto, modificações no schema exigem a compatibilidade estrita dessas policies.
