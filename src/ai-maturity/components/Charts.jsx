import { useEffect, useRef } from 'react';

const SHORT_LABELS = {
  'Strategic Intent & Positioning': 'Strategy',
  'Business Impact & Value Realization': 'Impact',
  'Data & Knowledge Readiness': 'Data',
  'Technology & AI Architecture': 'Tech',
  'Execution & Engineering Industrialization': 'Execution',
  'Operating Model, Talent & Adoption': 'People',
  'Governance, Trust & Safety': 'Governance',
};

function roundRect(ctx, x, y, w, h, r) {
  const height = Math.max(h, 0);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

export function CategoryBarChart({ categories, averages }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = 320;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, width, height);

    if (!categories.length) {
      ctx.fillStyle = 'rgba(234,240,255,0.65)';
      ctx.font = '12px Arial';
      ctx.fillText('Generate an assessment to view category scores.', 18, 28);
      return;
    }

    const left = 42;
    const top = 20;
    const bottom = height - 40;
    const right = width - 10;
    const plotH = bottom - top;
    const plotW = right - left;
    const barW = Math.max(16, plotW / (categories.length * 1.7));

    ctx.strokeStyle = 'rgba(234,240,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    for (let value = 1; value <= 4; value += 1) {
      const y = bottom - ((value - 1) / 3) * plotH;
      ctx.strokeStyle = 'rgba(234,240,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(234,240,255,0.7)';
      ctx.font = '11px Arial';
      ctx.fillText(String(value), 18, y + 4);
    }

    categories.forEach((category, index) => {
      const avg = averages[category];
      const x = left + 12 + index * (plotW / categories.length);
      const barHeight = avg == null ? 6 : ((avg - 1) / 3) * plotH;
      const y = bottom - barHeight;
      ctx.fillStyle = avg == null ? 'rgba(255,211,124,0.6)' : 'rgba(122,167,255,0.85)';
      roundRect(ctx, x, y, barW, barHeight, 6);
      ctx.save();
      ctx.translate(x + barW / 2, bottom + 8);
      ctx.rotate(-0.65);
      ctx.fillStyle = 'rgba(234,240,255,0.76)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(SHORT_LABELS[category] || category, 0, 0);
      ctx.restore();
    });
  }, [categories, averages]);

  return <canvas ref={canvasRef} className="chartCanvas" aria-label="Category bar chart" />;
}

export function BreadthDepthScatter({ breadth, depth }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = 300;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 0, width, height);

    const left = 36;
    const top = 16;
    const right = width - 18;
    const bottom = height - 32;
    const plotW = right - left;
    const plotH = bottom - top;

    ctx.strokeStyle = 'rgba(234,240,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    const xMid = left + ((2.5 - 1) / 3) * plotW;
    const yMid = bottom - ((2.5 - 1) / 3) * plotH;
    ctx.strokeStyle = 'rgba(234,240,255,0.10)';
    ctx.beginPath();
    ctx.moveTo(xMid, top);
    ctx.lineTo(xMid, bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left, yMid);
    ctx.lineTo(right, yMid);
    ctx.stroke();

    ctx.fillStyle = 'rgba(234,240,255,0.74)';
    ctx.font = '11px Arial';
    ctx.fillText('Breadth', right - 46, bottom + 20);
    ctx.save();
    ctx.translate(12, top + 52);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Depth', 0, 0);
    ctx.restore();

    ctx.font = '10px Arial';
    ctx.fillText('Experimenter', left + 6, bottom - 6);
    ctx.fillText('Tool Spreader', xMid + 6, bottom - 6);
    ctx.fillText('Focused Leader', left + 6, yMid - 6);
    ctx.fillText('AI-Native', xMid + 6, yMid - 6);

    if (breadth == null || depth == null) {
      ctx.fillStyle = 'rgba(234,240,255,0.65)';
      ctx.fillText('Complete all questions to plot the final score.', left + 18, top + 18);
      return;
    }

    const x = left + ((breadth - 1) / 3) * plotW;
    const y = bottom - ((depth - 1) / 3) * plotH;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124,255,166,0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(234,240,255,0.9)';
    ctx.font = '11px Arial';
    ctx.fillText(`(${breadth.toFixed(2)}, ${depth.toFixed(2)})`, Math.min(right - 100, x + 10), Math.max(top + 12, y - 10));
  }, [breadth, depth]);

  return <canvas ref={canvasRef} className="chartCanvas" aria-label="Breadth depth scatter plot" />;
}
