import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { router } from 'expo-router'
import { apiFetch } from '../../utils/api'

export default function AddEmployeeScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shiftStart, setShiftStart] = useState('09:00')
  const [shiftEnd, setShiftEnd] = useState('17:00')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'Please fill in all fields')
    if (password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters')

    setLoading(true)
    try {
      await apiFetch('/auth/manager/add-user', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: email.trim().toLowerCase(),
          password,
          role: 'EMPLOYEE',
          shiftStartTime: shiftStart,
          shiftEndTime: shiftEnd,
        }),
      })
      Alert.alert('Success', `Employee account created for ${name}`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Employee</Text>
          <View style={{ width: 48 }} />
        </View>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Smith"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. john@company.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 8 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Shift Start Time</Text>
        <TextInput
          style={styles.input}
          placeholder="09:00"
          value={shiftStart}
          onChangeText={setShiftStart}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Shift End Time</Text>
        <TextInput
          style={styles.input}
          placeholder="17:00"
          value={shiftEnd}
          onChangeText={setShiftEnd}
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create Employee Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8f9fb' },
  container: { padding: 20, paddingTop: 48, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  back: { color: '#1a56db', fontSize: 16, fontWeight: '600', width: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 15, color: '#111' },
  btn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
