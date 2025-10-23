//require("dotenv").config({path : "./env"});

import dotenv from "dotenv"
import connectDB from "./db/index.js"

dotenv.config({
    path : "./env"
});

//Better Approach
connectDB()

//1st approach
/*import express from "express"
const app = express()

;( async() => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        app.on("error" , (error) => {
            console.error("Error : " , error);
            throw error;
        })

        app.listen(process.env.PORT , () => {
            console.log(`Server is listening on PORT : ${process.env.PORT}`)
        })
        
    }catch(error){
        console.error("Error Occured" , error);
        throw error;
    }
})()
*/