<?php
declare(strict_types=1);

namespace AstraMix\Core;

class Request
{
    private string $method;
    private string $uri;
    private string $path;
    private array $headers;
    private array $queryParams;
    private ?array $bodyJson = null;
    private string $rawBody = "";

    public function __construct(
        ?string $method = null,
        ?string $uri = null,
        ?array $headers = null,
        ?array $queryParams = null,
        ?string $rawBody = null
    ) {
        $this->method = strtoupper($method ?? $_SERVER['REQUEST_METHOD'] ?? 'GET');
        
        if ($uri !== null) {
            $rawUri = $uri;
        } elseif (!empty($_GET['__route__'])) {
            $rawUri = '/' . ltrim((string)$_GET['__route__'], '/');
        } elseif (!empty($_SERVER['REQUEST_URI']) && !str_ends_with((string)parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), 'index.php')) {
            $rawUri = $_SERVER['REQUEST_URI'];
        } elseif (!empty($_SERVER['REDIRECT_URL']) && !str_ends_with($_SERVER['REDIRECT_URL'], 'index.php')) {
            $rawUri = $_SERVER['REDIRECT_URL'];
        } elseif (!empty($_SERVER['PATH_INFO'])) {
            $rawUri = $_SERVER['PATH_INFO'];
        } elseif (!empty($_SERVER['REQUEST_URI'])) {
            $rawUri = $_SERVER['REQUEST_URI'];
        } else {
            $rawUri = '/';
        }

        $this->uri = $rawUri;
        $parsedUrl = parse_url($rawUri);
        $this->path = $parsedUrl['path'] ?? '/';

        $this->headers = $headers ?? $this->captureHeaders();
        if ($queryParams !== null) {
            $this->queryParams = $queryParams;
        } else {
            $this->queryParams = $_GET;
            if (!empty($parsedUrl['query'])) {
                parse_str($parsedUrl['query'], $urlParams);
                $this->queryParams = array_merge($this->queryParams, $urlParams);
            }
        }

        $this->rawBody = $rawBody ?? file_get_contents('php://input') ?: '';
        if (!empty($this->rawBody)) {
            $decoded = json_decode($this->rawBody, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $this->bodyJson = $decoded;
            }
        }
    }

    private function captureHeaders(): array
    {
        $headers = [];
        if (function_exists('getallheaders')) {
            $all = getallheaders();
            if ($all) {
                foreach ($all as $k => $v) {
                    $headers[strtolower($k)] = $v;
                }
                return $headers;
            }
        }
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $name = strtolower(str_replace('_', '-', substr($key, 5)));
                $headers[$name] = $value;
            } elseif (in_array($key, ['CONTENT_TYPE', 'CONTENT_LENGTH'])) {
                $name = strtolower(str_replace('_', '-', $key));
                $headers[$name] = $value;
            }
        }
        return $headers;
    }

    public function getMethod(): string
    {
        return $this->method;
    }

    public function getPath(): string
    {
        return $this->path;
    }

    public function getQueryParam(string $key, mixed $default = null): mixed
    {
        return $this->queryParams[$key] ?? $default;
    }

    public function getQueryParams(): array
    {
        return $this->queryParams;
    }

    public function getHeader(string $name, ?string $default = null): ?string
    {
        $lower = strtolower($name);
        return $this->headers[$lower] ?? $default;
    }

    public function getJson(): ?array
    {
        return $this->bodyJson;
    }

    public function getRawBody(): string
    {
        return $this->rawBody;
    }
}
