import os
import zipfile
import pathlib
import sys

dest_zip = r"C:\Users\kornsiri\Desktop\reunion-table-rb100-deploy.zip"
root_dir = r"F:\reunion-table-reservation"

include_dirs = [".next", "public", "_next", "scripts"]
include_files = ["app.js", "package.json"]

exclude_extensions = {".db", ".db-journal", ".db-wal", ".db-shm", ".log"}
exclude_top_dirs = {"node_modules", ".git", "data", "scratch", "rb100table"}
exclude_next_subdirs = {"cache", "dev", "diagnostics"}

print("Packaging deployment zip...")
with zipfile.ZipFile(dest_zip, "w", zipfile.ZIP_DEFLATED) as zf:
    for f in include_files:
        fp = os.path.join(root_dir, f)
        if os.path.exists(fp):
            zf.write(fp, f)
            print(f"Added file: {f}")

    for d in include_dirs:
        dp = os.path.join(root_dir, d)
        if not os.path.exists(dp):
            continue
        for root, dirs, files in os.walk(dp):
            # Prune excluded dirs
            dirs[:] = [sub for sub in dirs if sub not in exclude_top_dirs]
            rel_dir = os.path.relpath(root, root_dir)
            parts = pathlib.Path(rel_dir).parts
            if len(parts) >= 2 and parts[0] == ".next" and parts[1] in exclude_next_subdirs:
                continue

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in exclude_extensions:
                    print(f"Skipping excluded file: {file}")
                    continue
                full_p = os.path.join(root, file)
                rel_p = os.path.relpath(full_p, root_dir)
                zf.write(full_p, rel_p)

with zipfile.ZipFile(dest_zip, "r") as zf:
    names = zf.namelist()
    db_files = [n for n in names if n.endswith((".db", ".db-wal", ".db-shm"))]
    print(f"Total files in zip: {len(names)}")
    print(f"Database files in zip: {len(db_files)}")
    if db_files:
        print("CRITICAL WARNING: Database files found in zip:", db_files)
        sys.exit(1)
    else:
        print("SUCCESS: Zero database files in zip!")

zip_size_mb = os.path.getsize(dest_zip) / (1024 * 1024)
print(f"Zip size: {zip_size_mb:.2f} MB")
