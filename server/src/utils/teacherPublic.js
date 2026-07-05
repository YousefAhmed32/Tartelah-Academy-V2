// Safe public-facing projection for a teacher (User with role: 'teacher').
//
// Pulled out as a pure function (works on a plain object, not a Mongoose
// document) so it can be unit-tested without a database, and so every route
// that ever needs to expose a teacher publicly goes through the exact same
// allow-list instead of a route-specific `.select('-password ...')` that can
// drift and accidentally leak a new sensitive field added to User later.
function toPublicTeacher(teacher) {
  if (!teacher) return null
  return {
    _id: teacher._id,
    firstNameAr: teacher.firstNameAr,
    lastNameAr: teacher.lastNameAr,
    gender: teacher.gender || null,
    avatar: teacher.avatar || null,
    specialization: teacher.specialization || null,
    bioAr: teacher.bioAr || null,
    createdAt: teacher.createdAt,
  }
}

module.exports = { toPublicTeacher }
