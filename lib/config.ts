/**
 * Application configuration
 */

// Convert string env variables to proper boolean values
const getBooleanEnv = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key]
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true'
}

export const config = {
  auth: {
    signupEnabled: getBooleanEnv('NEXT_PUBLIC_SIGNUP_ENABLED', false),
  },
  api: {
    url: process.env.NEXT_PUBLIC_API_URL,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
} 