// Checks that every link in the resource library still opens.
// Run from the backend folder:  npm run check-resources
const { LIBRARY } = require('../lib/resourceLibrary');
const { urlWorks } = require('../lib/resources');

(async () => {
  let bad = 0;
  for (let i = 0; i < LIBRARY.length; i += 8) {
    const batch = LIBRARY.slice(i, i + 8);
    const ok = await Promise.all(batch.map((r) => urlWorks(r.url)));
    batch.forEach((r, k) => {
      if (!ok[k]) { bad++; console.log(`✗ ${r.id}  ${r.url}`); }
    });
  }
  console.log(bad ? `\n${bad} of ${LIBRARY.length} links need attention (some sites block automated checks — open them to confirm).` : `All ${LIBRARY.length} links work.`);
})();
