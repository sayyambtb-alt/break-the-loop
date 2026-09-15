# Mission reliability and privacy release

This change is a coordinated client/database release, stacked on the redesign in PR #46. It has not been applied to production. Keep the existing redesign preview available for the owner while this change is reviewed.

## What changes

- The server assigns quests, applies city/time filters, and records each accepted mission. Refreshing restores the mission and attached proof. Completion retries return the original reward.
- Chat and room rosters require verified membership. Quest and Explore match separately; friend invites use real private rooms. Leaving updates the actual remaining participants.
- New proofs use private `MissionProofs` storage. Publishing a completed photo in the Feed is an explicit checkbox. Existing `Proofs` photos retain their previous public visibility.
- Account changes discard the previous account's proof/chat UI. Failed reports, messages, and Feed loads have visible error/retry states. Failed photo deletion remains in `proof_cleanup` for a later Storage API retry.
- Native modal dialogs manage keyboard focus. Mobile buttons have larger targets; Saved has a single active navigation state; share-sheet cancellation does not download a file.
- New handles are unique without depending on the incomplete historical schema snapshot. Existing duplicate handles are not silently renamed; ambiguous public handle lookups return no profile. Resolving legacy duplicates and adding a database unique index can follow after the affected owners choose their handles.
- General branding supports expansion; only Mumbai is enabled. Adding another city still requires curated content, a city selection UI, and checking every city-scoped discovery endpoint. This is not a claim that other cities have launched.

## Validation

Run `npm ci`, `npm run lint`, `npm test`, `npm run test:db`, and `npm run build`.

The database suite runs the actual migration in PGlite PostgreSQL with a minimal Supabase schema fixture and deliberately permissive legacy grants. It covers role access, room membership, private invitations, server rewards, completion retries, proof ownership/visibility/deletion, time windows, handle collisions, and public-history limits.

It does **not** emulate Supabase Auth, the Storage object service, Realtime delivery, or independent concurrent database connections. The historical snapshot lists dependent functions out of order and omits function terminators and a production foreign key; the fixture normalizes these defects only for its isolated database. It is not a replacement for a staging migration.

The app suite exercises account changes during completion, accepted-proof recovery, retry after failed completion, repeated taps, accepted rooms surviving occupancy changes, failed chat drafts, reports, Feed retry, modal cancellation/focus restoration, and share cancellation. jsdom does not prove native browser focus trapping or iPhone layout.

Local lint, TypeScript, app tests, database tests, and the production build passed. Fresh visual verification was blocked because the connected browser rejected the local development address. Actual iPhone/Safari and two-device checks remain necessary.

## Release sequence

1. Recheck the current repository and live schema before merging; another assistant may have changed either. Compare the database migration ledger with the repository. Do not blindly replay the historical baseline over an existing project.
2. Apply the exact committed `supabase/migrations/20260913150519_secure_missions_and_rooms.sql` to an isolated Supabase staging project containing the current schema. Use the migration workflow and retain the file in git.
3. Build a staging preview against that project's URL and publishable key. Verify guest Solo and Explore, email verification/recovery, photo upload/reload/completion, private versus public Feed visibility, deletion through the real Storage API, and both players in Duo/Squad (random and invited). Test simultaneous joining/completing using separate connections. Verify signed photo URLs work with the real Storage service.
4. On iPhone Safari and an installed PWA, check camera capture/EXIF, keyboard/modal scrolling, safe areas, bottom navigation, and native sharing. Have the owner's legal reviewer check the Terms and revised privacy text before wider launch; this engineering work is not that review.
5. After approval, take a database backup, arrange a brief maintenance window, apply the committed migration to production, and immediately promote the matching verified client. Older open clients must refresh: the previous `complete_mission` RPC deliberately returns a refresh error. Existing users without a server assignment will need to start a new mission.
6. Smoke-test the production flows and monitor RPC/Storage errors and pending proof cleanup. A failed Storage deletion remains queued; owners/admins retry when the app initializes or another deletion runs. Background cleanup and unattached-upload retention are separate operational follow-ups, not a deployed scheduler in this patch.

After the migration, do not roll back only the client or re-enable the old completion API. Prefer a forward fix; restoring a backup requires reconciling any newly created missions and photos. No live database write, main merge, or production promotion was performed during this review.
