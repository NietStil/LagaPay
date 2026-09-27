<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ticket extends Model
{
    use HasFactory;

    protected $table = 'Tickets';

    public $timestamps = false;

    protected $fillable = [
        'event_id',
        'prijs',
        'naam',
        'munten',
    ];

    protected function casts(): array
    {
        return [
            'prijs' => 'decimal:2',
            'munten' => 'integer',
        ];
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'event_id');
    }
}
