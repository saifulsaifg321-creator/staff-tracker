import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { router } from 'expo-router'
import { apiFetch } from '../../utils/api'
import { useAuthStore } from '../../stores/auth.store'

export default function CompanySetupScreen() {
  const { refreshMe } = useAuthStore()
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    const name = companyName.trim()
    if (!name) return Alert.alert('Error', 'Please enter a company name')
    setLoading(true)
    try {
      const data = await apiFetch('/auth/company', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      await refreshMe()
      Alert.alert(
        'Company Created!',
        `Your company "${data.company.name}" is ready.\n\nJoin code: ${data.company.joinCode}\n\nShare this code with employees so they can be added to your company.`,
        [{ text: 'Continue', onPress: () => router.replace('/(manager)/dashboard') }]
      )
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Staff Tracker</Text>
        <Text style={styles.heading}>Set Up Your Company</Text>
        <Text style={styles.sub}>
          Give your company a name. A unique join code will be generated that you can share with other managers and employees.
        </Text>

        <Text style={styles.label}>Company Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Digital Attendance Ltd"
          value={companyName}
          onChangeText={setCompanyName}
          autoCapitalize="words"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create Company</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },
  logo: { fontSize: 28, fontWeight: '800', color: '#1a56db', marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: '#111', marginBottom: 10 },
  sub: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 24, color: '#111',
  },
  btn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
