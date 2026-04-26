'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { LogIn } from 'lucide-react'
import styles from './page.module.css'

export default function Home() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    if (!loading && session) {
      router.push('/dashboard')
    }
  }, [session, loading, router])

  const handleLogin = async () => {
    setIsLoggingIn(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
    
    if (error) {
      console.error(error)
      setIsLoggingIn(false)
    }
  }

  if (loading || session) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.mesh}></div>
      <div className={`glass ${styles.heroCard}`}>
        <h1 className={styles.title}>OJT Tracker</h1>
        <p className={styles.subtitle}>
          Master your time. Track your progress. Achieve your goals.
        </p>
        
        <button 
          className="btn-primary" 
          onClick={handleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? 'Connecting...' : (
            <>
              <LogIn size={20} />
              Continue with Google
            </>
          )}
        </button>
      </div>
    </main>
  )
}
