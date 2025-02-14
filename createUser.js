require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const path = require('path');

// Load environment variables
const {
    SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET,
    SALESFORCE_USERNAME,
    SALESFORCE_PASSWORD,
    SALESFORCE_SECURITY_TOKEN,
    SALESFORCE_LOGIN_URL
} = process.env;

let accessToken = null;
let instanceUrl = null;

// Authenticate to Salesforce
async function authenticate() {
    const authResponse = await axios.post(`${SALESFORCE_LOGIN_URL}/services/oauth2/token`, null, {
        params: {
            grant_type: 'password',
            client_id: SALESFORCE_CLIENT_ID,
            client_secret: SALESFORCE_CLIENT_SECRET,
            username: SALESFORCE_USERNAME,
            password: `${SALESFORCE_PASSWORD}${SALESFORCE_SECURITY_TOKEN}`
        }
    });

    accessToken = authResponse.data.access_token;
    instanceUrl = authResponse.data.instance_url;

    console.log('Authentication successful.');
}

// Get Profile ID by Name
async function getProfileId(profileName) {
    const response = await axios.get(`${instanceUrl}/services/data/v57.0/query/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { q: `SELECT Id FROM Profile WHERE Name = '${profileName}'` }
    });

    return response.data.records[0]?.Id;
}

// Get Role ID by Name (Optional)
async function getRoleId(roleName) {
    const response = await axios.get(`${instanceUrl}/services/data/v57.0/query/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { q: `SELECT Id FROM UserRole WHERE Name = '${roleName}'` }
    });

    return response.data.records[0]?.Id;
}

// Create a User via REST API
async function createUser(userData) {
    const {
        Username,
        Email,
        FirstName,
        LastName,
        Profile,
        Role
    } = userData;

    const profileId = await getProfileId(Profile);
    const roleId = Role ? await getRoleId(Role) : null;

    const userPayload = {
        Username,
        Email,
        FirstName,
        LastName,
        Alias: `${FirstName.substring(0, 2)}${LastName.substring(0, 2)}`, // Must be unique
        CommunityNickname: `${FirstName}${LastName}`, // Must be unique
        ProfileId: profileId,
        UserRoleId: roleId,
        TimeZoneSidKey: 'America/Los_Angeles',
        LocaleSidKey: 'en_US',
        EmailEncodingKey: 'UTF-8',
        LanguageLocaleKey: 'en_US'
    };

    try {
        const response = await axios.post(`${instanceUrl}/services/data/v57.0/sobjects/User/`, userPayload, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log(`User created: ${response.data.id}`);
    } catch (error) {
        console.error(`Failed to create user ${Username}: ${error.response?.data || error.message}`);
    }
}

// Main Function
(async () => {
    try {
        // Step 1: Authenticate
        await authenticate();

        // Step 2: Process CSV File
        const CSV_FILE_PATH = path.join(__dirname, '../data/user.csv');
        console.log(`Processing file: ${CSV_FILE_PATH}`);

        fs.createReadStream(CSV_FILE_PATH)
            .pipe(csv())
            .on('data', (row) => {
                createUser(row); // Create a user for each row in the CSV
            })
            .on('end', () => {
                console.log('CSV file processing completed.');
            })
            .on('error', (err) => {
                console.error(`Error reading CSV file: ${err.message}`);
            });
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
})();
