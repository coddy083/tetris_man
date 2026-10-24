"""Upload only the Vite build, publishing index.html last without deleting server files."""

from __future__ import annotations

import argparse
import ftplib
import os
from pathlib import Path, PurePosixPath
import sys
import time
import urllib.error
import urllib.request
import uuid


def build_files(dist: Path) -> list[Path]:
    if not (dist / "index.html").is_file():
        raise ValueError("dist/index.html is missing. Run npm run build first.")
    files = sorted(path for path in dist.rglob("*") if path.is_file())
    for path in dist.rglob("*"):
        if path.is_symlink():
            raise ValueError("Symlinks are not allowed in the deployment directory.")
    return sorted(files, key=lambda path: (path == dist / "index.html", path.as_posix()))


def required(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise ValueError(f"Missing GitHub Actions secret: {name}")
    if "\r" in value or "\n" in value:
        raise ValueError(f"Invalid line break in {name}")
    return value


def connect(host: str, username: str, password: str, remote_dir: str) -> ftplib.FTP:
    ftp = ftplib.FTP(timeout=30, encoding="utf-8")
    try:
        ftp.connect(host, 21)
        ftp.login(username, password)
        ftp.set_pasv(True)
        ftp.cwd(remote_dir)
        return ftp
    except Exception:
        ftp.close()
        raise


def ensure_directory(ftp: ftplib.FTP, relative: PurePosixPath) -> None:
    current = PurePosixPath()
    for part in relative.parts:
        current /= part
        try:
            ftp.mkd(current.as_posix())
        except ftplib.error_perm:
            # An existing directory is expected on subsequent deployments.
            original = ftp.pwd()
            try:
                ftp.cwd(current.as_posix())
            finally:
                ftp.cwd(original)


def upload(dist: Path, files: list[Path]) -> None:
    host = required("FTP_HOST")
    username = required("FTP_USERNAME")
    password = required("FTP_PASSWORD")
    remote_dir = required("FTP_REMOTE_DIR")
    if not PurePosixPath(remote_dir).parts or ".." in PurePosixPath(remote_dir).parts:
        raise ValueError("FTP_REMOTE_DIR must point to the intended public_html directory.")
    ftp = connect(host, username, password, remote_dir)
    suffix = uuid.uuid4().hex[:12]
    try:
        for path in files:
            relative = PurePosixPath(path.relative_to(dist).as_posix())
            temporary = relative.with_name(f".{relative.name}.{suffix}.uploading")
            for attempt in range(3):
                try:
                    ensure_directory(ftp, relative.parent)
                    with path.open("rb") as source:
                        ftp.storbinary(f"STOR {temporary.as_posix()}", source)
                    ftp.rename(temporary.as_posix(), relative.as_posix())
                    print(f"Uploaded {relative.as_posix()}", flush=True)
                    break
                except (ftplib.Error, OSError, EOFError):
                    if attempt == 2:
                        raise
                    ftp.close()
                    time.sleep(2 * (attempt + 1))
                    ftp = connect(host, username, password, remote_dir)
    finally:
        ftp.close()
    print(f"Published {len(files)} files. Existing server files were preserved.", flush=True)


def verify_site(url: str, expected: bytes) -> None:
    separator = "&" if "?" in url else "?"
    verification_url = f"{url}{separator}deployment={uuid.uuid4().hex}"
    for attempt in range(3):
        try:
            request = urllib.request.Request(
                verification_url,
                headers={"Cache-Control": "no-cache", "User-Agent": "Tetris-Man-Deployment"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                if response.read() != expected:
                    raise ValueError("The live index.html does not match this build.")
            print("Website verified: live index.html matches the build.", flush=True)
            return
        except (urllib.error.URLError, OSError, ValueError):
            if attempt == 2:
                raise
            time.sleep(3)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="List deployment files without connecting.")
    args = parser.parse_args()
    dist = Path(__file__).resolve().parents[1] / "dist"
    try:
        files = build_files(dist)
        if args.dry_run:
            for path in files:
                print(path.relative_to(dist).as_posix())
            return 0
        upload(dist, files)
        if os.environ.get("SITE_URL"):
            verify_site(os.environ["SITE_URL"], (dist / "index.html").read_bytes())
        return 0
    except Exception as error:
        # Avoid exposing credentials that might appear in a remote server's error message.
        message = str(error)
        for name in ("FTP_PASSWORD", "FTP_USERNAME", "FTP_HOST"):
            secret = os.environ.get(name)
            if secret:
                message = message.replace(secret, "***")
        print(f"Deployment failed ({type(error).__name__}): {message}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
