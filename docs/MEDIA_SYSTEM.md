# Media System (GridFS)

Replaces the previous local-disk (`server/uploads/`) storage. Every uploaded
file in the platform — avatars, course thumbnails/covers, article covers,
success-story images, the academy logo, homework attachments, payment proofs
— is stored in MongoDB GridFS and served through one endpoint.

## Architecture

```
Browser (multipart/form-data)
  → Express route (unchanged field names: avatar, thumbnail, cover, image, files, logo, paymentProof)
  → Multer (memoryStorage — buffer only, never written to disk)
  → media.service.uploadBuffer() — magic-byte validation, then streams into GridFS
  → MongoDB GridFS (bucket "media" → media.files / media.chunks collections)
  → the owning document stores only the returned ObjectId
```

Reading it back:

```
Client calls getFileUrl(course.thumbnailImage)     // value is a bare ObjectId or null
  → constants.js detects it's a 24-hex-char id
  → builds `${BACKEND_URL}/api/v1/media/<id>`
  → GET /api/v1/media/:id → media.controller.getMedia
  → public file: streams immediately
  → private file: requires req.user to be the uploader, an admin, or allow-listed
```

## Why fields keep their old names

`User.avatar`, `Course.thumbnailImage`/`coverImage`, `Article.coverImage`,
`SuccessStory.cards[].image`/`banner.image` are **retyped, not renamed** —
they went from `String` (a disk path) to `ObjectId` (a GridFS file id), same
field name. This was deliberate: dozens of existing `.select()`/`.populate()`
projections across the codebase already name these exact fields, and an
ObjectId serializes to a plain hex string in JSON — which `getFileUrl()`
already recognizes. Renaming would have required auditing and updating every
one of those call sites for no functional gain.

Narrower-surface fields *were* renamed for clarity, since they have few read
sites and needed new privacy semantics anyway: `EnrollmentRequest.paymentProofUrl` → `paymentProofId`, `Homework` submission `attachments[].url` → `fileId`, and the new `AcademySettings.logoId` (no prior field existed).

## Public vs. private files

Every GridFS file carries `metadata: { category, uploadedBy, private, allowedUserIds }`.

- **Public** (avatars, course/article images, success-story images, the logo): served unauthenticated, cached `public, max-age=31536000, immutable` — safe because a "replace" always writes a brand-new id, so any given id's bytes never change.
- **Private** (payment proofs, homework attachments): `GET /api/v1/media/:id` requires `req.user` to be an admin, the uploader, or in `allowedUserIds` (e.g. a homework's teacher) — otherwise 401/403. Served `Cache-Control: private, no-cache, must-revalidate`.
- Plain `<img src>` can't send an `Authorization` header, so private files can't be displayed with a bare `<img>` tag. `client/src/components/ui/PrivateImage.jsx` and `client/src/utils/privateMedia.js` fetch them with an authenticated request and expose the result as a local blob URL/download instead.

## Streaming, caching, validation

- `media.controller.js` supports HTTP Range requests (206 Partial Content) — needed for homework audio/video scrubbing — plus conditional GET via ETag (`"<id>-<length>"`, 304 on match).
- `media.service.js` checks the uploaded buffer's actual magic bytes against its declared MIME type before accepting it into GridFS (multer's `fileFilter` only ever sees the client-supplied, spoofable `Content-Type` header).
- Deleting/replacing an image now actually deletes the old GridFS file (`deleteFile()`), closing a real disk-leak bug the old local-storage implementation had everywhere except avatars. Duplicating a course/article no longer copies the source's image id — GridFS files aren't reference-counted, so sharing an id across two documents would mean deleting/replacing either one's image silently breaks the other's.

## Environment variables

`CLIENT_URL` (falls back to the older `FRONTEND_URL`) drives CORS, email
links, and Socket.io's CORS origin. `VITE_API_URL` (frontend, Vite-inlined at
build time) drives every `getFileUrl()` call. Changing either one and
rebuilding the frontend is the *only* thing a domain/VPS migration requires —
the database never needs a migration, because it only ever stores bare
GridFS ids, never a domain or path.

## Migrating pre-existing local-disk references

`server/src/scripts/migrateImagesToGridFS.js` — idempotent, safe to re-run.
Reads any remaining `/uploads/...` string values still on disk, re-uploads
them into GridFS, and replaces the field with the new id. Does not delete
`server/uploads/` itself; remove that directory manually once you've
confirmed nothing needs it.
