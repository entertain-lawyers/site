const { generatePostId, generateResourceId, generateSemesterId, generateSubjectId } = require('./scripts-recovered/migration-identity.js');

console.log("English Post 2606:", generatePostId('english', 2606));
console.log("English Post 2606 (again):", generatePostId('english', 2606));

console.log("Nepali Post 15:", generatePostId('nepali', 15));
console.log("English Resource 100:", generateResourceId('english', 100));
console.log("Nepali Resource 200:", generateResourceId('nepali', 200));

console.log("Semester '1st Semester':", generateSemesterId('1st Semester'));
console.log("Semester '1st Semester' (again):", generateSemesterId('1st Semester'));

console.log("Subject '1st Semester' 'Constitutional Law':", generateSubjectId('1st Semester', 'Constitutional Law'));
