const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');
const path = require('path');

// Construct the correct path to the CSV file
const CSV_FILE_PATH = path.join(__dirname, '../data/user.csv');

// Specify the target org alias or username
const TARGET_ORG = 'your-org-alias'; // Replace with your org alias or username

// Function to execute SFDX CLI commands
function executeSfdxCliCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${stderr || error.message}`);
            } else {
                resolve(stdout);
            }
        });
    });
}

// Function to create a Salesforce user
async function createUser(userData) {
    const {
        Username,
        Email,
        FirstName,
        MiddleName,
        LastName,
        FullName,
        Role,
        Profile
    } = userData;

    // Construct the SFDX CLI command with proper quoting
    const sfdxCommand = `
        sfdx force:user:create 
        --target-org "${TARGET_ORG}"
        username="${Username}" 
        email="${Email}" 
        firstName="${FirstName}" 
        lastName="${LastName}" 
        roleName="${Role}" 
        profileName="${Profile}"
    `.replace(/\n/g, ' ').trim();

    try {
        console.log(`Creating user: ${Username}`);
        const result = await executeSfdxCliCommand(sfdxCommand);
        console.log(`Success: ${result}`);
    } catch (error) {
        console.error(`Failed to create user ${Username}: ${error}`);
    }
}

// Debugging: Log the resolved file path
console.log(`Attempting to read file from: ${CSV_FILE_PATH}`);

// Read and process the CSV file
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
