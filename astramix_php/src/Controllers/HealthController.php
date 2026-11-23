<?php
declare(strict_types=1);

namespace AstraMix\Controllers;

use AstraMix\Core\Request;
use AstraMix\Core\Response;
use AstraMix\ML\TreeEnsemble;

class HealthController
{
    public function check(Request $request): Response
    {
        $modelLoaded = false;
        try {
            $ensemble = TreeEnsemble::getInstance();
            $modelLoaded = $ensemble->getTreeCount() > 0;
        } catch (\Throwable) {
            $modelLoaded = false;
        }

        return Response::json([
            "success" => true,
            "status" => "ok",
            "service" => "AstraMix AI",
            "version" => "0.1.0",
            "runtime" => "PHP " . PHP_VERSION,
            "model_loaded" => $modelLoaded,
        ]);
    }
}
