'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VerifiedBadge from '@/components/VerifiedBadge'

type VerificationStatus = {
  is_verified: boolean
  latest_request: {
    id: string
    status: 'pending' | 'approved' | 'rejected'
    rejection_reason: string | null
    created_at: string
  } | null
}

export default function VerificationPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [socialLink, setSocialLink] = useState('')
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/verification/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
      setIsLoading(false)
    }
    load()
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use JPG, PNG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5 MB.')
      return
    }

    setError('')
    setDocumentFile(file)
  }

  const handleSubmit = async () => {
    if (!socialLink.trim()) {
      setError('Informe o link da sua rede social principal.')
      return
    }
    if (!documentFile) {
      setError('Envie uma foto do seu documento de identidade.')
      return
    }

    setIsSubmitting(true)
    setError('')

    const formData = new FormData()
    formData.append('social_link', socialLink.trim())
    formData.append('document', documentFile)

    try {
      const res = await fetch('/api/verification/request', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar solicitação.')
        setIsSubmitting(false)
        return
      }

      setSuccess('Solicitação enviada com sucesso! Analisaremos em breve.')
      setSocialLink('')
      setDocumentFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Recarregar status
      const statusRes = await fetch('/api/verification/status')
      if (statusRes.ok) setStatus(await statusRes.json())
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        </div>
      </main>
    )
  }

  const isPending = status?.latest_request?.status === 'pending'
  const isRejected = status?.latest_request?.status === 'rejected'
  const isVerified = status?.is_verified

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 w-full">

      {/* Status atual */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h1 className="font-bold text-xl text-gray-900 mb-2">Verificação de Identidade</h1>
        <p className="text-sm text-gray-500 mb-6">
          A badge de verificado confirma que você é o criador real. Fãs verão o selo ao lado do seu nome.
        </p>

        {isVerified && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <VerifiedBadge isVerified={true} size="lg" />
            <div>
              <p className="font-bold text-blue-900">Perfil verificado</p>
              <p className="text-sm text-blue-700">Seu perfil está verificado e a badge está visível para todos.</p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
            <svg className="w-5 h-5 text-yellow-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-bold text-yellow-900">Solicitação em análise</p>
              <p className="text-sm text-yellow-700">Sua solicitação está sendo analisada pela nossa equipe.</p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="font-bold text-red-900">Solicitação rejeitada</p>
            </div>
            {status?.latest_request?.rejection_reason && (
              <p className="text-sm text-red-700 ml-8">
                Motivo: {status.latest_request.rejection_reason}
              </p>
            )}
            <p className="text-sm text-red-600 ml-8 mt-1">Você pode enviar uma nova solicitação abaixo.</p>
          </div>
        )}
      </div>

      {/* Formulário — visível se não verificado e sem solicitação pendente */}
      {!isVerified && !isPending && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h2 className="font-bold text-lg text-gray-900">Solicitar verificação</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link da rede social principal
            </label>
            <input
              type="url"
              value={socialLink}
              onChange={e => setSocialLink(e.target.value)}
              placeholder="https://instagram.com/seu_usuario"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD2A7B]"
            />
            <p className="text-xs text-gray-500 mt-1">Instagram, YouTube, TikTok ou Twitter/X</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Documento de identidade
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="doc-upload"
            />
            <label
              htmlFor="doc-upload"
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl py-4 cursor-pointer text-sm text-gray-500 font-medium hover:border-[#DD2A7B] hover:text-[#DD2A7B] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {documentFile ? documentFile.name : 'Enviar foto do RG ou CNH'}
            </label>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG ou WebP — máx. 5 MB</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
              <p className="text-green-600 font-semibold text-sm">{success}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-instagram text-white font-bold py-4 rounded-2xl disabled:opacity-50 text-base"
          >
            {isSubmitting ? 'Enviando...' : 'Solicitar verificação'}
          </button>
        </div>
      )}

      <div className="text-center">
        <a href="/dashboard/settings" className="text-sm text-gray-500 hover:text-gray-600">
          ← Voltar para configurações
        </a>
      </div>
    </main>
  )
}
