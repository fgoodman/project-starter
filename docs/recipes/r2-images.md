# R2 images

Users upload images through the Worker to a Cloudflare R2 bucket.

**Use it when** users upload images.

**Source:** `percolatus/client/src/lib/image.ts` and `percolatus/server/src/routes/images.ts`.

## Steps

1. Create the bucket, and add it to `server/wrangler.jsonc`:

   ```bash
   npx wrangler r2 bucket create my-app-images
   ```

   ```jsonc
   "r2_buckets": [{ "binding": "IMAGES", "bucket_name": "my-app-images" }]
   ```

   `wrangler dev` uses a local simulator, so development doesn't touch the real bucket.

2. Shrink images on the client before uploading. Copy `image.ts` to `client/src/lib/`. It limits the long edge to 1440px and encodes WebP at 80% quality. Safari can show WebP but not make it, so it falls back to JPEG.

3. Copy `images.ts` to `server/src/routes/`, and update its key pattern. It should:
   - Accept only JPEG, PNG and WebP, by content type
   - Reject empty uploads and anything over a size limit, such as 10 MB, checking the real size and not just the header
   - Store under an unguessable key, such as `images/<uid>/<uuid>.webp`
   - Require sign-in to upload, and check a key belongs to the user before attaching it to anything

4. Serve images through the Worker, with `cache-control: public, max-age=31536000, immutable`, `x-content-type-options: nosniff`, and ETag support.

5. Reserve the image's space in the page, so nothing shifts when it loads and a broken image still holds its place. Crop only if the app calls for it. Unexpected cropping was a bug report in Percolatus.

**Metadata:** re-encoding through a canvas strips EXIF data, including location.

## Check it works

- Uploading a large phone photo stores a much smaller file, with the right orientation.
- Wrong file types, empty files and oversized files are rejected.
- A signed-out upload returns 401.
- Test uploads on Safari on iOS as well as Chrome.
