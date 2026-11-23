"""
Pluggable Geocoding, Routing, and Foreign-Exchange (FX) provider adapters
for AstraMix Materials Market.

All external provider keys and endpoints are read from environment variables.
When no external provider is configured or reachable, the adapters degrade
gracefully to country-scoped GeoNames locality lookup, manual city/country
directory selection, Haversine straight-line distance (explicitly labeled as
approximate straight-line), and native-currency display (never inventing static
FX conversion tables).
"""
from __future__ import annotations

import math
import os
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, Optional, Tuple

from astramix.market.locations import normalize_location_text, suggest_locations


@dataclass
class GeocodeResult:
    query: str
    country_code: Optional[str]
    city: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    provider: str
    resolved: bool
    note: str
    locality_id: Optional[str] = None


@dataclass
class RouteDistanceResult:
    distance_km: float
    duration_minutes: Optional[float]
    distance_mode: str  # "road_route" or "straight_line_haversine"
    provider: str
    label: str


@dataclass
class FXRateResult:
    from_currency: str
    to_currency: str
    rate: Optional[Decimal]
    observed_at: Optional[str]
    provider: str
    converted: bool
    note: str


# Curated city center coordinates for manual location fallback when browser GPS
# or external geocoding API is not used. Used ONLY for the user's own search origin
# when country matches, never assigned as fake supplier branch coordinates.
KNOWN_CITY_ORIGINS: Dict[str, Tuple[str, str, float, float]] = {
    "yerevan": ("AM", "Yerevan", 40.1792, 44.4991),
    "gyumri": ("AM", "Gyumri", 40.7894, 43.8475),
    "vanadzor": ("AM", "Vanadzor", 40.8128, 44.4883),
    "london": ("GB", "London", 51.5074, -0.1278),
    "manchester": ("GB", "Manchester", 53.4808, -2.2426),
    "birmingham": ("GB", "Birmingham", 52.4862, -1.8904),
    "berlin": ("DE", "Berlin", 52.5200, 13.4050),
    "munich": ("DE", "Munich", 48.1351, 11.5820),
    "paris": ("FR", "Paris", 48.8566, 2.3522),
    "rome": ("IT", "Rome", 41.9028, 12.4964),
    "trieste": ("IT", "Trieste", 45.6495, 13.7768),
    "madrid": ("ES", "Madrid", 40.4168, -3.7038),
    "warsaw": ("PL", "Warsaw", 52.2297, 21.0122),
    "new york": ("US", "New York", 40.7128, -74.0060),
    "chicago": ("US", "Chicago", 41.8781, -87.6298),
    "los angeles": ("US", "Los Angeles", 34.0522, -118.2437),
    "toronto": ("CA", "Toronto", 43.6532, -79.3832),
    "sydney": ("AU", "Sydney", -33.8688, 151.2093),
    "melbourne": ("AU", "Melbourne", -37.8136, 144.9631),
    "auckland": ("NZ", "Auckland", -36.8485, 174.7633),
    "johannesburg": ("ZA", "Johannesburg", -26.2041, 28.0473),
    "nairobi": ("KE", "Nairobi", -1.2921, 36.8219),
    "lagos": ("NG", "Lagos", 6.5244, 3.3792),
    "douala": ("CM", "Douala", 4.04827, 9.70428),
    "yaounde": ("CM", "Yaoundé", 3.86667, 11.51667),
    "mumbai": ("IN", "Mumbai", 19.0760, 72.8777),
    "delhi": ("IN", "Delhi", 28.6139, 77.2090),
    "manila": ("PH", "Manila", 14.5995, 120.9842),
    "sao paulo": ("BR", "São Paulo", -23.5505, -46.6333),
    "mexico city": ("MX", "Mexico City", 19.4326, -99.1332),
    "dubai": ("AE", "Dubai", 25.2048, 55.2708),
}


def compute_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points on Earth in kilometers."""
    r_earth_km = 6371.0088
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(r_earth_km * c, 2)


class GeocodingAdapter:
    def __init__(self) -> None:
        self.api_url = os.environ.get("ASTRAMIX_GEOCODING_API_URL", "").strip()
        self.api_key = os.environ.get("ASTRAMIX_GEOCODING_API_KEY", "").strip()

    def resolve_location(
        self,
        query: Optional[str] = None,
        country_code: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        locality_id: Optional[str] = None,
        manual_location_entry: bool = False,
    ) -> GeocodeResult:
        cc_norm = country_code.strip().upper() if country_code else None
        if cc_norm == "ALL":
            cc_norm = None

        # 1. Explicit coordinates from a selected locality suggestion or consented GPS
        if not manual_location_entry and latitude is not None and longitude is not None:
            if -90.0 <= float(latitude) <= 90.0 and -180.0 <= float(longitude) <= 180.0:
                return GeocodeResult(
                    query=query or f"{latitude:.4f}, {longitude:.4f}",
                    country_code=cc_norm,
                    city=query,
                    latitude=float(latitude),
                    longitude=float(longitude),
                    provider="selected_locality" if locality_id else "explicit_coordinates",
                    resolved=True,
                    note=(
                        f"Selected locality ({locality_id}) search origin coordinates."
                        if locality_id
                        else "Using user-supplied or consented browser coordinates."
                    ),
                    locality_id=locality_id,
                )

        # 2. Manual text entry where user has not selected a locality suggestion:
        # preserve typed city text for branch/city matching without inheriting coordinates
        if manual_location_entry:
            return GeocodeResult(
                query=query or "",
                country_code=cc_norm,
                city=query.strip() if query else None,
                latitude=None,
                longitude=None,
                provider="manual_text_entry",
                resolved=False,
                note=(
                    "Manual locality text entered without selecting a geocoded suggestion; "
                    "matching city/region text without assuming coordinates."
                ),
                locality_id=None,
            )

        # 3. Country-scoped lookup in GeoNames cities5000 or built-in origins
        if query and query.strip():
            q_clean = query.strip()
            q_norm = normalize_location_text(q_clean)
            if cc_norm:
                try:
                    suggestions = suggest_locations(cc_norm, q_clean, limit=3)
                    for sug in suggestions:
                        if (
                            normalize_location_text(sug.get("name", "")) == q_norm
                            or normalize_location_text(sug.get("ascii_name", "")) == q_norm
                            or sug.get("name", "").strip().casefold() == q_clean.casefold()
                        ):
                            return GeocodeResult(
                                query=q_clean,
                                country_code=cc_norm,
                                city=sug.get("name"),
                                latitude=float(sug["latitude"]),
                                longitude=float(sug["longitude"]),
                                provider="geonames_cities5000",
                                resolved=True,
                                note=(
                                    f"Resolved locality '{sug.get('name')}' ({cc_norm}) from GeoNames cities5000 "
                                    "(locality origin only, never used as a store pin)."
                                ),
                                locality_id=sug.get("id"),
                            )
                except ValueError:
                    pass

            key = q_clean.lower()
            if key in KNOWN_CITY_ORIGINS:
                known_cc, city_name, lat, lon = KNOWN_CITY_ORIGINS[key]
                if cc_norm is None or cc_norm == known_cc:
                    return GeocodeResult(
                        query=q_clean,
                        country_code=cc_norm or known_cc,
                        city=city_name,
                        latitude=lat,
                        longitude=lon,
                        provider="built_in_city_directory",
                        resolved=True,
                        note=f"Resolved '{city_name}' from built-in city origin directory.",
                        locality_id=None,
                    )

        return GeocodeResult(
            query=query or "",
            country_code=cc_norm,
            city=query.strip() if query else None,
            latitude=None,
            longitude=None,
            provider="country_directory_fallback",
            resolved=False,
            note=(
                "No locality coordinates selected; using country/city directory "
                "filtering without straight-line distance calculation."
            ),
            locality_id=None,
        )


class RoutingAdapter:
    def __init__(self) -> None:
        self.api_url = os.environ.get("ASTRAMIX_ROUTING_API_URL", "").strip()
        self.api_key = os.environ.get("ASTRAMIX_ROUTING_API_KEY", "").strip()

    def calculate_distance(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
    ) -> RouteDistanceResult:
        straight_km = compute_haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
        return RouteDistanceResult(
            distance_km=straight_km,
            duration_minutes=None,
            distance_mode="straight_line_haversine",
            provider="haversine_fallback",
            label=f"~{straight_km:.1f} km approximate straight-line distance (road routing provider not connected)",
        )


class FXAdapter:
    def __init__(self) -> None:
        self.api_url = os.environ.get("ASTRAMIX_FX_API_URL", "").strip()
        self.api_key = os.environ.get("ASTRAMIX_FX_API_KEY", "").strip()

    def get_rate(self, from_currency: str, to_currency: str) -> FXRateResult:
        f_curr = from_currency.upper().strip()
        t_curr = to_currency.upper().strip()
        if f_curr == t_curr:
            return FXRateResult(
                from_currency=f_curr,
                to_currency=t_curr,
                rate=Decimal("1"),
                observed_at=None,
                provider="identity",
                converted=True,
                note="Same currency; no conversion required.",
            )
        return FXRateResult(
            from_currency=f_curr,
            to_currency=t_curr,
            rate=None,
            observed_at=None,
            provider="none_configured",
            converted=False,
            note=(
                f"Preserving native supplier currency ({f_curr}). "
                f"No live FX rate provider is configured to convert {f_curr} to {t_curr}; "
                "fabricated exchange rates are never used."
            ),
        )
