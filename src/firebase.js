import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Substitua pelos dados do SEU projeto Firebase.
// Console: https://console.firebase.google.com -> Configurações do projeto -> Seus apps -> SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkeTViMZ0oIW25mEXbfvqh6zcesSsHqmQ",
  authDomain: "controle-hora-extra.firebaseapp.com",
  databaseURL: "https://controle-hora-extra-default-rtdb.firebaseio.com",
  projectId: "controle-hora-extra",
  storageBucket: "controle-hora-extra.firebasestorage.app",
  messagingSenderId: "27997142099",
  appId: "1:220962335637:web:784a4a0a03d3cbcb6aa49c",
  measurementId: "G-F0QTEB9N7R"
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)
export default app
