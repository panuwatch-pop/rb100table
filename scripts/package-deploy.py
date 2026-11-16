import os
import zipfile
import shutil

source_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
desktop_zip = os.path.join(os.path.expanduser('~'), 'Desktop', 'reunion-table-rb100-deploy.zip')
local_zip = os.path.join(source_dir, 'reunion-table-rb100-deploy.zip')

print("Packaging deployment ZIP for Plesk...")

# Verify postbuild results
standalone_server = os.path.join(source_dir, '.next', 'standalone', 'server.js')
if not os.path.exists(standalone_server):
    print("Warning: Standalone server.js not found yet!")

# Files and folders to include
# NOTE: EXCLUDING 'data' so deploy ZIP NEVER overwrites live database on the server!
includes = [
    ('.next', '.next'),
    ('_next', '_next'),
    ('public', 'public'),
    ('scripts', 'scripts'),
    ('app.js', 'app.js'),
    ('package.json', 'package.json')
]

temp_zip = desktop_zip + '.tmp'
if os.path.exists(temp_zip):
    os.remove(temp_zip)

with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for item, arc_prefix in includes:
        full_path = os.path.join(source_dir, item)
        if os.path.isfile(full_path):
            zf.write(full_path, arc_prefix)
            print(f"Added file: {arc_prefix}")
        elif os.path.isdir(full_path):
            for root, dirs, files in os.walk(full_path):
                # Skip heavy unneeded subfolders and skip uploaded files
                dirs[:] = [d for d in dirs if d not in ['cache', '.git']]
                
                # If we are in public/uploads, skip any uploaded user files (slips, shirts)
                rel_root = os.path.relpath(root, source_dir)
                if 'uploads' in rel_root.replace('\\', '/').split('/'):
                    # Only include .gitkeep or skip uploaded images to prevent overwriting server uploads
                    files = [f for f in files if f == '.gitkeep']
                
                for file in files:
                    file_full = os.path.join(root, file)
                    rel_path = os.path.relpath(file_full, source_dir)
                    zf.write(file_full, rel_path)
            print(f"Added directory: {arc_prefix}")

# Move temp zip to destination
if os.path.exists(desktop_zip):
    try:
        os.remove(desktop_zip)
    except Exception as e:
        print(f"Could not remove old desktop zip: {e}")

shutil.move(temp_zip, desktop_zip)
shutil.copy2(desktop_zip, local_zip)

file_size_mb = os.path.getsize(desktop_zip) / (1024 * 1024)
print(f"SUCCESS: Created deployment ZIP at {desktop_zip} ({file_size_mb:.2f} MB)")
