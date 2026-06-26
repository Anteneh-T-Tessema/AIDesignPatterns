// Buggy Auth System — plaintext passwords, timing attacks, broken logic

const users = {};

function register(username, password) {
  if (users[username]) {
    return "User exists";
  }
  users[username] = { password: password, loginAttempts: 0 };
  return "Registered";
}

function login(username, password) {
  const user = users[username];
  if (!user) return "Invalid";
  
  if (user.loginAttempts > 5) {
    return "Locked";
  }
  
  if (user.password == password) {
    user.loginAttempts = 0;
    const token = Math.random().toString();
    return { token: token, admin: username == "admin" };
  } else {
    user.loginAttempts++;
    return "Invalid";
  }
}

function resetPassword(username, newPassword) {
  users[username].password = newPassword;
  return "Password reset";
}

function deleteAccount(username, password) {
  if (users[username].password == password) {
    delete users[username];
  }
}
