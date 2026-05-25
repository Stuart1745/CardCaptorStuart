"use client"

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <button 
      onClick={handleLogout}
      className="text-sm font-medium text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
    >
      <LogOut size={16} />
      Log Out
    </button>
  )
}
