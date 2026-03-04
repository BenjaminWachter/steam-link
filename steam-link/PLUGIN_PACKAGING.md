# Stream Deck Plugin Packaging Guide

## Overview
This guide explains how to package a Stream Deck plugin for distribution using the Stream Deck CLI.

## Prerequisites

1. **Stream Deck CLI installed**
   ```bash
   npm install -g @elgato/cli
   ```

2. **Built plugin** - Your plugin must be compiled/built before packaging
   ```bash
   npm run build
   ```

3. **Valid manifest.json** in the plugin directory

## Plugin Directory Structure

Before packaging, ensure your plugin directory (`.sdPlugin`) contains:

```
com.benwach.steam-link.sdPlugin/
├── manifest.json              # Required: Plugin metadata
├── bin/
│   └── plugin.js             # Required: Plugin code
├── imgs/
│   ├── plugin/               # Plugin icons
│   │   ├── category-icon.png
│   │   └── marketplace.png
│   └── actions/              # Action icons
│       └── counter/
│           ├── icon.png
│           ├── icon@2x.png
│           ├── key.png
│           └── key@2x.png
├── ui/                       # Property Inspector HTML files
│   ├── increment-counter.html
│   ├── launch-steam-game.html
│   └── steam-list.html
└── ProfileName.streamDeckProfile  # Optional: Bundled profiles
```

## Packaging Commands

### Basic Packaging
```bash
# Navigate to the plugin directory
cd com.benwach.steam-link.sdPlugin

# Package the plugin
streamdeck pack
```

This creates: `com.benwach.steam-link.streamDeckPlugin` in the parent directory

### Packaging from Parent Directory
```bash
# From the project root
streamdeck pack com.benwach.steam-link.sdPlugin
```

### Output Location
The `.streamDeckPlugin` file is created in `.pack/` directory:
```
.pack/
└── com.benwach.steam-link.streamDeckPlugin
```

## What Gets Packaged

The `streamdeck pack` command:
1. Validates the `manifest.json`
2. Creates a ZIP archive of the entire `.sdPlugin` directory
3. Renames it with `.streamDeckPlugin` extension
4. Signs it (if configured with developer certificate)

**Included:**
- All files in the `.sdPlugin` directory
- Bundled profiles (`.streamDeckProfile` files)
- Node modules (if present in the plugin directory)
- Property Inspector assets

**Excluded:**
- Source TypeScript files (outside `.sdPlugin`)
- `node_modules` in parent directory
- Build configuration files (outside `.sdPlugin`)

## Installation & Testing

### Install Packaged Plugin
```bash
# Double-click the .streamDeckPlugin file, or:
streamdeck install .pack/com.benwach.steam-link.streamDeckPlugin
```

### Development Linking (for testing)
Instead of packaging during development, use linking:
```bash
streamdeck link com.benwach.steam-link.sdPlugin
```

This creates a symlink, so changes are reflected immediately after rebuilding.

### Unlink Development Plugin
```bash
streamdeck unlink com.benwach.steam-link
```

## Build & Package Workflow

### Complete Development Workflow
```bash
# 1. Make code changes in src/
# 2. Build the plugin
npm run build

# 3. Test with linked plugin
streamdeck restart com.benwach.steam-link

# 4. When ready to distribute, package
cd com.benwach.steam-link.sdPlugin
streamdeck pack

# 5. Test the packaged version
streamdeck unlink com.benwach.steam-link
streamdeck install .pack/com.benwach.steam-link.streamDeckPlugin
```

### Automated Build Script
Add to `package.json`:
```json
{
  "scripts": {
    "build": "rollup -c",
    "pack": "npm run build && cd com.benwach.steam-link.sdPlugin && streamdeck pack",
    "dev": "npm run build && streamdeck restart com.benwach.steam-link"
  }
}
```

Then use:
```bash
npm run pack
```

## Distribution

### Manual Distribution
1. Share the `.streamDeckPlugin` file
2. Users double-click to install
3. Stream Deck handles installation automatically

### Stream Deck Marketplace
1. Package plugin with `streamdeck pack`
2. Ensure manifest contains required marketplace fields:
   ```json
   {
     "Name": "Plugin Name",
     "Version": "1.0.0",
     "Description": "Plugin description",
     "Author": "Your Name",
     "Icon": "imgs/plugin/marketplace"
   }
   ```
3. Submit to Elgato for review

## Troubleshooting

### "Invalid manifest" Error
- Validate JSON syntax: `cat manifest.json | python -m json.tool`
- Check required fields are present: UUID, Name, Version, Actions

### Plugin doesn't work after packaging
- Verify `bin/plugin.js` exists and is executable
- Check Node.js version matches manifest: `"Nodejs": {"Version": "20"}`
- Review logs: `streamdeck logs`

### Files missing from package
- Ensure files are inside `.sdPlugin` directory
- Check they're not in `.gitignore` or similar

### Profile not included
- Verify `.streamDeckProfile` file is in plugin root (`.sdPlugin/`)
- Check it's a valid ZIP archive
- Confirm manifest references it correctly

## Version Management

Update version in `manifest.json` before each release:
```json
{
  "Version": "1.0.0"
}
```

Follow semantic versioning:
- Major: Breaking changes
- Minor: New features
- Patch: Bug fixes

## Our Setup

For the Steam Link plugin:
- Build system: Rollup (TypeScript → JavaScript)
- Output: `com.benwach.steam-link.sdPlugin/bin/plugin.js`
- Package command: `streamdeck pack` from `.sdPlugin` directory
- Development: Uses `streamdeck link` for live testing
- Includes bundled profile: "Steam Apps (auto).streamDeckProfile"


cd "C:/Users/vboxuser/steam-link/steam-link" && rm -rf .pack dist && mkdir -p .pack/com.benwach.steam-link.sdPlugin dist && cp com.benwach.steam-link.sdPlugin/manifest.json .pack/com.benwach.steam-link.sdPlugin/ && cp "com.benwach.steam-link.sdPlugin/Steam Apps (auto).streamDeckProfile" .pack/com.benwach.steam-link.sdPlugin/ && cp -R com.benwach.steam-link.sdPlugin/bin .pack/com.benwach.steam-link.sdPlugin/ && cp -R com.benwach.steam-link.sdPlugin/imgs .pack/com.benwach.steam-link.sdPlugin/ && cp -R com.benwach.steam-link.sdPlugin/ui .pack/com.benwach.steam-link.sdPlugin/ && streamDeck pack .pack/com.benwach.steam-link.sdPlugin --output dist && python - <<'PY'
import os,zipfile
p='dist/com.benwach.steam-link.streamDeckPlugin'
print('exists',os.path.exists(p),'size',os.path.getsize(p))
with zipfile.ZipFile(p) as z:
    names=z.namelist()
    print('entries',len(names))
    print('has_nested_package',any(n.endswith('.streamDeckPlugin') for n in names))
    print('max_path_len',max(len(n) for n in names))
PY

