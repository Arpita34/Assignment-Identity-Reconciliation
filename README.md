# Bitespeed Identity Reconciliation API

A web service designed to link and consolidate customer contact information across multiple purchases.

## 🛠️ Setup & Installation

1. **Navigate to the core project directory:**
   ```bash
   cd assignment
   ```

2. **Install all required dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   *The Express server will start on `http://localhost:3000` and the SQLite database (`contacts.db`) will be automatically initialized.*

---

## 🔌 API Usage

### Live Endpoint
The API is live and hosted on Render! You can test it by sending `POST` requests directly to:
**`https://assignment-identity-reconciliation.onrender.com/identify`**

### `POST /identify`

The service exposes a single endpoint that accepts customer contact information and returns their consolidated identity profile.

**Request Body**
Accepts a JSON payload containing either an `email`, a `phoneNumber`, or both.

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Response Payload**
Returns the consolidated contact details.
- `primaryContatctId`: The ID of the oldest contact in the linked cluster.
- `emails`: An array of all emails in the cluster (primary email first).
- `phoneNumbers`: An array of all phone numbers in the cluster (primary phone first).
- `secondaryContactIds`: An array of all secondary contact IDs linked to the primary.

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": [
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu"
    ],
    "phoneNumbers": [
      "123456"
    ],
    "secondaryContactIds": [
      2
    ]
  }
}
```

### Business Logic Behavior
- **New Customer:** Creates a new primary contact.
- **Returning Customer (Matching Data):** Returns the consolidated profile without creating new rows.
- **New Contact Info:** If a match is found but new info is provided (e.g., new email with old phone), it creates a secondary contact linked to the primary.
- **Account Merging:** If a request links two entirely separate profiles, the older profile remains primary, and the newer profile is demoted to a secondary contact.
