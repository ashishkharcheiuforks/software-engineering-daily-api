
import mongoose, { Schema } from 'mongoose';

const CompanySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
    // , unique: true
  },
  description: {
    type: String,
    required: false
  },
  imageUrl: {
    type: String,
    required: true
  },
  externalUrl: {
    type: String,
    required: false
  },
  // This is what people will define our url: softwaredaily.com/{localUrl}
  localUrl: {
    type: String,
    required: true
    // , unique: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  // The user who created the company
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateCreated: {
    type: Date,
    required: true,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model('Company', CompanySchema);
