const encoder = new TextEncoder()

function checksum(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function littleEndian(size, write) {
  const buffer = new ArrayBuffer(size)
  const view = new DataView(buffer)
  write(view)
  return new Uint8Array(buffer)
}

function zipTime(date) {
  return { time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2), day: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() }
}

export function createZip(files) {
  const localParts = [], centralParts = []
  let offset = 0
  const stamp = zipTime(new Date())
  files.forEach(({ name, content }) => {
    const filename = encoder.encode(name)
    const data = encoder.encode(content)
    const crc = checksum(data)
    const localHeader = littleEndian(30, (view) => {
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true)
      view.setUint16(8, 0, true); view.setUint16(10, stamp.time, true); view.setUint16(12, stamp.day, true)
      view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true)
      view.setUint16(26, filename.length, true); view.setUint16(28, 0, true)
    })
    localParts.push(localHeader, filename, data)
    const centralHeader = littleEndian(46, (view) => {
      view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true); view.setUint16(6, 20, true)
      view.setUint16(8, 0x0800, true); view.setUint16(10, 0, true); view.setUint16(12, stamp.time, true); view.setUint16(14, stamp.day, true)
      view.setUint32(16, crc, true); view.setUint32(20, data.length, true); view.setUint32(24, data.length, true)
      view.setUint16(28, filename.length, true); view.setUint16(30, 0, true); view.setUint16(32, 0, true)
      view.setUint16(34, 0, true); view.setUint16(36, 0, true); view.setUint32(38, 0, true); view.setUint32(42, offset, true)
    })
    centralParts.push(centralHeader, filename)
    offset += localHeader.length + filename.length + data.length
  })
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const endRecord = littleEndian(22, (view) => {
    view.setUint32(0, 0x06054b50, true); view.setUint16(4, 0, true); view.setUint16(6, 0, true)
    view.setUint16(8, files.length, true); view.setUint16(10, files.length, true)
    view.setUint32(12, centralSize, true); view.setUint32(16, offset, true); view.setUint16(20, 0, true)
  })
  return new Blob([...localParts, ...centralParts, endRecord], { type: 'application/zip' })
}
