// ZIP file writer (STORE method), no client/runtime dependencies; archive downloads capped by API.
function crc32(buf) {
  let c = 0xffffffff;
  for(const b of buf) {c ^= b;for(let i=0;i<8;i++)c=(c>>>1) ^ (c&1?0xedb88320:0);}
  return (c ^ 0xffffffff)>>>0;
}
export function createZip(entries) {
  const files=[],central=[];let offset=0;
  for(const {name,data} of entries) {
    const n=Buffer.from(name,'utf8'),b=Buffer.from(data),crc=crc32(b),local=Buffer.alloc(30),idx=Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt32LE(crc,14);local.writeUInt32LE(b.length,18);local.writeUInt32LE(b.length,22);local.writeUInt16LE(n.length,26);
    files.push(local,n,b);
    idx.writeUInt32LE(0x02014b50,0);idx.writeUInt16LE(20,4);idx.writeUInt16LE(20,6);idx.writeUInt16LE(0x800,8);idx.writeUInt32LE(crc,16);idx.writeUInt32LE(b.length,20);idx.writeUInt32LE(b.length,24);idx.writeUInt16LE(n.length,28);idx.writeUInt32LE(offset,42);
    central.push(idx,n);offset+=local.length+n.length+b.length;
  }
  const centralSize=central.reduce((n,b)=>n+b.length,0),end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(centralSize,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...files,...central,end]);
}
