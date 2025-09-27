import {asyncHandler} from "../utils/asyncHandler.js";
import { APIerror } from "../utils/APIerror.js";
import {User} from "../models/user.model.js";
import { uploadtoCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIresponse.js";


const registerUser =  asyncHandler(async (req, res) => {
    // get user details from frontend (postman)
    // verify/validate them 
    // check if user exists already : using username/email
    // check for images , avatar
    // upload them to cloudinary , avatar
    //create user in db - user object
    // remove password and refresh token from user object before sending the response
    // check if user created successfully
    // return res 


   const {fullName , email , username, password} =  req.body
    

   //  console.log("req.body:",req.body);  
    // console.log("email:",email);

    if( [fullName , email , username, password].some((field) => field?.trim() === "")){
        throw new APIerror(400, "All fields are required");
    }

    const existingUser = User.findOne({
        $or: [{email},{username}]
    })
    if(existingUser){
        throw new APIerror(409, "User already exists with this email/username");
    }
    // console.log("req.files:",req.files);
   
    const avatarLocalPath =  req.files?.avatar[0]?.path;
    const coverImageLocalPath =  req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) throw new APIerror(400, "Avatar is required");

    const avatar = await uploadtoCloudinary(avatarLocalPath);
    const coverImage = await uploadtoCloudinary(coverImageLocalPath);

    if(!avatar) throw new APIerror(500, "Could not upload avatar");

  const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    }) 

   const createdUser =  await User.findbyId(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser) throw new APIerror(500, "something went wrong while registering the user , try again later")
   
    return res.status(201).json(
        new APIResponse(201, createdUser, "user registered successfully")
    )


})

export { registerUser }