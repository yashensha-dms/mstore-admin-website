<?php
require 'c:/Users/jayakrishnan/shopping-app-backend/vendor/autoload.php';
$app = require_once 'c:/Users/jayakrishnan/shopping-app-backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "=== CHECKING TAX RECORDS IN LOCAL DB ===\n";
$taxCount = DB::table('taxes')->count();
echo "Total tax records: $taxCount\n";

$taxes = DB::table('taxes')->get();
$byRate = [];
foreach ($taxes as $t) {
    $r = (string)floatval($t->rate);
    if (!isset($byRate[$r])) {
        $byRate[$r] = [];
    }
    $byRate[$r][] = $t;
}

echo "\nUnique Rates Breakdown:\n";
foreach ($byRate as $rate => $list) {
    $ids = array_map(function($item) { return $item->id; }, $list);
    $first = $list[0];
    echo "- Rate {$rate}%: " . count($list) . " records (Keep ID: {$first->id}, Duplicates: " . (count($list) - 1) . ")\n";
}

echo "\n=== TABLES WITH tax_id COLUMN ===\n";
$tables = ['products', 'orders', 'order_products', 'variations', 'countries', 'states'];
foreach ($tables as $tbl) {
    if (Schema::hasTable($tbl)) {
        $hasCol = Schema::hasColumn($tbl, 'tax_id');
        $countUsing = $hasCol ? DB::table($tbl)->whereNotNull('tax_id')->count() : 0;
        echo "- Table '{$tbl}': has tax_id? " . ($hasCol ? "YES" : "NO") . " (Rows referencing tax_id: {$countUsing})\n";
    }
}
