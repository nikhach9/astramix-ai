import os
import zipfile

def create_posix_zip(source_dir, output_zip_path, prefix=""):
    """
    Creates a zip archive ensuring all arcname entries use forward slashes (POSIX format),
    which is strictly required for Linux/cPanel extraction.
    """
    output_zip_path = os.path.abspath(output_zip_path)
    source_dir = os.path.abspath(source_dir)
    os.makedirs(os.path.dirname(output_zip_path), exist_ok=True)
    
    total_files = 0
    total_bytes = 0
    with zipfile.ZipFile(output_zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                # Force forward slash regardless of OS
                posix_rel_path = rel_path.replace(os.sep, '/')
                if prefix:
                    arcname = f"{prefix.strip('/')}/{posix_rel_path}"
                else:
                    arcname = posix_rel_path
                zf.write(full_path, arcname=arcname)
                total_files += 1
                total_bytes += os.path.getsize(full_path)
                
    zip_size = os.path.getsize(output_zip_path)
    print(f"Created: {os.path.basename(output_zip_path)}")
    print(f"  Files: {total_files}")
    print(f"  Uncompressed: {total_bytes:,} bytes")
    print(f"  Compressed:   {zip_size:,} bytes ({zip_size / 1024 / 1024:.2f} MB)")
    return output_zip_path

if __name__ == '__main__':
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    # 1. Package frontend for public_html
    public_html_dir = os.path.join(base_dir, 'cpanel_deployment', 'public_html')
    frontend_zip_path = os.path.join(base_dir, 'astramix_frontend_public_html.zip')
    create_posix_zip(public_html_dir, frontend_zip_path)
    
    # Also save a copy inside cpanel_deployment
    cpanel_frontend_zip = os.path.join(base_dir, 'cpanel_deployment', 'astramix_frontend_public_html.zip')
    create_posix_zip(public_html_dir, cpanel_frontend_zip)
    
    # 2. Package private PHP backend
    backend_php_dir = os.path.join(base_dir, 'astramix_php')
    backend_zip_path = os.path.join(base_dir, 'astramix_backend_php.zip')
    create_posix_zip(backend_php_dir, backend_zip_path, prefix="astramix_php")
    
    # Also save a copy inside cpanel_deployment
    cpanel_backend_zip = os.path.join(base_dir, 'cpanel_deployment', 'astramix_backend_php.zip')
    create_posix_zip(backend_php_dir, cpanel_backend_zip, prefix="astramix_php")
    
    print("\nPackaging completed successfully.")
