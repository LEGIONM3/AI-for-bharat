"""
Whisper-based speech-to-text transcription.
Replaces Amazon Transcribe.
Runs locally on CPU — no AWS subscription needed.
"""
import os
import sys
import tempfile
import logging
import shutil
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# ── ffmpeg PATH fix for Windows ──────────────────────────────────────────────
# Whisper needs ffmpeg to decode audio formats (webm, ogg, mp4, etc.)
# winget installs it under AppData but doesn't always update the current
# process PATH. We probe common locations and inject whichever we find.
def _ensure_ffmpeg_in_path() -> None:
    """Add ffmpeg to current process PATH if not already there."""
    # Check all users under AppData (winget default location)
    _winget_glob_roots = [
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet", "Packages"),
        r"C:\Users\rmohi\AppData\Local\Microsoft\WinGet\Packages",
    ]
    # Static well-known locations
    _static_locations = [
        # winget-specific known path from this machine
        r"C:\Users\rmohi\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin",
        r"C:\ffmpeg\bin",
        r"C:\Program Files\ffmpeg\bin",
        r"C:\Program Files (x86)\ffmpeg\bin",
        os.path.expanduser(r"~\ffmpeg\bin"),
        r"C:\ProgramData\chocolatey\bin",
        r"C:\tools\ffmpeg\bin",
        r"C:\tools\ffmpeg-full_build\bin",
    ]

    # Also scan winget packages directory for any ffmpeg install
    _dynamic_locations = []
    for root in _winget_glob_roots:
        if os.path.isdir(root):
            try:
                for pkg in os.listdir(root):
                    if "ffmpeg" in pkg.lower() or "FFmpeg" in pkg:
                        bin_dir = os.path.join(root, pkg)
                        # Walk one level to find bin/
                        for subdir in os.listdir(bin_dir):
                            candidate = os.path.join(bin_dir, subdir, "bin")
                            if os.path.isdir(candidate):
                                _dynamic_locations.append(candidate)
                            # Also check if the pkg itself has bin/
                        if os.path.isdir(os.path.join(bin_dir, "bin")):
                            _dynamic_locations.append(os.path.join(bin_dir, "bin"))
            except Exception:
                pass

    all_locations = _dynamic_locations + _static_locations
    current_path = os.environ.get("PATH", "")

    for loc in all_locations:
        ffmpeg_exe = os.path.join(loc, "ffmpeg.exe")
        if os.path.isfile(ffmpeg_exe) and loc not in current_path:
            os.environ["PATH"] = loc + os.pathsep + current_path
            logger.info(f"Added ffmpeg to PATH: {loc}")
            return

    # Also try refreshing from registry (picks up winget PATH changes)
    try:
        import winreg
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Environment"
        ) as key:
            user_path, _ = winreg.QueryValueEx(key, "PATH")
            if user_path and user_path not in current_path:
                os.environ["PATH"] = user_path + os.pathsep + current_path
    except Exception:
        pass


# Run at import time so the PATH is set before Whisper tries to call ffmpeg
_ensure_ffmpeg_in_path()

# ─────────────────────────────────────────────────────────────────────────────

# Global model instance — loaded once, reused
_whisper_model = None
_executor = ThreadPoolExecutor(max_workers=2)


def get_whisper_model():
    """
    Load Whisper base model.
    Downloads ~150MB on first run, then cached at ~/.cache/whisper/
    Thread-safe singleton.
    """
    global _whisper_model
    if _whisper_model is None:
        logger.info("Loading Whisper model (first run downloads ~150MB)...")
        import whisper
        _whisper_model = whisper.load_model("base")
        logger.info("Whisper model loaded OK")
    return _whisper_model


def _verify_ffmpeg() -> str:
    """
    Locate ffmpeg executable.
    Re-runs path fix then does a shutil.which search.
    Raises RuntimeError with actionable message if not found.
    """
    _ensure_ffmpeg_in_path()

    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        return ffmpeg_path

    # Absolute last resort — check known paths directly
    fallback_paths = [
        r"C:\Users\rmohi\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        os.path.expanduser(r"~\ffmpeg\bin\ffmpeg.exe"),
    ]
    for p in fallback_paths:
        if os.path.isfile(p):
            ffmpeg_dir = os.path.dirname(p)
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
            logger.info(f"Found ffmpeg via fallback path: {p}")
            return p

    raise RuntimeError(
        "ffmpeg not found. Whisper requires ffmpeg to decode audio.\n"
        "Fix: open a NEW terminal (not this one) and run:\n"
        "  winget install ffmpeg\n"
        "Then restart the backend server."
    )


def transcribe_sync(
    audio_bytes: bytes,
    content_type: str = "audio/webm"
) -> str:
    """
    Transcribe audio bytes to text using Whisper.
    Runs synchronously — call via transcribe_async() to avoid
    blocking the FastAPI event loop.

    Args:
        audio_bytes: Raw audio file bytes
        content_type: MIME type of audio

    Returns:
        Transcribed text string
    """
    # Ensure ffmpeg is reachable (re-checks in case env changed)
    ffmpeg_path = _verify_ffmpeg()
    logger.info(f"Using ffmpeg at: {ffmpeg_path}")

    # Determine file extension from content type
    suffix = ".webm"
    if "wav" in content_type:
        suffix = ".wav"
    elif "mp4" in content_type:
        suffix = ".mp4"
    elif "ogg" in content_type:
        suffix = ".ogg"
    elif "mpeg" in content_type or "mp3" in content_type:
        suffix = ".mp3"

    tmp_path = None
    try:
        # Write to temp file (Whisper needs a file path, not bytes)
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        logger.info(f"Transcribing: {len(audio_bytes)} bytes, format={suffix}")

        model = get_whisper_model()
        result = model.transcribe(
            tmp_path,
            language="en",
            fp16=False,      # CPU mode — no GPU required
            verbose=False,
        )

        transcript = result["text"].strip()

        if len(transcript) > 50:
            logger.info(f"Transcription complete: '{transcript[:50]}...'")
        else:
            logger.info(f"Transcription complete: '{transcript}'")

        return transcript if transcript else "[No speech detected]"

    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}", exc_info=True)
        raise RuntimeError(f"Transcription failed: {str(e)}")

    finally:
        # Always clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


async def transcribe_async(
    audio_bytes: bytes,
    content_type: str = "audio/webm"
) -> str:
    """
    Async wrapper for transcribe_sync.
    Runs Whisper in a thread pool to avoid blocking FastAPI event loop.
    """
    import asyncio
    loop = asyncio.get_event_loop()
    transcript = await loop.run_in_executor(
        _executor,
        transcribe_sync,
        audio_bytes,
        content_type,
    )
    return transcript


def test_whisper() -> dict:
    """
    Quick self-test — verifies Whisper is installed and model loads.
    Returns status dict.
    """
    try:
        model = get_whisper_model()
        return {
            "status": "ok",
            "model": "base",
            "device": str(getattr(model, "device", "cpu")),
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
        }
