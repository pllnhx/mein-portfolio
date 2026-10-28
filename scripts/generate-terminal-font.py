"""Generate the portfolio's original, self-hosted digital display font.

Uses only Python's standard library. Glyphs are angular 5x7 pixels; zero uses
beveled display segments, inspired by a seven-segment terminal readout.
Run from any directory with: python3 scripts/generate-terminal-font.py
"""
from pathlib import Path
from struct import pack, unpack

GLYPHS = {
    'A': '01110/10001/10001/11111/10001/10001/10001',
    'B': '11110/10001/10001/11110/10001/10001/11110',
    'C': '01111/10000/10000/10000/10000/10000/01111',
    'D': '11110/10001/10001/10001/10001/10001/11110',
    'E': '11111/10000/10000/11110/10000/10000/11111',
    'F': '11111/10000/10000/11110/10000/10000/10000',
    'G': '01111/10000/10000/10111/10001/10001/01110',
    'H': '10001/10001/10001/11111/10001/10001/10001',
    'I': '11111/00100/00100/00100/00100/00100/11111',
    'J': '00111/00010/00010/00010/10010/10010/01100',
    'K': '10001/10010/10100/11000/10100/10010/10001',
    'L': '10000/10000/10000/10000/10000/10000/11111',
    'M': '10001/11011/10101/10101/10001/10001/10001',
    'N': '10001/11001/11001/10101/10011/10011/10001',
    'O': '01110/10001/10001/10001/10001/10001/01110',
    'P': '11110/10001/10001/11110/10000/10000/10000',
    'Q': '01110/10001/10001/10001/10101/10010/01101',
    'R': '11110/10001/10001/11110/10100/10010/10001',
    'S': '01111/10000/10000/01110/00001/00001/11110',
    'T': '11111/00100/00100/00100/00100/00100/00100',
    'U': '10001/10001/10001/10001/10001/10001/01110',
    'V': '10001/10001/10001/10001/10001/01010/00100',
    'W': '10001/10001/10001/10101/10101/10101/01010',
    'X': '10001/10001/01010/00100/01010/10001/10001',
    'Y': '10001/10001/01010/00100/00100/00100/00100',
    'Z': '11111/00001/00010/00100/01000/10000/11111',
    '1': '00100/01100/00100/00100/00100/00100/01110',
    '2': '01110/10001/00001/00010/00100/01000/11111',
    '3': '11110/00001/00001/01110/00001/00001/11110',
    '4': '00010/00110/01010/10010/11111/00010/00010',
    '5': '11111/10000/10000/11110/00001/00001/11110',
    '6': '01110/10000/10000/11110/10001/10001/01110',
    '7': '11111/00001/00010/00100/01000/01000/01000',
    '8': '01110/10001/10001/01110/10001/10001/01110',
    '9': '01110/10001/10001/01111/00001/00001/01110',
    '/': '00001/00001/00010/00100/01000/10000/10000',
    '<': '00010/00100/01000/10000/01000/00100/00010',
    '>': '01000/00100/00010/00001/00010/00100/01000',
    '_': '00000/00000/00000/00000/00000/00000/11111',
    ':': '00000/00100/00100/00000/00100/00100/00000',
    '.': '00000/00000/00000/00000/00000/00100/00100',
    ',': '00000/00000/00000/00000/00100/00100/01000',
    ')': '01000/00100/00010/00010/00010/00100/01000',
    '(': '00010/00100/01000/01000/01000/00100/00010',
    '-': '00000/00000/00000/11111/00000/00000/00000',
    '!': '00100/00100/00100/00100/00100/00000/00100',
    '?': '01110/10001/00001/00010/00100/00000/00100',
}


def glyph(character):
    contours = []
    if character == '0':
        # Six beveled bars leave a dark center, like a digital display.
        top = [(110, 810), (150, 850), (490, 850), (530, 810), (490, 770), (150, 770)]
        bottom = [(x, 950 - y) for x, y in reversed(top)]
        left = [(70, 230), (110, 190), (150, 230), (150, 720), (110, 760), (70, 720)]
        right = [(640 - x, y) for x, y in reversed(left)]
        contours = [top, bottom, left, right]
    else:
        matrix = GLYPHS.get(character.upper(), GLYPHS.get('?')) if character != ' ' else None
        if matrix:
            for row, line in enumerate(matrix.split('/')):
                for column, pixel in enumerate(line):
                    if pixel == '1':
                        x, y = 40 + column * 112, 150 + (6 - row) * 100
                        contours.append([(x, y), (x, y + 86), (x + 98, y + 86), (x + 98, y)])
    if not contours:
        return b''
    points = [point for contour in contours for point in contour]
    xs, ys = zip(*points)
    result = pack('>hhhhh', len(contours), min(xs), min(ys), max(xs), max(ys))
    end, ends = -1, []
    for contour in contours:
        end += len(contour)
        ends.append(end)
    result += pack('>' + 'H' * len(ends), *ends) + pack('>H', 0)
    result += bytes([1] * len(points))  # on-curve points, signed coordinate deltas
    for axis in (0, 1):
        previous = 0
        for point in points:
            result += pack('>h', point[axis] - previous)
            previous = point[axis]
    return result + bytes((-len(result)) % 4)


def checksum(data):
    padded = data + bytes((-len(data)) % 4)
    return sum(unpack('>' + 'I' * (len(padded) // 4), padded)) & 0xFFFFFFFF


def build_font():
    glyphs = [b''] + [glyph(chr(code)) for code in range(32, 127)]
    offsets, total = [], 0
    for data in glyphs:
        offsets.append(total)
        total += len(data)
    offsets.append(total)
    count = len(glyphs)
    names = {1: 'Terminal Segments', 2: 'Regular', 3: 'Pascal:TerminalSegments:1', 4: 'Terminal Segments Regular', 6: 'TerminalSegments-Regular'}
    records, strings = b'', b''
    for name_id, value in names.items():
        encoded = value.encode('utf-16-be')
        records += pack('>6H', 3, 1, 0x409, name_id, len(encoded), len(strings))
        strings += encoded
    cmap = pack('>7H', 4, 32, 0, 4, 4, 1, 0)
    cmap += pack('>5H2h2H', 126, 0xFFFF, 0, 32, 0xFFFF, -31, 1, 0, 0)
    tables = {
        'cmap': pack('>HHHHI', 0, 1, 3, 1, 12) + cmap,
        'glyf': b''.join(glyphs),
        'head': pack('>IIIIHHqqhhhhHHhhh', 0x10000, 0x10000, 0, 0x5F0F3CF5, 1, 1000, 0, 0, 0, 0, 640, 850, 0, 8, 2, 1, 0),
        'hhea': pack('>I3hH11hH', 0x10000, 850, -150, 0, 680, 0, 40, 640, 1, 0, 0, 0, 0, 0, 0, 0, count),
        'hmtx': pack('>Hh', 680, 0) * count,
        'loca': pack('>' + 'I' * len(offsets), *offsets),
        'maxp': pack('>I14H', 0x10000, count, 140, 35, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0),
        'name': pack('>3H', 0, len(names), 6 + len(records)) + records + strings,
        'post': pack('>IihhIIIII', 0x30000, 0, -75, 50, 1, 0, 0, 0, 0),
        'OS/2': pack('>HhHHH', 0, 680, 400, 5, 0) + pack('>11h', *([0] * 11)) + bytes(10) + pack('>4I', 1, 0, 0, 0) + b'PASC' + pack('>HHHhhhHH', 64, 32, 126, 850, -150, 0, 850, 150),
    }
    table_count = len(tables)
    entry_selector = table_count.bit_length() - 1
    search_range = (2 ** entry_selector) * 16
    header = pack('>I4H', 0x10000, table_count, search_range, entry_selector, table_count * 16 - search_range)
    directory, body, head_offset = b'', b'', 0
    for tag, data in sorted(tables.items()):
        offset = 12 + 16 * table_count + len(body)
        if tag == 'head':
            head_offset = offset
        directory += pack('>4sIII', tag.encode(), checksum(data), offset, len(data))
        body += data + bytes((-len(data)) % 4)
    font = bytearray(header + directory + body)
    font[head_offset + 8:head_offset + 12] = pack('>I', (0xB1B0AFBA - checksum(font)) & 0xFFFFFFFF)
    assert checksum(font) == 0xB1B0AFBA
    return font


if __name__ == '__main__':
    destination = Path(__file__).resolve().parents[1] / 'public/fonts/terminal-segments.ttf'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(build_font())
    print(f'Generated {destination.name} ({destination.stat().st_size} bytes)')
