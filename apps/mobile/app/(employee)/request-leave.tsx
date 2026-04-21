import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, TextInput
} from 'react-native'
import { router } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { apiFetch } from '../../utils/api'
import { useAuthStore } from '../../stores/auth.store'

const LEAVE_TYPES = [
  { value: 'HOLIDAY', label: 'Annual Holiday', color: '#1a56db' },
  { value: 'SICK_NO_DOC', label: 'Sick Leave (no doc)', color: '#f59e0b' },
  { value: 'SICK_WITH_DOC', label: 'Sick Leave (with doc)', color: '#10b981' },
  { value: 'EMERGENCY', label: 'Emergency', color: '#ef4444' },
]

export default function RequestLeaveScreen() {
  const { refreshMe } = useAuthStore()
  const [leaveType, setLeaveType] = useState('HOLIDAY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [docFile, setDocFile] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] })
    if (!res.canceled && res.assets?.[0]) setDocFile(res.assets[0])
  }

  const handleSubmit = async () => {
    if (!startDate || !endDate) return Alert.alert('Error', 'Please enter start and end dates (YYYY-MM-DD)')
    setLoading(true)
    try {
      const request = await apiFetch('/leave/request', {
        method: 'POST',
        body: JSON.stringify({ type: leaveType, startDate, endDate, reason }),
      })

      if (docFile && (leaveType === 'SICK_WITH_DOC' || leaveType === 'SICK_NO_DOC')) {
        const form = new FormData()
        form.append('file', { uri: docFile.uri, name: docFile.name, type: docFile.mimeType } as any)
        const token = (await import('expo-secure-store')).getItemAsync('token')
        await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'}/leave/request/${request.id}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${await token}` },
          body: form,
        })
      }

      await refreshMe()
      Alert.alert('Submitted', 'Your leave request has been sent to your manager.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
    setLoading(false)
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Request Leave</Text>
        <View style={{ width: 48 }} />
      </View>

      <Text style={styles.label}>Leave Type</Text>
      <View style={styles.typeRow}>
        {LEAVE_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.typeBtn, leaveType === t.value && { backgroundColor: t.color, borderColor: t.color }]}
            onPress={() => setLeaveType(t.value)}
          >
            <Text style={[styles.typeBtnText, leaveType === t.value && { color: '#fff' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Start Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={startDate}
        onChangeText={setStartDate}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>End Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={endDate}
        onChangeText={setEndDate}
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>Reason (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe the reason..."
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={3}
        placeholderTextColor="#999"
      />

      {(leaveType === 'SICK_WITH_DOC' || leaveType === 'SICK_NO_DOC') && (
        <>
          <Text style={styles.label}>Doctor's Note / Justification</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
            <Text style={styles.uploadBtnText}>
              {docFile ? docFile.name : 'Upload Document (PDF or Image)'}
            </Text>
          </TouchableOpacity>
          {leaveType === 'SICK_WITH_DOC' && !docFile && (
            <Text style={styles.hint}>A doctor's note is required for this leave type.</Text>
          )}
        </>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8f9fb' },
  container: { padding: 20, paddingTop: 48, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  back: { color: '#1a56db', fontSize: 16, fontWeight: '600', width: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15, color: '#111' },
  textArea: { height: 90, textAlignVertical: 'top' },
  uploadBtn: { backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#93c5fd', borderRadius: 12, padding: 14, alignItems: 'center', borderStyle: 'dashed' },
  uploadBtnText: { color: '#1a56db', fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, color: '#ef4444', marginTop: 6 },
  submitBtn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
