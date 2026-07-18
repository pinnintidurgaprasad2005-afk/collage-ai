import { el, toast, formatDate, gradeFromScore } from '../ui.js';
import { supabase } from '../supabase.js';
import { generateFinalReport } from '../gemini.js';

export async function renderReportsView(app, student, onDone) {
  const wrap = el('div', { class: 'view-wrap' });
  wrap.appendChild(el('h2', { class: 'view-title' }, 'AI Reports'));
  wrap.appendChild(el('p', { class: 'muted' }, 'Generate a consolidated AI report powered by Gemini 2.5 Flash, or download a previous report as PDF.'));

  const genBtn = el('button', { class: 'btn btn-primary', onclick: async () => {
    genBtn.disabled = true;
    genBtn.textContent = 'Generating with Gemini...';
    try {
      const [{ data: interview }, { data: apt }, { data: vocab }, { data: tech }] = await Promise.all([
        supabase.from('interview_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('aptitude_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('vocabulary_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('technical_reports').select('*').eq('user_id', student.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!interview && !apt && !vocab && !tech) {
        toast('Take at least one assessment first', 'error');
        genBtn.disabled = false;
        genBtn.textContent = 'Generate Final AI Report';
        return;
      }
      const result = await generateFinalReport({
        studentName: student.full_name,
        branch: student.branch,
        interview: interview || {},
        aptitudeScore: apt?.score || 0,
        aptitudeTotal: apt?.total || 0,
        vocabScore: vocab?.score || 0,
        vocabTotal: vocab?.total || 0,
        technical: tech || {},
      });
      const charts = {
        interview: interview ? {
          confidence: interview.confidence, communication: interview.communication,
          technical_knowledge: interview.technical_knowledge, problem_solving: interview.problem_solving,
          grammar: interview.grammar, overall_rating: interview.overall_rating,
        } : null,
        aptitude: apt ? { score: apt.score, total: apt.total } : null,
        vocabulary: vocab ? { score: vocab.score, total: vocab.total } : null,
        technical: tech ? { language: tech.language, score: tech.score, total: tech.total } : null,
      };
      const { data: saved } = await supabase.from('final_reports').insert({
        user_id: student.user_id,
        overall_score: result.overall_score,
        grade: result.grade,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
        gemini_feedback: result.gemini_feedback,
        charts,
      }).select().maybeSingle();
      await supabase.from('students').update({ overall_score: result.overall_score }).eq('user_id', student.user_id);
      await supabase.from('notifications').insert({
        user_id: student.user_id,
        type: 'report_ready',
        message: 'Your Final AI Report is ready. Download it now!',
      });
      toast('Report generated!', 'success');
      onDone();
    } catch (e) {
      toast(e.message, 'error');
      genBtn.disabled = false;
      genBtn.textContent = 'Generate Final AI Report';
    }
  } }, 'Generate Final AI Report');
  wrap.appendChild(genBtn);

  const listCard = el('div', { class: 'glass card report-list-card' });
  listCard.appendChild(el('h3', {}, 'Previous Reports'));
  const { data: reports } = await supabase
    .from('final_reports')
    .select('*')
    .eq('user_id', student.user_id)
    .order('created_at', { ascending: false });
  if (!reports || reports.length === 0) {
    listCard.appendChild(el('p', { class: 'muted' }, 'No reports yet. Generate your first AI report above.'));
  } else {
    const list = el('div', { class: 'report-list' });
    for (const r of reports) {
      const item = el('div', { class: 'report-item' }, [
        el('div', {}, [
          el('div', { class: 'report-score' }, `Score: ${Math.round(r.overall_score)} / 100`),
          el('div', { class: 'muted small' }, `Grade: ${r.grade} • ${formatDate(r.created_at)}`),
        ]),
        el('button', { class: 'btn btn-outline btn-sm', onclick: () => downloadPdf(r, student) }, 'Download PDF'),
      ]);
      list.appendChild(item);
    }
    listCard.appendChild(list);
  }
  wrap.appendChild(listCard);
  return wrap;
}

async function downloadPdf(report, student) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  doc.setFontSize(20);
  doc.setTextColor(20, 30, 60);
  doc.text('AI Student Assessment Report', pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 110, 130);
  doc.text('Powered by Google Gemini 2.5 Flash', pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(12);
  doc.setTextColor(20, 30, 60);
  doc.text('Student Details', 14, y); y += 7;
  doc.setFontSize(10);
  doc.setTextColor(60, 70, 90);
  const details = [
    `Name: ${student.full_name}`,
    `Roll Number: ${student.roll_number}`,
    `Branch: ${student.branch}`,
    `Year: ${student.year}`,
    `Section: ${student.section}`,
    `Email: ${student.email}`,
    `Report Date: ${formatDate(report.created_at)}`,
  ];
  for (const d of details) { doc.text(d, 14, y); y += 6; }
  y += 6;

  doc.setFontSize(12);
  doc.setTextColor(20, 30, 60);
  doc.text(`Overall Score: ${Math.round(report.overall_score)} / 100`, 14, y); y += 7;
  doc.text(`Grade: ${report.grade}`, 14, y); y += 10;

  const section = (title, items) => {
    if (!items || !items.length) return;
    doc.setFontSize(12);
    doc.setTextColor(20, 30, 60);
    doc.text(title, 14, y); y += 7;
    doc.setFontSize(10);
    doc.setTextColor(60, 70, 90);
    for (const it of items) {
      const lines = doc.splitTextToSize(`• ${it}`, pageWidth - 28);
      for (const ln of lines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(ln, 14, y); y += 6;
      }
    }
    y += 4;
  };
  section('Strengths', report.strengths);
  section('Weaknesses', report.weaknesses);
  section('Recommendations', report.recommendations);

  if (report.gemini_feedback) {
    doc.setFontSize(12);
    doc.setTextColor(20, 30, 60);
    doc.text('Gemini Feedback', 14, y); y += 7;
    doc.setFontSize(10);
    doc.setTextColor(60, 70, 90);
    const lines = doc.splitTextToSize(report.gemini_feedback, pageWidth - 28);
    for (const ln of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(ln, 14, y); y += 6;
    }
  }

  if (report.charts) {
    if (y > 230) { doc.addPage(); y = 20; }
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(20, 30, 60);
    doc.text('Assessment Scores', 14, y); y += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 70, 90);
    const c = report.charts;
    if (c.interview) {
      doc.text(`Interview Overall: ${(c.interview.overall_rating || 0).toFixed(1)} / 10`, 14, y); y += 6;
    }
    if (c.aptitude) doc.text(`Aptitude: ${c.aptitude.score} / ${c.aptitude.total}`, 14, y), y += 6;
    if (c.vocabulary) doc.text(`Vocabulary: ${c.vocabulary.score} / ${c.vocabulary.total}`, 14, y), y += 6;
    if (c.technical) doc.text(`Technical (${c.technical.language}): ${c.technical.score} / ${c.technical.total}`, 14, y), y += 6;
  }

  doc.save(`AI_Report_${student.roll_number}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
