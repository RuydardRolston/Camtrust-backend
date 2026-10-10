import express from "express";
import {
  SignUp,
  Login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getVerifiedProfessionals,
  toggleUserVerification,
  adminCreateUser,
} from "../controllers/userController.js";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.post('/signup', SignUp);
userRouter.post('/login', Login);
userRouter.post('/admin-create', authenticateToken, authorizeRoles('administrator'), adminCreateUser);
userRouter.get('/get_All_Users', authenticateToken, authorizeRoles('administrator'), getAllUsers);
userRouter.get('/professionals/verified', authenticateToken, getVerifiedProfessionals);
userRouter.get('/:id', authenticateToken, getUserById);
userRouter.put('/:id', authenticateToken, updateUser);
userRouter.put('/:id/verification', authenticateToken, authorizeRoles('administrator'), toggleUserVerification);
userRouter.delete('/:id', authenticateToken, authorizeRoles('administrator'), deleteUser);

export default userRouter;