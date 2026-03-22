<?php
declare(strict_types=1);

function app_customer_directory_parse_bool_filter($value): ?bool
{
    if ($value === null) {
        return null;
    }

    $raw = strtolower(trim((string)$value));
    if ($raw === '') {
        return null;
    }

    if (in_array($raw, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }

    if (in_array($raw, ['0', 'false', 'no', 'off'], true)) {
        return false;
    }

    return null;
}

function app_customer_directory_map_row(array $row): array
{
    $customer = app_customer_from_row($row);
    $customer['activeProjectsCount'] = (int)($row['active_projects_count'] ?? 0);
    $customer['activeContactsCount'] = (int)($row['active_contacts_count'] ?? 0);
    $customer['activeOrdersCount'] = (int)($row['active_orders_count'] ?? 0);
    $customer['totalAmount'] = (int)($row['total_amount'] ?? 0);
    $customer['paidAmount'] = (int)($row['paid_amount'] ?? 0);
    $customer['dueAmount'] = (int)($row['due_amount'] ?? 0);
    return $customer;
}

function app_customer_directory_search_where(array $filters, array &$params): string
{
    $clauses = [];

    if (($filters['q'] ?? '') !== '') {
        $clauses[] = '('
            . 'c.full_name LIKE :q'
            . " OR COALESCE(c.customer_code, '') LIKE :q"
            . " OR COALESCE(c.company_name, '') LIKE :q"
            . " OR COALESCE(c.default_phone, '') LIKE :q"
            . ' OR EXISTS ('
            . 'SELECT 1 FROM customer_projects cp'
            . ' WHERE cp.customer_id = c.id AND cp.name LIKE :q'
            . ')'
            . ' OR EXISTS ('
            . 'SELECT 1 FROM customer_projects cp'
            . ' INNER JOIN customer_project_contacts cpc ON cpc.project_id = cp.id'
            . ' WHERE cp.customer_id = c.id'
            . '   AND (cpc.phone LIKE :q OR cpc.label LIKE :q)'
            . ')'
            . ')';
        $params['q'] = '%' . $filters['q'] . '%';
    }

    if (($filters['isActive'] ?? null) !== null) {
        $clauses[] = 'c.is_active = :is_active';
        $params['is_active'] = ((bool)$filters['isActive']) ? 1 : 0;
    }

    if (($filters['customerType'] ?? '') !== '') {
        $clauses[] = 'c.customer_type = :customer_type';
        $params['customer_type'] = (string)$filters['customerType'];
    }

    if (($filters['hasDue'] ?? null) !== null) {
        $clauses[] = ((bool)$filters['hasDue'] ? 'COALESCE(os.due_amount, 0) > 0' : 'COALESCE(os.due_amount, 0) <= 0');
    }

    return $clauses ? (' WHERE ' . implode(' AND ', $clauses)) : '';
}

function app_customer_directory_fetch(PDO $pdo, array $filters): array
{
    $page = max(1, (int)($filters['page'] ?? 1));
    $pageSize = max(1, min(200, (int)($filters['pageSize'] ?? 50)));
    $offset = ($page - 1) * $pageSize;

    $params = [];
    $whereSql = app_customer_directory_search_where($filters, $params);

    $projectsSummarySql = '(SELECT customer_id, COUNT(*) AS active_projects_count FROM customer_projects WHERE is_active = 1 GROUP BY customer_id) cps';
    $contactsSummarySql = '(SELECT cp.customer_id, COUNT(*) AS active_contacts_count FROM customer_projects cp INNER JOIN customer_project_contacts cpc ON cpc.project_id = cp.id WHERE cp.is_active = 1 AND cpc.is_active = 1 GROUP BY cp.customer_id) ccs';
    app_ensure_order_financials_tables($pdo);

    // SQL mirrors app_compute_payment_derived_fields():
    //   paidTotal  = SUM(order_payments.amount) per order
    //   dueAmount  = GREATEST(0, grand_total - paidTotal) per order, then summed across orders
    // grand_total falls back to orders.total for orders not yet in order_financials.
    $ordersSummarySql = "(SELECT o.customer_id,"
        . " COUNT(*) AS active_orders_count,"
        . " COALESCE(SUM(COALESCE(ofi.grand_total, o.total)), 0) AS total_amount,"
        . " COALESCE(SUM(COALESCE(ops.paid, 0)), 0) AS paid_amount,"
        . " COALESCE(SUM(GREATEST(0, COALESCE(ofi.grand_total, o.total) - COALESCE(ops.paid, 0))), 0) AS due_amount"
        . " FROM orders o"
        . " LEFT JOIN order_financials ofi ON ofi.order_id = o.id"
        . " LEFT JOIN (SELECT order_id, SUM(amount) AS paid FROM order_payments GROUP BY order_id) ops ON ops.order_id = o.id"
        . " WHERE o.customer_id IS NOT NULL AND o.status <> 'archived'"
        . " GROUP BY o.customer_id) os";
    $fromSql = ' FROM customers c'
        . ' LEFT JOIN ' . $projectsSummarySql . ' ON cps.customer_id = c.id'
        . ' LEFT JOIN ' . $contactsSummarySql . ' ON ccs.customer_id = c.id'
        . ' LEFT JOIN ' . $ordersSummarySql . ' ON os.customer_id = c.id';

    $countStmt = $pdo->prepare('SELECT COUNT(*) AS total' . $fromSql . $whereSql);
    $countStmt->execute($params);
    $total = (int)($countStmt->fetchColumn() ?: 0);

    $dataSql = 'SELECT c.*,
        COALESCE(cps.active_projects_count, 0) AS active_projects_count,
        COALESCE(ccs.active_contacts_count, 0) AS active_contacts_count,
        COALESCE(os.active_orders_count, 0) AS active_orders_count,
        COALESCE(os.total_amount, 0) AS total_amount,
        COALESCE(os.paid_amount, 0) AS paid_amount,
        COALESCE(os.due_amount, 0) AS due_amount'
        . $fromSql
        . $whereSql
        . ' ORDER BY c.id DESC LIMIT :limit OFFSET :offset';
    $stmt = $pdo->prepare($dataSql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    return [
        'customers' => array_map('app_customer_directory_map_row', $rows),
        'pagination' => [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
        ],
    ];
}
