-- ============================================================
-- Migration 001: Sistema de Papéis e Convites
-- Adiciona account_type, creator_setup_completed, sender_id
-- e tabela invite_links para o sistema de papéis fã/influencer/admin
-- ============================================================

-- 1. Novo campo account_type em profiles (default 'fan' para novos cadastros)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'fan'
  CHECK (account_type IN ('fan', 'influencer', 'admin'));

-- 2. Novo campo creator_setup_completed em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_setup_completed BOOLEAN DEFAULT FALSE;

-- 3. Novo campo sender_id em questions (referência ao fã que enviou)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES profiles(id);

-- 4. Migrar dados existentes:
--    - Admins mantêm account_type = 'admin'
--    - Todos os perfis existentes (criadores atuais) viram 'influencer'
--    - Todos já completaram o setup de criador
UPDATE profiles SET account_type = 'admin' WHERE is_admin = TRUE;
UPDATE profiles SET account_type = 'influencer' WHERE is_admin = FALSE AND account_type = 'fan';
UPDATE profiles SET creator_setup_completed = TRUE WHERE creator_setup_completed = FALSE;

-- 5. Tabela invite_links para convites de influencer
CREATE TABLE IF NOT EXISTS invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS para invite_links
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Admins podem fazer tudo com convites
CREATE POLICY "Admins gerenciam convites" ON invite_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_type = 'admin')
  );

-- Qualquer usuário autenticado pode ler convites (para validar na página /invite/[code])
CREATE POLICY "Usuários leem convites" ON invite_links
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Usuário pode marcar convite como usado (UPDATE used_by)
CREATE POLICY "Usuário usa convite" ON invite_links
  FOR UPDATE USING (used_by IS NULL)
  WITH CHECK (auth.uid() = used_by);

-- 7. RLS: fã pode ver suas próprias perguntas enviadas via sender_id
CREATE POLICY "Fã vê suas perguntas enviadas" ON questions
  FOR SELECT USING (sender_id = auth.uid());

-- 8. Trigger: impedir que usuário altere account_type/is_admin via client (só service_role)
CREATE OR REPLACE FUNCTION protect_profile_admin_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role', true) != 'service_role' THEN
    IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
      RAISE EXCEPTION 'Não é permitido alterar account_type diretamente';
    END IF;
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      RAISE EXCEPTION 'Não é permitido alterar is_admin diretamente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_profile_admin_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_admin_fields();

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_questions_sender_id ON questions(sender_id);
CREATE INDEX IF NOT EXISTS idx_invite_links_code ON invite_links(code);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);

-- 9. Atualizar RPC get_top_supporters para agrupar por sender_id (com fallback para sender_email)
CREATE OR REPLACE FUNCTION get_top_supporters(p_creator_id UUID)
RETURNS TABLE (display_name TEXT, is_anonymous BOOLEAN, total_paid DECIMAL, email_hash TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (array_agg(sub.sender_name ORDER BY sub.created_at DESC))[1]::TEXT AS display_name,
    bool_or(sub.is_anonymous) AS is_anonymous,
    SUM(sub.price_paid)::DECIMAL AS total_paid,
    (array_agg(sub.email_hash))[1]::TEXT AS email_hash
  FROM (
    SELECT
      q.sender_name,
      q.is_anonymous,
      q.price_paid,
      q.created_at,
      COALESCE(q.sender_id::TEXT, LOWER(TRIM(q.sender_email))) AS group_key,
      COALESCE(
        (SELECT md5(LOWER(TRIM(au.email))) FROM auth.users au WHERE au.id = q.sender_id),
        md5(LOWER(TRIM(q.sender_email)))
      ) AS email_hash
    FROM questions q
    WHERE q.creator_id = p_creator_id
      AND q.status IN ('pending', 'answered')
      AND q.created_at >= date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')
      AND (q.sender_id IS NOT NULL OR q.sender_email IS NOT NULL)
  ) sub
  GROUP BY sub.group_key
  ORDER BY total_paid DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
