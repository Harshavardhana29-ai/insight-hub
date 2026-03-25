/**
 * Shared PDF & Word export utilities.
 *
 * Uses html2canvas to render markdown as pixel-perfect styled HTML,
 * then paginates the captured canvas into a jsPDF document with a
 * professionally designed cover page.
 */

// ── Public types ────────────────────────────────────────────────
export interface ExportOptions {
  reportMarkdown: string;
  title: string;
  agentNames: string;
  topic?: string;
  dataSources?: string[];
}

// ── Helpers ─────────────────────────────────────────────────────

/** Format current time as "March 25, 2026 at 02:45 PM" */
export function formatTimestamp(): string {
  const now = new Date();
  return (
    now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) +
    " at " +
    now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
}

/** Load an image from URL as base64 data-URL, returning natural dimensions */
async function loadImageInfo(
  url: string,
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")?.drawImage(img, 0, 0);
      resolve({
        dataUrl: c.toDataURL("image/png"),
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ── Markdown → styled HTML (used by html2canvas) ───────────────

function mdToHtml(md: string): string {
  let src = md.replace(/\r\n/g, "\n");

  // 1) Fenced code blocks → <pre> (before any inline processing)
  src = src.replace(/```\w*\n([\s\S]*?)```/g, (_, code: string) => {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `\n%%PRE%%<pre style="background:#f5f7fa;border:1px solid #e0e4e8;border-radius:5px;padding:12px 14px;font-family:Consolas,'Courier New',monospace;font-size:8.5pt;line-height:1.5;white-space:pre-wrap;margin:8px 0;"><code>${escaped}</code></pre>%%/PRE%%\n`;
  });

  // 2) Inline formatting
  src = src.replace(
    /`([^`]+)`/g,
    '<code style="background:#eef1f5;padding:1px 4px;border-radius:3px;font-family:Consolas,monospace;font-size:8.5pt;">$1</code>',
  );
  src = src.replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>");
  src = src.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  src = src.replace(/\*([^\n*]+)\*/g, "<i>$1</i>");
  src = src.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color:#007bc0;text-decoration:underline;">$1</a>',
  );

  // 3) Process line-by-line for block elements
  const lines = src.split("\n");
  const out: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    // Pre-block pass-through
    if (t.startsWith("%%PRE%%")) {
      closeList();
      let block = t.replace("%%PRE%%", "");
      if (!t.includes("%%/PRE%%")) {
        while (++i < lines.length && !lines[i].includes("%%/PRE%%")) {
          block += "\n" + lines[i];
        }
        if (i < lines.length) block += "\n" + lines[i];
      }
      out.push(block.replace("%%/PRE%%", ""));
      i++;
      continue;
    }

    // ── Headings (check longer prefixes first) ──
    if (/^####\s+/.test(t)) {
      closeList();
      out.push(
        `<h4 style="font-size:10.5pt;color:#444;font-weight:700;margin:12px 0 4px;">${t.replace(/^####\s+/, "")}</h4>`,
      );
      i++; continue;
    }
    if (/^###\s+/.test(t) && !/^####/.test(t)) {
      closeList();
      out.push(
        `<h3 style="font-size:11.5pt;color:#333;font-weight:700;margin:14px 0 5px;">${t.replace(/^###\s+/, "")}</h3>`,
      );
      i++; continue;
    }
    if (/^##\s+/.test(t) && !/^###/.test(t)) {
      closeList();
      out.push(
        `<h2 style="font-size:13pt;color:#007bc0;font-weight:700;margin:18px 0 6px;padding-bottom:3px;border-bottom:1.5px solid #007bc0;">${t.replace(/^##\s+/, "")}</h2>`,
      );
      i++; continue;
    }
    if (/^#\s+/.test(t) && !/^##/.test(t)) {
      closeList();
      out.push(
        `<h1 style="font-size:16pt;color:#004b87;font-weight:700;margin:22px 0 8px;padding-bottom:5px;border-bottom:2px solid #007bc0;">${t.replace(/^#\s+/, "")}</h1>`,
      );
      i++; continue;
    }

    // ── Horizontal rule ──
    if (/^[-*_]{3,}$/.test(t)) {
      closeList();
      out.push('<hr style="border:none;border-top:1px solid #ddd;margin:12px 0;"/>');
      i++; continue;
    }

    // ── Table ──
    if (
      t.startsWith("|") &&
      i + 1 < lines.length &&
      /^\|[-:|\s]+\|$/.test((lines[i + 1] || "").trim())
    ) {
      closeList();
      const tl: string[] = [];
      while (i < lines.length && (lines[i] || "").trim().startsWith("|")) {
        tl.push((lines[i] || "").trim());
        i++;
      }
      const hdr = tl[0].replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const rows = tl.slice(2).filter((r) => !/^\|[-:|\s]+\|$/.test(r));

      let table =
        '<table style="border-collapse:collapse;width:100%;margin:10px 0;font-size:9pt;">';
      table += "<thead><tr>";
      hdr.forEach(
        (h) =>
          (table += `<th style="background:#007bc0;color:#fff;padding:7px 10px;border:1px solid #0069a8;text-align:left;font-weight:700;font-size:8.5pt;">${h}</th>`),
      );
      table += "</tr></thead><tbody>";
      rows.forEach((row, ri) => {
        const cells = row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const bg = ri % 2 === 0 ? "#fff" : "#f5f8fc";
        table += `<tr style="background:${bg};">`;
        cells.forEach(
          (c) =>
            (table += `<td style="padding:6px 10px;border:1px solid #dee2e6;font-size:9pt;">${c}</td>`),
        );
        table += "</tr>";
      });
      table += "</tbody></table>";
      out.push(table);
      continue;
    }

    // ── Blockquote ──
    if (t.startsWith(">")) {
      closeList();
      const ql: string[] = [];
      while (i < lines.length && (lines[i] || "").trim().startsWith(">")) {
        ql.push((lines[i] || "").trim().replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        `<blockquote style="border-left:3px solid #007bc0;padding:8px 14px;margin:10px 0;background:#f5f8fc;color:#555;font-style:italic;border-radius:0 4px 4px 0;">${ql.join("<br/>")}</blockquote>`,
      );
      continue;
    }

    // ── Bullet list ──
    const bm = raw.match(/^(\s*)([-*+])\s+(.*)/);
    if (bm) {
      if (!inUl) {
        closeList();
        out.push('<ul style="margin:5px 0;padding-left:18px;list-style:disc;">');
        inUl = true;
      }
      const ml =
        (bm[1]?.length || 0) > 1
          ? ` margin-left:${Math.floor((bm[1]?.length || 0) / 2) * 12}px;`
          : "";
      out.push(
        `<li style="margin-bottom:3px;line-height:1.55;font-size:10pt;${ml}">${bm[3]}</li>`,
      );
      i++; continue;
    }

    // ── Numbered list ──
    const nm = raw.match(/^(\s*)(\d+)\.\s+(.*)/);
    if (nm) {
      if (!inOl) {
        closeList();
        out.push('<ol style="margin:5px 0;padding-left:18px;">');
        inOl = true;
      }
      const ml =
        (nm[1]?.length || 0) > 1
          ? ` margin-left:${Math.floor((nm[1]?.length || 0) / 2) * 12}px;`
          : "";
      out.push(
        `<li style="margin-bottom:3px;line-height:1.55;font-size:10pt;${ml}">${nm[3]}</li>`,
      );
      i++; continue;
    }

    // ── Empty line ──
    if (t === "") {
      const next = (lines[i + 1] || "").trim();
      if (
        (inUl || inOl) &&
        !next.match(/^[-*+]\s+/) &&
        !next.match(/^\d+\.\s+/)
      ) {
        closeList();
      }
      out.push('<div style="height:4px;"></div>');
      i++; continue;
    }

    // ── Paragraph ──
    closeList();
    out.push(
      `<p style="margin:4px 0;line-height:1.65;font-size:10pt;color:#333;">${t}</p>`,
    );
    i++;
  }
  closeList();
  return out.join("\n");
}

// ── HTML for Word export ────────────────────────────────────────

export function renderHtmlForWordExport(md: string): string {
  const normalized = md.replace(/^(\s*)\*(\s+)/gm, "$1-$2");
  return normalized
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`{3}([\s\S]*?)`{3}/g, "<pre><code>$1</code></pre>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(?<!")(https?:\/\/[^\s<)"]+)/g, '<a href="$1">$1</a>')
    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      return "<tr>" + cells.map((c) => `<td>${c}</td>`).join("") + "</tr>";
    })
    .replace(/^\|[-:|\s]+\|$/gm, "")
    .replace(/(<tr>.*<\/tr>\n?)+/g, (match) => {
      const rows = match.trim().split("\n").filter((r) => r.trim());
      if (rows.length > 0) {
        const header = rows[0].replace(/<td>/g, "<th>").replace(/<\/td>/g, "</th>");
        const body = rows.slice(1).join("\n");
        return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
      }
      return match;
    })
    .replace(/^(\s*)- (.+)$/gm, (_, indent, content) => {
      const level = Math.floor((indent || "").length / 4);
      return `<li${level > 0 ? ` style="margin-left:${level * 20}px"` : ""}>${content}</li>`;
    })
    .replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>")
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^(?!<[huptblo])/gm, "");
}

// ── PDF generation (html2canvas approach) ───────────────────────

export async function generatePdfReport(opts: ExportOptions): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = pdf.internal.pageSize.getWidth();  // 210
  const PH = pdf.internal.pageSize.getHeight(); // 297
  const M = 16;
  const CW = PW - 2 * M;
  const ts = formatTimestamp();

  // Load logos with natural dimensions
  const logo = await loadImageInfo("/image.png");
  const logo2 = await loadImageInfo("/bosch-alt.png");

  // ═══════════════════════════════════════════════════════════════
  // COVER PAGE — centered vertically & horizontally
  // ═══════════════════════════════════════════════════════════════

  // Top accent bar
  pdf.setFillColor(0, 123, 192);
  pdf.rect(0, 0, PW, 2, "F");

  // ── Calculate logo dimensions (both logos side by side) ──
  const maxLogoH = 22; // max height for each logo in mm
  const logoGap = 6;  // gap between the two logos

  let logo1W = 0, logo1H = 0;
  if (logo) {
    const a1 = logo.w / logo.h;
    logo1H = maxLogoH;
    logo1W = logo1H * a1;
  }
  let logo2W = 0, logo2H = 0;
  if (logo2) {
    const a2 = logo2.w / logo2.h;
    logo2H = maxLogoH;
    logo2W = logo2H * a2;
  }

  const logosPresent = !!(logo || logo2);
  const totalLogosW = logo1W + logo2W + (logo && logo2 ? logoGap : 0);
  const logosBlockH = logosPresent ? maxLogoH + 10 : 0;

  // ── Calculate other block heights ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const labelBlockH = 6; // "MARKET RESEARCH REPORT" label

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  const titleLines: string[] = pdf.splitTextToSize(opts.title, CW - 16);
  const titleBlockH = titleLines.length * 13;

  const decoLineH = 16;
  const tsLineH = 7;
  const poweredByH = 10; // "Powered by BGSW/BDO" line

  const totalBlockH =
    logosBlockH +
    labelBlockH + 6 +
    titleBlockH +
    decoLineH +
    tsLineH + 6 +
    poweredByH;

  // Vertical center start (between top bar and bottom bar)
  const usableTop = 12;
  const usableBottom = PH - 18;
  let cy = usableTop + (usableBottom - usableTop - totalBlockH) / 2;

  // ── Logos (side by side, centered) ──
  if (logosPresent) {
    const logosStartX = PW / 2 - totalLogosW / 2;
    let lx = logosStartX;
    if (logo) {
      pdf.addImage(logo.dataUrl, "PNG", lx, cy + (maxLogoH - logo1H) / 2, logo1W, logo1H);
      lx += logo1W + logoGap;
    }
    if (logo2) {
      pdf.addImage(logo2.dataUrl, "PNG", lx, cy + (maxLogoH - logo2H) / 2, logo2W, logo2H);
    }
    cy += logosBlockH;
  }

  // ── Subtitle label ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(140);
  cy += labelBlockH + 6;

  // ── Report title ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(0, 60, 115);
  titleLines.forEach((line: string, idx: number) => {
    pdf.text(line, PW / 2, cy + idx * 13, { align: "center" });
  });
  cy += titleBlockH;

  // ── Decorative line ──
  cy += decoLineH / 2;
  pdf.setDrawColor(0, 123, 192);
  pdf.setLineWidth(0.6);
  pdf.line(PW / 2 - 32, cy, PW / 2 + 32, cy);
  cy += decoLineH / 2;

  // ── Timestamp ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(110);
  pdf.text(ts, PW / 2, cy, { align: "center" });
  cy += tsLineH + 6;

  // ── Powered by BGSW/BDO ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 123, 192);
  pdf.text("Powered by BGSW/BDO", PW / 2, cy, { align: "center" });

  // ── Footer area on cover page ──
  // Separator line above footer
  pdf.setDrawColor(0, 123, 192);
  pdf.setLineWidth(0.4);
  pdf.line(M, PH - 22, PW - M, PH - 22);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(150);
  pdf.text("Confidential \u2014 For internal use only", PW / 2, PH - 16, {
    align: "center",
  });

  // Bottom accent bar
  pdf.setFillColor(0, 123, 192);
  pdf.rect(0, PH - 7, PW, 7, "F");

  // ═══════════════════════════════════════════════════════════════
  // CONTENT PAGES  (rendered via html2canvas)
  // ═══════════════════════════════════════════════════════════════

  const styledHtml = mdToHtml(opts.reportMarkdown);

  // 1 mm ≈ 3.7795 px at 96 dpi
  const containerPx = Math.round(CW * 3.7795);
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; left:-20000px; top:0; z-index:-9999;
    width:${containerPx}px; background:#fff; padding:8px 0;
    font-family:Arial,Helvetica,sans-serif; font-size:10pt;
    color:#333; line-height:1.6;
  `;
  el.innerHTML = styledHtml;
  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale: 2.5,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: containerPx,
    });

    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const mmPerPx = CW / canvasW;

    // Usable content area per page (top accent 2mm + margin + footer 20mm)
    const topStart = M + 2;
    const contentAreaH = PH - topStart - 22;
    const pxPerPage = Math.floor(contentAreaH / mmPerPx);
    const pagesNeeded = Math.ceil(canvasH / pxPerPage);

    for (let p = 0; p < pagesNeeded; p++) {
      pdf.addPage();

      // Thin accent bar
      pdf.setFillColor(0, 123, 192);
      pdf.rect(0, 0, PW, 1.5, "F");

      const srcY = p * pxPerPage;
      const srcH = Math.min(pxPerPage, canvasH - srcY);

      const slice = document.createElement("canvas");
      slice.width = canvasW;
      slice.height = srcH;
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, srcH);
      ctx.drawImage(canvas, 0, srcY, canvasW, srcH, 0, 0, canvasW, srcH);

      const sliceH = srcH * mmPerPx;
      pdf.addImage(slice.toDataURL("image/png"), "PNG", M, topStart, CW, sliceH);
    }
  } finally {
    document.body.removeChild(el);
  }

  // ═══════════════════════════════════════════════════════════════
  // FOOTERS  (skip cover page)
  // ═══════════════════════════════════════════════════════════════

  const totalPages = pdf.getNumberOfPages();
  for (let p = 2; p <= totalPages; p++) {
    pdf.setPage(p);

    // Footer separator line
    pdf.setDrawColor(0, 123, 192);
    pdf.setLineWidth(0.2);
    pdf.line(M, PH - 18, PW - M, PH - 18);

    pdf.setFontSize(7);
    pdf.setTextColor(150);
    pdf.text(`Report by: ${opts.agentNames}`, M, PH - 13);
    pdf.text("Powered by: BGSW/BDO", PW - M, PH - 13, { align: "right" });
    pdf.text(`Page ${p - 1} of ${totalPages - 1}`, PW / 2, PH - 8, {
      align: "center",
    });
  }

  // Save
  const safeName = opts.title.replace(/[^a-zA-Z0-9]/g, "_");
  pdf.save(`${safeName}_report.pdf`);
}

// ── Word export ─────────────────────────────────────────────────

export async function generateWordReport(opts: ExportOptions): Promise<void> {
  const html = renderHtmlForWordExport(opts.reportMarkdown);
  const ts = formatTimestamp();

  let logoHtml = "";
  try {
    const logo = await loadImageInfo("/bosch-alt.png");
    if (logo) {
      logoHtml = `<p style="text-align:center;margin-top:40px;margin-bottom:10px;"><img src="${logo.dataUrl}" width="120" height="${Math.round(120 / (logo.w / logo.h))}" alt="Bosch" /></p>`;
    }
  } catch {
    /* continue without logo */
  }

  const docContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page { margin:2.5cm; mso-footer-margin:1cm; mso-header-margin:1cm; }
        @page Section1 { mso-footer:f1; }
        div.Section1 { page:Section1; }
        table#footertable { mso-element:footer; mso-element-id:f1; }
        body { font-family:Calibri,Arial,sans-serif; font-size:11pt; color:#333; line-height:1.6; }
        h1 { font-size:22pt; color:#007bc0; text-align:center; margin-top:60px; margin-bottom:8px; }
        .meta-info { text-align:center; font-size:10pt; color:#888; margin-bottom:6px; }
        .meta-agent { text-align:center; font-size:10pt; color:#555; margin-top:16px; }
        .meta-powered { text-align:center; font-size:9pt; color:#999; margin-bottom:40px; }
        hr.title-divider { border:none; border-top:2px solid #007bc0; margin:30px 60px; }
        h2 { font-size:16pt; color:#007bc0; margin-top:28px; border-bottom:1px solid #007bc0; padding-bottom:4px; }
        h3 { font-size:13pt; color:#444; margin-top:18px; }
        strong { font-weight:bold; }
        em { font-style:italic; }
        ul,ol { margin-left:20px; }
        li { margin-bottom:4px; }
        blockquote { border-left:3px solid #007bc0; padding-left:12px; color:#666; font-style:italic; }
        table { border-collapse:collapse; width:100%; margin:12px 0; }
        th,td { border:1px solid #bbb; padding:8px 10px; text-align:left; font-size:10pt; }
        th { background:#007bc0; color:#fff; font-weight:bold; }
        code { background:#f4f4f4; padding:2px 4px; font-family:Consolas,monospace; font-size:10pt; }
        pre { background:#f4f4f4; padding:12px; border:1px solid #ddd; font-family:Consolas,monospace; font-size:10pt; white-space:pre-wrap; }
        a { color:#007bc0; text-decoration:underline; }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${logoHtml}
        <h1>${opts.title}</h1>
        <p class="meta-info">Generated on ${ts}</p>
        <p class="meta-agent">Report Generated by: ${opts.agentNames}</p>
        <p class="meta-powered">Powered by: BGSW/BDO</p>
        <hr class="title-divider"/>
        ${html.replace(/^<h1>.*?<\/h1>/i, "")}
        <br style="page-break-before:always" clear="all"/>
        <table id="footertable" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="font-size:7pt;color:#999;" align="left">Report Generated by: ${opts.agentNames}</td>
            <td style="font-size:7pt;color:#999;" align="right">Powered by: BGSW/BDO</td>
          </tr>
        </table>
      </div>
    </body>
    </html>`;

  const blob = new Blob([docContent], { type: "application/msword" });
  const { saveAs } = await import("file-saver");
  const safeName = opts.title.replace(/[^a-zA-Z0-9]/g, "_");
  saveAs(blob, `${safeName}_report.doc`);
}
