import express from "express";
import { SignUp,Login,getAllUsers,getUserById,updateUser,deleteUser,getVerifiedProfessionals } from "../controllers/userController.js"
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.post('/signup',SignUp);
userRouter.post( '/login',Login);
userRouter.get('/get_All_Users', authenticateToken, authorizeRoles('administrator'), getAllUsers);
userRouter.get('/professionals/verified', authenticateToken, getVerifiedProfessionals);
userRouter.get('/:id', authenticateToken, getUserById);
userRouter.put('/:id', authenticateToken, updateUser);
userRouter.delete('/:id', authenticateToken, deleteUser);

export default userRouter;