/** Synthetic text-only PDF builder for offline parser/HTTP/browser tests. No customer documents. */
export function syntheticPdf(pages: string[][], active = false, encrypted = false, imageOnly = false, attachment = false): Buffer {
  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  add(`<< /Type /Catalog /Pages 2 0 R ${active ? '/OpenAction << /S /JavaScript /JS (throw new Error\\(not-executed\\)) >>' : ''} >>`);
  add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const kids: number[] = [];
  for (const lines of pages) {
    const image = imageOnly ? add('<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 6 /Filter /ASCIIHexDecode >>\nstream\n162D2C\nendstream') : null;
    const commands = image ? 'q 500 0 0 700 40 40 cm /Im1 Do Q' : 'BT /F1 12 Tf 40 780 Td ' + lines.map((line,i)=>`${i?'0 -18 Td ':''}(${line.replace(/[\\()]/g,'\\$&')}) Tj`).join('\n') + ' ET';
    const content = add(`<< /Length ${Buffer.byteLength(commands,'latin1')} >>\nstream\n${commands}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> ${image?`/XObject << /Im1 ${image} 0 R >>`:''} >> /Contents ${content} 0 R >>`));
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.map(id=>id+' 0 R').join(' ')}] /Count ${kids.length} >>`;
  if (attachment) {
    const content=add('<< /Type /EmbeddedFile /Length 4 >>\nstream\nDATA\nendstream');
    const spec=add(`<< /Type /Filespec /F (synthetic.txt) /EF << /F ${content} 0 R >> >>`);
    objects[0]=objects[0].slice(0,-2)+` /Names << /EmbeddedFiles << /Names [(synthetic.txt) ${spec} 0 R] >> >> >>`;
  }
  const encrypt = encrypted ? add(`<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${'00'.repeat(32)}> /U <${'00'.repeat(32)}> /P -4 >>`) : null;
  let text = '%PDF-1.7\n'; const offsets = [0];
  objects.forEach((value,i)=>{offsets.push(Buffer.byteLength(text,'latin1'));text+=`${i+1} 0 obj\n${value}\nendobj\n`;});
  const start = Buffer.byteLength(text,'latin1');
  text+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
  text+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R ${encrypt?`/Encrypt ${encrypt} 0 R /ID [<12345678><12345678>]`:''} >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(text,'latin1');
}
export const businessPages = [
  ['Fiktives Unternehmen: Glanz Büroservice.', 'Büroreinigung für Unternehmen in Düsseldorf.', 'Regelmäßige Unterhaltsreinigung für Büroräume.'],
  ['Ein persönliches Erstgespräch kann angefragt werden.', 'Geplant: eine neue Leistung, noch nicht verfügbar.', 'Preis laut Dokument: 79 EUR, Aktualität bitte prüfen.'],
];
