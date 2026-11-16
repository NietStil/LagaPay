<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * A ticket bestelling: { tickets: [{ id, aantal, voor_vrienden? }] }, where voor_vrienden of the aantal are put on
 * offer for friends. Shared by the app (POST /evenementen/{id}/tickets/kopen on the api subdomain) and the website
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
            'tickets.*.voor_vrienden' => ['nullable', 'integer', 'min:0', 'max:10'],
        ];
    }

    /**
     * @return array<int, \Closure(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                foreach ($this->input('tickets') as $i => $regel) {
                    if ((int) ($regel['voor_vrienden'] ?? 0) > (int) $regel['aantal']) {
                        $validator->errors()->add(
                            "tickets.{$i}.voor_vrienden",
                            'Je kunt niet meer tickets aan vrienden geven dan je koopt.',
                        );
                    }
                }
            },
        ];
    }

    /**
     * The bestelling as BetaalService::koopTickets() takes it: ticket id => [aantal, voor_vrienden].
     *
     * @return array<int, array{aantal: int, voor_vrienden: int}>
     */
    public function bestelling(): array
    {
        $bestelling = [];

        foreach ($this->validated('tickets') as $regel) {
            $bestelling[(int) $regel['id']] = [
                'aantal'        => (int) $regel['aantal'],
                'voor_vrienden' => (int) ($regel['voor_vrienden'] ?? 0),
            ];
        }

        return $bestelling;
    }
}
