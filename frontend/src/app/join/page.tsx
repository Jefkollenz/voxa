'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function JoinRedirect() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const ref = params.get('ref')
    if (ref) {
      localStorage.setItem('voxa_ref', ref)
      localStorage.setItem('voxa_ref_at', Date.now().toString())
    }
    router.push('/login')
  }, [])

  return null
}

export default function JoinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <p className="text-gray-500">Redirecionando...</p>
      <Suspense>
        <JoinRedirect />
      </Suspense>
    </div>
  )
}
