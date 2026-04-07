import { useEffect, useMemo, useRef, useState } from 'react';
import { BreadthDepthScatter, CategoryBarChart } from './components/Charts';
import { assessmentService } from './services';
import { ApiError } from './utils/errors';

const LIKERT = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Agree' },
  { value: 4, label: 'Strongly Agree' },
];
const STORAGE_KEY = 'dynamic_ai_maturity_generator_react_v1';

const SUGGESTIONS_KEY = {
  cxo: 'ai_maturity_cxo_names',
  org: 'ai_maturity_org_names',
  persona: 'ai_maturity_personas',
  industry: 'ai_maturity_industries',
};

const DEFAULT_PERSONAS = ['CEO', 'CFO', 'CTO', 'COO', 'CIO', 'CHRO', 'CMO'];
const DEFAULT_INDUSTRIES = [
  'Automobile', 'Semiconductor', 'Software',
];

function addToSuggestions(storageKey, value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return;
  try {
    const stored = localStorage.getItem(storageKey);
    const list = stored ? JSON.parse(stored) : [];
    if (!list.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      list.push(trimmed);
      localStorage.setItem(storageKey, JSON.stringify(list));
    }
  } catch { /* ignore */ }
}

function ComboInput({ value, onChange, placeholder, storageKey, defaultOptions }) {
  const [open, setOpen] = useState(false);

  let allOptions = [...(defaultOptions || [])];
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      JSON.parse(stored).forEach((item) => {
        if (!allOptions.some((o) => o.toLowerCase() === item.toLowerCase())) {
          allOptions.push(item);
        }
      });
    }
  } catch { /* ignore */ }

  const filtered = open
    ? (value.trim()
        ? allOptions.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()))
        : allOptions
      ).sort((a, b) => {
        if (!value.trim()) return a.localeCompare(b);
        const aStarts = a.toLowerCase().startsWith(value.trim().toLowerCase());
        const bStarts = b.toLowerCase().startsWith(value.trim().toLowerCase());
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b);
      })
    : [];

  const isNewValue = value.trim() && !allOptions.some((o) => o.toLowerCase() === value.trim().toLowerCase());
  const showDrop = filtered.length > 0 || isNewValue;

  return (
    <div className="comboWrap">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (value.trim()) addToSuggestions(storageKey, value);
            setOpen(false);
          }
        }}
        placeholder={placeholder}
      />
      {open && showDrop && (
        <div className="comboDrop">
          {filtered.map((opt) => (
            <div key={opt} className="comboOpt" onMouseDown={() => { onChange(opt); setOpen(false); }}>
              {opt}
            </div>
          ))}
          {isNewValue && (
            <div className="comboHint">Press Enter to add &ldquo;{value.trim()}&rdquo;</div>
          )}
        </div>
      )}
    </div>
  );
}

function flatten(questionnaire) {
  return (questionnaire?.categories || []).flatMap((category) =>
    category.questions.map((question, index) => ({
      category: category.category,
      question_no: index + 1,
      question,
    }))
  );
}

function quadrantName(breadth, depth) {
  if (breadth == null || depth == null) return 'Complete all questions to see the quadrant.';
  const breadthHigh = breadth >= 2.5;
  const depthHigh = depth >= 2.5;
  if (!breadthHigh && !depthHigh) return 'Experimenter (low breadth / low depth)';
  if (breadthHigh && !depthHigh) return 'Tool Spreader (high breadth / low depth)';
  if (!breadthHigh && depthHigh) return 'Focused Leader (low breadth / high depth)';
  return 'AI-Native Enterprise (high breadth / high depth)';
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [cxo, setCxo] = useState('');
  const [organization, setOrganization] = useState('');
  const [persona, setPersona] = useState('');
  const [industry, setIndustry] = useState('');
  const [questionnaire, setQuestionnaire] = useState(null);
  const [workbookData, setWorkbookData] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [assessmentId, setAssessmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAssessments, setSavedAssessments] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [histFilter, setHistFilter] = useState({ industry: '', org: '', name: '' });
  const questionCardRef = useRef(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setCxo(parsed.cxo || '');
      setOrganization(parsed.organization || '');
      setPersona(parsed.persona || '');
      setIndustry(parsed.industry || '');
      setQuestionnaire(parsed.questionnaire || null);
      setWorkbookData(parsed.workbookData || []);
      setAnswers(parsed.answers || []);
      setActiveCategory(parsed.activeCategory || parsed.workbookData?.[0]?.category || '');
      if (parsed.questionnaire && parsed.workbookData?.length) {
        setStatus({ type: 'ok', message: 'Recovered generated assessment from this browser tab.' });
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cxo, organization, persona, industry, questionnaire, workbookData, answers, activeCategory })
    );
  }, [cxo, organization, persona, industry, questionnaire, workbookData, answers, activeCategory]);

  const categories = useMemo(
    () => [...new Set(workbookData.map((item) => item.category))],
    [workbookData]
  );

  const categoryRows = (category) => workbookData.map((item, index) => ({ ...item, index })).filter((item) => item.category === category);
  const categoryAverage = (category) => {
    const values = categoryRows(category).map((row) => answers[row.index]).filter((value) => value != null);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const averages = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      map[category] = categoryAverage(category);
    });
    return map;
  }, [categories, answers, workbookData]);

  const total = workbookData.length;
  const answered = answers.filter((value) => value != null).length;
  const completion = total ? Math.round((answered / total) * 100) : 0;
  const ready = total > 0 && answered === total;
  const breadth = ready
    ? ((averages['Data & Knowledge Readiness'] || 0) * 0.3)
      + ((averages['Technology & AI Architecture'] || 0) * 0.3)
      + ((averages['Operating Model, Talent & Adoption'] || 0) * 0.4)
    : null;
  const depth = ready
    ? ((averages['Strategic Intent & Positioning'] || 0) * 0.2)
      + ((averages['Business Impact & Value Realization'] || 0) * 0.3)
      + ((averages['Execution & Engineering Industrialization'] || 0) * 0.3)
      + ((averages['Governance, Trust & Safety'] || 0) * 0.2)
    : null;

  async function generateAssessment() {
    if (!cxo.trim() || !organization.trim() || !persona.trim() || !industry.trim()) {
      const message = 'Please fill in all fields: CXO Name, Organization, Persona, and Industry.';
      window.alert(message);
      setStatus({ type: 'warn', message });
      return;
    }

    setLoading(true);
    setStatus({ type: 'ok', message: 'Validating inputs before generation.' });

    try {
      const data = await assessmentService.generateAssessment({
        cxo: cxo.trim(),
        organization: organization.trim(),
        persona: persona.trim(),
        industry: industry.trim(),
      });

      addToSuggestions(SUGGESTIONS_KEY.cxo, cxo);
      addToSuggestions(SUGGESTIONS_KEY.org, organization);
      addToSuggestions(SUGGESTIONS_KEY.persona, persona);
      addToSuggestions(SUGGESTIONS_KEY.industry, industry);
      const flattened = flatten(data.questionnaire);
      const newId = crypto.randomUUID();
      setAssessmentId(newId);
      setQuestionnaire(data.questionnaire);
      setWorkbookData(flattened);
      setAnswers(new Array(flattened.length).fill(null));
      setActiveCategory(flattened[0]?.category || '');
      setResultVisible(false);
      setStatus({ type: 'ok', message: 'Assessment generated successfully.' });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.payload?.error || error.message
          : error.message || String(error);
      window.alert(message);
      setStatus({ type: 'warn', message });
    } finally {
      setLoading(false);
    }
  }

  function updateAnswer(index, value) {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
  }

  function handleSubmit() {
    setResultVisible(true);
    setStatus({ type: 'ok', message: 'Assessment completed successfully.' });
  }

  async function saveToCloud() {
    if (!questionnaire || !assessmentId) return;
    setSaving(true);
    try {
      const payload = {
        assessment_id: assessmentId,
        cxo: questionnaire.cxo,
        organization: questionnaire.organization,
        persona: questionnaire.persona || '',
        industry: questionnaire.industry || '',
        generated_at: questionnaire.generated_at,
        assessment_brief: questionnaire.assessment_brief || '',
        signal_summary: questionnaire.signal_summary || [],
        questionnaire,
        responses: workbookData.map((row, index) => ({
          category: row.category,
          question_no: row.question_no,
          question: row.question,
          answer_numeric: answers[index],
          answer_text: answers[index] == null ? '' : LIKERT.find((l) => l.value === answers[index])?.label || '',
        })),
        breadth_score: ready ? breadth : null,
        depth_score: ready ? depth : null,
        quadrant: ready ? quadrantName(breadth, depth) : '',
        is_complete: ready,
      };
      const result = await assessmentService.saveAssessment(payload);
      setStatus({ type: 'ok', message: `Assessment saved to cloud at ${result.saved_at}.` });
    } catch (error) {
      const message = error instanceof ApiError ? error.payload?.error || error.message : error.message || String(error);
      setStatus({ type: 'warn', message: `Save failed: ${message}` });
    } finally {
      setSaving(false);
    }
  }

  async function fetchSavedAssessments() {
    setLoadingList(true);
    setHistFilter({ industry: '', org: '', name: '' });
    try {
      const list = await assessmentService.listAssessments();
      setSavedAssessments(list);
      setHistoryVisible(true);
    } catch (error) {
      const message = error instanceof ApiError ? error.payload?.error || error.message : error.message || String(error);
      setStatus({ type: 'warn', message: `Failed to load history: ${message}` });
    } finally {
      setLoadingList(false);
    }
  }

  const filteredAssessments = useMemo(() => {
    const ind = histFilter.industry.trim().toLowerCase();
    const org = histFilter.org.trim().toLowerCase();
    const name = histFilter.name.trim().toLowerCase();
    if (!ind && !org && !name) return savedAssessments;
    return savedAssessments.filter((item) => {
      if (ind && !(item.industry || '').toLowerCase().includes(ind)) return false;
      if (org && !(item.organization || '').toLowerCase().includes(org)) return false;
      if (name && !(item.cxo || '').toLowerCase().includes(name)) return false;
      return true;
    });
  }, [savedAssessments, histFilter]);

  async function loadAssessment(id) {
    setLoading(true);
    try {
      const record = await assessmentService.getAssessment(id);
      const flattened = flatten(record.questionnaire);
      setAssessmentId(record.assessment_id);
      setCxo(record.cxo);
      setOrganization(record.organization);
      setPersona(record.persona || '');
      setIndustry(record.industry || '');
      setQuestionnaire(record.questionnaire);
      setWorkbookData(flattened);
      // Restore answers from saved responses
      const restoredAnswers = new Array(flattened.length).fill(null);
      (record.responses || []).forEach((resp) => {
        const idx = flattened.findIndex(
          (item) => item.category === resp.category && item.question_no === resp.question_no
        );
        if (idx !== -1 && resp.answer_numeric != null) {
          restoredAnswers[idx] = resp.answer_numeric;
        }
      });
      setAnswers(restoredAnswers);
      setActiveCategory(flattened[0]?.category || '');
      setResultVisible(record.is_complete);
      setHistoryVisible(false);
      setStatus({ type: 'ok', message: `Loaded assessment from ${record.saved_at}.` });
    } catch (error) {
      const message = error instanceof ApiError ? error.payload?.error || error.message : error.message || String(error);
      setStatus({ type: 'warn', message: `Failed to load assessment: ${message}` });
    } finally {
      setLoading(false);
    }
  }

  async function deleteSavedAssessment(id) {
    if (!window.confirm('Are you sure you want to delete this assessment?')) return;
    try {
      await assessmentService.deleteAssessment(id);
      setSavedAssessments((prev) => prev.filter((a) => a.assessment_id !== id));
      setStatus({ type: 'ok', message: 'Assessment deleted.' });
    } catch (error) {
      const message = error instanceof ApiError ? error.payload?.error || error.message : error.message || String(error);
      setStatus({ type: 'warn', message: `Delete failed: ${message}` });
    }
  }

  function exportJson() {
    if (!workbookData.length) return;
    const payload = {
      cxo: questionnaire?.cxo || '',
      organization: questionnaire?.organization || '',
      persona: questionnaire?.persona || '',
      industry: questionnaire?.industry || '',
      generated_at: questionnaire?.generated_at || '',
      breadth_score: ready ? breadth : null,
      depth_score: ready ? depth : null,
      responses: workbookData.map((row, index) => ({
        category: row.category,
        question_no: row.question_no,
        question: row.question,
        answer_numeric: answers[index],
        answer_text: answers[index] == null ? '' : LIKERT.find((item) => item.value === answers[index])?.label || '',
      })),
    };
    downloadBlob('dynamic-ai-maturity-responses.json', JSON.stringify(payload, null, 2), 'application/json');
  }

  function exportCsv() {
    if (!workbookData.length) return;
    const rows = [['category', 'question_no', 'question', 'answer_numeric', 'answer_text']];
    workbookData.forEach((row, index) => {
      const answerText = answers[index] == null ? '' : LIKERT.find((item) => item.value === answers[index])?.label || '';
      rows.push([row.category, row.question_no, row.question, answers[index] ?? '', answerText]);
    });
    if (ready) {
      rows.push([]);
      rows.push(['SUMMARY', '', '', '', '']);
      rows.push(['breadth_score', '', '', breadth.toFixed(2), '']);
      rows.push(['depth_score', '', '', depth.toFixed(2), '']);
      rows.push(['quadrant', '', '', quadrantName(breadth, depth), '']);
    }
    const csv = rows
      .map((row) => row.map((cell) => {
        const value = String(cell ?? '');
        return value.includes('"') || value.includes(',') || value.includes('\n')
          ? `"${value.replaceAll('"', '""')}"`
          : value;
      }).join(','))
      .join('\n');

    downloadBlob('dynamic-ai-maturity-responses.csv', csv, 'text/csv');
  }

  function resetAll() {
    sessionStorage.removeItem(STORAGE_KEY);
    setCxo('');
    setOrganization('');
    setPersona('');
    setIndustry('');
    setQuestionnaire(null);
    setWorkbookData([]);
    setAnswers([]);
    setActiveCategory('');
    setResultVisible(false);
    setAssessmentId('');
    setHistoryVisible(false);
    setHistFilter({ industry: '', org: '', name: '' });
    setStatus(null);
  }

  const activeRows = activeCategory ? categoryRows(activeCategory) : [];

  return (
        <div className="grid">
          <section className="card">
            <div className="cardHead">
              <div>
                <h2>Generator & Dashboard</h2>
              </div>
              <button className="ghost" onClick={resetAll}>Reset</button>
            </div>
            <div className="cardBody">
              <div className="stack">
                <ComboInput value={cxo} onChange={setCxo} placeholder="CXO Name (e.g., Elon Musk)" storageKey={SUGGESTIONS_KEY.cxo} />
                <ComboInput value={organization} onChange={setOrganization} placeholder="Organization (e.g., Tesla)" storageKey={SUGGESTIONS_KEY.org} />
                <ComboInput value={persona} onChange={setPersona} placeholder="Persona (e.g., CEO, CFO, CTO)" storageKey={SUGGESTIONS_KEY.persona} defaultOptions={DEFAULT_PERSONAS} />
                <ComboInput value={industry} onChange={setIndustry} placeholder="Industry (e.g., Automobile, Software)" storageKey={SUGGESTIONS_KEY.industry} defaultOptions={DEFAULT_INDUSTRIES} />
                <button className="primary" disabled={loading} onClick={generateAssessment}>{loading ? 'Validating...' : 'Generate Assessment'}</button>
              </div>

              {status && <div className={status.type === 'ok' ? 'okBox' : 'warnBox'}>{status.message}</div>}

              <div className="summaryBlock">
                <div className="summaryLabel">Current assessment</div>
                <div className="summaryValue">{questionnaire ? `${questionnaire.cxo} / ${questionnaire.organization}` : '—'}</div>
                {questionnaire && (questionnaire.persona || questionnaire.industry) && (
                  <div className="summarySub"><strong>Persona:</strong> {questionnaire.persona || '—'} &nbsp;|&nbsp; <strong>Industry:</strong> {questionnaire.industry || '—'}</div>
                )}
                <div className="summarySub">{questionnaire?.assessment_brief || 'Generate a questionnaire to begin.'}</div>
              </div>

              <div className="summaryBlock">
                <div className="summaryLabel">Completion</div>
                <div className="summaryValue">{completion}%</div>
                <div className="summarySub">{answered} / {total} answered</div>
              </div>

              <div className="summaryBlock">
                <div className="summaryLabel">Final Scores</div>
                <div className="summarySub"><strong>Breadth:</strong> {breadth == null ? '—' : `${breadth.toFixed(2)} / 4`}</div>
                <div className="summarySub"><strong>Depth:</strong> {depth == null ? '—' : `${depth.toFixed(2)} / 4`}</div>
                <div className="summarySub">{quadrantName(breadth, depth)}</div>
              </div>

              <div className="legendGrid">
                <div>1 — Strongly Disagree</div>
                <div>2 — Disagree</div>
                <div>3 — Agree</div>
                <div>4 — Strongly Agree</div>
              </div>

              <div className="chartBlock">
                <div className="chartHead"><div className="t">Category Scores</div><div className="s">Scale: 1 to 4</div></div>
                <CategoryBarChart categories={categories} averages={averages} />
              </div>

              <div className="chartBlock">
                <div className="chartHead"><div className="t">Breadth vs Depth</div><div className="s">Quadrant view</div></div>
                <BreadthDepthScatter breadth={breadth} depth={depth} />
              </div>

              <div className="chartBlock">
                <div className="chartHead"><div className="t">Research signal summary</div><div className="s">Generated from public sources</div></div>
                <ul className="sourceList">
                  {questionnaire?.signal_summary?.length
                    ? questionnaire.signal_summary.map((item) => <li key={item}>{item}</li>)
                    : <li>No sources yet.</li>}
                </ul>
              </div>

              <div className="catNav">
                {categories.map((category) => {
                  const rows = categoryRows(category);
                  const categoryAnswered = rows.filter((row) => answers[row.index] != null).length;
                  const average = averages[category];
                  return (
                    <button
                      key={category}
                      type="button"
                      className={`catItem ${category === activeCategory ? 'active' : ''}`}
                      onClick={() => setActiveCategory(category)}
                    >
                      <div className="catLeft">
                        <div className="catName">{category}</div>
                        <div className="catStats">{categoryAnswered} / {rows.length} answered</div>
                      </div>
                      <div className="catStats">{average == null ? '—' : average.toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>

              <div className="buttonRow">
                <button className="primary" disabled={!ready} onClick={handleSubmit}>Submit</button>
                <button className="primary" disabled={!questionnaire || saving} onClick={saveToCloud}>{saving ? 'Saving…' : 'Save to Cloud'}</button>
                <button className="ghost" disabled={loadingList} onClick={fetchSavedAssessments}>{loadingList ? 'Loading…' : 'Load History'}</button>
                <button className="ghost" disabled={!total} onClick={exportCsv}>Export CSV</button>
                <button className="ghost" disabled={!total} onClick={exportJson}>Export JSON</button>
              </div>

              {historyVisible && (
                <div className="chartBlock">
                  <div className="chartHead">
                    <div className="t">Saved Assessments</div>
                    <div className="s">{filteredAssessments.length} of {savedAssessments.length}</div>
                  </div>

                  {savedAssessments.length > 0 && (
                    <div className="historyFilters">
                      <input
                        value={histFilter.industry}
                        onChange={(e) => setHistFilter((p) => ({ ...p, industry: e.target.value }))}
                        placeholder="Filter by industry"
                      />
                      <input
                        value={histFilter.org}
                        onChange={(e) => setHistFilter((p) => ({ ...p, org: e.target.value }))}
                        placeholder="Filter by organization"
                      />
                      <input
                        value={histFilter.name}
                        onChange={(e) => setHistFilter((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Filter by CXO name"
                      />
                    </div>
                  )}

                  {filteredAssessments.length === 0 ? (
                    <div className="summarySub">{savedAssessments.length === 0 ? 'No saved assessments found.' : 'No assessments match the current filters.'}</div>
                  ) : (
                    <div className="catNav">
                      {filteredAssessments.map((item) => (
                        <div key={item.assessment_id} className="catItem" style={{ cursor: 'default' }}>
                          <div className="catLeft">
                            <div className="catName">{item.cxo} / {item.organization}{item.persona ? ` (${item.persona})` : ''}{item.industry ? ` · ${item.industry}` : ''}</div>
                            <div className="catStats">
                              {item.is_complete ? '✅ Complete' : '⏳ In progress'}
                              {item.breadth_score != null && ` · B: ${item.breadth_score.toFixed(2)}`}
                              {item.depth_score != null && ` · D: ${item.depth_score.toFixed(2)}`}
                            </div>
                            <div className="catStats" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                              Saved: {new Date(item.saved_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="historyActions">
                            <button className="ghost historyBtn" onClick={() => loadAssessment(item.assessment_id)}>Load</button>
                            <button className="ghost historyBtn historyBtnDel" onClick={() => deleteSavedAssessment(item.assessment_id)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="card" ref={questionCardRef}>
            <div className="cardHead">
              <div>
                <h2>{activeCategory || 'Questionnaire'}</h2>
                <div className="meta">{questionnaire ? 'Respond to each question using the 4-point agreement scale.' : 'Generate an assessment to load the questions.'}</div>
              </div>
            </div>
            <div className="cardBody">
              {loading ? (
                <div className="loaderOverlay">
                  <div className="spinnerWrap">
                    <div className="spinnerRing" />
                    <div className="spinnerRing" />
                    <div className="spinnerRing" />
                  </div>
                  <div className="loaderText">Generating your tailored assessment</div>
                  <div className="loaderSub">Validating inputs and crafting 70 personalized questions across 7 categories</div>
                </div>
              ) : (
              <>
              <div className="barRow">
                <div className="progress"><div style={{ width: `${completion}%` }} /></div>
                <div className="mini">{answered} / {total} answered</div>
              </div>

              <div className="qWrap">
                {activeRows.map((row) => (
                  <div className="q" key={`${row.category}-${row.question_no}`}>
                    <div className="qTop">
                      <div className="qNum">{row.question_no}.</div>
                      <div className="qText">{row.question}</div>
                    </div>
                    <div className="opts">
                      {LIKERT.map((item) => (
                        <label className="opt" key={`${row.index}-${item.value}`}>
                          <input
                            type="radio"
                            name={`q_${row.index}`}
                            checked={answers[row.index] === item.value}
                            onChange={() => updateAnswer(row.index, item.value)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {categories.length > 1 && activeCategory && (() => {
                const idx = categories.indexOf(activeCategory);
                const prev = idx > 0 ? categories[idx - 1] : null;
                const next = idx < categories.length - 1 ? categories[idx + 1] : null;
                return (
                  <div className="sectionNav">
                    <button
                      className="sectionNavBtn ghost"
                      disabled={!prev}
                      onClick={() => { setActiveCategory(prev); questionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    >
                      <span className="sectionNavArrow">&larr;</span>
                      <span className="sectionNavLabel">
                        <span className="sectionNavHint">Previous</span>
                        {prev && <span className="sectionNavName">{prev}</span>}
                      </span>
                    </button>
                    <span className="sectionNavCounter">{idx + 1} / {categories.length}</span>
                    <button
                      className="sectionNavBtn ghost"
                      disabled={!next}
                      onClick={() => { setActiveCategory(next); questionCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    >
                      <span className="sectionNavLabel" style={{ textAlign: 'right' }}>
                        <span className="sectionNavHint">Next</span>
                        {next && <span className="sectionNavName">{next}</span>}
                      </span>
                      <span className="sectionNavArrow">&rarr;</span>
                    </button>
                  </div>
                );
              })()}

              {resultVisible && ready && (
                <div className="result resultVisible">
                  <h3>Assessment Summary</h3>
                  <div className="kv">
                    <div className="k">Breadth Score</div><div><strong>{breadth.toFixed(2)} / 4</strong></div>
                    <div className="k">Depth Score</div><div><strong>{depth.toFixed(2)} / 4</strong></div>
                    <div className="k">Quadrant</div><div><strong>{quadrantName(breadth, depth)}</strong></div>
                  </div>
                  <div className="hint">Breadth is derived from Data, Technology, and Operating Model. Depth is derived from Strategy, Business Impact, Execution, and Governance.</div>
                </div>
              )}
              </>
              )}
            </div>
          </section>
        </div>
  );
}
