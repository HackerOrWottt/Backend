import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

//upload take place in two step , 1st -> upload the file on local server from the user 2nd -> upload the file to cloudinary servere from the local server

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (LocalFilePath) => {
    try {
        if(!LocalFilePath) return null;

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(LocalFilePath , { 
            resource_type : "auto"
        })

        //file has been upload successfully on cloudinary server
        console.log("File uploaded on cloudinary successfully" , response.url);

        return response;
    }
    catch (error){
        //error , remove file from our local server
        fs.unlinkSync(LocalFilePath);
        return null;
    }
}

export { uploadOnCloudinary};