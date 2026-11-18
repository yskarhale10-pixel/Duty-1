# Security Specification — Karmchari Bus Duty Diary

## 1. Data Invariants
1. **Strict Ownership**: Every profile (`/profiles/{userId}`) and duty entry (`/duties/{dutyId}`) is private PII/personal diary data belonging strictly to the authenticated user (`request.auth.uid == userId` or `ownerId == request.auth.uid`) with a verified Google email (`request.auth.token.email_verified == true`).
2. **Zero Cross-User Reads**: No user may `get`, `list`, `create`, `update`, or `delete` another user's profile or duty entries. Collection-wide `list` on `/profiles` is unconditionally denied (`allow list: if false`). Collection `list` on `/duties` enforces `resource.data.ownerId == request.auth.uid`.
3. **Immutable Identity & Creation Timestamp**: `ownerId` and `createdAt` can never be changed after creation. `createdAt` on create and `updatedAt` on create/update must strictly equal `request.time`.
4. **Volumetric & Schema Strictness**: Only allowlisted keys are permitted (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update). All strings enforce `.size()` bounds, enums enforce exact values (`Driver` | `Conductor`), and document IDs match `^[a-zA-Z0-9_\-]+$` up to 128 chars.

## 2. The "Dirty Dozen" Adversarial Payloads
All 12 payloads below MUST fail with `PERMISSION_DENIED`:

1. **Unauthenticated Profile Create**: `auth = null` writing to `/profiles/user_1`.
2. **Unverified Email Write**: `auth = { uid: 'user_1', token: { email_verified: false } }` writing to `/profiles/user_1`.
3. **Profile Identity Spoofing**: `auth = { uid: 'user_1' }` writing `/profiles/user_2` or setting `ownerId: 'user_2'`.
4. **Shadow Field Injection on Profile**: Valid profile payload + `{ "isAdmin": true }` or `{ "role": "supervisor" }`.
5. **Cross-User PII Read**: `auth = { uid: 'user_2' }` calling `get(/profiles/user_1)` or `list(/profiles)`.
6. **Profile Timestamp Forgery**: Creating `/profiles/user_1` with client-forged `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
7. **Duty ID Poisoning**: Creating `/duties/bad$id..with/spaces` or a 500-char document ID.
8. **Duty Invalid Post Enum**: Creating `/duties/d1` with `crewPost: "Inspector"` instead of `"Driver"` or `"Conductor"`.
9. **Duty Unbounded String / DoW Attack**: Creating `/duties/d2` with `remark` > 500 chars or `photoDataUrl` > 120000 chars.
10. **Duty Owner Reassignment on Update**: `user_1` updating `/duties/d1` and mutating `ownerId` to `'user_2'` or changing `createdAt`.
11. **Unscoped List Query on Duties**: `user_1` attempting `list(/duties)` without filtering `where('ownerId', '==', 'user_1')`.
12. **Cross-User Duty Delete**: `user_2` attempting `delete(/duties/d1)` where `d1.ownerId == 'user_1'`.
