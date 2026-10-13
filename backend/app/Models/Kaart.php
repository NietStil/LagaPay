<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Kaart extends Model
{
    use HasFactory;

    protected $table = 'kaarten';

    public $timestamps = false;

    protected $fillable = [
        'uid',
        'type',
        'actief',
        'evenement_id',
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
        return $this->belongsTo(Evenement::class, 'evenement_id');
    }

    public function gebruiker(): BelongsTo
    {
        return $this->belongsTo(Gebruiker::class, 'gebruiker_id');
    }
}
