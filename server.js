import express from 'express';
import  {connectDB,sequelize}  from "./db_connect.js";
import userRouter from "./Route/userRoute.js";
import dotenv from "dotenv";
dotenv.config();
  
const app = express();
const port= "4000";

app.use(express.json());
app.use("/api/users",userRouter);

app.listen(port,async ()=>{
    await connectDB();
    await sequelize.sync({force:false});
    console.log(`server is listening on port ${port}`);
});