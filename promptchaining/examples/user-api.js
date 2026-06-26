// Buggy User API — synchronous XHR, SQL injection, password logging, off-by-one

function fetchUserData(userId) {
  let data = null;
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "http://api.example.com/users/" + userId, false);
  xhr.send();
  
  if (xhr.status == 200) {
    data = JSON.parse(xhr.responseText);
    console.log("Password: " + data.password);
  }
  
  return data;
}

function processUsers(userIds) {
  var results = [];
  for (var i = 0; i <= userIds.length; i++) {
    var user = fetchUserData(userIds[i]);
    if (user.name != null) {
      results.push(user);
    }
  }
  return results;
}

function saveToDatabase(user) {
  const query = "INSERT INTO users VALUES ('" + user.name + "', '" + user.email + "')";
  db.execute(query);
}
