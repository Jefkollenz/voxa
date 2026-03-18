-- ============================================================
-- Migration 003: Fan Profiles + sender_email/fan_id em questions
-- Rodar no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de perfis de fãs (separada de profiles/criadores)
CREATE TABLE IF NOT EXISTS fan_profiles (
    id UUID PRIMARY KEY,  -- mesmo UUID do auth.users
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE fan_profiles ENABLE ROW LEVEL SECURITY;

-- Fan pode ler próprio perfil
CREATE POLICY "Fã lê próprio perfil"
ON fan_profiles FOR SELECT
USING (auth.uid() = id);

-- Fan pode inserir próprio perfil
CREATE POLICY "Fã insere próprio perfil"
ON fan_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Fan pode atualizar próprio perfil
CREATE POLICY "Fã atualiza próprio perfil"
ON fan_profiles FOR UPDATE
USING (auth.uid() = id);

-- 2. Novas colunas em questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS fan_id UUID REFERENCES fan_profiles(id) ON DELETE SET NULL;

-- Índice para buscar perguntas por fan_id
CREATE INDEX IF NOT EXISTS idx_questions_fan_id ON questions(fan_id, created_at DESC);

-- Índice para buscar perguntas por sender_email (vinculação retroativa)
CREATE INDEX IF NOT EXISTS idx_questions_sender_email ON questions(sender_email);

-- 3. RLS: Fã pode ver suas próprias perguntas
CREATE POLICY "Fã vê suas perguntas"
ON questions FOR SELECT
USING (fan_id = auth.uid());

-- ============================================================
-- Função: vincular perguntas antigas ao fan_id pelo email
-- Chamada uma vez quando o fã faz login pela primeira vez
-- ============================================================
CREATE OR REPLACE FUNCTION link_fan_questions(p_fan_id UUID, p_email TEXT)
RETURNS void AS $$
BEGIN
    UPDATE questions
    SET fan_id = p_fan_id
    WHERE sender_email = p_email
      AND fan_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
