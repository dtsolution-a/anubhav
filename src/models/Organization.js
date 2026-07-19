import mongoose from 'mongoose';

const BrandingSchema = new mongoose.Schema({
  logoText:        { type: String, default: '' },
  accentColor:     { type: String, default: '#FF7035' },
  accentSecondary: { type: String, default: '#FF9F00' },
  accentGradient:  { type: String, default: 'linear-gradient(135deg,#FF7035,#FF9F00)' },
  accentGlow:      { type: String, default: 'rgba(255,112,53,0.28)' },
  accentLight:     { type: String, default: 'rgba(255,112,53,0.1)' },
  bgBase:          { type: String, default: '#0a0807' },
  tagline:         { type: String, default: '' },
}, { _id: false });

const OrganizationSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['owner', 'agency', 'client'],
    required: true,
  },
  name:     { type: String, required: true, trim: true },
  branding: { type: BrandingSchema, default: () => ({}) },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

export default mongoose.models.Organization ||
  mongoose.model('Organization', OrganizationSchema);
