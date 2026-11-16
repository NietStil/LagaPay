<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class HomeController extends Controller
{
    // Logged-in organisatoren/admins are sent to the dashboard by StuurOrganisatorNaarDashboard.
    public function organiserPage()
    {
        return Inertia::render('HomePagina');
    }
}
