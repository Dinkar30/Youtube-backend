
import {asyncHandler} from "../utils/asyncHandler.js";
import { APIerror } from "../utils/APIerror.js";
import {User} from "../models/user.model.js";
import { uploadtoCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIresponse.js";
import jwt, { decode } from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false})

       return {accessToken, refreshToken}

    } catch (error) {
        throw new APIerror(500, "Something went wrong while generating refresh and access token")
    }
}


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

    

   const {username, fullName , email ,  password} =  req.body
    

    //  console.log("req.body:",req.body);  
    // console.log("email:",email);

    if( [username, fullName , email ,  password].some((field) => field?.trim() === "")){
        throw new APIerror(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{email},{username}] 
    })
    if(existingUser){
        throw new APIerror(409, "User already exists with this email/username");
    }
    //   console.log("req.files:",req.files);


   
    const avatarLocalPath =  req.files?.avatar[0]?.path;
    // const coverImageLocalPath =  req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath) throw new APIerror(400, "Avatar is required");

    const avatar = await uploadtoCloudinary(avatarLocalPath);
    // console.log("avatar uploaded");
    
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

   const createdUser =  await User.findById(user._id).select(
    "-password -refreshToken"
   )

   if(!createdUser) throw new APIerror(500, "something went wrong while registering the user , try again later")
   
    return res.status(201).json(
        new APIResponse(201,
             createdUser,
              "user registered successfully"
            )
    )


})

const loginUser = asyncHandler(async (req,res) => {
        // get data from req.body
        // check for username/email in db
        // find the user
        // check the password
        // access and refresh tokens
        // send via secure cookies

        const {username, email, password} = req.body;

        if(!(username || email)) throw new APIerror(400 , "username or email is required")

        const user = await User.findOne({
        $or: [{username},{email}]
        })
        if(!user) throw new APIerror(404 , "User doesn't exist , please register first")
        const isValidPassword = await user.isPasswordCorrect(password)
        
        if(!isValidPassword) throw new APIerror(401, "Invalid user credentials")
        
        const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id)

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new APIResponse(200,
                {
                    user: loggedInUser, refreshToken , accessToken
                },
                "user logged in successfully" 
            )
        )

})


const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
)
    const options = {
            httpOnly: true,
            secure: true
        }

    return res.status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new APIResponse(200, {}, "User logged out"))
})


const refreshAccessToken = asyncHandler(async (req,res) => {
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
     if(!incomingRefreshToken) throw new APIerror(401, "Unauthorized request")
    
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

     if(!user) throw new APIerror(401, "Invalid refresh token")

     if(incomingRefreshToken !== user?.refreshToken) throw new APIerror(401 , "Refresh token expired")

    const options = {
        httpOnly: true,
        secure: true
    }


    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        new APIResponse(200,
            {accessToken, refreshToken: newRefreshToken},
            "Access Token refreshed"
        )
    )

})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect) throw new APIerror(400 , "invalid old password")

        user.password = newPassword
        await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new APIResponse(200, "password changed successfully"))


})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res
           .status(200)
           .json(new APIResponse(200, req.user , "User fetched Successfully"))
} )

const updateAccountDetails = asyncHandler(async (req,res) => {
    const {fullName , email} = req.body
    if(!fullName || !email) throw new APIerror(400 , "All fields are required") 

    const user = await User.findByIdAndUpdate(req.user_id,
        {
         $set: {
            fullName,
            email 
         }
        },
        {new: true}
    ).select("-password")

    return res
         .status(200)
         .json(new APIResponse(200 , user , "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req,res) => {
     const avatarLocalPath = req.file?.path
     if(!avatarLocalPath) throw new APIerror(400, "avatar file is missing")
       const avatar = await uploadtoCloudinary(avatarLocalPath)
      if(!avatar.url) throw new APIerror(400, "Error while uploading avatar")
    const user =  await User.findByIdAndUpdate(
     req.user?._id,
     {
        $set: {
            avatar: avatar.url
        }
     },
     {new: true}
    ).select("-password")
    return res
            .status(200)
            .json(new APIResponse(200 , user , "avatar updated successfully"))
    })


const updateUsercoverImage = asyncHandler(async (req,res) => {
     const coverImageLocalPath = req.file?.path
     if(!coverImageLocalPath) throw new APIerror(400, "coverImage file is missing")
       const coverImage = await uploadtoCloudinary(coverImageLocalPath)
      if(!coverImage.url) throw new APIerror(400, "Error while uploading coverImage")
    const user =  await User.findByIdAndUpdate(
     req.user?._id,
     {
        $set: {
            coverImage: coverImage.url
        }
     },
     {new: true}
    ).select("-password")
    return res
            .status(200)
            .json( new APIResponse(200 , user , "coverImage updated successfully"))
    })

const getUserChannelProfile = asyncHandler(async (req,res) => {
    const { username } = req.params
    if(!username?.trim()) throw new APIerror(400 , "Username is missing")
    const channel = await User.aggregate( [
    {
      $match: {
        username: username
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
       $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
        }
    },
    {
        $addFields: {
            subscribersCount: {
                $size: "$subscribers"
            },
            channelsSubscribedToCount: {
                $size: "$subscribedTo"
            },
            isSubscribed: {
                $cond: {
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }
    },
    {
        $project: {
            fullName: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
        }
    }
    ] )

    if(!channel?.length) throw new APIerror(200 , "channel doesn't exist")

    return res
            .status(200)
            .json(
                new APIResponse(200 , channel[0], "User channel fetched successfully")
            )

})

export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUsercoverImage
    
 }