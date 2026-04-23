import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { router } from 'expo-router'
import { apiFetch } from '../../utils/api'
import { useAuthStore } from '../../stores/auth.store'

export default function CompanySetupScreen() {
  const { refreshMe } = useAuthStore()
  const [companyName, setCompanyName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    const cName = companyName.trim()
    const pName = projectName.trim()
    if (!cName) return Alert.alert('Error', 'Please enter a company name')
    if (!pName) return Alert.alert('Error', 'Please enter at least one project name')

    setLoading(true)
    try {
      const companyData = await apiFetch('/auth/company', {
        method: 'POST',
        body: JSON.stringify({ name: cName }),
      })

      const projectData = await apiFetch('/auth/projects', {
        method: 'POST',
        body: JSON.stringify({ name: pName }),
      })

      await refreshMe()

      Alert.alert(
        'Setup Complete!',
        `Company: ${companyData.company.name}\nProject: ${projectData.project.name}\n\nEmployee Join Code:\n${projectData.project.joinCode}\n\nShare this code with your employees so they can be added to this project.`,
        [{ text: 'Go to Dashboard', onPress: () => router.replace('/(manager)/dashboard') }]
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
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.logo}>Staff Tracker</Text>
        <Text style={styles.heading}>Set Up Your Organisation</Text>
        <Text style={styles.sub}>
          Enter your company name and your first project (e.g. a branch, site, or department). Employees will join using the project's join code.
        </Text>

        <Text style={styles.label}>Company Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. ABC Healthcare Ltd"
          value={companyName}
          onChangeText={setCompanyName}
          autoCapitalize="words"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>First Project Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. London Clinic"
          value={projectName}
          onChangeText={setProjectName}
          autoCapitalize="words"
          placeholderTextColor="#999"
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            You can add more projects from the dashboard after setup.
          </Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create & Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logo: { fontSize: 28, fontWeight: '800', color: '#1a56db', marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '800', color: '#111', marginBottom: 10 },
  sub: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, padding: 16, fontSize: 16, color: '#111',
  },
  infoBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginTop: 24, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#1a56db' },
  infoText: { color: '#1e40af', fontSize: 13, lineHeight: 20 },
  btn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
