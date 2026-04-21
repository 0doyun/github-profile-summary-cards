// Local demo renderer. Usage:
//   GITHUB_TOKEN=$(gh auth token) node render-demo.js [username] [theme] [utcOffset]
const fs = require('fs');
const path = require('path');
const {getCombinedSVGWithThemeName} = require('./lib/cards/combined-card');

const username = process.argv[2] || '0doyun';
const theme = process.argv[3] || 'github_dark';
const utcOffset = Number(process.argv[4] || 9);

if (!process.env.GITHUB_TOKEN) {
    console.error('Set GITHUB_TOKEN env var. e.g. GITHUB_TOKEN=$(gh auth token) node render-demo.js');
    process.exit(1);
}

(async () => {
    const svg = await getCombinedSVGWithThemeName(username, theme, utcOffset, process.env.GITHUB_TOKEN);
    const outPath = path.join(__dirname, 'demo-out.svg');
    fs.writeFileSync(outPath, svg);
    console.log(`wrote ${outPath} (${svg.length} bytes)`);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
