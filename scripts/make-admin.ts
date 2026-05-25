import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = !getApps().length
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      } as any),
    })
  : getApp();

const auth = getAuth(app);

async function makeAdmin(email: string) {
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { role: 'admin' });

  // Verify that the claims were successfully applied
  const updatedUser = await auth.getUser(user.uid);
  console.log(`✅ Set role: admin for ${email} (uid: ${user.uid})`);
  console.log('Current Custom Claims:', updatedUser.customClaims);
  process.exit(0);
}

makeAdmin('oladeleofficial@gmail.com').catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});