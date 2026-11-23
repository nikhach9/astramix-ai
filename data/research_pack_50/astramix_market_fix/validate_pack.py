"""Validate this supplied data/lookup reference, not the absent application."""
import datetime
import hashlib
import json
from pathlib import Path

from location_lookup import suggest

ROOT = Path(__file__).resolve().parent
checks = []


def check(name, assertion):
    if not assertion:
        raise AssertionError(name)
    checks.append({'name': name, 'passed': True})


index = json.loads((ROOT / 'locations/index.json').read_text(encoding='utf-8'))
manifest = json.loads((ROOT / 'country_discovery_manifest.json').read_text(encoding='utf-8'))
data = json.loads((ROOT / 'cameroon_market_supplement.json').read_text(encoding='utf-8'))
sources = json.loads((ROOT / 'research_sources.json').read_text(encoding='utf-8'))
country_codes = {r['country_code'] for r in index['countries']}
check('Same 100 countries in manifest and location index', len(country_codes) == 100 and
      country_codes == {r['country_code'] for r in manifest['countries']})

all_ids = set()
location_count = 0
for country in index['countries']:
    cc = country['country_code']
    rows = json.loads((ROOT / 'locations' / country['file']).read_text(encoding='utf-8'))
    check(cc + ': nonempty locations, matching country and valid coordinates',
          len(rows) == country['location_count'] > 0 and all(
              r['country_code'] == cc and -90 <= r['latitude'] <= 90 and
              -180 <= r['longitude'] <= 180 and r['coordinate_kind'] == 'city_or_town_reference_point'
              for r in rows))
    ids = {r['id'] for r in rows}
    check(cc + ': globally unique place IDs', len(ids) == len(rows) and not ids.intersection(all_ids))
    all_ids.update(ids)
    location_count += len(rows)
    result = suggest(cc, rows[0]['name'], limit=5)
    check(cc + ': actual largest-place query returns country-scoped results',
          result and all(r['country_code'] == cc for r in result) and
          rows[0]['id'] in {r['id'] for r in result})
check('Total location count matches metadata', location_count == index['total_locations'] == 62964)

for cc, q, gid in [('CM','Douala',2232593), ('CM','Yaounde',2220957),
                   ('CM','Yaoundé',2220957), ('AM','Yerevan',616052),
                   ('AM','Երևան',616052), ('US','New York',5128581),
                   ('CA','Toronto',6167865)]:
    result = suggest(cc, q)
    check(cc + ': query ' + q, result and result[0]['geoname_id'] == gid)
check('Native-script query remains isolated to selected country',
      all(r['country_code'] == 'CM' for r in suggest('CM', 'Երևան')))
check('Blank query offers bounded country locations', len(suggest('CM', '', limit=6)) == 6)
check('Punctuation-only query does not return arbitrary places', suggest('CM', '!!!') == [])
for cc, q, limit in [('../CM','Douala',8), ('CMR','Douala',8), ('ZZ','Town',8),
                      ('CM','a',0), ('CM','a',21), ('CM','a',True), ('CM',None,8),
                      ('CM','x'*121,8)]:
    try:
        suggest(cc, q, limit=limit)
    except ValueError:
        check('Reject invalid lookup input ' + repr((cc, q, limit))[:75], True)
    else:
        raise AssertionError('Invalid lookup input was accepted')

records = data['records']
prices = data['price_observations']
catalog = data['catalog_observations']
source_ids = {s['source_id'] for s in sources}
record_ids = {r['record_id'] for r in records}
check('Forty unique supplier/contact records, 33 directory branches',
      len(record_ids) == len(records) == 40 and
      sum(r['record_type'] == 'retail_directory_branch' for r in records) == 33)
check('All supplier records have resolvable sources and Cameroon country',
      all(r['source_ids'] and set(r['source_ids']) <= source_ids and r['country_code'] == 'CM' for r in records))
check('No invented coordinates, price eligibility, stock confirmations or reviews',
      all(r['latitude'] is None and r['longitude'] is None and
          r['stock_status'] == 'unknown' and r['stock_confirmed_at'] is None and
          r['customer_rating'] is None and r['review_count'] is None and
          not r['eligible_for_nearest'] and not r['eligible_for_cheapest'] for r in records))
check('Numeric prices retain units, city/quantity evidence and unknown delivered costs',
      len(prices) == 7 and all(p['amount'] > 0 and p['unit'] == '50_kg_bag' and
          p['currency'] == 'XAF' and p['source_id'] in source_ids and
          p['supplier_record_id'] in record_ids and p['tax_included'] is None and
          p['delivery_fee'] is None and p['valid_until'] is None and
          p['stock_status'] == 'unknown' and not p['eligible_for_cheapest_delivered']
          for p in prices))
for grade in ['32.5R','42.5']:
    rows = [p for p in prices if p['brand'] == 'Mira-Co' and p['cement_designation'].endswith(grade)]
    check('Mira ' + grade + ': distinct compatible retail/bulk quantity tiers',
          len(rows) == 2 and rows[0]['maximum_quantity_bags'] == 599 and
          rows[1]['minimum_quantity_bags'] == 600 and rows[1]['amount'] < rows[0]['amount'])
check('Dangote offers retain two distinct marketplace sellers',
      len({p['supplier_record_id'] for p in prices if p['brand'] == 'Dangote'}) == 2)
check('Backorder/unpriced catalog observations never receive an invented price',
      len(catalog) == 7 and all(p['price'] is None and p['confirmed_quantity'] is None and
          p['stock_claim_as_published'] in ('available_on_order','backorder') and
          p['source_id'] in source_ids for p in catalog))
check('No Miami/Dade County template entry imported',
      not any('dade county' in json.dumps(r).lower() or 'miami' in json.dumps(r).lower() for r in records))

from validate_global_data import validate_global
validate_global(ROOT, check)

files = [p for p in ROOT.rglob('*') if p.is_file() and
         'build_sources' not in p.parts and '__pycache__' not in p.parts and
         p.name != 'validation_report.json']
report = {'validated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'scope': '50-market data, source/relationship integrity and offline locality lookup; not the application',
          'passed': True, 'check_count': len(checks), 'checks': checks,
          'not_tested': ['actual website, frontend and backend', 'database import idempotency',
                         'live supplier inventory or order pricing', 'live providers, reviews, map rendering or additional branch geocoding',
                         'prediction/optimization models or public deployment'],
          'files_sha256': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in sorted(files)}}
(ROOT / 'validation_report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
global_data = json.loads((ROOT / 'global_market_50.json').read_text(encoding='utf-8'))
print(json.dumps({'passed': True, 'checks': len(checks), 'locations': location_count,
                  'countries': len(country_codes), 'cameroon_records': len(records),
                  'cameroon_retail_directory_branches': 33, 'cameroon_price_observations': len(prices),
                  'global_branch_contact_locations': len(global_data['branches']),
                  'global_price_observations': len(global_data['price_observations']),
                  'refreshed_market_countries': 50,
                  'combined_price_observations': len(global_data['price_observations']) + len(prices)}, indent=2))
