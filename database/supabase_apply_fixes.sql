-- ============================================================
-- VOXA — Aplicação de Correções Críticas do Banco
-- Executar INTEIRO no SQL Editor do Supabase (uma transação)
-- Data: 2026-03-18
-- ============================================================

-- 1. ADICIONAR CAMPOS updated_at PARA AUDIT TRAIL
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. FUNÇÃO PARA ATUALIZAR TIMESTAMPS AUTOMATICAMENTE
-- ============================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGERS PARA ATUALIZAR updated_at
-- ============================================================

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 4. CONSTRAINTS DE NEGÓCIO
-- ============================================================

-- Username: formato válido [a-z0-9_-], mínimo 3 caracteres
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS username_format
  CHECK (LENGTH(username) >= 3 AND username ~ '^[a-z0-9_-]+$');

-- Min price: nunca menor que R$ 1.00
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS min_price_positive
  CHECK (min_price >= 1.00);

-- Daily limit: entre 1 e 100 questões
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS daily_limit_range
  CHECK (daily_limit BETWEEN 1 AND 100);

-- Price paid: sempre positivo
ALTER TABLE questions ADD CONSTRAINT IF NOT EXISTS price_paid_positive
  CHECK (price_paid > 0);

-- 5. FUNÇÃO PARA CLEANUP DE PAYMENT INTENTS EXPIRADAS
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_stale_payment_intents()
RETURNS void AS $$
BEGIN
  DELETE FROM payment_intents
  WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CRIAR/HABILITAR EXTENSÃO pg_cron
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 7. AGENDAR CRON JOBS
-- ============================================================

-- Reset diário de contadores às 03:00 UTC (meia-noite BRT)
SELECT cron.schedule('reset-daily-counts', '0 3 * * *',
  $$SELECT reset_daily_question_counts()$$)
ON CONFLICT (jobname) DO UPDATE SET schedule = '0 3 * * *';

-- Expiração de perguntas a cada 30 minutos
SELECT cron.schedule('expire-questions', '*/30 * * * *',
  $$SELECT expire_pending_questions()$$)
ON CONFLICT (jobname) DO UPDATE SET schedule = '*/30 * * * *';

-- Limpeza de payment intents expiradas diariamente às 01:00 UTC (10 PM BRT anterior)
SELECT cron.schedule('cleanup-payment-intents', '0 1 * * *',
  $$SELECT cleanup_stale_payment_intents()$$)
ON CONFLICT (jobname) DO UPDATE SET schedule = '0 1 * * *';

-- ============================================================
-- VALIDAÇÃO
-- ============================================================

-- Verificar que todos os jobs foram criados:
-- SELECT jobid, jobname, schedule FROM cron.job ORDER BY jobid;
-- Resultado esperado: 3 jobs (reset-daily-counts, expire-questions, cleanup-payment-intents)

-- ============================================================
-- FIM DAS MUDANÇAS
-- ============================================================
