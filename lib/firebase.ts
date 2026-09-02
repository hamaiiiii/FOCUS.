import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAdl5B6YYG1Vgtxy46VOauwQX9kR9vpihg",
  authDomain: "focus-app-b38bd.firebaseapp.com",
  projectId: "focus-app-b38bd",
  storageBucket: "focus-app-b38bd.firebasestorage.app",
  messagingSenderId: "1024686822231",
  appId: "1:1024686822231:web:bd2fe60935b97ee50f2412"
};

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

//TODO: 公開前削除する(Googleアカウントを毎回選ばせるやつ)
googleProvider.setCustomParameters({
  prompt: "select_account",
})
//

export const db = getFirestore(app)
