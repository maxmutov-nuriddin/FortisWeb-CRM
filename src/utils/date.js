export const isToday = (date) => {
   if (!date) return false

   const d = new Date(date)
   const today = new Date()

   return d.toDateString() === today.toDateString()
}

export const isYesterday = (date) => {
   if (!date) return false

   const d = new Date(date)
   const yesterday = new Date()
   yesterday.setDate(yesterday.getDate() - 1)

   return d.toDateString() === yesterday.toDateString()
}

export const isOnline = (lastLogin, isActive = false) => {
   if (!lastLogin || !isActive) return false

   const now = new Date()
   const last = new Date(lastLogin)

   const diffMs = now.getTime() - last.getTime()
   const diffMinutes = diffMs / 1000 / 60

   return diffMinutes <= 5
}
