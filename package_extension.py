#!/usr/bin/env python3
"""Package browser extension for Firefox Add-ons submission"""

import os
import zipfile

def package_extension():
    ext_dir = 'browser-extension'
    output_zip = os.path.join(ext_dir, 'stash-downloader-extension.zip')

    # Remove existing ZIP if present
    if os.path.exists(output_zip):
        os.remove(output_zip)

    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(ext_dir):
            # Skip the output ZIP itself and hidden files
            for file in files:
                if file == 'stash-downloader-extension.zip' or file.startswith('.'):
                    continue

                file_path = os.path.join(root, file)
                # Get path relative to ext_dir
                arcname = os.path.relpath(file_path, ext_dir)

                zf.write(file_path, arcname)
                print(f"Added: {arcname}")

    print(f"\n✓ Created {output_zip}")
    print(f"  Size: {os.path.getsize(output_zip) / 1024:.1f} KB")
    print("\nReady for upload to addons.mozilla.org")

if __name__ == '__main__':
    package_extension()
