'use client'

import { useState } from 'react'

type FanQuestion = {
  id: string
  creator_id: string
  sender_name: string
  content: string
  status: string
  price_paid: number
  service_type: string
  response_text: string | null
  response_audio_url: string | null
  answered_at: string | null
  created_at: string
  creator: {
    username: string
    avatar_url: string | null
  }
}

type Filter = 'all' | 'pending' | 'answered' | 'expired'

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'answered', label: 'Respondidas' },
  { value: 'expired', label: 'Expiradas' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  answered: { label: 'Respondida', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  expired: { label: 'Expirada', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
}

export default function FanQuestionList({ questions }: { questions: FanQuestion[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const filtered = filter === 'all' ? questions : questions.filter(q => q.status === filter)

  const handleDownload = async (question: FanQuestion) => {
    if (!question.response_audio_url) return
    setDownloadingId(question.id)

    try {
      const response = await fetch(question.response_audio_url)
      const blob = await response.blob()

      const ext = question.response_audio_url.includes('.mp3') ? 'mp3' : 'webm'
      const filename = `voxa-resposta-${question.creator.username}-${question.id.slice(0, 8)}.${ext}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao baixar áudio:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === opt.value
                ? 'bg-gradient-instagram text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#DD2A7B]'
            }`}
          >
            {opt.label}
            {opt.value !== 'all' && (
              <span className="ml-1.5 opacity-70">
                {questions.filter(q => q.status === opt.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 text-sm">
            {filter === 'all' ? 'Você ainda não fez nenhuma pergunta.' : `Nenhuma pergunta ${FILTER_OPTIONS.find(o => o.value === filter)?.label.toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(question => {
            const status = STATUS_CONFIG[question.status] ?? STATUS_CONFIG.pending
            const creatorAvatar = question.creator?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${question.creator?.username}`

            return (
              <div key={question.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                {/* Header: criador + status */}
                <div className="flex items-center justify-between mb-3">
                  <a
                    href={`/perfil/${question.creator?.username}`}
                    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={creatorAvatar}
                      alt={question.creator?.username}
                      className="w-9 h-9 rounded-full object-cover border border-gray-100"
                    />
                    <div>
                      <p className="font-bold text-sm text-gray-900">@{question.creator?.username}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(question.created_at)} às {formatTime(question.created_at)}
                      </p>
                    </div>
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#DD2A7B]">
                      R$ {Number(question.price_paid).toFixed(2).replace('.', ',')}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Pergunta */}
                <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                  &ldquo;{question.content}&rdquo;
                </p>

                {/* Resposta */}
                {question.status === 'answered' && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 mb-2">
                      Resposta de @{question.creator?.username}
                      {question.answered_at && (
                        <span className="font-normal ml-1">
                          · {formatDate(question.answered_at)} às {formatTime(question.answered_at)}
                        </span>
                      )}
                    </p>

                    {/* Áudio com botão de download */}
                    {question.response_audio_url && (
                      <div className="space-y-2">
                        <audio
                          controls
                          src={question.response_audio_url}
                          className="w-full"
                          preload="none"
                        />
                        <button
                          onClick={() => handleDownload(question)}
                          disabled={downloadingId === question.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DD2A7B] hover:text-[#8134AF] transition-colors disabled:opacity-50"
                        >
                          {downloadingId === question.id ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Baixando...
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Baixar áudio
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Texto */}
                    {question.response_text && !question.response_audio_url && (
                      <p className="text-gray-700 text-sm leading-relaxed">{question.response_text}</p>
                    )}
                  </div>
                )}

                {/* Pendente */}
                {question.status === 'pending' && (
                  <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 text-center">
                    <p className="text-xs text-yellow-700">
                      ⏳ Aguardando resposta do criador (prazo: até 36h)
                    </p>
                  </div>
                )}

                {/* Expirada */}
                {question.status === 'expired' && (
                  <div className="bg-red-50 rounded-xl p-3 border border-red-100 text-center">
                    <p className="text-xs text-red-600">
                      Pergunta expirou sem resposta. Reembolso em processamento.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
