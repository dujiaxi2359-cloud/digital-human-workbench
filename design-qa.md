# Design QA

- source: selected 「流程板」 visual direction plus user-provided Apple visual direction
- viewport: 1440 x 1024
- layout: sidebar, workflow stepper, six asset cards, approval strip, production queue, activity table
- visual direction: Apple-like system typography, white and `#f5f5f7` surfaces, graphite text, restrained Apple blue primary actions, soft borders, translucent generation panel
- React Bits: local `SpotlightCard` applied to asset cards with a restrained blue hover highlight; no decorative background animation
- interaction states: generation panel, generation loading state, local file import, preflight, preview gate, approve/reject, final generation
- build: passed with `npm run build`
- local page: served successfully from `http://127.0.0.1:5174/`

## Final Result

final result: blocked

The Codex browser tab is open for manual review. Automated pixel capture was blocked because the local headless browser executable is unavailable in this environment; no provider API calls were made.
