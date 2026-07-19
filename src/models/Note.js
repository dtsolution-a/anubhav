import mongoose from 'mongoose';

const NoteEntrySchema = new mongoose.Schema({
  label:   { type: String, required: true },
  value:   { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const NoteSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  entries: [NoteEntrySchema],
}, {
  timestamps: true,
});

// Unique note doc per project+org combo
NoteSchema.index({ projectId: 1, orgId: 1 }, { unique: true });

export default mongoose.models.Note ||
  mongoose.model('Note', NoteSchema);
