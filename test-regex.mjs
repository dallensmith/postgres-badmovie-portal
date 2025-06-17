#!/usr/bin/env node

// Test the regex fix
const testTitles = [
  "Experiment #505",
  "Experiment #504", 
  "Experiment #503",
  "Experiment 502",
  "Experiment #196"
];

console.log('🧪 Testing fixed regex pattern...');

testTitles.forEach(title => {
  const experimentMatch = title.match(/Experiment\s*#?(\d+)/i);
  if (experimentMatch) {
    console.log(`✅ "${title}" -> Experiment ${experimentMatch[1]}`);
  } else {
    console.log(`❌ "${title}" -> No match`);
  }
});
