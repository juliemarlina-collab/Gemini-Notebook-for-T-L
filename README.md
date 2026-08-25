# Gemini Notebook Learning Kit Challenge

Static webinar website for GitHub Pages or Netlify. No build process is required.

This reviewed edition includes the completed Phase 2, 3, 5, 7, 8, 10 and 11 improvements while preserving the established nine-stage webinar flow. Phase 12 automated deployment checks are included for release validation.

## Phase 1 — Foundation stabilised

- Nine stages use consistent numbering and navigation.
- Back and Next routes follow the correct sequence.
- External links open safely in a new tab.
- Four local interface images are included in `assets`.
- English and Bahasa Melayu switching covers navigation, instructions, prompts, limits, activities, controls and form options.
- Screenshot labels use percentage positioning for responsive alignment.

## Phase 2 — Participant Pulse

- Seven useful questions are presented one at a time: familiarity, AI confidence, intended output, likely source, teaching field, main concern and teaching experience.
- Each question accepts only one answer.
- Participants cannot proceed without answering the current question.
- The progress bar tracks completed responses.
- A final profile summarises all selections as Guided Starter, Curious Explorer, Confident Creator or Peer Guide.

## Phase 3 — Interface Infographic

- Two viewing modes prevent overcrowding: Main Panels and Important Buttons.
- Main Panels labels Sources, Chat, Studio and Top Controls.
- Important Buttons labels Add Sources, Source Checkbox, Chat Input, Send, Citation, Save to Note, Studio Outputs, and Share & Settings.
- Callouts use percentage coordinates tied to the screenshot.
- Tablet and mobile layouts reduce callouts to numbered markers while retaining the complete explanations below.

## Phase 5 — Limits and Output Guidance

- Separates storage capacity from daily or monthly generation quotas.
- Provides selectable guidance for Standard, Plus, Pro, Ultra 20 TB and Ultra 30 TB plans.
- Shows where every output is generated and a practical teaching use for it.
- Includes the official Google Help link and a last-verified date of 24 August 2026.
- Warns that limits are plan-dependent, may differ for institutional Workspace accounts and are subject to change.

## Phase 7 — Learning Kit Generator

- Collects department, course, topic, student level, learning outcome and duration.
- Adds lesson framework, activity type, assessment method, differentiation and desired Studio output.
- Builds a bilingual, source-grounded prompt with lesson sequencing, alignment, active learning, assessment guidance, citations and lecturer verification.
- Includes a prompt-readiness indicator, copy action and direct Gemini Notebook link.

## Phase 8 — Output-Specific Prompts

- Provides separate templates for Audio Overview, Video Overview, Slide Deck, Infographic, Mind Map, Report/Study Guide, Flashcards, Quiz and Data Table.
- Every template defines its purpose, audience, structure, language, length and verification requirements.
- Template content adapts to the participant's selected student level and lesson topic.

## Phase 10 — Save and Export Participant Work

- Saves the current stage, language, survey, activities, checks, lesson inputs, output choice and exit ticket in browser storage.
- Restores participant progress automatically after refresh on the same browser and device.
- Includes a confirmed reset action, completion summary and a two-minute post-webinar check with five Likert statements plus one optional open response.
- Downloads a plain-text collection containing the source prompt, chat prompt, all nine output templates and the personalised Learning Kit prompt.

## Phase 11 — Accessibility

- Uses higher-contrast core colours and visible keyboard focus indicators.
- Adds a skip link, progress semantics, status announcements and descriptive control labels.
- Selected and completed states use text/check marks and ARIA state, not colour alone.
- Navigation, plan tabs and output templates support arrow-key movement; every action remains available through Tab and Enter/Space.
- All images have alternative text, and the active preview receives a contextual description.
- Respects `prefers-reduced-motion` and maintains readable mobile font and touch-target sizes.

## Phase 12 — Deployment Testing

Run the included automated release checks before deployment:

```bash
node deployment-check.js
```

The checker validates GitHub Pages and Netlify path portability, responsive breakpoints, EN/BM controls, prompt-copy targets, image files, external HTTPS links, accessibility markers, persistence/export functions and JavaScript syntax. Complete the live browser and hosted checks in `FINAL-QA-CHECKLIST.md` before renaming a release-candidate archive as the final deployment ZIP.

## Netlify

Drag the complete `gemini-notebook-static` folder or ZIP into Netlify Drop.

## GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `netlify.toml`, `README.md` and the `assets` folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then save.

Keep the file and folder names unchanged so all images load correctly.
