const fs = require('fs');
const path = require('path');

const root = __dirname;
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const results = [];
const check = (name, condition, detail = '') => results.push({ name, pass: Boolean(condition), detail });

check('Entry file', fs.existsSync(htmlPath), 'index.html');
check('Netlify configuration', fs.existsSync(path.join(root, 'netlify.toml')), 'netlify.toml');
check('GitHub Pages portability', !/(?:src|href)=["']\/(?!\/)/.test(html), 'No root-relative asset paths');
check('Netlify portability', !/\b(?:require|import)\s*\(/.test(html), 'No build step or server dependency');
check('Responsive viewport', /<meta name="viewport"/.test(html));
check('Desktop layout', /max-width:1280px/.test(html));
check('Tablet breakpoint', /@media\(max-width:800px\)/.test(html));
check('Mobile breakpoint', /@media\(max-width:520px\)/.test(html));
check('Reduced motion', /prefers-reduced-motion:reduce/.test(html));
check('Visible focus', /:focus-visible/.test(html));
const luminance = hex => {
  const rgb = hex.match(/[0-9a-f]{2}/gi).map(x => parseInt(x, 16) / 255).map(x => x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
};
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
const contrastPairs = [['#17131d','#ffffff'],['#5520c7','#ffffff'],['#b60072','#ffffff'],['#b94700','#ffffff'],['#17131d','#d9ff36'],['#514a57','#ffffff']];
check('Core colour contrast', contrastPairs.every(([a,b]) => contrast(a,b) >= 4.5), contrastPairs.map(([a,b]) => `${a}/${b} ${contrast(a,b).toFixed(2)}:1`).join('; '));
check('Skip link', /class="skip-link"/.test(html) && /id="mainContent"/.test(html));
check('Progress semantics', /role="progressbar"/.test(html));
check('Browser persistence', /localStorage\.setItem/.test(html) && /localStorage\.getItem/.test(html));
check('Reset support', /localStorage\.removeItem/.test(html));
check('Download support', /new Blob/.test(html) && /downloadPromptCollection/.test(html));
check('English and BM', /setLang\('en'\)/.test(html) && /setLang\('bm'\)/.test(html));
const bmRequired = ['Bahasa Melayu','hasil pembelajaran','pentaksiran','Lakon peranan','Bahan Edaran Pembelajaran Aktif Bersemuka','Dek Slaid','halaman dimuat semula','Aplikasi web interaktif'];
const bmRejected = ['data-bm="Belum pernah guna"','data-bm="Guna sekali-sekala"','PAPARAN THUMBNAIL','selepas refresh','Webapp interaktif','Handout Pembelajaran Aktif Bersemuka'];
check('Standard Bahasa Melayu Malaysia', bmRequired.every(x => html.includes(x)) && bmRejected.every(x => !html.includes(x)), 'Professional Malaysian education terminology; no known mixed-language leftovers');
check('Natural Malaysian webinar language', /AGENDA PERJALANAN WEBINAR/.test(html) && /AGENDA WEBINAR/.test(html) && !/\['02','SESSION MAP','PETA SESI'\]/.test(html), 'Uses Agenda Webinar instead of literal Peta Sesi');
check('Official Gemini labels preserved', ['Sources','Chat','Studio','Add Sources','Fast Research','Slide Deck'].every(x => html.includes(x)), 'Official interface labels remain recognisable in BM mode');
const pulseBlock = html.match(/const pulseQuestions=\[([\s\S]*?)\n    \];/)?.[1] || '';
check('Seven-question Participant Pulse', (pulseBlock.match(/\{key:/g) || []).length === 7 && /QUESTION':'SOALAN/.test(html), 'One question per screen; one answer per question');
const demographicBlock = html.match(/const demographicQuestions=\[([\s\S]*?)\n    \];/)?.[1] || '';
check('Four participant demographics', (demographicBlock.match(/\{key:/g) || []).length === 4 && /demographicPayload/.test(html), 'Institution, role, age group and gender');
check(
  'Participant survey render target',
  html.includes("pulseHost.id='pulseApp'") &&
    html.includes("pulseHost.addEventListener('click'") &&
    !html.includes("getElementById('pulseHost')"),
  'Profile and Participant Pulse initialise against the same live element'
);
check('Research endpoint configuration', fs.existsSync(path.join(root, 'research-config.js')) && /window\.RESEARCH_CONFIG/.test(fs.readFileSync(path.join(root, 'research-config.js'), 'utf8')) && /submitResearchSurvey/.test(html), 'Apps Script endpoint can be configured separately');
check('Research activity payload', /activityData:\{selectedStudioOutput:/.test(html) && /learningKit:\{departmentField:/.test(html) && /verificationChecksCompleted:/.test(html) && /kitPromptGenerated:/.test(html), 'Studio choice, task completion and final learning-kit context');
check('Short post-webinar evaluation', new Set([...html.matchAll(/name="(eval[1-5])"/g)].map(m => m[1])).size === 5 && /id="evalFeedback"/.test(html), '5 Likert statements + 1 optional open response');

const images = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
check('Image alternative text', images.length > 0 && images.every(tag => /\balt=/.test(tag)), `${images.length} image elements`);
const localImages = [...new Set([...html.matchAll(/assets\/[A-Za-z0-9/._-]+\.png/g)].map(m => m[0]))];
const expectedImages = [
  'assets/notebook-interface.png', 'assets/notebook-library-list.png',
  'assets/notebook-library-thumbnail.png', 'assets/notebook-website.png',
  'assets/transformation/original-source.png',
  'assets/transformation/f2f-handout.png',
  'assets/transformation/class-slides.png'
];
check('Local images exist', expectedImages.every(f => localImages.includes(f) && fs.existsSync(path.join(root, f))), localImages.join(', '));
const evidenceResources = [
  'resources/due30022-original-enquiries-complaints.pdf',
  'resources/due30022-f2f-active-learning-handout.pdf',
  'resources/mastering-enquiries-complaints-class-slides.pptx'
];
check('DUE30022 evidence downloads', evidenceResources.every(f => html.includes(`href="${f}"`) && fs.existsSync(path.join(root, f))), evidenceResources.join(', '));

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
check('Unique element IDs', duplicateIds.length === 0, duplicateIds.join(', '));

const copyTargets = [...html.matchAll(/copyText\('([^']+)'/g)].map(m => m[1]);
check('Prompt copy buttons', copyTargets.length === 4 && copyTargets.every(id => ids.includes(id)), copyTargets.join(', '));
check('Output templates', (html.match(/name:\{en:/g) || []).length === 9, '9 templates');
check('Studio prompt fallback', /id="templateMenu"[\s\S]*data-template="8"/.test(html) && /id="outputPrompt">Create an Audio Overview/.test(html), 'Nine visible output choices and a copy-ready prompt before enhancement');
check('Tab 08 and 09 have distinct purposes', /ASK IN CHAT/.test(html) && /CHOOSE A STUDIO OUTPUT/.test(html) && /FINALISE YOUR CLASSROOM-READY KIT/.test(html) && /HOW THIS DIFFERS FROM TAB 08/.test(html), 'Practice first; personalise, verify and save in the capstone');

const externalLinks = [...html.matchAll(/href="(https:[^"]+)"/g)].map(m => m[1]);
check('External links use HTTPS', externalLinks.length > 0 && externalLinks.every(x => x.startsWith('https://')), externalLinks.join(', '));

const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';
try { new Function(script); check('JavaScript syntax', true); }
catch (error) { check('JavaScript syntax', false, error.message); }

const failed = results.filter(x => !x.pass);
console.table(results.map(x => ({ Status: x.pass ? 'PASS' : 'FAIL', Test: x.name, Detail: x.detail })));
console.log(`\n${results.length - failed.length}/${results.length} automated deployment checks passed.`);
if (failed.length) process.exit(1);
