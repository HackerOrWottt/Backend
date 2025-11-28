import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

//console.log("✅ userRouter loaded");

userRouter.route("/register").post(
    //files uploading using multer middleware 
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        }, 
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
);

userRouter.route("/login").post(loginUser);

userRouter.route("/logout").post(verifyJWT , logoutUser);

userRouter.route("/refresh-access-token").post(refreshAccessToken)

export default userRouter;