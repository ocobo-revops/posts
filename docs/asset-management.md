# Asset management (advanced / local)

> **You normally don't need this.** When you publish content through `/publish-content`, CI uploads your images to Vercel Blob, rewrites local image paths to Blob URLs, and optimises oversized images automatically. This document is for advanced users who want to manage or upload assets locally — e.g. bulk imports, debugging an upload, or working outside the content skills.

## How it works

- **Upload**: assets are uploaded to Vercel Blob with paths like `content/posts/my-post/image.png`.
- **URLs**: markdown files are rewritten to Blob URLs: `https://[blob-id].vercel.app/content/posts/my-post/image.png`.
- **Website**: the main website fetches markdown from this repo; images are served from the CDN.
- **Performance**: no website rebuilds needed when adding or changing assets.
- **Optimisation**: `/publish-content` runs `pnpm optimize-assets:write` over the branch's new/changed images before upload, re-encoding oversized ones (> 400 KB) in place. This is local-only — there is no Vercel Blob CI step for re-encoding.

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Vercel Blob token
   ```

3. **Get a Vercel Blob token:**
   - Go to [Vercel Dashboard > Storage](https://vercel.com/dashboard/stores)
   - Create or access your Blob store
   - Copy the `BLOB_READ_WRITE_TOKEN`

## Commands

```bash
# Upload only changed/new assets (recommended - default behavior)
pnpm upload-assets

# Upload all assets (ignore git status)
pnpm upload-assets:all

# Update markdown URLs to use Blob storage
pnpm update-urls

# Upload changed assets AND update URLs in one command
pnpm sync-assets

# Upload all assets AND update URLs in one command
pnpm sync-assets:all

# Choose branch for content fetching (advanced)
pnpm upload-assets:branch
```

## Asset structure

```
assets/
├── posts/                  # Blog post assets
│   ├── my-post-slug/
│   │   ├── cover.png
│   │   └── diagram.svg
│   └── another-post/
│       └── chart.png
├── clients/                # Client logos & avatars
│   ├── company-logo.png
│   └── company-avatar.png
└── stories/                # Story assets
    └── story-image.jpg
```

## Local workflow

### Quick workflow (recommended)

1. **Add/modify assets:**
   ```bash
   mkdir -p assets/posts/my-new-post
   cp my-image.png assets/posts/my-new-post/
   ```

2. **Upload changed assets and update URLs:**
   ```bash
   pnpm sync-assets  # Only uploads changed/new files
   ```

3. **Commit changes:**
   ```bash
   git add .
   git commit -m "Add assets for new post"
   git push
   ```

### Detailed workflow

1. **Check what will be uploaded:**
   ```bash
   git status assets/  # See changed files
   pnpm upload-assets  # Will only upload changed files
   ```

2. **Upload specific changes:**
   ```bash
   pnpm upload-assets     # Changed files only (default)
   pnpm upload-assets:all # All files (if needed)
   ```

3. **Update markdown references:**
   ```bash
   pnpm update-urls
   ```

## Benefits

- ✅ **No website rebuilds** when adding content assets
- ✅ **CDN performance** for all images
- ✅ **Independent workflows** for content and code
- ✅ **Publish-time image optimisation** (see above)
- ✅ **Version control** for content and assets separately

## Troubleshooting

- **Token issues**: make sure `BLOB_READ_WRITE_TOKEN` is set correctly.
- **Upload failures**: check network connection and token permissions.
- **URL updates**: run `pnpm update-urls` after uploading new assets.
- **Large files**: Blob storage supports files up to 500MB.

## GitHub Actions

The repository includes automated asset upload on push to the `assets/` directory. See `.github/workflows/upload-assets.yml` for configuration.
