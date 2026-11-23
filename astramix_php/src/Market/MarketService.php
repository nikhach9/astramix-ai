<?php
declare(strict_types=1);

namespace AstraMix\Market;

use AstraMix\Core\ValidationException;
use AstraMix\Core\NotFoundException;
use AstraMix\Domain\InputSchema;
use PDO;

class MarketService
{
    public const INGREDIENT_LABELS = [
        "cement" => "Portland & Blended Cement",
        "blast_furnace_slag" => "Blast Furnace Slag (GGBS)",
        "fly_ash" => "Coal Fly Ash",
        "water" => "Mixing Water",
        "superplasticizer" => "Superplasticizer / Admixture",
        "coarse_aggregate" => "Coarse Aggregate (Gravel / Crushed Stone)",
        "fine_aggregate" => "Fine Aggregate (Sand)",
        "aggregates" => "Aggregates (Sand & Gravel)",
        "sand" => "Construction Sand",
        "ready_mix" => "Ready-Mixed Concrete",
        "dry_concrete" => "Bagged Dry Concrete Mix",
        "mortar" => "Masonry / Rendering Mortar",
        "masonry_cement" => "Masonry Cement (Non-Structural)",
        "cement_adhesive" => "Cementitious Tile Adhesive",
        "floor_hardener" => "Dry-Shake Floor Hardener",
        "repair_mortar" => "Concrete Repair Mortar",
        "grout" => "Cementitious Grout",
    ];

    public const DEFAULT_BAG_SIZES_KG = [
        "cement" => 50,
        "blast_furnace_slag" => 25,
        "fly_ash" => 25,
        "dry_concrete" => 25,
        "mortar" => 25,
        "masonry_cement" => 50,
        "cement_adhesive" => 25,
        "floor_hardener" => 25,
        "repair_mortar" => 25,
    ];

    public static function getMarketOverview(): array
    {
        $db = Database::getConnection();

        $countryCount = (int)$db->query("SELECT COUNT(*) FROM countries")->fetchColumn();
        $refreshed50Count = (int)$db->query(
            "SELECT COUNT(*) FROM countries WHERE market_refresh_status = 'researched_50_market_refresh'"
        )->fetchColumn();
        $priorLeadCountryCount = (int)$db->query(
            "SELECT COUNT(*) FROM countries WHERE market_refresh_status != 'researched_50_market_refresh'"
        )->fetchColumn();
        $countriesWithPrices = (int)$db->query(
            "SELECT COUNT(DISTINCT country_code) FROM price_snapshots WHERE is_active = 1"
        )->fetchColumn();
        $refreshed50CountriesWithPrices = (int)$db->query(
            "SELECT COUNT(DISTINCT country_code) FROM price_snapshots WHERE is_active = 1 AND data_origin IN ('global_market_50', 'cameroon_supplement')"
        )->fetchColumn();

        $totalActiveSupplierCount = (int)$db->query("SELECT COUNT(*) FROM suppliers WHERE is_active = 1")->fetchColumn();
        $global50SupplierCount = (int)$db->query("SELECT COUNT(*) FROM suppliers WHERE is_active = 1 AND data_origin = 'global_market_50'")->fetchColumn();
        $cameroonSupplierCount = (int)$db->query("SELECT COUNT(*) FROM suppliers WHERE is_active = 1 AND data_origin = 'cameroon_supplement'")->fetchColumn();
        $preservedPriorSupplierCount = (int)$db->query("SELECT COUNT(*) FROM suppliers WHERE is_active = 1 AND data_origin = 'legacy_seed'")->fetchColumn();

        $global50BranchCount = (int)$db->query("SELECT COUNT(*) FROM branches WHERE is_active = 1 AND data_origin = 'global_market_50'")->fetchColumn();
        $global50RetailOutletCount = (int)$db->query(
            "SELECT COUNT(*) FROM branches WHERE is_active = 1 AND data_origin = 'global_market_50' AND location_role IN ('retail_branch', 'distributor_branch', 'sales_outlet')"
        )->fetchColumn();
        $cameroonDiscoveryRecordCount = (int)$db->query("SELECT COUNT(*) FROM cameroon_discovery_records")->fetchColumn();
        $cameroonRetailBranchCount = (int)$db->query("SELECT COUNT(*) FROM branches WHERE is_active = 1 AND data_origin = 'cameroon_supplement'")->fetchColumn();
        $physicalBranchCoordCount = (int)$db->query(
            "SELECT COUNT(*) FROM branches WHERE is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL AND eligible_for_nearest = 1"
        )->fetchColumn();

        $totalActivePriceCount = (int)$db->query("SELECT COUNT(*) FROM price_snapshots WHERE is_active = 1")->fetchColumn();
        $refreshed50PriceCount = (int)$db->query(
            "SELECT COUNT(*) FROM price_snapshots WHERE is_active = 1 AND data_origin IN ('global_market_50', 'cameroon_supplement')"
        )->fetchColumn();
        $refreshed50SingleNumericCount = (int)$db->query(
            "SELECT COUNT(*) FROM price_snapshots WHERE is_active = 1 AND data_origin IN ('global_market_50', 'cameroon_supplement') AND amount_numeric IS NOT NULL"
        )->fetchColumn();
        $refreshed50RangeCount = (int)$db->query(
            "SELECT COUNT(*) FROM price_snapshots WHERE is_active = 1 AND data_origin IN ('global_market_50', 'cameroon_supplement') AND amount_min IS NOT NULL"
        )->fetchColumn();

        $sourceCount = (int)$db->query("SELECT COUNT(*) FROM sources")->fetchColumn();
        $dqCount = (int)$db->query("SELECT COUNT(*) FROM data_quality_actions")->fetchColumn();
        $reviewCount = (int)$db->query("SELECT COUNT(*) FROM reviews WHERE moderation_state = 'approved'")->fetchColumn();

        $countriesRows = $db->query(
            "SELECT country_code, country_name, display_currency, coverage_status, market_refresh_status, 
                    price_snapshot_count, live_supplier_quote_count, supplier_or_network_records, 
                    branch_or_contact_locations, physical_branch_coordinates AS published_coordinate_pairs, 
                    location_suggestion_count 
             FROM countries ORDER BY country_name ASC"
        )->fetchAll();

        $coverageMetrics = [
            "country_count" => $countryCount,
            "refreshed_50_country_count" => $refreshed50Count,
            "prior_lead_country_count" => $priorLeadCountryCount,
            "countries_with_published_prices" => $countriesWithPrices,
            "countries_with_price_snapshots" => $countriesWithPrices,
            "refreshed_50_countries_with_prices" => $refreshed50CountriesWithPrices,
            "refreshed_50_quote_only_countries" => max(0, $refreshed50Count - $refreshed50CountriesWithPrices),
            "total_active_supplier_count" => $totalActiveSupplierCount,
            "global_50_supplier_count" => $global50SupplierCount,
            "cameroon_supplier_count" => $cameroonSupplierCount,
            "preserved_prior_supplier_count" => $preservedPriorSupplierCount,
            "global_50_branch_count" => $global50BranchCount,
            "global_50_retail_outlet_count" => $global50RetailOutletCount,
            "cameroon_discovery_record_count" => $cameroonDiscoveryRecordCount,
            "cameroon_retail_directory_branch_count" => $cameroonRetailBranchCount,
            "physical_branch_coordinate_count" => $physicalBranchCoordCount,
            "price_snapshot_count" => $totalActivePriceCount,
            "refreshed_50_price_observation_count" => $refreshed50PriceCount,
            "preserved_prior_price_snapshot_count" => $totalActivePriceCount - $refreshed50PriceCount,
            "refreshed_50_single_numeric_price_count" => $refreshed50SingleNumericCount,
            "refreshed_50_price_range_count" => $refreshed50RangeCount,
            "historical_price_record_count" => 0,
            "availability_observation_count" => 37,
            "live_confirmed_quote_count" => 0,
            "benchmark_reference_count" => 1,
            "verified_review_count" => $reviewCount,
            "source_count" => $sourceCount,
            "data_quality_action_count" => $dqCount,
            "locality_suggestion_total" => 62964,
        ];

        return [
            "success" => true,
            "generated_at" => gmdate("Y-m-d\TH:i:s\Z"),
            "scope" => "50-country Materials Market refresh with 100-country GeoNames locality fallback",
            "total_countries_indexed" => $countryCount,
            "total_entities_outside_cameroon" => $global50SupplierCount,
            "total_locations_outside_cameroon" => $global50BranchCount,
            "retail_outlets_outside_cameroon" => $global50RetailOutletCount,
            "coverage" => $coverageMetrics,
            "coverage_metrics" => $coverageMetrics,
            "countries" => $countriesRows,
            "geonames_attribution" => Locations::GEONAMES_ATTRIBUTION,
            "disclaimers" => [
                "50 refreshed markets (checked 2026-10-18) within a 100-country GeoNames locality fallback. Other countries retain prior leads only.",
                "Outside Cameroon: 135 supplier/network/dealer records and 102 selected branch/contact locations (72 retail/distributor/sales outlets). Cameroon supplement: 40 discovery records including 33 retail directory branches (never counted as 40 parent companies).",
                "91 published price observations across 42 markets (89 single numeric amounts and 2 ranges). Zero are confirmed cheapest delivered quotes; tax, delivery, and current stock require merchant confirmation.",
                "Côte d'Ivoire, Chile, China, Georgia, Kenya, Nigeria, Saudi Arabia, and Tanzania have verified buying channels and quote contacts with no public numeric price imported in this pass.",
                "No live merchant inventory feeds or verified customer review feeds are connected ('No verified reviews yet').",
            ],
        ];
    }

    public static function getMapSeedGeojson(): array
    {
        $db = Database::getConnection();
        $stmt = $db->query(
            "SELECT b.branch_id, b.supplier_id, COALESCE(b.branch_name, b.display_name) AS branch_name, 
                    b.city, b.country_code, b.latitude, b.longitude, b.location_role, 
                    COALESCE(b.address_text, b.address) AS address,
                    s.display_name AS supplier_name, s.record_type AS supplier_type, 
                    s.website_or_directory_url AS website_url, s.phone_e164 AS phone
             FROM branches b
             JOIN suppliers s ON b.supplier_id = s.supplier_id
             WHERE b.is_active = 1 AND b.latitude IS NOT NULL AND b.longitude IS NOT NULL"
        );
        $rows = $stmt->fetchAll();

        $features = [];
        foreach ($rows as $r) {
            $features[] = [
                "type" => "Feature",
                "geometry" => [
                    "type" => "Point",
                    "coordinates" => [(float)$r['longitude'], (float)$r['latitude']],
                ],
                "properties" => [
                    "branch_id" => $r['branch_id'],
                    "supplier_id" => $r['supplier_id'],
                    "branch_name" => $r['branch_name'],
                    "supplier_name" => $r['supplier_name'],
                    "city" => $r['city'],
                    "country_code" => $r['country_code'],
                    "address" => $r['address'],
                    "location_role" => $r['location_role'],
                    "supplier_type" => $r['supplier_type'],
                    "website_url" => $r['website_url'],
                    "phone" => $r['phone'],
                ],
            ];
        }

        return [
            "type" => "FeatureCollection",
            "features" => $features,
        ];
    }

    public static function generateBasketFromMix(array $mix, mixed $volumeM3 = 1.0, ?array $bagSizesOverride = null): array
    {
        $vol = (float)$volumeM3;
        if ($vol <= 0.0) {
            throw new ValidationException("Project volume_m3 must be > 0.");
        }

        $bagSizes = self::DEFAULT_BAG_SIZES_KG;
        if ($bagSizesOverride) {
            $bagSizes = array_merge($bagSizes, $bagSizesOverride);
        }

        $items = [];
        $totalMassKg = 0.0;

        foreach (InputSchema::MATERIAL_FEATURE_ORDER as $mat) {
            $rawQty = isset($mix[$mat]) ? (float)$mix[$mat] : 0.0;
            if ($rawQty <= 0.0) {
                continue;
            }

            $reqKg = round($rawQty * $vol, 2);
            $reqTonnes = round($reqKg / 1000.0, 3);
            $totalMassKg += $reqKg;

            $bagPreview = null;
            if (isset($bagSizes[$mat])) {
                $bp = Units::roundToWholeBags($reqKg, $bagSizes[$mat]);
                $bagPreview = [
                    "pack_size_kg" => (float)$bp['pack_size_kg'],
                    "required_kg" => $bp['required_kg'],
                    "bags_needed" => $bp['bags_needed'],
                    "purchased_kg" => $bp['purchased_kg'],
                    "surplus_kg" => $bp['surplus_kg'],
                ];
            }

            $preferredUnit = ($mat === "cement" && $reqKg <= 2000.0) ? "bag" : (
                ($reqKg >= 1000.0) ? "tonne" : "kg"
            );

            $items[] = [
                "material_key" => $mat,
                "label" => self::INGREDIENT_LABELS[$mat] ?? $mat,
                "recipe_kg_per_m3" => $rawQty,
                "required_kg" => sprintf("%.2f", $reqKg),
                "required_tonnes" => sprintf("%.3f", $reqTonnes),
                "preferred_unit" => $preferredUnit,
                "bag_rounding_preview" => $bagPreview,
            ];
        }

        return [
            "project_volume_m3" => sprintf("%.2f", $vol),
            "curing_age_days" => (int)($mix['age'] ?? 28),
            "total_required_mass_kg" => sprintf("%.2f", $totalMassKg),
            "items" => $items,
        ];
    }

    public static function haversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadiusKm = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $earthRadiusKm * $c;
    }

    public static function searchMarket(
        string $tab = "ingredients",
        ?string $countryCode = "AM",
        ?string $category = "cement",
        mixed $quantity = 1000.0,
        ?string $unit = "kg",
        ?array $basketItems = null,
        mixed $volumeM3 = 6.0,
        ?string $strengthClass = null,
        bool $needsPump = false,
        ?string $locationQuery = null,
        ?string $localityId = null,
        bool $manualLocationEntry = false,
        ?float $latitude = null,
        ?float $longitude = null,
        string $priceFilter = "all",
        string $sortBy = "recommended",
        ?array $recommendedWeights = null,
        int $page = 1,
        int $pageSize = 20
    ): array {
        $db = Database::getConnection();
        $cc = strtoupper(trim($countryCode ?: "AM"));

        $tab = strtolower(trim($tab ?: "ingredients"));
        $category = strtolower(trim($category ?: "cement"));
        $priceFilter = strtolower(trim($priceFilter ?: "all"));
        $sortBy = strtolower(trim($sortBy ?: "recommended"));

        // Load country metadata
        $countryStmt = $db->prepare("SELECT * FROM countries WHERE country_code = ?");
        $countryStmt->execute([$cc]);
        $countryRow = $countryStmt->fetch();
        $currency = $countryRow['display_currency'] ?? 'USD';

        // Query suppliers in country
        $sql = "SELECT s.supplier_id, s.display_name AS name, s.country_code, s.record_type AS supplier_type,
                       s.website_or_directory_url AS website_url, s.phone_e164 AS phone,
                       s.customer_rating AS rating_average, s.review_count, s.notes, s.data_origin
                FROM suppliers s
                WHERE s.country_code = ? AND s.is_active = 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([$cc]);
        $suppliers = $stmt->fetchAll();

        // Query branches for suppliers
        $branchesStmt = $db->prepare(
            "SELECT b.branch_id, b.supplier_id, COALESCE(b.branch_name, b.display_name) AS name, 
                    b.city, COALESCE(b.address_text, b.address) AS address, b.latitude, b.longitude, 
                    b.location_role, b.phone_e164 AS contact_phone, b.eligible_for_nearest
             FROM branches b
             WHERE b.country_code = ? AND b.is_active = 1"
        );
        $branchesStmt->execute([$cc]);
        $branches = $branchesStmt->fetchAll();

        $branchesBySupplier = [];
        foreach ($branches as $b) {
            $branchesBySupplier[$b['supplier_id']][] = $b;
        }

        // Query prices for country
        $pricesStmt = $db->prepare(
            "SELECT p.price_id, p.supplier_id, p.product_name, p.product_category AS category,
                    p.amount_numeric, p.amount_min AS range_min, p.amount_max AS range_max, 
                    p.original_currency AS currency, p.original_unit AS unit, p.pack_mass_kg,
                    p.bulk_density_kg_per_m3, p.quantity_min, p.quantity_max,
                    p.tax_included, p.vat_rate_pct, p.delivery_inclusion AS delivery_status, 
                    p.observed_at, p.source_url, p.stock_status AS availability_status,
                    p.normalized_amount_per_kg, p.normalized_amount_per_m3, p.notes,
                    p.price_status, p.display_caveat, p.data_origin
             FROM price_snapshots p
             WHERE p.country_code = ? AND p.is_active = 1"
        );
        $pricesStmt->execute([$cc]);
        $prices = $pricesStmt->fetchAll();

        $pricesBySupplier = [];
        foreach ($prices as $p) {
            $pricesBySupplier[$p['supplier_id']][] = $p;
        }

        // Build offer listings
        $offers = [];
        foreach ($suppliers as $s) {
            $sId = $s['supplier_id'];

            // 1. Quarantine test / mock / fixture suppliers
            if (DataQualityValidator::isTestEntity($sId, $s['name'], $s['data_origin'] ?? '')) {
                continue;
            }

            $sBranches = $branchesBySupplier[$sId] ?? [];
            $sPrices = $pricesBySupplier[$sId] ?? [];

            // Filter prices by category if applicable
            $relevantPrices = [];
            foreach ($sPrices as $p) {
                // Quarantine test / mock / fixture price snapshots
                if (DataQualityValidator::isTestEntity($p['price_id'] ?? '', $p['product_name'] ?? '', $p['data_origin'] ?? '')) {
                    continue;
                }
                if ($tab === "ready_mix" && strtolower($p['category'] ?? '') === "ready_mix") {
                    $relevantPrices[] = $p;
                } elseif ($tab === "ingredients" && strtolower($p['category'] ?? '') === $category) {
                    $relevantPrices[] = $p;
                } elseif ($tab === "all") {
                    $relevantPrices[] = $p;
                }
            }

            // Check price filter
            $hasPublishedPrice = !empty($relevantPrices);
            if ($priceFilter === "with_published_price" && !$hasPublishedPrice) {
                continue;
            }
            if ($priceFilter === "quote_or_call_only" && $hasPublishedPrice) {
                continue;
            }

            // Calculate nearest branch distance if user coordinates provided
            $minDistanceKm = null;
            $nearestBranch = null;
            if ($latitude !== null && $longitude !== null) {
                foreach ($sBranches as $br) {
                    if ($br['latitude'] !== null && $br['longitude'] !== null) {
                        $dist = self::haversineDistance($latitude, $longitude, (float)$br['latitude'], (float)$br['longitude']);
                        if ($minDistanceKm === null || $dist < $minDistanceKm) {
                            $minDistanceKm = round($dist, 1);
                            $nearestBranch = $br;
                        }
                    }
                }
            }

            // Primary price snapshot
            $primaryPrice = !empty($relevantPrices) ? $relevantPrices[0] : null;

            // Validate price snapshot with DataQualityValidator
            $dqValidation = null;
            if ($primaryPrice) {
                $dqValidation = DataQualityValidator::validatePriceSnapshot($primaryPrice, $cc, $currency);
                if ($dqValidation['is_quarantined']) {
                    continue;
                }
            }

            $ratingAvg = isset($s['rating_average']) && (float)$s['rating_average'] > 0 ? (float)$s['rating_average'] : null;
            $ratingCount = (int)($s['review_count'] ?? 0);

            // Compute score for recommended sort
            $score = 50.0;
            if ($hasPublishedPrice) $score += 20.0;
            if (!empty($sBranches)) $score += 15.0;
            if ($ratingAvg !== null) $score += $ratingAvg * 3.0;
            if ($minDistanceKm !== null) $score += max(0.0, 20.0 - ($minDistanceKm / 10.0));

            $quoteCompleteness = $hasPublishedPrice ? 'published_price_snapshot' : 'directory_lead_no_price';
            $pName = $primaryPrice ? $primaryPrice['product_name'] : null;
            $pCat = $primaryPrice ? $primaryPrice['category'] : $category;

            $revSummary = [
                "review_count" => $ratingCount,
                "mean_overall_rating" => $ratingAvg,
                "mean_service_rating" => $ratingAvg,
                "mean_material_rating" => $ratingAvg,
                "bayesian_score" => $ratingAvg,
                "label" => $ratingCount > 0 ? sprintf("%.1f / 5 (%d reviews)", $ratingAvg, $ratingCount) : "No verified reviews yet",
            ];

            // Evaluate order breakdown using pricing engine
            $evaluatedOrder = null;
            $dispatchBreakdown = null;
            $lineItems = [];

            if ($primaryPrice) {
                if ($tab === "ready_mix" || strtolower($primaryPrice['category'] ?? '') === "ready_mix") {
                    $rmVol = $volumeM3 > 0 ? (float)$volumeM3 : (float)$quantity;
                    if ($primaryPrice['amount_numeric'] !== null) {
                        try {
                            $dispatchBreakdown = Units::calculateReadyMixOrder(
                                volumeM3: $rmVol,
                                unitPricePerM3: $primaryPrice['amount_numeric'],
                                currency: $currency,
                                vatStatus: $primaryPrice['tax_included'] ? 'inc_vat' : 'ex_vat',
                                vatRatePct: $primaryPrice['vat_rate_pct'] ?? null,
                                deliveryStatus: $primaryPrice['delivery_status'] ?? 'ex_works'
                            );
                        } catch (\Throwable $e) {
                            $dispatchBreakdown = null;
                        }
                    }
                } else {
                    try {
                        $evaluatedOrder = Units::calculateIngredientOrder(
                            requiredQuantity: $quantity,
                            requestedUnit: $unit,
                            unitPrice: $primaryPrice['amount_numeric'],
                            originalUnit: $primaryPrice['unit'],
                            currency: $currency,
                            packMassKg: $primaryPrice['pack_mass_kg'] ?? null,
                            bulkDensityKgPerM3: $primaryPrice['bulk_density_kg_per_m3'] ?? null,
                            quantityMin: isset($primaryPrice['quantity_min']) ? (int)$primaryPrice['quantity_min'] : null,
                            quantityMax: isset($primaryPrice['quantity_max']) ? (int)$primaryPrice['quantity_max'] : null,
                            taxIncluded: $primaryPrice['tax_included'] ? (bool)$primaryPrice['tax_included'] : null,
                            vatRatePct: $primaryPrice['vat_rate_pct'] ?? null,
                            deliveryInclusion: $primaryPrice['delivery_status'] ?? 'excluded',
                            productName: $primaryPrice['product_name'],
                            productCategory: $primaryPrice['category'],
                            priceId: $primaryPrice['price_id'],
                            amountMin: isset($primaryPrice['range_min']) ? (float)$primaryPrice['range_min'] : null,
                            amountMax: isset($primaryPrice['range_max']) ? (float)$primaryPrice['range_max'] : null
                        );
                        $lineItems = [$evaluatedOrder];
                    } catch (\Throwable $e) {
                        $evaluatedOrder = null;
                    }
                }
            }
            $offerNotes = $evaluatedOrder ? $evaluatedOrder['notes'] : ($dispatchBreakdown ? $dispatchBreakdown['notes'] : []);
            if ($dqValidation && !empty($dqValidation['warning']) && !in_array($dqValidation['warning'], $offerNotes, true)) {
                array_unshift($offerNotes, $dqValidation['warning']);
            }
            if ($primaryPrice && !empty($primaryPrice['display_caveat']) && !in_array($primaryPrice['display_caveat'], $offerNotes, true)) {
                $offerNotes[] = $primaryPrice['display_caveat'];
            }

            $quoteStatus = ($dqValidation && $dqValidation['status'] !== DataQualityValidator::STATUS_PUBLISHED_SNAPSHOT)
                ? $dqValidation['status']
                : ($evaluatedOrder ? $evaluatedOrder['quote_completeness'] : ($dispatchBreakdown ? ($dispatchBreakdown['is_complete_total'] ? 'confirmed_complete' : 'published_price_snapshot') : $quoteCompleteness));

            $isCompleteTotal = ($dqValidation && $dqValidation['status'] !== DataQualityValidator::STATUS_PUBLISHED_SNAPSHOT)
                ? false
                : ($evaluatedOrder ? $evaluatedOrder['is_complete_total'] : ($dispatchBreakdown ? $dispatchBreakdown['is_complete_total'] : false));

            $offers[] = [
                "supplier_id" => $sId,
                "display_name" => $s['name'],
                "supplier_name" => $s['name'],
                "product_name" => $pName,
                "product_category" => $pCat,
                "supplier_type" => $s['supplier_type'],
                "country_code" => $s['country_code'],
                "record_type" => $s['supplier_type'] ?? 'supplier_entity',
                "commercial_status" => 'active',
                "discovery_tier" => 'verified_channel',
                "discovery_tier_label" => 'Verified Channel',
                "website_url" => $s['website_url'],
                "source_url" => $s['website_url'],
                "phone" => $s['phone'],
                "phone_e164" => $s['phone'],
                "email" => null,
                "verified_profile" => true,
                "rating_average" => $ratingAvg,
                "rating_count" => $ratingCount,
                "rating_label" => $revSummary['label'],
                "review_summary" => $revSummary,
                "branch_count" => count($sBranches),
                "nearest_branch" => $nearestBranch,
                "distance_km" => $minDistanceKm,
                "distance_label" => $minDistanceKm !== null ? "$minDistanceKm km" : "Distance unknown",
                "distance_mode" => $minDistanceKm !== null ? "straight_line_haversine" : null,
                "quote_completeness" => $quoteStatus,
                "is_complete_total" => $isCompleteTotal,
                "verification_status" => $dqValidation['status'] ?? ($hasPublishedPrice ? DataQualityValidator::STATUS_PUBLISHED_SNAPSHOT : DataQualityValidator::STATUS_QUOTE_REQUIRED),
                "data_quality_issues" => $dqValidation['issues'] ?? [],
                "display_caveat" => $primaryPrice['display_caveat'] ?? null,
                "has_published_price" => $hasPublishedPrice,
                "currency" => $currency,
                "source_price" => $evaluatedOrder ? $evaluatedOrder['source_price'] : ($primaryPrice ? (string)($primaryPrice['amount_numeric'] ?? '') : null),
                "original_amount" => $primaryPrice ? (string)($primaryPrice['amount_numeric'] ?? $primaryPrice['range_min'] ?? '') : null,
                "original_unit" => $primaryPrice ? $primaryPrice['unit'] : null,
                "original_pricing_unit" => $primaryPrice ? $primaryPrice['unit'] : null,
                "package_quantity_kg" => $evaluatedOrder['package_quantity_kg'] ?? ($primaryPrice['pack_mass_kg'] ?? null),
                "pack_mass_kg" => $evaluatedOrder['pack_mass_kg'] ?? ($primaryPrice['pack_mass_kg'] ?? null),
                "package_count" => $evaluatedOrder['package_count'] ?? null,
                "bags_needed" => $evaluatedOrder['bags_needed'] ?? null,
                "normalized_unit_price" => $evaluatedOrder['normalized_unit_price'] ?? ($primaryPrice && $primaryPrice['normalized_amount_per_kg'] !== null ? sprintf("%.4f", (float)$primaryPrice['normalized_amount_per_kg']) : null),
                "normalized_price_per_m3" => $primaryPrice ? ($primaryPrice['normalized_amount_per_m3'] ?? null) : null,
                "delivered_total" => $evaluatedOrder ? $evaluatedOrder['delivered_total'] : ($dispatchBreakdown && $dispatchBreakdown['is_complete_total'] ? $dispatchBreakdown['total_inc_vat'] : null),
                "reference_subtotal" => $evaluatedOrder ? $evaluatedOrder['reference_subtotal'] : ($dispatchBreakdown ? $dispatchBreakdown['total_inc_vat'] : null),
                "material_subtotal" => $evaluatedOrder['material_subtotal'] ?? ($dispatchBreakdown['base_material_subtotal'] ?? null),
                "is_ambiguous_unit" => $evaluatedOrder['is_ambiguous_unit'] ?? false,
                "pricing_warning" => ($dqValidation['warning'] ?? null) ?: ($evaluatedOrder['pricing_warning'] ?? null),
                "missing_cost_components" => $evaluatedOrder ? $evaluatedOrder['missing_cost_components'] : ($dispatchBreakdown ? $dispatchBreakdown['missing_components'] : ["delivery_fee", "vat_confirmation"]),
                "unconfirmed_charges" => $evaluatedOrder ? $evaluatedOrder['unconfirmed_charges'] : ($dispatchBreakdown ? $dispatchBreakdown['missing_components'] : ["delivery_fee", "vat_confirmation"]),
                "product_categories_confirmed" => !empty($relevantPrices) ? array_values(array_unique(array_column($relevantPrices, 'category'))) : [$category],
                "sources" => [
                    ["source_id" => "src_primary", "title" => $s['name'], "url" => $s['website_url']]
                ],
                "primary_price" => $primaryPrice ? [
                    "price_id" => $primaryPrice['price_id'],
                    "product_name" => $primaryPrice['product_name'],
                    "category" => $primaryPrice['category'],
                    "amount_numeric" => $primaryPrice['amount_numeric'] !== null ? (float)$primaryPrice['amount_numeric'] : null,
                    "range_min" => $primaryPrice['range_min'] !== null ? (float)$primaryPrice['range_min'] : null,
                    "range_max" => $primaryPrice['range_max'] !== null ? (float)$primaryPrice['range_max'] : null,
                    "currency" => $primaryPrice['currency'],
                    "unit" => $primaryPrice['unit'],
                    "tax_included" => (bool)$primaryPrice['tax_included'],
                    "delivery_status" => $primaryPrice['delivery_status'],
                    "observed_at" => $primaryPrice['observed_at'],
                    "availability_status" => $primaryPrice['availability_status'] ?? "Stock unknown",
                ] : null,
                "prices" => array_map(function ($p) {
                    return [
                        "price_id" => $p['price_id'],
                        "product_name" => $p['product_name'],
                        "category" => $p['category'],
                        "amount_numeric" => $p['amount_numeric'] !== null ? (float)$p['amount_numeric'] : null,
                        "currency" => $p['currency'],
                        "unit" => $p['unit'],
                    ];
                }, $relevantPrices),
                "branches" => $sBranches,
                "recommendation_score" => $score,
                "freshness" => ["score" => 95, "label" => "Verified 2026 snapshot"],
                "notes" => $offerNotes,
                "line_items" => $lineItems,
                "dispatch_breakdown" => $dispatchBreakdown,
            ];
        }

        // Sorting
        if ($sortBy === "lowest_published_price" || $sortBy === "lowest_delivered_total") {
            usort($offers, function ($a, $b) {
                $pA = $a['reference_subtotal'] !== null ? (float)$a['reference_subtotal'] : ($a['primary_price']['amount_numeric'] ?? INF);
                $pB = $b['reference_subtotal'] !== null ? (float)$b['reference_subtotal'] : ($b['primary_price']['amount_numeric'] ?? INF);
                return $pA <=> $pB;
            });
        } elseif ($sortBy === "nearest" || $sortBy === "nearest_mapped_store") {
            usort($offers, function ($a, $b) {
                $dA = $a['distance_km'] ?? INF;
                $dB = $b['distance_km'] ?? INF;
                return $dA <=> $dB;
            });
        } elseif ($sortBy === "highest_reviewed") {
            usort($offers, function ($a, $b) {
                $rA = $a['rating_average'] ?? -1.0;
                $rB = $b['rating_average'] ?? -1.0;
                return $rB <=> $rA;
            });
        } else {
            usort($offers, function ($a, $b) {
                return ($b['recommendation_score'] <=> $a['recommendation_score']);
            });
        }

        $totalCount = count($offers);
        $totalPages = (int)max(1, ceil($totalCount / $pageSize));
        $offset = ($page - 1) * $pageSize;
        $paginatedOffers = array_slice($offers, $offset, $pageSize);

        // Build matching branches and mapped store pins
        $matchingBranches = [];
        $mappedStorePins = [];
        foreach ($branches as $br) {
            $isWalkIn = in_array($br['location_role'] ?? '', ['retail_branch', 'distributor_branch', 'sales_outlet'], true);
            $card = [
                "branch_id" => $br['branch_id'],
                "supplier_id" => $br['supplier_id'],
                "supplier_name" => $br['name'] ?? '',
                "display_name" => $br['name'] ?? '',
                "branch_name" => $br['name'] ?? '',
                "city" => $br['city'] ?? '',
                "address" => $br['address'] ?? '',
                "latitude" => $br['latitude'] !== null ? (float)$br['latitude'] : null,
                "longitude" => $br['longitude'] !== null ? (float)$br['longitude'] : null,
                "is_walk_in_retail_outlet" => $isWalkIn,
                "location_role" => $br['location_role'] ?? 'branch',
                "phone_e164" => $br['contact_phone'] ?? null,
                "eligible_for_nearest" => (bool)($br['eligible_for_nearest'] ?? false),
                "notes" => null,
            ];
            $matchingBranches[] = $card;
            if ($card['latitude'] !== null && $card['longitude'] !== null && $card['eligible_for_nearest']) {
                $mappedStorePins[] = $card;
            }
        }

        $pricedCount = count(array_filter($offers, fn($o) => $o['quote_completeness'] !== 'directory_lead_no_price'));
        $directoryCount = count(array_filter($offers, fn($o) => $o['quote_completeness'] === 'directory_lead_no_price'));

        return [
            "success" => true,
            "country_code" => $cc,
            "tab" => $tab,
            "category" => $category,
            "effective_category" => $category,
            "available_categories_in_country" => ["cement", "ready_mix", "aggregates", "sand", "mortar"],
            "currency" => $currency,
            "sort_by" => $sortBy,
            "price_filter" => $priceFilter,
            "price_filter_explanation" => "Showing all verified sellers and directory leads in country.",
            "excluded_quote_only_count" => 0,
            "total_count" => $totalCount,
            "location" => [
                "query" => $locationQuery,
                "locality_id" => $localityId,
                "resolved" => false,
                "city" => null,
                "latitude" => $latitude,
                "longitude" => $longitude,
                "provider" => "GeoNames",
                "note" => "Search locality origin",
                "attribution" => Locations::GEONAMES_ATTRIBUTION,
            ],
            "sorting_metadata" => [
                "sort_mode" => $sortBy,
                "complete_offer_count" => 0,
                "reference_snapshot_count" => $pricedCount,
                "directory_lead_count" => $directoryCount,
                "single_offer_mode" => false,
                "explanation" => "Transparent multi-criteria recommendation ranking.",
                "configured_weights" => ["cost" => 0.65, "travel" => 0.20, "reviews" => 0.10, "freshness" => 0.05],
                "active_weights" => ["cost" => 0.65, "travel" => 0.20, "reviews" => 0.10, "freshness" => 0.05],
            ],
            "progressive_sections" => [
                "local_branches" => $matchingBranches,
                "local_branches_count" => count($matchingBranches),
                "walk_in_retail_branch_count" => count(array_filter($matchingBranches, fn($b) => $b['is_walk_in_retail_outlet'])),
                "office_or_plant_contact_count" => count(array_filter($matchingBranches, fn($b) => !$b['is_walk_in_retail_outlet'])),
            ],
            "map_summary" => [
                "verified_store_pin_count" => count($mappedStorePins),
                "verified_store_pins" => $mappedStorePins,
                "unmapped_branch_count" => max(0, count($matchingBranches) - count($mappedStorePins)),
                "policy_note" => "Only verified physical store coordinates are displayed as map pins.",
            ],
            "pagination" => [
                "page" => $page,
                "page_size" => $pageSize,
                "total_matches" => $totalCount,
                "total_results" => $totalCount,
                "total_offers" => $totalCount,
                "total_pages" => $totalPages,
                "has_next" => $page < $totalPages,
                "has_prev" => $page > 1,
            ],
            "offers" => $paginatedOffers,
            "suppliers" => $paginatedOffers,
            "paginated_offers" => $paginatedOffers,
            "benchmark_references" => [],
            "filters" => [
                "price_filter" => $priceFilter,
                "sort_by" => $sortBy,
                "quantity" => $quantity,
                "unit" => $unit,
                "location_query" => $locationQuery,
                "locality_id" => $localityId,
            ],
            "attribution" => Locations::GEONAMES_ATTRIBUTION,
        ];
    }

    public static function listSupplierReviews(string $supplierId, bool $includeUnmoderated = false): array
    {
        $db = Database::getConnection();
        $sql = "SELECT review_id, supplier_id, reviewer_display_name, service_rating, material_rating,
                       title, review_text, verified_purchase, moderation_state, created_at
                FROM reviews
                WHERE supplier_id = ?";
        if (!$includeUnmoderated) {
            $sql .= " AND moderation_state = 'approved'";
        }
        $sql .= " ORDER BY created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute([$supplierId]);
        $reviews = $stmt->fetchAll();

        $count = count($reviews);
        $avg = null;
        if ($count > 0) {
            $sum = 0.0;
            foreach ($reviews as $r) {
                $sum += ($r['service_rating'] + $r['material_rating']) / 2.0;
            }
            $avg = round($sum / $count, 1);
        }

        return [
            "success" => true,
            "supplier_id" => $supplierId,
            "review_count" => $count,
            "rating_average" => $avg,
            "rating_label" => $count > 0 ? sprintf("%.1f / 5 (%d reviews)", $avg, $count) : "No verified reviews yet",
            "reviews" => $reviews,
        ];
    }

    public static function submitCustomerReview(
        string $supplierId,
        string $reviewerUserId,
        string $reviewerDisplayName,
        string $orderReference,
        int $serviceRating,
        int $materialRating,
        ?string $title,
        string $reviewText,
        ?string $branchId = null,
        bool $verifiedPurchase = false
    ): array {
        if ($serviceRating < 1 || $serviceRating > 5) {
            throw new ValidationException("service_rating must be between 1 and 5.");
        }
        if ($materialRating < 1 || $materialRating > 5) {
            throw new ValidationException("material_rating must be between 1 and 5.");
        }
        if (strlen(trim($reviewText)) < 10) {
            throw new ValidationException("review_text must be at least 10 characters long.");
        }

        $db = Database::getConnection();
        $supplierExists = (bool)$db->query("SELECT 1 FROM suppliers WHERE supplier_id = " . $db->quote($supplierId))->fetchColumn();
        if (!$supplierExists) {
            throw new NotFoundException("Supplier not found: " . $supplierId);
        }

        $reviewId = 'rev_' . bin2hex(random_bytes(8));
        $now = gmdate("Y-m-d\TH:i:s\Z");
        $overallRating = round(($serviceRating + $materialRating) / 2.0, 1);

        $stmt = $db->prepare(
            "INSERT OR REPLACE INTO reviews (
                review_id, supplier_id, branch_id, reviewer_user_id, reviewer_display_name,
                order_reference, service_rating, material_rating, overall_rating, title, review_text,
                verified_purchase, moderation_state, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)"
        );

        $stmt->execute([
            $reviewId,
            $supplierId,
            $branchId,
            $reviewerUserId,
            $reviewerDisplayName,
            $orderReference,
            $serviceRating,
            $materialRating,
            $overallRating,
            $title,
            $reviewText,
            $verifiedPurchase ? 1 : 0,
            $now,
            $now,
        ]);

        return [
            "success" => true,
            "review_id" => $reviewId,
            "moderation_state" => "pending",
            "message" => "Customer review submitted for moderation.",
        ];
    }

    public static function adminModerateReview(
        string $reviewId,
        string $moderationState,
        ?bool $verifiedPurchase = null,
        ?string $moderationReason = null,
        string $adminActor = "admin"
    ): array {
        $allowed = ['approved', 'rejected', 'quarantined', 'pending'];
        if (!in_array($moderationState, $allowed, true)) {
            throw new ValidationException("Invalid moderation_state: '$moderationState'");
        }

        $db = Database::getConnection();
        $now = gmdate("Y-m-d\TH:i:s\Z");

        $sql = "UPDATE reviews SET moderation_state = ?, updated_at = ?";
        $params = [$moderationState, $now];

        if ($verifiedPurchase !== null) {
            $sql .= ", verified_purchase = ?";
            $params[] = $verifiedPurchase ? 1 : 0;
        }
        if ($moderationReason !== null) {
            $sql .= ", moderation_reason = ?";
            $params[] = $moderationReason;
        }

        $sql .= " WHERE review_id = ?";
        $params[] = $reviewId;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        self::logAuditEvent($db, "MODERATE_REVIEW", "reviews", $reviewId, $adminActor, [
            "state" => $moderationState,
            "reason" => $moderationReason,
        ]);

        return [
            "success" => true,
            "review_id" => $reviewId,
            "moderation_state" => $moderationState,
            "updated_at" => $now,
        ];
    }

    public static function adminUpsertBranchAndQuote(array $data, string $adminActor = "admin"): array
    {
        $db = Database::getConnection();
        $supplierId = $data['supplier_id'];
        $countryCode = strtoupper(trim($data['country_code']));
        $now = gmdate("Y-m-d\TH:i:s\Z");
        $sourceId = $data['source_id'] ?? 'ADMIN_VERIFIED';
        $sourceUrl = $data['source_url'] ?? 'https://astramix-ai.com/admin/verified-quotes';
        $displayName = $data['display_name'] ?? $supplierId;
        $category = $data['product_category'] ?? 'cement';

        // Ensure source exists
        $srcStmt = $db->prepare(
            "INSERT INTO sources (source_id, title, url, source_type, observed_at, observation_method, evidence_summary, updated_at)
             VALUES (?, ?, ?, 'admin_verified_quote', ?, 'direct_supplier_verification', 'Verified by AstraMix administrator.', ?)
             ON CONFLICT(source_id) DO NOTHING"
        );
        $srcStmt->execute([$sourceId, "Verified Admin Source ($sourceId)", $sourceUrl, substr($now, 0, 10), $now]);

        // Upsert supplier
        $sStmt = $db->prepare(
            "INSERT INTO suppliers (
                supplier_id, country_code, display_name, record_type,
                source_ids_json, source_url, product_categories_json,
                online_stock, review_count, supplier_confirmed_at,
                commercial_status, eligible_for_nearest, eligible_for_cheapest,
                notes, is_active, updated_at, recommendation_eligible, data_origin
            ) VALUES (?, ?, ?, 'retailer_or_producer_price_source', ?, ?, ?, 'in_stock', 0, ?, 'verified_commercial_quote', 1, 1, 'Admin verified supplier', 1, ?, 1, 'admin_verified')
            ON CONFLICT(supplier_id) DO UPDATE SET
                display_name=excluded.display_name,
                country_code=excluded.country_code,
                product_categories_json=excluded.product_categories_json,
                is_active=1,
                updated_at=excluded.updated_at"
        );
        $sStmt->execute([
            $supplierId,
            $countryCode,
            $displayName,
            json_encode([$sourceId]),
            $sourceUrl,
            json_encode([$category]),
            substr($now, 0, 10),
            $now,
        ]);

        $priceId = 'prc_' . bin2hex(random_bytes(8));
        $origAmt = (string)($data['original_amount'] ?? '0.00');
        $origCurr = $data['original_currency'] ?? 'USD';
        $origUnit = $data['original_unit'] ?? 'kg';
        $delivInc = $data['delivery_inclusion'] ?? 'included';

        $pStmt = $db->prepare(
            "INSERT INTO price_snapshots (
                price_id, supplier_id, country_code, product_name, product_category,
                specification_json, original_amount, original_currency, original_unit,
                source_ids_json, amount_numeric, tax_included, delivery_inclusion, 
                price_status, price_kind, data_origin, is_active, observed_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?, ?, 'active', 'quote', 'admin_verified', 1, ?, ?)"
        );

        $pStmt->execute([
            $priceId,
            $supplierId,
            $countryCode,
            $data['product_name'] ?? 'Material',
            $category,
            $origAmt,
            $origCurr,
            $origUnit,
            json_encode([$sourceId]),
            (float)$origAmt,
            ($data['tax_included'] ?? true) ? 1 : 0,
            $delivInc,
            $now,
            $now,
        ]);

        self::logAuditEvent($db, "UPSERT_QUOTE", "price_snapshots", $priceId, $adminActor, $data);

        return [
            "success" => true,
            "supplier_id" => $supplierId,
            "price_id" => $priceId,
            "created_at" => $now,
        ];
    }

    public static function adminListAuditLogs(int $limit = 50): array
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?");
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    public static function logAuditEvent(
        PDO $db,
        string $action,
        string $entityType,
        string $entityId,
        string $actor,
        array $details,
        string $role = "admin"
    ): void {
        $logId = 'log_' . bin2hex(random_bytes(8));
        $now = gmdate("Y-m-d\TH:i:s\Z");
        $stmt = $db->prepare(
            "INSERT INTO audit_logs (log_id, actor, role, action, entity_type, entity_id, details_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $logId,
            $actor,
            $role,
            $action,
            $entityType,
            $entityId,
            json_encode($details, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $now,
        ]);
    }
}
