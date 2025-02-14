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

    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', async (row) => {
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
    const query = `SELECT Id FROM Profile WHERE Name = '${profileName}'`;
    const result = await conn.query(query);
    return result.records[0]?.Id;
}

// Function to get Role ID by Name (Optional)
async function getRoleId(conn, roleName) {
    const query = `SELECT Id FROM UserRole WHERE Name = '${roleName}'`;
    const result = await conn.query(query);
    return result.records[0]?.Id;
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
        const profileId = await getProfileId(conn, Profile);
        const roleId = Role ? await getRoleId(conn, Role) : null;

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
