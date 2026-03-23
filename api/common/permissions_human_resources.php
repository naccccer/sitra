<?php
declare(strict_types=1);

function app_human_resources_permission_definitions(): array
{
    return [
        ['key' => 'human_resources.employees.read', 'module' => 'human-resources', 'label' => 'مشاهده پرسنل'],
        ['key' => 'human_resources.employees.write', 'module' => 'human-resources', 'label' => 'مدیریت پرسنل'],
    ];
}

function app_human_resources_manager_default_permissions(): array
{
    return [
        'human_resources.employees.read',
        'human_resources.employees.write',
    ];
}

function app_human_resources_read_permissions(): array
{
    return [
        'human_resources.employees.read',
    ];
}
