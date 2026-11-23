import os
import argparse
import shutil
import zipfile
import subprocess
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_OUT = os.path.join(BASE_DIR, "frontend", "out")
PUBLIC_HTML_STAGING = os.path.join(BASE_DIR, "cpanel_deployment", "public_html")
BACKEND_SRC = os.path.join(BASE_DIR, "astramix_php")

FRONTEND_ZIP = os.path.join(BASE_DIR, "ASTRAMIX_FRONTEND_FINAL.zip")
BACKEND_ZIP = os.path.join(BASE_DIR, "ASTRAMIX_PHP_BACKEND_FINAL.zip")

API_INDEX_PHP = """<?php
declare(strict_types=1);

/**
 * AstraMix AI — cPanel Public Front Controller
 *
 * Receives all incoming API calls from the browser (/api/v1/..., /api/...)
 * and delegates them to the private AstraMix PHP application located outside public_html.
 */

// Search paths for private astramix_php installation
$possiblePaths = [
    getenv('ASTRAMIX_PHP_ROOT') ? rtrim(getenv('ASTRAMIX_PHP_ROOT'), '/\\\\') . '/src/autoload.php' : null,
    dirname(__DIR__, 2) . '/astramix_php/src/autoload.php',  // /home/user/astramix_php/src/autoload.php
    dirname(__DIR__, 2) . '/src/autoload.php',               // /home/user/src/autoload.php
    dirname(__DIR__, 1) . '/astramix_php/src/autoload.php',  // /home/user/public_html/astramix_php/src/autoload.php
    dirname(__DIR__, 1) . '/src/autoload.php',               // /home/user/public_html/src/autoload.php
    __DIR__ . '/../../astramix_php/src/autoload.php',
    __DIR__ . '/../src/autoload.php',
];

$autoloadFile = null;
foreach ($possiblePaths as $p) {
    if ($p && file_exists($p)) {
        $autoloadFile = $p;
        break;
    }
}

if (!$autoloadFile) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'detail' => 'AstraMix AI private PHP backend not found. Ensure astramix_php directory is uploaded to /home/username/astramix_php/.',
        'error_code' => 'BackendConfigurationError',
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once $autoloadFile;

use AstraMix\\Core\\App;

$app = new App();
$app->run();
"""

API_HTACCESS = """# Disable CloudLinux / cPanel Passenger to prevent Python routing conflict
<IfModule mod_passenger.c>
    PassengerEnabled off
</IfModule>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^v1/(.*)$ index.php?__route__=$1 [QSA,L]
    RewriteRule ^(.*)$ index.php?__route__=$1 [QSA,L]
</IfModule>

<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Admin-Token, X-Requested-With"
</IfModule>
"""

ROOT_HTACCESS = """# Disable CloudLinux / cPanel Passenger to prevent Python application routing conflict on /api
<IfModule mod_passenger.c>
    PassengerEnabled off
</IfModule>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # 1. Route all API and schema requests to the PHP API Front Controller
    RewriteRule ^api/v1/(.*)$ api/index.php?__route__=$1 [QSA,L]
    RewriteRule ^api/(.*)$ api/index.php?__route__=$1 [QSA,L]
    RewriteRule ^v1/(.*)$ api/index.php?__route__=$1 [QSA,L]
    RewriteRule ^schema/(.*)$ api/index.php?__route__=schema/$1 [QSA,L]

    # 2. Backward compatibility with legacy PHP URLs
    RewriteRule ^predict\\.php$ predict.html [NC,L]
    RewriteRule ^optimize\\.php$ optimize.html [NC,L]
    RewriteRule ^report\\.php$ report.html [NC,L]
    RewriteRule ^mix-lab\\.php$ mix-lab.html [NC,L]
    RewriteRule ^materials-market\\.php$ materials-market.html [NC,L]

    # 3. Clean URLs for Frontend Workspaces and Sub-pages
    RewriteRule ^mix-lab/predict/?$ mix-lab/predict.html [NC,L]
    RewriteRule ^mix-lab/optimize/?$ mix-lab/optimize.html [NC,L]
    RewriteRule ^projects/astramix/?$ projects/astramix.html [NC,L]
    RewriteRule ^predict/?$ predict.html [NC,L]
    RewriteRule ^optimize/?$ optimize.html [NC,L]
    RewriteRule ^mix-lab/?$ mix-lab.html [NC,L]
    RewriteRule ^materials-market/?$ materials-market.html [NC,L]
    RewriteRule ^compare/?$ compare.html [NC,L]
    RewriteRule ^report/?$ report.html [NC,L]
    RewriteRule ^about/?$ about.html [NC,L]
    RewriteRule ^beton-kayak/?$ beton-kayak.html [NC,L]

    # 4. Check if corresponding .html file exists for any clean URL
    RewriteCond %{DOCUMENT_ROOT}/$1.html -f
    RewriteRule ^(.+?)/?$ $1.html [L]

    # 5. Client-side routing fallback
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_mime.c>
    AddType text/css .css
    AddType application/javascript .js
    AddType application/json .json
    AddType font/woff2 .woff2
    AddType image/svg+xml .svg
</IfModule>

<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Admin-Token, X-Requested-With"
</IfModule>

# Caching for immutable content-hashed Next.js assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
</IfModule>

# Security: Block direct web access to sensitive server files
<FilesMatch "\\.(db|sqlite|sqlite3|env|jsonl|py|sh|yml|yaml|log)$">
    Order allow,deny
    Deny from all
</FilesMatch>
"""

def sync_frontend():
    print("--- 1. Syncing frontend/out to cpanel_deployment/public_html ---")
    if not os.path.exists(FRONTEND_OUT):
        raise RuntimeError(f"Frontend out directory does not exist: {FRONTEND_OUT}")

    # Clear staging directory
    if os.path.exists(PUBLIC_HTML_STAGING):
        shutil.rmtree(PUBLIC_HTML_STAGING)
    os.makedirs(PUBLIC_HTML_STAGING, exist_ok=True)

    # Copy everything from frontend/out
    for item in os.listdir(FRONTEND_OUT):
        s = os.path.join(FRONTEND_OUT, item)
        d = os.path.join(PUBLIC_HTML_STAGING, item)
        if os.path.isdir(s):
            shutil.copytree(s, d)
        else:
            shutil.copy2(s, d)

    # Write api/index.php and api/.htaccess
    api_dir = os.path.join(PUBLIC_HTML_STAGING, "api")
    os.makedirs(api_dir, exist_ok=True)
    with open(os.path.join(api_dir, "index.php"), "w", encoding="utf-8", newline="\n") as f:
        f.write(API_INDEX_PHP.strip() + "\n")
    with open(os.path.join(api_dir, ".htaccess"), "w", encoding="utf-8", newline="\n") as f:
        f.write(API_HTACCESS.strip() + "\n")

    # Write root .htaccess
    with open(os.path.join(PUBLIC_HTML_STAGING, ".htaccess"), "w", encoding="utf-8", newline="\n") as f:
        f.write(ROOT_HTACCESS.strip() + "\n")

    # Copy preflight.php from astramix_php
    src_preflight = os.path.join(BACKEND_SRC, "preflight.php")
    if os.path.exists(src_preflight):
        shutil.copy2(src_preflight, os.path.join(PUBLIC_HTML_STAGING, "preflight.php"))

    print("Frontend sync completed.")


def create_posix_zip(source_dir, output_zip_path, exclude_exts=None, exclude_dirs=None, extra_files=None):
    if exclude_exts is None:
        exclude_exts = set()
    if exclude_dirs is None:
        exclude_dirs = set()

    output_zip_path = os.path.abspath(output_zip_path)
    source_dir = os.path.abspath(source_dir)
    if os.path.exists(output_zip_path):
        os.remove(output_zip_path)

    total_files = 0
    total_bytes = 0

    with zipfile.ZipFile(output_zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in exclude_exts:
                    continue
                if file.startswith(('.env', '.DS_Store', 'Thumbs.db')) or '.db-' in file:
                    continue

                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                # Ensure POSIX forward slashes
                posix_name = rel_path.replace('\\', '/')

                zf.write(full_path, arcname=posix_name)
                total_files += 1
                total_bytes += os.path.getsize(full_path)

        for archive_name, file_path in (extra_files or {}).items():
            zf.write(file_path, arcname=archive_name)

    zip_size = os.path.getsize(output_zip_path)
    print(f"Packaged: {os.path.basename(output_zip_path)}")
    print(f"  Total Files:  {total_files}")
    print(f"  Uncompressed: {total_bytes:,} bytes")
    print(f"  Zip Archive:  {zip_size:,} bytes ({zip_size / 1024 / 1024:.2f} MB)")
    return output_zip_path


def verify_zip(zip_path, expected_samples, forbidden_samples=None):
    print(f"\nVerifying {os.path.basename(zip_path)}...")
    if forbidden_samples is None:
        forbidden_samples = []

    with zipfile.ZipFile(zip_path, 'r') as zf:
        names = zf.namelist()
        # 1. Verify forward slashes only
        for n in names:
            if '\\' in n:
                raise ValueError(f"Found backslash in zip entry: {n}")

        # 2. Verify expected sample files exist
        for exp in expected_samples:
            if exp not in names:
                raise ValueError(f"Expected file missing from zip: {exp}")
            print(f"  [OK] Found expected: {exp}")

        # 3. Verify forbidden samples are absent
        for forb in forbidden_samples:
            matches = [n for n in names if forb in n]
            if matches:
                raise ValueError(f"Forbidden entry found in zip: {matches}")
            print(f"  [OK] Verified absent: {forb}")

        # 4. Check for nested root folders (e.g., astramix_php/astramix_php or public_html/public_html)
        first_components = {n.split('/')[0] for n in names if '/' in n}
        root_files = [n for n in names if '/' not in n]
        print(f"  Root entries: {len(root_files)} files, top dirs: {first_components}")
    print(f"Verification of {os.path.basename(zip_path)} PASSED.")


def test_clean_extraction():
    print("\n--- Testing clean extraction into temporary folders ---")
    test_dir = os.path.join(BASE_DIR, "cpanel_deployment", "_test_extraction")
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)

    fe_extract = os.path.join(test_dir, "public_html")
    be_extract = os.path.join(test_dir, "astramix_php")
    os.makedirs(fe_extract, exist_ok=True)
    os.makedirs(be_extract, exist_ok=True)

    with zipfile.ZipFile(FRONTEND_ZIP, 'r') as zf:
        zf.extractall(fe_extract)

    with zipfile.ZipFile(BACKEND_ZIP, 'r') as zf:
        zf.extractall(be_extract)

    # Verify extracted structure
    assert os.path.exists(os.path.join(fe_extract, "index.html")), "index.html missing from extracted frontend"
    assert os.path.exists(os.path.join(fe_extract, "mix-lab.html")), "mix-lab.html missing from extracted frontend"
    assert os.path.exists(os.path.join(fe_extract, "api", "index.php")), "api/index.php missing from extracted frontend"
    assert os.path.exists(os.path.join(fe_extract, ".htaccess")), ".htaccess missing from extracted frontend"
    assert os.path.exists(os.path.join(be_extract, "src", "autoload.php")), "src/autoload.php missing from extracted backend"
    assert os.path.exists(os.path.join(be_extract, "data", "market", "astramix_market.db")), "market database missing from extracted backend"
    assert os.path.exists(os.path.join(be_extract, "data", "models", "model_grouped_v1.json")), "xgboost model missing from extracted backend"

    print("Clean extraction test PASSED.")

    # Clean up test extraction
    shutil.rmtree(test_dir)
    print("Test extraction directory cleaned up.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Package current static frontend and private PHP sources without deploying.')
    parser.add_argument('--market-db', required=True, help='Explicit freshly prepared market snapshot to package.')
    args = parser.parse_args()
    market_snapshot = os.path.abspath(args.market_db)
    if not os.path.isfile(market_snapshot):
        parser.error('Market snapshot does not exist. Run prepare_market_snapshot.py first.')
    sync_frontend()

    print("\n--- 2. Packaging ASTRAMIX_FRONTEND_FINAL.zip ---")
    create_posix_zip(
        source_dir=PUBLIC_HTML_STAGING,
        output_zip_path=FRONTEND_ZIP,
        exclude_exts={'.py', '.sqlite', '.db', '.log', '.venv'},
        exclude_dirs={'__pycache__', '.venv', '.git'}
    )

    print("\n--- 3. Packaging ASTRAMIX_PHP_BACKEND_FINAL.zip ---")
    create_posix_zip(
        source_dir=BACKEND_SRC,
        output_zip_path=BACKEND_ZIP,
        exclude_exts={'.log', '.pyc', '.py', '.db', '.sqlite', '.sqlite3'},
        extra_files={'data/market/astramix_market.db': market_snapshot},
        exclude_dirs={'__pycache__', '.venv', '.git', '.idea', '.vscode'}
    )

    # Also save copies into cpanel_deployment/
    shutil.copy2(FRONTEND_ZIP, os.path.join(BASE_DIR, "cpanel_deployment", "ASTRAMIX_FRONTEND_FINAL.zip"))
    shutil.copy2(BACKEND_ZIP, os.path.join(BASE_DIR, "cpanel_deployment", "ASTRAMIX_PHP_BACKEND_FINAL.zip"))

    print("\n--- 4. Verifying Archives ---")
    verify_zip(
        FRONTEND_ZIP,
        expected_samples=[
            "index.html",
            "mix-lab.html",
            "predict.html",
            "optimize.html",
            "materials-market.html",
            "api/index.php",
            "api/.htaccess",
            ".htaccess",
            "preflight.php",
        ],
        forbidden_samples=[".py", ".sqlite", ".db", "xgboost_model.json"]
    )

    verify_zip(
        BACKEND_ZIP,
        expected_samples=[
            "src/autoload.php",
            "src/Core/App.php",
            "src/Core/Router.php",
            "src/ML/TreeEnsemble.php",
            "src/Market/MarketService.php",
            "data/market/astramix_market.db",
            "data/models/active_model.json",
            "data/models/model_grouped_v1.json",
            "data/locations/AM.json",
            "tests/run_tests.php",
        ],
        forbidden_samples=[".py", ".venv"]
    )

    test_clean_extraction()
    print("\nAll packaging, validation, and extraction tests PASSED successfully!")
