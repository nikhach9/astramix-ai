# GeoNames attribution and scope

Contains GeoNames data from https://www.geonames.org/ licensed under Creative Commons Attribution 4.0 International (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/ .

The downloaded source is https://download.geonames.org/export/dump/cities5000.zip, with definitions and license at https://download.geonames.org/export/dump/readme.txt . Administrative-region names use `admin1CodesASCII.txt`; language hints use `countryInfo.txt` from that same official directory. Retrieved 2026-10-18; source SHA-256 is recorded in `locations/index.json`.

Changes: filtered to 100 countries, preserving the 93 existing AstraMix locality markets and adding AE, PE, KE, SA, PK, KR and VN; selected/reformatted fields as country-specific UTF-8 JSON; retained alternate names between 2 and 120 characters, deduplicated aliases, added administrative-region labels, and sorted by reported population. Lookup normalizes case, accents and punctuation without dropping native scripts. These files contain 62,964 populated places, not every settlement or street address.

Suggested product credit: “Location suggestions contain GeoNames data, CC BY 4.0; filtered and reformatted by AstraMix.” Link GeoNames and the license in the credits. Retain attribution when redistributing this modified dataset. GeoNames does not endorse AstraMix; the data has no guarantee of completeness, accuracy or timeliness.

The coordinates refer to cities/towns. They must not be copied into merchant branch records, used as exact store pins, or described as a customer's precise street location. A city reference point may define a coarse search area if the interface labels that limitation.
