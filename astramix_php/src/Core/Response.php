<?php
declare(strict_types=1);

namespace AstraMix\Core;

class Response
{
    private int $statusCode;
    private array $headers;
    private string $body;

    public function __construct(string $body = "", int $statusCode = 200, array $headers = [])
    {
        $this->body = $body;
        $this->statusCode = $statusCode;
        $this->headers = $headers;
    }

    public static function json(mixed $data, int $statusCode = 200, array $headers = []): self
    {
        $headers['Content-Type'] = 'application/json; charset=utf-8';
        $encoded = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        if ($encoded === false) {
            $encoded = json_encode(['error' => 'JSON encoding failed: ' . json_last_error_msg()]);
            $statusCode = 500;
        }
        return new self($encoded, $statusCode, $headers);
    }

    public static function error(string $message, int $statusCode = 400, string $errorCode = "AstraMixError", mixed $details = null): self
    {
        $payload = [
            "detail" => $message,
            "error_code" => $errorCode,
        ];
        if ($details !== null) {
            $payload["details"] = $details;
        }
        return self::json($payload, $statusCode);
    }

    public function setHeader(string $name, string $value): self
    {
        $this->headers[$name] = $value;
        return $this;
    }

    public function send(): void
    {
        // Add standard CORS headers
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        if (!isset($this->headers['Access-Control-Allow-Origin'])) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
            header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
            header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token, X-Requested-With");
        }

        http_response_code($this->statusCode);
        foreach ($this->headers as $name => $val) {
            header("$name: $val");
        }
        echo $this->body;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getBody(): string
    {
        return $this->body;
    }
}
