const fs = require('fs');
const csv = require('csv-parser');
const { exec } = require('child_process');

// Path to the CSV file
const CSV_FILE_PATH = '../data/user.csv';

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

    // Construct the SFDX CLI command
    const sfdxCommand = `
        sfdx force:user:create 
        username=${Username} 
        email=${Email} 
        firstName=${FirstName} 
        lastName=${LastName} 
        roleName=${Role} 
        profileName=${Profile}
    `.replace(/\n/g, ' ').trim();

    try {
        console.log(`Creating user: ${Username}`);
        const result = await executeSfdxCliCommand(sfdxCommand);
        console.log(`Success: ${result}`);
    } catch (error) {
        console.error(`Failed to create user ${Username}: ${error}`);
    }
}

// Read and process the CSV file
fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (row) => {
        createUser(row); // Create a user for each row in the CSV
    })
    .on('end', () => {
        console.log('CSV file processing completed.');
    });