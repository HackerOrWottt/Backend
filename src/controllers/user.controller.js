import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

//method to generate access and refresh tokens 
const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //we save Refresh token in our DB as well
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500 , "Something went wrong while Generating Access and Refresh Token")
    }
}

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

const loginUser = asyncHandler( async (req , res) => {
    //Steps to follow 

    //get the username and password from the user / req body
    const {username , email , password} = req.body;

    //check if we got username or email  
    if(!username && !email){
        throw new ApiError(400, "Username or Email is Required to Login..")
    }

    //check if user is present in DB
    const user = await User.findOne({
        $or : [{username} , {email}]
    })

    if(!user){
        throw new ApiError(404 , "User does not exists..")
    }

    //check password
    const isValidPass = await user.isPasswordCorrect(password)

    if(!isValidPass){
        throw new ApiError(401, "Invalid User Credentials")
    }

    //Generate Access and Refresh token 
    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //Send Cookies
    const options = {
        httpOnly : true, //can be only updated through server side 
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken , options)
    .cookie("refreshToken" , refreshToken , options)
    .json(
        new ApiResponse(
            200 , 
            {
                user : loggedInUser , accessToken , refreshToken
            },
            "User Logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req , res) => {
    //we have to find the logged in user , to log out , but we do not find the user by providing a form 
    //instead of that we use a middleware 

    //Steps
    
    //reset access and refresh tokens
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true //this helps us to return a new updated response 
        }
    )

    //Clear the cookies
    const options = {
        httpOnly : true,
        secure : true
    }

    return res.
    status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(
        new ApiResponse(200 , {} , "User logged out")
    )
     
})

const refreshAccessToken = asyncHandler(async (req , res) => {
    //take out the refresh token from the cookies or req body passed from frontend
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401 , "Invalid request - Missing refresh token")
    }

    try {
        //verify the incoming refresh token , to check with our database stored refresh token 
        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        //find user from database 
        const user = await User.findById(decodedRefreshToken?._id)
    
        if(!user){
            throw new ApiError(401 , "Invalid refresh token");
        }
    
        //check if the incoming refresh token matches the stored refresh token
        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(401 , "Refresh Token is Expired , Please login again");
        }
    
        //generate new access token
        const options = {
            httpOnly : true ,
            secure : true
        }
    
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        //return the response 
        return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , newRefreshToken , options)
        .json(
            new ApiResponse(
                200 , 
                {accessToken , refreshToken : newRefreshToken} ,
                "Access Token refreshed Successfully"
            )
        )
    } catch (error) {
        throw new ApiErrorError(401 , error?.message || "Could not refresh access token , Please login again")
    }
})

const changeCurrentPass = asyncHandler(async (req , res) => {
    //steps

    const {oldPassword , newPassword} = req.body;

    //find the user
    const user = await User.findById(req.user?._id)

    //check if old password is correct or not 
    const isValidPass = await user.isPasswordCorrect(oldPassword);

    if(!isValidPass){
        throw new ApiError(401 , "Password is Incorrect , Check password and try again");
    }

    //change the password
    user.password = newPassword;
    await user.save({validateBeforeSave : false});

    //return the response
    return res.
    status(200)
    .json(
        new ApiResponse(200 , {} , "Password Changed Successfully")
    )
})

const getCurrentUser = asyncHandler(async (req , res) => {
    return res.
    status(200).
    json(
        new ApiResponse(200 , req.user , "Current User Fetched Successfully")
    )
})

const updateAccountDetails = asyncHandler(async (req , res) => {
    const {fullName , email} = req.body

    if(!fullName || !email){
        throw new ApiError(400 , "Full Name and Email are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                fullName ,
                email
            }
        },
        {new : true}
    ).select("-password")

    return res.
    status(200).
    json(
        new ApiResponse(200 , user , "Account Details Updated Successfully")
    )
})

export { registerUser , loginUser , logoutUser , refreshAccessToken , changeCurrentPass , getCurrentUser , updateAccountDetails}