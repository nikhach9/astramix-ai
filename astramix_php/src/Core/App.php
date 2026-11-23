<?php
declare(strict_types=1);

namespace AstraMix\Core;

use AstraMix\Controllers\AdminController;
use AstraMix\Controllers\HealthController;
use AstraMix\Controllers\MarketController;
use AstraMix\Controllers\MixLabController;

class App
{
    private Router $router;

    public function __construct()
    {
        $this->router = new Router();
        $this->registerRoutes();
    }

    private function route(string $method, string $pattern, callable|array $handler): void
    {
        $this->router->add($method, $pattern, $handler);
        $norm = '/' . ltrim($pattern, '/');
        if (!str_starts_with($norm, '/v1/')) {
            $this->router->add($method, '/v1' . $norm, $handler);
        }
    }

    private function registerRoutes(): void
    {
        // Health
        $this->route('GET', '/health', [HealthController::class, 'check']);

        // Mix Lab & ML
        $this->route('GET', '/schema/mix-input', [MixLabController::class, 'getSchema']);
        $this->route('GET', '/mix-lab/schema', [MixLabController::class, 'getSchema']);
        $this->route('POST', '/predict-strength', [MixLabController::class, 'predictStrength']);
        $this->route('POST', '/estimate-cost', [MixLabController::class, 'estimateCost']);
        $this->route('POST', '/estimate-carbon', [MixLabController::class, 'estimateCarbon']);
        $this->route('POST', '/optimize-mix', [MixLabController::class, 'optimizeMix']);
        $this->route('POST', '/mix-lab/evaluate', [MixLabController::class, 'evaluateMixLab']);
        $this->route('POST', '/mix-lab/optimize', [MixLabController::class, 'optimizeMixLab']);

        // Materials Market
        $this->route('GET', '/locations/suggest', [MarketController::class, 'suggestLocations']);
        $this->route('GET', '/market/overview', [MarketController::class, 'getOverview']);
        $this->route('GET', '/market/map-seed', [MarketController::class, 'getMapSeed']);
        $this->route('POST', '/market/basket-from-mix', [MarketController::class, 'basketFromMix']);
        $this->route('POST', '/market/search', [MarketController::class, 'searchMarket']);
        $this->route('POST', '/market/calculate-order', [MarketController::class, 'calculateOrder']);
        $this->route('GET', '/market/suppliers/{supplier_id}/reviews', [MarketController::class, 'getSupplierReviews']);
        $this->route('POST', '/market/suppliers/{supplier_id}/reviews', [MarketController::class, 'postSupplierReview']);

        // Admin (Role-Protected)
        $this->route('POST', '/admin/import/stage', [AdminController::class, 'stageImport']);
        $this->route('POST', '/admin/import/{batch_id}/approve', [AdminController::class, 'approveImport']);
        $this->route('POST', '/admin/import/refresh-50', [AdminController::class, 'refresh50']);
        $this->route('POST', '/admin/suppliers/upsert-quote', [AdminController::class, 'upsertQuote']);
        $this->route('POST', '/admin/reviews/{review_id}/moderate', [AdminController::class, 'moderateReview']);
        $this->route('GET', '/admin/audit-logs', [AdminController::class, 'auditLogs']);
    }

    public function handle(?Request $request = null): Response
    {
        $req = $request ?? new Request();
        return $this->router->dispatch($req);
    }

    public function run(?Request $request = null): void
    {
        $response = $this->handle($request);
        $response->send();
    }
}
