# Gemini Notebook Webinar Research Database

This package connects the existing webinar webapp to a Google Sheets research database.

## What the database creates

Running `setupResearchDatabase()` creates one Google spreadsheet with four tabs:

1. **Responses_Raw** — one participant per row; never edit this raw sheet during data cleaning.
2. **Codebook** — variable definitions, measurement types and numeric coding.
3. **Config** — study metadata, privacy settings and research notes.
4. **Summary** — live response totals and mean post-webinar scores.

The database uses **71 current headers**. It records four demographic items, seven Participant Pulse responses, completion of the Sources and Chat + Studio challenges, the selected Studio output, the participant's learning-kit settings, six verification checks, five post-webinar ratings and optional feedback. It does **not** request a participant's name, email address or IP address.

## Part A — Create the Google Sheets database

1. Open [Google Apps Script](https://script.google.com/).
2. Select **New project**.
3. Replace the default `Code.gs` content with the supplied `Code.gs` file.
4. Open **Project Settings** and enable **Show appsscript.json manifest file in editor**.
5. Replace the manifest content with the supplied `appsscript.json` file.
6. At the top of the editor, choose `setupResearchDatabase` and click **Run**.
7. Authorise the project using the Google account that should own the research data.
8. Open **Execution log**. Copy the Google Sheets URL shown after `Database created:`.

## Part B — Deploy the response endpoint

1. In Apps Script, click **Deploy → New deployment**.
2. Select **Web app**.
3. Use these settings:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and copy the URL ending in `/exec`.
5. Do not use the `/dev` testing URL in the public webinar site.

## Part C — Connect the existing webapp

The latest webapp package already contains the demographic section, consent box and submission code. To connect it:

1. Open `research-config.js` in the webapp folder.
2. Replace the empty endpoint:

   ```js
   endpoint: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
   ```

   with the `/exec` URL from Part B.
3. Change `sessionCode` for each webinar cohort, for example:

   ```js
   sessionCode: 'GNB-POLIPD-2026-08'
   ```

4. Upload the complete updated website folder to GitHub Pages or Netlify.

The separate HTML, CSS and JavaScript snippets remain included for reference or use with another website.

## Test before the webinar

1. Submit one complete test response.
2. Confirm that one row appears in `Responses_Raw`.
3. Submit again from the same browser and confirm that the existing row is updated rather than duplicated.
4. Test both English and Bahasa Melayu.
5. Confirm that the four demographic variables, seven Participant Pulse variables, activity completion counts, selected Studio output, learning-kit fields, verification count and five post-webinar ratings are populated.
6. Mark or remove the test record before analysis; do not silently mix it with participant data.

## Research-quality recommendations

- Obtain institutional ethics or research approval where required.
- Display a short participant information statement before the consent checkbox.
- Participation should be voluntary and should not affect attendance, assessment or access to webinar materials.
- Keep the optional written response optional.
- Do not collect names or email addresses unless they are genuinely necessary and separately approved.
- Restrict access to the spreadsheet and retain data only for the approved period.
- Export `Responses_Raw` as CSV for SPSS, Jamovi, R or other statistical analysis.
- Perform cleaning in a separate sheet or exported dataset; preserve the original raw data.

## Suggested analysis structure

- Frequencies and percentages: familiarity, intended output, source type, teaching field, concern and teaching experience.
- Frequencies and percentages: selected Studio output, lesson framework, activity type, assessment method and desired final output.
- Completion indicators: Sources tasks, Chat + Studio tasks, generated learning kit and professional verification checks.
- Means and standard deviations: the five post-webinar Likert items.
- Reliability: Cronbach's alpha only if the five items are justified as measuring one coherent construct; otherwise analyse them separately.
- Comparisons: post-webinar confidence by prior familiarity or teaching experience, subject to suitable sample size and assumptions.
- Qualitative analysis: thematic coding of the optional feedback response.
