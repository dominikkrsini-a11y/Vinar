import admin from 'firebase-admin';
import { config } from '../config.js';

// Single admin app instance for the process. Guarded so this module can be
// imported from multiple places (routes, services) without re-initializing.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

// Requires `Authorization: Bearer <Firebase ID token>`. On success, sets
// req.uid to the verified Firebase uid. This is the ONLY identity check in
// the system — CORS and rate limiting are not authentication.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);

  if (!match) {
    return res.status(401).json({ error: { message: 'Missing Authorization header.' } });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    req.uid = decoded.uid;
    return next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Invalid or expired token.' } });
  }
}
