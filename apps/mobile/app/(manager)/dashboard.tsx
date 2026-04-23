import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../stores/auth.store'
import { apiFetch } from '../../utils/api'

export default function ManagerDashboard() {
  const { user, logout } = useAuthStore()
  const [employees, setEmployees] = useState<any[]>([])
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [lateAlerts, setLateAlerts] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [empData, leaveData, alertData, companyData] = await Promise.all([
        apiFetch('/employees'),
        apiFetch('/leave/manager/all?status=PENDING'),
        apiFetch('/attendance/manager/late-alerts'),
        apiFetch('/auth/company'),
      ])
      setEmployees(empData.employees)
      setPendingLeaves(leaveData.requests)
      setLateAlerts(alertData.alerts)
      setCompany(companyData.company)
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadData() }, [])

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#1a56db" size="large" /></View>

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.role}>Manager Dashboard</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Company join code */}
      {company && (
        <View style={styles.companyCard}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyCodeLabel}>Join Code (share with staff)</Text>
          <Text style={styles.companyCode}>{company.joinCode}</Text>
        </View>
      )}

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: '#1a56db' }]}>
          <Text style={styles.statNum}>{employees.length}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#f59e0b' }]}>
          <Text style={[styles.statNum, { color: '#f59e0b' }]}>{pendingLeaves.length}</Text>
          <Text style={styles.statLabel}>Pending Leaves</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#ef4444' }]}>
          <Text style={[styles.statNum, { color: '#ef4444' }]}>{lateAlerts.length}</Text>
          <Text style={styles.statLabel}>Late Alerts</Text>
        </View>
      </View>

      {/* Late Alerts */}
      {lateAlerts.length > 0 && (
        <>
          <Text style={styles.section}>Late Alerts Today</Text>
          {lateAlerts.map((a) => (
            <View key={a.id} style={[styles.alertCard]}>
              <Text style={styles.alertName}>{a.user.name}</Text>
              <Text style={styles.alertSub}>Has not clocked in — 20+ min late</Text>
              {a.response && <Text style={styles.alertResponse}>Response: {a.response}</Text>}
            </View>
          ))}
        </>
      )}

      {/* Pending Leave Requests */}
      {pendingLeaves.length > 0 && (
        <>
          <Text style={styles.section}>Pending Leave Requests</Text>
          {pendingLeaves.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={styles.leaveCard}
              onPress={() => router.push({ pathname: '/(manager)/review-leave', params: { id: l.id } })}
            >
              <View style={styles.leaveTop}>
                <Text style={styles.leaveName}>{l.user.name}</Text>
                <Text style={styles.leaveType}>{l.type.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.leaveDates}>
                {l.startDate.slice(0, 10)} → {l.endDate.slice(0, 10)} ({l.totalDays} day{l.totalDays > 1 ? 's' : ''})
              </Text>
              <Text style={styles.tapHint}>Tap to review</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Manager Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.addManagerBtn}
          onPress={() => router.push('/(manager)/add-manager')}
        >
          <Text style={styles.addManagerText}>+ Add Manager</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addEmployeeBtn}
          onPress={() => router.push('/(manager)/add-employee')}
        >
          <Text style={styles.addEmployeeText}>+ Add Employee</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.addProjectBtn}
        onPress={() => router.push('/(manager)/add-project')}
      >
        <Text style={styles.addProjectText}>+ New Project</Text>
      </TouchableOpacity>

      {/* Employee List */}
      <Text style={styles.section}>All Employees</Text>
      {employees.map((emp) => {
        const balance = emp.leaveBalance
        const holidayLeft = balance ? balance.holidayTotal - balance.holidayUsed : 0
        const sickLeft = balance ? balance.sickNoCertLimit - balance.sickNoCertUsed : 0
        const todayAtt = emp.attendances?.[0]
        const isClockedIn = !!todayAtt?.clockIn
        const isLate = todayAtt?.status === 'LATE'

        return (
          <TouchableOpacity
            key={emp.id}
            style={styles.empCard}
            onPress={() => router.push({ pathname: '/(manager)/employee-detail', params: { id: emp.id } })}
          >
            <View style={styles.empTop}>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>{emp.name}</Text>
                <Text style={styles.empEmail}>{emp.email}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: isClockedIn ? '#10b981' : '#d1d5db' }]} />
            </View>

            {isLate && (
              <View style={styles.lateBadge}>
                <Text style={styles.lateText}>Late today</Text>
              </View>
            )}

            <View style={styles.balRow}>
              <View style={styles.balChip}>
                <Text style={styles.balNum}>{holidayLeft}</Text>
                <Text style={styles.balLabel}>Holiday left</Text>
              </View>
              <View style={[styles.balChip, { borderLeftColor: sickLeft === 0 ? '#ef4444' : '#f59e0b' }]}>
                <Text style={[styles.balNum, { color: sickLeft === 0 ? '#ef4444' : '#f59e0b' }]}>{sickLeft}/5</Text>
                <Text style={styles.balLabel}>Sick (no doc)</Text>
              </View>
            </View>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8f9fb' },
  container: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  role: { fontSize: 13, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 26, fontWeight: '800', color: '#111', marginTop: 2 },
  logout: { color: '#ef4444', fontSize: 14, fontWeight: '600', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statNum: { fontSize: 28, fontWeight: '800', color: '#1a56db' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2, fontWeight: '600' },
  section: { fontSize: 15, fontWeight: '800', color: '#374151', marginBottom: 12, marginTop: 8 },
  alertCard: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  alertName: { fontSize: 15, fontWeight: '700', color: '#111' },
  alertSub: { fontSize: 13, color: '#dc2626', marginTop: 2 },
  alertResponse: { fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
  leaveCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  leaveTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  leaveName: { fontSize: 15, fontWeight: '700', color: '#111' },
  leaveType: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  leaveDates: { fontSize: 13, color: '#6b7280' },
  tapHint: { fontSize: 12, color: '#1a56db', marginTop: 6, fontWeight: '600' },
  empCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  empTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '700', color: '#111' },
  empEmail: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  lateBadge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  lateText: { fontSize: 12, color: '#d97706', fontWeight: '600' },
  balRow: { flexDirection: 'row', gap: 10 },
  balChip: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#1a56db' },
  balNum: { fontSize: 18, fontWeight: '800', color: '#1a56db' },
  balLabel: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  addManagerBtn: { flex: 1, backgroundColor: '#1a56db', borderRadius: 12, padding: 14, alignItems: 'center' },
  addManagerText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addEmployeeBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  addEmployeeText: { color: '#374151', fontSize: 14, fontWeight: '700' },
  companyCard: { backgroundColor: '#eff6ff', borderRadius: 14, padding: 16, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#1a56db' },
  companyName: { fontSize: 17, fontWeight: '800', color: '#1e40af', marginBottom: 6 },
  companyCodeLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' },
  companyCode: { fontSize: 24, fontWeight: '900', color: '#1a56db', letterSpacing: 2, marginTop: 2 },
  addProjectBtn: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: '#10b981' },
  addProjectText: { color: '#065f46', fontSize: 14, fontWeight: '700' },
})
