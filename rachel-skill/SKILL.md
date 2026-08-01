---
name: rachel-digital-human-production
description: Public-safe MiniMax overseas voice clone and HeyGen API workflow for creating digital-human talking-head videos. Use when Codex is asked to make, automate, QA, or batch-produce authorized 数字人/口播 videos from a script, portrait, voice sample, MiniMax voice cloning, HeyGen Image-to-Video, HeyGen Photo Avatar, a 15-second preview, full-video generation, or job-state tracking.
---

# Rachel Digital Human Production

## Core Rule

Use MiniMax for cloned narration and HeyGen for image-driven video. If a MiniMax audio file is available, drive HeyGen with the uploaded audio asset. Do not switch to HeyGen `script + voice_id` unless the user explicitly asks to use HeyGen's own voice.

Always preserve the production gate:

```text
asset check -> MiniMax narration -> 15-second HeyGen preview -> user approval -> full HeyGen video -> download QA -> archive state
```

This skill is a workflow guide. It does not grant HeyGen, MiniMax, OpenAI, network, billing, or workspace permissions.

## Operating Boundaries

- Read secrets only from `MINIMAX_API_KEY` and `HEYGEN_API_KEY`.
- Never print full API keys, Authorization headers, signed temporary URLs, or full request headers.
- Treat MiniMax clone/TTS calls and HeyGen video creation as paid external actions. Request or rely on explicit user approval before the first paid/network action in a run.
- Keep generated assets under `inputs/`, `work/`, and `outputs/` unless the user names another directory.
- Write or update `work/job-state.json` before and after every external job stage.
- If a previous state file exists, reuse existing `voice_id`, `asset_id`, and `video_id` when the corresponding source file has not changed.
- If the user asks for a full video, still create a 15-second preview first unless they explicitly waive the preview gate.
- Require the user to confirm that the voice, portrait, script, and final use are authorized before cloning a voice or generating a video.
- Do not provide legal advice. When compliance, disclosure, consent, labor rights, biometric data, or platform policy questions are material, tell the user to verify the applicable rules before publishing.

## Required Workflow

### 1. Ingest

Collect these inputs:

- Script: usually `inputs/script.md`.
- Portrait: usually `inputs/portrait.jpg` or `inputs/portrait.png`.
- Voice source: usually `inputs/voice-source.mp3`, `.m4a`, or `.wav`.
- Optional project name, target platform, aspect ratio, and output naming.

If files live outside the workspace, ask for permission or tell the user what exact file access is needed.

If available, run `scripts/preflight_assets.py` to check file presence, extensions, sizes, and best-effort media duration before external API calls.

### 2. Validate Assets

Check before calling any API:

- Voice source format must be MP3, M4A, or WAV.
- Voice source duration must be 10 seconds to 5 minutes.
- Voice source size must be 20 MB or less.
- Portrait must be PNG or JPEG.
- HeyGen normal asset uploads should stay at 32 MB or less.
- The portrait should show a clear front-facing face, visible mouth, and head/shoulders.
- The script should be reviewed for long sentences, brand names, numbers, and acronyms that may need pronunciation testing.

If an input fails validation, stop and propose the smallest fix.

For exact public API facts, read `references/api-facts.md`. If a user asks for current parameters, pricing, or production code, verify against official MiniMax and HeyGen documentation before taking paid action.

### 3. Generate MiniMax Narration

- Upload the source voice for cloning.
- Create or reuse a stable `voice_id` such as `brand_person_yyyymmdd`.
- Generate the full narration audio with the cloned voice.
- Save the full audio as `work/voiceover-full.mp3`.
- Save the first 15 seconds as `work/preview-15s.mp3`.

If no state file exists, use `scripts/init_job_state.py` or the template in `references/checklists.md` to create `work/job-state.json`.

Prefer natural speaking speed for HeyGen mouth tracking. If Chinese lip sync looks strained, remake narration around speed `0.95` to `1.05` before regenerating video.

### 4. Generate HeyGen Preview

- Upload the portrait as an image asset if no matching `image_asset_id` exists.
- Upload `work/preview-15s.mp3` as an audio asset.
- Submit an Image-to-Video job for a 15-second preview, usually 720p for testing.
- Poll status until `completed` or `failed`.
- Download to `outputs/preview-15s.mp4`.
- Decode-check the downloaded MP4 before marking preview complete.

### 5. Pause For Approval

After preview generation, stop and ask the user to review:

- voice similarity
- Chinese lip sync
- face shape and mouth distortion
- blinking, head movement, shoulder movement
- framing and platform fit

Do not generate the full video until the user clearly approves the preview.

### 6. Generate Final

Only after approval:

- Upload `work/voiceover-full.mp3` as a HeyGen audio asset if needed.
- Submit the final HeyGen job, usually 1080p.
- Poll status without duplicate job submission.
- Download to `outputs/final-1080p.mp4` or the user-specified output name.
- Use retry/resume for downloads when available.
- Decode-check the entire MP4, not just the first few seconds.
- Update `work/job-state.json`.

## Batch Mode

For multiple scripts:

- Create one state record per video.
- Generate previews only by default.
- Place previews under `outputs/previews/`.
- Produce a review sheet listing preview path, duration, `video_id`, and review notes.
- Do not generate any full videos until the user approves specific previews.

## Failure Policy

- If an API call returns a clear `failed` status, record the failure reason and ask before retrying paid generation.
- If polling times out, do not assume generation failed. Resume polling by `video_id`.
- If download fails or the MP4 is corrupt, retry download before regenerating the video.
- If a signed URL expires, refetch job status or asset metadata instead of creating a new paid job.

## Public Distribution Policy

- Treat this skill as shareable workflow instructions, not as a hosted service.
- Do not bundle `.env` files, API keys, private portraits, voice samples, generated videos, job-state files from real clients, or signed download URLs.
- If publishing the skill publicly, include only `SKILL.md`, `agents/openai.yaml`, `references/`, and `scripts/`.
- Make the user bring their own MiniMax and HeyGen accounts, keys, billing, and rights to the source materials.
- For public use, prefer explicit invocation with `$rachel-digital-human-production` so paid workflows do not trigger accidentally.
- If publishing through a repository, marketplace, or team distribution channel, choose a package-level license outside the skill instructions.

## References

Read these only when needed:

- `references/checklists.md` for the state template, reusable prompts, and QA checklist.
- `references/api-facts.md` for the currently documented MiniMax and HeyGen facts this workflow relies on.
- `references/public-safety.md` for consent, disclosure, sharing, and public-release guidance.

If exact API parameters, pricing, availability, or provider behavior matters, verify against official MiniMax and HeyGen documentation before coding or running paid requests.
