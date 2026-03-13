<?php
declare(strict_types=1);

function app_generate_order_code(string|int $datePrefix = '', string $flags = '00', int $sequence = 1, int $seqPad = 5): string
{
    $date = app_order_code_date_prefix_jalali();
    if (is_int($datePrefix)) {
        // Backward compatibility for old signature: app_generate_order_code($sequence)
        $sequence = $datePrefix;
    } else {
        $candidateDate = preg_replace('/\D+/', '', trim($datePrefix));
        if (is_string($candidateDate) && preg_match('/^\d{6}$/', $candidateDate)) {
            $date = $candidateDate;
        }
    }

    // Flags and seqPad are intentionally ignored in the YYMMDD-SSS-C format.
    $sequence = max(1, $sequence);
    if ($sequence > 999) {
        throw new InvalidArgumentException('Order sequence exceeds daily capacity (999).');
    }

    $seq = str_pad((string)$sequence, 3, '0', STR_PAD_LEFT);
    $core = $date . $seq;

    $sum = 0;
    foreach (str_split($core) as $index => $char) {
        $sum += ((int)$char) * ($index + 1);
    }

    $checksum = $sum % 10;
    return $date . '-' . $seq . '-' . $checksum;
}

function app_order_code_date_prefix_jalali(?int $timestamp = null): string
{
    $ts = $timestamp ?? time();
    $gy = (int)date('Y', $ts);
    $gm = (int)date('n', $ts);
    $gd = (int)date('j', $ts);

    [$jy, $jm, $jd] = app_gregorian_to_jalali($gy, $gm, $gd);

    $yy = str_pad((string)($jy % 100), 2, '0', STR_PAD_LEFT);
    $mm = str_pad((string)$jm, 2, '0', STR_PAD_LEFT);
    $dd = str_pad((string)$jd, 2, '0', STR_PAD_LEFT);
    return $yy . $mm . $dd;
}

function app_gregorian_to_jalali(int $gy, int $gm, int $gd): array
{
    $gDayAcc = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

    if ($gy > 1600) {
        $jy = 979;
        $gy -= 1600;
    } else {
        $jy = 0;
        $gy -= 621;
    }

    $gy2 = $gm > 2 ? $gy + 1 : $gy;
    $days =
        (365 * $gy)
        + intdiv($gy2 + 3, 4)
        - intdiv($gy2 + 99, 100)
        + intdiv($gy2 + 399, 400)
        - 80
        + $gd
        + $gDayAcc[$gm - 1];

    $jy += 33 * intdiv($days, 12053);
    $days %= 12053;
    $jy += 4 * intdiv($days, 1461);
    $days %= 1461;

    if ($days > 365) {
        $jy += intdiv($days - 1, 365);
        $days = ($days - 1) % 365;
    }

    if ($days < 186) {
        $jm = 1 + intdiv($days, 31);
        $jd = 1 + ($days % 31);
    } else {
        $jm = 7 + intdiv($days - 186, 30);
        $jd = 1 + (($days - 186) % 30);
    }

    return [$jy, $jm, $jd];
}
