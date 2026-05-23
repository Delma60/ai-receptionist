import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('❌ Missing Firebase Admin environment variables. Please check your .env.local file and restart your server.');
}

const firebaseAdminConfig = {
	credential: cert({
		project_id: projectId,
		client_email: clientEmail,
		private_key: privateKey.replace(/\\n/g, '\n'),
	} as any),
};

const adminApp = !getApps().length ? initializeApp(firebaseAdminConfig) : getApp();
const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

export { adminApp, adminDb, adminAuth };
