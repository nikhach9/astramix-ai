"""Offline, country-scoped location suggestions. Python standard library only.

Integration reference, not an installed application endpoint. Keep GeoNames
attribution in the application's credits. City coordinates are not store pins.
"""
import argparse
import functools
import json
from pathlib import Path
import unicodedata

DATA = Path(__file__).resolve().parent / 'locations'


def normalize(value):
    value = unicodedata.normalize('NFKD', str(value)).casefold()
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in value
                            if not unicodedata.combining(c)).split())


@functools.lru_cache(maxsize=32)
def _load(country_code, data_dir):
    root = Path(data_dir)
    index = json.loads((root / 'index.json').read_text(encoding='utf-8'))
    supported = {c['country_code'] for c in index['countries']}
    if country_code not in supported:
        raise ValueError('Unsupported country code')
    records = json.loads((root / (country_code + '.json')).read_text(encoding='utf-8'))
    return tuple((r, tuple(dict.fromkeys(normalize(n) for n in
                 [r['name'], r['ascii_name'], *r['aliases']] if n))) for r in records)


def suggest(country_code, query='', limit=8, data_dir=None):
    """Return bounded suggestions from one supported ISO alpha-2 country.

    Blank query returns populous places. Prefix/word matches outrank substring
    matches; population breaks ties. Native-script aliases remain searchable.
    Invalid countries/limits raise ValueError for a router to turn into HTTP 400.
    """
    cc = str(country_code).upper().strip()
    if len(cc) != 2 or not cc.isascii() or not cc.isalpha():
        raise ValueError('Expected an ISO alpha-2 country code')
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 20:
        raise ValueError('Limit must be an integer between 1 and 20')
    if not isinstance(query, str) or len(query) > 120:
        raise ValueError('Query must be a string of at most 120 characters')
    q = normalize(query)
    if query.strip() and not q:
        return []
    rows = _load(cc, str(Path(data_dir or DATA).resolve()))
    ranked = []
    for record, names in rows:
        if not q:
            rank = 4
        elif q in names:
            rank = 0
        elif any(n.startswith(q) for n in names):
            rank = 1
        elif any((' ' + q) in (' ' + n) for n in names):
            rank = 2
        elif len(q) >= 3 and any(q in n for n in names):
            rank = 3
        else:
            continue
        ranked.append((rank, -record['population'], record['geoname_id'], record))
    ranked.sort(key=lambda x: x[:3])
    result = []
    for _, _, _, record in ranked[:limit]:
        label = ', '.join(filter(None, (record['name'], record['admin1_name'], cc)))
        result.append({k: record[k] for k in
                       ['id', 'geoname_id', 'name', 'country_code', 'admin1_code',
                        'admin1_name', 'latitude', 'longitude', 'coordinate_kind', 'timezone']}
                      | {'label': label, 'source': 'GeoNames',
                         'attribution': 'GeoNames, CC BY 4.0'})
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('country_code')
    parser.add_argument('query', nargs='?', default='')
    parser.add_argument('--limit', type=int, default=8)
    args = parser.parse_args()
    print(json.dumps({'suggestions': suggest(args.country_code, args.query, args.limit)},
                     ensure_ascii=False, indent=2))
