'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CREATOR_NET_RATE, MP_PROCESSING_FEE_ESTIMATE } from '@/lib/constants'
import AvatarCropModal from './AvatarCropModal'

type FastAskSuggestion = {
  label: string
  question: string
  amount: number
}

const DEFAULT_SUGGESTIONS: FastAskSuggestion[] = [
  { label: '⚡ Dica rápida', question: 'Qual é a sua dica mais valiosa que você daria para alguém começando agora?', amount: 20 },
  { label: '🎨 Análise de perfil', question: 'Você pode analisar meu perfil e me dar um feedback honesto sobre o meu estilo?', amount: 35 },
  { label: '🌟 Recomendação', question: 'Qual é a sua recomendação exclusiva para quem quer se destacar nessa área?', amount: 15 },
]

export default function SettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSuccess = useCallback((msg: string, duration = 3000) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current)
    setSuccessMessage(msg)
    msgTimerRef.current = setTimeout(() => setSuccessMessage(''), duration)
  }, [])

  const [bio, setBio] = useState('')
  const [minPrice, setMinPrice] = useState(10)
  const [dailyLimit, setDailyLimit] = useState(10)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  // Pausa programada
  const [isPaused, setIsPaused] = useState(false)
  const [pausedUntil, setPausedUntil] = useState<string | null>(null)
  const [isTogglingPause, setIsTogglingPause] = useState(false)

  // Fast Ask
  const [suggestions, setSuggestions] = useState<FastAskSuggestion[]>(DEFAULT_SUGGESTIONS)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url, min_price, daily_limit, fast_ask_suggestions, is_admin, account_type, is_paused, paused_until')
        .eq('id', user.id)
        .single()

      if (!profile) { router.push('/setup'); return }

      // Somente influencers/admins acessam configurações de criador
      if (profile.account_type === 'fan') { router.push('/dashboard'); return }

      setUserId(user.id)
      setUsername(profile.username)
      setBio(profile.bio ?? '')
      setMinPrice(profile.min_price ?? 10)
      setDailyLimit(profile.daily_limit ?? 10)
      setAvatarUrl(profile.avatar_url ?? '')
      setIsAdmin(!!profile.is_admin)

      // Pausa programada
      const paused = !!profile.is_paused
      const until = profile.paused_until as string | null
      // Se a pausa já expirou, considerar como despausado
      if (paused && until && new Date(until) <= new Date()) {
        setIsPaused(false)
        setPausedUntil(null)
      } else {
        setIsPaused(paused)
        setPausedUntil(until)
      }

      // BUG FIX: fast_ask_suggestions pode vir null do Supabase antes da migration
      // Array.isArray garante que não quebra se a coluna ainda não existir
      const saved = profile.fast_ask_suggestions
      if (Array.isArray(saved) && saved.length > 0) {
        setSuggestions(saved)
      }

      setIsLoading(false)
    }
    load()
  }, [router])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use JPG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5 MB.')
      return
    }

    setError('')
    setCropImageSrc(URL.createObjectURL(file))
  }

  const handleCropConfirm = async (blob: Blob) => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
    setIsUploading(true)
    setError('')

    const supabase = createClient()
    const path = `${userId}/${Date.now()}.jpg`

    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

    if (uploadError || !data) {
      setError('Erro ao fazer upload. Tente novamente.')
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)
    setAvatarUrl(publicUrl)
    setIsUploading(false)
    showSuccess('Avatar atualizado com sucesso!')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropCancel = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
    setCropImageSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Fast Ask handlers
  const updateSuggestion = (index: number, field: keyof FastAskSuggestion, value: string | number) => {
    setSuggestions(prev => prev.map((s, i) => {
      if (i !== index) return s
      if (field === 'amount') {
        // BUG FIX: garante que amount é sempre número válido, nunca NaN
        const parsed = parseFloat(String(value))
        return { ...s, amount: isNaN(parsed) ? s.amount : Math.max(1, parsed) }
      }
      return { ...s, [field]: value }
    }))
  }

  const addSuggestion = () => {
    if (suggestions.length >= 5) return
    setSuggestions(prev => [...prev, { label: '✨ Nova sugestão', question: '', amount: minPrice }])
  }

  const removeSuggestion = (index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index))
  }

  const handleTogglePause = async (pauseFor?: number) => {
    setIsTogglingPause(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    if (isPaused) {
      // Despausar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_paused: false, paused_until: null })
        .eq('id', user.id)

      if (updateError) {
        setError('Erro ao reativar perguntas.')
      } else {
        setIsPaused(false)
        setPausedUntil(null)
        showSuccess('Perguntas reativadas!')
      }
    } else {
      // Pausar
      const until = pauseFor
        ? new Date(Date.now() + pauseFor * 60 * 60 * 1000).toISOString()
        : null

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_paused: true, paused_until: until })
        .eq('id', user.id)

      if (updateError) {
        setError('Erro ao pausar perguntas.')
      } else {
        setIsPaused(true)
        setPausedUntil(until)
        showSuccess(until ? `Perguntas pausadas por ${pauseFor}h!` : 'Perguntas pausadas indefinidamente!')
      }
    }

    setIsTogglingPause(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccessMessage('')

    // BUG FIX: filtra sugestões inválidas antes de salvar — evita dados corrompidos no banco
    const validSuggestions = suggestions.filter(
      s => s.label?.trim() && s.question?.trim() && Number(s.amount) > 0
    )

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        bio: bio.trim().slice(0, 200) || null,
        min_price: minPrice,
        daily_limit: dailyLimit,
        avatar_url: avatarUrl || null,
        fast_ask_suggestions: validSuggestions,
      })
      .eq('id', user.id)

    setIsSaving(false)
    if (updateError) {
      // BUG FIX: se a coluna fast_ask_suggestions ainda não existe (migration pendente),
      // tenta salvar sem ela para não bloquear o usuário
      if (updateError.message?.includes('fast_ask_suggestions')) {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({
            bio: bio.trim().slice(0, 200) || null,
            min_price: minPrice,
            daily_limit: dailyLimit,
            avatar_url: avatarUrl || null,
          })
          .eq('id', user.id)

        if (fallbackError) {
          setError('Erro ao salvar. Tente novamente.')
        } else {
          showSuccess('Configurações salvas! (Perguntas rápidas disponíveis após atualização do banco)', 5000)
        }
      } else {
        setError('Erro ao salvar. Tente novamente.')
      }
    } else {
      showSuccess('Configurações salvas com sucesso!')
    }
  }

  const previewAvatar = avatarUrl.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  const netMonthly = minPrice * dailyLimit * 30 * (1 - MP_PROCESSING_FEE_ESTIMATE) * CREATOR_NET_RATE

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 w-full">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ))}
      </main>
    )
  }

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 w-full">

        {/* Admin Panel */}
        {isAdmin && (
          <div className="bg-amber-50 rounded-2xl p-6 shadow-sm border border-amber-200">
            <h2 className="font-bold text-lg text-amber-900 mb-1">Administração</h2>
            <p className="text-sm text-amber-700 mb-4">Você tem privilégios de administrador. Acesse o painel para gerenciar a plataforma.</p>
            <a href="/admin" className="flex items-center justify-center w-full min-h-[44px] bg-amber-600 text-white font-bold py-3 rounded-xl hover:bg-amber-700 transition-colors">
              Acessar Painel de Administração
            </a>
          </div>
        )}

        {/* Avatar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Foto de perfil</h2>
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={previewAvatar}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-100"
                onError={(e) => {
                  const el = e.target as HTMLImageElement
                  el.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
                }}
              />
              {isUploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileUpload}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className={`inline-flex items-center gap-2 cursor-pointer bg-gradient-instagram text-white text-sm font-semibold px-4 py-3 rounded-xl transition-opacity ${isUploading || isLoading ? 'opacity-50 pointer-events-none' : 'hover:opacity-90'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isUploading ? 'Enviando...' : 'Fazer upload'}
              </label>
              <p className="text-xs text-gray-500">JPG, PNG, WebP ou GIF — máx. 5 MB</p>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  Remover foto (usar avatar gerado)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Verificação */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-1">Verificação de identidade</h2>
          <p className="text-sm text-gray-500 mb-4">Confirme sua identidade e receba a badge de verificado no seu perfil.</p>
          <a
            href="/dashboard/verification"
            className="flex items-center justify-center w-full min-h-[44px] bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Gerenciar verificação
          </a>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Bio</h2>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Conte um pouco sobre você e o que você responde..."
            rows={3}
            maxLength={200}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD2A7B] resize-none"
          />
          <p className="text-right text-xs text-gray-500 mt-1">{bio.length}/200</p>
        </div>

        {/* Preço mínimo */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-1">Preço mínimo por pergunta</h2>
          <p className="text-sm text-gray-500 mb-4">Fãs precisam pagar pelo menos este valor para enviar uma pergunta.</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-2xl font-bold text-[#DD2A7B] shrink-0">R$ {minPrice}</span>
            <input
              id="settings-min-price"
              type="range"
              min={5}
              max={100}
              step={5}
              value={minPrice}
              onChange={e => setMinPrice(Number(e.target.value))}
              className="w-full sm:flex-1 accent-[#DD2A7B]"
              aria-label={`Preço mínimo: R$ ${minPrice}`}
            />
          </div>
        </div>

        {/* Limite diário */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-1">Limite diário de perguntas</h2>
          <p className="text-sm text-gray-500 mb-4">Máximo de perguntas que você aceita responder por dia.</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-2xl font-bold shrink-0">{dailyLimit} <span className="text-base text-gray-500 font-normal">perguntas/dia</span></span>
            <input
              id="settings-daily-limit"
              type="range"
              min={1}
              max={50}
              step={1}
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              className="w-full sm:flex-1 accent-[#DD2A7B]"
              aria-label={`Limite diário: ${dailyLimit} perguntas`}
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Potencial mensal estimado: <span className="font-bold text-green-600">R$ {netMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> <span className="text-xs text-gray-400">(após taxa Voxa + ~1,2% processamento MP)</span>
          </p>
        </div>

        {/* Pausa programada */}
        <div className={`rounded-2xl p-6 shadow-sm border ${isPaused ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-start justify-between mb-1">
            <h2 className="font-bold text-lg">Pausar perguntas</h2>
            {isPaused && (
              <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-1 rounded-full">
                Pausado
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {isPaused
              ? pausedUntil
                ? `Suas perguntas estão pausadas até ${new Date(pausedUntil).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`
                : 'Suas perguntas estão pausadas indefinidamente.'
              : 'Pause temporariamente o recebimento de novas perguntas. Fãs verão que você está indisponível.'}
          </p>

          {isPaused ? (
            <button
              type="button"
              onClick={() => handleTogglePause()}
              disabled={isTogglingPause}
              className="w-full min-h-[44px] bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isTogglingPause ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
              {isTogglingPause ? 'Reativando...' : 'Reativar perguntas'}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTogglePause(24)}
                disabled={isTogglingPause}
                className="min-h-[44px] bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
              >
                {isTogglingPause ? 'Pausando...' : 'Pausar 24h'}
              </button>
              <button
                type="button"
                onClick={() => handleTogglePause(48)}
                disabled={isTogglingPause}
                className="min-h-[44px] bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
              >
                {isTogglingPause ? 'Pausando...' : 'Pausar 48h'}
              </button>
              <button
                type="button"
                onClick={() => handleTogglePause(72)}
                disabled={isTogglingPause}
                className="min-h-[44px] border-2 border-red-300 text-red-500 font-bold py-3 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 text-sm"
              >
                {isTogglingPause ? 'Pausando...' : 'Pausar 72h'}
              </button>
              <button
                type="button"
                onClick={() => handleTogglePause()}
                disabled={isTogglingPause}
                className="min-h-[44px] border-2 border-red-300 text-red-500 font-bold py-3 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 text-sm"
              >
                {isTogglingPause ? 'Pausando...' : 'Indefinido'}
              </button>
            </div>
          )}
        </div>

        {/* ── FAST ASK ── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-1">
            <h2 className="font-bold text-lg">Perguntas Rápidas</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full font-medium">
              {suggestions.length}/5
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Aparecem como pílulas clicáveis no seu perfil — facilitam a vida do fã e aumentam conversão.
          </p>

          <div className="space-y-4">
            {suggestions.map((s, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Sugestão {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSuggestion(index)}
                    className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer p-2 -m-2"
                    aria-label={`Remover sugestão ${index + 1}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Texto da pílula <span className="text-gray-500">(aparece no botão)</span>
                  </label>
                  <input
                    type="text"
                    value={s.label}
                    onChange={e => updateSuggestion(index, 'label', e.target.value.slice(0, 30))}
                    maxLength={30}
                    placeholder="ex: ⚡ Dica rápida"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD2A7B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Pergunta completa <span className="text-gray-500">(preenche a textarea do fã)</span>
                  </label>
                  <textarea
                    value={s.question}
                    onChange={e => updateSuggestion(index, 'question', e.target.value.slice(0, 200))}
                    maxLength={200}
                    rows={2}
                    placeholder="ex: Qual é a sua dica mais valiosa para quem está começando?"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD2A7B] resize-none"
                  />
                  <p className="text-right text-xs text-gray-500 mt-0.5">{s.question.length}/200</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Valor sugerido <span className="text-gray-500">(mínimo: R$ {minPrice})</span>
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-500">R$</span>
                      <input
                        type="number"
                        value={s.amount}
                        min={minPrice}
                        max={500}
                        onChange={e => updateSuggestion(index, 'amount', e.target.value)}
                        className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#DD2A7B]"
                      />
                    </div>
                    {/* Preview da pílula */}
                    <div className="flex-1 min-w-0 flex justify-start sm:justify-end">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-500 bg-white max-w-full">
                        <span className="truncate">{s.label || '...'}</span>
                        <span className="text-gray-500 shrink-0">· R$ {Math.max(Number(s.amount) || minPrice, minPrice)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {suggestions.length < 5 && (
            <button
              type="button"
              onClick={addSuggestion}
              className="mt-4 w-full border-2 border-dashed border-gray-200 rounded-2xl py-3 text-sm text-gray-500 font-medium hover:border-[#DD2A7B] hover:text-[#DD2A7B] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar sugestão
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {successMessage && (
          <div className="p-4 bg-[#16A34A]/10 border border-green-500/30 rounded-2xl text-center">
            <p className="text-green-600 font-semibold text-sm">✓ {successMessage}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="w-full bg-gradient-instagram text-white font-bold py-4 rounded-2xl disabled:opacity-50 text-base"
        >
          {isSaving ? 'Salvando...' : 'Salvar alterações'}
        </button>

        <div className="text-center space-y-3">
          <a href="/dashboard" className="block text-sm text-gray-500 hover:text-gray-600">Voltar ao dashboard</a>
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              router.push('/')
            }}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
          >
            Sair da conta
          </button>
        </div>
      </main>

      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}
