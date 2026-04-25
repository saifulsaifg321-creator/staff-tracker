import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { router } from 'expo-router'
import { apiFetch } from '../../utils/api'

export default function AddProjectScreen() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Please enter a project name')
    setLoading(true)
    try {
      const data = await apiFetch('/auth/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      Alert.alert(
        'Project Created!',
        `Project: ${data.project.name}\n\nEmployee Join Code:\n${data.project.joinCode}\n\nShare this code with employees to add them to this project.`,
        [{ text: 'OK', onPress: () => router.back() }]
      )
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
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Project</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            A project is a branch, site, or department within your company. Each project gets its own join code for employees.
          </Text>
        </View>

        <Text style={styles.label}>Project Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Manchester Office"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create Project</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb', padding: 20, paddingTop: 48 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  back: { color: '#1a56db', fontSize: 16, fontWeight: '600', width: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  infoBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#1a56db' },
  infoText: { color: '#1e40af', fontSize: 13, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 15, color: '#111', marginBottom: 28 },
  btn: { backgroundColor: '#1a56db', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
