import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getStorage }    from "firebase/storage";
import { getAuth }       from "firebase/auth";

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
