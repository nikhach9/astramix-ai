# AstraMix Materials Market — expanded 50-country data

Research snapshot: **18 October 2026**. This is an importable research package and an Antigravity implementation prompt. The actual localhost application was not modified or deployed from this workspace.

The expansion adds **3,349 net branch/contact location records** to the former 102, giving **3,451** outside Cameroon. The retained Cameroon file contains **40 additional discovery records**, including 33 directory-listed retail branches. Do not sum supplier entities and branch entities as though they were unique stores.

| Measure | Previous pack | Expanded pack |
|---|---:|---:|
| Supplier / network / independent dealer entities outside Cameroon | 135 | 542 |
| Branch / plant / office / directory contact locations outside Cameroon | 102 | 3,451 |
| Retail / distributor / sales outlet location records outside Cameroon | 72 | 3,006 |
| Plant / terminal location records outside Cameroon | — | 301 |
| Other offices / service / warehouse / directory contacts outside Cameroon | — | 144 |
| Published physical location coordinate pairs | 1 | 2,231 |
| Retail / sales points with coordinates, before material/access confirmation | 1 | 2,176 |
| Published price observations, including Cameroon | 91 | 116 |
| Markets with at least one published price or range | 42 | 43 |
| Product-specific website availability observations outside Cameroon | 10 | 30 |
| City/town suggestions in 100 countries | 62,964 | 62,964 |
| Live merchant inventory connections / verified customer review sets | 0 / 0 | 0 / 0 |

Counts describe published records. A retailer, independent dealer, manufacturer, plant, office and service lead have different roles. Some separately named businesses share an address; unresolved identity collisions are flagged for review. Retail classification describes the published business role and does not guarantee walk-in access, ingredient suitability or stock.

## Coverage by country

The source column links to a principal directory/contact publication used for the expansion. Additional merchant, product, price and branch URLs are in `sources_50.json`. “Other” includes offices, warehouses, service centres and third-party directory contacts. Numbers in the location columns exclude parent supplier entities. Cameroon is explicitly retained in its own file.

| Country | ISO | Supplier entities | Locations before → now | Retail / sales | Plants / terminals | Other contacts | Map points | Prices / ranges | Principal expansion source |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| Argentina | AR | 2 | 1 → 51 | 51 | 0 | 0 | 50 | 2 | [Easy Argentina](https://www.easy.com.ar/locales) |
| Armenia | AM | 98 | 7 → 121 | 23 | 1 | 97 | 21 | 14 | [Nor Tun and ingredient directory](https://nortun.am/stores/) |
| Australia | AU | 2 | 1 → 44 | 44 | 0 | 0 | 44 | 2 | [Bunnings Australia](https://www.bunnings.com.au/stores/wa/balcatta) |
| Austria | AT | 2 | 1 → 22 | 22 | 0 | 0 | 0 | 2 | [BAUHAUS Oesterreich](https://www.bauhaus.at/fachcentren/fachcentrum-innsbruck--voels/fc/757) |
| Bangladesh | BD | 3 | 2 → 6 | 1 | 2 | 3 | 0 | 1 | [Bashundhara Cement](https://www.bashundharacement.com/contact/) |
| Belgium | BE | 2 | 5 → 161 | 161 | 0 | 0 | 161 | 1 | [Hubo Belgie](https://www.hubo.be/nl/winkels/aalst.html) |
| Brazil | BR | 2 | 2 → 28 | 26 | 0 | 2 | 28 | 2 | [Telhanorte](https://www.telhanorte.com.br/institucional/nossas-lojas/telhanorte-anhanguera/) |
| Cameroon | CM | Separate file | 40 → 40 discovery records | 33 | Separate manufacturer contacts | Separate file | 0 | 7 | [Retained Cimencam directory](https://www.cimencam.com/fr/nos-points-de-vente) |
| Canada | CA | 5 | 3 → 183 | 183 | 0 | 0 | 182 | 16 | [Home Depot Canada locator](https://stores.homedepot.ca/) |
| Chile | CL | 4 | 0 → 45 | 0 | 42 | 3 | 0 | 0 | [Polpaico plants/offices](https://www.polpaico.cl/somos-polpaico/plantas-y-oficinas/) |
| China | CN | 2 | 3 → 144 | 0 | 144 | 0 | 0 | 0 | [Huaxin plant directory](https://www.huaxinconcrete.com/zhandian/) |
| Colombia | CO | 3 | 0 → 5 | 5 | 0 | 0 | 0 | 2 | [Ferreteria Canaima](https://www.almacencanaima.com/) |
| Czechia | CZ | 2 | 1 → 97 | 97 | 0 | 0 | 97 | 2 | [Stavebniny DEK](https://www.dek.cz/kontakty/nehvizdy) |
| Egypt | EG | 4 | 4 → 11 | 0 | 9 | 2 | 10 | 1 | [Misr Cement Beton](https://misrcementgroup.com/subsidiaries-and-locations/locations/) |
| France | FR | 4 | 1 → 304 | 304 | 0 | 0 | 303 | 1 | [BigMat locator](https://magasins.bigmat.fr/) |
| Georgia | GE | 3 | 1 → 6 | 5 | 0 | 1 | 0 | 5 | [Citadeli contacts](https://citadeli.com/en/contact) |
| Germany | DE | 2 | 1 → 162 | 162 | 0 | 0 | 0 | 1 | [BAUHAUS Deutschland](https://www.bauhaus.info/fachcentren/fachcentrum-hannover-stadtmitte/fc/300) |
| Ghana | GH | 3 | 7 → 12 | 10 | 2 | 0 | 0 | 2 | [Ghacem depot / sales directory](https://www.ghacem.com/en/depot_and_sales_outlets) |
| India | IN | 4 | 1 → 22 | 0 | 16 | 6 | 0 | 2 | [Dalmia Cement](https://www.dalmiacement.com/contact-us) |
| Indonesia | ID | 2 | 1 → 11 | 10 | 0 | 1 | 0 | 1 | [Mitra10](https://tenma.co.id/mitra10/) |
| Ireland | IE | 2 | 1 → 36 | 36 | 0 | 0 | 36 | 2 | [Chadwicks](https://www.chadwicks.ie/stores/robinhood-road) |
| Italy | IT | 2 | 1 → 35 | 35 | 0 | 0 | 35 | 1 | [Tecnomat](https://negozi.tecnomat.it/) |
| Ivory Coast | CI | 5 | 4 → 8 | 4 | 2 | 2 | 0 | 0 | [Apex Batiment](https://groupeapex.com/apex-batiment/) |
| Japan | JP | 2 | 1 → 267 | 267 | 0 | 0 | 266 | 1 | [CAINZ public locator](https://map.cainz.com/map/) |
| Kenya | KE | 5 | 1 → 7 | 1 | 4 | 2 | 0 | 0 | [Bamburi Cement](https://bamburigroup.com/contacts/) |
| Malaysia | MY | 4 | 2 → 6 | 1 | 2 | 3 | 0 | 1 | [Cement Industries of Malaysia (CIMA)](https://www.cima.com.my/contactus) |
| Mexico | MX | 4 | 0 → 86 | 86 | 0 | 0 | 0 | 4 | [The Home Depot Mexico](https://carreras.homedepot.com.mx/tiendas/) |
| Morocco | MA | 2 | 6 → 26 | 24 | 2 | 0 | 24 | 1 | [Bricoma](https://www.bricoma.ma/kit-sikatop-122.html) |
| New Zealand | NZ | 3 | 1 → 43 | 43 | 0 | 0 | 42 | 2 | [Bunnings New Zealand](https://www.bunnings.co.nz/stores/centralnorthisland/tokoroa) |
| Nigeria | NG | 304 | 6 → 303 | 303 | 0 | 0 | 0 | 0 | [Dangote approved dealers](https://cement.dangote.com/approved-distributors-retailers/) |
| Pakistan | PK | 3 | 2 → 10 | 0 | 2 | 8 | 0 | 2 | [Lucky Cement](https://lucky-cement.com/en/contact-us) |
| Peru | PE | 2 | 0 → 38 | 38 | 0 | 0 | 38 | 1 | [Promart Homecenter](https://www.promart.pe/tiendas) |
| Philippines | PH | 3 | 3 → 107 | 107 | 0 | 0 | 104 | 4 | [Wilcon Depot](https://shop.wilcon.com.ph/stores/) |
| Poland | PL | 2 | 1 → 109 | 109 | 0 | 0 | 0 | 1 | [Castorama Polska](https://www.castorama.pl/sklepy/augustow.html) |
| Portugal | PT | 2 | 1 → 34 | 34 | 0 | 0 | 0 | 1 | [Maxmat](https://www.maxmat.pt/pt/contactos-de-lojas_421.html?idst=1) |
| Romania | RO | 2 | 1 → 66 | 66 | 0 | 0 | 65 | 1 | [Dedeman](https://www.dedeman.ro/ro/retea/ab01/alba-iulia) |
| Saudi Arabia | SA | 2 | 1 → 2 | 0 | 0 | 2 | 0 | 0 | [Masdar Building Materials](https://masdar.co/contact/) |
| Senegal | SN | 5 | 1 → 1 | 0 | 0 | 1 | 0 | 2 | [EMAS ready mix / quote](https://www.emas-construction.com/beton) |
| South Africa | ZA | 2 | 1 → 291 | 291 | 0 | 0 | 291 | 2 | [Cashbuild locator](https://www.cashbuild.co.za/stores) |
| South Korea | KR | 4 | 1 → 30 | 0 | 28 | 2 | 0 | 2 | [Hanil Cement](https://www.hanilcement.com/en/html/support/lo_01.html) |
| Spain | ES | 3 | 1 → 13 | 13 | 0 | 0 | 12 | 1 | [BAUHAUS Espana](https://www.bauhaus.es/fc/madrid-plenilunio/350) |
| Sweden | SE | 2 | 1 → 139 | 139 | 0 | 0 | 139 | 1 | [Byggmax](https://www.byggmax.se/shops/) |
| Switzerland | CH | 2 | 1 → 8 | 8 | 0 | 0 | 0 | 1 | [BAUHAUS Schweiz](https://www.bauhaus.ch/de/s/service/fachcentren/fachcenter-losone) |
| Tanzania | TZ | 3 | 6 → 9 | 7 | 0 | 2 | 0 | 0 | [Nabaki Africa](https://nabaki.co.tz/branches/) |
| The Netherlands | NL | 2 | 7 → 45 | 45 | 0 | 0 | 0 | 2 | [Bouwmaat](https://www.bouwmaat.nl/pages/vestigingen) |
| Türkiye | TR | 3 | 2 → 11 | 10 | 1 | 0 | 9 | 1 | [BAUHAUS Turkiye](https://www.bauhaus.com.tr/bauhaus-magazalari) |
| United Arab Emirates | AE | 6 | 1 → 5 | 0 | 1 | 4 | 0 | 2 | [German Ready Mix](https://www.rakmix.com/contact-us/) |
| United Kingdom | GB | 2 | 1 → 231 | 231 | 0 | 0 | 231 | 2 | [Wickes](https://www.wickes.co.uk/store/8037) |
| United States | US | 6 | 4 → 48 | 4 | 43 | 1 | 43 | 12 | [Ernst concrete plants](https://www.ernstconcrete.com/locations/) |
| Vietnam | VN | 4 | 1 → 2 | 0 | 0 | 2 | 0 | 2 | [FiCO Pan-United](https://www.ficopanunited.com/frequently-asked-question/general-enquires/) |

## Required markets: what the larger counts mean

**Armenia:** 121 branch/contact records, including 23 retail locations and 21 published coordinate pairs. The expansion includes Nor Tun's address directory, Citadeli's Armenian contact and 94 material-relevant Construction.am company contacts; three of those companies reuse existing supplier identities. Directory-listed ready mix, sand, aggregate and stone-powder businesses are contact leads, not 94 verified retail shops. Source update dates are retained; pages older than 2023 and entries without relevant product evidence were excluded. Nor Tun's tile adhesive is a finishing material, not ordinary structural cement. [Nor Tun](https://nortun.am/stores/) · [Construction.am](https://www.construction.am/companies/)

**United States:** 48 location records: four retained Home Depot branches, 43 address-bearing Ernst ready-mix plant listings and a Gehring contact. This does **not** establish nationwide US branch coverage. Ernst plants are quote/dispatch contacts, not hardware pickup stores. Gehring now has all 12 mix-code prices from the inspected 2026 table, with product specifications and USD per cubic yard retained. [Ernst](https://www.ernstconcrete.com/locations/) · [Gehring](https://gehringconcrete.com/Products/Ready-Mix-Products-Pricing)

**Canada:** 183 location records, including 182 distinct Home Depot store IDs with addresses and source-published coordinate pairs, plus the retained RONA location. The 182 records are the stores recovered from the merchant's public province/city directory in this snapshot, not every concrete supplier in Canada. Dufferin contributes 15 distinct Ontario price observations: nine standard-strength and six CSA exposure-class mixes. [Home Depot Canada](https://stores.homedepot.ca/) · [Dufferin 2026 list](https://assets.boitebeet.com/dufferin/concrete/prod/public/uploads/2026/02/2026DufferinConcrete_PriceListWEB2.pdf)

## Prices and inventory

There are 114 single-number observations and two explicitly retained ranges across 43 markets, including Cameroon. Public numeric prices remain absent for **Côte d’Ivoire, Chile, China, Kenya, Nigeria, Saudi Arabia and Tanzania**. Their supplier discovery and quote/contact paths must remain visible.

New observations include five Georgian bagged-sand/cement/masonry-cement products, eight additional Gehring mix codes and 12 additional Dufferin mix specifications. A price per unit does not establish a minimum order quantity, current stock, delivered cost or product interchangeability. Senegal includes guide/variant ranges. MM Leader's nine Armenian amounts retain a null volume unit and cannot enter per-m³ rankings. Keep customer tiers, quantity tiers, payment conditions, pack sizes, original currencies and seller market versus imported origin.

Bricoma's one repair-mortar SKU now has website claims for 24 branches, alongside a separately scoped online out-of-stock claim. There are 30 availability observations outside Cameroon in total. These are product/branch/channel publication snapshots, **not merchant-confirmed live stock**. Do not copy any stock flag or price to every branch of a chain. Cashbuild prices in the prior pack remain scoped to store S286.

## Map and location behaviour

`map_seed.geojson` contains 2,231 published address-matched physical points. Its properties distinguish retail, plant, office and service roles; 2,176 retail/sales points can support a provisional straight-line distance once the selected material and actual access are checked. Distances are not driving routes or delivery commitments. Points come from actual branch/plant records, not the page's map centre, selected default shop or city centroid.

China's Huaxin source tuples are stored separately because AMap coordinate reference assumptions have not been confirmed. Ghana's coarse/uncertain points are also kept outside the shop-pin layer. Contact-only records remain in the list without fake pins or distance labels. Postal-only and locality-only contacts need address confirmation. Geocoding must return an address-matched physical location with stored provider/provenance before promoting such a row to the map.

Country-scoped autocomplete retains 62,964 GeoNames city/town records across 100 countries. Native-script Yerevan, accented Yaoundé, Toronto and New York lookup cases are covered. A locality point can centre a search area; it must never become a supplier pin. Three Canaima branches in **Armenia, Quindío are Colombian (CO)** and must not be assigned to country Armenia (AM).

## Corrections and exclusions

The earlier pack incorrectly labeled Dufferin's standard 20/25/30 MPa prices “non-air-entrained” and “interior-only.” The inspected standard table does not state those restrictions. Those three existing observation IDs now have null air/intended-use labels and corrected notes. The separate CSA table retains exposure classes, water/cement ratios and the explicit **56-day** test age for the 50 MPa CXL entry. The standard 50 MPa footnote retains HSF cement and superplasticizer. Import this metadata correction into any earlier installation; do not append duplicate prices.

Future-opening CAINZ locations are excluded even when its feed says OPEN. Permanently closed German/Austrian locations and unrelated specialist outlets are excluded. Ordinary Polish “closed today” labels do not mean a store has permanently closed. Different same-name French/Mexican stores and separate Korean material facilities are retained using source IDs/addresses. Earlier historical Erkat pricing, retired GAMMA products, placeholder marketplaces, staging/demo sites and template locations remain excluded as detailed in `data_quality_actions.json`.

## Remaining work and validation limits

Coverage remains uneven: Senegal gained relevant service/manufacturer leads but no new recoverable street-addressed branch; Saudi Arabia, Vietnam, UAE and several other markets still have limited local contacts. A nationwide supplier census, live prices and stock, routing, delivery eligibility, and genuine customer service/material-quality reviews require continuing merchant/provider integration. No stars or availability numbers were invented.

`validate_pack.py` checks relationship integrity, counts, coordinates, price semantics, preserved identities and offline autocomplete. See `validation_report.json` for the actual check count and package hashes. The app's database migration, API responses, frontend filtering, map rendering, import idempotency and deployment still need to be tested in Antigravity against the real repository. Research metadata must not overwrite newer merchant confirmations or real user reviews.

Use `ANTIGRAVITY_FIX_PROMPT.md` with the attached ZIP. Visitor counts and click analytics are deliberately deferred while the data update is implemented.
