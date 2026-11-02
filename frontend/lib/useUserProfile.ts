import { useEffect, useState } from 'react'
import { getUserId } from './auth'
import { apiFetch } from './api'
import { useZustandStore, type UserProfile } from './store'

/**
 * Hook to fetch and manage user profile data
 * Automatically fetches user data on mount and caches it in Zustand store
 */
export function useUserProfile() {
  const { userProfile, setUserProfile } = useZustandStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user profile from backend
  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const userId = await getUserId()
      if (!userId) {
        throw new Error('No user ID found')
      }

      // Call /users/me endpoint
      const response = await apiFetch('/users/me', { auth: true })

      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      const data = await response.json() as { user: UserProfile }
      const profile: UserProfile = data.user

      setUserProfile(profile)
      return profile
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user profile'
      setError(errorMessage)
      console.error('Error fetching user profile:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Upload avatar
  const uploadAvatar = async (file: File | Blob) => {
    try {
      setLoading(true)
      setError(null)

      const formData = new FormData()
      formData.append('avatar', file as any)

      const response = await apiFetch('/users/avatar', {
        method: 'POST',
        auth: true,
        body: formData as any,
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error || 'Failed to upload avatar')
      }

      const data = await response.json() as { avatarUrl: string }

      // Update user profile with new avatar URL
      if (userProfile) {
        setUserProfile({ ...userProfile, avatarUrl: data.avatarUrl })
      }

      return data.avatarUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar'
      setError(errorMessage)
      console.error('Error uploading avatar:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount if not already loaded
  useEffect(() => {
    if (!userProfile && !loading) {
      fetchUserProfile()
    }
  }, [])

  return {
    userProfile,
    loading,
    error,
    refetch: fetchUserProfile,
    uploadAvatar,
  }
}
