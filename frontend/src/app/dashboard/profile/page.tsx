'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera, Check } from 'lucide-react'

export default function FanProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      if (!profile) { router.push('/setup'); return }
      setUsername(profile.username)
      setAvatarUrl(profile.avatar_url)
    }
    load()
  }, [router])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use JPG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5 MB.')
      return
    }

    setIsUploading(true)
    setError('')
    const supabase = createClient()
    const path = `${userId}/${Date.now()}.jpg`

    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError || !data) {
      setError('Erro ao fazer upload. Tente novamente.')
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path)

    await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    setAvatarUrl(publicUrl)
    setIsUploading(false)
    setSuccess('Avatar atualizado!')
    setTimeout(() => setSuccess(''), 3000)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const displayAvatar = avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6 w-full">
      <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden group-hover:border-gray-400 transition-colors">
              <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-instagram rounded-full flex items-center justify-center shadow">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>
          {isUploading && <p className="text-xs text-gray-500 mt-2">Enviando...</p>}
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
          <div className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-800 font-medium">
            @{username}
          </div>
          <p className="text-xs text-gray-400 mt-1">O username não pode ser alterado.</p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
          <div className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-gray-800">
            {email}
          </div>
          <p className="text-xs text-gray-400 mt-1">E-mail vinculado à sua conta Google.</p>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            {success}
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
