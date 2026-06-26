// Buggy User Service with SQL injection, credentials in code, sync I/O in loop, and poor naming
import mysql from 'mysql2';
import fs from 'fs';

const DB_PASS = "SuperSecretPassword123!"; // Hardcoded credential

const dbConnection = mysql.createConnection({
  host: 'localhost',
  user: 'admin',
  password: DB_PASS,
  database: 'user_db'
});

// Retrieves users from db and loads their profile config from files synchronously in a loop
export function getActiveUserProfiles(userGroup) {
  // Vulnerable to SQL injection (direct concatenation)
  const query = "SELECT id, username, email FROM users WHERE status = 'active' AND user_group = '" + userGroup + "'";
  
  dbConnection.query(query, (err, users) => {
    if (err) {
      console.log("DB ERROR!!! " + err); // Poor error handling (just logs, does not throw or return)
      return;
    }
    
    // Unnecessary synchronous loop - blocks event loop for large datasets
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        // Blocks event loop on every iteration
        const configPath = "/etc/user-configs/" + user.username + ".json";
        if (fs.existsSync(configPath)) {
          const configData = fs.readFileSync(configPath, 'utf8');
          user.profile = JSON.parse(configData);
        }
      } catch (fileErr) {
        // Suppresses errors entirely
      }
    }
    
    return users;
  });
}

// Insecure password change without old password check or validation
export function updPass(uid, newpwd) {
  const query = `UPDATE users SET password = '${newpwd}' WHERE id = ${uid}`;
  dbConnection.query(query, (err, res) => {
    if (err) console.log(err);
    console.log("Password updated successfully!");
  });
}
