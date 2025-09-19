import dotenv from "dotenv";
 import connectDB from "./db/index.js";
import app from './app.js'
dotenv.config({
    path: "./.env"
})
connectDB()
.then(()=>{
    app.on("error", (error)=>{
        console.error(error)
        throw error 
    })
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`port ready at ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
   console.log(`mongoDB connection failed ${error}`)
})








// import mongoose from 'mongoose'

// import { DB_name } from './constants';
// import express from 'express'
// const app = express()
// ;(async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_name}`)
//         app.on("error",(error)=>{
//             console.log("ERROR", error);
//             throw error
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`app listening on ${process.env/PORT}`);
//         })
//     } catch (error) {
//         console.error("Error",error)
//         throw errror
//     }
// })()