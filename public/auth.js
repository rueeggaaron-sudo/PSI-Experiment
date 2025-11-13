import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDzFnn2VDq_s3pTx4v-3oSss9pu2lyVswE',
  authDomain: 'psi-experiment.firebaseapp.com',
  projectId: 'psi-experiment',
  storageBucket: 'psi-experiment.appspot.com',
  messagingSenderId: '42810399737',
  appId: '1:42810399737:web:f5bd47042de5f50dd5a917',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const AUTH_UID_STORAGE_KEY = 'psi_auth_uid';

const persistencePromise = setPersistence(auth, browserLocalPersistence).catch(error => {
  console.error('[auth] Failed to set persistence', error);
  return null;
});

const persistUid = user => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    if (user && user.uid) {
      localStorage.setItem(AUTH_UID_STORAGE_KEY, user.uid);
    } else {
      localStorage.removeItem(AUTH_UID_STORAGE_KEY);
    }
  } catch (storageError) {
    console.warn('[auth] Failed to persist auth uid', storageError);
  }
};

export const loginWithGoogle = async () => {
  await persistencePromise;
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const logout = async () => {
  await persistencePromise;
  return signOut(auth);
};

export const onAuthStateChanged = (callback, errorCallback) => {
  return onFirebaseAuthStateChanged(
    auth,
    user => {
      persistUid(user);
      if (
        typeof window !== 'undefined' &&
        typeof window.dispatchEvent === 'function' &&
        typeof window.CustomEvent === 'function'
      ) {
        window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
      }
      if (typeof callback === 'function') {
        callback(user);
      }
    },
    error => {
      if (typeof errorCallback === 'function') {
        errorCallback(error);
      }
    },
  );
};

export { auth };
