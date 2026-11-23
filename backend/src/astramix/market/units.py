"""
Decimal money arithmetic, unit conversions, whole-bag rounding, and
ready-mix dispatch calculation for AstraMix Materials Market.

Never uses binary floating-point for order totals, taxes, or fees.
Never invents bulk densities when converting between mass and volume.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation, ROUND_CEILING, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple

# Exact conversion constants
YD3_TO_M3 = Decimal("0.764554857984")
M3_TO_YD3 = Decimal("1") / YD3_TO_M3
LB_TO_KG = Decimal("0.45359237")
KG_TO_LB = Decimal("1") / LB_TO_KG
METRIC_TONNE_TO_KG = Decimal("1000")
US_SHORT_TON_TO_KG = Decimal("2000") * LB_TO_KG  # 907.18474 kg
UK_LONG_TON_TO_KG = Decimal("2240") * LB_TO_KG   # 1016.0469088 kg
MILE_TO_KM = Decimal("1.609344")
KM_TO_MILE = Decimal("1") / MILE_TO_KM

ZERO_DECIMAL_CURRENCIES = {
    "AMD", "JPY", "KRW", "CLP", "VND", "IDR", "ISK", "UGX", "RWF", "XOF", "XAF", "PYG", "HUF",
}
THREE_DECIMAL_CURRENCIES = {"KWD", "BHD", "OMR", "JOD", "TND"}


class UnitConversionError(ValueError):
    """Raised when an invalid or unverified unit conversion is requested."""


class MissingBulkDensityError(UnitConversionError):
    """Raised when converting between mass and volume without a product-specific bulk density."""


def to_decimal(val: Any, field_name: str = "value") -> Decimal:
    if val is None:
        raise ValueError(f"{field_name} cannot be None.")
    if isinstance(val, Decimal):
        if not val.is_finite():
            raise ValueError(f"{field_name} must be a finite Decimal.")
        return val
    if isinstance(val, bool):
        raise ValueError(f"{field_name} cannot be a boolean.")
    try:
        d = Decimal(str(val))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"{field_name} ('{val}') is not a valid decimal number.") from exc
    if not d.is_finite():
        raise ValueError(f"{field_name} must be finite.")
    return d


def currency_quantum(currency: str) -> Decimal:
    code = (currency or "USD").upper().strip()
    if code in ZERO_DECIMAL_CURRENCIES:
        return Decimal("1")
    if code in THREE_DECIMAL_CURRENCIES:
        return Decimal("0.001")
    return Decimal("0.01")


def quantize_money(amount: Decimal, currency: str = "USD") -> Decimal:
    q = currency_quantum(currency)
    return amount.quantize(q, rounding=ROUND_HALF_UP)


MASS_UNITS_TO_KG: Dict[str, Decimal] = {
    "kg": Decimal("1"),
    "kilogram": Decimal("1"),
    "kilograms": Decimal("1"),
    "g": Decimal("0.001"),
    "tonne": METRIC_TONNE_TO_KG,
    "metric_tonne": METRIC_TONNE_TO_KG,
    "metric_ton": METRIC_TONNE_TO_KG,
    "t": METRIC_TONNE_TO_KG,
    "mt": METRIC_TONNE_TO_KG,
    "short_ton": US_SHORT_TON_TO_KG,
    "us_short_ton": US_SHORT_TON_TO_KG,
    "ton_us": US_SHORT_TON_TO_KG,
    "long_ton": UK_LONG_TON_TO_KG,
    "uk_long_ton": UK_LONG_TON_TO_KG,
    "ton_uk": UK_LONG_TON_TO_KG,
    "lb": LB_TO_KG,
    "lbs": LB_TO_KG,
    "pound": LB_TO_KG,
    "pounds": LB_TO_KG,
}

VOLUME_UNITS_TO_M3: Dict[str, Decimal] = {
    "m3": Decimal("1"),
    "m³": Decimal("1"),
    "cubic_meter": Decimal("1"),
    "cubic_metre": Decimal("1"),
    "yd3": YD3_TO_M3,
    "yd³": YD3_TO_M3,
    "cy": YD3_TO_M3,
    "cubic_yard": YD3_TO_M3,
    "cubic_yards": YD3_TO_M3,
    "l": Decimal("0.001"),
    "liter": Decimal("0.001"),
    "litre": Decimal("0.001"),
}


def normalize_unit_key(unit: str) -> str:
    u = unit.strip().lower().replace(" ", "_")
    # Handle bag units like "50kg_bag", "25_kg_bag", "bag_50kg"
    return u


def convert_quantity(
    amount: Any,
    from_unit: str,
    to_unit: str,
    pack_size_kg: Optional[Any] = None,
    bulk_density_kg_per_m3: Optional[Any] = None,
) -> Decimal:
    """
    Convert a quantity between supported mass, volume, or discrete bag units.
    Strictly refuses mass <-> volume conversion unless bulk_density_kg_per_m3 is provided.
    """
    qty = to_decimal(amount, "amount")
    if qty < Decimal("0"):
        raise UnitConversionError("Quantity cannot be negative.")

    u_from = normalize_unit_key(from_unit)
    u_to = normalize_unit_key(to_unit)
    if u_from == u_to:
        return qty

    # Resolve bag to kg if pack_size_kg is provided
    def _is_bag(u: str) -> Tuple[bool, Optional[Decimal]]:
        if u in ("bag", "bags", "sack", "sacks"):
            if pack_size_kg is None:
                raise UnitConversionError(f"pack_size_kg is required to convert '{from_unit}' to '{to_unit}'.")
            return True, to_decimal(pack_size_kg, "pack_size_kg")
        for sz in ("20", "25", "35", "40", "42.5", "50"):
            if u in (f"{sz}kg_bag", f"{sz}_kg_bag", f"bag_{sz}kg", f"bag_{sz}_kg"):
                return True, Decimal(sz)
        return False, None

    from_is_bag, from_bag_kg = _is_bag(u_from)
    to_is_bag, to_bag_kg = _is_bag(u_to)

    # Convert source to canonical kg or m3
    canonical_mass_kg: Optional[Decimal] = None
    canonical_vol_m3: Optional[Decimal] = None

    if from_is_bag and from_bag_kg is not None:
        if from_bag_kg <= Decimal("0"):
            raise UnitConversionError("pack_size_kg must be positive.")
        canonical_mass_kg = qty * from_bag_kg
    elif u_from in MASS_UNITS_TO_KG:
        canonical_mass_kg = qty * MASS_UNITS_TO_KG[u_from]
    elif u_from in VOLUME_UNITS_TO_M3:
        canonical_vol_m3 = qty * VOLUME_UNITS_TO_M3[u_from]
    else:
        raise UnitConversionError(f"Unsupported source unit: '{from_unit}'.")

    # Convert canonical kg or m3 to target unit
    if to_is_bag and to_bag_kg is not None:
        if to_bag_kg <= Decimal("0"):
            raise UnitConversionError("pack_size_kg must be positive.")
        if canonical_mass_kg is None:
            if bulk_density_kg_per_m3 is None:
                raise MissingBulkDensityError(
                    "Cannot convert volume to bags without a verified product-specific bulk_density_kg_per_m3."
                )
            bd = to_decimal(bulk_density_kg_per_m3, "bulk_density_kg_per_m3")
            if bd <= Decimal("0"):
                raise MissingBulkDensityError("bulk_density_kg_per_m3 must be strictly positive.")
            canonical_mass_kg = canonical_vol_m3 * bd  # type: ignore[operator]
        return canonical_mass_kg / to_bag_kg

    if u_to in MASS_UNITS_TO_KG:
        if canonical_mass_kg is None:
            if bulk_density_kg_per_m3 is None:
                raise MissingBulkDensityError(
                    f"Cannot convert volume ('{from_unit}') to mass ('{to_unit}') without a verified "
                    "product-specific bulk_density_kg_per_m3."
                )
            bd = to_decimal(bulk_density_kg_per_m3, "bulk_density_kg_per_m3")
            if bd <= Decimal("0"):
                raise MissingBulkDensityError("bulk_density_kg_per_m3 must be strictly positive.")
            canonical_mass_kg = canonical_vol_m3 * bd  # type: ignore[operator]
        return canonical_mass_kg / MASS_UNITS_TO_KG[u_to]

    if u_to in VOLUME_UNITS_TO_M3:
        if canonical_vol_m3 is None:
            if bulk_density_kg_per_m3 is None:
                raise MissingBulkDensityError(
                    f"Cannot convert mass ('{from_unit}') to volume ('{to_unit}') without a verified "
                    "product-specific bulk_density_kg_per_m3."
                )
            bd = to_decimal(bulk_density_kg_per_m3, "bulk_density_kg_per_m3")
            if bd <= Decimal("0"):
                raise MissingBulkDensityError("bulk_density_kg_per_m3 must be strictly positive.")
            canonical_vol_m3 = canonical_mass_kg / bd  # type: ignore[operator]
        return canonical_vol_m3 / VOLUME_UNITS_TO_M3[u_to]

    raise UnitConversionError(f"Unsupported target unit: '{to_unit}'.")


@dataclass
class BagPurchaseBreakdown:
    required_kg: Decimal
    pack_size_kg: Decimal
    bags_needed: int
    purchased_kg: Decimal
    surplus_kg: Decimal


def round_to_whole_bags(required_kg: Any, pack_size_kg: Any) -> BagPurchaseBreakdown:
    """
    Round required mass in kg up to whole bags (never fractional bags).
    Returns required_kg, pack_size_kg, bags_needed, purchased_kg, and surplus_kg.
    """
    req = to_decimal(required_kg, "required_kg")
    pack = to_decimal(pack_size_kg, "pack_size_kg")
    if req < Decimal("0"):
        raise ValueError("required_kg cannot be negative.")
    if pack <= Decimal("0"):
        raise ValueError("pack_size_kg must be strictly positive.")

    if req == Decimal("0"):
        return BagPurchaseBreakdown(
            required_kg=Decimal("0"),
            pack_size_kg=pack,
            bags_needed=0,
            purchased_kg=Decimal("0"),
            surplus_kg=Decimal("0"),
        )

    bags_dec = (req / pack).to_integral_value(rounding=ROUND_CEILING)
    bags = int(bags_dec)
    purchased = Decimal(bags) * pack
    surplus = purchased - req
    return BagPurchaseBreakdown(
        required_kg=req.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        pack_size_kg=pack.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        bags_needed=bags,
        purchased_kg=purchased.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        surplus_kg=surplus.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
    )


@dataclass
class ReadyMixDispatchBreakdown:
    ordered_volume_m3: Decimal
    billed_volume_m3: Decimal
    truck_capacity_m3: Decimal
    truck_count: int
    load_volumes_m3: List[Decimal]
    min_load_m3: Decimal
    underload_volume_m3: Decimal
    base_material_subtotal: Decimal
    small_load_fee: Decimal
    delivery_fee: Decimal
    pump_fee: Decimal
    subtotal_ex_vat: Decimal
    vat_amount: Decimal
    total_inc_vat: Decimal
    currency: str
    is_complete_total: bool
    missing_components: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)


def calculate_ready_mix_order(
    volume_m3: Any,
    unit_price_per_m3: Any,
    currency: str = "USD",
    vat_status: str = "ex_vat",
    vat_rate_pct: Optional[Any] = None,
    delivery_status: str = "ex_works",
    truck_capacity_m3: Any = Decimal("8.0"),
    min_load_m3: Any = Decimal("0"),
    small_load_fee: Optional[Any] = None,
    underload_fee_per_m3: Optional[Any] = None,
    fixed_delivery_fee_per_truck: Optional[Any] = None,
    per_km_rate_per_truck: Optional[Any] = None,
    distance_km: Optional[Any] = None,
    needs_pump: bool = False,
    pump_fixed_fee: Optional[Any] = None,
    pump_per_m3_fee: Optional[Any] = None,
) -> ReadyMixDispatchBreakdown:
    """
    Calculate a ready-mixed concrete order using exact Decimal arithmetic.
    Enforces single-counting of VAT and delivery fees, truck capacity dispatch,
    minimum-load/small-load surcharges, and completeness checks.
    """
    vol = to_decimal(volume_m3, "volume_m3")
    if vol <= Decimal("0"):
        raise ValueError("Ordered volume_m3 must be > 0.")

    unit_price = to_decimal(unit_price_per_m3, "unit_price_per_m3")
    if unit_price < Decimal("0"):
        raise ValueError("unit_price_per_m3 cannot be negative.")

    cap = to_decimal(truck_capacity_m3, "truck_capacity_m3")
    if cap <= Decimal("0"):
        raise ValueError("truck_capacity_m3 must be > 0.")

    min_load = to_decimal(min_load_m3 or 0, "min_load_m3")

    truck_count = int((vol / cap).to_integral_value(rounding=ROUND_CEILING))
    loads: List[Decimal] = []
    rem = vol
    for _ in range(truck_count):
        ld = min(cap, rem)
        loads.append(ld.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        rem -= ld

    # Check underload / small-load fee on partial trucks
    underload_vol = Decimal("0")
    calc_small_load_fee = Decimal("0")
    notes: List[str] = []
    missing_components: List[str] = []

    for idx, ld in enumerate(loads):
        if min_load > Decimal("0") and ld < min_load:
            shortfall = min_load - ld
            underload_vol += shortfall
            if small_load_fee is not None:
                calc_small_load_fee += to_decimal(small_load_fee, "small_load_fee")
            elif underload_fee_per_m3 is not None:
                calc_small_load_fee += shortfall * to_decimal(underload_fee_per_m3, "underload_fee_per_m3")
            else:
                notes.append(
                    f"Truck #{idx + 1} load ({ld} m³) is below minimum load ({min_load} m³); surcharge may apply."
                )

    base_raw = vol * unit_price

    # Delivery fee (single inclusion: if delivery_status == "delivered", delivery is already in unit_price!)
    calc_delivery_fee = Decimal("0")
    if delivery_status == "delivered":
        notes.append("Delivery is already included in the quoted per-m³ price (not charged twice).")
    elif delivery_status == "pickup":
        notes.append("Customer collection / ex-plant pickup selected.")
    else:
        has_delivery_rule = False
        if fixed_delivery_fee_per_truck is not None:
            calc_delivery_fee += Decimal(truck_count) * to_decimal(
                fixed_delivery_fee_per_truck, "fixed_delivery_fee_per_truck"
            )
            has_delivery_rule = True
        if per_km_rate_per_truck is not None:
            if distance_km is not None:
                dist = to_decimal(distance_km, "distance_km")
                calc_delivery_fee += Decimal(truck_count) * dist * to_decimal(
                    per_km_rate_per_truck, "per_km_rate_per_truck"
                )
                has_delivery_rule = True
            else:
                missing_components.append("delivery_distance_km")
        if not has_delivery_rule and "delivery_distance_km" not in missing_components:
            missing_components.append("delivery_fee")

    # Pump fee
    calc_pump_fee = Decimal("0")
    if needs_pump:
        if pump_fixed_fee is not None or pump_per_m3_fee is not None:
            if pump_fixed_fee is not None:
                calc_pump_fee += to_decimal(pump_fixed_fee, "pump_fixed_fee")
            if pump_per_m3_fee is not None:
                calc_pump_fee += vol * to_decimal(pump_per_m3_fee, "pump_per_m3_fee")
        else:
            missing_components.append("pump_fee")

    # VAT handling (single inclusion: never add VAT twice if unit_price is already inc_vat)
    vat_status_norm = (vat_status or "unspecified").lower().strip()
    if vat_status_norm == "inc_vat":
        # Unit price already includes VAT
        if vat_rate_pct is not None and to_decimal(vat_rate_pct) > Decimal("0"):
            rate = to_decimal(vat_rate_pct) / Decimal("100")
            base_ex_vat = base_raw / (Decimal("1") + rate)
            fees_ex_vat = calc_small_load_fee + calc_delivery_fee + calc_pump_fee
            subtotal_ex_vat = base_ex_vat + fees_ex_vat
            total_inc_vat = base_raw + fees_ex_vat * (Decimal("1") + rate)
            vat_amount = total_inc_vat - subtotal_ex_vat
        else:
            # Base price is inc_vat, fees added as stated
            subtotal_ex_vat = base_raw + calc_small_load_fee + calc_delivery_fee + calc_pump_fee
            vat_amount = Decimal("0")
            total_inc_vat = subtotal_ex_vat
        notes.append("Quoted unit price includes VAT/tax (not added a second time).")
    elif vat_status_norm == "ex_vat":
        subtotal_ex_vat = base_raw + calc_small_load_fee + calc_delivery_fee + calc_pump_fee
        if vat_rate_pct is not None:
            rate = to_decimal(vat_rate_pct, "vat_rate_pct") / Decimal("100")
            vat_amount = subtotal_ex_vat * rate
            total_inc_vat = subtotal_ex_vat + vat_amount
        else:
            vat_amount = Decimal("0")
            total_inc_vat = subtotal_ex_vat
            missing_components.append("vat_rate_pct")
    else:
        subtotal_ex_vat = base_raw + calc_small_load_fee + calc_delivery_fee + calc_pump_fee
        vat_amount = Decimal("0")
        total_inc_vat = subtotal_ex_vat
        missing_components.append("vat_confirmation")

    is_complete = len(missing_components) == 0

    return ReadyMixDispatchBreakdown(
        ordered_volume_m3=vol.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        billed_volume_m3=vol.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        truck_capacity_m3=cap.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        truck_count=truck_count,
        load_volumes_m3=loads,
        min_load_m3=min_load.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        underload_volume_m3=underload_vol.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        base_material_subtotal=quantize_money(base_raw, currency),
        small_load_fee=quantize_money(calc_small_load_fee, currency),
        delivery_fee=quantize_money(calc_delivery_fee, currency),
        pump_fee=quantize_money(calc_pump_fee, currency),
        subtotal_ex_vat=quantize_money(subtotal_ex_vat, currency),
        vat_amount=quantize_money(vat_amount, currency),
        total_inc_vat=quantize_money(total_inc_vat, currency),
        currency=currency.upper(),
        is_complete_total=is_complete,
        missing_components=missing_components,
        notes=notes,
    )
