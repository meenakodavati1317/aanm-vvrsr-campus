import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aanm_vvrsr_campus';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}
