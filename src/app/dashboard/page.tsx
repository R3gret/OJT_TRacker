'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'
import { Clock, Play, Square, Settings2, Plus, CalendarCheck } from 'lucide-react'
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns'
import { predictEndDate } from '@/lib/holidays'

type Profile = {
  target_hours: number
  total_completed_minutes: number
}

type TimeLog = {
  id: string
  clock_in_time: string
  clock_out_time: string | null
  duration_minutes: number | null
}

export default function DashboardPage() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [currentLog, setCurrentLog] = useState<TimeLog | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [targetHoursInput, setTargetHoursInput] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [startHour, setStartHour] = useState('09')
  const [startMinute, setStartMinute] = useState('00')
  const [startAmPm, setStartAmPm] = useState('AM')
  const [endHour, setEndHour] = useState('05')
  const [endMinute, setEndMinute] = useState('00')
  const [endAmPm, setEndAmPm] = useState('PM')
  const [loading, setLoading] = useState(true)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (session?.user?.id) {
      fetchData()
    }
  }, [session])

  // Live elapsed timer
  useEffect(() => {
    if (!currentLog) {
      setElapsed('')
      return
    }
    const tick = () => {
      const totalSec = differenceInSeconds(new Date(), new Date(currentLog.clock_in_time))
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      setElapsed(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [currentLog])

  const fetchData = async () => {
    if (!profile) setLoading(true)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session!.user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setTargetHoursInput(profileData.target_hours.toString())
    }

    const { data: logsData } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', session!.user.id)
      .order('clock_in_time', { ascending: false })

    if (logsData) {
      setLogs(logsData)
      const activeLog = logsData.find(log => log.clock_out_time === null)
      if (activeLog) {
        setCurrentLog(activeLog)
      } else {
        setCurrentLog(null)
      }
    }
    setLoading(false)
  }

  const handleClockAction = async () => {
    if (currentLog) {
      // Clock Out
      const clockOutTime = new Date().toISOString()
      const duration = differenceInMinutes(new Date(clockOutTime), new Date(currentLog.clock_in_time))
      
      await supabase
        .from('time_logs')
        .update({ clock_out_time: clockOutTime, duration_minutes: duration })
        .eq('id', currentLog.id)
        
      await fetchData()
    } else {
      // Clock In
      await supabase
        .from('time_logs')
        .insert([{ user_id: session!.user.id }])
        
      await fetchData()
    }
  }

  const handleUpdateTarget = async () => {
    const newTarget = parseInt(targetHoursInput)
    if (isNaN(newTarget) || newTarget <= 0) return

    await supabase
      .from('profiles')
      .update({ target_hours: newTarget })
      .eq('id', session!.user.id)

    setIsSettingsOpen(false)
    await fetchData()
  }

  const handleAddManualLog = async () => {
    if (!manualDate) {
      alert("Please select a date.")
      return
    }
    
    // Parse start time
    let sH = parseInt(startHour)
    if (startAmPm === 'PM' && sH < 12) sH += 12
    if (startAmPm === 'AM' && sH === 12) sH = 0
    
    // Parse end time
    let eH = parseInt(endHour)
    if (endAmPm === 'PM' && eH < 12) eH += 12
    if (endAmPm === 'AM' && eH === 12) eH = 0
    
    const clockIn = new Date(`${manualDate}T${String(sH).padStart(2,'0')}:${startMinute}:00`)
    const clockOut = new Date(`${manualDate}T${String(eH).padStart(2,'0')}:${endMinute}:00`)
    
    if (clockOut <= clockIn) {
      alert("End time must be after start time")
      return
    }

    const duration = differenceInMinutes(clockOut, clockIn)
    
    const { error } = await supabase
      .from('time_logs')
      .insert([{ 
        user_id: session!.user.id,
        clock_in_time: clockIn.toISOString(),
        clock_out_time: clockOut.toISOString(),
        duration_minutes: duration
      }])
      
    if (error) {
      console.error("Error inserting manual log:", error)
      alert("Failed to add log. Please try again.")
      return
    }
      
    setIsManualEntryOpen(false)
    setManualDate('')
    setStartHour('09')
    setStartMinute('00')
    setStartAmPm('AM')
    setEndHour('05')
    setEndMinute('00')
    setEndAmPm('PM')
    await fetchData()
  }

  if (loading || !profile) {
    return <div className={styles.loadingPulse}>Loading your data...</div>
  }

  // Calculate total minutes locally for now
  const totalCompletedMinutes = logs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0)
  const totalCompletedHours = Math.floor(totalCompletedMinutes / 60)
  const remainingMinutes = totalCompletedMinutes % 60
  const percentage = Math.min(100, Math.round((totalCompletedHours / profile.target_hours) * 100))

  // Predict end date — use 8h/day default until 3+ days of data
  const completedLogs = logs.filter(l => l.duration_minutes !== null && l.duration_minutes > 0)
  const uniqueDays = new Set(completedLogs.map(l => l.clock_in_time.split('T')[0]))
  const avgMinutesPerDay = uniqueDays.size >= 3 ? totalCompletedMinutes / uniqueDays.size : 480
  const minutesRemaining = Math.max(0, profile.target_hours * 60 - totalCompletedMinutes)
  const predictedDate = percentage < 100 ? predictEndDate(minutesRemaining, avgMinutesPerDay) : null

  return (
    <div className={styles.container}>
      {/* Top Row: Progress + Action */}
      <div className={styles.topRow}>
        
        {/* Progress Card */}
        <div className={`glass ${styles.card} ${styles.progressCard}`}>
          <div className={styles.cardHeader}>
            <h2>Progress Overview</h2>
            <button onClick={() => setIsSettingsOpen(true)} className={styles.iconBtn}>
              <Settings2 size={20} />
            </button>
          </div>
          
          <div className={styles.progressRingContainer}>
            <svg viewBox="0 0 36 36" className={styles.circularChart}>
              <path className={styles.circleBg}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className={styles.circle}
                strokeDasharray={`${percentage}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" className={styles.percentage}>{percentage}%</text>
            </svg>
          </div>
          
          <div className={styles.stats}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Completed</span>
              <span className={styles.statValue}>{totalCompletedHours}h {remainingMinutes}m</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Target</span>
              <span className={styles.statValue}>{profile.target_hours}h</span>
            </div>
          </div>

          {predictedDate && (
            <div className={styles.prediction}>
              <CalendarCheck size={16} />
              <span>Est. completion: <strong>{format(predictedDate, 'MMMM d, yyyy')}</strong></span>
            </div>
          )}
          {percentage >= 100 && (
            <div className={styles.prediction}>
              <CalendarCheck size={16} />
              <span><strong>Completed!</strong> 🎉</span>
            </div>
          )}
        </div>

        {/* Action Card */}
        <div className={`glass ${styles.card} ${styles.actionCard}`}>
          <h2>Current Status</h2>
          <div className={styles.statusDisplay}>
            <span className={`${styles.statusDot} ${currentLog ? styles.active : styles.inactive}`}></span>
            {currentLog ? 'Clocked In' : 'Clocked Out'}
          </div>
          
          <button 
            className={`${styles.clockBtn} ${currentLog ? styles.btnStop : styles.btnStart}`}
            onClick={handleClockAction}
          >
            {currentLog ? (
              <>
                <Square size={24} fill="currentColor" />
                Stop Session
                <span className={styles.clockBtnTime}>Since {format(new Date(currentLog.clock_in_time), 'h:mm a')}</span>
              </>
            ) : (
              <>
                <Play size={24} fill="currentColor" />
                Start Session
              </>
            )}
          </button>

          <div className={styles.elapsedTime}>{elapsed || '00:00:00'}</div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity */}
      <div className={styles.bottomRow}>
        <div className={`glass ${styles.card} ${styles.logsCard}`}>
          <div className={styles.cardHeader}>
            <h2>Recent Activity</h2>
            <button onClick={() => setIsManualEntryOpen(true)} className={styles.iconBtn} title="Add Manual Log">
              <Plus size={20} />
            </button>
          </div>
          <div className={styles.logsList}>
            {logs.length === 0 ? (
              <p className={styles.emptyState}>No activity yet. Start a session!</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={styles.logItem}>
                  <div className={styles.logIcon}>
                    <Clock size={16} />
                  </div>
                  <div className={styles.logDetails}>
                    <div className={styles.logDate}>
                      {format(new Date(log.clock_in_time), 'MMM d, yyyy')}
                    </div>
                    <div className={styles.logTime}>
                      {format(new Date(log.clock_in_time), 'h:mm a')} 
                      {log.clock_out_time ? ` - ${format(new Date(log.clock_out_time), 'h:mm a')}` : ' - Now'}
                    </div>
                  </div>
                  <div className={styles.logDuration}>
                    {log.duration_minutes !== null ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m` : 'Active'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass ${styles.modal}`}>
            <h3>Update Target Hours</h3>
            <p>Set your required time ceiling for the OJT program.</p>
            <input 
              type="number" 
              className={styles.input}
              value={targetHoursInput}
              onChange={(e) => setTargetHoursInput(e.target.value)}
              min="1"
            />
            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsSettingsOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdateTarget}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isManualEntryOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass ${styles.modal}`}>
            <h3>Add Manual Session</h3>
            <p>Log hours that you completed previously.</p>
            
            <div className={styles.formGroup}>
              <label>Date</label>
              <input 
                type="date" 
                className={styles.input}
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Start Time</label>
                <div className={styles.timePickerGroup}>
                  <select className={styles.timeSelect} value={startHour} onChange={e => setStartHour(e.target.value)}>
                    {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span>:</span>
                  <select className={styles.timeSelect} value={startMinute} onChange={e => setStartMinute(e.target.value)}>
                    {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className={styles.timeSelect} value={startAmPm} onChange={e => setStartAmPm(e.target.value)}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>End Time</label>
                <div className={styles.timePickerGroup}>
                  <select className={styles.timeSelect} value={endHour} onChange={e => setEndHour(e.target.value)}>
                    {Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span>:</span>
                  <select className={styles.timeSelect} value={endMinute} onChange={e => setEndMinute(e.target.value)}>
                    {Array.from({length: 60}, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select className={styles.timeSelect} value={endAmPm} onChange={e => setEndAmPm(e.target.value)}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsManualEntryOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddManualLog}>Add Log</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
