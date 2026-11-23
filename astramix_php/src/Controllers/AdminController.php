<?php
declare(strict_types=1);

namespace AstraMix\Controllers;

use AstraMix\Core\AdminAuthException;
use AstraMix\Core\Request;
use AstraMix\Core\Response;
use AstraMix\Market\MarketService;

class AdminController
{
    private function checkAuth(Request $request): string
    {
        $expected = getenv('ASTRAMIX_ADMIN_TOKEN');
        if (!$expected || $expected === 'astramix-dev-admin-token' || strlen(trim($expected)) < 16) {
            throw new AdminAuthException("Administrative endpoint is locked. A secure ASTRAMIX_ADMIN_TOKEN (minimum 16 characters) must be configured in environment variables.");
        }

        $provided = $request->getHeader('x-admin-token');

        if (!$provided) {
            $auth = $request->getHeader('authorization');
            if ($auth && str_starts_with(strtolower($auth), 'bearer ')) {
                $provided = trim(substr($auth, 7));
            }
        }

        if (!$provided) {
            throw new AdminAuthException("Administrator authentication required. Provide X-Admin-Token or Bearer token.");
        }
        if (!hash_equals($expected, $provided)) {
            throw new AdminAuthException("Invalid administrator token; access denied.");
        }

        return "admin";
    }

    public function stageImport(Request $request): Response
    {
        $actor = $this->checkAuth($request);
        return Response::json([
            "success" => true,
            "message" => "Research pack staging simulated successfully.",
            "batch_id" => "batch_" . bin2hex(random_bytes(6)),
            "actor" => $actor,
        ]);
    }

    public function approveImport(Request $request, array $params): Response
    {
        $actor = $this->checkAuth($request);
        $batchId = $params['batch_id'] ?? 'unknown';
        return Response::json([
            "success" => true,
            "batch_id" => $batchId,
            "message" => "Staged import batch approved.",
            "approver" => $actor,
        ]);
    }

    public function refresh50(Request $request): Response
    {
        $actor = $this->checkAuth($request);
        return Response::json([
            "success" => true,
            "message" => "50-country market refresh is already active in database.",
            "actor" => $actor,
        ]);
    }

    public function upsertQuote(Request $request): Response
    {
        $actor = $this->checkAuth($request);
        $body = $request->getJson() ?? [];

        $res = MarketService::adminUpsertBranchAndQuote($body, $actor);
        return Response::json($res);
    }

    public function moderateReview(Request $request, array $params): Response
    {
        $actor = $this->checkAuth($request);
        $reviewId = $params['review_id'] ?? '';
        $body = $request->getJson() ?? [];

        $res = MarketService::adminModerateReview(
            reviewId: $reviewId,
            moderationState: $body['moderation_state'] ?? 'approved',
            verifiedPurchase: isset($body['verified_purchase']) ? (bool)$body['verified_purchase'] : null,
            moderationReason: $body['moderation_reason'] ?? null,
            adminActor: $actor
        );

        return Response::json($res);
    }

    public function auditLogs(Request $request): Response
    {
        $this->checkAuth($request);
        $limit = (int)($request->getQueryParam('limit') ?? 50);
        $logs = MarketService::adminListAuditLogs($limit);
        return Response::json(["audit_logs" => $logs]);
    }
}
