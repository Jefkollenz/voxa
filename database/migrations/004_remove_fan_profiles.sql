-- Migration 004: Remove fan_profiles infrastructure
-- Fãs não precisam de conta — notificações via sender_email apenas.
-- Manter: coluna sender_email + índice idx_questions_sender_email (usados para email de resposta)

-- 1. Remover RLS policy de fã na tabela questions (ANTES de dropar a coluna fan_id)
DROP POLICY IF EXISTS "Fã vê suas perguntas" ON questions;

-- 2. Remover coluna fan_id da tabela questions (e seu índice)
DROP INDEX IF EXISTS idx_questions_fan_id;
ALTER TABLE questions DROP COLUMN IF EXISTS fan_id;

-- 3. Remover função de vinculação de perguntas por email
DROP FUNCTION IF EXISTS link_fan_questions(UUID, TEXT);

-- 4. Remover tabela fan_profiles e suas policies
DROP POLICY IF EXISTS "Fã lê próprio perfil" ON fan_profiles;
DROP POLICY IF EXISTS "Fã insere próprio perfil" ON fan_profiles;
DROP POLICY IF EXISTS "Fã atualiza próprio perfil" ON fan_profiles;
DROP TABLE IF EXISTS fan_profiles;
