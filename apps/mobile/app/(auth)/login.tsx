import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../stores/auth.store'

export default function LoginScreen() {
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) return setError('Enter email and password')
    setLoading(true)
    setError('')
    try {
      await login(email.trim().toLowerCase(), password)
      const user = useAuthStore.getState().user
      if (user?.role === 'MANAGER' || user?.role === 'ADMIN') {
        if (!user.companyId) {
          router.replace('/(manager)/company-setup')
        } else {
          router.replace('/(manager)/dashboard')
        }
      } else {
        router.replace('/(employee)/home')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Staff Tracker</Text>
        <Text style={styles.sub}>Sign in to your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },
  logo: { fontSize: 36, fontWeight: '800', color: '#1a56db', marginBottom: 6 },
  sub: { fontSize: 16, color: '#666', marginBottom: 32 },
  error: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 14, color: '#111',
  },
  btn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
