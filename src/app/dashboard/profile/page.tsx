'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import styles from './profile.module.css'
import { User, Building, GraduationCap, BookOpen, Calendar, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export default function ProfilePage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    company: '',
    program: '',
    course: ''
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile()
    }
  }, [session])

  const fetchProfile = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('company, program, course')
      .eq('id', session!.user.id)
      .single()

    if (data) {
      setFormData({
        company: data.company || '',
        program: data.program || '',
        course: data.course || ''
      })
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({
        company: formData.company,
        program: formData.program,
        course: formData.course
      })
      .eq('id', session!.user.id)
      
    setSaving(false)
    alert('Profile updated successfully!')
  }

  if (loading) {
    return <div className={styles.loadingPulse}>Loading profile...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>
        <h1>Your Profile</h1>
      </div>

      <div className={`glass ${styles.card}`}>
        <div className={styles.profileSection}>
          <div className={styles.avatarPlaceholder}>
            <User size={48} />
          </div>
          <div className={styles.userInfo}>
            <h2>{session?.user.user_metadata?.full_name || session?.user.email}</h2>
            <div className={styles.metaInfo}>
              <Calendar size={16} />
              <span>Joined {session?.user.created_at ? format(new Date(session.user.created_at), 'MMMM d, yyyy') : 'Recently'}</span>
            </div>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>
              <Building size={16} />
              Internship Company
            </label>
            <input
              type="text"
              name="company"
              className={styles.input}
              placeholder="e.g. Google, Vercel, Startup Inc."
              value={formData.company}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                <GraduationCap size={16} />
                Program / Degree
              </label>
              <input
                type="text"
                name="program"
                className={styles.input}
                placeholder="e.g. BS Computer Science"
                value={formData.program}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label>
                <BookOpen size={16} />
                Course Title
              </label>
              <input
                type="text"
                name="course"
                className={styles.input}
                placeholder="e.g. CS101 Practicum"
                value={formData.course}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
