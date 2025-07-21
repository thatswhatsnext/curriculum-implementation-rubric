
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import SimpleMDE from 'react-simplemde-editor';
import jsPDF from 'jspdf';
import logoImg from './logo.png';
import 'easymde/dist/easymde.min.css';

function App() {
  const [rubricData, setRubricData] = useState([]);
  const [ratings, setRatings] = useState({});
  const [evidence, setEvidence] = useState({});
  const [nextSteps, setNextSteps] = useState({});
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    Papa.parse('/rubric.csv', {
      download: true,
      header: true,
      complete: (results) => setRubricData(results.data)
    });
  }, []);

  const handleSelect = (domain, level) => {
    setRatings({ ...ratings, [domain]: level });
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const leftMargin = 50;
    const maxWidth = 440;
    let y = 90;

    const checkPageSpace = (needed) => {
      if (y + needed > 750) {
        doc.addPage();
        doc.addImage(logoImg, 'PNG', leftMargin, 20, 140, 40);
        y = 90;
      }
    };

    doc.addImage(logoImg, 'PNG', leftMargin, 20, 140, 40);

    rubricData.forEach((row) => {
      if (!row.domain) return;
      const rating = ratings[row.domain] || 'Not rated';
      let ratingText = '';
      if (rating === 'Emerging') ratingText = row.emerging;
      if (rating === 'Developing') ratingText = row.developing;
      if (rating === 'Embedding') ratingText = row.embedding;
      if (rating === 'Excelling') ratingText = row.excelling;

      const ev = evidence[row.domain] || '';
      const ns = nextSteps[row.domain] || '';

      checkPageSpace(60);
      doc.setFontSize(14);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(41, 72, 90);
      doc.text(row.domain, leftMargin, y);
      y += 10;
      doc.setDrawColor(204, 204, 204);
      doc.line(leftMargin, y, leftMargin + maxWidth, y);
      y += 18;

      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const indLines = doc.splitTextToSize(`Indicators: ${row.indicators}`, maxWidth);
      indLines.forEach(line => { checkPageSpace(16); doc.text(line, leftMargin, y); y += 14; });
      y += 10;

      if (rating !== 'Not rated') {
        checkPageSpace(50);
        doc.setFillColor(224, 245, 241);
        doc.rect(leftMargin, y - 6, maxWidth, 40, 'F');
      }
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(0, 119, 168);
      doc.text(`Rating: ${rating}`, leftMargin + 8, y + 12);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const ratingLines = doc.splitTextToSize(ratingText, maxWidth - 16);
      let ry = y + 28;
      ratingLines.forEach(line => { checkPageSpace(16); doc.text(line, leftMargin + 8, ry); ry += 14; });
      y = ry + 12;

      if (ev.trim()) {
        doc.setFont('Helvetica', 'bold');
        checkPageSpace(20);
        doc.text('Evidence:', leftMargin, y); y += 14;
        doc.setFont('Helvetica', 'normal');
        const evLines = doc.splitTextToSize(ev, maxWidth);
        evLines.forEach(line => { checkPageSpace(18); doc.text(`• ${line}`, leftMargin + 8, y); y += 16; });
        y += 8;
      }

      if (ns.trim()) {
        doc.setFont('Helvetica', 'bold');
        checkPageSpace(20);
        doc.text('Next Steps:', leftMargin, y); y += 14;
        doc.setFont('Helvetica', 'normal');
        const nsLines = doc.splitTextToSize(ns, maxWidth);
        nsLines.forEach(line => { checkPageSpace(18); doc.text(`• ${line}`, leftMargin + 8, y); y += 16; });
        y += 8;
      }

      y += 20;
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 500, 820);
    }

    doc.save('Curriculum_Rubric_Summary.pdf');
  };

  return (
    <div>
      <h1>Curriculum Implementation Rubric – Card View</h1>
      <button className="export-btn" onClick={exportPDF}>Export PDF</button>
      {rubricData.map(row => row.domain && (
        <div className="card" key={row.domain}>
          <div className="card-header">
            <h3>{row.domain}</h3>
            <p>{row.indicators}</p>
          </div>
          <div className="card-body">
            {['emerging','developing','embedding','excelling'].map(level => (
              <div
                key={level}
                className={`card-cell ${ratings[row.domain] === level.charAt(0).toUpperCase()+level.slice(1) ? 'selected' : ''}`}
                onClick={() => handleSelect(row.domain, level.charAt(0).toUpperCase()+level.slice(1))}
              >
                <strong>{level.charAt(0).toUpperCase()+level.slice(1)}:</strong> {row[level]}
              </div>
            ))}
          </div>
          <div className="card-footer">
            <button onClick={() => setEditing({ domain: row.domain, field: 'evidence', value: evidence[row.domain] || '' })}>Evidence</button>
            <button onClick={() => setEditing({ domain: row.domain, field: 'nextSteps', value: nextSteps[row.domain] || '' })}>Next Steps</button>
            <button onClick={() => setRatings({ ...ratings, [row.domain]: '' })}>Clear</button>
          </div>
        </div>
      ))}

      {editing && (
        <div className="modal">
          <div className="modal-content">
            <h2>{editing.domain}</h2>
            <p>{rubricData.find(r => r.domain === editing.domain)?.indicators}</p>
            <p>Selected rating: {ratings[editing.domain] || 'Not rated'}</p>
            <SimpleMDE value={editing.value} onChange={(val) => setEditing({ ...editing, value: val })} />
            <div className="modal-buttons">
              <button className="save-btn" onClick={() => {
                if (editing.field === 'evidence') {
                  setEvidence({ ...evidence, [editing.domain]: editing.value });
                } else {
                  setNextSteps({ ...nextSteps, [editing.domain]: editing.value });
                }
                setEditing(null);
              }}>Save</button>
              <button className="cancel-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
