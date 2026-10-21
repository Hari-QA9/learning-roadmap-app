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
      if (m.name === 'R' && !/\br (language|programming|studio)\b|\brstudio\b|\bin r\b|, r,|\br\/python|python\/r\b/.test(t)) continue;
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

module.exports = { extractSkills, normaliseSkills, matchJob, SKILL_NAMES: SKILLS.map((s) => s[0]) };
