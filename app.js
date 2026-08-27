// server/app.js
const cors = require("cors");
app.use(cors({
  origin: "http://localhost:3000", // your React dev server
  credentials: true,
}));