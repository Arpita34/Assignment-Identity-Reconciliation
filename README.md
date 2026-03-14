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

## 🚀 Live Endpoint

The API is deployed and live on Render.

**Base URL**: `https://assignment-identity-reconciliation.onrender.com`

**Identity Reconciliation Endpoint**:
`POST /identify`

**Full Endpoint**: 
`https://assignment-identity-reconciliation.onrender.com/identify`

---

## 📝 Request Body

The endpoint accepts a JSON payload containing either an `email`, a `phoneNumber`, or both.

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

*Make sure to send the request with the header:* `Content-Type: application/json`

---

## 📤 Response Payload

The API returns the consolidated identity of the customer.

- **`primaryContatctId`** – ID of the oldest primary contact
- **`emails`** – All emails linked to the contact (primary first)
- **`phoneNumbers`** – All phone numbers linked to the contact (primary first)
- **`secondaryContactIds`** – IDs of secondary contacts linked to the primary

**Example Response:**
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

---

## 🧠 Business Logic Behavior

- **New Customer**: Creates a new primary contact.
- **Returning Customer (Matching Data)**: Returns the existing consolidated profile without creating new rows.
- **New Contact Information**: If an existing contact matches but the request includes new data (e.g., new email with existing phone), a new secondary contact is created and linked to the primary.
- **Account Merging**: If a request links two separate profiles, the older contact remains primary, and the newer one becomes a secondary contact.

---

## 🧪 Testing the API

You can test the endpoint using:
1. Postman
2. Browser Console (`fetch` request)
3. `curl`

**Example using curl:**
```bash
curl -X POST https://assignment-identity-reconciliation.onrender.com/identify \
-H "Content-Type: application/json" \
-d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'
```
