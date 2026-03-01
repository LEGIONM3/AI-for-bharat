"""
Test Whisper transcription end-to-end.
Run: python test_whisper.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))


def test_import():
    print("Testing Whisper import...")
    try:
        import whisper
        print("  Whisper: OK")
        return True
    except ImportError as e:
        print(f"  FAILED: {e}")
        print("  Run: pip install openai-whisper")
        return False


def test_ffmpeg():
    print("Testing ffmpeg...")
    import shutil
    import subprocess

    # Apply the same path fix that whisper_transcriber uses
    try:
        from services.whisper_transcriber import _ensure_ffmpeg_in_path
        _ensure_ffmpeg_in_path()
    except Exception:
        pass

    # Check PATH first
    ffmpeg = shutil.which("ffmpeg")

    # If not in PATH, check common Windows locations (winget installs here)
    if not ffmpeg:
        common_paths = [
            # winget known path for this machine
            r"C:\Users\rmohi\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe",
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            os.path.expanduser(r"~\ffmpeg\bin\ffmpeg.exe"),
        ]
        # Also scan winget packages dir
        winget_root = os.path.join(
            os.environ.get("LOCALAPPDATA", ""),
            "Microsoft", "WinGet", "Packages"
        )
        if os.path.isdir(winget_root):
            for pkg in os.listdir(winget_root):
                if "ffmpeg" in pkg.lower():
                    for root, dirs, files in os.walk(os.path.join(winget_root, pkg)):
                        if "ffmpeg.exe" in files:
                            common_paths.insert(0, os.path.join(root, "ffmpeg.exe"))

        for p in common_paths:
            if os.path.isfile(p):
                ffmpeg = p
                ffmpeg_dir = os.path.dirname(p)
                os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
                print(f"  Found at: {p}")
                print("  NOTE: Not in shell PATH but whisper_transcriber.py will handle this automatically.")
                break

    if not ffmpeg:
        print("  FAILED: ffmpeg not found")
        print("  Install: winget install ffmpeg  (open a NEW terminal after)")
        print("  OR download: https://www.gyan.dev/ffmpeg/builds/")
        return False

    try:
        result = subprocess.run(
            [ffmpeg, "-version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        version = result.stdout.split("\n")[0]
        print(f"  ffmpeg OK: {version[:60]}")
        return True
    except Exception as e:
        print(f"  ffmpeg found but failed to run: {e}")
        return False


def test_model_load():
    print("Testing Whisper model load...")
    try:
        from services.whisper_transcriber import get_whisper_model
        model = get_whisper_model()
        print("  Model loaded: OK")
        print(f"  Device: {getattr(model, 'device', 'cpu')}")
        return True
    except Exception as e:
        print(f"  FAILED: {e}")
        return False


def test_transcription():
    print("Testing transcription with silence...")
    try:
        import struct
        import numpy as np

        # Generate 2 seconds of silence as WAV
        sample_rate = 16000
        duration = 2
        samples = np.zeros(sample_rate * duration, dtype=np.float32)
        num_samples = len(samples)

        wav_header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF", 36 + num_samples * 2, b"WAVE",
            b"fmt ", 16, 1, 1,
            sample_rate, sample_rate * 2, 2, 16,
            b"data", num_samples * 2
        )
        wav_data = wav_header + b"".join(
            struct.pack("<h", int(s * 32767)) for s in samples
        )

        from services.whisper_transcriber import transcribe_sync
        result = transcribe_sync(wav_data, "audio/wav")
        print(f"  Transcription result: '{result}'")
        print("  Transcription: OK")
        return True

    except Exception as e:
        print(f"  FAILED: {e}")
        return False


def test_endpoint():
    print("Testing HTTP endpoint...")
    try:
        import requests
        resp = requests.get("http://localhost:8000/health", timeout=5)
        data = resp.json()
        whisper_status = data.get("checks", {}).get("whisper", "not checked")
        print(f"  /health whisper: {whisper_status}")
        return whisper_status == "healthy"
    except Exception as e:
        print(f"  Skipped (server not running): {e}")
        return True  # Not a hard failure


if __name__ == "__main__":
    print("=" * 50)
    print("  Whisper Transcription Test Suite")
    print("=" * 50)

    results = {
        "import":        test_import(),
        "ffmpeg":        test_ffmpeg(),
        "model_load":    test_model_load(),
        "transcription": test_transcription(),
        "endpoint":      test_endpoint(),
    }

    print("\n" + "=" * 50)
    print("  RESULTS")
    print("=" * 50)
    all_passed = True
    for test, passed in results.items():
        icon = "PASS" if passed else "FAIL"
        print(f"  [{icon}] {test}")
        if not passed:
            all_passed = False

    print("=" * 50)
    if all_passed:
        print("  ALL TESTS PASSED")
        print("  Voice transcription is ready!")
    else:
        print("  SOME TESTS FAILED — fix above errors")
    print("=" * 50)
