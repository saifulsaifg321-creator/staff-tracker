import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { apiFetch } from '../utils/api'

interface User {
  id: string
  name: string
  email: string
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN'
  companyId: string | null
  projectId: string | null
  shiftStartTime: string
  shiftEndTime: string
  company?: { id: string; name: string; joinCode: string } | null
  project?: { id: string; name: string; joinCode: string } | null
  leaveBalance?: {
    holidayTotal: number
    holidayUsed: number
    sickNoCertUsed: number
    sickNoCertLimit: number
  }
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
  refreshMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  login: async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    await SecureStore.setItemAsync('token', data.token)
    set({ token: data.token, user: data.user })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token')
    set({ token: null, user: null })
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync('token')
    if (!token) return
    try {
      const data = await apiFetch('/auth/me')
      set({ token, user: data.user })
    } catch {
      await SecureStore.deleteItemAsync('token')
    }
  },

  refreshMe: async () => {
    const data = await apiFetch('/auth/me')
    set({ user: data.user })
  },
}))
