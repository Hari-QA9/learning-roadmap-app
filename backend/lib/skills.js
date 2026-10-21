// Skill dictionary + matching.
// Extracting skills locally (no AI call) keeps the job board instant and free;
// the AI is only used when a member asks for a deeper fit analysis.

// [canonical name, ...aliases]. Aliases are matched as whole words, case-insensitive.
const SKILLS = [
  // Languages
  ['JavaScript', 'javascript', 'js', 'es6', 'ecmascript'], ['TypeScript', 'typescript', 'ts'], ['Python', 'python'],
  ['Java', 'java'], ['C#', 'c#', 'csharp', '.net', 'dotnet', 'asp.net'], ['C++', 'c++', 'cpp'], ['C', 'c language'],
  ['Go', 'golang', 'go lang'], ['Rust', 'rust'], ['Ruby', 'ruby'], ['PHP', 'php'], ['Kotlin', 'kotlin'], ['Swift', 'swift'],
  ['Scala', 'scala'], ['R', 'r language', 'rstudio'], ['SQL', 'sql'], ['Bash', 'bash', 'shell scripting', 'shell script'],
  ['MATLAB', 'matlab'], ['Dart', 'dart'], ['Perl', 'perl'],
  // Frontend
  ['React', 'react', 'react.js', 'reactjs'], ['Next.js', 'next.js', 'nextjs'], ['Vue', 'vue', 'vue.js', 'vuejs'],
  ['Angular', 'angular', 'angularjs'], ['Svelte', 'svelte'], ['HTML', 'html', 'html5'], ['CSS', 'css', 'css3'],
  ['Tailwind', 'tailwind', 'tailwindcss'], ['Sass', 'sass', 'scss'], ['Redux', 'redux'], ['Webpack', 'webpack'], ['Vite', 'vite'],
  ['React Native', 'react native'], ['Flutter', 'flutter'],
  // Backend
  ['Node.js', 'node', 'node.js', 'nodejs'], ['Express', 'express', 'express.js', 'expressjs'], ['NestJS', 'nestjs'],
  ['Django', 'django'], ['Flask', 'flask'], ['FastAPI', 'fastapi'], ['Spring', 'spring', 'spring boot', 'springboot'],
  ['Rails', 'rails', 'ruby on rails'], ['Laravel', 'laravel'], ['GraphQL', 'graphql'], ['REST APIs', 'rest', 'restful', 'rest api', 'rest apis'],
  ['gRPC', 'grpc'], ['Microservices', 'microservices', 'microservice'],
  // Data
  ['MySQL', 'mysql'], ['PostgreSQL', 'postgres', 'postgresql'], ['MongoDB', 'mongodb', 'mongo'], ['Redis', 'redis'],
  ['SQL Server', 'sql server', 'mssql'], ['Oracle', 'oracle db', 'oracle database', 'pl/sql'], ['SQLite', 'sqlite'],
  ['Elasticsearch', 'elasticsearch', 'elastic search'], ['Kafka', 'kafka'], ['RabbitMQ', 'rabbitmq'], ['Snowflake', 'snowflake'],
  ['BigQuery', 'bigquery'], ['Spark', 'spark', 'pyspark', 'apache spark'], ['Hadoop', 'hadoop'], ['Airflow', 'airflow'], ['dbt', 'dbt'],
  ['Pandas', 'pandas'], ['NumPy', 'numpy'], ['Excel', 'excel', 'microsoft excel'], ['Tableau', 'tableau'], ['Power BI', 'power bi', 'powerbi'],
  ['Looker', 'looker'], ['ETL', 'etl', 'elt'], ['Data Modeling', 'data modeling', 'data modelling'],
  // ML / AI
  ['Machine Learning', 'machine learning', 'ml'], ['Deep Learning', 'deep learning'], ['TensorFlow', 'tensorflow'], ['PyTorch', 'pytorch'],
  ['scikit-learn', 'scikit-learn', 'sklearn'], ['NLP', 'nlp', 'natural language processing'], ['Computer Vision', 'computer vision', 'opencv'],
  ['LLMs', 'llm', 'llms', 'large language models', 'generative ai', 'genai'], ['Statistics', 'statistics', 'statistical'],
  ['MLOps', 'mlops'], ['Data Analysis', 'data analysis', 'data analytics'],
  // Cloud / DevOps
  ['AWS', 'aws', 'amazon web services', 'ec2', 's3', 'lambda'], ['Azure', 'azure'], ['GCP', 'gcp', 'google cloud'],
  ['Docker', 'docker', 'containers'], ['Kubernetes', 'kubernetes', 'k8s'], ['Terraform', 'terraform'], ['Ansible', 'ansible'],
  ['CI/CD', 'ci/cd', 'ci cd', 'continuous integration', 'continuous delivery'], ['Jenkins', 'jenkins'], ['GitHub Actions', 'github actions'],
  ['GitLab CI', 'gitlab ci', 'gitlab'], ['Linux', 'linux', 'unix'], ['Git', 'git', 'github', 'version control'], ['Nginx', 'nginx'],
  ['Prometheus', 'prometheus'], ['Grafana', 'grafana'], ['Datadog', 'datadog'], ['Serverless', 'serverless'],
  // Testing / QA
  ['Selenium', 'selenium', 'webdriver'], ['Playwright', 'playwright'], ['Cypress', 'cypress'], ['Appium', 'appium'],
  ['Jest', 'jest'], ['Mocha', 'mocha'], ['JUnit', 'junit'], ['TestNG', 'testng'], ['PyTest', 'pytest'], ['Postman', 'postman'],
  ['API Testing', 'api testing', 'rest assured', 'restassured'], ['Test Automation', 'test automation', 'automation testing', 'automated testing'],
  ['Manual Testing', 'manual testing'], ['Performance Testing', 'performance testing', 'jmeter', 'load testing', 'k6'],
  ['Cucumber', 'cucumber', 'bdd', 'gherkin'], ['QA', 'quality assurance', 'qa'], ['TDD', 'tdd', 'test-driven'],
  // Practices / tools
  ['Agile', 'agile', 'scrum', 'kanban'], ['Jira', 'jira'], ['System Design', 'system design', 'distributed systems'],
  ['Data Structures', 'data structures', 'algorithms'], ['OOP', 'oop', 'object-oriented', 'object oriented'],
  ['Security', 'security', 'owasp', 'cybersecurity'], ['Figma', 'figma'], ['UX', 'ux', 'user experience'],
  ['Product Management', 'product management', 'product manager'], ['Communication', 'communication skills', 'stakeholder'],
  // Life sciences & lab
  ['PCR', 'pcr', 'qpcr', 'rt-pcr', 'rt-qpcr'], ['Western Blot', 'western blot', 'western blotting', 'immunoblot'], ['Cell Culture', 'cell culture', 'tissue culture', 'mammalian cell culture'],
  ['CRISPR', 'crispr', 'cas9', 'gene editing'], ['ELISA', 'elisa'], ['Flow Cytometry', 'flow cytometry', 'facs'], ['Microscopy', 'microscopy', 'confocal', 'fluorescence microscopy', 'scanning electron microscopy'],
  ['Gel Electrophoresis', 'gel electrophoresis', 'sds-page', 'agarose gel'], ['DNA Sequencing', 'sanger sequencing', 'next-generation sequencing', 'ngs', 'rna-seq', 'dna sequencing'],
  ['Molecular Cloning', 'molecular cloning', 'plasmid', 'transfection'], ['Protein Purification', 'protein purification', 'protein expression'], ['Chromatography', 'chromatography', 'hplc', 'gc-ms'],
  ['Mass Spectrometry', 'mass spectrometry', 'lc-ms', 'lc-ms/ms'], ['Spectrophotometry', 'spectrophotometry', 'spectrophotometer', 'uv-vis'], ['Immunohistochemistry', 'immunohistochemistry', 'ihc', 'histology'],
  ['Aseptic Technique', 'aseptic technique', 'sterile technique'], ['Microbiology', 'microbiology', 'bacterial culture'], ['Molecular Biology', 'molecular biology'], ['Biochemistry', 'biochemistry'],
  ['Genetics', 'genetics'], ['Bioinformatics', 'bioinformatics', 'computational biology'], ['Genomics', 'genomics', 'transcriptomics', 'proteomics'], ['Animal Handling', 'animal handling', 'rodent handling', 'in vivo studies'],
  ['Lab Safety', 'lab safety', 'biosafety', 'bsl-2', 'osha'], ['GLP', 'glp', 'good laboratory practice'], ['GMP', 'gmp', 'cgmp', 'good manufacturing practice'], ['Clinical Research', 'clinical research', 'clinical trials', 'clinical trial'],
  ['GCP (clinical)', 'good clinical practice', 'ich-gcp'], ['Regulatory Affairs', 'regulatory affairs', 'fda regulations', 'regulatory submissions'], ['Quality Control', 'quality control', 'qc testing', 'qc analyst'],
  ['Biostatistics', 'biostatistics'], ['GraphPad Prism', 'graphpad', 'prism software', 'prism'], ['ImageJ', 'imagej', 'fiji'], ['SPSS', 'spss'], ['SAS', 'sas programming', 'sas software', 'base sas'],
  ['ELN / Benchling', 'benchling', 'electronic lab notebook'], ['Scientific Writing', 'scientific writing', 'manuscript preparation', 'technical writing'], ['Literature Review', 'literature review', 'systematic review'],
  ['Grant Writing', 'grant writing', 'grant proposals'], ['Analytical Chemistry', 'analytical chemistry'], ['Organic Chemistry', 'organic chemistry', 'organic synthesis'], ['NMR', 'nmr'], ['Titration', 'titration'],
  ['Environmental Science', 'environmental science', 'environmental sampling', 'field sampling'], ['Ecology', 'ecology', 'field research'],
  // Healthcare
  ['Patient Care', 'patient care', 'direct patient care'], ['Phlebotomy', 'phlebotomy', 'venipuncture'], ['EHR', 'ehr', 'emr', 'electronic health records', 'electronic medical records', 'epic ehr', 'cerner'],
  ['Vital Signs', 'vital signs'], ['BLS / CPR', 'bls', 'cpr', 'basic life support', 'acls'], ['HIPAA', 'hipaa'], ['Medical Terminology', 'medical terminology'], ['Medication Administration', 'medication administration'],
  ['Triage', 'triage'], ['Infection Control', 'infection control', 'infection prevention'], ['Clinical Documentation', 'clinical documentation', 'charting'], ['Care Planning', 'care planning', 'care plans'],
  ['Public Health', 'public health'], ['Epidemiology', 'epidemiology'], ['Health Education', 'health education', 'patient education'], ['Pharmacy', 'pharmacy technician', 'dispensing', 'pharmacology'],
  ['Medical Coding', 'medical coding', 'icd-10', 'cpt coding'], ['Medical Billing', 'medical billing', 'revenue cycle'], ['Mental Health', 'mental health', 'behavioral health', 'counseling'],
  // Business, finance & accounting
  ['Financial Analysis', 'financial analysis', 'financial analyst'], ['Financial Modeling', 'financial modeling', 'financial modelling', 'dcf'], ['Accounting', 'accounting', 'general ledger'], ['GAAP', 'gaap', 'ifrs'],
  ['Bookkeeping', 'bookkeeping'], ['QuickBooks', 'quickbooks'], ['Budgeting & Forecasting', 'budgeting', 'forecasting', 'fp&a'], ['Accounts Payable', 'accounts payable'], ['Accounts Receivable', 'accounts receivable'],
  ['Auditing', 'auditing', 'internal audit', 'external audit'], ['Tax Preparation', 'tax preparation', 'tax returns'], ['Valuation', 'valuation'], ['SAP', 'sap erp', 'sap s/4hana', 'sap fico'], ['Salesforce', 'salesforce'],
  ['CRM', 'crm'], ['Risk Management', 'risk management', 'risk assessment'], ['Compliance', 'compliance', 'kyc', 'anti-money laundering', 'aml'], ['Investment Analysis', 'investment analysis', 'equity research', 'portfolio management'],
  ['Payroll', 'payroll'], ['Business Analysis', 'business analysis', 'business analyst', 'requirements gathering'], ['Strategy', 'strategic planning', 'business strategy'],
  // Marketing, sales & communications
  ['Digital Marketing', 'digital marketing'], ['SEO', 'seo', 'search engine optimization'], ['Google Ads', 'google ads', 'ppc', 'search engine marketing', 'paid search'], ['Social Media Marketing', 'social media marketing', 'social media management'],
  ['Content Writing', 'content writing', 'copywriting', 'content marketing'], ['Email Marketing', 'email marketing', 'mailchimp', 'klaviyo'], ['Google Analytics', 'google analytics', 'ga4'], ['Market Research', 'market research'],
  ['Brand Management', 'brand management', 'branding'], ['Public Relations', 'public relations', 'media relations'], ['B2B Sales', 'b2b sales', 'inside sales', 'cold calling', 'business development'], ['Lead Generation', 'lead generation'],
  ['Account Management', 'account management'], ['Customer Service', 'customer service', 'customer support', 'client relations'], ['HubSpot', 'hubspot'], ['Canva', 'canva'],
  ['Adobe Creative Suite', 'adobe creative suite', 'adobe creative cloud', 'photoshop', 'illustrator', 'indesign'], ['Video Editing', 'video editing', 'premiere pro', 'final cut', 'after effects'], ['Public Speaking', 'public speaking', 'presentations'],
  // Operations, retail & supply chain
  ['Supply Chain', 'supply chain'], ['Logistics', 'logistics'], ['Inventory Management', 'inventory management', 'inventory control', 'stock management'], ['Procurement', 'procurement', 'purchasing'],
  ['Lean Six Sigma', 'lean six sigma', 'six sigma', 'lean manufacturing', 'kaizen'], ['Operations Management', 'operations management'], ['Vendor Management', 'vendor management', 'supplier management'], ['Data Entry', 'data entry'],
  ['Microsoft Office', 'microsoft office', 'ms office', 'microsoft word', 'powerpoint', 'microsoft 365'], ['Point of Sale', 'point of sale', 'pos system'], ['Retail', 'retail'], ['Merchandising', 'merchandising', 'visual merchandising'], ['Cash Handling', 'cash handling'],
  // People & education
  ['Recruiting', 'recruiting', 'talent acquisition'], ['Employee Relations', 'employee relations'], ['Onboarding', 'employee onboarding'], ['Benefits Administration', 'benefits administration'],
  ['Lesson Planning', 'lesson planning', 'lesson plans'], ['Classroom Management', 'classroom management'], ['Curriculum Development', 'curriculum development', 'curriculum design'], ['Tutoring', 'tutoring', 'tutor'],
  ['Special Education', 'special education', 'iep'], ['Instructional Design', 'instructional design', 'e-learning', 'articulate storyline'],
  // Engineering (mechanical, electrical, industrial)
  ['SolidWorks', 'solidworks'], ['CAD', 'cad', 'computer-aided design'], ['Simulink', 'simulink'], ['ANSYS', 'ansys'], ['FEA', 'fea', 'finite element'], ['PLC Programming', 'plc programming', 'ladder logic'],
  ['Circuit Design', 'circuit design', 'circuit analysis'], ['PCB Design', 'pcb design', 'altium'], ['GD&T', 'gd&t'], ['Manufacturing', 'manufacturing processes', 'cnc'], ['Thermodynamics', 'thermodynamics', 'heat transfer'],
  ['Structural Analysis', 'structural analysis', 'structural design'], ['Surveying', 'surveying', 'land surveying'], ['Construction Management', 'construction management', 'site supervision'], ['Cost Estimating', 'cost estimating', 'quantity takeoff'], ['Primavera P6', 'primavera', 'p6 scheduling'],
  // Legal & design
  ['Legal Research', 'legal research'], ['Contract Review', 'contract review', 'contract drafting', 'contract management'], ['Westlaw / LexisNexis', 'westlaw', 'lexisnexis'], ['Paralegal', 'paralegal', 'litigation support'],
  ['UI Design', 'ui design', 'visual design'], ['Wireframing', 'wireframing', 'wireframes', 'prototyping'], ['User Research', 'user research', 'usability testing'],
  ['Spanish', 'spanish', 'bilingual'],
  // Civil / engineering (for members with an engineering background)
  ['AutoCAD', 'autocad'], ['Revit', 'revit'], ['BIM', 'bim', 'building information modeling'], ['GIS', 'gis', 'arcgis', 'qgis'],
  ['Civil 3D', 'civil 3d'], ['STAAD', 'staad', 'staad.pro'], ['SAP2000', 'sap2000'], ['Project Management', 'project management', 'pmp'],
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MATCHERS = SKILLS.map(([name, ...aliases]) => {
  const parts = [name.toLowerCase(), ...aliases].map((a) => escape(a.toLowerCase()));
  // Custom word boundary that works with symbols like C#, C++, .NET, Node.js
  return { name, re: new RegExp(`(^|[^a-z0-9+#.])(?:${parts.join('|')})(?=$|[^a-z0-9+#])`, 'i') };
});
// Very short / ambiguous aliases need extra context to avoid false positives.
const AMBIGUOUS = new Set(['Go', 'R', 'C', 'Swift', 'Spring', 'Express', 'Rust', 'Ruby', 'QA', 'ML', 'Security', 'Excel', 'Communication']);

function extractSkills(text) {
  if (!text) return [];
  const t = ` ${String(text).toLowerCase().replace(/\s+/g, ' ')} `;
  const found = [];
  for (const m of MATCHERS) {
    if (!m.re.test(t)) continue;
    if (AMBIGUOUS.has(m.name)) {
      // Require the canonical name or a clearly technical alias for ambiguous ones.
      if (m.name === 'Go' && !/\bgolang\b|\bgo (developer|engineer|programming|language)\b|\bin go\b/.test(t)) continue;
      if (m.name === 'R' && !/\br (language|programming|studio)\b|\brstudio\b|\bin r\b|, r,|\br\/python|python\/r\b|\band r(?![&\w])|\bor r(?![&\w])/.test(t)) continue;
      if (m.name === 'C' && !/\bc language\b|\bc\/c\+\+|\bc, c\+\+/.test(t)) continue;
      if (m.name === 'Swift' && !/\bswift(ui)?\b.*\b(ios|apple|xcode)\b|\b(ios|apple|xcode)\b.*\bswift\b/.test(t)) continue;
    }
    found.push(m.name);
  }
  return found;
}

/** Normalise a free-text skills list ("React, node js; SQL") into canonical names + unknown extras. */
function normaliseSkills(input) {
  const raw = Array.isArray(input) ? input : String(input || '').split(/[,;\n|]/);
  const out = new Set();
  for (const item of raw) {
    const s = String(item).trim();
    if (!s) continue;
    const hits = extractSkills(s);
    if (hits.length) hits.forEach((h) => out.add(h));
    else if (s.length <= 40) out.add(s.replace(/\b\w/g, (c) => c.toUpperCase()));
  }
  return [...out];
}

const tokens = (s) => String(s || '').toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 2 && !['and', 'the', 'for', 'with', 'senior', 'junior', 'lead', 'staff', 'principal', 'remote'].includes(w));

/**
 * Score how well a member fits a job (0–100).
 * 75% skills overlap (of the job's skills, how many the member has), 25% title vs target roles.
 */
function matchJob(job, profile) {
  const jobSkills = Array.isArray(job.skills) ? job.skills : [];
  // Skills implied by the member's target role count too (a "QA Engineer" has QA).
  const implied = extractSkills((profile.target_roles || []).join(' , '));
  const mine = new Set([...(profile.skills || []), ...implied].map((s) => s.toLowerCase()));
  const have = jobSkills.filter((s) => mine.has(s.toLowerCase()));
  const missing = jobSkills.filter((s) => !mine.has(s.toLowerCase()));

  const skillScore = jobSkills.length ? have.length / Math.min(jobSkills.length, 10) : 0;
  const titleWords = new Set(tokens(job.title));
  let roleScore = 0;
  for (const role of profile.target_roles || []) {
    const rw = tokens(role);
    if (!rw.length) continue;
    const overlap = rw.filter((w) => titleWords.has(w)).length / rw.length;
    roleScore = Math.max(roleScore, overlap);
  }
  const hasProfile = mine.size > 0 || (profile.target_roles || []).length > 0;
  const score = hasProfile ? Math.round(Math.min(1, skillScore) * 75 + roleScore * 25) : null;
  return { score, have, missing };
}

const KNOWN = new Set(SKILLS.map((x) => x[0].toLowerCase()));

/** Member skills the dictionary doesn't know (e.g. a niche lab method) — matched against job text directly. */
function customSkills(skills) {
  return (skills || []).filter((x) => x && x.length >= 3 && x.length <= 40 && !KNOWN.has(x.toLowerCase())).slice(0, 10);
}

/** Does this text mention the skill as a whole word? */
function mentions(text, skill) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const k = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${k}(?=$|[^a-z0-9+#])`).test(t);
}

module.exports = { extractSkills, normaliseSkills, matchJob, customSkills, mentions, SKILL_NAMES: SKILLS.map((x) => x[0]) };
