"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    profile: Omit<UserProfile, "createdAt">
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile: (profile: Omit<UserProfile, "createdAt">) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      unsubscribeProfile?.();

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      unsubscribeProfile = onSnapshot(
        doc(db, "users", currentUser.uid),
        (snapshot) => {
          setProfile(snapshot.exists() ? toProfile(snapshot.data()) : null);
          setLoading(false);
        },
        () => setLoading(false)
      );
    });
    return () => {
      unsubscribeProfile?.();
      unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      throw new Error(mapAuthError(error));
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    profile: Omit<UserProfile, "createdAt">
  ) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: profile.displayName });
      await setDoc(doc(db, "users", credential.user.uid), {
        ...profile,
        createdAt: new Date().toISOString(),
      });
    } catch (error: unknown) {
      throw new Error(mapAuthError(error));
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const profileReference = doc(db, "users", credential.user.uid);
    const existingProfile = await getDoc(profileReference);
    if (!existingProfile.exists()) {
      await setDoc(profileReference, {
        displayName: credential.user.displayName || "Leitor(a)",
        city: "",
        state: "",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const updateUserProfile = async (nextProfile: Omit<UserProfile, "createdAt">) => {
    if (!auth.currentUser) throw new Error("Você precisa estar autenticado para editar o perfil.");
    try {
      await updateProfile(auth.currentUser, { displayName: nextProfile.displayName });
      await setDoc(doc(db, "users", auth.currentUser.uid), nextProfile, { merge: true });
    } catch (error: unknown) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code === "permission-denied") throw new Error("Sem permissão para salvar o perfil. Publique as regras do Firestore incluídas no projeto.");
      throw new Error("Não foi possível atualizar o perfil. Tente novamente.");
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, updateUserProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function mapAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/email-already-in-use") return "E-mail já cadastrado no sistema";
  if (code === "auth/invalid-email") return "Por favor, insira um e-mail válido";
  if (code === "auth/weak-password") return "A senha deve ter pelo menos 8 caracteres, letra, número e caractere especial.";
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") return "E-mail ou senha inválidos.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

function toProfile(data: Record<string, unknown>): UserProfile {
  const legacyLocation = typeof data.location === "string" ? data.location : "";
  const [legacyCity = "", legacyState = ""] = legacyLocation.split(",").map((value) => value.trim());
  return {
    displayName: typeof data.displayName === "string" ? data.displayName : "Leitor(a)",
    city: typeof data.city === "string" ? data.city : legacyCity,
    state: typeof data.state === "string" ? data.state : legacyState,
    ...(typeof data.createdAt === "string" ? { createdAt: data.createdAt } : {}),
  };
}
