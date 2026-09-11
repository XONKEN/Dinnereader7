const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const db = getFirestore();

exports.dispatchScheduledFamilyNotifications = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Asia/Taipei',
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async () => {
    const now = new Date();

    const snap = await db
      .collectionGroup('scheduledNotifications')
      .where('status', '==', 'pending')
      .where('scheduledAt', '<=', now)
      .limit(100)
      .get();

    for (const doc of snap.docs) {
      const claimed = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(doc.ref);

        if (!fresh.exists) return false;

        const data = fresh.data();

        if (data.status !== 'pending') return false;

        tx.update(doc.ref, {
          status: 'processing',
          processingAt: FieldValue.serverTimestamp()
        });

        return true;
      });

      if (!claimed) continue;

      const x = doc.data();

      try {
        const devices = await db
          .collectionGroup('devices')
          .where('uid', '==', x.targetUid)
          .get();

        const tokens = [
          ...new Set(
            devices.docs
              .map((d) => d.data().token)
              .filter(Boolean)
          )
        ];

        if (tokens.length > 0) {
          const chunks = [];

          for (let i = 0; i < tokens.length; i += 500) {
            chunks.push(tokens.slice(i, i + 500));
          }

          for (const chunk of chunks) {
            await getMessaging().sendEachForMulticast({
              tokens: chunk,

              data: {
                notificationId: doc.id,
                title: String(x.title || '家庭通知'),
                body: String(x.body || ''),
                time: x.scheduledAt?.toDate
                  ? x.scheduledAt.toDate().toISOString()
                  : '',
                senderName: String(x.senderName || '家庭成員'),
                targetName: String(x.targetName || '成員')
              },

              webpush: {
                headers: {
                  Urgency: 'high',
                  TTL: '3600'
                }
              }
            });
          }
        }

        await doc.ref.update({
          status: 'sent',
          sentAt: FieldValue.serverTimestamp(),
          deviceCount: tokens.length
        });

      } catch (err) {
        console.error(
          'dispatchScheduledFamilyNotifications',
          doc.id,
          err
        );

        await doc.ref.update({
          status: 'error',
          error: String(err?.message || err),
          failedAt: FieldValue.serverTimestamp()
        });
      }
    }
  }
);
