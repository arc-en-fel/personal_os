import { Session } from '@supabase/supabase-js';
import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';
import { startReminderScheduler, stopReminderScheduler } from '@/src/lib/reminder-scheduler';
import { configureNotificationHandler } from '@/src/lib/notification-service';
import { checkForUpdates, getUpdateInfo } from '@/src/lib/updateService';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Don't configure notifications at startup (prevents Expo Go warnings)
    // Notifications will be configured when first reminder is scheduled
    
    // Initialize app
    const initialize = async () => {
      try {
        // Log update info for diagnostics
        const updateInfo = await getUpdateInfo();
        console.log('[App] Update info:', updateInfo);

        // Check for OTA updates (non-blocking, won't crash if unavailable)
        const updateResult = await checkForUpdates();
        if (updateResult.error) {
          console.log('[App] Update check skipped or failed, continuing startup');
        } else if (updateResult.isAvailable) {
          console.log('[App] Update downloaded, will be applied on next restart');
        }
      } catch (error) {
        console.warn('[App] Update check error:', error);
        // Continue startup even if update check fails
      }

      // Initialize Supabase
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session?.user.id) {
          startReminderScheduler(data.session.user.id);
        }
        setLoading(false);
      });
    };

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        startReminderScheduler(nextSession.user.id);
      } else {
        stopReminderScheduler();
      }
    });
    return () => {
      listener.subscription.unsubscribe();
      stopReminderScheduler();
    };
  }, []);

  const authAction = async (action: 'signIn' | 'signUp', email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: 'Add Supabase environment variables to enable authentication.' };
    const result = action === 'signIn'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    return { error: result.error?.message ?? null };
  };

  return <AuthContext.Provider value={{
    session, loading, configured: isSupabaseConfigured,
    signIn: (email, password) => authAction('signIn', email, password),
    signUp: (email, password) => authAction('signUp', email, password),
    signOut: async () => { await supabase.auth.signOut(); },
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
