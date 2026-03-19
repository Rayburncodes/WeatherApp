import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { Builder } from 'xml2js';
import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';

export type ExportFormat = 'json' | 'csv' | 'xml' | 'pdf' | 'markdown';

function recordsToMarkdown(records: any[]): string {
  const headers = ['id', 'location', 'resolvedCity', 'latitude', 'longitude', 'startDate', 'endDate', 'notes', 'createdAt'];
  const lines: string[] = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const r of records) {
    lines.push(
      `| ${[
        r.id,
        r.location,
        r.resolvedCity,
        r.latitude,
        r.longitude,
        r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : '',
        r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : '',
        (r.notes ?? '').toString().replace(/\|/g, '\\|'),
        new Date(r.createdAt).toISOString(),
      ].join(' | ')} |`,
    );
  }
  return lines.join('\n');
}

export async function exportAll(format: ExportFormat): Promise<{
  filename: string;
  contentType: string;
  body: Buffer;
}> {
  const records = await prisma.weatherRecord.findMany({ orderBy: { createdAt: 'desc' } });

  if (format === 'json') {
    return {
      filename: 'weather-records.json',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(records, null, 2), 'utf8'),
    };
  }

  if (format === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(records);
    return { filename: 'weather-records.csv', contentType: 'text/csv', body: Buffer.from(csv, 'utf8') };
  }

  if (format === 'xml') {
    const builder = new Builder({ rootName: 'weatherRecords', headless: true });
    const xml = builder.buildObject({ record: records });
    return { filename: 'weather-records.xml', contentType: 'application/xml', body: Buffer.from(xml, 'utf8') };
  }

  if (format === 'markdown') {
    const md = recordsToMarkdown(records);
    return { filename: 'weather-records.md', contentType: 'text/markdown', body: Buffer.from(md, 'utf8') };
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

    doc.fontSize(18).text('Weather Records Export', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    for (const r of records) {
      doc.text(`ID: ${r.id}`);
      doc.text(`Location: ${r.location}`);
      doc.text(`Resolved: ${r.resolvedCity} (${r.latitude}, ${r.longitude})`);
      doc.text(`Range: ${r.startDate ? new Date(r.startDate).toISOString().slice(0, 10) : ''} - ${
        r.endDate ? new Date(r.endDate).toISOString().slice(0, 10) : ''
      }`);
      if (r.notes) doc.text(`Notes: ${r.notes}`);
      doc.text(`Created: ${new Date(r.createdAt).toISOString()}`);
      doc.moveDown();
    }
    doc.end();

    const body = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
    return { filename: 'weather-records.pdf', contentType: 'application/pdf', body };
  }

  throw new HttpError(400, 'Unsupported export format.');
}

