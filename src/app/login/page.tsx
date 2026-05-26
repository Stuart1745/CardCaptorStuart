"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import LoginForm from './LoginForm'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

  if (loading) return null

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-2xl">
            M
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Welcome to Cardcaptor Stuart
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Sign in to view and manage your collection
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-neutral-900 py-8 px-4 shadow-2xl border border-neutral-800 sm:rounded-2xl sm:px-10 backdrop-blur-xl">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
