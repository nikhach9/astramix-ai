<?php
declare(strict_types=1);

namespace AstraMix\Controllers;

use AstraMix\Core\Request;
use AstraMix\Core\Response;
use AstraMix\Core\ValidationException;
use AstraMix\Market\Locations;
use AstraMix\Market\MarketService;
use AstraMix\Market\Units;

class MarketController
{
    public function suggestLocations(Request $request): Response
    {
        $country = (string)($request->getQueryParam('country') ?? $request->getQueryParam('country_code') ?? 'AM');
        $q = (string)($request->getQueryParam('q') ?? $request->getQueryParam('query') ?? '');
        $limit = (int)($request->getQueryParam('limit') ?? 8);

        $payload = Locations::getCountryLocationSuggestionPayload($country, $q, $limit);
        return Response::json($payload);
    }

    public function getOverview(Request $request): Response
    {
        $overview = MarketService::getMarketOverview();
        return Response::json($overview);
    }

    public function getMapSeed(Request $request): Response
    {
        $geojson = MarketService::getMapSeedGeojson();
        return Response::json($geojson);
    }

    public function basketFromMix(Request $request): Response
    {
        $body = $request->getJson();
        if (!$body || !isset($body['mix'])) {
            throw new ValidationException("Request body must contain 'mix' object.", [
                ["loc" => ["body", "mix"], "msg" => "Field required"]
            ]);
        }

        $vol = $body['project_volume_m3'] ?? 1.0;
        $bagOverrides = $body['bag_sizes_override'] ?? null;

        $basket = MarketService::generateBasketFromMix($body['mix'], $vol, $bagOverrides);
        return Response::json($basket);
    }

    public function searchMarket(Request $request): Response
    {
        $body = $request->getJson() ?? [];

        $res = MarketService::searchMarket(
            tab: $body['tab'] ?? 'ingredients',
            countryCode: $body['country_code'] ?? 'AM',
            category: $body['category'] ?? 'cement',
            quantity: $body['quantity'] ?? 1000.0,
            unit: $body['unit'] ?? 'kg',
            basketItems: $body['basket_items'] ?? null,
            volumeM3: $body['volume_m3'] ?? 6.0,
            strengthClass: $body['strength_class'] ?? null,
            needsPump: (bool)($body['needs_pump'] ?? false),
            locationQuery: $body['location_query'] ?? null,
            localityId: $body['locality_id'] ?? null,
            manualLocationEntry: (bool)($body['manual_location_entry'] ?? false),
            latitude: isset($body['latitude']) ? (float)$body['latitude'] : null,
            longitude: isset($body['longitude']) ? (float)$body['longitude'] : null,
            priceFilter: $body['price_filter'] ?? 'all',
            sortBy: $body['sort_by'] ?? 'recommended',
            recommendedWeights: $body['recommended_weights'] ?? null,
            page: (int)($body['page'] ?? 1),
            pageSize: (int)($body['page_size'] ?? 20)
        );

        return Response::json($res);
    }

    public function calculateOrder(Request $request): Response
    {
        $body = $request->getJson();
        if (!$body || !isset($body['mode'])) {
            throw new ValidationException("Field 'mode' is required ('bag_rounding', 'unit_conversion', 'ready_mix_order', or 'ingredient_order').");
        }

        $mode = $body['mode'];
        if ($mode === 'bag_rounding') {
            $res = Units::roundToWholeBags($body['required_kg'] ?? 0, $body['pack_size_kg'] ?? 50);
            return Response::json(array_merge(["success" => true, "mode" => "bag_rounding"], $res));
        }

        if ($mode === 'unit_conversion') {
            $conv = Units::convertQuantity(
                $body['amount'] ?? 0,
                $body['from_unit'] ?? 'kg',
                $body['to_unit'] ?? 'tonne',
                $body['pack_size_kg'] ?? null,
                $body['bulk_density_kg_per_m3'] ?? null
            );
            return Response::json([
                "success" => true,
                "mode" => "unit_conversion",
                "amount" => (string)($body['amount'] ?? 0),
                "from_unit" => $body['from_unit'] ?? 'kg',
                "to_unit" => $body['to_unit'] ?? 'tonne',
                "converted_amount" => sprintf("%.4f", $conv),
            ]);
        }

        if ($mode === 'ready_mix_order') {
            $rm = Units::calculateReadyMixOrder(
                volumeM3: $body['volume_m3'] ?? 1.0,
                unitPricePerM3: $body['unit_price_per_m3'] ?? 0.0,
                currency: $body['currency'] ?? 'USD',
                vatStatus: $body['vat_status'] ?? 'ex_vat',
                vatRatePct: $body['vat_rate_pct'] ?? null,
                deliveryStatus: $body['delivery_status'] ?? 'ex_works',
                truckCapacityM3: $body['truck_capacity_m3'] ?? 8.0,
                minLoadM3: $body['min_load_m3'] ?? 0.0,
                smallLoadFee: $body['small_load_fee'] ?? null,
                underloadFeePerM3: $body['underload_fee_per_m3'] ?? null,
                fixedDeliveryFeePerTruck: $body['fixed_delivery_fee_per_truck'] ?? null,
                perKmRatePerTruck: $body['per_km_rate_per_truck'] ?? null,
                distanceKm: $body['distance_km'] ?? null,
                needsPump: (bool)($body['needs_pump'] ?? false),
                pumpFixedFee: $body['pump_fixed_fee'] ?? null,
                pumpPerM3Fee: $body['pump_per_m3_fee'] ?? null
            );
            return Response::json(array_merge(["success" => true, "mode" => "ready_mix_order"], $rm));
        }

        if ($mode === 'ingredient_order') {
            $ing = Units::calculateIngredientOrder(
                requiredQuantity: $body['required_quantity'] ?? $body['quantity'] ?? 0,
                requestedUnit: $body['requested_unit'] ?? $body['unit'] ?? 'kg',
                unitPrice: $body['unit_price'] ?? $body['price'] ?? null,
                originalUnit: $body['original_unit'] ?? null,
                currency: $body['currency'] ?? 'USD',
                packMassKg: $body['pack_mass_kg'] ?? null,
                bulkDensityKgPerM3: $body['bulk_density_kg_per_m3'] ?? null,
                quantityMin: isset($body['quantity_min']) ? (int)$body['quantity_min'] : null,
                quantityMax: isset($body['quantity_max']) ? (int)$body['quantity_max'] : null,
                taxIncluded: isset($body['tax_included']) ? (bool)$body['tax_included'] : null,
                vatRatePct: $body['vat_rate_pct'] ?? null,
                deliveryInclusion: $body['delivery_inclusion'] ?? 'excluded',
                fixedDeliveryFee: isset($body['fixed_delivery_fee']) ? (float)$body['fixed_delivery_fee'] : null,
                perKmRate: isset($body['per_km_rate']) ? (float)$body['per_km_rate'] : null,
                distanceKm: isset($body['distance_km']) ? (float)$body['distance_km'] : null,
                productName: $body['product_name'] ?? null,
                productCategory: $body['product_category'] ?? null,
                priceId: $body['price_id'] ?? null,
                amountMin: isset($body['amount_min']) ? (float)$body['amount_min'] : null,
                amountMax: isset($body['amount_max']) ? (float)$body['amount_max'] : null
            );
            return Response::json(array_merge(["success" => true, "mode" => "ingredient_order"], $ing));
        }

        throw new ValidationException("Unsupported calculation mode: '$mode'.");
    }

    public function getSupplierReviews(Request $request, array $params): Response
    {
        $supplierId = $params['supplier_id'] ?? '';
        $res = MarketService::listSupplierReviews($supplierId, false);
        return Response::json($res);
    }

    public function postSupplierReview(Request $request, array $params): Response
    {
        $supplierId = $params['supplier_id'] ?? '';
        $body = $request->getJson() ?? [];

        $res = MarketService::submitCustomerReview(
            supplierId: $supplierId,
            reviewerUserId: $body['reviewer_user_id'] ?? 'anon',
            reviewerDisplayName: $body['reviewer_display_name'] ?? 'Anonymous Reviewer',
            orderReference: $body['order_reference'] ?? 'ORD-REF',
            serviceRating: (int)($body['service_rating'] ?? 5),
            materialRating: (int)($body['material_rating'] ?? 5),
            title: $body['title'] ?? null,
            reviewText: (string)($body['review_text'] ?? ''),
            branchId: $body['branch_id'] ?? null,
            verifiedPurchase: (bool)($body['verified_purchase'] ?? false)
        );

        return Response::json($res);
    }
}
