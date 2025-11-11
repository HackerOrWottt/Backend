import { Router } from "express";
import { loginUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const userRouter = Router();

//console.log("✅ userRouter loaded"); // <--- Add this

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

export default userRouter;