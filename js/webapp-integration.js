/* Paste this block near the end of the existing webapp's <script>. */

const RESEARCH_ENDPOINT = 'PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE';
const RESEARCH_SESSION_CODE = 'GNB-WEBINAR-2026';
const RESEARCH_WEBAPP_VERSION = '1.2';

function getAnonymousResponseId() {
  const key = 'geminiNotebookAnonymousResearchId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'GNB_' + Date.now().toString(36) + '_' + crypto.getRandomValues(new Uint32Array(2)).join('_');
    localStorage.setItem(key, id);
  }
  return id;
}

async function submitResearchSurvey() {
  const consent = document.getElementById('researchConsent');
  const status = document.getElementById('researchSubmitStatus');
  const button = document.getElementById('submitResearchData');

  if (!consent || !consent.checked) {
    status.textContent = lang === 'bm'
      ? 'Sila berikan persetujuan sebelum menghantar respons.'
      : 'Please provide consent before submitting your responses.';
    return;
  }

  if (RESEARCH_ENDPOINT.includes('PASTE_YOUR')) {
    status.textContent = lang === 'bm'
      ? 'Pautan pangkalan data belum dikonfigurasikan.'
      : 'The database endpoint has not been configured.';
    return;
  }

  const base = getResearchPayload(); // Already available in the current webapp.
  const demographicItems = Object.values(base.demographics || {});
  if (demographicItems.length !== 4 || demographicItems.some(item => item.optionIndex === '')) {
    status.textContent = lang === 'bm'
      ? 'Sila lengkapkan empat maklumat profil peserta.'
      : 'Please complete the four participant-profile items.';
    return;
  }
  const payload = Object.assign({}, base, {
    responseId: getAnonymousResponseId(),
    consent: true,
    sessionCode: RESEARCH_SESSION_CODE,
    webappVersion: RESEARCH_WEBAPP_VERSION,
    language: lang
  });

  button.disabled = true;
  status.textContent = lang === 'bm' ? 'Menghantar respons…' : 'Submitting responses…';

  try {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Submission failed.');
    status.textContent = lang === 'bm'
      ? '✓ Respons penyelidikan telah direkodkan.'
      : '✓ Research response recorded.';
    localStorage.setItem('geminiNotebookResearchSubmitted', 'true');
  } catch (error) {
    status.textContent = lang === 'bm'
      ? 'Respons tidak dapat dihantar. Sila semak sambungan dan cuba lagi.'
      : 'The response could not be submitted. Check the connection and try again.';
    console.error(error);
  } finally {
    button.disabled = false;
  }
}

document.getElementById('submitResearchData')
  .addEventListener('click', submitResearchSurvey);
