# Final Deployment QA Checklist

## Automated result

- Status: **PASS — 26/26 checks**
- Run: `node deployment-check.js`
- External destinations verified reachable on 24 August 2026:
  - `https://notebook.google/`
  - `https://support.google.com/gemininotebook/answer/16213268`

## Live hosted tests required before final release

Deploy this release candidate to both target services, then tick every item.

| Environment | Desktop 1440 px | Tablet 768 px | Mobile 390 px | EN | BM | Keyboard only | Refresh restores work |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub Pages · Chrome | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| GitHub Pages · Edge | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Netlify · Chrome | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Netlify · Edge | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## Functional checks on each host

- [ ] All nine numbered stages open in order; Back and Next work.
- [ ] EN and BM switch every stage without removing form controls.
- [ ] All four images load and their accompanying labels align.
- [ ] Copy works for Source, Chat, Output Template and Learning Kit prompts.
- [ ] All nine output templates display and download in the prompt collection.
- [ ] Official Google and Gemini Notebook links open in a new tab.
- [ ] Survey, activity checks, generator inputs and exit ticket survive refresh.
- [ ] Reset clears saved progress only after confirmation.
- [ ] Skip link, Tab, Shift+Tab, Enter, Space and arrow-key groups work.
- [ ] Focus remains visible and selected/completed states show a check mark.
- [ ] Reduced-motion operating-system preference removes smooth movement.
- [ ] No horizontal scrolling or clipped text at 390 px, 768 px and 1440 px.

Do not label the archive as **FINAL** until every checkbox above passes.
