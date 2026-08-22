import express from "express";
import { SignUp,Login,getAllUsers,getUserById,updateUser,deleteUser, } from "../controllers/userController.js"
const userRouter = express.Router();

userRouter.post('/signup',SignUp);
userRouter.post( '/login',Login);
userRouter.get('/get_All_Users',getAllUsers);
userRouter.get('/:id', getUserById);
userRouter.put('/:id', updateUser);
userRouter.delete('/:id', deleteUser);

export default userRouter;