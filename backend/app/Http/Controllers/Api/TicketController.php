<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Mobiel\TicketOverzichtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function __construct(
        protected TicketOverzichtService $ticketService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->ticketService->mijnTickets($request->user()));
    }

    public function evenement(Request $request): JsonResponse
    {
        try {
            $tickets = $this->ticketService->evenementTickets($request->user(), $request->attributes->get('evenement'));
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }

        return response()->json($tickets);
    }
}
