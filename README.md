# Snapshot Verification API

This is a Node.js application that provides an API to verify and store snapshot information. It uses PostgreSQL as the database and Swagger for API documentation.

## Dependencies

To run this application, you'll need the following dependencies:

- **express**: Web framework for Node.js
- **axios**: Promise-based HTTP client for making API requests
- **sequelize**: Node.js ORM for working with PostgreSQL
- **body-parser**: Middleware for parsing incoming request bodies
- **swagger-jsdoc**: To generate Swagger documentation from JSDoc comments
- **swagger-ui-express**: To serve the Swagger UI documentation
- **glob**: File system pattern matching library (updated to version 9 or higher)

### The balances are verified by calling the BlockCore API on the x42 network

The API: **api/BlockStore/getaddressesbalances**
<http://localhost:42220/api/BlockStore/getaddressesbalances?addresses=[Address]]&minConfirmations=1>

<https://github.com/EpixZone/Claimer-API/blob/main/index.js#L109>

To call this API, you have to enable the `addressindex` in the x42.conf

    addressindex=1

## Running the Application

1. Set up PostgreSQL and create a database for this application.
2. Update the database credentials in the code (replace `'database'`, `'username'`, `'password'` with your actual credentials).
3. Run the application with:

```sh
node index.js
```

The server will run on `http://localhost:3000`.

## API Documentation

The API documentation is available at:

```
http://localhost:3000/api-docs
```

You can use this interface to test the `/verify-snapshot` endpoint.

## Endpoints

### POST /verify-snapshot

Verify and store a snapshot.

#### Request Body

- `x42_address` (string, required): Address to verify
- `epix_address` (string, required): Epix address
- `snapshot_balance` (integer, required): Balance to verify

#### Headers

- `signature` (string, required): Signature for verification

#### Responses

- `200 OK`: Snapshot verified and stored successfully
- `400 Bad Request`: Error message, e.g., missing signature, balance mismatch, duplicate address, or signature verification failure
- `500 Internal Server Error`: Error message if something goes wrong on the server
