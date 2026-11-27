<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A ticket bestelling: { tickets: [{ id, aantal }] }. Shared by the app (POST /evenementen/{id}/tickets/kopen on the api subdomain) and the website
 * (POST /e/{code}/tickets), so both accept exactly the same orders.
 */
class TicketsKopenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tickets'                 => ['required', 'array', 'min:1', 'max:20'],
            'tickets.*.id'            => ['required', 'integer', 'distinct'],
            'tickets.*.aantal'        => ['required', 'integer', 'min:1', 'max:10'],
        ];
    }

    /**
     * The bestelling as BetaalService::koopTickets() takes it: ticket id => [aantal].
     *
     * @return array<int, array{aantal: int}>
     */
    public function bestelling(): array
    {
        $bestelling = [];

        foreach ($this->validated('tickets') as $regel) {
            $bestelling[(int) $regel['id']] = [
                'aantal' => (int) $regel['aantal'],
            ];
        }

        return $bestelling;
    }
}
