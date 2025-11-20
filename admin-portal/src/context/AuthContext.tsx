import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

type UserProfile = {
  id: string;
  role?: string;
  email?: string;
  name?: string;
  username?: string;
};

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signOutUser: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signOutUser: async () => {},
  error: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setFirebaseUser(user);
      setError(null);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data() as UserProfile | undefined;
          setProfile({
            ...(data ?? {}),
            id: profileSnap.id,
          });
        } else {
          setProfile({
            id: user.uid,
            email: user.email ?? '',
          });
        }
      } catch (err) {
        console.error('Error loading profile', err);
        setError('Không thể tải thông tin người dùng');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      error,
      isAdmin: (profile?.role ?? '').toLowerCase() === 'admin',
      signOutUser: () => signOut(auth),
    }),
    [firebaseUser, profile, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

