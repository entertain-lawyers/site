require('dotenv').config();
console.log("Bucket Name:", process.env.B2_BUCKET_NAME);
console.log("Endpoint:", process.env.B2_ENDPOINT);
console.log("Access Key ID:", process.env.B2_ACCESS_KEY_ID ? "PRESENT" : "MISSING");
console.log("Secret Access Key:", process.env.B2_SECRET_ACCESS_KEY ? "PRESENT" : "MISSING");
