# Net-Notify API Routes

## Overview

This directory contains API routes for the Net-Notify application. These routes handle various functionalities including sending SMS notifications and checking customer due dates.

## Available Routes

### `/api/send-sms`

Sends SMS messages to specified phone numbers.

**Method:** POST

**Request Body:**
```json
{
  "phoneNumbers": ["1234567890", "0987654321"],
  "message": "Your payment is due soon"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "SMS sent successfully",
    "smsBatchId": "batch-123",
    "recipientCount": 2
  }
}
```

### `/api/check-due-dates`

Checks all customers for upcoming due dates (within 3 days) or past due dates, sends appropriate SMS notifications based on templates, and suspends accounts that are more than 1 day past due.

**Method:** GET

**Response:**
```json
{
  "success": true,
  "data": {
    "notifiedCustomers": 5,
    "suspendedCustomers": 2,
    "errors": []
  }
}
```

### `/api/send-due-notifications`

Similar to check-due-dates but with configurable parameters. Checks customers for upcoming due dates, sends SMS notifications, and optionally suspends overdue accounts.

**Method:** POST or GET

**Request Body (POST only, all fields optional):**
```json
{
  "daysAhead": 3,
  "checkOverdue": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifiedCustomers": [1, 2, 3],
    "suspendedCustomers": [4, 5],
    "errors": []
  }
}
```

## Implementation Details

### SMS Templates

The system uses SMS templates from the `sms_templates` table that are associated with specific areas. When sending notifications, the system:

1. Finds customers with upcoming or past due dates
2. Matches each customer with an SMS template based on their area
3. Replaces placeholders in the template with customer data:
   - `{{name}}` - Customer name
   - `{{due_date}}` - Formatted due date
   - `{{phone}}` - Customer phone number

### Account Suspension

Customers whose due date has passed by more than 1 day will have their `account_status` updated from "active" to "suspended" automatically when using these API routes.

### Error Handling

All errors during processing are collected and returned in the response. The system will continue processing other customers even if errors occur with some customers.