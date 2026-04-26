'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { LogOut, User as UserIcon } from 'lucide-react'
import styles from './dashboard.module.css'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.push('/')
    }
  }, [session, loading, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading || !session) {
    return null // Handled by AuthProvider loading or landing page
  }

  return (
    <div className={styles.layout}>
      <header className={`glass ${styles.header}`}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Link href="/dashboard">OJT Tracker</Link>
          </div>
          <div className={styles.userSection}>
            <Link href="/dashboard/profile" className={styles.userInfo}>
              <UserIcon size={18} />
              <span>{session.user.user_metadata?.full_name || session.user.email}</span>
            </Link>
            <button className="btn-secondary" onClick={handleLogout}>
              <LogOut size={16} />
              <span className={styles.hideMobile}>Sign Out</span>
            </button>
          </div>
        </div>
      </header>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}
