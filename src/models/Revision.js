import mongoose from 'mongoose';

const ThreadMessageSchema = new mongoose.Schema({
  authorOrgId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  authorType:    { type: String, enum: ['owner', 'agency', 'client'], required: true },
  authorName:    { type: String, required: true },
  message:       { type: String, required: true },
  imageUrl:      { type: String, default: null },   // Cloudinary URL
  imagePublicId: { type: String, default: null },
  timestamp:     { type: Date, default: Date.now },
}, { _id: true });

const RevisionSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },

  // Who raised it
  raisedByOrgId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  raisedByType:   { type: String, enum: ['agency', 'client'], required: true },
  raisedByName:   { type: String, required: true },

  // Which agency is responsible for responding
  // (if raised by client, still goes to the agency)
  responsibleAgencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },

  title: { type: String, required: true },

  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open',
    index: true,
  },

  thread: [ThreadMessageSchema],
  resolvedAt: { type: Date, default: null },

  isDeletedByClient: { type: Boolean, default: false },
}, {
  timestamps: true,
});

export default mongoose.models.Revision ||
  mongoose.model('Revision', RevisionSchema);
