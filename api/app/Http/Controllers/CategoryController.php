<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Response;

class CategoryController extends Controller
{
    /**
     * Get all categories
     */
    public function index(): Response
    {
        $categories = Category::orderBy('name')->get();
        return response($categories->toArray());
    }
}
