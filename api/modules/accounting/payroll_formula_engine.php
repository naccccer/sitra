<?php
declare(strict_types=1);

require_once __DIR__ . '/accounting_helpers.php';

function acc_payroll_default_formulas(): array
{
    return [
        'version' => 1,
        'items' => [
            ['key' => 'base_salary', 'label' => 'Base salary', 'type' => 'earning', 'source' => 'baseSalary', 'accountKey' => 'base_salary', 'sortOrder' => 10],
            ['key' => 'housing_allowance', 'label' => 'Housing allowance', 'type' => 'earning', 'source' => 'housingAllowance', 'accountKey' => 'housing_allowance', 'sortOrder' => 20],
            ['key' => 'food_allowance', 'label' => 'Food allowance', 'type' => 'earning', 'source' => 'foodAllowance', 'accountKey' => 'transport_allowance', 'sortOrder' => 30],
            ['key' => 'child_allowance', 'label' => 'Child allowance', 'type' => 'earning', 'source' => 'childAllowance', 'accountKey' => 'base_salary', 'sortOrder' => 40],
            ['key' => 'seniority_allowance', 'label' => 'Seniority allowance', 'type' => 'earning', 'source' => 'seniorityAllowance', 'accountKey' => 'base_salary', 'sortOrder' => 50],
            ['key' => 'overtime', 'label' => 'Overtime', 'type' => 'earning', 'source' => 'overtimePay', 'accountKey' => 'overtime', 'sortOrder' => 60],
            ['key' => 'bonus', 'label' => 'Bonus', 'type' => 'earning', 'source' => 'bonus', 'accountKey' => 'bonus', 'sortOrder' => 70],
            ['key' => 'other_earnings', 'label' => 'Other earnings', 'type' => 'earning', 'source' => 'otherAdditions', 'accountKey' => 'other_earnings', 'sortOrder' => 80],
            ['key' => 'insurance', 'label' => 'Insurance', 'type' => 'deduction', 'source' => 'insurance', 'accountKey' => 'insurance', 'sortOrder' => 90],
            ['key' => 'tax', 'label' => 'Tax', 'type' => 'deduction', 'source' => 'tax', 'accountKey' => 'tax', 'sortOrder' => 100],
            ['key' => 'loan', 'label' => 'Loan', 'type' => 'deduction', 'source' => 'loanDeduction', 'accountKey' => 'loan', 'sortOrder' => 110],
            ['key' => 'advance_deduction', 'label' => 'Advance deduction', 'type' => 'deduction', 'source' => 'advanceDeduction', 'accountKey' => 'loan', 'sortOrder' => 120],
            ['key' => 'absence_deduction', 'label' => 'Absence deduction', 'type' => 'deduction', 'source' => 'absenceDeduction', 'accountKey' => 'other_deductions', 'sortOrder' => 130],
            ['key' => 'other_deductions', 'label' => 'Other deductions', 'type' => 'deduction', 'source' => 'otherDeductions', 'accountKey' => 'other_deductions', 'sortOrder' => 140],
        ],
    ];
}

function acc_payroll_read_formulas(PDO $pdo): array
{
    $configured = acc_read_json_setting($pdo, 'accounting.payroll.formulas', []);
    if (!isset($configured['items']) || !is_array($configured['items'])) {
        return acc_payroll_default_formulas();
    }

    $items = [];
    foreach ($configured['items'] as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $key = acc_normalize_text($item['key'] ?? '');
        $type = acc_normalize_text($item['type'] ?? '');
        if ($key === '' || !in_array($type, ['earning', 'deduction', 'employer_cost'], true)) {
            continue;
        }
        $items[] = [
            'key' => $key,
            'label' => acc_normalize_text($item['label'] ?? $key),
            'type' => $type,
            'source' => acc_normalize_text($item['source'] ?? ''),
            'expression' => acc_normalize_text($item['expression'] ?? ''),
            'accountKey' => acc_normalize_text($item['accountKey'] ?? $key),
            'sortOrder' => (int)($item['sortOrder'] ?? (($index + 1) * 10)),
        ];
    }

    if ($items === []) {
        return acc_payroll_default_formulas();
    }

    return [
        'version' => (int)($configured['version'] ?? 1),
        'items' => $items,
    ];
}

function acc_payroll_compute_items(PDO $pdo, array $employee, array $inputs): array
{
    $formulas = acc_payroll_read_formulas($pdo);
    $employeeDefaults = [];
    if (!empty($employee['default_inputs_json'])) {
        $decoded = json_decode((string)$employee['default_inputs_json'], true);
        $employeeDefaults = is_array($decoded) ? $decoded : [];
    }

    $context = acc_payroll_numeric_context(array_merge($employeeDefaults, $inputs));
    $context['baseSalary'] = (float)($context['baseSalary'] ?? (int)($employee['base_salary'] ?? 0));
    $context['employeeBaseSalary'] = (float)(int)($employee['base_salary'] ?? 0);
    $context['gross_earnings'] = 0.0;
    $context['total_earnings'] = 0.0;
    $context['total_deductions'] = 0.0;
    $context['total_employer_cost'] = 0.0;

    $items = [];
    $earningsTotal = 0;
    $deductionsTotal = 0;
    $employerCostTotal = 0;

    foreach ($formulas['items'] as $formula) {
        $rawAmount = 0.0;
        $expression = acc_normalize_text($formula['expression'] ?? '');
        $source = acc_normalize_text($formula['source'] ?? '');
        if ($expression !== '') {
            $rawAmount = acc_payroll_eval_expression($expression, $context);
        } elseif ($source !== '') {
            $rawAmount = (float)($context[$source] ?? 0);
        }

        $amount = (int)round($rawAmount, 0, PHP_ROUND_HALF_UP);
        $context[$formula['key']] = (float)$amount;

        if ($formula['type'] === 'earning') {
            $earningsTotal += $amount;
            $context['gross_earnings'] = (float)$earningsTotal;
            $context['total_earnings'] = (float)$earningsTotal;
        } elseif ($formula['type'] === 'deduction') {
            $deductionsTotal += $amount;
            $context['total_deductions'] = (float)$deductionsTotal;
        } else {
            $employerCostTotal += $amount;
            $context['total_employer_cost'] = (float)$employerCostTotal;
        }

        $context['net_pay'] = (float)($earningsTotal - $deductionsTotal);
        $items[] = [
            'itemKey' => $formula['key'],
            'label' => $formula['label'],
            'type' => $formula['type'],
            'accountKey' => $formula['accountKey'],
            'amount' => $amount,
            'sortOrder' => $formula['sortOrder'],
            'formulaMeta' => ['source' => $source, 'expression' => $expression],
        ];
    }

    return [
        'items' => $items,
        'inputs' => $context,
        'formulaSnapshot' => $formulas,
        'earningsTotal' => $earningsTotal,
        'deductionsTotal' => $deductionsTotal,
        'employerCostTotal' => $employerCostTotal,
        'netTotal' => $earningsTotal - $deductionsTotal,
    ];
}

function acc_payroll_numeric_context(array $values): array
{
    $context = [];
    foreach ($values as $key => $value) {
        $name = preg_replace('/[^A-Za-z0-9_]/', '', (string)$key);
        if ($name === '') {
            continue;
        }
        if (is_numeric($value)) {
            $context[$name] = (float)$value;
        }
    }
    return $context;
}

function acc_payroll_eval_expression(string $expression, array $context): float
{
    $tokens = acc_payroll_tokenize_expression($expression);
    $index = 0;
    $value = acc_payroll_parse_expression($tokens, $index, $context);
    if (($tokens[$index]['type'] ?? 'eof') !== 'eof') {
        throw new RuntimeException('Unexpected payroll formula token.');
    }
    return $value;
}

function acc_payroll_tokenize_expression(string $expression): array
{
    $tokens = [];
    $offset = 0;
    $pattern = '/\G\s*(?:([0-9]+(?:\.[0-9]+)?)|([A-Za-z_][A-Za-z0-9_]*)|([\+\-\*\/\(\),]))/A';
    while ($offset < strlen($expression)) {
        if (!preg_match($pattern, $expression, $matches, 0, $offset)) {
            throw new RuntimeException('Invalid payroll formula expression.');
        }
        $offset += strlen($matches[0]);
        if (($matches[1] ?? '') !== '') {
            $tokens[] = ['type' => 'number', 'value' => (float)$matches[1]];
        } elseif (($matches[2] ?? '') !== '') {
            $tokens[] = ['type' => 'identifier', 'value' => $matches[2]];
        } else {
            $operator = $matches[3] ?? '';
            $tokens[] = ['type' => $operator, 'value' => $operator];
        }
    }
    $tokens[] = ['type' => 'eof', 'value' => null];
    return $tokens;
}

function acc_payroll_parse_expression(array $tokens, int &$index, array $context): float
{
    $value = acc_payroll_parse_term($tokens, $index, $context);
    while (in_array($tokens[$index]['type'] ?? '', ['+', '-'], true)) {
        $operator = $tokens[$index++]['type'];
        $right = acc_payroll_parse_term($tokens, $index, $context);
        $value = $operator === '+' ? $value + $right : $value - $right;
    }
    return $value;
}

function acc_payroll_parse_term(array $tokens, int &$index, array $context): float
{
    $value = acc_payroll_parse_factor($tokens, $index, $context);
    while (in_array($tokens[$index]['type'] ?? '', ['*', '/'], true)) {
        $operator = $tokens[$index++]['type'];
        $right = acc_payroll_parse_factor($tokens, $index, $context);
        $value = $operator === '*' ? $value * $right : ($right == 0.0 ? 0.0 : $value / $right);
    }
    return $value;
}

function acc_payroll_parse_factor(array $tokens, int &$index, array $context): float
{
    $token = $tokens[$index] ?? ['type' => 'eof'];
    if ($token['type'] === '-') {
        $index++;
        return -acc_payroll_parse_factor($tokens, $index, $context);
    }
    if ($token['type'] === 'number') {
        $index++;
        return (float)$token['value'];
    }
    if ($token['type'] === 'identifier') {
        $name = (string)$token['value'];
        $index++;
        if (($tokens[$index]['type'] ?? '') === '(') {
            return acc_payroll_parse_function($name, $tokens, $index, $context);
        }
        return (float)($context[$name] ?? 0);
    }
    if ($token['type'] === '(') {
        $index++;
        $value = acc_payroll_parse_expression($tokens, $index, $context);
        if (($tokens[$index]['type'] ?? '') !== ')') {
            throw new RuntimeException('Missing closing parenthesis in payroll formula.');
        }
        $index++;
        return $value;
    }
    throw new RuntimeException('Unexpected payroll formula factor.');
}

function acc_payroll_parse_function(string $name, array $tokens, int &$index, array $context): float
{
    $index++;
    $args = [];
    if (($tokens[$index]['type'] ?? '') !== ')') {
        do {
            $args[] = acc_payroll_parse_expression($tokens, $index, $context);
            if (($tokens[$index]['type'] ?? '') !== ',') {
                break;
            }
            $index++;
        } while (true);
    }
    if (($tokens[$index]['type'] ?? '') !== ')') {
        throw new RuntimeException('Missing function closing parenthesis in payroll formula.');
    }
    $index++;

    return match (strtolower($name)) {
        'min' => $args === [] ? 0.0 : min($args),
        'max' => $args === [] ? 0.0 : max($args),
        'abs' => abs((float)($args[0] ?? 0)),
        'round' => round((float)($args[0] ?? 0), (int)($args[1] ?? 0), PHP_ROUND_HALF_UP),
        default => throw new RuntimeException('Unsupported payroll formula function.'),
    };
}
