<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Opwaardering extends Model
{
    use HasFactory;

    protected $table = 'Opwaarderingen';

    public $timestamps = false;

    protected $fillable = [
        'mollie_id',
        'status',
        'amount',
        'method',
        'gebruiker_id',
        'event_id',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gebruiker_id');
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'event_id');
    }
}
