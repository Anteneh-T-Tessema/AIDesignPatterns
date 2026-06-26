// Buggy Data Exporter containing eval(), memory leaks, and unhandled promises
import fs from 'fs/promises';

// Global cache without expiration or eviction - potential memory leak
const cache = {};

export async function exportData(dataSet, userFilter, outputFileName) {
  let cacheKey = dataSet + "_" + userFilter;
  
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }
  
  // Simulated database fetch
  let data = [
    { id: 1, type: "sales", value: 100, region: "North" },
    { id: 2, type: "sales", value: 250, region: "South" },
    { id: 3, type: "marketing", value: 50, region: "North" }
  ];
  
  // Highly insecure eval() usage to execute user-provided filters
  let filteredData = [];
  try {
    for (let d of data) {
      // Direct execution of string input as code
      if (eval(`d.type === "${dataSet}" && (${userFilter})`)) {
        filteredData.push(d);
      }
    }
  } catch (evalError) {
    console.error("Filtering failed: ", evalError);
  }
  
  // Save to cache (unbounded growth)
  cache[cacheKey] = filteredData;
  
  // Write to output file - unawaited promise (dangling promise / no error handling)
  const jsonOutput = JSON.stringify(filteredData);
  fs.writeFile(outputFileName, jsonOutput); // Missing await! If this fails, it triggers unhandledRejection
  
  return filteredData;
}

// Global functions with poor naming and missing validation
export function run(a, b, c) {
  exportData(a, b, c).then(res => {
    console.log("Done exporting " + res.length + " records.");
  });
}
