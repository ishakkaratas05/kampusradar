import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenSans has excellent Turkish support
const fontUrl = 'https://cdn.jsdelivr.net/gh/googlefonts/opensans@main/fonts/ttf/OpenSans-Regular.ttf';
const destPath = path.join(__dirname, '../src/lib/OpenSans-Regular-normal.js');

https.get(fontUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to get font: ${response.statusCode}`);
    return;
  }
  const chunks = [];
  response.on('data', (chunk) => {
    chunks.push(chunk);
  });
  response.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString('base64');
    
    const fileContent = `
import { jsPDF } from "jspdf";

export function addOpenSansFont() {
  const font = "${base64}";
  
  if (!jsPDF.API.events) {
      jsPDF.API.events = [];
  }
  jsPDF.API.events.push(['addFonts', function() {
    this.addFileToVFS('OpenSans-Regular.ttf', font);
    this.addFont('OpenSans-Regular.ttf', 'OpenSans', 'normal');
  }]);
}
`;
    
    const libDir = path.dirname(destPath);
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }

    fs.writeFileSync(destPath, fileContent);
    console.log('Font successfully converted and saved to ' + destPath);
  });
}).on('error', (err) => {
  console.error('Error downloading font:', err);
});
