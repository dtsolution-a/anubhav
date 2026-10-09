import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';
import Project from '@/models/Project';

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_EMAIL || 'mailto:admin@example.com', pub, priv);
  configured = true;
  return true;
}

const clip = (s, n = 110) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

// Where a notification tap should land, per recipient type
function urlFor(type, projectId, revId) {
  if (type === 'owner')  return `/admin/projects/${projectId}?tab=revisions&rev=${revId}`;
  if (type === 'agency') return `/workspace/${projectId}?rev=${revId}`;
  return `/experience?rev=${revId}`;
}

/**
 * Notify everyone involved in a revision except the person who caused the event.
 * Recipients: the responsible agency, the client org (if the client raised it) and the owner.
 * Never throws and never blocks the request for long: push is best-effort.
 */
export async function notifyRevision({ revision, sender, title, body }) {
  try {
    if (!configured && !configure()) return;

    const projectId = String(revision.projectId?._id || revision.projectId);
    const revId = String(revision._id);

    const orgIds = [revision.responsibleAgencyId];
    if (revision.raisedByType === 'client') orgIds.push(revision.raisedByOrgId);

    const subs = await PushSubscription.find({
      $or: [{ orgId: { $in: orgIds } }, { type: 'owner' }],
    }).lean();

    const targets = subs.filter(s => {
      if (sender.type === 'owner' && s.type === 'owner') return false;
      if (String(s.orgId) === String(sender.orgId)) return false;
      // agencies only hear about their own revisions; clients only about the ones they raised
      if (s.type === 'agency' && String(s.orgId) !== String(revision.responsibleAgencyId)) return false;
      if (s.type === 'client' && !(revision.raisedByType === 'client' && String(s.orgId) === String(revision.raisedByOrgId))) return false;
      return true;
    });
    if (!targets.length) return;

    let projectTitle = '';
    try { projectTitle = (await Project.findById(projectId).select('title').lean())?.title || ''; } catch {}

    const dead = [];
    const send = Promise.allSettled(targets.map(async (s) => {
      const payload = JSON.stringify({
        title: clip(title, 60),
        body: clip(`${projectTitle ? projectTitle + ' · ' : ''}${revision.title}: ${body}`),
        tag: `rev-${revId}`,
        url: urlFor(s.type, projectId, revId),
      });
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 24, urgency: 'high' });
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.endpoint);
      }
    }));
    // serverless functions freeze after responding, so wait briefly for delivery
    await Promise.race([send, new Promise(r => setTimeout(r, 4000))]);
    if (dead.length) await PushSubscription.deleteMany({ endpoint: { $in: dead } });
  } catch (err) {
    console.error('[push] notify failed', err?.message);
  }
}
