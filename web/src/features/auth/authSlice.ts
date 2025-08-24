import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous'
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  status: 'idle',
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User
        accessToken: string
        refreshToken: string
      }>
    ) => {
      const { user, accessToken, refreshToken } = action.payload
      state.user = user
      state.accessToken = accessToken
      state.refreshToken = refreshToken
      state.isAuthenticated = true
      state.status = 'authenticated'
      state.isLoading = false
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload
    },
    clearCredentials: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.status = 'anonymous'
      state.isLoading = false
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      state.status = action.payload ? 'loading' : state.isAuthenticated ? 'authenticated' : 'anonymous'
    },
    setStatus: (state, action: PayloadAction<AuthState['status']>) => {
      state.status = action.payload
    },
  },
})

export const { setCredentials, setAccessToken, clearCredentials, setLoading, setStatus } = authSlice.actions
export default authSlice.reducer
