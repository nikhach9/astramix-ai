"""Offline integrity/regression checks for the research package, not the user's app."""
import collections
import json
import math
import re
from urllib.parse import urlparse

TARGET=set('AE AM AR AT AU BD BE BR CA CH CI CL CM CN CO CZ DE EG ES FR GB GE GH ID IE IN IT JP KE KR MA MX MY NG NL NZ PE PH PK PL PT RO SA SE SN TR TZ US VN ZA'.split())
RETAIL={'retail_branch','distributor_branch','sales_outlet'}
PLANTS={'ready_mix_plant','cement_plant_contact','precast_concrete_plant','aggregate_plant','dry_mortar_plant','bulk_cement_terminal'}

def validate_global(root,check):
    def read(name):return json.loads((root/name).read_text(encoding='utf-8'))
    def url(u):return isinstance(u,str) and urlparse(u).scheme in ['http','https'] and bool(urlparse(u).hostname)
    d=read('global_market_50.json');source=read('sources_50.json')['sources'];summary=read('coverage_summary.json')
    suppliers=d['suppliers'];branches=d['branches'];prices=d['price_observations'];availability=d['availability_observations']
    ss={s['supplier_id']:s for s in suppliers};bb={b['branch_id']:b for b in branches};src={s['source_id'] for s in source}
    check('Exactly 50 researched country codes including Armenia, US, Canada and Cameroon',set(d['country_codes'])==TARGET and len(d['country_codes'])==50)
    check('Exactly one coverage row for each market',{c['country_code'] for c in d['countries']}==TARGET and len(d['countries'])==50)
    check('Unique source IDs and URLs; all public HTTP URLs',len(src)==len(source)==len({s['url'] for s in source}) and all(url(s['url']) for s in source))
    check('No source claims live inventory or merchant contact',all(not s['live_inventory_connection'] and not s['merchant_contacted'] for s in source))
    check('Staging/demo sites excluded',not any(any(v in s['url'] for v in ['stag.construrama','uat.masdar','uat2.cashbuild','mandray-codex.tech','infradirect-in.lovable','materialz1.com','ai.gorgia.ge']) for s in source))
    check('Supplier and branch IDs unique',len(ss)==len(suppliers) and len(bb)==len(branches))
    check('Supplier references, countries and discovery scope valid',all(s['country_code'] in TARGET and s['source_ids'] and set(s['source_ids'])<=src and url(s['website_or_directory_url']) and s['discovery_scope'] for s in suppliers))
    check('Supplier unknown stock, reviews and delivery preserved',all(s['stock_status']=='unknown' and s['stock_confirmed_at'] is None and s['customer_rating'] is None and s['review_count'] is None and s['delivery_area_confirmed'] is None for s in suppliers))
    for c in d['countries']:
        cc=c['country_code'];sx=[s for s in suppliers if s['country_code']==cc];bx=[b for b in branches if b['country_code']==cc];px=[p for p in prices if p['country_code']==cc];ax=[a for a in availability if a['country_code']==cc]
        check(cc+': sourced buying channels or retained Cameroon supplement',sum(s['recommendation_eligible'] for s in sx)>=2 or cc=='CM' and c['external_discovery_records']==40)
        check(cc+': coverage agrees with actual records',c['supplier_or_network_records']==len(sx) and c['branch_or_contact_locations']==len(bx) and c['retail_or_distributor_locations']==sum(b['location_role'] in RETAIL for b in bx) and c['plant_or_terminal_locations']==sum(b['location_role'] in PLANTS for b in bx) and c['other_contact_locations']==sum(b['location_role'] not in RETAIL|PLANTS for b in bx) and c['price_observations']==len(px) and c['availability_observations']==len(ax) and c['physical_branch_coordinates']==sum(b['latitude'] is not None for b in bx) and c['published_price_coverage']==(bool(px) or cc=='CM') and c['live_inventory_connections']==c['verified_review_sets']==0 and not c['coverage_is_nationwide_complete'])
    check('Branches reference same-country supplier and resolvable sources',all(b['supplier_id'] in ss and b['country_code']==ss[b['supplier_id']]['country_code'] and b['source_ids'] and set(b['source_ids'])<=src and all(url(u) for u in b['source_urls']) for b in branches))
    check('Retail, plant, warehouse and office roles remain distinct',all(b['retail_access_claimed']==(b['location_role'] in RETAIL) for b in branches) and any(b['location_role']=='warehouse_or_distribution_center' and not b['eligible_for_nearest'] for b in branches))
    check('Branch stock, quantity, reviews and delivery unknown',all(b['stock_status']=='unknown' and b['stock_quantity'] is None and b['stock_confirmed_at'] is None and b['customer_rating'] is None and b['review_count'] is None and b['delivery_area_confirmed'] is None for b in branches))
    check('Published phone normalization uses E164 shape',all(re.fullmatch(r'\+[1-9]\d{6,14}',p) for b in branches for p in b.get('phones_e164',[])))
    check('Future openings excluded from current discovery',all(not b.get('opening_date_as_published') or b['opening_date_as_published']<=d['researched_at'] for b in branches))
    mapped=[b for b in branches if b['latitude'] is not None]
    check('Physical source coordinates paired, in bounds and source-address matched',all(isinstance(b['latitude'],(int,float)) and math.isfinite(b['latitude']) and -90<=b['latitude']<=90 and isinstance(b['longitude'],(int,float)) and math.isfinite(b['longitude']) and -180<=b['longitude']<=180 and b['coordinate_kind']=='merchant_published_branch_location' and b['geocode_status']=='merchant_published_address_matched' and url(b['coordinate_source']) and b['eligible_for_map'] and b['eligible_for_nearest']==(b['location_role'] in RETAIL) for b in mapped))
    check('No coordinates or nearest eligibility invented for address-only records',all(b['longitude'] is None and b['coordinate_kind'] is None and not b['eligible_for_nearest'] and not b['eligible_for_map'] for b in branches if b['latitude'] is None))
    check('China AMap CRS and Ghana uncertain precision kept outside shop map',all(b['latitude'] is None and b['longitude'] is None and not b['eligible_for_nearest'] and not b['source_coordinates']['eligible_for_wgs84_map'] for b in branches if b.get('source_coordinates')))
    geo=read('map_seed.geojson');features={f['properties']['branch_id']:f for f in geo['features']}
    check('GeoJSON equals mapped branch set with longitude/latitude order',len(features)==len(geo['features'])==len(mapped) and set(features)=={b['branch_id'] for b in mapped} and all(features[b['branch_id']]['geometry']=={'type':'Point','coordinates':[b['longitude'],b['latitude']]} and features[b['branch_id']]['properties']['location_role']==b['location_role'] for b in mapped))
    check('Toronto Leaside original ID and published pin preserved',bb['ca-home-depot-7073']['latitude']==43.7100377 and bb['ca-home-depot-7073']['longitude']==-79.3574901)
    ca=[b for b in branches if b['supplier_id']=='ca-home-depot']
    check('Canadian directory/leaf pages merge to 182 unique store IDs with pins',len(ca)==len({b['source_branch_id'] for b in ca})==182 and all(b['latitude'] is not None for b in ca))
    check('Australia actual Belconnen store point used, not selected/default store',any(b['supplier_id']=='au-bunnings' and 'Belconnen' in b['display_name'] and abs(b['latitude']+35.244962)<0.00001 and abs(b['longitude']-149.064061)<0.00001 for b in branches))
    check('Colombia Armenia branches keep CO country',sum(b['country_code']=='CO' and b['city']=='Armenia' for b in branches if b['supplier_id']=='co-canaima')==3)
    check('Distinct same-name French outlets retained at different source IDs',len([b for b in branches if b['supplier_id']=='fr-bigmat' and b['display_name']=='BigMat Albert - B.H. Mat'])==2)
    check('Distinct same-name Mexican stores retained by address',len([b for b in branches if b['supplier_id']=='mx-home-depot' and b['display_name']=='The Home Depot San Luis Potosi'])==2)
    check('Korean ready-mix, mortar and cement terminals classified separately',any(b['supplier_id']=='kr-hanil' and b['location_role']=='ready_mix_plant' for b in branches) and any(b['supplier_id']=='kr-hanil' and b['location_role']=='dry_mortar_plant' for b in branches) and any(b['supplier_id']=='kr-hanil' and b['location_role']=='bulk_cement_terminal' for b in branches))
    check('Chilean cement, ready mix, aggregate and office contacts distinct',{b['location_role'] for b in branches if b['supplier_id']=='cl-polpaico'}=={'cement_plant_contact','ready_mix_plant','aggregate_plant','supplier_office'})
    check('Price IDs and supplier/branch/source references valid',len({p['observation_id'] for p in prices})==len(prices) and all(p['supplier_id'] in ss and p['country_code']==ss[p['supplier_id']]['country_code'] and p['source_ids'] and set(p['source_ids'])<=src and url(p['source_url']) and (p['branch_id'] is None or p['branch_id'] in bb and bb[p['branch_id']]['supplier_id']==p['supplier_id']) for p in prices))
    check('Positive numeric price or explicit positive range with currency',all(len(p['currency'])==3 and (isinstance(p['amount'],(int,float)) and math.isfinite(p['amount']) and p['amount']>0 or p['amount'] is None and 0<p['amount_min']<=p['amount_max']) for p in prices))
    check('Explicit unit normalization is arithmetic only',all((p['normalized_amount_per_kg'] is None if not (p['amount'] is not None and p['pack_mass_kg'] and p['unit'] in ['bag','tonne']) else math.isclose(p['normalized_amount_per_kg'],p['amount']/p['pack_mass_kg'],rel_tol=1e-7)) and (p['normalized_amount_per_m3'] is None if p['unit'] not in ['m3','yd3'] or p['amount'] is None else math.isclose(p['normalized_amount_per_m3'],p['amount']/(0.764554857984 if p['unit']=='yd3' else 1),rel_tol=1e-7)) for p in prices))
    check('Unknown fees/stock never imply cheapest delivered',all(p['delivery_fee'] is None and p['handling_fee'] is None and p['delivery_area_confirmed'] is None and p['stock_confirmed_at'] is None and not p['eligible_for_cheapest_delivered'] for p in prices))
    groups=collections.defaultdict(list)
    for p in prices:groups[(p['supplier_id'],p['product_name'],p['currency'],p['customer_tier'],p.get('payment_condition'))].append(p)
    for key,group in groups.items():
        if len(group)>1:
            group.sort(key=lambda p:p['quantity_min'])
            check(key[0]+': quantity tiers remain non-overlapping',all(a['quantity_max'] is not None and a['quantity_max']<b['quantity_min'] for a,b in zip(group,group[1:])))
    mm=[p for p in prices if p['supplier_id']=='am-mmleader']
    check('MM Leader unresolved unit stays outside volume ranking',len(mm)==9 and all(p['unit'] is None and p['price_status']=='unit_unconfirmed' and p['normalized_amount_per_m3'] is None for p in mm))
    check('Armenian seller market and Iranian origin distinct',any(p['country_code']=='AM' and p.get('product_origin_country')=='IR' and p['currency']=='AMD' for p in prices))
    check('Senegal variable guide range remains EUR and unnormalized',any(p['country_code']=='SN' and p['currency']=='EUR' and p['amount'] is None and p['normalized_amount_per_kg'] is None for p in prices))
    check('Cash/deferred and retail/trade conditions preserved',{p.get('payment_condition') for p in prices if p['supplier_id']=='br-leroy-merlin'}=={'cash/upfront price','deferred-payment price'} and {p['customer_tier'] for p in prices if p['supplier_id']=='gb-travis-perkins'}=={'retail','trade_access_required'})
    check('Specialty products not relabeled ordinary concrete ingredients',any(p['category']=='floor_hardener' for p in prices) and all(p['category']=='cement_adhesive' for p in prices if p['supplier_id']=='tr-bauhaus') and all(p['category']=='masonry_cement' for p in prices if p['supplier_id']=='ar-easy') and any(p['supplier_id']=='ge-citadeli' and p['category']=='masonry_cement' for p in prices))
    duff=[p for p in prices if p['supplier_id']=='ca-dufferin']
    check('Dufferin unsupported air/intended-use labels removed from all observations',all(p['air_entrainment'] is None and p['intended_use_claim'] is None for p in duff))
    check('Dufferin 50 MPa standard includes HSF and superplasticizer footnote',any(p.get('price_table')=='standard_strength' and p['amount']==380 and p.get('hsf_cement_and_superplasticizer_included') for p in duff))
    check('Dufferin CXL 50 MPa at 56 days remains separate at CAD395/m3',any(p.get('exposure_classes')==['CXL'] and p['strength_test_age_days']==56 and p['amount']==395 and p['water_cement_ratio_as_published']==0.4 for p in duff))
    check('Availability scoped to source product/branch/channel, not live',len({a['observation_id'] for a in availability})==len(availability) and all(a['supplier_id'] in ss and a['country_code']==ss[a['supplier_id']]['country_code'] and set(a['source_ids'])<=src and (a['branch_id'] is None or a['branch_id'] in bb and bb[a['branch_id']]['supplier_id']==a['supplier_id']) and a['claim_scope'] and a['stock_confirmed_at'] is None and a['confirmed_quantity'] is None and not a['is_live_inventory'] for a in availability))
    check('Bricoma 24 branch claims and online out-of-stock claim remain separate',sum(a['supplier_id']=='ma-bricoma' and bool(a['branch_id']) for a in availability)==24 and any(a['supplier_id']=='ma-bricoma' and a['claim_scope']=='online_channel_structured_metadata' and a['branch_id'] is None for a in availability))
    check('Plomerama website quantity not attributed to invented branch',any(a['supplier_id']=='mx-plomerama' and a['website_reported_quantity']==50 and a['branch_id'] is None for a in availability))
    check('Kenya placeholder marketplace excluded',not ss['ke-constructionhub']['recommendation_eligible'] and not any(p['supplier_id']=='ke-constructionhub' for p in prices))
    actions=read('data_quality_actions.json')['actions'];aid={a['id'] for a in actions}
    check('Historical Erkat/retired GAMMA and Dufferin correction explicit',{'erkat-m500-old-price','gamma-retired-product','dufferin-standard-scope-correction','cainz-future-openings-and-specialist-formats'}<=aid and not any(p['supplier_id']=='am-erkat' for p in prices))
    delta=read('market_depth_delta.json')
    check('Former 102 branch IDs and 84 price IDs preserved in canonical upsert',len(delta['preserved_baseline_branch_ids'])==102 and set(delta['preserved_baseline_branch_ids'])<=set(bb) and len(delta['preserved_baseline_price_ids'])==84 and set(delta['preserved_baseline_price_ids'])<={p['observation_id'] for p in prices})
    check('Dufferin correction targets existing three price IDs',set(delta['correct_existing_price_metadata'])=={'ca-price-019','ca-price-020','ca-price-021'})
    check('Cameroon external supplement imported once',len(d['external_datasets'])==1 and d['external_datasets'][0]['country_code']=='CM' and d['external_datasets'][0]['import_once'])
    manifest=read('country_discovery_manifest.json')
    check('Only 50 of 100 locality countries marked market-researched',{c['country_code'] for c in manifest['countries'] if c['market_refresh_status']=='researched_50_market_refresh'}==TARGET and len(manifest['countries'])==100)
    priced={p['country_code'] for p in prices}|{'CM'}
    expected={'supplier_network_records_outside_cm':len(suppliers),'selected_branch_contact_locations_outside_cm':len(branches),'retail_or_distributor_locations_outside_cm':sum(b['location_role'] in RETAIL for b in branches),'plant_or_terminal_locations_outside_cm':sum(b['location_role'] in PLANTS for b in branches),'other_contact_locations_outside_cm':sum(b['location_role'] not in RETAIL|PLANTS for b in branches),'total_price_observations_including_cm':len(prices)+7,'single_numeric_price_observations_including_cm':sum(p['amount'] is not None for p in prices)+7,'price_range_observations':sum(p['amount'] is None for p in prices),'markets_with_any_published_price_observation':len(priced),'unique_new_source_urls':len(source),'map_eligible_branches':len(mapped),'retail_locations_with_source_published_coordinates':sum(b['eligible_for_nearest'] for b in branches)}
    check('All summary counts reflect canonical data',all(summary[k]==v for k,v in expected.items()) and set(summary['quote_only_country_codes'])==TARGET-priced)
