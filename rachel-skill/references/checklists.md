# Rachel Digital Human Production Checklists

## Directory Layout

```text
project/
├── inputs/
│   ├── portrait.jpg
│   ├── voice-source.mp3
│   └── script.md
├── work/
│   ├── voiceover-full.mp3
│   ├── preview-15s.mp3
│   └── job-state.json
└── outputs/
    ├── preview-15s.mp4
    └── final-1080p.mp4
```

## State Template

```json
{
  "project": "digital-human-demo",
  "created_at": "YYYY-MM-DD",
  "minimax": {
    "source_file_id": "redacted",
    "voice_id": "brand_person_yyyymmdd",
    "tts_model": "speech-2.8-hd",
    "full_audio": "work/voiceover-full.mp3",
    "preview_audio": "work/preview-15s.mp3"
  },
  "heygen": {
    "image_asset_id": "redacted",
    "preview_audio_asset_id": "redacted",
    "preview_video_id": "redacted",
    "full_audio_asset_id": "redacted",
    "full_video_id": "redacted"
  },
  "status": {
    "preview": "not_started",
    "approved_by_user": false,
    "final": "not_started"
  },
  "outputs": {
    "preview_video": "outputs/preview-15s.mp4",
    "final_video": null
  }
}
```

Never store full API keys, Authorization headers, or signed temporary URLs in this file.

## Preview Review Checklist

- Voice sounds like the intended speaker.
- Chinese mouth shape follows the audio naturally.
- Face shape, teeth, lips, and jaw do not warp.
- Blinking, nodding, and shoulder movement look natural.
- Portrait framing fits the target platform.
- Audio speed is not too fast for lip sync.
- There are no clipped words at the start or end.

## Reusable Prompt: Preview Only

```text
Use $rachel-digital-human-production to make only a 15-second preview.

Inputs:
- Script: inputs/script.md
- Portrait: inputs/portrait.jpg
- Voice sample: inputs/voice-source.mp3
- MiniMax key: MINIMAX_API_KEY
- HeyGen key: HEYGEN_API_KEY

Requirements:
- Validate assets before API calls.
- Generate work/preview-15s.mp3 and outputs/preview-15s.mp4.
- Record IDs and status in work/job-state.json.
- Stop after preview and wait for my approval.
- Do not reveal full keys or signed URLs.
```

## Reusable Prompt: Final After Approval

```text
Use $rachel-digital-human-production to continue from work/job-state.json.

The preview is approved. Generate the full 1080p version.

Requirements:
- Reuse existing voice_id and asset_id values when possible.
- Do not reclone the voice unless required.
- Download to outputs/final-1080p.mp4.
- Decode-check the full MP4.
- Update work/job-state.json.
```

## Reusable Prompt: Batch Previews

```text
Use $rachel-digital-human-production for batch preview production.

Inputs:
- Scripts: inputs/scripts/*.md
- Portrait: inputs/portrait.jpg
- Voice sample: inputs/voice-source.mp3

Requirements:
- Create one independent state record per script.
- Generate previews only.
- Put preview videos in outputs/previews/.
- Create outputs/preview-review.md with paths, durations, video IDs, and review notes.
- Do not generate full videos until I approve specific previews.
```
