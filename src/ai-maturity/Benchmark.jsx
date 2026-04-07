import { useCallback, useEffect, useRef, useState } from 'react';
import { assessmentService } from './services';
import { ApiError } from './utils/errors';

const DOT_COLORS = [
  '#7aa7ff', '#b77aff', '#7cffa6', '#ffd37c', '#ff7a8a',
  '#7affff', '#ff7aeb', '#ffb07a', '#a7ff7a', '#7a9eff',
  '#e07aff', '#7affc4', '#f0ff7a', '#ff9e7a', '#7adaff',
];

const STORAGE_KEY = 'dynamic_ai_maturity_generator_react_v1';

function getMyOrganization() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return (parsed.questionnaire?.organization || parsed.organization || '').trim();
    }
  } catch { /* ignore */ }
  return '';
}

function drawQuadrant(canvas, entries, colorMap, myOrg, hoveredIdx) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = Math.min(500, Math.max(340, width * 0.72));
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(0, 0, width, height);

  const left = 46, top = 20, right = width - 20, bottom = height - 36;
  const plotW = right - left, plotH = bottom - top;

  ctx.strokeStyle = 'rgba(234,240,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.lineTo(right, bottom);
  ctx.stroke();

  for (let v = 1; v <= 4; v++) {
    const y = bottom - ((v - 1) / 3) * plotH;
    const x = left + ((v - 1) / 3) * plotW;
    ctx.strokeStyle = 'rgba(234,240,255,0.06)';
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    ctx.fillStyle = 'rgba(234,240,255,0.5)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(String(v), left - 6, y + 4);
    ctx.textAlign = 'center';
    ctx.fillText(String(v), x, bottom + 16);
  }

  const xMid = left + ((2.5 - 1) / 3) * plotW;
  const yMid = bottom - ((2.5 - 1) / 3) * plotH;
  ctx.strokeStyle = 'rgba(122,167,255,0.25)';
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(xMid, top); ctx.lineTo(xMid, bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(left, yMid); ctx.lineTo(right, yMid); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(234,240,255,0.28)';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Experimenter', (left + xMid) / 2, (bottom + yMid) / 2 + 4);
  ctx.fillText('Tool Spreader', (xMid + right) / 2, (bottom + yMid) / 2 + 4);
  ctx.fillText('Focused Leader', (left + xMid) / 2, (top + yMid) / 2 + 4);
  ctx.fillText('AI-Native Enterprise', (xMid + right) / 2, (top + yMid) / 2 + 4);

  ctx.fillStyle = 'rgba(234,240,255,0.6)';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Breadth \u2192', (left + right) / 2, bottom + 32);
  ctx.save();
  ctx.translate(14, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('\u2191 Depth', 0, 0);
  ctx.restore();

  const dotPositions = [];
  entries.forEach((entry, i) => {
    const x = left + ((entry.avg_breadth - 1) / 3) * plotW;
    const y = bottom - ((entry.avg_depth - 1) / 3) * plotH;
    const isMine = myOrg && entry.organization.toLowerCase() === myOrg.toLowerCase();
    const r = isMine ? 10 : 7;
    dotPositions.push({ x, y, r, entry, index: i });

    if (isMine) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124,255,166,0.15)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = colorMap[entry.organization] || DOT_COLORS[i % DOT_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = isMine ? 'rgba(124,255,166,0.9)' : 'rgba(0,0,0,0.3)';
    ctx.lineWidth = isMine ? 2.5 : 1;
    ctx.stroke();
  });

  if (hoveredIdx != null && hoveredIdx >= 0 && hoveredIdx < dotPositions.length) {
    const d = dotPositions[hoveredIdx];
    const label = `${d.entry.organization}  (B: ${d.entry.avg_breadth}, D: ${d.entry.avg_depth})`;
    ctx.font = 'bold 12px Arial';
    const tw = ctx.measureText(label).width;
    const px = Math.min(right - tw - 16, Math.max(left, d.x - tw / 2 - 8));
    const py = d.y - d.r - 28;
    ctx.fillStyle = 'rgba(11,16,34,0.92)';
    ctx.beginPath();
    const bx = px, by = py, bw = tw + 16, bh = 24, br = 6;
    ctx.moveTo(bx + br, by);
    ctx.lineTo(bx + bw - br, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
    ctx.lineTo(bx + bw, by + bh - br);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
    ctx.lineTo(bx + br, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
    ctx.lineTo(bx, by + br);
    ctx.quadraticCurveTo(bx, by, bx + br, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(122,167,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#eaf0ff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(label, px + 8, py + 16);
  }

  return dotPositions;
}

export default function Benchmark() {
  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [entries, setEntries] = useState([]);
  const [loadingInd, setLoadingInd] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const canvasRef = useRef(null);
  const dotPositionsRef = useRef([]);

  const myOrg = getMyOrganization();

  const colorMap = {};
  entries.forEach((e, i) => { colorMap[e.organization] = DOT_COLORS[i % DOT_COLORS.length]; });

  useEffect(() => {
    (async () => {
      try {
        const list = await assessmentService.getBenchmarkIndustries();
        setIndustries(list);
      } catch (err) {
        setError(err instanceof ApiError ? err.payload?.error || err.message : err.message);
      } finally {
        setLoadingInd(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedIndustry) { setEntries([]); return; }
    (async () => {
      setLoadingData(true);
      setError('');
      try {
        const data = await assessmentService.getBenchmark(selectedIndustry);
        setEntries(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.payload?.error || err.message : err.message);
      } finally {
        setLoadingData(false);
      }
    })();
  }, [selectedIndustry]);

  const paint = useCallback(() => {
    if (!canvasRef.current) return;
    dotPositionsRef.current = drawQuadrant(canvasRef.current, entries, colorMap, myOrg, hoveredIdx);
  }, [entries, colorMap, myOrg, hoveredIdx]);

  useEffect(() => { paint(); }, [paint]);
  useEffect(() => {
    const onResize = () => paint();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [paint]);

  function handleMouseMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found = null;
    for (let i = dotPositionsRef.current.length - 1; i >= 0; i--) {
      const d = dotPositionsRef.current[i];
      const dist = Math.sqrt((mx - d.x) ** 2 + (my - d.y) ** 2);
      if (dist <= d.r + 4) { found = i; break; }
    }
    setHoveredIdx(found);
    canvasRef.current.style.cursor = found != null ? 'pointer' : 'default';
  }

  return (
    <div className="benchWrap">
      <section className="card">
        <div className="cardHead">
          <div>
            <h2>Industry Benchmark</h2>
            <div className="meta">Compare your organization's AI maturity against peers in the same industry.</div>
          </div>
        </div>
        <div className="cardBody">
          <div className="benchControls">
            <div className="benchFilterWrap">
              <label className="benchLabel">Industry</label>
              {loadingInd ? (
                <div className="summarySub">Loading industries...</div>
              ) : (
                <select
                  className="benchSelect"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                >
                  <option value="">-- Select an industry --</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              )}
            </div>
            {myOrg && selectedIndustry && (
              <div className="benchMyOrg">
                <span className="benchMyDot" /> Your organization: <strong>{myOrg}</strong>
              </div>
            )}
          </div>

          {error && <div className="warnBox">{error}</div>}

          {!selectedIndustry && !loadingInd && (
            <div className="benchEmpty">
              <div className="benchEmptyIcon">&#xe801;</div>
              <div className="loaderText">Select an industry above</div>
              <div className="loaderSub">The benchmark quadrant will show all organizations from that industry with completed assessments.</div>
            </div>
          )}

          {loadingData && (
            <div className="loaderOverlay">
              <div className="spinnerWrap"><div className="spinnerRing" /><div className="spinnerRing" /><div className="spinnerRing" /></div>
              <div className="loaderText">Loading benchmark data</div>
            </div>
          )}

          {selectedIndustry && !loadingData && entries.length === 0 && !error && (
            <div className="benchEmpty">
              <div className="loaderText">No completed assessments found</div>
              <div className="loaderSub">There are no completed assessments for the <strong>{selectedIndustry}</strong> industry yet.</div>
            </div>
          )}

          {selectedIndustry && !loadingData && entries.length > 0 && (
            <>
              <div className="chartBlock">
                <div className="chartHead">
                  <div className="t">AI Maturity Quadrant &mdash; {selectedIndustry}</div>
                  <div className="s">{entries.length} organization{entries.length !== 1 ? 's' : ''}</div>
                </div>
                <canvas
                  ref={canvasRef}
                  className="chartCanvas"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredIdx(null)}
                  aria-label="Benchmark quadrant chart"
                />
              </div>

              <div className="benchLegend">
                <div className="chartHead"><div className="t">Legend</div></div>
                <div className="benchLegendGrid">
                  {entries.map((entry, i) => {
                    const isMine = myOrg && entry.organization.toLowerCase() === myOrg.toLowerCase();
                    return (
                      <div key={entry.organization} className={`benchLegendItem ${isMine ? 'benchLegendMine' : ''}`}>
                        <span className="benchLegendDot" style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }} />
                        <div className="benchLegendInfo">
                          <div className="benchLegendName">{entry.organization}{isMine ? ' (You)' : ''}</div>
                          <div className="benchLegendMeta">
                            B: {entry.avg_breadth} &nbsp; D: {entry.avg_depth} &nbsp; {entry.quadrant}
                            &nbsp; &middot; &nbsp; {entry.persona_count} persona{entry.persona_count !== 1 ? 's' : ''}: {entry.personas.join(', ')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
