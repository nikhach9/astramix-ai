"""
Routes for Materials Market, Location Suggestions, and Role-Protected Admin Operations:
- GET /api/v1/locations/suggest
- GET /api/v1/market/overview
- GET /api/v1/market/map-seed
- POST /api/v1/market/basket-from-mix
- POST /api/v1/market/search
- POST /api/v1/market/calculate-order
- GET /api/v1/market/suppliers/{supplier_id}/reviews
- POST /api/v1/market/suppliers/{supplier_id}/reviews
- POST /api/v1/admin/import/stage
- POST /api/v1/admin/import/{batch_id}/approve
- POST /api/v1/admin/import/refresh-50
- POST /api/v1/admin/suppliers/upsert-quote
- POST /api/v1/admin/reviews/{review_id}/moderate
- GET /api/v1/admin/audit-logs
"""
import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.exceptions import AstraMixError
from app.schemas.common import MixComposition
from astramix.domain.input_schema import CANONICAL_FEATURE_ORDER, parse_strict_finite_float
from astramix.market.db import (
    approve_staged_import,
    get_map_seed_geojson,
    import_50_country_refresh,
    stage_research_pack,
)
from astramix.market.locations import (
    LocationValidationError,
    get_country_location_suggestion_payload,
)
from astramix.market.service import (
    admin_list_audit_logs,
    admin_moderate_review,
    admin_upsert_branch_and_quote,
    generate_basket_from_mix,
    get_market_overview,
    list_supplier_reviews,
    search_market,
    submit_customer_review,
)
from astramix.market.units import (
    MissingBulkDensityError,
    UnitConversionError,
    calculate_ready_mix_order,
    convert_quantity,
    round_to_whole_bags,
)

router = APIRouter()


class AdminAuthError(AstraMixError):
    status_code = 403
    error_code = "AdminAuthError"


class LocationInputError(AstraMixError):
    status_code = 400
    error_code = "LocationValidationError"


def require_admin_role(
    x_admin_token: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
) -> str:
    """Verify administrator role token for protected admin endpoints."""
    expected_token = os.environ.get("ASTRAMIX_ADMIN_TOKEN", "astramix-dev-admin-token")
    provided = x_admin_token
    if not provided and authorization and authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()

    if not provided:
        raise AdminAuthError(
            "Administrator authentication required. Provide X-Admin-Token or Bearer token."
        )
    if provided != expected_token:
        raise AdminAuthError("Invalid administrator token; access denied.")
    return "admin"


class BasketFromMixRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mix: MixComposition
    project_volume_m3: Any = Field(..., description="Project volume in cubic meters (> 0)")
    bag_sizes_override: Optional[Dict[str, int]] = None

    @field_validator("project_volume_m3", mode="before")
    @classmethod
    def _val_vol(cls, v: Any) -> float:
        val = parse_strict_finite_float(v, "project_volume_m3", "Project volume (m³)")
        if val <= 0 or val > 100000:
            raise ValueError("Project volume (project_volume_m3) must be > 0 and <= 100,000 m³.")
        return float(val)


class MarketSearchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tab: str = Field("ingredients", description="'ingredients', 'ready_mix', or 'all'")
    country_code: Optional[str] = "AM"
    category: Optional[str] = "cement"
    quantity: Optional[Any] = 1000.0
    unit: Optional[str] = "kg"
    basket_items: Optional[List[Dict[str, Any]]] = None
    volume_m3: Optional[Any] = 6.0
    strength_class: Optional[str] = None
    needs_pump: bool = False
    location_query: Optional[str] = None
    locality_id: Optional[str] = None
    manual_location_entry: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price_filter: str = Field(
        "all",
        description="'all', 'with_published_price', or 'quote_or_call_only'",
    )
    sort_by: str = Field(
        "recommended",
        description=(
            "'recommended', 'recommended_for_filters', 'lowest_published_price', "
            "'lowest_delivered_total', 'nearest', 'nearest_mapped_store', or 'highest_reviewed'"
        ),
    )
    recommended_weights: Optional[Dict[str, float]] = None
    page: int = Field(1, ge=1, le=100)
    page_size: int = Field(20, ge=1, le=100)



class OrderCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: str = Field(..., description="'bag_rounding', 'unit_conversion', or 'ready_mix_order'")
    required_kg: Optional[Any] = None
    pack_size_kg: Optional[Any] = None
    amount: Optional[Any] = None
    from_unit: Optional[str] = None
    to_unit: Optional[str] = None
    bulk_density_kg_per_m3: Optional[Any] = None
    volume_m3: Optional[Any] = None
    unit_price_per_m3: Optional[Any] = None
    currency: str = "USD"
    vat_status: str = "ex_vat"
    vat_rate_pct: Optional[Any] = None
    delivery_status: str = "ex_works"
    truck_capacity_m3: Any = 8.0
    min_load_m3: Any = 0.0
    small_load_fee: Optional[Any] = None
    underload_fee_per_m3: Optional[Any] = None
    fixed_delivery_fee_per_truck: Optional[Any] = None
    per_km_rate_per_truck: Optional[Any] = None
    distance_km: Optional[Any] = None
    needs_pump: bool = False
    pump_fixed_fee: Optional[Any] = None
    pump_per_m3_fee: Optional[Any] = None


class ReviewSubmissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reviewer_user_id: str
    reviewer_display_name: str
    order_reference: str
    service_rating: int = Field(..., ge=1, le=5)
    material_rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = None
    review_text: str = Field(..., min_length=10)
    branch_id: Optional[str] = None
    verified_purchase: bool = False


class AdminUpsertQuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    supplier_id: str
    country_code: str
    display_name: str
    product_category: str
    product_name: str
    original_amount: str
    original_currency: str
    original_unit: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None
    address: Optional[str] = None
    pack_mass_kg: Optional[float] = None
    bulk_density_kg_per_m3: Optional[float] = None
    tax_included: Optional[bool] = True
    vat_rate_pct: Optional[str] = None
    delivery_inclusion: str = "included"
    fixed_delivery_fee: Optional[str] = None
    per_km_rate: Optional[str] = None
    truck_capacity_m3: str = "8.0"
    min_load_m3: str = "0"
    small_load_fee: Optional[str] = None
    is_live: bool = True
    eligible_for_cheapest: bool = True
    eligible_for_nearest: bool = True
    source_id: str = "ADMIN_VERIFIED"
    source_url: str = "https://astramix-ai.com/admin/verified-quotes"


class AdminModerateReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    moderation_state: str
    verified_purchase: Optional[bool] = None
    moderation_reason: Optional[str] = None


@router.get("/locations/suggest")
def route_locations_suggest(
    country: str = Query(..., description="ISO-2 country code, e.g. AM, US, CA, CM"),
    q: Optional[str] = Query("", description="Locality search query (supports Latin and native script)"),
    limit: Any = Query(8, description="Max suggestions to return (1..20)"),
) -> Dict[str, Any]:
    try:
        return get_country_location_suggestion_payload(country=country, q=q, limit=limit)
    except LocationValidationError as exc:
        raise LocationInputError(str(exc)) from exc


@router.get("/market/overview")
def route_market_overview() -> Dict[str, Any]:
    return get_market_overview()


@router.get("/market/map-seed")
def route_market_map_seed() -> Dict[str, Any]:
    return get_map_seed_geojson()


@router.post("/market/basket-from-mix")
def route_basket_from_mix(request: BasketFromMixRequest) -> Dict[str, Any]:
    mix_dict = {f: getattr(request.mix, f) for f in CANONICAL_FEATURE_ORDER}
    return generate_basket_from_mix(
        mix=mix_dict,
        volume_m3=request.project_volume_m3,
        bag_sizes_override=request.bag_sizes_override,
    )


@router.post("/market/search")
def route_market_search(request: MarketSearchRequest) -> Dict[str, Any]:
    try:
        return search_market(
            tab=request.tab,
            country_code=request.country_code,
            category=request.category,
            quantity=request.quantity,
            unit=request.unit,
            basket_items=request.basket_items,
            volume_m3=request.volume_m3,
            strength_class=request.strength_class,
            needs_pump=request.needs_pump,
            location_query=request.location_query,
            locality_id=request.locality_id,
            manual_location_entry=request.manual_location_entry,
            latitude=request.latitude,
            longitude=request.longitude,
            price_filter=request.price_filter,
            sort_by=request.sort_by,
            recommended_weights=request.recommended_weights,
            page=request.page,
            page_size=request.page_size,
        )
    except ValueError as exc:
        raise AstraMixError(str(exc)) from exc


@router.post("/market/calculate-order")
def route_calculate_order(request: OrderCalculationRequest) -> Dict[str, Any]:
    try:
        if request.mode == "bag_rounding":
            res = round_to_whole_bags(request.required_kg, request.pack_size_kg)
            return {
                "success": True,
                "mode": "bag_rounding",
                "required_kg": str(res.required_kg),
                "pack_size_kg": str(res.pack_size_kg),
                "bags_needed": res.bags_needed,
                "purchased_kg": str(res.purchased_kg),
                "surplus_kg": str(res.surplus_kg),
            }
        elif request.mode == "unit_conversion":
            conv = convert_quantity(
                amount=request.amount,
                from_unit=request.from_unit or "kg",
                to_unit=request.to_unit or "tonne",
                pack_size_kg=request.pack_size_kg,
                bulk_density_kg_per_m3=request.bulk_density_kg_per_m3,
            )
            return {
                "success": True,
                "mode": "unit_conversion",
                "amount": str(request.amount),
                "from_unit": request.from_unit,
                "to_unit": request.to_unit,
                "converted_amount": str(conv),
            }
        elif request.mode == "ready_mix_order":
            rm = calculate_ready_mix_order(
                volume_m3=request.volume_m3,
                unit_price_per_m3=request.unit_price_per_m3,
                currency=request.currency,
                vat_status=request.vat_status,
                vat_rate_pct=request.vat_rate_pct,
                delivery_status=request.delivery_status,
                truck_capacity_m3=request.truck_capacity_m3,
                min_load_m3=request.min_load_m3,
                small_load_fee=request.small_load_fee,
                underload_fee_per_m3=request.underload_fee_per_m3,
                fixed_delivery_fee_per_truck=request.fixed_delivery_fee_per_truck,
                per_km_rate_per_truck=request.per_km_rate_per_truck,
                distance_km=request.distance_km,
                needs_pump=request.needs_pump,
                pump_fixed_fee=request.pump_fixed_fee,
                pump_per_m3_fee=request.pump_per_m3_fee,
            )
            return {
                "success": True,
                "mode": "ready_mix_order",
                "ordered_volume_m3": str(rm.ordered_volume_m3),
                "truck_capacity_m3": str(rm.truck_capacity_m3),
                "truck_count": rm.truck_count,
                "load_volumes_m3": [str(x) for x in rm.load_volumes_m3],
                "base_material_subtotal": str(rm.base_material_subtotal),
                "small_load_fee": str(rm.small_load_fee),
                "delivery_fee": str(rm.delivery_fee),
                "pump_fee": str(rm.pump_fee),
                "subtotal_ex_vat": str(rm.subtotal_ex_vat),
                "vat_amount": str(rm.vat_amount),
                "total_inc_vat": str(rm.total_inc_vat),
                "currency": rm.currency,
                "is_complete_total": rm.is_complete_total,
                "missing_components": rm.missing_components,
                "notes": rm.notes,
            }
        else:
            raise ValueError("Unsupported calculation mode.")
    except (MissingBulkDensityError, UnitConversionError, ValueError) as exc:
        raise AstraMixError(str(exc)) from exc


@router.get("/market/suppliers/{supplier_id}/reviews")
def route_get_supplier_reviews(supplier_id: str) -> Dict[str, Any]:
    return list_supplier_reviews(supplier_id=supplier_id, include_unmoderated=False)


@router.post("/market/suppliers/{supplier_id}/reviews")
def route_post_supplier_review(supplier_id: str, request: ReviewSubmissionRequest) -> Dict[str, Any]:
    try:
        return submit_customer_review(
            supplier_id=supplier_id,
            reviewer_user_id=request.reviewer_user_id,
            reviewer_display_name=request.reviewer_display_name,
            order_reference=request.order_reference,
            service_rating=request.service_rating,
            material_rating=request.material_rating,
            title=request.title,
            review_text=request.review_text,
            branch_id=request.branch_id,
            verified_purchase=request.verified_purchase,
        )
    except ValueError as exc:
        raise AstraMixError(str(exc)) from exc


# --- Role-Protected Admin Endpoints ---

@router.post("/admin/import/stage")
def route_admin_stage_import(role: str = Depends(require_admin_role)) -> Dict[str, Any]:
    return stage_research_pack(actor=role)


@router.post("/admin/import/{batch_id}/approve")
def route_admin_approve_import(
    batch_id: str,
    role: str = Depends(require_admin_role),
) -> Dict[str, Any]:
    try:
        return approve_staged_import(batch_id=batch_id, approver=role)
    except ValueError as exc:
        raise AstraMixError(str(exc)) from exc


@router.post("/admin/import/refresh-50")
def route_admin_import_refresh_50(role: str = Depends(require_admin_role)) -> Dict[str, Any]:
    try:
        return import_50_country_refresh(actor=role)
    except (FileNotFoundError, ValueError) as exc:
        raise AstraMixError(str(exc)) from exc



@router.post("/admin/suppliers/upsert-quote")
def route_admin_upsert_quote(
    request: AdminUpsertQuoteRequest,
    role: str = Depends(require_admin_role),
) -> Dict[str, Any]:
    return admin_upsert_branch_and_quote(
        supplier_id=request.supplier_id,
        country_code=request.country_code,
        display_name=request.display_name,
        product_category=request.product_category,
        product_name=request.product_name,
        original_amount=request.original_amount,
        original_currency=request.original_currency,
        original_unit=request.original_unit,
        latitude=request.latitude,
        longitude=request.longitude,
        city=request.city,
        address=request.address,
        pack_mass_kg=request.pack_mass_kg,
        bulk_density_kg_per_m3=request.bulk_density_kg_per_m3,
        tax_included=request.tax_included,
        vat_rate_pct=request.vat_rate_pct,
        delivery_inclusion=request.delivery_inclusion,
        fixed_delivery_fee=request.fixed_delivery_fee,
        per_km_rate=request.per_km_rate,
        truck_capacity_m3=request.truck_capacity_m3,
        min_load_m3=request.min_load_m3,
        small_load_fee=request.small_load_fee,
        is_live=request.is_live,
        eligible_for_cheapest=request.eligible_for_cheapest,
        eligible_for_nearest=request.eligible_for_nearest,
        source_id=request.source_id,
        source_url=request.source_url,
        admin_actor=role,
    )


@router.post("/admin/reviews/{review_id}/moderate")
def route_admin_moderate_review(
    review_id: str,
    request: AdminModerateReviewRequest,
    role: str = Depends(require_admin_role),
) -> Dict[str, Any]:
    try:
        return admin_moderate_review(
            review_id=review_id,
            moderation_state=request.moderation_state,
            verified_purchase=request.verified_purchase,
            moderation_reason=request.moderation_reason,
            admin_actor=role,
        )
    except ValueError as exc:
        raise AstraMixError(str(exc)) from exc


@router.get("/admin/audit-logs")
def route_admin_audit_logs(
    limit: int = 50,
    role: str = Depends(require_admin_role),
) -> Dict[str, Any]:
    return {"audit_logs": admin_list_audit_logs(limit=limit)}
