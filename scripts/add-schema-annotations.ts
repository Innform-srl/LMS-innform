import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Add @@schema("public") to models
schema = schema.replace(/model\s+\w+\s+{([^}]+)}/g, (match, body) => {
    if (body.includes('@@schema')) return match;
    return match.replace(/}/, '  @@schema("public")\n}');
});

// Add @@schema("public") to enums
schema = schema.replace(/enum\s+\w+\s+{([^}]+)}/g, (match, body) => {
    if (body.includes('@@schema')) return match;
    return match.replace(/}/, '  @@schema("public")\n}');
});

fs.writeFileSync(schemaPath, schema);
console.log('Added @@schema("public") annotations');
