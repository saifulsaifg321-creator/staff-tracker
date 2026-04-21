import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { apiFetch } from '../../utils/api'

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
}

export default function MyLeavesScreen() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/leave/my')
      .then((d) => setLeaves(d.requests))
      .finally(() => setLoading(false))
  }, [])

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Leave History</Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#1a56db" style={{ marginTop: 40 }} />
      ) : leaves.length === 0 ? (
        <Text style={styles.empty}>No leave requests yet.</Text>
      ) : (
        leaves.map((l) => (
          <View key={l.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.type}>{l.type.replace('_', ' ')}</Text>
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[l.status] + '22' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[l.status] }]}>{l.status}</Text>
              </View>
            </View>
            <Text style={styles.dates}>
              {l.startDate.slice(0, 10)} → {l.endDate.slice(0, 10)} ({l.totalDays} day{l.totalDays > 1 ? 's' : ''})
            </Text>
            {l.reason ? <Text style={styles.reason}>{l.reason}</Text> : null}
            {l.documentUrl ? (
              <Text style={styles.docLink}>Document uploaded</Text>
            ) : null}
            {l.reviewNote ? <Text style={styles.reviewNote}>Note: {l.reviewNote}</Text> : null}
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8f9fb' },
  container: { padding: 20, paddingTop: 48, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  back: { color: '#1a56db', fontSize: 16, fontWeight: '600', width: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  empty: { textAlign: 'center', color: '#9ca3af', fontSize: 16, marginTop: 60 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  type: { fontSize: 15, fontWeight: '700', color: '#111' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  dates: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  reason: { fontSize: 13, color: '#374151', marginTop: 4 },
  docLink: { fontSize: 12, color: '#1a56db', marginTop: 4, fontWeight: '600' },
  reviewNote: { fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
})
