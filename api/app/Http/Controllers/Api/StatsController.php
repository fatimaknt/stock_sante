<?php
namespace App\Http\Controllers\Api;use App\Http\Controllers\Controller;use App\Models\Product;
class StatsController extends Controller{public function index(){ $total=Product::count(); $low=Product::whereColumn('quantity','<=','critical_level')->where('quantity','>',0)->count(); $oos=Product::where('quantity','<=',0)->count(); $val=Product::selectRaw('SUM(quantity*price) v')->value('v')??0; return ['totalProducts'=>$total,'stockValue'=>(float)$val,'lowStock'=>$low,'outOfStock'=>$oos]; }}
