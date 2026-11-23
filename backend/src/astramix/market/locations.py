"""
Country-scoped locality suggestion service backed by the 100-country GeoNames
cities5000 dataset (62,964 cities/towns).

Follows the exact normalization, diacritic-folding, native-script alias matching,
and population ranking reference from `location_lookup.py`.
Coordinates are locality centers for search context only — never store pins.
Attribution: © GeoNames (https://www.geonames.org/), CC BY 4.0.
"""
from __future__ import annotations

import json
import os
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional


GEONAMES_ATTRIBUTION = (
    "Location suggestions: © GeoNames (https://www.geonames.org/), licensed under CC BY 4.0. "
    "Coordinates represent locality points, not verified supplier store locations."
)


def _get_project_root() -> Path:
    return Path(__file__).resolve().parents[4]


def get_locations_dir() -> Path:
    env_dir = os.environ.get("ASTRAMIX_LOCATIONS_DIR")
    if env_dir:
        return Path(env_dir)
    pack50_dir = os.environ.get("ASTRAMIX_RESEARCH_PACK_50_DIR")
    if pack50_dir:
        return Path(pack50_dir) / "locations"
    return _get_project_root() / "data" / "research_pack_50" / "astramix_market_fix" / "locations"


def get_manifest_path() -> Path:
    pack50_dir = os.environ.get("ASTRAMIX_RESEARCH_PACK_50_DIR")
    if pack50_dir:
        return Path(pack50_dir) / "country_discovery_manifest.json"
    return (
        _get_project_root()
        / "data"
        / "research_pack_50"
        / "astramix_market_fix"
        / "country_discovery_manifest.json"
    )


def normalize_location_text(value: str) -> str:
    """Fold case, strip combining marks, and normalize whitespace/punctuation."""
    raw = unicodedata.normalize("NFKD", (value or "").strip().casefold())
    without_marks = "".join(ch for ch in raw if not unicodedata.combining(ch))
    cleaned = re.sub(r"[^\w\s-]", " ", without_marks, flags=re.UNICODE)
    cleaned = cleaned.replace("-", " ")
    return re.sub(r"\s+", " ", cleaned).strip()


@lru_cache(maxsize=4)
def _load_country_index(locations_dir_str: str) -> Dict[str, Any]:
    idx_path = Path(locations_dir_str) / "index.json"
    if not idx_path.exists():
        raise FileNotFoundError(f"Missing locations index at {idx_path}")
    return json.loads(idx_path.read_text(encoding="utf-8"))


@lru_cache(maxsize=4)
def _load_manifest_by_code(manifest_path_str: str) -> Dict[str, Dict[str, Any]]:
    p = Path(manifest_path_str)
    if not p.exists():
        return {}
    data = json.loads(p.read_text(encoding="utf-8"))
    return {
        c["country_code"].upper(): c
        for c in data.get("countries", [])
        if isinstance(c, dict) and c.get("country_code")
    }


class LocationValidationError(ValueError):
    """Raised when country code, query length, or limit is invalid."""


@lru_cache(maxsize=128)
def _load_country_records(locations_dir_str: str, country_code: str) -> List[Dict[str, Any]]:
    code = (country_code or "").strip().upper()
    if len(code) != 2 or not code.isalpha() or not code.isascii():
        raise LocationValidationError("country_code must be an ISO 3166-1 alpha-2 code")
    country_path = Path(locations_dir_str) / f"{code}.json"
    if not country_path.exists():
        raise LocationValidationError(f"Unsupported country_code: {code}")
    payload = json.loads(country_path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    return payload.get("records", [])


def _format_suggestion(rec: Dict[str, Any]) -> Dict[str, Any]:
    name = rec.get("name") or rec.get("ascii_name") or ""
    admin1 = rec.get("admin1_code")
    admin1_name = rec.get("admin1_name")
    cc = rec.get("country_code", "")
    if admin1_name and admin1_name.lower() != name.lower():
        display_label = f"{name}, {admin1_name}, {cc}"
    elif admin1 and not str(admin1).isdigit():
        display_label = f"{name}, {admin1}, {cc}"
    else:
        display_label = f"{name}, {cc}"
    return {
        "id": rec.get("id"),
        "geoname_id": rec.get("geoname_id"),
        "name": name,
        "ascii_name": rec.get("ascii_name") or name,
        "country_code": cc,
        "admin1_code": admin1,
        "admin1_name": admin1_name,
        "latitude": rec.get("latitude"),
        "longitude": rec.get("longitude"),
        "population": int(rec.get("population") or 0),
        "feature_code": rec.get("feature_code"),
        "timezone": rec.get("timezone"),
        "display_label": display_label,
    }


def suggest_locations(
    country_code: str,
    query: str = "",
    limit: Any = 8,
    locations_dir: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """
    Return ranked locality suggestions for a country.
    Empty queries return the largest localities by population.
    """
    if isinstance(limit, bool):
        raise LocationValidationError("limit must be an integer between 1 and 20")
    try:
        limit_int = int(limit)
    except (TypeError, ValueError) as exc:
        raise LocationValidationError("limit must be an integer between 1 and 20") from exc

    if limit_int < 1 or limit_int > 20:
        raise LocationValidationError("limit must be between 1 and 20")

    q_str = "" if query is None else str(query)
    if len(q_str.strip()) > 120:
        raise LocationValidationError("query is too long (maximum 120 characters)")

    loc_dir = Path(locations_dir) if locations_dir is not None else get_locations_dir()
    records = _load_country_records(str(loc_dir.resolve()), country_code)

    q_norm = normalize_location_text(q_str)
    q_raw = q_str.strip().casefold()

    if not q_norm and not q_raw:
        top_records = sorted(
            records,
            key=lambda r: (-int(r.get("population") or 0), r.get("name") or ""),
        )[:limit_int]
        return [_format_suggestion(r) for r in top_records]

    scored = []
    for rec in records:
        name = rec.get("name") or ""
        ascii_name = rec.get("ascii_name") or ""
        aliases = rec.get("aliases") or []
        norm_terms = rec.get("search_terms") or []

        raw_candidates = [name.casefold(), ascii_name.casefold()] + [
            str(a).casefold() for a in aliases
        ]
        norm_candidates = [
            normalize_location_text(name),
            normalize_location_text(ascii_name),
        ] + [str(t) for t in norm_terms]

        rank: Optional[int] = None
        if q_raw in raw_candidates[:2] or (q_norm and q_norm in norm_candidates[:2]):
            rank = 0
        elif q_raw in raw_candidates or (q_norm and q_norm in norm_candidates):
            rank = 1
        elif any(c.startswith(q_raw) for c in raw_candidates[:2] if q_raw) or any(
            c.startswith(q_norm) for c in norm_candidates[:2] if q_norm
        ):
            rank = 2
        elif any(c.startswith(q_raw) for c in raw_candidates if q_raw) or any(
            c.startswith(q_norm) for c in norm_candidates if q_norm
        ):
            rank = 3
        elif (
            q_norm
            and len(q_norm) >= 3
            and any(f" {q_norm}" in f" {c}" for c in norm_candidates)
        ):
            rank = 4

        if rank is not None:
            scored.append((rank, -int(rec.get("population") or 0), name, rec))

    scored.sort(key=lambda item: (item[0], item[1], item[2]))
    return [_format_suggestion(item[3]) for item in scored[:limit_int]]


def get_country_location_suggestion_payload(
    country_code: Optional[str] = None,
    query: str = "",
    limit: Any = 8,
    locations_dir: Optional[Path] = None,
    country: Optional[str] = None,
    q: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Full API response envelope for GET /api/locations/suggest and GET /api/v1/locations/suggest.
    """
    raw_country = country if country is not None else country_code
    raw_query = q if q is not None else query
    code = (raw_country or "").strip().upper()
    suggestions = suggest_locations(
        country_code=code,
        query=raw_query or "",
        limit=limit,
        locations_dir=locations_dir,
    )
    manifest_map = _load_manifest_by_code(str(get_manifest_path().resolve()))
    country_meta = manifest_map.get(code, {})
    return {
        "country_code": code,
        "country_name": country_meta.get("country_name", code),
        "currency": country_meta.get("currency"),
        "market_refresh_status": country_meta.get(
            "market_refresh_status",
            "locality_and_prior_lead_fallback_not_part_of_50_market_refresh",
        ),
        "query": raw_query or "",
        "limit": int(limit),
        "count": len(suggestions),
        "suggestions": suggestions,
        "attribution": GEONAMES_ATTRIBUTION,
    }
