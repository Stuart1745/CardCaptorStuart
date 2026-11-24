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
    <div className="min-h-[70vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={48} height={48} className="w-12 h-12 rounded-xl shadow-lg" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-paper-900 dark:text-paper-50 tracking-tight">
          Welcome to <span className="font-brand text-pink-700 dark:text-pink-400">Cardcaptor Stuart</span>
        </h2>
        <p className="mt-2 text-center text-sm text-paper-500 dark:text-paper-400">
          Sign in to view and manage your collection
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-paper-900 py-8 px-4 shadow-sm border border-paper-200 dark:border-paper-800 rounded-2xl sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
