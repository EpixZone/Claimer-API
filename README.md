# Snapshot Verification API

## Overview
A Node.js application that provides an API for verifying and storing x42 blockchain snapshot information. The API validates x42 addresses, verifies balances against the x42 network, and stores verified snapshots in PostgreSQL. Successful verifications trigger Discord notifications.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- x42 node with addressindex enabled
- Discord webhook URL (for notifications)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/EpixZone/Claimer-API.git
cd Claimer-API
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
NODE_HOST=http://localhost:42220
DISCORD_WEBHOOK_URL=your_discord_webhook_url
PORT=3000
SWAGGER_HOST=http://localhost:3000
```

## Configuration

### x42 Node Setup
1. Enable address indexing in your x42.conf file:
```conf
addressindex=1
```
2. Restart your x42 node after making this change

### Database Setup
1. Create a PostgreSQL database:
```sql
CREATE DATABASE your_database_name;
```
2. The tables will be automatically created when you first run the application

## Running the Application

### Development
```bash
node index.js
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test tests/discord.test.js

# Run tests in watch mode
npm run test:watch
```

## API Documentation

### Swagger UI
Access the interactive API documentation at:
```
http://localhost:3000/api-docs
```

### Key Endpoints

#### POST /verify-snapshot
Verifies and stores snapshot information

**Request Body:**
```json
{
  "x42_address": "XG9pb7U3F32QQ4dShADV2v71hdLAFQA2Gf",
  "epix_address": "epix1r2357f40wpkruzxu6ss87rvf0hp7hnln246h4x",
  "snapshot_balance": 69223563046
}
```

**Headers:**
- `signature`: Required. Cryptographic signature for verification

**Responses:**
- `200`: Snapshot verified and stored successfully
- `400`: Validation error (invalid signature, balance mismatch, etc.)
- `500`: Internal server error

#### GET /check-balance
Checks the balance of a given address

**Parameters:**
- `address`: x42 address to check

#### GET /verify-address
Verifies if an address is valid and not a witness

**Parameters:**
- `address`: Address to verify

#### GET /total-claimed
Returns total claimed amount and number of claims

#### GET /claims
Returns paginated list of claims with signatures

**Parameters:**
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 10)

#### GET /get-blockheight
Returns current block height of the address indexer

#### GET /download-csv
Downloads a CSV file of all snapshots

## Balance Verification Process

The snapshot verification process is designed to ensure accurate balance verification using the x42 blockchain. Here's a detailed breakdown of how balances are verified:

### Balance Check Process
1. The API verifies the block height is exactly 3,000,000
2. The API queries the x42 node using the BlockCore API endpoint:
   ```
   GET api/BlockStore/getaddressesbalances?addresses=[Address]&minConfirmations=1
   ```
   Example:
   ```
   http://localhost:42220/api/BlockStore/getaddressesbalances?addresses=XG9pb7U3F32QQ4dShADV2v71hdLAFQA2Gf&minConfirmations=1
   ```
3. The returned balance is compared with the claimed snapshot_balance
4. The transaction must be signed by the address owner to prove ownership

### x42 Node Requirements
To support balance verification, your x42 node must:
1. Have `addressindex` enabled in x42.conf:
   ```conf
   addressindex=1
   ```
2. Be fully synced to block height 3,000,000
3. Have the BlockCore API accessible (default port: 42220)

### Full Verification Process
1. Validates the x42 address format
2. Verifies the current block height is at 3,000,000
3. Checks if the claim period is still active (before February 10th, 2025)
4. Verifies the address hasn't been previously claimed
5. Validates the balance against the x42 network using BlockCore API
6. Verifies the cryptographic signature
7. Stores the verified snapshot
8. Sends a Discord notification on successful verification

## Development

### Discord Notifications
Discord notifications are handled by a separate utility function in `utils/discord.js`. You can test this functionality independently:

```javascript
const { sendSnapshotVerificationNotification } = require('./utils/discord');

// Test the notification
await sendSnapshotVerificationNotification('x42_address', balance);
```

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
[MIT License](https://github.com/EpixZone/Claimer-API/blob/main/LICENSE)
