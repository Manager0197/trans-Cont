# Security Specification for TransLog Pro

## 1. Data Invariants
- A **Conteneur** must always belong to a valid **Dossier**.
- A **Chargement** must reference a valid **Dossier** and **Conteneur**.
- **solde** in **Chargement** must always be `prixTotal - avance`.
- Only authenticated users can read or write data.
- Global **settings** can only be modified by admins (for this app, any authenticated user for simplicity if we don't have roles, but we should ideally check for a `role` field or allow all for now if no role system is requested, but the instruction says "Identity roles... only valid if the user is a current member...").
- Actually, the `App.tsx` shows "Accès Administrateur" for anyone logged in with the demo creds. I'll stick to `isSignedIn()` for now but enforce strict schema validation.

## 2. The "Dirty Dozen" Payloads (Denial Tests)

### Dossiers
1. **Malicious ID**: Create dossier with ID `../../../etc/passwd`.
2. **Missing Field**: Create dossier without `numeroBL`.
3. **Invalid Type**: Set `nbConteneurs` to "ten" (string).
4. **Huge String**: Set `numeroBL` to a 500KB string.
5. **Unauthorized Update**: Try to update `createdAt` of an existing dossier.

### Conteneurs
6. **Orphaned Unit**: Create conteneur with a non-existent `dossierId`.
7. **Identity Spoofing**: Create conteneur and set `numero` to something that bypasses a regex check.

### Chargements
8. **Negative Cost**: Set `prixTotal` to -100.
9. **Mismatched Solde**: Set `prixTotal` to 100, `avance` to 10, but `solde` to 0. (Calculated solde must match).
10. **State Corruption**: Transition `statutPaiement` from "paye" to "non_paye".

### Settings
11. **Value Poisoning**: Set `tva` to 1000%.
12. **Public Write**: Try to write to `/settings/not-global`.

## 3. Test Runner (Conceptual/Draft for firestore.rules.test.ts)
```typescript
// Mock tests for the Dirty Dozen
describe('Firestore Security Rules', () => {
  it('should deny large strings in numeroBL', async () => { ... });
  it('should deny negative costs in chargements', async () => { ... });
  it('should deny orphaned containers', async () => { ... });
  ...
});
```
