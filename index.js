const express = require('express');
const axios = require('axios');
const { Sequelize, DataTypes } = require('sequelize');
const bodyParser = require('body-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Setup Express
const app = express();
app.use(bodyParser.json());

// Swagger setup
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Snapshot Verification API',
            version: '1.0.0',
            description: 'API for verifying and storing snapshot information',
        },
        servers: [
            {
                url: process.env.SWAGGER_HOST,
            },
        ],
    },
    apis: ['./index.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Setup Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT,
});

// Define Snapshot model
const Snapshot = sequelize.define('Snapshot', {
    raw_json: {
        type: DataTypes.JSON,
        allowNull: false,
    },
    signature: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    x42_address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    epix_address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    snapshot_balance: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
});

// Sync the database
sequelize.sync();

const NODE_HOST = process.env.NODE_HOST || 'localhost';

/**
 * @swagger
 * /check-balance:
 *   get:
 *     summary: Check the balance of a given address
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *           example: XG9pb7U3F32QQ4dShADV2v71hdLAFQA2Gf
 *         required: true
 *         description: Address to check balance
 *     responses:
 *       200:
 *         description: Balance of the address
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: string
 *                   example: "1000000000"
 *       400:
 *         description: Error message
 *       500:
 *         description: Internal server error
 */
app.get('/check-balance', async (req, res) => {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'Address is required' });
    }

    try {
        // Call an external API or node to get the balance
        const balanceResponse = await axios.get(`${NODE_HOST}/api/BlockStore/getaddressesbalances?addresses=${address}&minConfirmations=1`);

        if (!balanceResponse.data || !balanceResponse.data.balances || balanceResponse.data.balances.length === 0) {
            return res.status(400).json({ error: 'Unable to retrieve balance for the given address' });
        }

        const balance = balanceResponse.data.balances[0].balance;

        return res.status(200).json({ balance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /verify-snapshot:
 *   post:
 *     summary: Verify and store a snapshot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               x42_address:
 *                 type: string
 *                 example: XG9pb7U3F32QQ4dShADV2v71hdLAFQA2Gf
 *               epix_address:
 *                 type: string
 *                 example: epix1r2357f40wpkruzxu6ss87rvf0hp7hnln246h4x
 *               snapshot_balance:
 *                 type: integer
 *                 example: 69223563046
 *     parameters:
 *       - in: header
 *         name: signature
 *         schema:
 *           type: string
 *         required: true
 *         description: Signature for verification
 *     responses:
 *       200:
 *         description: Snapshot verified and stored successfully
 *       400:
 *         description: Error message
 *       500:
 *         description: Internal server error
 */
app.post('/verify-snapshot', async (req, res) => {
    const { x42_address, epix_address, snapshot_balance } = req.body;
    const signature = req.headers['signature'];

    if (!signature) {
        return res.status(400).json({ error: 'Signature is required' });
    }

    try {
        // Check block height first
        const blockHeightResponse = await axios.get(`${NODE_HOST}/api/BlockStore/addressindexertip`);
        if (!blockHeightResponse.data || !blockHeightResponse.data.tipHeight) {
            return res.status(400).json({ error: 'Unable to retrieve block height' });
        }

        const { tipHeight } = blockHeightResponse.data;
        if (tipHeight != 3000000) {
            return res.status(400).json({ error: 'Block height must be at 3,000,000 blocks' });
        }

        // Check if address already exists
        const existingSnapshot = await Snapshot.findOne({ where: { x42_address } });
        if (existingSnapshot) {
            return res.status(400).json({ error: 'Duplicate address. Snapshot was already verified.' });
        }

        // Verify balance by calling external API
        const balanceResponse = await axios.get(
            `${NODE_HOST}/api/BlockStore/getaddressesbalances?addresses=${x42_address}&minConfirmations=1`
        );
        const { balance } = balanceResponse.data.balances[0];

        if (balance !== snapshot_balance) {
            return res.status(400).json({ error: 'Balance verification failed' });
        }

        // Verify signature by calling external API
        const verificationResponse = await axios.post(
            `${NODE_HOST}/api/Wallet/verifymessage`,
            {
                signature,
                externalAddress: x42_address,
                message: JSON.stringify(req.body),
            },
            {
                headers: {
                    'Content-Type': 'application/json-patch+json',
                },
            }
        );

        if (verificationResponse.data !== "True") {
            return res.status(400).json({ error: 'Signature verification failed' });
        }

        // Save data to PostgreSQL
        await Snapshot.create({
            raw_json: req.body,
            signature,
            x42_address,
            epix_address,
            snapshot_balance,
        });

        res.status(200).json({ message: 'Snapshot verified and stored successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /verify-address:
 *   get:
 *     summary: Verify if an address is valid and not a witness
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *           example: XG9pb7U3F32QQ4dShADV2v71hdLAFQA2Gf
 *         required: true
 *         description: Address to verify
 *     responses:
 *       200:
 *         description: Address verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isvalid:
 *                   type: boolean
 *                   example: true
 *                 iswitness:
 *                   type: boolean
 *                   example: false
 *       400:
 *         description: Error message
 *       500:
 *         description: Internal server error
 */
app.get('/verify-address', async (req, res) => {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'Address is required' });
    }

    try {
        // Verify address validity
        const response = await axios.get(`${NODE_HOST}/api/Node/validateaddress?address=${address}`);
        const { isvalid, iswitness } = response.data;
        return res.status(200).json({ isvalid, iswitness });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /total-claimed:
 *   get:
 *     summary: Get total claimed amount and dashboard information
 *     responses:
 *       200:
 *         description: Total claimed amount and other relevant info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_claimed:
 *                   type: integer
 *                   example: 123456789
 *                 total_claims:
 *                   type: integer
 *                   example: 100
 *       500:
 *         description: Internal server error
 */
app.get('/total-claimed', async (req, res) => {
    try {
        const totalClaimed = await Snapshot.sum('snapshot_balance');
        const totalClaims = await Snapshot.count();

        res.status(200).json({
            total_claimed: totalClaimed,
            total_claims: totalClaims,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /claims:
 *   get:
 *     summary: Get raw JSON and signature for claims
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: List of claims with raw JSON and signature
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   raw_json:
 *                     type: object
 *                   signature:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
app.get('/claims', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    try {
        const claims = await Snapshot.findAll({
            attributes: ['raw_json', 'signature'],
            order: [['id', 'DESC']],
            offset: (page - 1) * pageSize,
            limit: pageSize,
        });

        res.status(200).json(claims);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /get-blockheight:
 *   get:
 *     summary: Get the block height of the address indexer
 *     responses:
 *       200:
 *         description: Block height and tip hash of the address indexer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tipHash:
 *                   type: string
 *                   example: "180d965fba96850ea57454f4149d4a7b514f8ec0513aacbc7cbf112180ab3e32"
 *                 tipHeight:
 *                   type: integer
 *                   example: 2909914
 *       500:
 *         description: Internal server error
 */
app.get('/get-blockheight', async (req, res) => {
    try {
        // Make a request to get the block height of the address indexer
        const blockHeightResponse = await axios.get(`${NODE_HOST}/api/BlockStore/addressindexertip`);

        if (!blockHeightResponse.data || !blockHeightResponse.data.tipHeight) {
            return res.status(400).json({ error: 'Unable to retrieve block height' });
        }

        const { tipHash, tipHeight } = blockHeightResponse.data;

        return res.status(200).json({ tipHash, tipHeight });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /download-csv:
 *   get:
 *     summary: Download a CSV file of all snapshots
 *     responses:
 *       200:
 *         description: CSV file containing Epix addresses and balances
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Internal server error
 */
app.get('/download-csv', async (req, res) => {
    try {
        const snapshots = await Snapshot.findAll({
            attributes: ['epix_address', 'snapshot_balance'],
            order: [['epix_address', 'ASC']],
        });

        // Create CSV content
        const csvContent = snapshots.map(snapshot => {
            // Convert balance to 8 decimal points
            const balance = (snapshot.snapshot_balance / 100000000).toFixed(8);
            return `${snapshot.epix_address},${balance}`;
        }).join('\n');

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=snapshots.csv');

        // Send the CSV file
        res.send(csvContent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
