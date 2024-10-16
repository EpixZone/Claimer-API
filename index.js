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
    apis: ['./index.js'], // Adjust the path to your file accordingly
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
        // Check if address already exists
        const existingSnapshot = await Snapshot.findOne({ where: { x42_address } });
        if (existingSnapshot) {
            return res.status(400).json({ error: 'Duplicate address. Snapshot was already verified.' });
        }

        // Verify balance by calling external API
        const balanceResponse = await axios.get(
            `https://snapapi.epix.zone/api/BlockStore/getaddressesbalances?addresses=${x42_address}&minConfirmations=1`
        );
        const { balance } = balanceResponse.data.balances[0];

        if (balance !== snapshot_balance) {
            return res.status(400).json({ error: 'Balance verification failed' });
        }

        // Verify signature by calling external API
        const verificationResponse = await axios.post(
            'https://snapapi.epix.zone/api/Wallet/verifymessage',
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
