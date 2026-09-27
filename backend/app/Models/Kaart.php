<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Kaart extends Model
{
    use HasFactory;

    protected $table = 'Kaarten';

    public $timestamps = false;

    protected $fillable = [
        'uid',
        'type',
        'actief',
        'event_id',
        'gebruiker_id',
    ];

    protected function casts(): array
    {
        return [
            'actief' => 'boolean',
        ];
    }

    public function evenement(): BelongsTo
    {
        return $this->belongsTo(Evenement::class, 'event_id');
    }

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gebruiker_id');
    }
}
