// Small uncompressed ZIP writer: fixed customer-facing relative names only.
export function customerArchive(files: {
    name: string;
    base64: string;
}[]): Uint8Array {
    const enc = new TextEncoder(), local: Uint8Array[] = [], central: Uint8Array[] = [];
    let offset = 0;
    const crc = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) {
        c ^= x;
        for (let n = 0; n < 8; n++)
            c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    } return (c ^ 0xffffffff) >>> 0; };
    for (const f of files) {
        if (!/^(?:post-[123]\/(?:beitrag\.md|bild\.png|bildhinweis\.txt)|marketing-aktivitaeten\.md)$/.test(f.name) || f.name.includes('..') || f.name.startsWith('/'))
            throw Error('Ungültiger Exportname');
        const name = enc.encode(f.name), data = Uint8Array.from(atob(f.base64), c => c.charCodeAt(0));
        const h = new Uint8Array(30 + name.length), v = new DataView(h.buffer);
        v.setUint32(0, 0x04034b50, true);
        v.setUint16(4, 20, true);
        v.setUint16(6, 0x0800, true);
        v.setUint16(12,0x21,true);
        v.setUint32(14, crc(data), true);
        v.setUint32(18, data.length, true);
        v.setUint32(22, data.length, true);
        v.setUint16(26, name.length, true);
        h.set(name, 30);
        local.push(h, data);
        const c = new Uint8Array(46 + name.length), w = new DataView(c.buffer);
        w.setUint32(0, 0x02014b50, true);
        w.setUint16(4, 20, true);
        w.setUint16(6, 20, true);
        w.setUint16(8, 0x0800, true);
        w.setUint16(14,0x21,true);
        w.setUint32(16, crc(data), true);
        w.setUint32(20, data.length, true);
        w.setUint32(24, data.length, true);
        w.setUint16(28, name.length, true);
        w.setUint32(42, offset, true);
        c.set(name, 46);
        central.push(c);
        offset += h.length + data.length;
    }
    const end = new Uint8Array(22), v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, files.length, true);
    v.setUint16(10, files.length, true);
    v.setUint32(12, central.reduce((n, c) => n + c.length, 0), true);
    v.setUint32(16, offset, true);
    const parts = [...local, ...central, end], out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let n = 0;
    for (const p of parts) {
        out.set(p, n);
        n += p.length;
    }
    return out;
}
