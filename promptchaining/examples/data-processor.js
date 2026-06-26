// Buggy Data Processor — eval injection, memory leak, async issues, off-by-one

const cache = {};

function processData(records) {
  let results = [];
  for (var i = 0; i <= records.length; i++) {
    let record = records[i];
    let key = record.id + "_" + record.type;
    
    if (cache[key] == undefined) {
      let processed = transform(record);
      cache[key] = processed;
    }
    results.push(cache[key]);
  }
  return results;
}

function transform(record) {
  let data = JSON.parse(JSON.stringify(record));
  data.value = eval(data.formula);
  data.timestamp = new Date();
  return data;
}

async function saveResults(results) {
  for (let r of results) {
    fetch("/api/save", {
      method: "POST",
      body: JSON.stringify(r),
    });
  }
  return "All saved";
}

function clearOldCache() {
  for (let key in cache) {
    if (cache[key].timestamp < Date.now() - 86400000) {
      delete cache[key];
    }
  }
}
