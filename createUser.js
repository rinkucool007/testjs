require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const jsforce = require('jsforce');
const path = require('path');

// Load environment variables
const {
    SALESFORCE_USERNAME,
    SALESFORCE_PASSWORD,
    SALESFORCE_SECURITY_TOKEN,
    SALESFORCE_LOGIN_URL
} = process.env;

console.log('Loaded environment variables:');
console.log(`Username: ${SALESFORCE_USERNAME}`);
console.log(`Password: ${SALESFORCE_PASSWORD ? '********' : 'Not provided'}`);
console.log(`Security Token: ${SALESFORCE_SECURITY_TOKEN ? '********' : 'Not provided'}`);
console.log(`Login URL: ${SALESFORCE_LOGIN_URL}`);

// Initialize the connection
const conn = new jsforce.Connection({
    loginUrl: SALESFORCE_LOGIN_URL // Use 'https://login.salesforce.com' for production
});

// Authenticate and log in
conn.login(SALESFORCE_USERNAME, `${SALESFORCE_PASSWORD}${SALESFORCE_SECURITY_TOKEN}`, async (err, userInfo) => {
    if (err) {
        console.error('Login failed:', err.message);
        return;
    }

    console.log('Login successful!');
    console.log('User ID:', userInfo.id);
    console.log('Organization ID:', userInfo.organizationId);

    // Process CSV file and create users
    const CSV_FILE_PATH = path.join(__dirname, '../data/user.csv');
    console.log(`Processing file: ${CSV_FILE_PATH}`);

    // Check if the file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`File not found: ${CSV_FILE_PATH}`);
        return;
    }

    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', async (row) => {
            console.log(`Processing row: ${JSON.stringify(row)}`);
            await createUser(conn, row); // Create a user for each row in the CSV
        })
        .on('end', () => {
            console.log('CSV file processing completed.');
        })
        .on('error', (err) => {
            console.error(`Error reading CSV file: ${err.message}`);
        });
});

// Function to get Profile ID by Name
async function getProfileId(conn, profileName) {
    try {
        const query = `SELECT Id FROM Profile WHERE Name = '${profileName}'`;
        console.log(`Querying Profile: ${query}`);
        const result = await conn.query(query);
        console.log(`Profile Query Result: ${JSON.stringify(result.records)}`);
        return result.records[0]?.Id;
    } catch (error) {
        console.error(`Error querying Profile: ${error.message}`);
        throw error;
    }
}

// Function to get Role ID by Name (Optional)
async function getRoleId(conn, roleName) {
    try {
        const query = `SELECT Id FROM UserRole WHERE Name = '${roleName}'`;
        console.log(`Querying Role: ${query}`);
        const result = await conn.query(query);
        console.log(`Role Query Result: ${JSON.stringify(result.records)}`);
        return result.records[0]?.Id;
    } catch (error) {
        console.error(`Error querying Role: ${error.message}`);
        throw error;
    }
}

// Function to create a user
async function createUser(conn, userData) {
    const {
        Username,
        Email,
        FirstName,
        LastName,
        Profile,
        Role
    } = userData;

    try {
        console.log(`Creating user: ${Username}`);
        const profileId = await getProfileId(conn, Profile);
        const roleId = Role ? await getRoleId(conn, Role) : null;

        if (!profileId) {
            console.error(`Profile not found for: ${Profile}`);
            return;
        }

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

        console.log(`User payload: ${JSON.stringify(userPayload)}`);
        const result = await conn.sobject('User').create(userPayload);
        if (result.success) {
            console.log(`User created successfully: ${result.id}`);
        } else {
            console.error(`Failed to create user: ${JSON.stringify(result.errors)}`);
        }
    } catch (error) {
        console.error(`Error creating user ${Username}: ${error.message}`);
    }
}
