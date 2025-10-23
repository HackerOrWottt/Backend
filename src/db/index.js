import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try{
        const connextionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB Connected Successfully . DB Host : ${connextionInstance.connection.host}`);
    }
    catch(error){
        console.error("Error Occured" , error);
        process.exit(1);
    }
};

export default connectDB;