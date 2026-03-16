# Customers Module

## Responsibility
- Own canonical customer directory for sales operations.
- Own project and project-contact hierarchy per customer.

## Owns
- Customer profile (name, default phone, address, notes, active state).
- Customer projects (default flag, active state, transfer target).
- Project contacts (label, phone, primary flag, sort order, active state).

## Public Services
- `customer_list`
- `customer_create`
- `customer_update`
- `project_list`
- `project_create_update`
- `project_contact_list_write`

## Data Ownership
- Owns `customers`, `customer_projects`, and `customer_project_contacts`.
- Provides lookup and linkage context for sales orders.

## Interaction Rules
- Sales module may link orders to customer/project/contact ids, but keeps order snapshot fields (`customer_name`, `phone`) for history stability.
- Project transfer changes future ownership context; historical orders stay unchanged.
