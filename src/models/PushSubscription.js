import mongoose from 'mongoose';

const PushSubscriptionSchema = new mongoose.Schema({
  orgId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  type:     { type: String, enum: ['owner', 'agency', 'client'], required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true },
  },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.PushSubscription ||
  mongoose.model('PushSubscription', PushSubscriptionSchema);
