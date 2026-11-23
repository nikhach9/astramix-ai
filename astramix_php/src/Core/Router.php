<?php
declare(strict_types=1);

namespace AstraMix\Core;

use Throwable;

class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, callable|array $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
        ];
    }

    public function get(string $pattern, callable|array $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, callable|array $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function dispatch(Request $request): Response
    {
        $method = $request->getMethod();
        if ($method === 'OPTIONS') {
            return new Response('', 200, [
                'Access-Control-Allow-Origin' => $_SERVER['HTTP_ORIGIN'] ?? '*',
                'Access-Control-Allow-Credentials' => 'true',
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Admin-Token, X-Requested-With',
            ]);
        }

        $rawPath = rtrim($request->getPath(), '/');
        if ($rawPath === '') {
            $rawPath = '/';
        }

        // Clean prefix if running under /api/v1, /api, /v1, or direct
        $normalizedPaths = [$rawPath];
        if (str_starts_with($rawPath, '/api/v1')) {
            $stripped = substr($rawPath, 7);
            $normalizedPaths[] = $stripped === '' ? '/' : $stripped;
        }
        if (str_starts_with($rawPath, '/v1')) {
            $stripped = substr($rawPath, 3);
            $normalizedPaths[] = $stripped === '' ? '/' : $stripped;
        }
        if (str_starts_with($rawPath, '/api')) {
            $stripped = substr($rawPath, 4);
            $normalizedPaths[] = $stripped === '' ? '/' : $stripped;
            if (str_starts_with($stripped, '/v1')) {
                $strippedV1 = substr($stripped, 3);
                $normalizedPaths[] = $strippedV1 === '' ? '/' : $strippedV1;
            }
        }
        // Also strip /api and /v1 recursively
        $pure = preg_replace('#^/(api/v1|v1|api)(/|$)#', '/', $rawPath);
        $pure = '/' . ltrim((string)$pure, '/');
        $normalizedPaths[] = $pure;
        if (!str_starts_with($pure, '/v1/')) {
            $normalizedPaths[] = '/v1' . $pure;
        }
        $normalizedPaths = array_values(array_unique(array_filter($normalizedPaths)));

        try {
            foreach ($this->routes as $route) {
                if ($route['method'] !== $method) {
                    continue;
                }

                $patternRegex = $this->compilePattern($route['pattern']);
                foreach ($normalizedPaths as $checkPath) {
                    if (preg_match($patternRegex, $checkPath, $matches)) {
                        $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                        $handler = $route['handler'];

                        if (is_array($handler)) {
                            [$class, $action] = $handler;
                            $controller = new $class();
                            return $controller->$action($request, $params);
                        }

                        return $handler($request, $params);
                    }
                }
            }

            throw new NotFoundException("Route not found: $method $rawPath");
        } catch (AstraMixException $e) {
            return Response::error($e->getMessage(), $e->getStatusCode(), $e->getErrorCode(), $e->getDetails());
        } catch (Throwable $e) {
            $isDev = (getenv('APP_DEBUG') === 'true' || getenv('APP_ENV') === 'development');
            return Response::error(
                $isDev ? ("An unexpected server error occurred: " . $e->getMessage()) : "An unexpected server error occurred. Please try again later.",
                500,
                "InternalServerError",
                $isDev ? ["exception" => get_class($e), "file" => basename($e->getFile()), "line" => $e->getLine()] : null
            );
        }
    }

    private function compilePattern(string $pattern): string
    {
        $normalized = rtrim($pattern, '/');
        if ($normalized === '') {
            $normalized = '/';
        }
        $regex = preg_replace('#\{([a-zA-Z0-9_]+)\}#', '(?P<$1>[^/]+)', $normalized);
        return '#^' . $regex . '$#';
    }
}
