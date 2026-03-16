<?php
declare(strict_types=1);

function app_inventory_v2_permission_definitions(): array
{
    return [
        ['key' => 'inventory.v2_products.read', 'module' => 'inventory', 'label' => 'View Inventory V2 products'],
        ['key' => 'inventory.v2_products.write', 'module' => 'inventory', 'label' => 'Manage Inventory V2 products'],
        ['key' => 'inventory.v2_warehouses.read', 'module' => 'inventory', 'label' => 'View Inventory V2 warehouses'],
        ['key' => 'inventory.v2_warehouses.write', 'module' => 'inventory', 'label' => 'Manage Inventory V2 warehouses'],
        ['key' => 'inventory.v2_locations.read', 'module' => 'inventory', 'label' => 'View Inventory V2 locations'],
        ['key' => 'inventory.v2_locations.write', 'module' => 'inventory', 'label' => 'Manage Inventory V2 locations'],
        ['key' => 'inventory.v2_lots.read', 'module' => 'inventory', 'label' => 'View Inventory V2 lots'],
        ['key' => 'inventory.v2_lots.write', 'module' => 'inventory', 'label' => 'Manage Inventory V2 lots'],
        ['key' => 'inventory.v2_operations.read', 'module' => 'inventory', 'label' => 'View Inventory V2 operations'],
        ['key' => 'inventory.v2_operations.write', 'module' => 'inventory', 'label' => 'Manage Inventory V2 operations'],
        ['key' => 'inventory.v2_reports.read', 'module' => 'inventory', 'label' => 'View Inventory V2 reports'],
        ['key' => 'inventory.v2_settings.read', 'module' => 'inventory', 'label' => 'View Inventory V2 settings'],
        ['key' => 'inventory.v2_settings.write', 'module' => 'inventory', 'label' => 'Manage Inventory V2 settings'],
    ];
}

function app_inventory_v2_manager_default_permissions(): array
{
    return [
        'inventory.v2_products.read',
        'inventory.v2_products.write',
        'inventory.v2_warehouses.read',
        'inventory.v2_warehouses.write',
        'inventory.v2_locations.read',
        'inventory.v2_locations.write',
        'inventory.v2_lots.read',
        'inventory.v2_lots.write',
        'inventory.v2_operations.read',
        'inventory.v2_operations.write',
        'inventory.v2_reports.read',
        'inventory.v2_settings.read',
        'inventory.v2_settings.write',
    ];
}

function app_inventory_v2_sales_default_permissions(): array
{
    return [
        'inventory.v2_products.read',
        'inventory.v2_warehouses.read',
        'inventory.v2_locations.read',
        'inventory.v2_lots.read',
        'inventory.v2_operations.read',
        'inventory.v2_reports.read',
        'inventory.v2_settings.read',
    ];
}

function app_inventory_v2_read_permissions(): array
{
    return [
        'inventory.v2_products.read',
        'inventory.v2_warehouses.read',
        'inventory.v2_locations.read',
        'inventory.v2_lots.read',
        'inventory.v2_operations.read',
        'inventory.v2_reports.read',
        'inventory.v2_settings.read',
    ];
}

function app_inventory_v2_write_permissions(): array
{
    return [
        'inventory.v2_products.write',
        'inventory.v2_warehouses.write',
        'inventory.v2_locations.write',
        'inventory.v2_lots.write',
        'inventory.v2_operations.write',
        'inventory.v2_settings.write',
    ];
}
