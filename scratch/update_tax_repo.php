<?php
$target = 'c:/Users/jayakrishnan/shopping-app-backend/app/Repositories/Eloquents/TaxRepository.php';
$content = file_get_contents($target);

$oldStore = <<<'EOD'
    public function store($request)
    {
        DB::beginTransaction();
        try {

            $tax =  $this->model->create([
                'name' => $request->name,
                'rate' => $request->rate,
                'status' => $request->status,
            ]);

            DB::commit();
            return $tax;

        } catch (Exception $e) {

            DB::rollback();
            throw new ExceptionHandler($e->getMessage(), $e->getCode());
        }
    }
EOD;

$newStore = <<<'EOD'
    public function store($request)
    {
        DB::beginTransaction();
        try {
            $rate = round(floatval($request->rate), 2);

            // Concurrency-safe check: reuse existing tax if equivalent rate already exists
            $existingTax = $this->model
                ->whereRaw('ROUND(rate, 2) = ?', [$rate])
                ->lockForUpdate()
                ->first();

            if ($existingTax) {
                DB::commit();
                return $existingTax;
            }

            $tax = $this->model->create([
                'name' => $request->name ?: ($rate . '%'),
                'rate' => $rate,
                'status' => $request->status ?? 1,
            ]);

            DB::commit();
            return $tax;

        } catch (Exception $e) {

            DB::rollback();
            throw new ExceptionHandler($e->getMessage(), $e->getCode());
        }
    }
EOD;

$normContent = str_replace("\r\n", "\n", $content);
$normOld = str_replace("\r\n", "\n", $oldStore);
$normNew = str_replace("\r\n", "\n", $newStore);

if (strpos($normContent, $normOld) !== false) {
    $updated = str_replace($normOld, $normNew, $normContent);
    file_put_contents($target, $updated);
    echo "SUCCESS: TaxRepository updated.\n";
} else {
    echo "ERROR: Old store method pattern not found.\n";
}
