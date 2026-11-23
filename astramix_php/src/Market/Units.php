<?php
declare(strict_types=1);

namespace AstraMix\Market;

use AstraMix\Core\ValidationException;

class Units
{
    public const YD3_TO_M3 = "0.764554857984";
    public const LB_TO_KG = "0.45359237";
    public const METRIC_TONNE_TO_KG = "1000";
    public const US_SHORT_TON_TO_KG = "907.18474";
    public const UK_LONG_TON_TO_KG = "1016.0469088";
    public const MILE_TO_KM = "1.609344";

    public const ZERO_DECIMAL_CURRENCIES = [
        "AMD", "JPY", "KRW", "CLP", "VND", "IDR", "ISK", "UGX", "RWF", "XOF", "XAF", "PYG", "HUF",
    ];
    public const THREE_DECIMAL_CURRENCIES = ["KWD", "BHD", "OMR", "JOD", "TND"];

    public const MASS_UNITS_TO_KG = [
        "kg" => "1",
        "kilogram" => "1",
        "kilograms" => "1",
        "g" => "0.001",
        "tonne" => "1000",
        "metric_tonne" => "1000",
        "metric_ton" => "1000",
        "t" => "1000",
        "mt" => "1000",
        "short_ton" => self::US_SHORT_TON_TO_KG,
        "us_short_ton" => self::US_SHORT_TON_TO_KG,
        "ton_us" => self::US_SHORT_TON_TO_KG,
        "long_ton" => self::UK_LONG_TON_TO_KG,
        "uk_long_ton" => self::UK_LONG_TON_TO_KG,
        "ton_uk" => self::UK_LONG_TON_TO_KG,
        "lb" => self::LB_TO_KG,
        "lbs" => self::LB_TO_KG,
        "pound" => self::LB_TO_KG,
        "pounds" => self::LB_TO_KG,
    ];

    public const VOLUME_UNITS_TO_M3 = [
        "m3" => "1",
        "m³" => "1",
        "cubic_meter" => "1",
        "cubic_metre" => "1",
        "yd3" => self::YD3_TO_M3,
        "yd³" => self::YD3_TO_M3,
        "cy" => self::YD3_TO_M3,
        "cubic_yard" => self::YD3_TO_M3,
        "cubic_yards" => self::YD3_TO_M3,
        "l" => "0.001",
        "liter" => "0.001",
        "litre" => "0.001",
    ];

    public static function currencyDecimals(string $currency): int
    {
        $code = strtoupper(trim($currency ?: "USD"));
        if (in_array($code, self::ZERO_DECIMAL_CURRENCIES, true)) {
            return 0;
        }
        if (in_array($code, self::THREE_DECIMAL_CURRENCIES, true)) {
            return 3;
        }
        return 2;
    }

    public static function quantizeMoney(float $amount, string $currency = "USD"): float
    {
        $decimals = self::currencyDecimals($currency);
        return round($amount, $decimals);
    }

    public static function roundToWholeBags(mixed $requiredKg, mixed $packSizeKg): array
    {
        $req = (float)$requiredKg;
        $pack = (float)$packSizeKg;

        if ($req < 0) {
            throw new ValidationException("required_kg cannot be negative.");
        }
        if ($pack <= 0) {
            throw new ValidationException("pack_size_kg must be strictly positive.");
        }

        if ($req == 0.0) {
            return [
                "required_kg" => "0.00",
                "pack_size_kg" => sprintf("%.2f", $pack),
                "bags_needed" => 0,
                "purchased_kg" => "0.00",
                "surplus_kg" => "0.00",
            ];
        }

        $bags = (int)ceil($req / $pack);
        $purchased = $bags * $pack;
        $surplus = $purchased - $req;

        return [
            "required_kg" => sprintf("%.2f", $req),
            "pack_size_kg" => sprintf("%.2f", $pack),
            "bags_needed" => $bags,
            "purchased_kg" => sprintf("%.2f", $purchased),
            "surplus_kg" => sprintf("%.2f", $surplus),
        ];
    }

    public static function convertQuantity(
        mixed $amount,
        string $fromUnit,
        string $toUnit,
        mixed $packSizeKg = null,
        mixed $bulkDensityKgPerM3 = null
    ): float {
        $qty = (float)$amount;
        if ($qty < 0) {
            throw new ValidationException("Quantity cannot be negative.");
        }

        $uFrom = strtolower(str_replace(' ', '_', trim($fromUnit)));
        $uTo = strtolower(str_replace(' ', '_', trim($toUnit)));

        if ($uFrom === $uTo) {
            return $qty;
        }

        $isBag = function (string $u) use ($packSizeKg): array {
            if (in_array($u, ["bag", "bags", "sack", "sacks"], true)) {
                if ($packSizeKg === null) {
                    throw new ValidationException("pack_size_kg is required to convert bag units.");
                }
                return [true, (float)$packSizeKg];
            }
            foreach (["20", "25", "35", "40", "42.5", "50"] as $sz) {
                if (in_array($u, ["{$sz}kg_bag", "{$sz}_kg_bag", "bag_{$sz}kg", "bag_{$sz}_kg"], true)) {
                    return [true, (float)$sz];
                }
            }
            return [false, null];
        };

        [$fromIsBag, $fromBagKg] = $isBag($uFrom);
        [$toIsBag, $toBagKg] = $isBag($uTo);

        $canonicalMassKg = null;
        $canonicalVolM3 = null;

        if ($fromIsBag && $fromBagKg !== null) {
            if ($fromBagKg <= 0) {
                throw new ValidationException("pack_size_kg must be positive.");
            }
            $canonicalMassKg = $qty * $fromBagKg;
        } elseif (isset(self::MASS_UNITS_TO_KG[$uFrom])) {
            $canonicalMassKg = $qty * (float)self::MASS_UNITS_TO_KG[$uFrom];
        } elseif (isset(self::VOLUME_UNITS_TO_M3[$uFrom])) {
            $canonicalVolM3 = $qty * (float)self::VOLUME_UNITS_TO_M3[$uFrom];
        } else {
            throw new ValidationException("Unsupported source unit: '$fromUnit'.");
        }

        // Convert canonical to target
        if ($toIsBag && $toBagKg !== null) {
            if ($toBagKg <= 0) {
                throw new ValidationException("pack_size_kg must be positive.");
            }
            if ($canonicalMassKg === null) {
                if ($bulkDensityKgPerM3 === null) {
                    throw new ValidationException("Cannot convert volume to bags without a verified product-specific bulk_density_kg_per_m3.");
                }
                $bd = (float)$bulkDensityKgPerM3;
                if ($bd <= 0) {
                    throw new ValidationException("bulk_density_kg_per_m3 must be strictly positive.");
                }
                $canonicalMassKg = $canonicalVolM3 * $bd;
            }
            return $canonicalMassKg / $toBagKg;
        }

        if (isset(self::MASS_UNITS_TO_KG[$uTo])) {
            if ($canonicalMassKg === null) {
                if ($bulkDensityKgPerM3 === null) {
                    throw new ValidationException("Cannot convert volume ('$fromUnit') to mass ('$toUnit') without a verified product-specific bulk_density_kg_per_m3.");
                }
                $bd = (float)$bulkDensityKgPerM3;
                if ($bd <= 0) {
                    throw new ValidationException("bulk_density_kg_per_m3 must be strictly positive.");
                }
                $canonicalMassKg = $canonicalVolM3 * $bd;
            }
            return $canonicalMassKg / (float)self::MASS_UNITS_TO_KG[$uTo];
        }

        if (isset(self::VOLUME_UNITS_TO_M3[$uTo])) {
            if ($canonicalVolM3 === null) {
                if ($bulkDensityKgPerM3 === null) {
                    throw new ValidationException("Cannot convert mass ('$fromUnit') to volume ('$toUnit') without a verified product-specific bulk_density_kg_per_m3.");
                }
                $bd = (float)$bulkDensityKgPerM3;
                if ($bd <= 0) {
                    throw new ValidationException("bulk_density_kg_per_m3 must be strictly positive.");
                }
                $canonicalVolM3 = $canonicalMassKg / $bd;
            }
            return $canonicalVolM3 / (float)self::VOLUME_UNITS_TO_M3[$uTo];
        }

        throw new ValidationException("Unsupported target unit: '$toUnit'.");
    }

    public static function calculateReadyMixOrder(
        mixed $volumeM3,
        mixed $unitPricePerM3,
        string $currency = "USD",
        string $vatStatus = "ex_vat",
        mixed $vatRatePct = null,
        string $deliveryStatus = "ex_works",
        mixed $truckCapacityM3 = 8.0,
        mixed $minLoadM3 = 0.0,
        mixed $smallLoadFee = null,
        mixed $underloadFeePerM3 = null,
        mixed $fixedDeliveryFeePerTruck = null,
        mixed $perKmRatePerTruck = null,
        mixed $distanceKm = null,
        bool $needsPump = false,
        mixed $pumpFixedFee = null,
        mixed $pumpPerM3Fee = null
    ): array {
        $vol = (float)$volumeM3;
        if ($vol <= 0.0) {
            throw new ValidationException("Ordered volume_m3 must be > 0.");
        }
        $unitPrice = (float)$unitPricePerM3;
        if ($unitPrice < 0.0) {
            throw new ValidationException("unit_price_per_m3 cannot be negative.");
        }
        $cap = (float)$truckCapacityM3;
        if ($cap <= 0.0) {
            throw new ValidationException("truck_capacity_m3 must be > 0.");
        }
        $minLoad = (float)($minLoadM3 ?? 0.0);

        $truckCount = (int)ceil($vol / $cap);
        $loads = [];
        $rem = $vol;
        for ($i = 0; $i < $truckCount; $i++) {
            $ld = min($cap, $rem);
            $loads[] = round($ld, 2);
            $rem -= $ld;
        }

        $underloadVol = 0.0;
        $calcSmallLoadFee = 0.0;
        $notes = [];
        $missingComponents = [];

        foreach ($loads as $idx => $ld) {
            if ($minLoad > 0.0 && $ld < $minLoad) {
                $shortfall = $minLoad - $ld;
                $underloadVol += $shortfall;
                if ($smallLoadFee !== null) {
                    $calcSmallLoadFee += (float)$smallLoadFee;
                } elseif ($underloadFeePerM3 !== null) {
                    $calcSmallLoadFee += $shortfall * (float)$underloadFeePerM3;
                } else {
                    $notes[] = sprintf("Truck #%d load (%.2f m³) is below minimum load (%.2f m³); surcharge may apply.", $idx + 1, $ld, $minLoad);
                }
            }
        }

        $baseRaw = $vol * $unitPrice;

        // Delivery fee
        $calcDeliveryFee = 0.0;
        if ($deliveryStatus === "delivered") {
            $notes[] = "Delivery is already included in the quoted per-m³ price (not charged twice).";
        } elseif ($deliveryStatus === "pickup") {
            $notes[] = "Customer collection / ex-plant pickup selected.";
        } else {
            $hasDeliveryRule = false;
            if ($fixedDeliveryFeePerTruck !== null) {
                $calcDeliveryFee += $truckCount * (float)$fixedDeliveryFeePerTruck;
                $hasDeliveryRule = true;
            }
            if ($perKmRatePerTruck !== null) {
                if ($distanceKm !== null && (float)$distanceKm >= 0.0) {
                    $calcDeliveryFee += $truckCount * (float)$perKmRatePerTruck * (float)$distanceKm;
                    $hasDeliveryRule = true;
                } else {
                    $missingComponents[] = "distance_km";
                    $notes[] = "Distance-based delivery rate quoted but delivery distance was not supplied.";
                }
            }
            if (!$hasDeliveryRule) {
                $missingComponents[] = "delivery_fee";
                $notes[] = "Delivery charges not specified in quote; merchant will quote delivery separately.";
            }
        }

        // Pump fee
        $calcPumpFee = 0.0;
        if ($needsPump) {
            $hasPumpRule = false;
            if ($pumpFixedFee !== null) {
                $calcPumpFee += (float)$pumpFixedFee;
                $hasPumpRule = true;
            }
            if ($pumpPerM3Fee !== null) {
                $calcPumpFee += $vol * (float)$pumpPerM3Fee;
                $hasPumpRule = true;
            }
            if (!$hasPumpRule) {
                $missingComponents[] = "pump_fee";
                $notes[] = "Concrete pump requested but supplier pump rate was not specified; quote required.";
            }
        }

        $subtotalExVat = $baseRaw + $calcSmallLoadFee + $calcDeliveryFee + $calcPumpFee;

        // VAT
        $vatRate = ($vatRatePct !== null && is_numeric($vatRatePct)) ? (float)$vatRatePct : null;
        $vatAmount = 0.0;
        $totalIncVat = $subtotalExVat;

        if ($vatStatus === "inc_vat") {
            $totalIncVat = $subtotalExVat;
            if ($vatRate !== null && $vatRate > 0) {
                $vatAmount = $subtotalExVat - ($subtotalExVat / (1.0 + ($vatRate / 100.0)));
            }
            $notes[] = "Quoted price is already inclusive of VAT (tax is not added twice).";
        } elseif ($vatStatus === "exempt") {
            $vatAmount = 0.0;
            $totalIncVat = $subtotalExVat;
            $notes[] = "Order marked VAT-exempt.";
        } else {
            if ($vatRate !== null && $vatRate > 0) {
                $vatAmount = $subtotalExVat * ($vatRate / 100.0);
                $totalIncVat = $subtotalExVat + $vatAmount;
            } else {
                $missingComponents[] = "vat_rate_pct";
                $notes[] = "Order is ex-VAT but applicable VAT rate was not supplied.";
            }
        }

        $decimals = self::currencyDecimals($currency);
        $fmt = fn($val) => sprintf("%.{$decimals}f", round($val, $decimals));

        $isComplete = empty($missingComponents);

        return [
            "ordered_volume_m3" => sprintf("%.2f", $vol),
            "billed_volume_m3" => sprintf("%.2f", $vol),
            "truck_capacity_m3" => sprintf("%.2f", $cap),
            "truck_count" => $truckCount,
            "load_volumes_m3" => array_map(fn($v) => sprintf("%.2f", $v), $loads),
            "min_load_m3" => sprintf("%.2f", $minLoad),
            "underload_volume_m3" => sprintf("%.2f", $underloadVol),
            "base_material_subtotal" => $fmt($baseRaw),
            "small_load_fee" => $fmt($calcSmallLoadFee),
            "delivery_fee" => $fmt($calcDeliveryFee),
            "pump_fee" => $fmt($calcPumpFee),
            "subtotal_ex_vat" => $fmt($subtotalExVat),
            "vat_amount" => $fmt($vatAmount),
            "total_inc_vat" => $fmt($totalIncVat),
            "currency" => $currency,
            "is_complete_total" => $isComplete,
            "missing_components" => $missingComponents,
            "notes" => $notes,
        ];
    }

    public static function classifyUnit(?string $unit): string
    {
        if ($unit === null || trim($unit) === '') {
            return 'ambiguous';
        }
        $u = strtolower(str_replace(' ', '_', trim($unit)));
        if (in_array($u, ['bag', 'bags', 'sack', 'sacks'], true) || preg_match('#^[0-9.]+(?:_)?(?:kg)?_bag$#', $u)) {
            return 'packaged_mass';
        }
        if (isset(self::MASS_UNITS_TO_KG[$u])) {
            return 'bulk_mass';
        }
        if (isset(self::VOLUME_UNITS_TO_M3[$u])) {
            return 'volume';
        }
        if (in_array($u, ['item', 'kit', 'piece', 'unit', 'unspecified', 'unknown'], true)) {
            return 'discrete';
        }
        return 'ambiguous';
    }

    public static function calculateIngredientOrder(
        mixed $requiredQuantity,
        string $requestedUnit = "kg",
        mixed $unitPrice = null,
        ?string $originalUnit = null,
        string $currency = "USD",
        mixed $packMassKg = null,
        mixed $bulkDensityKgPerM3 = null,
        ?int $quantityMin = null,
        ?int $quantityMax = null,
        ?bool $taxIncluded = null,
        mixed $vatRatePct = null,
        string $deliveryInclusion = "excluded",
        ?float $fixedDeliveryFee = null,
        ?float $perKmRate = null,
        ?float $distanceKm = null,
        ?string $productName = null,
        ?string $productCategory = null,
        ?string $priceId = null,
        ?float $amountMin = null,
        ?float $amountMax = null
    ): array {
        $req = (float)$requiredQuantity;
        if ($req < 0) {
            throw new ValidationException("Required quantity cannot be negative.");
        }

        $currency = strtoupper(trim($currency ?: "USD"));
        $decimals = self::currencyDecimals($currency);
        $fmt = fn(?float $val) => $val !== null ? sprintf("%.{$decimals}f", round($val, $decimals)) : null;

        $missingComponents = [];
        $notes = [];
        $uReq = strtolower(str_replace(' ', '_', trim($requestedUnit ?: "kg")));
        $origUnit = $originalUnit ? strtolower(str_replace(' ', '_', trim($originalUnit))) : null;
        $price = ($unitPrice !== null && is_numeric($unitPrice)) ? (float)$unitPrice : null;
        $packKg = ($packMassKg !== null && is_numeric($packMassKg) && (float)$packMassKg > 0) ? (float)$packMassKg : null;
        $density = ($bulkDensityKgPerM3 !== null && is_numeric($bulkDensityKgPerM3) && (float)$bulkDensityKgPerM3 > 0) ? (float)$bulkDensityKgPerM3 : null;

        // Try extracting pack mass from original unit if missing (e.g. 25kg_bag, 50kg_bag)
        if ($packKg === null && $origUnit !== null) {
            if (preg_match('#^([0-9.]+)(?:_)?kg(?:_bag)?$#i', $origUnit, $m)) {
                $packKg = (float)$m[1];
            }
        }
        // Try extracting pack mass from product name if explicitly named e.g. "Cemento 25 kg"
        if ($packKg === null && $productName !== null && ($origUnit === 'bag' || $origUnit === 'sack')) {
            if (preg_match('#\b([0-9.]+)\s*kg\b#i', $productName, $m)) {
                $candidate = (float)$m[1];
                if ($candidate > 0 && $candidate <= 1500) {
                    $packKg = $candidate;
                }
            }
        }

        $requiredKg = $req;
        $tierMatches = true;

        $formatReturn = function (
            ?float $matSubtotal,
            ?float $purchasedKgVal,
            ?float $surplusKgVal,
            ?int $pkgCount,
            ?float $normUnitPrice,
            ?string $normUnit,
            bool $isAmbiguous,
            string $quoteComp,
            ?string $pricingWarn,
            array $missingComp,
            array $extraNotes = [],
            ?float $calcDelivFee = null,
            ?float $calcVat = null
        ) use (
            $priceId, $productName, $productCategory, $currency, $price, $originalUnit,
            $packKg, $req, $requiredKg, $requestedUnit, $amountMin, $amountMax,
            $notes, $tierMatches, $fmt
        ) {
            $allNotes = array_merge($notes, $extraNotes);
            $hasSubtotal = $matSubtotal !== null;
            $subtotalBeforeVat = $hasSubtotal ? ($matSubtotal + ($calcDelivFee ?? 0.0)) : null;
            $deliveredTotal = ($hasSubtotal && empty($missingComp)) ? ($subtotalBeforeVat + ($calcVat ?? 0.0)) : null;
            $referenceSubtotal = $hasSubtotal ? ($matSubtotal + ($calcDelivFee ?? 0.0) + ($calcVat ?? 0.0)) : null;
            $isComplete = $hasSubtotal && empty($missingComp);

            return [
                "price_id" => $priceId,
                "product_name" => $productName,
                "product_category" => $productCategory,
                "currency" => $currency,
                "source_price" => $fmt($price),
                "original_amount" => $fmt($price),
                "original_pricing_unit" => $originalUnit,
                "original_unit" => $originalUnit,
                "is_price_range" => ($amountMin !== null && $amountMax !== null),
                "amount_min" => $amountMin !== null ? $fmt($amountMin) : null,
                "amount_max" => $amountMax !== null ? $fmt($amountMax) : null,
                "package_quantity_kg" => $packKg,
                "pack_mass_kg" => $packKg,
                "package_count" => $pkgCount,
                "bags_needed" => $pkgCount,
                "required_quantity" => sprintf("%.2f", $req),
                "required_kg" => $requiredKg !== null ? sprintf("%.2f", $requiredKg) : null,
                "requested_unit" => $requestedUnit,
                "purchased_quantity" => $purchasedKgVal !== null ? sprintf("%.2f", $purchasedKgVal) : null,
                "purchased_kg" => $purchasedKgVal !== null ? sprintf("%.2f", $purchasedKgVal) : null,
                "surplus_quantity" => $surplusKgVal !== null ? sprintf("%.2f", $surplusKgVal) : null,
                "surplus_kg" => $surplusKgVal !== null ? sprintf("%.2f", $surplusKgVal) : null,
                "normalized_unit_price" => $normUnitPrice !== null ? sprintf("%.4f", $normUnitPrice) : null,
                "normalized_unit" => $normUnit,
                "material_subtotal" => $fmt($matSubtotal),
                "delivery_fee" => $fmt($calcDelivFee),
                "vat_amount" => $fmt($calcVat),
                "delivered_total" => $fmt($deliveredTotal),
                "reference_subtotal" => $fmt($referenceSubtotal),
                "is_complete_total" => $isComplete,
                "is_ambiguous_unit" => $isAmbiguous,
                "quote_completeness" => $isComplete ? "confirmed_complete" : $quoteComp,
                "pricing_warning" => $pricingWarn,
                "quantity_tier_matches_order" => $tierMatches,
                "missing_cost_components" => $missingComp,
                "unconfirmed_charges" => $missingComp,
                "notes" => $allNotes,
            ];
        };

        // Price missing or quote required
        if ($price === null || $price < 0.0) {
            return $formatReturn(
                matSubtotal: null,
                purchasedKgVal: null,
                surplusKgVal: null,
                pkgCount: null,
                normUnitPrice: null,
                normUnit: "kg",
                isAmbiguous: false,
                quoteComp: "quote_required",
                pricingWarn: "Price quote required from supplier.",
                missingComp: ["unit_price", "delivery_fee", "tax_confirmation"],
                extraNotes: ["Published price is not available; merchant quote required."]
            );
        }

        // Check for ambiguous / missing unit
        $unitClass = self::classifyUnit($origUnit);
        if ($origUnit === null || $unitClass === 'discrete' || $unitClass === 'ambiguous') {
            return $formatReturn(
                matSubtotal: null,
                purchasedKgVal: null,
                surplusKgVal: null,
                pkgCount: null,
                normUnitPrice: null,
                normUnit: null,
                isAmbiguous: true,
                quoteComp: "unit_unconfirmed_snapshot",
                pricingWarn: "Pricing unit ('" . ($originalUnit ?: "unspecified") . "') is ambiguous or unconfirmed for bulk ordering. Merchant quote required.",
                missingComp: ["unit_of_measure", "delivery_fee", "tax_confirmation"],
                extraNotes: ["Pricing unit ('" . ($originalUnit ?: "unspecified") . "') is ambiguous or unconfirmed on the source catalog; order total cannot be calculated automatically."]
            );
        }

        // Convert requested quantity to canonical kg
        if ($uReq !== "kg") {
            if (isset(self::MASS_UNITS_TO_KG[$uReq])) {
                $requiredKg = $req * (float)self::MASS_UNITS_TO_KG[$uReq];
            } elseif (isset(self::VOLUME_UNITS_TO_M3[$uReq])) {
                if ($density === null) {
                    return $formatReturn(
                        matSubtotal: null,
                        purchasedKgVal: null,
                        surplusKgVal: null,
                        pkgCount: null,
                        normUnitPrice: null,
                        normUnit: null,
                        isAmbiguous: true,
                        quoteComp: "bulk_density_missing",
                        pricingWarn: "Cannot convert volume ('$requestedUnit') to mass ('$originalUnit') without verified product bulk density.",
                        missingComp: ["bulk_density_kg_per_m3", "delivery_fee", "tax_confirmation"],
                        extraNotes: ["Cannot convert volume ('$requestedUnit') to mass without verified bulk density."]
                    );
                }
                $volM3 = $req * (float)self::VOLUME_UNITS_TO_M3[$uReq];
                $requiredKg = $volM3 * $density;
            }
        }

        $packageCount = null;
        $purchasedKg = $requiredKg;
        $surplusKg = 0.0;
        $normalizedPricePerKg = null;
        $materialSubtotal = null;
        $calcNotes = [];

        // A. Packaged materials (bags, sacks, or pack_mass_kg provided)
        if ($unitClass === 'packaged_mass' || $packKg !== null) {
            if ($packKg === null || $packKg <= 0.0) {
                return $formatReturn(
                    matSubtotal: null,
                    purchasedKgVal: null,
                    surplusKgVal: null,
                    pkgCount: null,
                    normUnitPrice: null,
                    normUnit: "kg",
                    isAmbiguous: true,
                    quoteComp: "pack_mass_missing",
                    pricingWarn: "Package mass (kg per bag) is unconfirmed; cannot compute whole bags needed for requested mass.",
                    missingComp: ["pack_mass_kg", "delivery_fee", "tax_confirmation"],
                    extraNotes: ["Package mass (kg per bag) is unconfirmed on the pricing snapshot; quote required."]
                );
            }

            $bagsNeeded = (int)ceil($requiredKg / $packKg);
            $packageCount = $bagsNeeded;
            $purchasedKg = $bagsNeeded * $packKg;
            $surplusKg = $purchasedKg - $requiredKg;
            $materialSubtotal = $bagsNeeded * $price;
            $normalizedPricePerKg = $packKg > 0 ? ($price / $packKg) : null;

            $calcNotes[] = sprintf(
                "Rounded %.2f kg up to %d whole %s (%.2f kg/bag) = %.2f kg purchased (%.2f kg surplus).",
                $requiredKg,
                $bagsNeeded,
                $bagsNeeded === 1 ? "bag" : "bags",
                $packKg,
                $purchasedKg,
                $surplusKg
            );
        }
        // B. Bulk mass (tonne, kg, short ton, long ton)
        elseif (isset(self::MASS_UNITS_TO_KG[$origUnit])) {
            $multiplier = (float)self::MASS_UNITS_TO_KG[$origUnit];
            $unitsPurchased = $requiredKg / $multiplier;
            $materialSubtotal = $unitsPurchased * $price;
            $normalizedPricePerKg = $price / $multiplier;
            $purchasedKg = $requiredKg;
            $surplusKg = 0.0;
            $calcNotes[] = sprintf(
                "Calculated for %.3f %s (%.2f kg) @ %.2f %s/%s.",
                $unitsPurchased,
                $originalUnit,
                $requiredKg,
                $price,
                $currency,
                $originalUnit
            );
        }
        // C. Volume units (m3, cy, litre)
        elseif (isset(self::VOLUME_UNITS_TO_M3[$origUnit])) {
            $multM3 = (float)self::VOLUME_UNITS_TO_M3[$origUnit];
            if ($density === null) {
                if ($origUnit === 'l' || $origUnit === 'liter' || $origUnit === 'litre') {
                    $density = 1000.0;
                    $calcNotes[] = "Applied standard liquid admixture density 1.0 kg/L for volume conversion.";
                } else {
                    return $formatReturn(
                        matSubtotal: null,
                        purchasedKgVal: null,
                        surplusKgVal: null,
                        pkgCount: null,
                        normUnitPrice: null,
                        normUnit: "m3",
                        isAmbiguous: true,
                        quoteComp: "bulk_density_missing",
                        pricingWarn: "Bulk density (kg/m³) is required to convert requested mass to volume ('$originalUnit').",
                        missingComp: ["bulk_density_kg_per_m3", "delivery_fee", "tax_confirmation"],
                        extraNotes: ["Cannot convert mass to volume without verified product-specific bulk density."]
                    );
                }
            }

            $volM3 = $requiredKg / $density;
            $volUnits = $volM3 / $multM3;
            $materialSubtotal = $volUnits * $price;
            $normalizedPricePerKg = ($density * $multM3) > 0 ? ($price / ($density * $multM3)) : null;
            $purchasedKg = $requiredKg;
            $surplusKg = 0.0;
            $calcNotes[] = sprintf(
                "Converted %.2f kg to %.3f %s (bulk density: %.0f kg/m³) @ %.2f %s/%s.",
                $requiredKg,
                $volUnits,
                $originalUnit,
                $density,
                $price,
                $currency,
                $originalUnit
            );
        } else {
            return $formatReturn(
                matSubtotal: null,
                purchasedKgVal: null,
                surplusKgVal: null,
                pkgCount: null,
                normUnitPrice: null,
                normUnit: null,
                isAmbiguous: true,
                quoteComp: "unsupported_unit",
                pricingWarn: "Unsupported pricing unit: '$originalUnit'.",
                missingComp: ["unit_of_measure", "delivery_fee", "tax_confirmation"],
                extraNotes: ["Unsupported pricing unit: '$originalUnit'."]
            );
        }

        // Quantity tier validation
        $tierQty = $packageCount !== null ? $packageCount : $requiredKg;
        if ($quantityMin !== null && $quantityMin > 0 && $tierQty < $quantityMin) {
            $tierMatches = false;
            $calcNotes[] = sprintf("Bulk quantity tier requires minimum %d %s (requested order is %s).", $quantityMin, ($originalUnit ?: "units"), $tierQty);
        }
        if ($quantityMax !== null && $quantityMax > 0 && $tierQty > $quantityMax) {
            $tierMatches = false;
            $calcNotes[] = sprintf("Quantity tier applies up to %d %s (requested order is %s).", $quantityMax, ($originalUnit ?: "units"), $tierQty);
        }

        // Delivery fee evaluation
        $delivInc = strtolower(trim($deliveryInclusion ?: "excluded"));
        $calcDeliveryFee = null;
        if (in_array($delivInc, ["included", "delivered"], true)) {
            $calcDeliveryFee = 0.0;
            $calcNotes[] = "Delivery is included in the quoted unit price (not added twice).";
        } elseif ($fixedDeliveryFee !== null || ($perKmRate !== null && $distanceKm !== null)) {
            $dFee = 0.0;
            if ($fixedDeliveryFee !== null) {
                $dFee += (float)$fixedDeliveryFee;
            }
            if ($perKmRate !== null && $distanceKm !== null) {
                $dFee += (float)$perKmRate * (float)$distanceKm;
            }
            $calcDeliveryFee = $dFee;
        } else {
            $missingComponents[] = "delivery_fee";
        }

        // VAT evaluation
        $calcVatAmount = null;
        $subtotalBeforeVat = $materialSubtotal + ($calcDeliveryFee ?? 0.0);
        if ($taxIncluded === true) {
            $calcVatAmount = 0.0;
            $calcNotes[] = "Quoted price is inclusive of tax/VAT.";
        } elseif ($vatRatePct !== null && is_numeric($vatRatePct) && (float)$vatRatePct >= 0) {
            $vatRate = (float)$vatRatePct / 100.0;
            $calcVatAmount = $subtotalBeforeVat * $vatRate;
        } else {
            $missingComponents[] = "vat_confirmation";
        }

        return $formatReturn(
            matSubtotal: $materialSubtotal,
            purchasedKgVal: $purchasedKg,
            surplusKgVal: $surplusKg,
            pkgCount: $packageCount,
            normUnitPrice: $normalizedPricePerKg,
            normUnit: "kg",
            isAmbiguous: false,
            quoteComp: "published_snapshot_estimate",
            pricingWarn: null,
            missingComp: $missingComponents,
            extraNotes: $calcNotes,
            calcDelivFee: $calcDeliveryFee,
            calcVat: $calcVatAmount
        );
    }
}

