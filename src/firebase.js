import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getStorage }    from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword, signOut, GoogleAuthProvider } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey:            "AIzaSyCQ7UrzSxnL5YGxjF1-yOWvS66xG7585Nk",
  authDomain:        "fma-site.firebaseapp.com",
  projectId:         "fma-site",
  storageBucket:     "fma-site.firebasestorage.app",
  messagingSenderId: "445480987446",
  appId:             "1:445480987446:web:132765bb3c4e10885ae197",
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
export const auth    = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const functions = getFunctions(app, "southamerica-east1");
export const analisarSolicitacaoFn = httpsCallable(functions, "analisarSolicitacao");

/**
 * Cria um usuário no Firebase Auth SEM deslogar o admin atual.
 * Usa uma instância secundária do Firebase App que é descartada após o uso.
 * Retorna o uid do novo usuário.
 */
export async function createAuthUserSafe(email, password) {
  const tempApp  = initializeApp(firebaseConfig, "_temp_create_user_" + Date.now());
  const tempAuth = getAuth(tempApp);
  try {
    const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
    const uid  = cred.user.uid;
    await signOut(tempAuth);
    await deleteApp(tempApp);
    return { uid, error: null };
  } catch (e) {
    try { await deleteApp(tempApp); } catch (_) {}
    return { uid: null, error: e };
  }
}
