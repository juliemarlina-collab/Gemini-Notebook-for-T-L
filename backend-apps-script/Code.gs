/**
 * Gemini Notebook Webinar Research Database
 * Google Apps Script backend for the existing interactive webapp.
 *
 * Privacy-by-default design:
 * - does not collect names, email addresses or IP addresses;
 * - requires an explicit consent value;
 * - uses an anonymous browser-generated response ID;
 * - updates duplicate response IDs instead of adding duplicate rows.
 */

const DB = Object.freeze({
  TITLE: 'Gemini Notebook Webinar Research Database',
  RAW_SHEET: 'Responses_Raw',
  CODEBOOK_SHEET: 'Codebook',
  CONFIG_SHEET: 'Config',
  SUMMARY_SHEET: 'Summary',
  TIMEZONE: 'Asia/Kuala_Lumpur',
  PROP_ID: 'RESEARCH_SPREADSHEET_ID',
  MAX_FEEDBACK_LENGTH: 2000,
  EXPECTED_DEMOGRAPHICS: 4,
  EXPECTED_PULSE: 7,
  EXPECTED_EVALUATION: 5
});

const HEADERS = Object.freeze([
  'Response_ID', 'Submitted_At_UTC', 'Submitted_At_MY', 'Consent',
  'Session_Code', 'Webapp_Version', 'Language',
  'D1_Institution_Type_Code', 'D1_Institution_Type_Label_EN', 'D1_Institution_Type_Label_BM',
  'D2_Current_Role_Code', 'D2_Current_Role_Label_EN', 'D2_Current_Role_Label_BM',
  'D3_Age_Group_Code', 'D3_Age_Group_Label_EN', 'D3_Age_Group_Label_BM',
  'D4_Gender_Code', 'D4_Gender_Label_EN', 'D4_Gender_Label_BM',
  'Q1_Familiarity_Code', 'Q1_Familiarity_Label_EN', 'Q1_Familiarity_Label_BM',
  'Q2_AI_Confidence_Code', 'Q2_AI_Confidence_Label_EN', 'Q2_AI_Confidence_Label_BM',
  'Q3_Intended_Output_Code', 'Q3_Intended_Output_Label_EN', 'Q3_Intended_Output_Label_BM',
  'Q4_Likely_Source_Code', 'Q4_Likely_Source_Label_EN', 'Q4_Likely_Source_Label_BM',
  'Q5_Teaching_Field_Code', 'Q5_Teaching_Field_Label_EN', 'Q5_Teaching_Field_Label_BM',
  'Q6_Main_Concern_Code', 'Q6_Main_Concern_Label_EN', 'Q6_Main_Concern_Label_BM',
  'Q7_Teaching_Experience_Code', 'Q7_Teaching_Experience_Label_EN', 'Q7_Teaching_Experience_Label_BM',
  'Activity_Studio_Output_Code', 'Activity_Studio_Output_Label_EN', 'Activity_Studio_Output_Label_BM',
  'Sources_Tasks_Completed', 'Chat_Studio_Tasks_Completed',
  'Kit_Department_Field', 'Kit_Course', 'Kit_Topic', 'Kit_Student_Level',
  'Kit_Learning_Outcome', 'Kit_Duration', 'Kit_Lesson_Framework', 'Kit_Activity_Type',
  'Kit_Assessment_Method', 'Kit_Differentiation', 'Kit_Desired_Studio_Output',
  'Kit_Prompt_Generated', 'Verification_Checks_Completed', 'Exit_Ticket_Saved',
  'Post_1_Confidence', 'Post_2_Prompt_Alignment', 'Post_3_Webapp_Understanding',
  'Post_4_Verification_Confidence', 'Post_5_Intention_To_Use',
  'Optional_Feedback', 'Demographics_Complete', 'Pulse_Complete', 'Learning_Kit_Complete',
  'Post_Survey_Complete', 'Record_Status', 'Last_Updated_At_MY'
]);

const PULSE_KEYS = Object.freeze([
  'experience', 'confidence', 'purpose', 'source', 'department', 'concern', 'teachingExperience'
]);

const DEMOGRAPHIC_KEYS = Object.freeze([
  'institutionType', 'currentRole', 'ageGroup', 'gender'
]);

/** Run once from the Apps Script editor. */
function setupResearchDatabase() {
  const existingId = PropertiesService.getScriptProperties().getProperty(DB.PROP_ID);
  if (existingId) {
    const existing = SpreadsheetApp.openById(existingId);
    ensureDatabaseStructure_(existing);
    Logger.log('Existing database checked: ' + existing.getUrl());
    return existing.getUrl();
  }

  const spreadsheet = SpreadsheetApp.create(DB.TITLE);
  PropertiesService.getScriptProperties().setProperty(DB.PROP_ID, spreadsheet.getId());
  ensureDatabaseStructure_(spreadsheet);
  Logger.log('Database created: ' + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

/** Optional maintenance function after changing headers or codebook content. */
function repairResearchDatabase() {
  const spreadsheet = getDatabase_();
  ensureDatabaseStructure_(spreadsheet);
  return spreadsheet.getUrl();
}

/** Simple health check for the deployed web app URL. */
function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'Gemini Notebook Webinar Research Database',
    message: 'Endpoint is ready.',
    timestamp: new Date().toISOString()
  });
}

/** Receives the anonymous survey payload from the static webapp. */
function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const validated = validatePayload_(payload);
    const result = saveResponse_(validated);
    return jsonResponse_({
      ok: true,
      responseId: validated.responseId,
      action: result.action,
      message: result.action === 'updated' ? 'Existing response updated.' : 'Response recorded.'
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({ok: false, error: String(error.message || error)});
  }
}

function parsePayload_(e) {
  if (!e) throw new Error('No request received.');
  const raw = e.postData && e.postData.contents ? e.postData.contents : '';
  if (raw) {
    try { return JSON.parse(raw); }
    catch (error) { throw new Error('The request body is not valid JSON.'); }
  }
  if (e.parameter && e.parameter.payload) {
    try { return JSON.parse(e.parameter.payload); }
    catch (error) { throw new Error('The payload parameter is not valid JSON.'); }
  }
  throw new Error('Survey payload is empty.');
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid survey payload.');
  if (payload.consent !== true) throw new Error('Research consent is required.');

  const responseId = cleanText_(payload.responseId, 100);
  if (!/^[A-Za-z0-9_-]{12,100}$/.test(responseId)) {
    throw new Error('A valid anonymous response ID is required.');
  }

  const pulse = payload.participantPulse || {};
  const demographics = payload.demographics || pulse.demographics || {};
  const answers = pulse.answers || {};
  const post = payload.postWebinar || {};
  const ratings = Array.isArray(post.ratings) ? post.ratings : [];
  const activity = payload.activityData || {};
  const studioOutput = activity.selectedStudioOutput || {};
  const learningKit = activity.learningKit || {};

  const pulseAnswers = {};
  PULSE_KEYS.forEach(function(key) {
    const answer = answers[key] || {};
    const optionIndex = Number(answer.optionIndex);
    pulseAnswers[key] = {
      code: Number.isInteger(optionIndex) && optionIndex >= 0 ? optionIndex + 1 : '',
      en: cleanText_(answer.answerEn, 250),
      bm: cleanText_(answer.answerBm, 250)
    };
  });

  const demographicAnswers = {};
  DEMOGRAPHIC_KEYS.forEach(function(key) {
    const answer = demographics[key] || {};
    const optionIndex = Number(answer.optionIndex);
    demographicAnswers[key] = {
      code: Number.isInteger(optionIndex) && optionIndex >= 0 ? optionIndex + 1 : '',
      en: cleanText_(answer.answerEn, 250),
      bm: cleanText_(answer.answerBm, 250)
    };
  });

  const cleanRatings = Array.from({length: DB.EXPECTED_EVALUATION}, function(_, index) {
    const value = Number(ratings[index]);
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : '';
  });

  const studioOutputIndex = Number(studioOutput.optionIndex);
  const cleanLearningKit = {
    departmentField: cleanText_(learningKit.departmentField, 250),
    course: cleanText_(learningKit.course, 250),
    topic: cleanText_(learningKit.topic, 500),
    studentLevel: cleanText_(learningKit.studentLevel, 150),
    learningOutcome: cleanText_(learningKit.learningOutcome, 1000),
    duration: cleanText_(learningKit.duration, 100),
    lessonFramework: cleanText_(learningKit.lessonFramework, 200),
    activityType: cleanText_(learningKit.activityType, 200),
    assessmentMethod: cleanText_(learningKit.assessmentMethod, 200),
    differentiation: cleanText_(learningKit.differentiation, 300),
    desiredStudioOutput: cleanText_(learningKit.desiredStudioOutput, 200)
  };

  return {
    responseId: responseId,
    consent: true,
    sessionCode: cleanText_(payload.sessionCode || 'GNB-WEBINAR-2026', 100),
    webappVersion: cleanText_(payload.webappVersion || '1.2', 40),
    language: ['en', 'bm'].includes(String(payload.language || pulse.language).toLowerCase())
      ? String(payload.language || pulse.language).toLowerCase() : '',
    demographicAnswers: demographicAnswers,
    pulseAnswers: pulseAnswers,
    studioOutput: {
      code: Number.isInteger(studioOutputIndex) && studioOutputIndex >= 0 ? studioOutputIndex + 1 : '',
      en: cleanText_(studioOutput.answerEn, 200),
      bm: cleanText_(studioOutput.answerBm, 200)
    },
    sourcesTasksCompleted: boundedCount_(activity.sourcesTasksCompleted, 4),
    chatStudioTasksCompleted: boundedCount_(activity.chatStudioTasksCompleted, 4),
    learningKit: cleanLearningKit,
    kitPromptGenerated: activity.kitPromptGenerated === true,
    verificationChecksCompleted: boundedCount_(activity.verificationChecksCompleted, 6),
    exitTicketSaved: activity.exitTicketSaved === true,
    ratings: cleanRatings,
    optionalFeedback: cleanText_(post.optionalFeedback, DB.MAX_FEEDBACK_LENGTH),
    demographicsComplete: DEMOGRAPHIC_KEYS.every(function(key) { return demographicAnswers[key].code !== ''; }),
    pulseComplete: PULSE_KEYS.every(function(key) { return pulseAnswers[key].code !== ''; }),
    learningKitComplete: Object.keys(cleanLearningKit).every(function(key) { return cleanLearningKit[key] !== ''; }) && activity.kitPromptGenerated === true,
    postComplete: cleanRatings.every(function(value) { return value !== ''; })
  };
}

function saveResponse_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = getDatabase_();
    const sheet = spreadsheet.getSheetByName(DB.RAW_SHEET);
    const now = new Date();
    const row = buildRow_(data, now);
    const existingRow = findResponseRow_(sheet, data.responseId);

    if (existingRow) {
      const originalUtc = sheet.getRange(existingRow, 2).getValue();
      const originalMy = sheet.getRange(existingRow, 3).getValue();
      row[1] = originalUtc || row[1];
      row[2] = originalMy || row[2];
      sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
      return {action: 'updated', row: existingRow};
    }

    sheet.appendRow(row);
    return {action: 'created', row: sheet.getLastRow()};
  } finally {
    lock.releaseLock();
  }
}

function buildRow_(data, now) {
  const a = data.pulseAnswers;
  const d = data.demographicAnswers;
  const k = data.learningKit;
  const triplet = function(key) { return [a[key].code, a[key].en, a[key].bm]; };
  const demographicTriplet = function(key) { return [d[key].code, d[key].en, d[key].bm]; };
  return [
    safeCell_(data.responseId),
    now.toISOString(),
    Utilities.formatDate(now, DB.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
    'Yes', safeCell_(data.sessionCode), safeCell_(data.webappVersion), safeCell_(data.language)
  ].concat(
    demographicTriplet('institutionType'), demographicTriplet('currentRole'),
    demographicTriplet('ageGroup'), demographicTriplet('gender'),
    triplet('experience'), triplet('confidence'), triplet('purpose'), triplet('source'),
    triplet('department'), triplet('concern'), triplet('teachingExperience'),
    [data.studioOutput.code, safeCell_(data.studioOutput.en), safeCell_(data.studioOutput.bm),
      data.sourcesTasksCompleted, data.chatStudioTasksCompleted,
      safeCell_(k.departmentField), safeCell_(k.course), safeCell_(k.topic), safeCell_(k.studentLevel),
      safeCell_(k.learningOutcome), safeCell_(k.duration), safeCell_(k.lessonFramework),
      safeCell_(k.activityType), safeCell_(k.assessmentMethod), safeCell_(k.differentiation),
      safeCell_(k.desiredStudioOutput), data.kitPromptGenerated ? 'Yes' : 'No',
      data.verificationChecksCompleted, data.exitTicketSaved ? 'Yes' : 'No'],
    data.ratings,
    [safeCell_(data.optionalFeedback), data.demographicsComplete ? 'Yes' : 'No',
      data.pulseComplete ? 'Yes' : 'No', data.learningKitComplete ? 'Yes' : 'No',
      data.postComplete ? 'Yes' : 'No',
      data.demographicsComplete && data.pulseComplete && data.postComplete ? 'Valid' : 'Incomplete',
      Utilities.formatDate(now, DB.TIMEZONE, 'yyyy-MM-dd HH:mm:ss')]
  );
}

function findResponseRow_(sheet, responseId) {
  if (sheet.getLastRow() < 2) return null;
  const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(responseId).matchEntireCell(true).findNext();
  return match ? match.getRow() : null;
}

function getDatabase_() {
  const id = PropertiesService.getScriptProperties().getProperty(DB.PROP_ID);
  if (!id) throw new Error('Database is not set up. Run setupResearchDatabase() first.');
  return SpreadsheetApp.openById(id);
}

function ensureDatabaseStructure_(spreadsheet) {
  const raw = getOrCreateSheet_(spreadsheet, DB.RAW_SHEET);
  const codebook = getOrCreateSheet_(spreadsheet, DB.CODEBOOK_SHEET);
  const config = getOrCreateSheet_(spreadsheet, DB.CONFIG_SHEET);
  const summary = getOrCreateSheet_(spreadsheet, DB.SUMMARY_SHEET);

  if (spreadsheet.getSheets().length > 4) {
    const blank = spreadsheet.getSheetByName('Sheet1');
    if (blank && blank.getLastRow() === 0) spreadsheet.deleteSheet(blank);
  }

  migrateDemographicColumns_(raw);
  configureRawSheet_(raw);
  configureCodebook_(codebook);
  configureConfig_(config);
  configureSummary_(summary);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

/** Safely upgrades the earlier 38-column version without misaligning saved responses. */
function migrateDemographicColumns_(sheet) {
  if (sheet.getLastColumn() < 8) return;
  const firstQuestionHeader = String(sheet.getRange(1, 8).getValue() || '');
  if (firstQuestionHeader === 'Q1_Familiarity_Code') {
    sheet.insertColumnsAfter(7, 12);
  }
}

function configureRawSheet_(sheet) {
  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), HEADERS.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground('#17131d').setFontColor('#ffffff').setFontWeight('bold')
    .setWrap(true).setVerticalAlignment('middle');
  sheet.setRowHeight(1, 52);
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidths(2, 6, 145);
  sheet.setColumnWidths(8, 36, 125);
  sheet.setColumnWidths(44, 2, 135);
  sheet.setColumnWidths(46, 11, 180);
  sheet.setColumnWidth(48, 260);
  sheet.setColumnWidth(50, 360);
  sheet.setColumnWidths(57, 3, 145);
  sheet.setColumnWidths(60, 5, 135);
  sheet.setColumnWidth(65, 320);
  sheet.setColumnWidths(66, 6, 145);
  if (!sheet.getFilter() && sheet.getMaxRows() > 1) {
    sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), HEADERS.length).createFilter();
  }
}

function configureCodebook_(sheet) {
  const rows = [
    ['Variable', 'Question / Definition', 'Type', 'Coding / Values'],
    ['Response_ID', 'Anonymous browser-generated identifier', 'Text', 'Unique; used for duplicate protection'],
    ['Consent', 'Participant agreed to anonymous research data collection', 'Binary', 'Yes = consent recorded'],
    ['D1_Institution_Type_Code', 'Category of institution', 'Nominal', '1 Polytechnic; 2 Community College; 3 University/College; 4 School/Training Provider; 5 Other'],
    ['D2_Current_Role_Code', 'Current professional role', 'Nominal', '1 Lecturer; 2 Senior Lecturer; 3 Head/Coordinator; 4 Management; 5 Other'],
    ['D3_Age_Group_Code', 'Participant age group', 'Ordinal', '1 Below 30; 2 30-39; 3 40-49; 4 50+; 5 Prefer not to state'],
    ['D4_Gender_Code', 'Participant gender', 'Nominal', '1 Woman; 2 Man; 3 Prefer to self-describe; 4 Prefer not to state'],
    ['Q1_Familiarity_Code', 'Familiarity with Gemini Notebook', 'Ordinal', '1 Never used; 2 Tried once/twice; 3 Occasional; 4 Regular'],
    ['Q2_AI_Confidence_Code', 'Confidence using AI for teaching and learning', 'Ordinal', '1 Needs guidance; 2 Tries with examples; 3 Independent; 4 Can guide colleagues'],
    ['Q3_Intended_Output_Code', 'Priority resource to create', 'Nominal', '1 Lesson materials; 2 Active activities; 3 Assessment; 4 Revision'],
    ['Q4_Likely_Source_Code', 'Likely source material', 'Nominal', '1 Notes/slides; 2 Rubric/curriculum; 3 Website/YouTube; 4 Research articles'],
    ['Q5_Teaching_Field_Code', 'Participant teaching field', 'Nominal', '1 Engineering; 2 Commerce; 3 Hospitality/Tourism/Design; 4 General Studies/Languages; 5 Other'],
    ['Q6_Main_Concern_Code', 'Main concern about AI in teaching', 'Nominal', '1 Accuracy; 2 Privacy/copyright; 3 Prompt writing; 4 Time to learn; 5 Student misuse'],
    ['Q7_Teaching_Experience_Code', 'Years of teaching experience', 'Ordinal', '1 <5; 2 5-10; 3 11-20; 4 >20 years'],
    ['Activity_Studio_Output_Code', 'Output-specific prompt selected in Tab 08', 'Nominal', '1 Audio Overview; 2 Video Overview; 3 Slide Deck; 4 Infographic; 5 Mind Map; 6 Report/Study Guide; 7 Flashcards; 8 Quiz; 9 Data Table'],
    ['Sources_Tasks_Completed', 'Completed tasks in the Sources Challenge', 'Count', '0-4'],
    ['Chat_Studio_Tasks_Completed', 'Completed tasks in the Chat + Studio Challenge', 'Count', '0-4'],
    ['Kit_Department_Field', 'Department or teaching field entered in the final builder', 'Text', 'Participant-selected value'],
    ['Kit_Course', 'Course entered in the final builder', 'Text', 'Participant-entered value'],
    ['Kit_Topic', 'Topic entered in the final builder', 'Text', 'Participant-entered value'],
    ['Kit_Student_Level', 'Student level selected in the final builder', 'Categorical', 'Participant-selected value'],
    ['Kit_Learning_Outcome', 'Learning outcome entered in the final builder', 'Text', 'Participant-entered value'],
    ['Kit_Duration', 'Lesson duration selected in the final builder', 'Categorical', 'Participant-selected value'],
    ['Kit_Lesson_Framework', 'Lesson framework selected in the final builder', 'Categorical', '5E, Constructive Alignment, ADDIE, Gagne, PBL, Project-Based or Flipped Learning'],
    ['Kit_Activity_Type', 'Class activity selected in the final builder', 'Categorical', 'Individual, group problem-solving, case study, simulation, role-play, practical lab or gallery walk'],
    ['Kit_Assessment_Method', 'Assessment selected in the final builder', 'Categorical', 'Quiz, exit ticket, rubric, observation, peer assessment or performance task'],
    ['Kit_Differentiation', 'Differentiation approach selected in the final builder', 'Categorical', 'Participant-selected value'],
    ['Kit_Desired_Studio_Output', 'Desired final Studio output', 'Categorical', 'Participant-selected value'],
    ['Kit_Prompt_Generated', 'Complete learning-kit prompt generated in Tab 09', 'Binary', 'Yes/No'],
    ['Verification_Checks_Completed', 'Professional verification checks marked complete', 'Count', '0-6'],
    ['Exit_Ticket_Saved', 'Post-webinar exit ticket saved in the browser', 'Binary', 'Yes/No'],
    ['Post_1_Confidence', 'Confidence creating T&L resources after webinar', 'Likert', '1 Strongly disagree to 5 Strongly agree'],
    ['Post_2_Prompt_Alignment', 'Can create prompts aligned with learning outcomes', 'Likert', '1 Strongly disagree to 5 Strongly agree'],
    ['Post_3_Webapp_Understanding', 'Webapp supported understanding of Sources, Chat and Studio', 'Likert', '1 Strongly disagree to 5 Strongly agree'],
    ['Post_4_Verification_Confidence', 'Can verify outputs using sources and citations', 'Likert', '1 Strongly disagree to 5 Strongly agree'],
    ['Post_5_Intention_To_Use', 'Intention to use Gemini Notebook in an actual course', 'Likert', '1 Strongly disagree to 5 Strongly agree'],
    ['Optional_Feedback', 'Most useful element or remaining support need', 'Open text', 'Maximum 2,000 characters'],
    ['Record_Status', 'Data-quality status retained for analysis', 'Categorical', 'Valid by default; never delete raw records during cleaning']
  ];
  sheet.clear();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  styleReferenceSheet_(sheet, rows[0].length);
  sheet.setColumnWidth(1, 230); sheet.setColumnWidth(2, 430);
  sheet.setColumnWidth(3, 120); sheet.setColumnWidth(4, 520);
}

function configureConfig_(sheet) {
  const rows = [
    ['Setting', 'Value'],
    ['Study_Title', 'Gemini Notebook for Interactive and Active Teaching and Learning'],
    ['Session_Code', 'GNB-WEBINAR-2026'],
    ['Researcher', 'Madam Julie Marlina binti Hasan'],
    ['Institution', 'Politeknik Port Dickson'],
    ['Timezone', DB.TIMEZONE],
    ['Personal_Data_Collection', 'Disabled: no name, email or IP address is requested'],
    ['Raw_Data_Rule', 'Do not edit or delete raw responses; perform cleaning in a separate analysis sheet'],
    ['Ethics_Note', 'Obtain institutional approval and informed consent before using responses for publication']
  ];
  sheet.clear();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  styleReferenceSheet_(sheet, 2);
  sheet.setColumnWidth(1, 230); sheet.setColumnWidth(2, 650);
}

function configureSummary_(sheet) {
  const rows = [
    ['RESEARCH RESPONSE SUMMARY', 'Value'],
    ['Total unique responses', '=MAX(0,COUNTA(Responses_Raw!A:A)-1)'],
    ['Completed participant profile', '=COUNTIF(Responses_Raw!BN:BN,"Yes")'],
    ['Completed participant pulse', '=COUNTIF(Responses_Raw!BO:BO,"Yes")'],
    ['Completed learning kit', '=COUNTIF(Responses_Raw!BP:BP,"Yes")'],
    ['Completed post-webinar survey', '=COUNTIF(Responses_Raw!BQ:BQ,"Yes")'],
    ['Mean Sources tasks completed', '=IFERROR(AVERAGE(Responses_Raw!AR2:AR),"")'],
    ['Mean Chat + Studio tasks completed', '=IFERROR(AVERAGE(Responses_Raw!AS2:AS),"")'],
    ['Mean verification checks completed', '=IFERROR(AVERAGE(Responses_Raw!BF2:BF),"")'],
    ['Mean post-webinar confidence', '=IFERROR(AVERAGE(Responses_Raw!BH2:BH),"")'],
    ['Mean prompt-alignment confidence', '=IFERROR(AVERAGE(Responses_Raw!BI2:BI),"")'],
    ['Mean interface understanding', '=IFERROR(AVERAGE(Responses_Raw!BJ2:BJ),"")'],
    ['Mean verification confidence', '=IFERROR(AVERAGE(Responses_Raw!BK2:BK),"")'],
    ['Mean intention to use', '=IFERROR(AVERAGE(Responses_Raw!BL2:BL),"")']
  ];
  sheet.clear();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  styleReferenceSheet_(sheet, 2);
  sheet.getRange(7, 2, 8, 1).setNumberFormat('0.00');
  sheet.setColumnWidth(1, 330); sheet.setColumnWidth(2, 180);
}

function styleReferenceSheet_(sheet, width) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, width)
    .setBackground('#5520c7').setFontColor('#ffffff').setFontWeight('bold');
  sheet.getDataRange().setWrap(true).setVerticalAlignment('top');
  sheet.setRowHeight(1, 36);
}

function cleanText_(value, maxLength) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength || 500);
}

function boundedCount_(value, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, Math.floor(number)));
}

/** Prevents submitted text from being interpreted as a spreadsheet formula. */
function safeCell_(value) {
  const text = cleanText_(value, DB.MAX_FEEDBACK_LENGTH);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
