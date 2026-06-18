// "Notify me" waitlist: subscribe a student to a full course, get notified
// once a seat frees up (then the subscription is consumed).
let subscriptions = []
let notifications = []

export function subscribe(studentId, courseName, requestId) {
  if (subscriptions.some((s) => s.studentId === studentId && s.courseName === courseName)) return
  subscriptions.push({ id: `wl-${Date.now()}`, studentId, courseName, requestId, createdAt: new Date().toISOString() })
}

export function isSubscribed(studentId, courseName) {
  return subscriptions.some((s) => s.studentId === studentId && s.courseName === courseName)
}

export function notifySubscribers(courseName) {
  const matches = subscriptions.filter((s) => s.courseName === courseName)
  for (const sub of matches) {
    notifications.push({
      id: `note-${Date.now()}-${sub.studentId}`,
      studentId: sub.studentId,
      courseName,
      createdAt: new Date().toISOString(),
      dismissed: false,
    })
  }
  subscriptions = subscriptions.filter((s) => s.courseName !== courseName)
}

export function getNotifications(studentId) {
  return notifications.filter((n) => n.studentId === studentId && !n.dismissed)
}

export function dismissNotification(notificationId) {
  notifications = notifications.map((n) => (n.id === notificationId ? { ...n, dismissed: true } : n))
}
