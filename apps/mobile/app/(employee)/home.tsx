import { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../stores/auth.store'
import { apiFetch } from '../../utils/api'

interface Attendance {
  clockIn: string | null
  clockOut: string | null
  status: string
  lateMinutes: number
}

export default function EmployeeHome() {
  const { user, logout, refreshMe } = useAuthStore()
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    loadToday()
    refreshMe()
  }, [])

  const loadToday = async () => {
    setFetching(true)
    try {
      const data = await apiFetch('/attendance/today')
      setAttendance(data.attendance)
    } catch {}
    setFetching(false)
  }

  const handleClockIn = async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/attendance/clock-in', { method: 'POST' })
      setAttendance(data.attendance)
      if (data.lateMinutes > 0) {
        Alert.alert('Clocked In Late', `You are ${data.lateMinutes} minutes late today.`)
      } else {
        Alert.alert('Clocked In', 'Have a great day!')
      }
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
    setLoading(false)
  }

  const handleClockOut = async () => {
    setLoading(true)
    try {
      await apiFetch('/attendance/clock-out', { method: 'POST' })
      await loadToday()
      Alert.alert('Clocked Out', 'See you tomorrow!')
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  const balance = user?.leaveBalance
  const holidayLeft = balance ? balance.holidayTotal - balance.holidayUsed : 0
  const sickLeft = balance ? balance.sickNoCertLimit - balance.sickNoCertUsed : 0

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  const isClockedIn = !!attendance?.clockIn
  const isClockedOut = !!attendance?.clockOut

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{user?.name}</Text>
          {user?.project && <Text style={styles.projectName}>{user.project.name}</Text>}
          <Text style={styles.shift}>Shift: {user?.shiftStartTime} – {user?.shiftEndTime}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Clock Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        {fetching ? (
          <ActivityIndicator color="#1a56db" style={{ marginTop: 16 }} />
        ) : (
          <>
            <View style={styles.clockRow}>
              <View style={styles.clockItem}>
                <Text style={styles.clockLabel}>Clock In</Text>
                <Text style={styles.clockTime}>
                  {attendance?.clockIn
                    ? new Date(attendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </Text>
              </View>
              <View style={styles.clockItem}>
                <Text style={styles.clockLabel}>Clock Out</Text>
                <Text style={styles.clockTime}>
                  {attendance?.clockOut
                    ? new Date(attendance.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </Text>
              </View>
            </View>

            {attendance?.status === 'LATE' && (
              <View style={styles.lateBadge}>
                <Text style={styles.lateText}>Late by {attendance.lateMinutes} min</Text>
              </View>
            )}

            {!isClockedIn && (
              <TouchableOpacity style={styles.clockBtn} onPress={handleClockIn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.clockBtnText}>Start Work</Text>}
              </TouchableOpacity>
            )}
            {isClockedIn && !isClockedOut && (
              <TouchableOpacity style={[styles.clockBtn, styles.clockOutBtn]} onPress={handleClockOut} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.clockBtnText}>End Work</Text>}
              </TouchableOpacity>
            )}
            {isClockedIn && isClockedOut && (
              <View style={styles.doneBadge}>
                <Text style={styles.doneText}>Shift complete</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Leave Balances */}
      <Text style={styles.sectionTitle}>Leave Balance</Text>
      <View style={styles.balanceRow}>
        <View style={[styles.balanceCard, { borderLeftColor: '#1a56db' }]}>
          <Text style={styles.balanceNum}>{holidayLeft}</Text>
          <Text style={styles.balanceLabel}>Holiday days left</Text>
          <Text style={styles.balanceSub}>of {balance?.holidayTotal ?? 28} total</Text>
        </View>
        <View style={[styles.balanceCard, { borderLeftColor: sickLeft <= 1 ? '#ef4444' : '#f59e0b' }]}>
          <Text style={[styles.balanceNum, { color: sickLeft <= 1 ? '#ef4444' : '#f59e0b' }]}>{sickLeft}</Text>
          <Text style={styles.balanceLabel}>Sick (no doc)</Text>
          <Text style={styles.balanceSub}>of {balance?.sickNoCertLimit ?? 5} allowed</Text>
        </View>
      </View>

      {sickLeft === 0 && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            You have used all self-certified sick days. A doctor's note is required.
          </Text>
        </View>
      )}

      {/* Actions */}
      <Text style={styles.sectionTitle}>Actions</Text>
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => router.push('/(employee)/request-leave')}
      >
        <Text style={styles.actionBtnText}>Request Leave / Holiday</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: '#f3f4f6', marginTop: 10 }]}
        onPress={() => router.push('/(employee)/my-leaves')}
      >
        <Text style={[styles.actionBtnText, { color: '#374151' }]}>My Leave History</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8f9fb' },
  container: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 16, color: '#6b7280' },
  name: { fontSize: 26, fontWeight: '800', color: '#111', marginTop: 2 },
  projectName: { fontSize: 13, color: '#1a56db', fontWeight: '600', marginTop: 3 },
  shift: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  logoutText: { color: '#ef4444', fontSize: 14, fontWeight: '600', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 16 },
  clockRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  clockItem: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, alignItems: 'center' },
  clockLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  clockTime: { fontSize: 22, fontWeight: '700', color: '#111' },
  clockBtn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center' },
  clockOutBtn: { backgroundColor: '#dc2626' },
  clockBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lateBadge: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginBottom: 12, alignItems: 'center' },
  lateText: { color: '#d97706', fontWeight: '600', fontSize: 13 },
  doneBadge: { backgroundColor: '#d1fae5', borderRadius: 12, padding: 14, alignItems: 'center' },
  doneText: { color: '#065f46', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  balanceRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  balanceCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  balanceNum: { fontSize: 32, fontWeight: '800', color: '#1a56db' },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 2 },
  balanceSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  warnBox: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 16 },
  warnText: { color: '#b91c1c', fontSize: 13, fontWeight: '500' },
  actionBtn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
