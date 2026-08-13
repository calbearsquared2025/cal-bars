# Venue photo processing

Approved Venue photos remain a manual-review workflow. The Google Form/Drive original stays private; this utility creates only the optimized public copy that may be committed to the site.

## First-time setup

The pinned `sharp` version requires Node.js 20.9 or newer. Check first:

```powershell
node --version
```

Then, from the repository root:

```powershell
npm install
```

This installs the pinned `sharp` image-processing dependency used only by the local photo utility.

## Process an approved photo

Run from the repository root:

```powershell
npm run photo:process -- `
  --input "C:\Users\Matthew\Downloads\approved-photo.jpg" `
  --slug "molly-o-s-san-carlos"
```

The utility:

- reads the approved source image from the path supplied with `--input`;
- auto-rotates from source orientation metadata;
- preserves the source aspect ratio rather than permanently cropping it;
- caps output width at 1600 px without enlarging smaller sources;
- converts to WebP;
- starts at WebP quality 82 and lowers quality in small steps toward a 500 KB ceiling, stopping at quality 60;
- writes the final asset to `assets/venues/<venue-slug>.webp`;
- does not carry source EXIF/GPS metadata into the public WebP output;
- refuses to overwrite an existing Venue photo unless `--force` is explicitly supplied;
- prints the final dimensions, file size, public URL, and proposed Venue photo metadata.

Venue Detail owns the visible 3:2 presentation, so the stored image does not need to be destructively cropped to 3:2.

## Optional metadata output

Metadata may be supplied so the command prints copy-ready Venue field values:

```powershell
npm run photo:process -- `
  --input "C:\Users\Matthew\Downloads\molly.jpg" `
  --slug "molly-o-s-san-carlos" `
  --caption "Cal fans at Molly O's for the 2025 Louisville game." `
  --credit "@oskistraw" `
  --credit-url "https://x.com/oskistraw"
```

These arguments do not update Google Sheets, Apps Script, or production automatically. They only print the proposed values after image processing.

Expected public asset URL for that example:

```text
https://calgoldenbars.com/assets/venues/molly-o-s-san-carlos.webp
```

## Replacement photos

If a Venue already has an asset with the same slug, review the replacement first and then run with `--force`:

```powershell
npm run photo:process -- `
  --input "C:\Users\Matthew\Downloads\replacement.jpg" `
  --slug "molly-o-s-san-carlos" `
  --force
```

The utility never approves a submission, changes a Venue row, commits a file, opens a PR, or deploys the site. Those remain deliberate human-controlled steps.

## Publication workflow

```text
Google Form upload
→ private Drive original
→ manual approval
→ download approved source outside the public asset folder
→ run photo:process
→ visually inspect assets/venues/<venue-slug>.webp
→ commit/review the optimized public asset
→ set Venue photo_url/photo_caption/photo_credit/photo_credit_url as applicable
→ publish through the normal deployment workflow
```

Do not commit the raw Form/Drive original or expose Drive file IDs, respondent email, or private review data.
