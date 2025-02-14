require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const jsforce = require('jsforce');

// Salesforce connection setup
const conn = new jsforce.Connection({
  loginUrl: process.env.SF_LOGIN_URL || 'https://test.salesforce.com',
});

// Function to create a user in Salesforce
async function createUser(userData) {
  try {
    const userRecord = {
      Username: userData.Username,
      Email: userData.Email,
      FirstName: userData['First Name'],
    //   MiddleName: userData['Middle Name'],
      LastName: userData['Last Name'],
      Alias: userData['First Name'].substring(0, 2) + userData['Last Name'].substring(0, 2),
      CommunityNickname: userData['First Name'] + userData['Last Name'],
      TimeZoneSidKey: 'America/Los_Angeles',
      LocaleSidKey: 'en_US',
      EmailEncodingKey: 'UTF-8',
      ProfileId: await getProfileId(userData.Profile), // Fetch Profile ID dynamically
      UserRoleId: await getUserRoleId(userData.Role), // Fetch Role ID dynamically
      LanguageLocaleKey: 'en_US',
    };

    const result = await conn.sobject('User').create(userRecord);
    if (result.success) {
      console.log(`User created successfully: ${userData.Username}`);
    } else {
      console.error(`Failed to create user: ${userData.Username}`, result.errors);
    }
  } catch (error) {
    console.error(`Error creating user ${userData.Username}:`, error.message);
  }
}

// Function to fetch Profile ID by Profile Name
async function getProfileId(profileName) {
  const query = `SELECT Id FROM Profile WHERE Name = '${profileName}'`;
  const result = await conn.query(query);
  if (result.records.length > 0) {
    return result.records[0].Id;
  } else {
    throw new Error(`Profile not found: ${profileName}`);
  }
}

// Function to fetch Role ID by Role Name
async function getUserRoleId(roleName) {
  const query = `SELECT Id FROM UserRole WHERE Name = '${roleName}'`;
  const result = await conn.query(query);
  if (result.records.length > 0) {
    return result.records[0].Id;
  } else {
    throw new Error(`Role not found: ${roleName}`);
  }
}

// Main function to process CSV and create users
async function main() {
  try {
    // Login to Salesforce sandbox
    await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD + process.env.SF_SECURITY_TOKEN);
    console.log('Successfully logged into Salesforce sandbox.');

    // Read and process the CSV file
    const results = [];
    fs.createReadStream('data/user.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log('CSV file successfully processed.');
        for (const userData of results) {
          await createUser(userData);
        }
      });
  } catch (error) {
    console.error('Error during execution:', error.message);
  }
}

// Start the script
main();
