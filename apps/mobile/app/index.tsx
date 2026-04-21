import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../stores/auth.store'

export default function Index() {
  const { loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage().then(() => {
      const user = useAuthStore.getState().user
      if (user) {
        if (user.role === 'MANAGER' || user.role === 'ADMIN') {
          if (!user.companyId) {
            router.replace('/(manager)/company-setup')
          } else {
            router.replace('/(manager)/dashboard')
          }
        } else {
          router.replace('/(employee)/home')
        }
      } else {
        router.replace('/(auth)/login')
      }
    })
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1a56db" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fb' },
})
