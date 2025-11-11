import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler( async (req , res) => {
    //console.log("✅ /register route hit");

    //console.log("Incoming Content-Type:", req.headers["content-type"]);
    //console.log("req.body:", req.body);
    //console.log("req.files:", req.files);

    //steps to register user 

    //Step 1 : Get user details from the frontend -> Raw data and Files handling
    const {username , password , email , fullName} = req.body;
    //console.log("Email : " , email);

    //Step 2 : Validate the user details
    //2 Ways : First check each field using if else individually that it is present or not 
    //Second Way : Use some method 
    if(
        [username , password , email , fullName].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400 , "All fields are required");
    }

    //check if user already exists
    //check for user with same name or email in the DB
    const existingUser = await User.findOne({
        $or : [
            { email } , { username }
        ]
    })

    if(existingUser){
        //already user exists with same username or email
        throw new ApiError(409 , "User with same Email or Username Already exists");
    }

    //Step 3 : check for images , check for avatar (Uploaded On local server using multer)
    const localAvatarPath = req.files?.avatar?.[0]?.path; //path of avatar image on local server
    const localCoverImageLocalPath = req.files?.coverImage?.[0]?.path; //path of cover image on local server
    
    if(!localAvatarPath){
        //the avatar image is not upload on our local server successfully
        throw new ApiError(400 , "Avatar is Required")
    }

    //Step 4 : upload them to cloudinary
    const avatar = await uploadOnCloudinary(localAvatarPath); //upload avatar to cloudinary
    const coverImage = await uploadOnCloudinary(localCoverImageLocalPath); //upload cover image on cloudinary

    if(!avatar){
        throw new ApiError(500 , "Error in uploading avatar image");
    }

    //Step 5 : create user object - Entry in DB
    const user = await User.create({
        username : username.toLowerCase(),
        email,
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        password
    })

    //Step 6 : remove password and refresh token from the response 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    ); //to check whether user created or not and remove pass and refresh token

    
    //Step 7 : check for user creation success
    if(!createdUser){
        throw new ApiError(500 , "User Registration Failed");
    }

    //Step 8 : return response
    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User Registered Successfully" )
    )
})

export { registerUser }