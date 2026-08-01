#!/usr/bin/env python3
"""Create a digital-human job-state.json skeleton."""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path
from typing import Any, Dict


def build_state(project: str) -> Dict[str, Any]:
    return {
        "project": project,
        "created_at": date.today().isoformat(),
        "minimax": {
            "source_file_id": None,
            "voice_id": None,
            "tts_model": None,
            "full_audio": "work/voiceover-full.mp3",
            "preview_audio": "work/preview-15s.mp3",
        },
        "heygen": {
            "image_asset_id": None,
            "preview_audio_asset_id": None,
            "preview_video_id": None,
            "full_audio_asset_id": None,
            "full_video_id": None,
        },
        "status": {
            "preview": "not_started",
            "approved_by_user": False,
            "final": "not_started",
        },
        "outputs": {
            "preview_video": "outputs/preview-15s.mp4",
            "final_video": None,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default="digital-human-demo")
    parser.add_argument("--out", default="work/job-state.json")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    out = Path(args.out)
    if out.exists() and not args.force:
        raise SystemExit(f"{out} already exists; pass --force to overwrite")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(build_state(args.project), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
