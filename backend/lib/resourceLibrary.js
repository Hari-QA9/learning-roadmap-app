// A hand-picked library of free, reputable learning resources across fields.
// Every URL here is a stable landing page on the provider's own site, so links
// never 404 the way AI-invented article URLs do. The AI picks from this list
// first (by id) and only falls back to searches for anything not covered.
//
// To add one: give it a short unique id, a direct URL, a type
// (course | docs | video | book | practice | tool | article) and some tags.

const R = (id, title, url, type, source, tags) => ({ id, title, url, type, source, tags: tags.split(/,\s*/) });

const LIBRARY = [
  // ---------- General / any subject ----------
  R('khan', 'Khan Academy', 'https://www.khanacademy.org/', 'course', 'Khan Academy', 'general, math, science, economics'),
  R('mit-ocw', 'MIT OpenCourseWare (free MIT courses)', 'https://ocw.mit.edu/', 'course', 'MIT', 'general, engineering, science, biology, chemistry, math, computer science, economics'),
  R('openstax', 'OpenStax free textbooks', 'https://openstax.org/subjects', 'book', 'OpenStax', 'general, biology, chemistry, physics, statistics, business, accounting, psychology, nursing'),
  R('edx', 'edX (free to audit)', 'https://www.edx.org/', 'course', 'edX', 'general'),
  R('coursera', 'Coursera (many courses free to audit)', 'https://www.coursera.org/', 'course', 'Coursera', 'general'),
  R('crashcourse', 'CrashCourse (YouTube)', 'https://www.youtube.com/@crashcourse', 'video', 'YouTube', 'general, biology, chemistry, anatomy, economics, psychology, history'),

  // ---------- Biology & life sciences ----------
  R('khan-bio', 'Khan Academy: Biology', 'https://www.khanacademy.org/science/biology', 'course', 'Khan Academy', 'biology, cell biology, genetics, molecular biology, evolution, ecology'),
  R('openstax-bio', 'OpenStax Biology 2e (free textbook)', 'https://openstax.org/details/books/biology-2e', 'book', 'OpenStax', 'biology, cell biology, genetics, molecular biology, physiology'),
  R('openstax-micro', 'OpenStax Microbiology (free textbook)', 'https://openstax.org/details/books/microbiology', 'book', 'OpenStax', 'microbiology, bacteria, infection, immunology, lab'),
  R('scitable', 'Nature Scitable: genetics & cell biology', 'https://www.nature.com/scitable/', 'article', 'Nature', 'biology, genetics, cell biology, molecular biology, ecology'),
  R('ibiology', 'iBiology: talks by leading scientists', 'https://www.ibiology.org/', 'video', 'iBiology', 'biology, research, cell biology, microscopy, career in science'),
  R('amoeba', 'Amoeba Sisters (YouTube)', 'https://www.youtube.com/@AmoebaSisters', 'video', 'YouTube', 'biology, cell biology, genetics, microbiology'),
  R('addgene', 'Addgene protocols (molecular biology)', 'https://www.addgene.org/protocols/', 'docs', 'Addgene', 'pcr, cloning, plasmid, transfection, molecular biology, lab techniques, crispr, gel electrophoresis'),
  R('protocols-io', 'protocols.io: step-by-step lab protocols', 'https://www.protocols.io/', 'docs', 'protocols.io', 'lab techniques, lab protocols, cell culture, western blot, elisa, pcr, microscopy, research'),
  R('ncbi-books', 'NCBI Bookshelf (free biomedical textbooks)', 'https://www.ncbi.nlm.nih.gov/books/', 'book', 'NIH / NCBI', 'biology, biochemistry, molecular biology, medicine, genetics, immunology'),
  R('pubmed', 'PubMed: search the research literature', 'https://pubmed.ncbi.nlm.nih.gov/', 'tool', 'NIH / NCBI', 'research, literature review, papers, biology, medicine, nursing, public health'),
  R('blast', 'NCBI BLAST', 'https://blast.ncbi.nlm.nih.gov/Blast.cgi', 'tool', 'NIH / NCBI', 'bioinformatics, sequencing, genomics, dna, protein'),
  R('rosalind', 'Rosalind: bioinformatics problems', 'https://rosalind.info/', 'practice', 'Rosalind', 'bioinformatics, python, genomics, programming for biology'),
  R('galaxy', 'Galaxy Training Network (bioinformatics)', 'https://training.galaxyproject.org/', 'course', 'Galaxy Project', 'bioinformatics, rna-seq, genomics, sequencing, ngs'),
  R('khan-chem', 'Khan Academy: Chemistry', 'https://www.khanacademy.org/science/chemistry', 'course', 'Khan Academy', 'chemistry, general chemistry, stoichiometry, titration'),
  R('khan-orgo', 'Khan Academy: Organic chemistry', 'https://www.khanacademy.org/science/organic-chemistry', 'course', 'Khan Academy', 'organic chemistry, reactions, synthesis, mcat'),
  R('openstax-chem', 'OpenStax Chemistry 2e (free textbook)', 'https://openstax.org/details/books/chemistry-2e', 'book', 'OpenStax', 'chemistry, general chemistry'),
  R('orgchem-tutor', 'The Organic Chemistry Tutor (YouTube)', 'https://www.youtube.com/@TheOrganicChemistryTutor', 'video', 'YouTube', 'chemistry, organic chemistry, physics, math, statistics, accounting'),
  R('statquest', 'StatQuest with Josh Starmer (YouTube)', 'https://www.youtube.com/@statquest', 'video', 'YouTube', 'statistics, biostatistics, machine learning, data analysis, r, rna-seq'),
  R('khan-stats', 'Khan Academy: Statistics & probability', 'https://www.khanacademy.org/math/statistics-probability', 'course', 'Khan Academy', 'statistics, biostatistics, probability, data analysis'),
  R('r4ds', 'R for Data Science (free book)', 'https://r4ds.hadley.nz/', 'book', 'Hadley Wickham', 'r, data analysis, statistics, biostatistics, data science'),

  // ---------- Clinical research & public health ----------
  R('clinicaltrials', 'ClinicalTrials.gov', 'https://clinicaltrials.gov/', 'tool', 'NIH', 'clinical research, clinical trials, lab protocols, crc'),
  R('citi', 'CITI Program (research ethics & GCP)', 'https://about.citiprogram.org/', 'course', 'CITI Program', 'clinical research, irb, research ethics, gcp, good clinical practice, human subjects'),
  R('cdc-learn', 'CDC TRAIN public health courses', 'https://www.train.org/cdctrain/', 'course', 'CDC', 'public health, epidemiology, infection control'),

  // ---------- Nursing & healthcare ----------
  R('nclex', 'NCLEX official candidate site', 'https://www.nclex.com/', 'docs', 'NCSBN', 'nursing, nclex, registered nurse, nclex exam'),
  R('openstax-nursing', 'OpenStax nursing textbooks (free)', 'https://openstax.org/subjects/nursing', 'book', 'OpenStax', 'nursing, nursing fundamentals, pharmacology, medical-surgical, maternal, nurse'),
  R('openstax-ap', 'OpenStax Anatomy & Physiology 2e (free)', 'https://openstax.org/details/books/anatomy-and-physiology-2e', 'book', 'OpenStax', 'anatomy, physiology, nursing, pre-med, health'),
  R('khan-health', 'Khan Academy: Health & medicine', 'https://www.khanacademy.org/science/health-and-medicine', 'course', 'Khan Academy', 'health, medicine, physiology, nursing, pre-med, mcat'),
  R('medlineplus', 'MedlinePlus (trusted health information)', 'https://medlineplus.gov/', 'docs', 'NIH / NLM', 'health, medicine, nursing, medications, patient education, medical terminology'),
  R('ninja-nerd', 'Ninja Nerd (YouTube)', 'https://www.youtube.com/@NinjaNerdOfficial', 'video', 'YouTube', 'anatomy, physiology, pharmacology, nursing, medicine, pathology, nurse'),
  R('rn-yt', 'RegisteredNurseRN (YouTube)', 'https://www.youtube.com/@RegisteredNurseRN', 'video', 'YouTube', 'nursing, nclex, pharmacology, nursing skills, dosage calculations'),
  R('aha-cpr', 'American Heart Association CPR & BLS', 'https://cpr.heart.org/', 'course', 'American Heart Association', 'bls, cpr, acls, healthcare, nursing, nurse'),

  // ---------- Business, finance & accounting ----------
  R('khan-econ', 'Khan Academy: Economics & finance', 'https://www.khanacademy.org/economics-finance-domain', 'course', 'Khan Academy', 'finance, economics, accounting, investing, business'),
  R('investopedia', 'Investopedia', 'https://www.investopedia.com/', 'article', 'Investopedia', 'finance, investing, accounting, valuation, economics, financial analysis'),
  R('cfi', 'Corporate Finance Institute (free courses)', 'https://corporatefinanceinstitute.com/', 'course', 'CFI', 'financial modeling, valuation, excel, accounting, financial analysis, fp&a'),
  R('accountingcoach', 'AccountingCoach', 'https://www.accountingcoach.com/', 'article', 'AccountingCoach', 'accounting, bookkeeping, gaap, financial statements, debits and credits'),
  R('openstax-acct', 'OpenStax Principles of Financial Accounting (free)', 'https://openstax.org/details/books/principles-financial-accounting', 'book', 'OpenStax', 'accounting, financial accounting, gaap, financial statements'),
  R('openstax-business', 'OpenStax business textbooks (free)', 'https://openstax.org/subjects/business', 'book', 'OpenStax', 'business, business management, marketing, entrepreneurship, accounting'),
  R('edgar', 'SEC EDGAR: real company filings (10-K, 10-Q)', 'https://www.sec.gov/edgar/search/', 'tool', 'U.S. SEC', 'finance, financial analysis, accounting, valuation, 10-k'),
  R('excel-help', 'Microsoft Excel help & training', 'https://support.microsoft.com/en-us/excel', 'docs', 'Microsoft', 'excel, spreadsheets, pivottables, formulas, data analysis, business'),
  R('ms-learn', 'Microsoft Learn (free training)', 'https://learn.microsoft.com/en-us/training/', 'course', 'Microsoft', 'excel, power bi, azure, microsoft 365, sql, certification'),
  R('powerbi-learn', 'Power BI training on Microsoft Learn', 'https://learn.microsoft.com/en-us/training/powerplatform/power-bi', 'course', 'Microsoft', 'power bi, dashboards, data analysis, business intelligence'),
  R('tableau-training', 'Tableau free training videos', 'https://www.tableau.com/learn/training', 'video', 'Tableau', 'tableau, dashboards, data visualization, data analysis'),

  // ---------- Marketing, design & communication ----------
  R('skillshop', 'Google Skillshop (Ads & Analytics certifications)', 'https://skillshop.withgoogle.com/', 'course', 'Google', 'marketing, google ads, google analytics, ga4, digital marketing'),
  R('hubspot-academy', 'HubSpot Academy (free marketing courses)', 'https://academy.hubspot.com/', 'course', 'HubSpot', 'marketing, content marketing, email marketing, social media, sales, inbound'),
  R('seo-guide', 'Google SEO Starter Guide', 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide', 'docs', 'Google', 'seo, search engine optimization, digital marketing, content'),
  R('meta-blueprint', 'Meta Blueprint (social ads)', 'https://www.facebook.com/business/learn', 'course', 'Meta', 'social media marketing, facebook ads, instagram, digital marketing'),
  R('nng', 'Nielsen Norman Group: UX articles', 'https://www.nngroup.com/articles/', 'article', 'NN/g', 'ux, user research, usability, ux design, wireframing'),
  R('figma-help', 'Figma Learn & Help Center', 'https://help.figma.com/', 'docs', 'Figma', 'figma, ui design, prototyping, wireframing, design systems'),
  R('lawsofux', 'Laws of UX', 'https://lawsofux.com/', 'article', 'Laws of UX', 'ux, design principles, psychology, ui design'),

  // ---------- Engineering ----------
  R('autodesk-learn', 'Autodesk learning (AutoCAD, Revit, Civil 3D)', 'https://www.autodesk.com/learn', 'course', 'Autodesk', 'autocad, revit, civil 3d, bim, cad, engineering, construction'),
  R('ncees-fe', 'NCEES FE exam (official)', 'https://ncees.org/exams/fe-exam/', 'docs', 'NCEES', 'fe exam, engineering licensure, civil engineering, mechanical engineering, eit'),
  R('nptel', 'NPTEL: free engineering courses (IITs)', 'https://nptel.ac.in/', 'course', 'NPTEL', 'engineering, civil engineering, mechanical engineering, electrical, structural analysis'),

  // ---------- Education & teaching ----------
  R('edutopia', 'Edutopia: classroom strategies', 'https://www.edutopia.org/', 'article', 'Edutopia', 'teaching, teacher, classroom management, lesson planning, education'),
  R('praxis', 'Praxis tests (official, ETS)', 'https://www.ets.org/praxis.html', 'docs', 'ETS', 'teaching, teacher, praxis, teacher certification, education'),
  R('udl', 'CAST UDL Guidelines', 'https://udlguidelines.cast.org/', 'docs', 'CAST', 'teaching, teacher, special education, inclusive teaching, udl, curriculum'),

  // ---------- Law ----------
  R('lii', 'Cornell Legal Information Institute', 'https://www.law.cornell.edu/', 'docs', 'Cornell LII', 'law, legal research, paralegal, contracts, regulations'),

  // ---------- Technology & software ----------
  R('mdn', 'MDN: Learn web development', 'https://developer.mozilla.org/en-US/docs/Learn', 'docs', 'MDN', 'javascript, html, css, web development, frontend'),
  R('freecodecamp', 'freeCodeCamp curriculum', 'https://www.freecodecamp.org/learn', 'course', 'freeCodeCamp', 'javascript, web development, python, data analysis, sql, programming'),
  R('fcc-yt', 'freeCodeCamp (YouTube)', 'https://www.youtube.com/@freecodecamp', 'video', 'YouTube', 'programming, python, javascript, sql, data science'),
  R('odin', 'The Odin Project', 'https://www.theodinproject.com/', 'course', 'The Odin Project', 'web development, javascript, react, node.js, ruby, full stack'),
  R('cs50', "Harvard CS50 (free)", 'https://cs50.harvard.edu/x/', 'course', 'Harvard', 'computer science, programming, c, python, sql'),
  R('python-tutorial', 'The official Python tutorial', 'https://docs.python.org/3/tutorial/', 'docs', 'python.org', 'python, programming'),
  R('realpython', 'Real Python', 'https://realpython.com/', 'article', 'Real Python', 'python, programming, data analysis, testing, pytest'),
  R('dev-java', 'Learn Java (dev.java)', 'https://dev.java/learn/', 'docs', 'Oracle', 'java, programming, oop'),
  R('sqlbolt', 'SQLBolt: interactive SQL lessons', 'https://sqlbolt.com/', 'practice', 'SQLBolt', 'sql, databases, data analysis, mysql, postgresql'),
  R('kaggle-learn', 'Kaggle Learn (free micro-courses)', 'https://www.kaggle.com/learn', 'course', 'Kaggle', 'python, pandas, machine learning, data analysis, sql, data visualization'),
  R('git-book', 'Pro Git (free book)', 'https://git-scm.com/book/en/v2', 'book', 'git-scm.com', 'git, github, version control'),
  R('exercism', 'Exercism: coding practice with mentors', 'https://exercism.org/', 'practice', 'Exercism', 'programming, practice, python, javascript, java'),
  R('leetcode', 'LeetCode', 'https://leetcode.com/', 'practice', 'LeetCode', 'algorithms, data structures, coding interview'),
  R('selenium-docs', 'Selenium documentation', 'https://www.selenium.dev/documentation/', 'docs', 'selenium.dev', 'selenium, test automation, qa, webdriver'),
  R('playwright-docs', 'Playwright documentation', 'https://playwright.dev/docs/intro', 'docs', 'playwright.dev', 'playwright, test automation, qa, end-to-end testing, typescript'),
  R('cypress-docs', 'Cypress documentation', 'https://docs.cypress.io/', 'docs', 'cypress.io', 'cypress, test automation, qa, end-to-end testing, javascript'),
  R('postman-learning', 'Postman Learning Center', 'https://learning.postman.com/', 'docs', 'Postman', 'api testing, rest apis, postman, qa'),
  R('istqb', 'ISTQB (testing certification & syllabus)', 'https://www.istqb.org/', 'docs', 'ISTQB', 'software testing, qa, manual testing'),
  R('docker-start', 'Docker: Get started', 'https://docs.docker.com/get-started/', 'docs', 'Docker', 'docker, containers, devops'),
  R('k8s-tutorials', 'Kubernetes tutorials', 'https://kubernetes.io/docs/tutorials/', 'docs', 'kubernetes.io', 'kubernetes, k8s, devops, containers'),
  R('aws-skillbuilder', 'AWS Skill Builder (free training)', 'https://skillbuilder.aws/', 'course', 'AWS', 'aws, cloud, devops'),
  R('react-learn', 'React: official tutorial', 'https://react.dev/learn', 'docs', 'react.dev', 'react, javascript, frontend, web development'),
  R('fireship', 'Fireship (YouTube)', 'https://www.youtube.com/@Fireship', 'video', 'YouTube', 'programming, web development, javascript'),
  R('corey', 'Corey Schafer (YouTube)', 'https://www.youtube.com/@coreyms', 'video', 'YouTube', 'python, django, flask, pandas, git'),
];

const BY_ID = new Map(LIBRARY.map((r) => [r.id, r]));
const words = (s) => String(s || '').toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 1);

/**
 * The library entries most relevant to a topic, best first.
 * Scores whole-tag matches (e.g. "cell biology") higher than single words.
 */
function relevantResources(text, limit = 30) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const w = new Set(words(text));
  const scored = LIBRARY.map((r) => {
    let score = 0;
    for (const tag of r.tags) {
      if (tag === 'general') continue;
      if (t.includes(` ${tag} `) || t.includes(` ${tag},`) || t.includes(` ${tag}.`)) score += 3;
      else if (tag.split(' ').every((x) => w.has(x))) score += 2;
      else if (tag.split(' ').some((x) => x.length > 3 && w.has(x))) score += 0.5;
    }
    if (r.tags.includes('general')) score += 0.4;
    return { r, score };
  });
  // Need a real match (a whole tag, or two partial words) — one loose word like "fundamentals" isn't enough.
  const strong = scored.filter((x) => x.score >= 1).sort((a, b) => b.score - a.score);
  const general = scored.filter((x) => x.score > 0 && x.score < 1 && x.r.tags.includes('general')).sort((a, b) => b.score - a.score);
  return [...strong, ...general.slice(0, strong.length >= 4 ? 1 : 3)].slice(0, limit).map((x) => x.r);
}

module.exports = { LIBRARY, BY_ID, relevantResources };
