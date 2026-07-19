import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  label: { type: String, required: true },
  url:   { type: String, required: true },
  type:  {
    type: String,
    enum: ['quotation', 'invoice', 'contract', 'nda', 'proposal', 'other'],
    default: 'other',
  },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const ProjectSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  previewUrl:  { type: String, default: '' },
  status: {
    type: String,
    enum: ['active', 'in-review', 'delivered'],
    default: 'active',
  },
  deliveredOn: { type: String, default: null },

  // Owner org (always DTS Media / the platform owner)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },

  // Agency this project belongs to (who can see it in workspace)
  agencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
  },

  // Client experience code (e.g. CL31BBM)
  clientCode: {
    type: String,
    default: null,
    uppercase: true,
    sparse: true,
    index: true,
  },

  // Client org (optional — if a client org is created)
  clientOrgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
  },

  // Documents (links) attached by owner
  documents: [DocumentSchema],
}, {
  timestamps: true,
});

export default mongoose.models.Project ||
  mongoose.model('Project', ProjectSchema);
