# AstraMix market research and build brief

Research date: 2026-10-17

This package contains **93 country markets**, **62 published price snapshots across 23 countries**, and one separate government cost reference. It contains **zero confirmed live prices, geocoded shop branches or imported customer reviews**.

These are starting data for an implementation. Price snapshots can be displayed with their source and uncertainty, but do not establish the cheapest local seller. Most countries have a country-level supplier lead and require local branch, product and quotation work.

## What to build

1. **Mix Lab**: keep the current predictions and optimizer; validate all eight inputs; show strength, ingredient cost and embodied emissions with explicit comparison labels.
2. **Materials Market**: separate ingredients from ready-mixed concrete; compare actual compatible orders, delivery and verified local branches; support genuine reviews and transparent recommendations.

The existing public site is https://astramix-ai.com/ and exposes PHP pages plus a FastAPI backend. Inspect the actual repository before choosing files or frameworks. Source: [current project report](https://astramix-ai.com/report.php).

## Input support calculated from the original dataset

These are reference-data limits. They are not a structural design approval, a durability limit, or proof that a combination of individually allowed values is representative. Confirm the actual model training split and metadata first.

| Input | Minimum | Maximum | Unit |
|---|---:|---:|---|
| cement | 102 | 540 | kg/m3 |
| slag | 0 | 359.4 | kg/m3 |
| fly_ash | 0 | 200.1 | kg/m3 |
| water | 121.75 | 247 | kg/m3 |
| superplasticizer | 0 | 32.2 | kg/m3 |
| coarse_aggregate | 801 | 1145 | kg/m3 |
| fine_aggregate | 594 | 992.6 | kg/m3 |
| age_days | 1 | 365 | days |

Yeh, I. (1998). Concrete Compressive Strength [Dataset]. UCI Machine Learning Repository. DOI:10.24432/C5PK67. CC BY 4.0.
Reference workbook SHA-256: `710076c66b9ca3f8050e7942f3dcbdbe04013534daeb0077ffd3079a52d8e0c4`

## Published price observations

Prices below preserve the source product and unit. They are not comparable national averages. Tax and delivery are unknown unless the record states otherwise. Read the JSON notes before importing. A blank unit explicitly needs confirmation.

| Market | Supplier | Product | Original amount | Unit | Status | Source |
|---|---|---|---:|---|---|---|
| Armenia | Erkat Proff | M500 cement, Iran, 50 kg | 2700 AMD | bag | published snapshot unconfirmed | [source](https://erkatproff.am/en/product/cement-m500-parskakan-50-kg) |
| Armenia | MM Lider | M100 (B7.5) | 25000 AMD | unconfirmed | unit and date unconfirmed | [source](https://www.yell.am/-MM-LIDER-LLC-MM-LIDER-PRODUCTION-OF-CONCRETE-81005) |
| Armenia | MM Lider | M150 (B12.5) | 27000 AMD | unconfirmed | unit and date unconfirmed | [source](https://www.yell.am/-MM-LIDER-LLC-MM-LIDER-PRODUCTION-OF-CONCRETE-81005) |
| Armenia | MM Lider | M200 (B15) | 29000 AMD | unconfirmed | unit and date unconfirmed | [source](https://www.yell.am/-MM-LIDER-LLC-MM-LIDER-PRODUCTION-OF-CONCRETE-81005) |
| Armenia | MM Lider | M250 (B20) | 30000 AMD | unconfirmed | unit and date unconfirmed | [source](https://www.yell.am/-MM-LIDER-LLC-MM-LIDER-PRODUCTION-OF-CONCRETE-81005) |
| Armenia | MM Lider | M300 (B22.5) | 32000 AMD | unconfirmed | unit and date unconfirmed | [source](https://www.yell.am/-MM-LIDER-LLC-MM-LIDER-PRODUCTION-OF-CONCRETE-81005) |
| Armenia | MM Lider | M350 (B25) | 34000 AMD | unconfirmed | unit and date unconfirmed | [source](https://www.yell.am/-MM-LIDER-LLC-MM-LIDER-PRODUCTION-OF-CONCRETE-81005) |
| United States | Gehring Construction & Ready-Mix | SG-2000 | 140 USD | yd3 | published snapshot unconfirmed | [source](https://www.gehringconcrete.com/Products/Ready-Mix-Products-Pricing) |
| United States | Gehring Construction & Ready-Mix | SG-2500 | 144 USD | yd3 | published snapshot unconfirmed | [source](https://www.gehringconcrete.com/Products/Ready-Mix-Products-Pricing) |
| United States | Gehring Construction & Ready-Mix | SG-3000 | 148 USD | yd3 | published snapshot unconfirmed | [source](https://www.gehringconcrete.com/Products/Ready-Mix-Products-Pricing) |
| United States | Gehring Construction & Ready-Mix | SG-3500 | 152 USD | yd3 | published snapshot unconfirmed | [source](https://www.gehringconcrete.com/Products/Ready-Mix-Products-Pricing) |
| United States | Gehring Construction & Ready-Mix | SG-4000 | 156 USD | yd3 | published snapshot unconfirmed | [source](https://www.gehringconcrete.com/Products/Ready-Mix-Products-Pricing) |
| Canada | Dufferin Concrete | Standard strength mix 20 MPa | 254 CAD | m3 | published snapshot unconfirmed | [source](https://assets.boitebeet.com/dufferin/concrete/prod/public/uploads/2026/02/2026DufferinConcrete_PriceListWEB2.pdf) |
| Canada | Dufferin Concrete | Standard strength mix 25 MPa | 266 CAD | m3 | published snapshot unconfirmed | [source](https://assets.boitebeet.com/dufferin/concrete/prod/public/uploads/2026/02/2026DufferinConcrete_PriceListWEB2.pdf) |
| Canada | Dufferin Concrete | Standard strength mix 30 MPa | 275 CAD | m3 | published snapshot unconfirmed | [source](https://assets.boitebeet.com/dufferin/concrete/prod/public/uploads/2026/02/2026DufferinConcrete_PriceListWEB2.pdf) |
| Canada | Dufferin Concrete | Standard strength mix 35 MPa | 290 CAD | m3 | published snapshot unconfirmed | [source](https://assets.boitebeet.com/dufferin/concrete/prod/public/uploads/2026/02/2026DufferinConcrete_PriceListWEB2.pdf) |
| Canada | Dufferin Concrete | Standard strength mix 40 MPa | 299 CAD | m3 | published snapshot unconfirmed | [source](https://assets.boitebeet.com/dufferin/concrete/prod/public/uploads/2026/02/2026DufferinConcrete_PriceListWEB2.pdf) |
| United Kingdom | Mister Concrete | C20 | 135 GBP | m3 | supplier guide unconfirmed | [source](https://www.misterconcrete.co.uk/ready-mix-concrete-prices) |
| United Kingdom | Mister Concrete | C25 | 139 GBP | m3 | supplier guide unconfirmed | [source](https://www.misterconcrete.co.uk/ready-mix-concrete-prices) |
| United Kingdom | Mister Concrete | C30 | 142 GBP | m3 | supplier guide unconfirmed | [source](https://www.misterconcrete.co.uk/ready-mix-concrete-prices) |
| United Kingdom | Mister Concrete | C35 | 145 GBP | m3 | supplier guide unconfirmed | [source](https://www.misterconcrete.co.uk/ready-mix-concrete-prices) |
| United Kingdom | Mister Concrete | C40 | 150 GBP | m3 | supplier guide unconfirmed | [source](https://www.misterconcrete.co.uk/ready-mix-concrete-prices) |
| Czechia | B6 Betonarka Prestice | C12/15 X0 S3 | 2350 CZK | m3 | published snapshot unconfirmed | [source](https://www.betonarkaprestice.cz/cenik) |
| Czechia | B6 Betonarka Prestice | C16/20 X0 S3 | 2430 CZK | m3 | published snapshot unconfirmed | [source](https://www.betonarkaprestice.cz/cenik) |
| Czechia | B6 Betonarka Prestice | C20/25 X0 S3 | 2530 CZK | m3 | published snapshot unconfirmed | [source](https://www.betonarkaprestice.cz/cenik) |
| Czechia | B6 Betonarka Prestice | C25/30 X0 S3 | 2730 CZK | m3 | published snapshot unconfirmed | [source](https://www.betonarkaprestice.cz/cenik) |
| Czechia | B6 Betonarka Prestice | C30/37 X0 S3 | 2906 CZK | m3 | published snapshot unconfirmed | [source](https://www.betonarkaprestice.cz/cenik) |
| Czechia | B6 Betonarka Prestice | White concrete aggregate/sand 0/4 | 508 CZK | tonne | published snapshot unconfirmed | [source](https://www.betonarkaprestice.cz/cenik) |
| Czechia | B6 Betonarka Prestice | Crushed aggregate DK 8/16 | 641 CZK | tonne | published snapshot unconfirmed | [source](https://www.betonarkaprestice.cz/cenik) |
| Estonia | Otepaa Ehitusgrupp | C12/15 S3 | 98 EUR | m3 | published snapshot unconfirmed | [source](https://ehitusgrupp.ee/betoon/hinnakiri/) |
| Estonia | Otepaa Ehitusgrupp | C16/20 S3 | 103 EUR | m3 | published snapshot unconfirmed | [source](https://ehitusgrupp.ee/betoon/hinnakiri/) |
| Estonia | Otepaa Ehitusgrupp | C20/25 S3 | 111 EUR | m3 | published snapshot unconfirmed | [source](https://ehitusgrupp.ee/betoon/hinnakiri/) |
| Estonia | Otepaa Ehitusgrupp | C25/30 S3 | 117 EUR | m3 | published snapshot unconfirmed | [source](https://ehitusgrupp.ee/betoon/hinnakiri/) |
| Estonia | Otepaa Ehitusgrupp | C30/37 S3 | 125 EUR | m3 | published snapshot unconfirmed | [source](https://ehitusgrupp.ee/betoon/hinnakiri/) |
| Estonia | Otepaa Ehitusgrupp | C35/45 S3 | 133 EUR | m3 | published snapshot unconfirmed | [source](https://ehitusgrupp.ee/betoon/hinnakiri/) |
| Poland | Beton PRD | C8/10 | 335 PLN | m3 | published snapshot unconfirmed | [source](https://www.beton-prd.pl/) |
| Poland | Beton PRD | C12/15 | 360 PLN | m3 | published snapshot unconfirmed | [source](https://www.beton-prd.pl/) |
| Poland | Beton PRD | C16/20 | 375 PLN | m3 | published snapshot unconfirmed | [source](https://www.beton-prd.pl/) |
| Poland | Beton PRD | C20/25 | 390 PLN | m3 | published snapshot unconfirmed | [source](https://www.beton-prd.pl/) |
| Poland | Beton PRD | C25/30 | 407 PLN | m3 | published snapshot unconfirmed | [source](https://www.beton-prd.pl/) |
| Germany | Hinterlang Transportbeton | C25/30, mix 243366 | 171 EUR | m3 | published snapshot unconfirmed | [source](https://hinterlang.de/uploads/_hinterlang/2026/02/Transportbeton-2026.pdf) |
| Austria | Wopfinger Transportbeton | Oekobeton R C25/30 XC1 | 121.5 EUR | m3 | published snapshot unconfirmed | [source](https://wopfinger.com/files/cto_layout/media/preislisten/2026/Wopfinger_Transportbeton_Preisliste_Beton_2026.pdf) |
| Switzerland | Makies | A230-0 C25/30 Gettnau | 177.6 CHF | m3 | published snapshot unconfirmed | [source](https://www.makies.ch/produkte?file=files%2Fcontent%2Fpreisliste%2FPreisliste+2026+Makies.pdf) |
| Australia | Bunnings | Bastion general-purpose cement 20 kg | 9.01 AUD | bag | indexed retail snapshot unconfirmed | [source](https://www.bunnings.com.au/bastion-20kg-general-purpose-cement_p0760330?store=7118) |
| New Zealand | Mitre 10 | Golden Bay Portland cement 20 kg | 12.65 NZD | bag | indexed retail snapshot unconfirmed | [source](https://www.mitre10.co.nz/shop/golden-bay-cement-portland-cement-20-kg/p/343460) |
| France | Leroy Merlin France | Grey CEM II 32.5 cement 25 kg | 7.19 EUR | bag | indexed retail snapshot unconfirmed | [source](https://www.leroymerlin.fr/produits/ciment-gris-cem-ii-32-5-25-kg-62358772.html) |
| Portugal | Leroy Merlin Portugal | Secil cement 25 kg | 5.39 EUR | bag | indexed retail snapshot unconfirmed | [source](https://www.leroymerlin.pt/produtos/cimento-25kg-secil-13142325.html) |
| Spain | Obramat | Grey 32.5N cement 25 kg | 3.95 EUR | bag | published snapshot unconfirmed | [source](https://www.obramat.es/productos/cemento-32-5n-25-kg-gris-25068460.html) |
| South Africa | Cashbuild | Sephaku Falcon 32.5R cement 50 kg | 97.95 ZAR | bag | indexed retail snapshot unconfirmed | [source](https://www.cashbuild.co.za/539-cement?store=S286) |
| Slovenia | KG-EKO | T6-A C20/25 XC1 S2 D31.5 | 94 EUR | m3 | published snapshot unconfirmed | [source](https://kg-eko.si/kg-eko-cenik/) |
| Slovenia | KG-EKO | T11-A C25/30 XC2 S2 D31.5 | 102 EUR | m3 | published snapshot unconfirmed | [source](https://kg-eko.si/kg-eko-cenik/) |
| Slovenia | KG-EKO | T3-A(K) C16/20 X0 S2 D16 | 94 EUR | m3 | published snapshot unconfirmed | [source](https://kg-eko.si/kg-eko-cenik/) |
| Slovenia | KG-EKO | T10-A C25/30 XC2 S2 D16 | 103 EUR | m3 | published snapshot unconfirmed | [source](https://kg-eko.si/kg-eko-cenik/) |
| Slovakia | Riline | V-C25/30 XC2 XA3 D16 S3 | 94 EUR | m3 | published snapshot unconfirmed | [source](https://riline.sk/cennik/) |
| Croatia | NGH Grupa | BH20S4 C16/20 | 110 EUR | m3 | published snapshot unconfirmed | [source](https://ngh.hr/transportni-beton/) |
| Croatia | NGH Grupa | BH25S4 C20/25 | 114 EUR | m3 | published snapshot unconfirmed | [source](https://ngh.hr/transportni-beton/) |
| Croatia | NGH Grupa | BH30S4 C25/30 | 118 EUR | m3 | published snapshot unconfirmed | [source](https://ngh.hr/transportni-beton/) |
| Croatia | NGH Grupa | BH37S4 C30/37 | 126 EUR | m3 | published snapshot unconfirmed | [source](https://ngh.hr/transportni-beton/) |
| Netherlands | BolTec | C25/30 F4 indicative guide | 147.27 EUR | m3 | supplier guide unconfirmed | [source](https://www.boltec.nl/kennisbank/beton-prijs-per-m3/) |
| Romania | Petrosani concrete supplier | C25/30 D0-31.5 standard | 474 RON | m3 | indexed supplier snapshot unconfirmed | [source](https://betonpetrosani.ro/preturi/) |
| Bulgaria | BG Beton | C25/30 S3 XC1 | 77.72 EUR | m3 | historical price unconfirmed | [source](https://bg-beton.bg/wp-content/uploads/2025/10/%D0%9D%D0%BE%D0%B2%D0%B0-%D0%A6%D0%B5%D0%BD%D0%BE%D0%B2%D0%B0-%D0%BB%D0%B8%D1%81%D1%82%D0%B0-01.11.2025.pdf) |
| Chile | Sodimac Chile | Polpaico cement 25 kg | 5180 CLP | bag | indexed retail snapshot unconfirmed | [source](https://www.sodimac.cl/sodimac-cl/content/proyectos-construccion/) |

Italy has an additional **EUR 111.84/m3** regional 2026 costing reference for C25/30 XC1/XC2 S4. It is a government schedule, not a seller offer: [source](https://www.regione.fvg.it/rafvg/cms/RAFVG/infrastrutture-lavori-pubblici/lavori-pubblici/prezzario-2026/?cod=Y8.1.165.02).

## Country coverage

A country lead establishes a place to investigate products and local contacts. It does not establish a store address, delivery area, current ownership, open hours, stock, material quality or customer rating. Empty product categories mean local product scope remains unverified.

| Code | Country | Currency | Starting supplier lead | Price snapshots | Source |
|---|---|---|---|---:|---|
| DZ | Algeria | DZD | Lafarge Algeria | 0 | [source](https://www.holcim.com/find-holcim) |
| AR | Argentina | ARS | Holcim Argentina | 0 | [source](https://www.holcim.com/find-holcim) |
| AM | Armenia | AMD | Hrazdan Cement | 7 | [source](https://khachaturovgroup.am/cement-factory/) |
| AU | Australia | AUD | Heidelberg Materials country network | 1 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/asia-pacific) |
| AT | Austria | EUR | Holcim Austria | 1 | [source](https://www.holcim.com/find-holcim) |
| AZ | Azerbaijan | AZN | Holcim Azerbaijan | 0 | [source](https://www.holcim.com/find-holcim) |
| BD | Bangladesh | BDT | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/asia-pacific) |
| BE | Belgium | EUR | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe/benelux) |
| BZ | Belize | BZD | Progreso country business | 0 | [source](https://progreso.com/en/about-us/who-we-are/) |
| BJ | Benin | XOF | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia/sub-saharan-africa) |
| BA | Bosnia and Herzegovina | BAM | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| BR | Brazil | BRL | Vicat country network | 0 | [source](https://www.vicat.com/en/about-us/group/our-organization) |
| BN | Brunei | BND | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/asia-pacific) |
| BG | Bulgaria | EUR | Heidelberg Materials country network | 1 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| BF | Burkina Faso | XOF | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia/sub-saharan-africa) |
| CM | Cameroon | XAF | Cimencam | 0 | [source](https://www.holcim.com/find-holcim) |
| CA | Canada | CAD | Heidelberg Materials country network | 5 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/north-america) |
| TD | Chad | XAF | CIMAF country network | 0 | [source](https://www.cimentsafrique.com/en) |
| CL | Chile | CLP | Sodimac Chile | 1 | [source](https://www.sodimac.cl/sodimac-cl/content/proyectos-construccion/) |
| CN | China | CNY | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/asia-pacific) |
| CO | Colombia | COP | Holcim Colombia | 0 | [source](https://www.holcim.com/find-holcim) |
| CR | Costa Rica | CRC | Holcim Costa Rica | 0 | [source](https://www.holcim.com/find-holcim) |
| HR | Croatia | EUR | Heidelberg Materials country network | 4 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| CY | Cyprus | EUR | Bogaz Endustri ve Madencilik | 0 | [source](https://www.holcim.com/find-holcim) |
| CZ | Czechia | CZK | Heidelberg Materials country network | 7 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| CI | Côte d’Ivoire | XOF | CIMAF country network | 0 | [source](https://www.cimentsafrique.com/en) |
| DK | Denmark | DKK | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| DO | Dominican Republic | DOP | Progreso country business | 0 | [source](https://progreso.com/en/about-us/who-we-are/) |
| EC | Ecuador | USD | Holcim Ecuador | 0 | [source](https://www.holcim.com/find-holcim) |
| EG | Egypt | EGP | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia) |
| SV | El Salvador | USD | Holcim El Salvador | 0 | [source](https://www.holcim.com/find-holcim) |
| EE | Estonia | EUR | Heidelberg Materials country network | 6 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe/baltic-states) |
| ET | Ethiopia | ETB | Dangote Cement country network | 0 | [source](https://cement.dangote.com/pan-africa-operations/) |
| FI | Finland | EUR | Finnsementti | 0 | [source](https://finnsementti.fi/) |
| FR | France | EUR | Heidelberg Materials country network | 1 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| GA | Gabon | XAF | CIMAF country network | 0 | [source](https://www.cimentsafrique.com/en) |
| GE | Georgia | GEL | Hunnewell Cement | 0 | [source](https://hunnewellcement.com/en/) |
| DE | Germany | EUR | Heidelberg Materials country network | 1 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| GH | Ghana | GHS | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia/sub-saharan-africa) |
| GR | Greece | EUR | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| GT | Guatemala | GTQ | Progreso country business | 0 | [source](https://progreso.com/en/about-us/who-we-are/) |
| GN | Guinea | GNF | LafargeHolcim Guinea | 0 | [source](https://www.holcim.com/find-holcim) |
| GW | Guinea-Bissau | XOF | CIMAF country network | 0 | [source](https://www.cimentsafrique.com/en) |
| HN | Honduras | HNL | Cementos del Norte (CENOSA / Bijao) | 0 | [source](https://cenosa.hn/) |
| HU | Hungary | HUF | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| IS | Iceland | ISK | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe/iceland) |
| IN | India | INR | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/asia-pacific) |
| ID | Indonesia | IDR | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/asia-pacific) |
| IE | Ireland | EUR | Irish Cement | 0 | [source](https://www.irishcement.ie/products-2/) |
| IL | Israel | ILS | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia) |
| IT | Italy | EUR | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| JM | Jamaica | JMD | Cemex country operation reported for 2025 | 0 | [source](https://www.sec.gov/Archives/edgar/data/1076378/000119312526177605/d120395d20f.htm) |
| JP | Japan | JPY | Taiheiyo Cement | 0 | [source](https://www.taiheiyo-cement.co.jp/english/company/cement/) |
| KZ | Kazakhstan | KZT | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia) |
| LV | Latvia | EUR | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe/baltic-states) |
| LR | Liberia | LRD | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia/sub-saharan-africa) |
| LT | Lithuania | EUR | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe/baltic-states) |
| MY | Malaysia | MYR | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/asia-pacific) |
| ML | Mali | XOF | CIMAF country network | 0 | [source](https://www.cimentsafrique.com/en) |
| MR | Mauritania | MRU | CIMAF country network | 0 | [source](https://www.cimentsafrique.com/en) |
| MX | Mexico | MXN | Cemex country operation reported for 2025 | 0 | [source](https://www.sec.gov/Archives/edgar/data/1076378/000119312526177605/d120395d20f.htm) |
| MA | Morocco | MAD | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia) |
| MZ | Mozambique | MZN | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia/sub-saharan-africa) |
| NL | Netherlands | EUR | Heidelberg Materials country network | 1 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe/benelux) |
| NZ | New Zealand | NZD | Mitre 10 | 1 | [source](https://www.mitre10.co.nz/shop/building-hardware/building-supplies/concrete-cement/c/RS2016) |
| NI | Nicaragua | NIO | Cemex country operation reported for 2025 | 0 | [source](https://www.sec.gov/Archives/edgar/data/1076378/000119312526177605/d120395d20f.htm) |
| NG | Nigeria | NGN | Dangote Cement country network | 0 | [source](https://cement.dangote.com/pan-africa-operations/) |
| NO | Norway | NOK | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| PA | Panama | PAB | Progreso country business | 0 | [source](https://progreso.com/en/about-us/who-we-are/) |
| PH | Philippines | PHP | Republic Cement | 0 | [source](https://www.republiccement.com/) |
| PL | Poland | PLN | Heidelberg Materials country network | 5 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| PT | Portugal | EUR | Leroy Merlin Portugal | 1 | [source](https://www.leroymerlin.pt/produtos/cimento-25kg-secil-13142325.html) |
| CG | Republic of the Congo | XAF | Dangote Cement country network | 0 | [source](https://cement.dangote.com/pan-africa-operations/) |
| RO | Romania | RON | Heidelberg Materials country network | 1 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| RU | Russia | RUB | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia) |
| SN | Senegal | XOF | CIMAF country network | 0 | [source](https://www.cimentsafrique.com/en) |
| SL | Sierra Leone | SLE | Dangote Cement country network | 0 | [source](https://cement.dangote.com/pan-africa-operations/) |
| SG | Singapore | SGD | Pan-United Concrete | 0 | [source](https://www.panunited.com.sg/wp-content/uploads/2021/02/PR_Pan-United-Achieves-Singapores-Largest-Two-Continuous-Concrete-Pours-Within-a-Month.pdf) |
| SK | Slovakia | EUR | Riline | 1 | [source](https://riline.sk/cennik/) |
| SI | Slovenia | EUR | KG-EKO | 4 | [source](https://kg-eko.si/kg-eko-cenik/) |
| ZA | South Africa | ZAR | Heidelberg Materials country network | 1 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia/sub-saharan-africa) |
| ES | Spain | EUR | Heidelberg Materials country network | 1 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| SE | Sweden | SEK | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| CH | Switzerland | CHF | Vicat country network | 1 | [source](https://www.vicat.com/en/about-us/group/our-organization) |
| TZ | Tanzania | TZS | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia/sub-saharan-africa) |
| TH | Thailand | THB | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/asia-pacific) |
| TG | Togo | XOF | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia/sub-saharan-africa) |
| TT | Trinidad and Tobago | TTD | Cemex country operation reported for 2025 | 0 | [source](https://www.sec.gov/Archives/edgar/data/1076378/000119312526177605/d120395d20f.htm) |
| TR | Türkiye | TRY | Heidelberg Materials country network | 0 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/africa-mediterranean-west-asia) |
| UA | Ukraine | UAH | CEMARK | 0 | [source](https://www.crhukraine.com/) |
| GB | United Kingdom | GBP | Heidelberg Materials country network | 5 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/europe) |
| US | United States | USD | Heidelberg Materials country network | 5 | [source](https://www.heidelbergmaterials.com/en/company/group-areas-and-countries/north-america) |
| ZM | Zambia | ZMW | Dangote Cement country network | 0 | [source](https://cement.dangote.com/pan-africa-operations/) |

## Comparison rules

- Compare ingredient-only cost with ingredient-only cost in the same market and period. A ready-mix delivered quote is a different cost basis.
- Compare emissions only when the declared unit, strength/test basis, age, exposure, geography and life-cycle boundary match. Ingredient-factor totals are not automatically a verified product EPD. [NRMCA methodology](https://www.nrmca.org/association-resources/sustainability/environmental-product-declarations/).
- Use red/yellow/green only with an explicit valid reference or target. With insufficient data, use neutral “Insufficient comparison data”. Percentile cutoffs are product choices, not engineering standards.
- Name badges precisely: “Lowest confirmed delivered total among matched offers”, “Nearest verified branch” and “Recommended for this order”. Never claim to have checked the entire national market.
- External store ratings, material-product ratings and AstraMix service reviews are separate measurements. No stars were fabricated or imported. [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies).

## Data gaps to resolve first

- Armenia: reconfirm the Erkat Proff bag offer and MM Lider listing, including the missing ready-mix unit, date, tax and exact delivery area. Add independent aggregate and admixture suppliers.
- US: the Gehring prices apply to its Nebraska market, with per-yard units and load/distance fees. They are not a US average.
- Canada: the Dufferin list is Ontario-specific, and standard strength mixes differ from CSA exposure and MTO products. Check fuel, tax, delivery and small-load terms.
- Other markets: many entries are manufacturer networks. Resolve actual sales branches and compatible catalogues before enabling distance or price recommendations.
- Historical/guide/indexed observations: refresh against a supplier-confirmed quote before ranking. Singapore Pan-United evidence is historical. Bulgarian dual-currency prices are from a 2025 list; current display currency is EUR.

## Package files

- `Antigravity_Prompt.md`: full implementation instruction; attach it and the JSON data to Antigravity.
- `market_seed.json`: country leads, price observations and empty branch/review tables.
- `sources.json`: source URLs, types and evidence limitations.
- `input_bounds_reference.json`: reproducible UCI reference ranges.
- `validation_report.json`: internal consistency and status-flag checks.
- `Research_Brief.md`: this readable research summary.

No website files have been changed and no suppliers have been contacted.
