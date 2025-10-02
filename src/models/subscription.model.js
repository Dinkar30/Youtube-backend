import mongoose , {Schema} from "mongoose";

const subscriptionSchema = new Schema({
   subscriber: {
    type: Schema.Types.ObjectId, // subscriber subscribes
    ref: "User"
   },
   channel: {
    type: Schema.Types.ObjectId, // channel is being subscribed
    ref: "User"
   }
},{timestamps: true})

export const Subscription = mongoose.model("Subscription",subscriptionSchema)