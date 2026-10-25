import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  testFirestoreConnection,
} from '../services/firebase';
import {
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  UserProfile,
  saveUserProfileToFirestore,
  seedInitialDatabaseIfEmpty,
} from '../services/database';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  currentUser: UserProfile | null;
  loading: boolean;
  isDbConnected: boolean;
  loginAsPatient: (
    patientId: string,
    name: string,
    age?: number,
    language?: 'English' | 'Hindi' | 'Telugu'
  ) => Promise<void>;
  loginAsNurse: (name?: string, badgeId?: string) => Promise<void>;
  logout: () => Promise<void>;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isLoginModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = '11th_hour_current_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Initialize Firebase connection and auth listener
  useEffect(() => {
    let mounted = true;

    async function init() {
      const connected = await testFirestoreConnection();
      if (mounted) setIsDbConnected(connected);
      if (connected) {
        await seedInitialDatabaseIfEmpty();
      }
    }
    init();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (mounted) {
        setFirebaseUser(user);
        if (user) {
          // If session exists, sync user profile
          if (!currentUser || currentUser.uid !== user.uid) {
            const profile: UserProfile = {
              uid: user.uid,
              displayName: currentUser?.displayName || 'Registered Patient',
              role: currentUser?.role || 'patient',
              patientId: currentUser?.patientId || `P-${user.uid.slice(0, 4).toUpperCase()}`,
              preferredLanguage: currentUser?.preferredLanguage || 'English',
              createdAt: new Date().toISOString(),
            };
            setCurrentUser(profile);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
            await saveUserProfileToFirestore(profile);
          }
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const loginAsPatient = async (
    patientId: string,
    name: string,
    age?: number,
    language: 'English' | 'Hindi' | 'Telugu' = 'English'
  ) => {
    try {
      let uid = firebaseUser?.uid;
      if (!uid) {
        try {
          const anon = await signInAnonymously(auth);
          uid = anon.user.uid;
        } catch {
          uid = `usr-${patientId.toLowerCase()}`;
        }
      }

      const profile: UserProfile = {
        uid,
        displayName: name,
        role: 'patient',
        patientId,
        age: age || 42,
        preferredLanguage: language,
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(profile);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
      await saveUserProfileToFirestore(profile);
      setIsLoginModalOpen(false);
    } catch (err) {
      console.error('Patient login failed:', err);
    }
  };

  const loginAsNurse = async (
    name = 'RN Sarah Jenkins, BSN (Charge Nurse)',
    badgeId = 'RN-4409'
  ) => {
    try {
      let uid = firebaseUser?.uid;
      if (!uid) {
        try {
          const anon = await signInAnonymously(auth);
          uid = anon.user.uid;
        } catch {
          uid = `nurse-${badgeId.toLowerCase()}`;
        }
      }

      const profile: UserProfile = {
        uid,
        displayName: name,
        role: 'nurse',
        patientId: badgeId,
        createdAt: new Date().toISOString(),
      };

      setCurrentUser(profile);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
      await saveUserProfileToFirestore(profile);
      setIsLoginModalOpen(false);
    } catch (err) {
      console.error('Nurse login failed:', err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        currentUser,
        loading,
        isDbConnected,
        loginAsPatient,
        loginAsNurse,
        logout,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        isLoginModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
