import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, TextInput, Linking
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { apiFetch } from '../../utils/api'

export default function ReviewLeaveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [leave, setLeave] = useState<any>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiFetch(`/leave/manager/all`)
      .then((d) => setLeave(d.requests.find((r: any) => r.id === id)))
      .finally(() => setLoading(false))
  }, [id])

  const review = async (decision: 'APPROVED' | 'REJECTED') => {
    setSubmitting(true)
    try {
      await apiFetch(`/leave/manager/review/${id}`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNote: note }),
      })
      Alert.alert('Done', `Leave ${decision.toLowerCase()}.`, [{ text: 'OK', onPress: () => router.back() }])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
    setSubmitting(false)
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#1a56db" /></View>
  if (!leave) return <View style={styles.centered}><Text>Not found</Text></View>

  const balance = leave.user?.leaveBalance
  const holidayLeft = balance ? balance.holidayTotal - balance.holidayUsed : 0
  const sickLeft = balance ? balance.sickNoCertLimit - balance.sickNoCertUsed : 0

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Leave</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.empName}>{leave.user?.name}</Text>
        <Text style={styles.empEmail}>{leave.user?.email}</Text>

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
      </View>

      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Leave Type</Text>
        <Text style={styles.fieldValue}>{leave.type.replace('_', ' ')}</Text>

        <Text style={styles.fieldLabel}>Dates</Text>
        <Text style={styles.fieldValue}>
          {leave.startDate.slice(0, 10)} to {leave.endDate.slice(0, 10)} ({leave.totalDays} day{leave.totalDays > 1 ? 's' : ''})
        </Text>

        {leave.reason && (
          <>
            <Text style={styles.fieldLabel}>Reason</Text>
            <Text style={styles.fieldValue}>{leave.reason}</Text>
          </>
        )}

        {leave.documentUrl && (
          <>
            <Text style={styles.fieldLabel}>Justification Document</Text>
            <TouchableOpacity onPress={() => Linking.openURL(leave.documentUrl)}>
              <Text style={styles.docLink}>View Document</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Text style={styles.label}>Review Note (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Add a note for the employee..."
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
        placeholderTextColor="#999"
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
          onPress={() => review('REJECTED')}
          disabled={submitting}
        >
          <Text style={styles.actionBtnText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
          onPress={() => review('APPROVED')}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Approve</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8f9fb' },
  container: { padding: 20, paddingTop: 48, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  back: { color: '#1a56db', fontSize: 16, fontWeight: '600', width: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  empName: { fontSize: 18, fontWeight: '800', color: '#111' },
  empEmail: { fontSize: 13, color: '#9ca3af', marginTop: 2, marginBottom: 14 },
  balRow: { flexDirection: 'row', gap: 10 },
  balChip: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: '#1a56db' },
  balNum: { fontSize: 20, fontWeight: '800', color: '#1a56db' },
  balLabel: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  fieldValue: { fontSize: 15, color: '#111', fontWeight: '500' },
  docLink: { color: '#1a56db', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 20 },
  textArea: { height: 90, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
