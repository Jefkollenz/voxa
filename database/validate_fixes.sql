-- ============================================================
-- VOXA — Validação das Correções Aplicadas
-- Executar no SQL Editor do Supabase após aplicar supabase_apply_fixes.sql
-- ============================================================

-- ============================================================
-- 1. VALIDAR CAMPOS updated_at
-- ============================================================
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('profiles', 'questions', 'transactions')
  AND column_name = 'updated_at'
ORDER BY table_name;

-- Resultado esperado: 3 linhas
-- ✅ profiles | updated_at | timestamp with time zone | YES
-- ✅ questions | updated_at | timestamp with time zone | YES
-- ✅ transactions | updated_at | timestamp with time zone | YES

-- ============================================================
-- 2. VALIDAR TRIGGERS
-- ============================================================
SELECT
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_%updated_at'
ORDER BY trigger_name;

-- Resultado esperado: 3 triggers
-- ✅ trg_profiles_updated_at | profiles | UPDATE | BEFORE
-- ✅ trg_questions_updated_at | questions | UPDATE | BEFORE
-- ✅ trg_transactions_updated_at | transactions | UPDATE | BEFORE

-- ============================================================
-- 3. VALIDAR CONSTRAINTS
-- ============================================================
SELECT
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('profiles', 'questions', 'transactions')
  AND constraint_type = 'CHECK'
ORDER BY table_name, constraint_name;

-- Resultado esperado: 4 constraints
-- ✅ profiles | daily_limit_range | CHECK
-- ✅ profiles | min_price_positive | CHECK
-- ✅ profiles | username_format | CHECK
-- ✅ questions | price_paid_positive | CHECK

-- ============================================================
-- 4. VALIDAR CRON JOBS (MAIS IMPORTANTE!)
-- ============================================================
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
ORDER BY jobid;

-- Resultado esperado: 3 jobs ativos
-- ✅ jobid=X | reset-daily-counts | 0 3 * * * | SELECT reset_daily_question_counts() | true
-- ✅ jobid=Y | expire-questions | */30 * * * * | SELECT expire_pending_questions() | true
-- ✅ jobid=Z | cleanup-payment-intents | 0 1 * * * | SELECT cleanup_stale_payment_intents() | true

-- ============================================================
-- 5. VERIFICAR FUNÇÃO cleanup_stale_payment_intents
-- ============================================================
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'cleanup_stale_payment_intents'
  AND routine_schema = 'public';

-- Resultado esperado: 1 função
-- ✅ cleanup_stale_payment_intents | FUNCTION | void

-- ============================================================
-- 6. TESTAR TRIGGERS (OPCIONAL)
-- ============================================================
-- Descomente para testar se updated_at é atualizado automaticamente:

/*
-- Criar um perfil de teste
INSERT INTO profiles (id, username, bio)
VALUES ('test-uuid-123', 'testuser123', 'Test bio')
ON CONFLICT DO NOTHING;

-- Aguardar 1 segundo
SELECT pg_sleep(1);

-- Atualizar e verificar que updated_at mudou
UPDATE profiles SET bio = 'Updated bio' WHERE username = 'testuser123';

-- Verificar que updated_at foi atualizado
SELECT username, created_at, updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at))::INT as seconds_diff
FROM profiles WHERE username = 'testuser123';

-- Resultado esperado:
-- ✅ testuser123 | 2026-03-18 14:30:00 | 2026-03-18 14:30:01 | 1 (ou poucos segundos)

-- Limpar teste
DELETE FROM profiles WHERE username = 'testuser123';
*/

-- ============================================================
-- 7. TESTAR CONSTRAINTS (OPCIONAL)
-- ============================================================
-- Descomente para testar se constraints funcionam:

/*
-- Teste 1: Username muito curto (deve falhar com erro)
BEGIN;
  INSERT INTO profiles (id, username)
  VALUES (gen_random_uuid(), 'ab');
ROLLBACK;
-- ❌ Erro esperado: new row for relation "profiles" violates check constraint "username_format"

-- Teste 2: Preço menor que R$ 1 (deve falhar)
BEGIN;
  INSERT INTO profiles (id, username, min_price)
  VALUES (gen_random_uuid(), 'validuser', 0.50);
ROLLBACK;
-- ❌ Erro esperado: new row for relation "profiles" violates check constraint "min_price_positive"

-- Teste 3: Daily limit fora do range (deve falhar)
BEGIN;
  INSERT INTO profiles (id, username, daily_limit)
  VALUES (gen_random_uuid(), 'validuser', 150);
ROLLBACK;
-- ❌ Erro esperado: new row for relation "profiles" violates check constraint "daily_limit_range"

-- Teste 4: Price paid negativo (deve falhar)
BEGIN;
  INSERT INTO questions (id, creator_id, content, sender_name, price_paid)
  VALUES (gen_random_uuid(), 'creator-uuid', 'test', 'Test User', -5.00);
ROLLBACK;
-- ❌ Erro esperado: new row for relation "questions" violates check constraint "price_paid_positive"
*/

-- ============================================================
-- RESUMO: Se todos os SELECTs acima retornarem os resultados
-- esperados, as correções foram aplicadas com sucesso! ✅
-- ============================================================
