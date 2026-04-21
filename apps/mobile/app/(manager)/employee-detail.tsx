import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Linking
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { apiFetch } from '../../utils/api'

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
}

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch(`/employees/${id}`)
      .then((d) => setEmployee(d.employee))
      .catch(() => Alert.alert('Error', 'Could not load employee'))
      .finally(() => setLoading(false))
  }, [id])

  const toggleActive = async () => {
    const next = !employee.isActive
    try {
      await apiFetch(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: next }),
      })
      setEmployee((e: any) => ({ ...e, isActive: next }))
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  const resetLeave = async () => {
    Alert.alert(
      'Reset Leave',
      'Reset this employee\'s leave balance to 28 days holiday and 0 sick days used?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/employees/${id}/reset-leave`, { method: 'POST' })
              const d = await apiFetch(`/employees/${id}`)
              setEmployee(d.employee)
              Alert.alert('Done', 'Leave balance reset.')
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#1a56db" size="large" /></View>
  if (!employee) return <View style={styles.centered}><Text style={styles.notFound}>Employee not found</Text></View>

  const balance = employee.leaveBalance
  const holidayLeft = balance ? balance.holidayTotal - balance.holidayUsed : 0
  const sickLeft = balance ? balance.sickNoCertLimit - balance.sickNoCertUsed : 0

  const sickWithDocs = (employee.leaveRequests ?? []).filter(
    (r: any) => r.documentUrl && (r.type === 'SICK_WITH_DOC' || r.type === 'SICK_NO_DOC')
  )

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Employee</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Profile */}
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{employee.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.empName}>{employee.name}</Text>
            <Text style={styles.empEmail}>{employee.email}</Text>
            <Text style={styles.shift}>Shift: {employee.shiftStartTime} – {employee.shiftEndTime}</Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: employee.isActive ? '#d1fae5' : '#fee2e2' }]}>
            <Text style={[styles.activeText, { color: employee.isActive ? '#065f46' : '#b91c1c' }]}>
              {employee.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {/* Leave Balance */}
      <Text style={styles.section}>Leave Balance</Text>
      <View style={styles.balRow}>
        <View style={[styles.balCard, { borderLeftColor: '#1a56db' }]}>
          <Text style={styles.balNum}>{holidayLeft}</Text>
          <Text style={styles.balLabel}>Holiday left</Text>
          <Text style={styles.balSub}>of {balance?.holidayTotal ?? 28} total</Text>
        </View>
        <View style={[styles.balCard, { borderLeftColor: sickLeft === 0 ? '#ef4444' : '#f59e0b' }]}>
          <Text style={[styles.balNum, { color: sickLeft === 0 ? '#ef4444' : '#f59e0b' }]}>{sickLeft}/5</Text>
          <Text style={styles.balLabel}>Sick (no doc)</Text>
          <Text style={styles.balSub}>days remaining</Text>
        </View>
      </View>

      {/* Sick leave documents folder */}
      {sickWithDocs.length > 0 && (
        <>
          <Text style={styles.section}>Sick Leave Documents</Text>
          {sickWithDocs.map((r: any) => (
            <TouchableOpacity
              key={r.id}
              style={styles.docCard}
              onPress={() => r.documentUrl && Linking.openURL(r.documentUrl)}
            >
              <Text style={styles.docName}>{r.documentOriginalName ?? 'Document'}</Text>
              <Text style={styles.docDate}>{r.startDate?.slice(0, 10)} – {r.endDate?.slice(0, 10)}</Text>
              <Text style={styles.docLink}>View Document</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Recent Attendance */}
      <Text style={styles.section}>Recent Attendance (last 30 days)</Text>
      {(employee.attendances ?? []).length === 0 ? (
        <Text style={styles.empty}>No attendance records yet.</Text>
      ) : (
        (employee.attendances ?? []).slice(0, 10).map((a: any) => (
          <View key={a.id} style={styles.attCard}>
            <Text style={styles.attDate}>{a.date?.slice(0, 10)}</Text>
            <View style={styles.attTimes}>
              <Text style={styles.attTime}>In: {a.clockIn ? new Date(a.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</Text>
              <Text style={styles.attTime}>Out: {a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</Text>
              {a.status === 'LATE' && <Text style={styles.lateTag}>Late {a.lateMinutes}m</Text>}
            </View>
          </View>
        ))
      )}

      {/* Leave History */}
      <Text style={styles.section}>Leave Requests</Text>
      {(employee.leaveRequests ?? []).length === 0 ? (
        <Text style={styles.empty}>No leave requests.</Text>
      ) : (
        (employee.leaveRequests ?? []).map((r: any) => (
          <View key={r.id} style={styles.leaveCard}>
            <View style={styles.leaveTop}>
              <Text style={styles.leaveType}>{r.type.replace(/_/g, ' ')}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[r.status] ?? '#6b7280') + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] ?? '#6b7280' }]}>{r.status}</Text>
              </View>
            </View>
            <Text style={styles.leaveDates}>{r.startDate?.slice(0, 10)} → {r.endDate?.slice(0, 10)}</Text>
          </View>
        ))
      )}

      {/* Admin Actions */}
      <Text style={styles.section}>Actions</Text>
      <TouchableOpacity style={styles.resetBtn} onPress={resetLeave}>
        <Text style={styles.resetBtnText}>Reset Annual Leave Balance</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleBtn, { backgroundColor: employee.isActive ? '#fee2e2' : '#d1fae5' }]}
        onPress={toggleActive}
      >
        <Text style={[styles.toggleBtnText, { color: employee.isActive ? '#b91c1c' : '#065f46' }]}>
          {employee.isActive ? 'Deactivate Employee' : 'Reactivate Employee'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8f9fb' },
  container: { padding: 20, paddingTop: 48, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { color: '#6b7280', fontSize: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: { color: '#1a56db', fontSize: 16, fontWeight: '600', width: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1a56db', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  empName: { fontSize: 17, fontWeight: '800', color: '#111' },
  empEmail: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  shift: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  activeText: { fontSize: 12, fontWeight: '700' },
  section: { fontSize: 15, fontWeight: '800', color: '#374151', marginBottom: 10, marginTop: 4 },
  balRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  balCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  balNum: { fontSize: 28, fontWeight: '800', color: '#1a56db' },
  balLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 2 },
  balSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  docCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#1a56db' },
  docName: { fontSize: 14, fontWeight: '700', color: '#111' },
  docDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  docLink: { fontSize: 13, color: '#1a56db', fontWeight: '600', marginTop: 6 },
  attCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  attDate: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  attTimes: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  attTime: { fontSize: 13, color: '#6b7280' },
  lateTag: { fontSize: 12, color: '#d97706', fontWeight: '700', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  leaveCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  leaveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  leaveType: { fontSize: 14, fontWeight: '700', color: '#111' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  leaveDates: { fontSize: 12, color: '#6b7280' },
  empty: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  resetBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
  resetBtnText: { color: '#374151', fontSize: 14, fontWeight: '700' },
  toggleBtn: { borderRadius: 12, padding: 15, alignItems: 'center' },
  toggleBtnText: { fontSize: 14, fontWeight: '700' },
})
