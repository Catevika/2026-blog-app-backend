import mongoose from "mongoose";

declare global {
	var mongoose: typeof mongoose;
}

export default mongoose;
