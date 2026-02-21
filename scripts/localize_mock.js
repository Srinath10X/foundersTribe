const fs = require('fs');
const path = require('path');

const replacements = {
    "Alex Rivera": "Arjun Patel",
    "Sarah Chen": "Priya Sharma",
    "Jordan Smith": "Rahul Kumar",
    "San Francisco / Remote": "Bengaluru / Remote",
    "London / Remote": "Mumbai / Remote",
    "San Francisco, CA": "Bengaluru, KA",
    "London, UK": "Mumbai, MH",
    "San Francisco": "Bengaluru",
    "London": "Mumbai",
    "Velocity Tech Inc.": "Veda Tech Pvt Ltd",
    "Lumina Wellness": "Aarogya Wellness"
};

const directories = [
    "/home/srinath/internship/foundersTribe/apps/mobile/app/talent-stack",
    "/home/srinath/internship/foundersTribe/apps/mobile/app/freelancer-stack",
    "/home/srinath/internship/foundersTribe/apps/mobile/app/(role-pager)/(freelancer-tabs)"
];

function walk(dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        list.forEach(function (file) {
            file = dir + '/' + file;
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(walk(file));
            } else {
                if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                    results.push(file);
                }
            }
        });
    } catch (e) {
        console.warn("Could not read directory", dir);
    }
    return results;
}

directories.forEach(dir => {
    const files = walk(dir);
    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let changed = false;
        for (const [key, value] of Object.entries(replacements)) {
            if (content.includes(key)) {
                content = content.replace(new RegExp(key, 'g'), value);
                changed = true;
            }
        }
        if (changed) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Updated', file);
        }
    });
});
