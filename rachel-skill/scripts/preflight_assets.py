#!/usr/bin/env python3
"""Preflight script, portrait, and voice-source assets before paid API calls."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Set


VOICE_EXTENSIONS = {".mp3", ".m4a", ".wav"}
PORTRAIT_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_VOICE_BYTES = 20 * 1024 * 1024
MAX_ASSET_BYTES = 32 * 1024 * 1024


def duration_seconds(path: Path) -> Optional[float]:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return None
    proc = subprocess.run(
        [
            ffprobe,
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if proc.returncode != 0:
        return None
    try:
        return float(proc.stdout.strip())
    except ValueError:
        return None


def check_file(path: Path, allowed_exts: Set[str], max_bytes: Optional[int] = None) -> List[str]:
    issues: List[str] = []
    if not path.exists():
        return [f"{path} does not exist"]
    if not path.is_file():
        issues.append(f"{path} is not a file")
    if path.suffix.lower() not in allowed_exts:
        issues.append(f"{path} extension must be one of {sorted(allowed_exts)}")
    if max_bytes is not None and path.stat().st_size > max_bytes:
        issues.append(f"{path} is larger than {max_bytes} bytes")
    return issues


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--script", default="inputs/script.md")
    parser.add_argument("--portrait", default="inputs/portrait.jpg")
    parser.add_argument("--voice", default="inputs/voice-source.mp3")
    args = parser.parse_args()

    script = Path(args.script)
    portrait = Path(args.portrait)
    voice = Path(args.voice)

    issues: List[str] = []
    issues.extend(check_file(script, {".md", ".txt"}))
    issues.extend(check_file(portrait, PORTRAIT_EXTENSIONS, MAX_ASSET_BYTES))
    issues.extend(check_file(voice, VOICE_EXTENSIONS, MAX_VOICE_BYTES))

    voice_duration = duration_seconds(voice) if voice.exists() else None
    if voice_duration is not None and not (10 <= voice_duration <= 300):
        issues.append(f"{voice} duration should be 10 to 300 seconds; got {voice_duration:.2f}")

    report = {
        "ok": not issues,
        "issues": issues,
        "files": {
            "script": str(script),
            "portrait": str(portrait),
            "voice": str(voice),
        },
        "voice_duration_seconds": voice_duration,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    raise SystemExit(main())
