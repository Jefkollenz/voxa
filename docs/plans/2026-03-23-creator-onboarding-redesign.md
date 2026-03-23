# Creator Onboarding Redesign — Design Document

**Data:** 2026-03-23
**Status:** Aprovado para implementação

---

## Resumo

Redesign do fluxo de cadastro de criador na VOXA. Substitui o modelo fechado por convite por um modelo híbrido: cadastro aberto com aprovação do admin. Inclui wizard de 3 steps, aceite de termos, cadastro de nicho e link de rede social obrigatório.

---

## Fluxo completo

```
1. Google OAuth (/login)
2. /setup → username + avatar (sem mudanças)
3. Dashboard de fan → botão "Quero ser criador"
4. /setup/creator (wizard 3 steps):
   Step 1: Bio + Nicho (1-3) + Preço + Limite
   Step 2: Link da rede social
   Step 3: Aceitar termos → "Enviar para análise"
5. Dashboard mostra banner "Perfil em análise"
6. Admin aprova → perfil live
7. Primeiro saque → pede documento + PIX (futuro)
```

---

## Wizard: 3 Steps

### Step 1 — Perfil do criador
- **Bio** (textarea, max 200 chars)
- **Nicho** (multi-select chips, 1-3 obrigatório)
  - Categorias: Fitness, Finanças, Tecnologia, Beleza, Música, Games, Educação, Humor, Lifestyle, Saúde, Negócios, Culinária, Moda, Outros
- **Preço mínimo** (slider R$5–R$100)
- **Limite diário** (slider 1–50)
- **Estimativa mensal** (card calculado)

### Step 2 — Rede social
- **Link principal** (input URL, obrigatório)
  - Validação: deve começar com `https://`
  - Aceita Instagram, TikTok, YouTube, Twitter/X
- Texto: "Usamos para confirmar que você é quem diz ser."

### Step 3 — Termos de uso
- Texto scrollável com resumo dos pontos-chave
- **Checkbox obrigatório**: "Li e aceito os Termos de Uso e Política de Privacidade da VOXA"
- Botão final: **"Enviar para análise"**

Navegação: botões "Voltar" e "Próximo" em cada step.

---

## Modelo de dados

### Novas colunas em `profiles`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `social_link` | TEXT | Link do Instagram/TikTok/YouTube |
| `accepted_terms_at` | TIMESTAMPTZ | Quando aceitou os termos |
| `approval_status` | TEXT | `pending_review`, `approved`, `rejected` (NULL para fans/legados) |
| `approval_reviewed_by` | UUID | Admin que aprovou/rejeitou |
| `approval_reviewed_at` | TIMESTAMPTZ | Quando foi revisado |
| `rejection_reason` | TEXT | Motivo da rejeição |

### Novas tabelas:

```sql
niches (id UUID PK, slug TEXT UNIQUE, label TEXT)

creator_niches (
  creator_id UUID REFERENCES profiles(id),
  niche_id UUID REFERENCES niches(id),
  PRIMARY KEY (creator_id, niche_id)
)
```

### Proteção:
- `approval_status` entra no trigger `protect_profile_admin_fields()` — só service_role altera
- `can_accept_question()` checa `approval_status = 'approved'` (ou NULL para legados)

---

## Painel admin: `/admin/approvals`

### Listagem:
Tabela de criadores com `approval_status = 'pending_review'`, ordenada por `created_at` ASC.

Colunas: Avatar | Username | Nicho(s) | Rede Social (link) | Data | Ações

### Aprovar:
- Seta `approval_status = 'approved'`, `reviewed_by`, `reviewed_at`
- Perfil fica live imediatamente

### Rejeitar:
- Modal pede motivo (obrigatório)
- Seta `approval_status = 'rejected'`, `rejection_reason`
- Criador vê motivo no dashboard e pode reenviar

---

## Backwards compatibility

- Criadores existentes com `approval_status = NULL` → tratados como aprovados
- Convites antigos continuam funcionando (redeem seta `approval_status = 'approved'`)
- Promoção via admin seta `approval_status = 'approved'` direto

---

## Fora de escopo (futuro)

- Sistema de saques / dados bancários / chave PIX
- Documento de identidade para KYC (vinculado ao saque)
- Notificação por email de aprovação/rejeição
- Página de "explore/discover" por nicho
- Login alternativo (Magic Link, Apple OAuth)

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `database/supabase_setup.sql` | Novas colunas, tabelas niches/creator_niches, triggers, update can_accept_question() |
| `frontend/src/app/setup/creator/page.tsx` | Reescrever como wizard 3 steps |
| `frontend/src/app/dashboard/page.tsx` | Banner "em análise"/"rejeitado" + botão "Quero ser criador" |
| `frontend/src/app/perfil/[username]/page.tsx` | Checar approval_status |
| `frontend/src/app/api/payment/create-preference/route.ts` | Checar approval_status = 'approved' |
| `frontend/src/app/admin/approvals/page.tsx` | **Nova** — lista de pendentes |
| `frontend/src/app/api/admin/approvals/route.ts` | **Nova** — API de aprovação/rejeição |
