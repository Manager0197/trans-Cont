import { auth } from "./firebase";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const getSafeAuthInfo = () => {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      return {
        userId: user.uid,
        email: user.email || undefined,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        tenantId: user.tenantId || undefined,
        providerInfo: user.providerData.map(p => ({
          providerId: p.providerId,
          uid: p.uid,
          email: p.email,
        }))
      };
    } catch (e) {
      return "Auth info inaccessible";
    }
  };

  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: getSafeAuthInfo(),
    timestamp: new Date().toISOString()
  };

  // Safe stringify to avoid circular references
  const safeJson = (obj: any) => {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return "[Circular]";
        cache.add(value);
      }
      return value;
    });
  };

  const serialized = safeJson(errInfo);
  console.error('Firestore Error: ', serialized);
  throw new Error(serialized);
}
