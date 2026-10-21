import React, { useLayoutEffect, useRef, useState } from 'react';
import { dateRange, skillList, visible } from '../../lib/resume';

// Paper sizes in CSS pixels (96 dpi). Margins match the print @page rule.
export const PAPER = {
  letter: { w: 816, h: 1056, label: 'US Letter', css: 'letter' },
  a4: { w: 794, h: 1123, label: 'A4', css: 'A4' },
};
export const MARGIN_Y = 48; // 0.5in
export const MARGIN_X = 54;

export const TEMPLATES = [
  { value: 'classic', label: 'Classic', hint: 'Centered header, serif headings — safe everywhere' },
  { value: 'modern', label: 'Modern', hint: 'Clean sans-serif with a subtle accent color' },
  { value: 'compact', label: 'Compact', hint: 'Tighter spacing to fit more on one page' },
];

const clean = (arr) => (arr || []).map((b) => String(b).trim()).filter(Boolean);
const linkText = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function Entry({ e }) {
  return (
    <div className="rp-entry">
      <div className="rp-row"><span className="rp-title">{e.title}{e.company && <span className="rp-org">{e.title ? ', ' : ''}{e.company}</span>}</span><span className="rp-date">{dateRange(e)}</span></div>
      {e.location && <div className="rp-sub">{e.location}</div>}
      {clean(e.bullets).length > 0 && <ul>{clean(e.bullets).map((b, i) => <li key={i}>{b}</li>)}</ul>}
    </div>
  );
}

/** The resume itself — real text in a single column, so ATS can read every word. */
export function ResumeDocument({ r, certs = [] }) {
  const c = r.contact;
  const contact = [c.email, c.phone, c.location, linkText(c.linkedin), linkText(c.website)].filter(Boolean);
  const sections = {
    summary: r.summary.trim() && (
      <p className="rp-summary">{r.summary.trim()}</p>
    ),
    skills: skillList(r).length > 0 && (
      <div className="rp-skills">
        {r.skills.filter((g) => g.items.trim()).map((g) => (
          <div key={g.id}>{g.group && <strong>{g.group}: </strong>}{g.items.split(',').map((s) => s.trim()).filter(Boolean).join(', ')}</div>
        ))}
      </div>
    ),
    experience: r.experience.length > 0 && r.experience.map((e) => <Entry key={e.id} e={e} />),
    projects: r.projects.length > 0 && r.projects.map((p) => (
      <div className="rp-entry" key={p.id}>
        <div className="rp-row">
          <span className="rp-title">{p.name}{p.tech && <span className="rp-org"> | {p.tech}</span>}</span>
          <span className="rp-date">{dateRange(p)}</span>
        </div>
        {p.link && <div className="rp-sub">{linkText(p.link)}</div>}
        {clean(p.bullets).length > 0 && <ul>{clean(p.bullets).map((b, i) => <li key={i}>{b}</li>)}</ul>}
      </div>
    )),
    research: r.research?.length > 0 && r.research.map((e) => <Entry key={e.id} e={e} />),
    volunteer: r.volunteer?.length > 0 && r.volunteer.map((e) => <Entry key={e.id} e={e} />),
    publications: r.publications?.some((x) => x.citation.trim()) && (
      <ul className="rp-pubs">{r.publications.filter((x) => x.citation.trim()).map((x) => <li key={x.id}>{x.citation.trim()}{x.link ? ` ${linkText(x.link)}` : ''}</li>)}</ul>
    ),
    awards: r.awards?.length > 0 && (
      <div>{r.awards.map((x) => <div className="rp-row" key={x.id}><span>{x.name}{x.issuer && <span className="rp-org"> — {x.issuer}</span>}</span><span className="rp-date">{x.date}</span></div>)}</div>
    ),
    education: r.education.length > 0 && r.education.map((e) => (
      <div className="rp-entry" key={e.id}>
        <div className="rp-row"><span className="rp-title">{e.degree}{e.school && <span className="rp-org">{e.degree ? ', ' : ''}{e.school}</span>}</span><span className="rp-date">{dateRange(e)}</span></div>
        {(e.location || e.details) && <div className="rp-sub">{[e.location, e.details].filter(Boolean).join(' · ')}</div>}
      </div>
    )),
    certifications: (r.certifications.length > 0 || certs.length > 0) && (
      <div>
        {r.certifications.map((x) => (
          <div className="rp-row" key={x.id}><span>{x.name}{x.issuer && <span className="rp-org"> — {x.issuer}</span>}</span><span className="rp-date">{x.date}</span></div>
        ))}
        {certs.map((x) => (
          <div className="rp-row" key={`lm-${x.id}`}><span>{x.roadmap_title}<span className="rp-org"> — LearnMap</span></span><span className="rp-date">{new Date(x.issued_at).getFullYear()}</span></div>
        ))}
      </div>
    ),
  };
  const titles = {
    summary: 'Summary', skills: 'Skills', experience: 'Experience', projects: 'Projects', education: 'Education', certifications: 'Certifications',
    research: 'Research Experience', publications: 'Publications & Presentations', volunteer: 'Volunteer & Leadership', awards: 'Awards & Honors',
  };

  return (
    <div className={`rp rp-${r.template}`}>
      <header className="rp-head">
        <h1>{c.name || 'Your Name'}</h1>
        {c.headline && <div className="rp-headline">{c.headline}</div>}
        {contact.length > 0 && <div className="rp-contact">{contact.join('  |  ')}</div>}
      </header>
      {r.order.filter((s) => visible(r, s) && sections[s]).map((s) => (
        <section key={s}>
          <h2>{titles[s]}</h2>
          {sections[s]}
        </section>
      ))}
    </div>
  );
}

/** Scaled, live preview with page-break markers and a page count. */
export default function ResumePaper({ r, certs, onPages }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(PAPER.letter.h);
  const paper = PAPER[r.paper] || PAPER.letter;
  const usable = paper.h - MARGIN_Y * 2;

  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => {
      if (outer.current) setScale(Math.min(1, outer.current.clientWidth / paper.w));
      if (inner.current) {
        const contentH = inner.current.scrollHeight;
        const pages = Math.max(1, contentH / usable);
        setHeight(Math.ceil(pages) * paper.h);
        onPages?.(Math.round(pages * 100) / 100);
      }
    });
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [paper.w, paper.h, usable, onPages]);

  const pageCount = Math.round(height / paper.h);
  return (
    <div ref={outer} className="rp-viewport" style={{ height: height * scale }}>
      <div className="rp-sheet" style={{ width: paper.w, height, transform: `scale(${scale})` }}>
        {Array.from({ length: pageCount }).map((_, i) => (
          <div key={i} className="rp-page-bg" style={{ top: i * paper.h, height: paper.h }}>
            {i > 0 && <span className="rp-page-label">Page {i + 1}</span>}
          </div>
        ))}
        {/* Content flows continuously; each page shows `usable` px of it, like the printed PDF. */}
        {Array.from({ length: pageCount }).map((_, i) => (
          <div key={`c${i}`} className="rp-page-clip" style={{ top: i * paper.h + MARGIN_Y, height: usable, left: MARGIN_X, right: MARGIN_X }}>
            <div style={{ transform: `translateY(${-i * usable}px)` }} ref={i === 0 ? inner : undefined}>
              <ResumeDocument r={r} certs={certs} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Off-screen copy used for printing to PDF (selectable text, not an image). */
export function PrintableResume({ r, certs }) {
  return (
    <div id="resume-print" aria-hidden="true">
      <ResumeDocument r={r} certs={certs} />
    </div>
  );
}
