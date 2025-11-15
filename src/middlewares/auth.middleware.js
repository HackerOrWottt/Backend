import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req , res , next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer " , "") //take the access token
    
        if(!token){
            throw new ApiError(401 , "Unauthorized Request");
        }
    
        //this access token contains multiple information about the user
        const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET) 
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401 , "Invalid Access Token")
        }
    
        req.user = user //make new entry into req object 
        next();
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid Access Token")
    }
})