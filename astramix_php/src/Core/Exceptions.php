<?php
declare(strict_types=1);

namespace AstraMix\Core;

use Exception;

class AstraMixException extends Exception
{
    protected int $statusCode = 400;
    protected string $errorCode = "AstraMixError";
    protected mixed $details = null;

    public function __construct(string $message, int $statusCode = 400, string $errorCode = "AstraMixError", mixed $details = null)
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
        $this->details = $details;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getDetails(): mixed
    {
        return $this->details;
    }

    public function toArray(): array
    {
        $res = [
            "detail" => $this->getMessage(),
            "error_code" => $this->errorCode,
        ];
        if ($this->details !== null) {
            $res["details"] = $this->details;
        }
        return $res;
    }
}

class ValidationException extends AstraMixException
{
    public function __construct(string $message, mixed $details = null)
    {
        parent::__construct($message, 422, "RequestValidationError", $details);
    }
}

class InvalidMixException extends AstraMixException
{
    public function __construct(string $message, mixed $details = null)
    {
        parent::__construct($message, 422, "InvalidMixError", $details);
    }
}

class OptimizationException extends AstraMixException
{
    public function __construct(string $message, mixed $details = null)
    {
        parent::__construct($message, 422, "OptimizationError", $details);
    }
}

class AdminAuthException extends AstraMixException
{
    public function __construct(string $message = "Administrator authentication required. Provide X-Admin-Token or Bearer token.")
    {
        parent::__construct($message, 403, "AdminAuthError");
    }
}

class NotFoundException extends AstraMixException
{
    public function __construct(string $message = "Resource not found")
    {
        parent::__construct($message, 404, "NotFoundError");
    }
}
