import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Environment variables or fallback to dummy values for local development
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'dummy-api-key',
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'sqss-app.firebaseapp.com',
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sqss-app',
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'sqss-app.appspot.com',
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
	appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef'
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to Emulators in development environment
if (import.meta.env.DEV) {
	try {
		// Avoid duplicate connections in hot-reloading
		const emulatorsConnected = (globalThis as any).__EMULATORS_CONNECTED__;
		if (!emulatorsConnected) {
			connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
			connectFirestoreEmulator(db, 'localhost', 8080);
			(globalThis as any).__EMULATORS_CONNECTED__ = true;
			console.log('Firebase Emulators connected.');
		}
	} catch (e) {
		console.warn('Firebase emulator connection warning:', e);
	}
}

export { app, auth, db };
