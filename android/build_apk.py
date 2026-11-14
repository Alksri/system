#!/usr/bin/env python3
"""
Build the System Portal Android APK from the website sources in this repo.

The APK bundles the whole site (every page, script, style, icon and animation
frame) under assets/www and serves it from a stable HTTPS origin inside a
native WebView. Everything works with no internet connection.

Usage:
    python android/build_apk.py

Output:
    android/dist/SystemPortal-1.0.0.apk
    SystemPortal.apk (repo root, easy to copy to a phone)
"""

import hashlib
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

from PIL import Image

ANDROID_DIR = Path(__file__).resolve().parent
ROOT = ANDROID_DIR.parent
APP_DIR = ANDROID_DIR / "app" / "src" / "main"
RES_DIR = APP_DIR / "res"
ASSETS_DIR = ANDROID_DIR / "build" / "assets"
BUILD_DIR = ANDROID_DIR / "build"
GEN_DIR = BUILD_DIR / "gen"
CLASSES_DIR = BUILD_DIR / "classes"
DEX_DIR = BUILD_DIR / "dex"
DIST_DIR = ANDROID_DIR / "dist"
KEYSTORE = ANDROID_DIR / "keystore" / "system-portal.jks"

VERSION_NAME = "1.0.0"
VERSION_CODE = "1"
MIN_SDK = "24"
TARGET_SDK = "34"
KEYSTORE_PASS = "systemportal"
KEY_ALIAS = "systemportal"

WEB_FILES = [
    "manifest.json",
]

WEB_DIRS = [
    "scripts",
    "styles",
    "icons",
    "vendor",
]


def log(message: str) -> None:
    print(f"[apk] {message}", flush=True)


def find_sdk() -> Path:
    candidates = []
    if os.environ.get("ANDROID_HOME"):
        candidates.append(Path(os.environ["ANDROID_HOME"]))
    if os.environ.get("ANDROID_SDK_ROOT"):
        candidates.append(Path(os.environ["ANDROID_SDK_ROOT"]))
    local = os.environ.get("LOCALAPPDATA")
    if local:
        candidates.append(Path(local) / "Android" / "Sdk")
    candidates.append(Path.home() / "AppData" / "Local" / "Android" / "Sdk")
    for candidate in candidates:
        if (candidate / "build-tools").is_dir() and (candidate / "platforms").is_dir():
            return candidate
    raise SystemExit("Android SDK not found. Set ANDROID_HOME.")


def pick_build_tools(sdk: Path) -> Path:
    versions = []
    for entry in (sdk / "build-tools").iterdir():
        if entry.is_dir() and (entry / "aapt2.exe").exists():
            try:
                versions.append((tuple(int(x) for x in re.findall(r"\d+", entry.name)), entry))
            except ValueError:
                continue
    if not versions:
        raise SystemExit("No usable build-tools found (need aapt2, d8, apksigner, zipalign).")
    versions.sort()
    return versions[-1][1]


def pick_platform(sdk: Path) -> Path:
    jars = sorted((sdk / "platforms").glob("android-*/android.jar"))
    if not jars:
        raise SystemExit("No platforms/android-*/android.jar found.")
    return jars[-1]


def find_jdk_tool(name: str) -> str:
    java_home = os.environ.get("JAVA_HOME")
    candidates = []
    if java_home:
        candidates.append(Path(java_home) / "bin" / f"{name}.exe")
    candidates.extend(
        [
            Path(r"C:\Program Files\Java\jdk-24\bin") / f"{name}.exe",
            Path(r"C:\Program Files\Java\jdk-21\bin") / f"{name}.exe",
            Path(r"C:\Program Files\Java\jdk-17\bin") / f"{name}.exe",
        ]
    )
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    found = shutil.which(name)
    if found:
        return found
    raise SystemExit(f"{name} not found. Install a JDK (17+).")


def run(cmd, cwd=None):
    log("run: " + " ".join(str(part) for part in cmd))
    result = subprocess.run(cmd, cwd=str(cwd) if cwd else None)
    if result.returncode != 0:
        raise SystemExit(f"Command failed with exit code {result.returncode}: {cmd[0]}")


def reset_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def generate_icons() -> None:
    """Create launcher/splash art at every density from the site icons."""
    source = Image.open(ROOT / "icons" / "icon-512.png").convert("RGBA")
    maskable = Image.open(ROOT / "icons" / "icon-maskable-512.png").convert("RGBA")

    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in densities.items():
        target = RES_DIR / folder
        target.mkdir(parents=True, exist_ok=True)
        icon = source.resize((size, size), Image.LANCZOS)
        icon.save(target / "ic_launcher.png", optimize=True)

    # Adaptive icon foreground: 108dp canvas at xxxhdpi (432px).
    foreground = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
    scaled = maskable.resize((432, 432), Image.LANCZOS)
    foreground.alpha_composite(scaled, (0, 0))
    foreground_dir = RES_DIR / "drawable-xxxhdpi"
    foreground_dir.mkdir(parents=True, exist_ok=True)
    foreground.save(foreground_dir / "ic_launcher_foreground.png", optimize=True)

    # Splash logo at ~171dp on xxhdpi screens.
    splash_dir = RES_DIR / "drawable-xxhdpi"
    splash_dir.mkdir(parents=True, exist_ok=True)
    source.resize((512, 512), Image.LANCZOS).save(splash_dir / "splash_logo.png", optimize=True)


def copy_web_assets() -> None:
    reset_dir(ASSETS_DIR)
    www = ASSETS_DIR / "www"
    www.mkdir(parents=True, exist_ok=True)

    for html in sorted(ROOT.glob("*.html")):
        target = www / html.name
        shutil.copy2(html, target)
        # Service-worker registration cannot succeed for WebView-intercepted
        # responses, so remove the registration block from the app copy. The
        # APK is already offline; the block is web-only.
        text = target.read_text(encoding="utf-8")
        text = re.sub(
            r"\s*<script>\s*if \('serviceWorker' in navigator\) \{.*?\}\s*</script>",
            "",
            text,
            flags=re.S,
        )
        target.write_text(text, encoding="utf-8")

    for name in WEB_FILES:
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, www / name)

    for dirname in WEB_DIRS:
        src = ROOT / dirname
        if src.is_dir():
            shutil.copytree(src, www / dirname)

    frames = 0
    for frame in sorted(ROOT.glob("ezgif-frame-*.jpg")):
        shutil.copy2(frame, www / frame.name)
        frames += 1

    # The APK is already fully offline. Keep the site's registration call happy
    # with a no-op worker instead of shipping the real precache worker (which
    # would duplicate 270 frames inside WebView storage for no benefit).
    (www / "sw.js").write_text(
        "/* System Portal Android app: all assets are bundled in the APK. */\n"
        "self.addEventListener('install', function () { self.skipWaiting(); });\n"
        "self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });\n",
        encoding="utf-8",
    )

    total = sum(f.stat().st_size for f in www.rglob("*") if f.is_file())
    log(f"bundled {len(list(www.glob('*.html')))} pages, {frames} frames, "
        f"{total / (1024 * 1024):.2f} MB of web assets")


def compile_java(javac: str, android_jar: Path) -> None:
    sources = sorted(str(p) for p in (APP_DIR / "java").rglob("*.java"))
    sources.extend(str(p) for p in GEN_DIR.rglob("*.java"))
    reset_dir(CLASSES_DIR)
    run(
        [
            javac,
            "-source", "17",
            "-target", "17",
            "-encoding", "UTF-8",
            "-classpath", str(android_jar),
            "-d", str(CLASSES_DIR),
        ]
        + sources
    )


def main() -> None:
    sdk = find_sdk()
    build_tools = pick_build_tools(sdk)
    android_jar = pick_platform(sdk)
    aapt2 = str(build_tools / "aapt2.exe")
    zipalign = str(build_tools / "zipalign.exe")
    apksigner = str(build_tools / "apksigner.bat")
    d8 = str(build_tools / "d8.bat")
    javac = find_jdk_tool("javac")
    keytool = find_jdk_tool("keytool")
    jar_tool = find_jdk_tool("jar")

    log(f"SDK        : {sdk}")
    log(f"build-tools: {build_tools.name}")
    log(f"platform   : {android_jar.parent.name}")

    reset_dir(BUILD_DIR)
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    generate_icons()
    copy_web_assets()

    compiled = BUILD_DIR / "compiled.zip"
    run([aapt2, "compile", "--dir", str(RES_DIR), "-o", str(compiled)])

    base_apk = BUILD_DIR / "base.apk"
    GEN_DIR.mkdir(parents=True, exist_ok=True)
    run(
        [
            aapt2, "link",
            "-o", str(base_apk),
            "-I", str(android_jar),
            "--manifest", str(APP_DIR / "AndroidManifest.xml"),
            "-R", str(compiled),
            "--java", str(GEN_DIR),
            "-A", str(ASSETS_DIR),
            "--min-sdk-version", MIN_SDK,
            "--target-sdk-version", TARGET_SDK,
            "--version-code", VERSION_CODE,
            "--version-name", VERSION_NAME,
            "--auto-add-overlay",
        ]
    )

    compile_java(javac, android_jar)

    classes_jar = BUILD_DIR / "classes.jar"
    run([jar_tool, "cf", str(classes_jar), "-C", str(CLASSES_DIR), "."])

    reset_dir(DEX_DIR)
    run(
        [
            "cmd", "/c", d8,
            "--release",
            "--min-api", MIN_SDK,
            "--lib", str(android_jar),
            "--output", str(DEX_DIR),
            str(classes_jar),
        ]
    )

    dex_file = DEX_DIR / "classes.dex"
    if not dex_file.exists():
        raise SystemExit("d8 did not produce classes.dex")

    unsigned = BUILD_DIR / "unsigned.apk"
    shutil.copy2(base_apk, unsigned)
    with zipfile.ZipFile(unsigned, "a", zipfile.ZIP_DEFLATED) as apk:
        apk.write(dex_file, "classes.dex")

    aligned = BUILD_DIR / "aligned.apk"
    run([zipalign, "-f", "-p", "4", str(unsigned), str(aligned)])

    if not KEYSTORE.exists():
        KEYSTORE.parent.mkdir(parents=True, exist_ok=True)
        log("creating signing keystore")
        run(
            [
                keytool,
                "-genkeypair",
                "-v",
                "-keystore", str(KEYSTORE),
                "-storepass", KEYSTORE_PASS,
                "-keypass", KEYSTORE_PASS,
                "-alias", KEY_ALIAS,
                "-keyalg", "RSA",
                "-keysize", "2048",
                "-validity", "10000",
                "-dname", "CN=System Portal, OU=Apps, O=Alksri, L=Local, C=IN",
            ]
        )

    signed = DIST_DIR / f"SystemPortal-{VERSION_NAME}.apk"
    if signed.exists():
        signed.unlink()
    run(
        [
            "cmd", "/c", apksigner, "sign",
            "--ks", str(KEYSTORE),
            "--ks-pass", f"pass:{KEYSTORE_PASS}",
            "--key-pass", f"pass:{KEYSTORE_PASS}",
            "--min-sdk-version", MIN_SDK,
            "--out", str(signed),
            str(aligned),
        ]
    )
    run(["cmd", "/c", apksigner, "verify", "--print-certs", str(signed)])

    root_copy = ROOT / "SystemPortal.apk"
    shutil.copy2(signed, root_copy)

    digest = hashlib.sha256(signed.read_bytes()).hexdigest()
    size_mb = signed.stat().st_size / (1024 * 1024)
    log("")
    log(f"BUILD OK  {signed}  ({size_mb:.2f} MB)")
    log(f"copy      {root_copy}")
    log(f"sha256    {digest}")


if __name__ == "__main__":
    main()
