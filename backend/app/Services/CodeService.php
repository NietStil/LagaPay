<?php

namespace App\Services;

use Hidehalo\Nanoid\Client;
use Illuminate\Database\Eloquent\Model;

class CodeService
{
    /**
     * A nanoid of $lengte characters ([A-Za-z0-9_-]) that no row of $model has in $kolom yet.
     *
     * @param  class-string<Model>  $model
     */
    public static function uniekeCode(string $model, int $lengte, string $kolom = 'code'): string
    {
        do {
            $code = (new Client())->generateId($lengte);
        } while ($model::where($kolom, $code)->exists());

        return $code;
    }
}
