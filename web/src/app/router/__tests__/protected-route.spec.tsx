import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { vi } from 'vitest'
import ProtectedRoute from '../protected-route'
import authReducer from '@/features/auth/authSlice'

// Mock the router hooks
const mockNavigate = vi.fn()
const mockLocation = { pathname: '/protected', search: '' }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

const createTestStore = (initialState: any) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: initialState,
    },
  })
}

const renderWithProviders = (ui: React.ReactElement, initialState: any) => {
  const store = createTestStore(initialState)
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </Provider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading screen while checking auth', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        isAuthenticated: false,
        isLoading: true,
        user: null,
        accessToken: null,
        refreshToken: null,
        status: 'loading',
      }
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should redirect to login when not authenticated', async () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        status: 'anonymous',
      }
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login?next=%2Fprotected')
    })
  })

  it('should render children when authenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          roles: ['Recruiter'],
          permissions: ['read:candidates'],
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        status: 'authenticated',
      }
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to dashboard when user lacks required role', async () => {
    const { toast } = await import('sonner')
    
    renderWithProviders(
      <ProtectedRoute roles={['Manager']}>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          roles: ['Recruiter'],
          permissions: ['read:candidates'],
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        status: 'authenticated',
      }
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Insufficient permissions to access this page')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should allow access when user has required role', () => {
    renderWithProviders(
      <ProtectedRoute roles={['Manager']}>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          roles: ['Manager'],
          permissions: ['read:all'],
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        status: 'authenticated',
      }
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to dashboard when user lacks required permission', async () => {
    const { toast } = await import('sonner')
    
    renderWithProviders(
      <ProtectedRoute permissions={['manage:users']}>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          roles: ['Recruiter'],
          permissions: ['read:candidates'],
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        status: 'authenticated',
      }
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Insufficient permissions to access this page')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should allow access when user has required permission', () => {
    renderWithProviders(
      <ProtectedRoute permissions={['manage:users']}>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          roles: ['Manager'],
          permissions: ['manage:users'],
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        status: 'authenticated',
      }
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should allow access when user has wildcard permission', () => {
    renderWithProviders(
      <ProtectedRoute permissions={['manage:users']}>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          roles: ['CEO'],
          permissions: ['*'],
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        status: 'authenticated',
      }
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
