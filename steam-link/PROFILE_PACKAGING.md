# Stream Deck Profile Packaging Guide

## Overview
This guide explains how to package a `.streamDeckProfile` file for bundling with a Stream Deck plugin.

## Profile Structure

A `.streamDeckProfile` file is a ZIP archive with a specific internal structure:

```
ProfileName.streamDeckProfile (ZIP file)
├── package.json                          # Profile metadata
└── Profiles/
    └── {DEVICE_UUID}.sdProfile/
        ├── manifest.json                 # Device-specific profile manifest
        └── Profiles/
            └── {PAGE_UUID}/
                ├── manifest.json         # Page manifest with button layout
                └── Images/               # Custom button images (optional)
```

## Steps to Create a Bundled Profile

### 1. Create Profile in Stream Deck
1. Open Stream Deck application
2. Create and customize your profile with desired actions
3. Note the profile name (e.g., "Steam Apps (auto)")

### 2. Locate the Profile Files
Stream Deck profiles are stored at:
```
C:\Users\{USERNAME}\AppData\Roaming\Elgato\StreamDeck\ProfilesV3\
```

Find the profile directory matching your profile name.

### 3. Copy Profile to Plugin Directory
```bash
# Create profiles directory in your plugin
mkdir -p com.benwach.steam-link.sdPlugin/profiles/

# Copy the profile folder
cp -r "{PROFILE_SOURCE}" "com.benwach.steam-link.sdPlugin/profiles/ProfileName"
```

### 4. Package as ZIP with .streamDeckProfile Extension

**Using PowerShell (Windows):**
```powershell
cd com.benwach.steam-link.sdPlugin/profiles/ProfileName
Compress-Archive -Path '.\*' -DestinationPath '..\temp.zip' -Force
cd ..
mv temp.zip "ProfileName.streamDeckProfile"
```

**Using Command Line (with zip utility):**
```bash
cd com.benwach.steam-link.sdPlugin/profiles/ProfileName
zip -r ../ProfileName.streamDeckProfile *
```

### 5. Place in Plugin Root
Move the `.streamDeckProfile` file to the plugin root directory:
```bash
mv ProfileName.streamDeckProfile ../
```

Final structure:
```
com.benwach.steam-link.sdPlugin/
├── ProfileName.streamDeckProfile    # The packaged profile
├── manifest.json
├── bin/
└── ...
```

### 6. Update Plugin Manifest

Add the profile to your `manifest.json`:

```json
{
  "UUID": "com.benwach.steam-link",
  "Profiles": [
    {
      "Name": "Profile Display Name",
      "DeviceType": 0,
      "Readonly": false,
      "AutoInstall": true,
      "DontAutoSwitchWhenInstalled": false
    }
  ]
}
```

**Important Notes:**
- `Name`: Should match the profile's display name in Stream Deck
- `DeviceType`: 0 = Stream Deck (standard), 1 = Stream Deck Mini, etc.
- `AutoInstall`: If true, installs profile automatically when plugin is installed
- The `.streamDeckProfile` file must be in the plugin root directory

## Verification

After packaging:

1. **Verify ZIP structure:**
   ```bash
   python -m zipfile -l ProfileName.streamDeckProfile
   ```

2. **Check file is valid ZIP:**
   ```bash
   file ProfileName.streamDeckProfile
   # Should show: Zip archive data
   ```

3. **Test manual import:**
   - Double-click the `.streamDeckProfile` file
   - Stream Deck should offer to import it

## Troubleshooting

**Profile not found on disk:**
- Check the file is in the plugin root directory
- Verify the Name in manifest matches exactly (case-sensitive)
- Ensure the file is a valid ZIP archive

**Profile doesn't auto-install:**
- `AutoInstall` only works on first plugin installation
- Users who already have the plugin installed need to manually import
- Consider providing the `.streamDeckProfile` file separately for existing users

## Our Implementation

For the Steam Link plugin:
- Profile name: "Steam Apps (auto)"
- Contains Launch Steam Game actions
- Packaged at: `com.benwach.steam-link.sdPlugin/Steam Apps (auto).streamDeckProfile`
- File size: ~3KB
- Created using PowerShell Compress-Archive method
